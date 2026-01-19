"""
Pairs Trading Strategy

A statistical arbitrage strategy that trades mean reversion of spreads between
correlated stocks (cointegrated pairs).

Key Concept:
    When two stocks are historically correlated, their price spread tends to revert
    to the mean. If the spread deviates significantly (high z-score), we can profit
    by betting on mean reversion.

Trade Logic:
    - z_score < -2.0 → BUY (spread too low, expect reversion up)
    - z_score > 2.0 → SELL (spread too high, expect reversion down)
    - Only trade if correlation >= 0.7 (minimum required relationship)

Default Pairs:
    - GOOGL/META (tech, advertising)
    - AAPL/MSFT (tech, hardware/software)
    - JPM/BAC (financials)
    - XOM/CVX (energy)

Statistical Foundation:
    1. Hedge Ratio: Calculated via OLS regression (how many shares of stock2 to
       hold for each share of stock1)
    2. Spread: price1 - hedge_ratio * price2
    3. Z-Score: (current_spread - mean_spread) / std_spread

Risk Management:
    - Stop loss based on ATR
    - Target based on risk:reward ratio
    - Correlation filter to avoid trading broken relationships

Usage:
    strategy = PairsTradingStrategy()
    signal = strategy.analyze(symbol="GOOGL", market="US", ohlcv_data=data, data_hash="abc123")
    if signal:
        print(f"Signal: {signal.side}, Partner: META, Z-Score: {signal.confidence_factors['z_score']}")

Dependencies:
    - Python 3.10+
    - httpx (for async HTTP calls)
    - numpy
    - indicators.technical
    - models.signal
    - confidence.scorer
    - confidence.invalidation
"""

import asyncio
import concurrent.futures
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import httpx
import numpy as np
import structlog

from indicators.technical import TechnicalIndicators
from models import Signal, SignalFeatures, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer, generate_invalidation_rules
from confidence.invalidation import InvalidationRule

logger = structlog.get_logger(__name__)

# Data service URL for fetching partner symbol data
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:5101')

# Required keys for OHLCV bar data
REQUIRED_OHLCV_KEYS = {'open', 'high', 'low', 'close', 'volume'}


def validate_ohlcv_data(ohlcv_data: List[Dict[str, Any]], symbol: str = "") -> bool:
    """
    Validate OHLCV data has required keys and numeric values.

    Args:
        ohlcv_data: List of OHLCV bar dictionaries
        symbol: Symbol name for logging

    Returns:
        True if valid, False otherwise
    """
    if not ohlcv_data:
        return False

    for i, bar in enumerate(ohlcv_data):
        # Check required keys exist
        missing_keys = REQUIRED_OHLCV_KEYS - set(bar.keys())
        if missing_keys:
            logger.warning(
                "OHLCV bar missing required keys",
                symbol=symbol,
                bar_index=i,
                missing_keys=list(missing_keys),
            )
            return False

        # Validate values are numeric and not None
        for key in REQUIRED_OHLCV_KEYS:
            value = bar.get(key)
            if value is None:
                logger.warning(
                    "OHLCV bar has None value",
                    symbol=symbol,
                    bar_index=i,
                    key=key,
                )
                return False
            if not isinstance(value, (int, float)):
                logger.warning(
                    "OHLCV bar has non-numeric value",
                    symbol=symbol,
                    bar_index=i,
                    key=key,
                    value_type=type(value).__name__,
                )
                return False
            # Check for reasonable price values (not negative, not zero for prices)
            if key in ('open', 'high', 'low', 'close') and value <= 0:
                logger.warning(
                    "OHLCV bar has invalid price value",
                    symbol=symbol,
                    bar_index=i,
                    key=key,
                    value=value,
                )
                return False
            # Volume can be zero but not negative
            if key == 'volume' and value < 0:
                logger.warning(
                    "OHLCV bar has negative volume",
                    symbol=symbol,
                    bar_index=i,
                    value=value,
                )
                return False

    return True


class PairsTradingStrategy:
    """
    Pairs Trading (Statistical Arbitrage) strategy.

    Trades mean reversion of spreads between correlated stock pairs.
    Uses z-score of the spread to identify entry/exit points.
    """

    NAME = "Pairs Trading Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "Statistical arbitrage trading mean reversion of correlated stock pairs"

    # Predefined trading pairs (bidirectional mapping)
    # Format: symbol -> partner symbol
    PAIRS = {
        # Tech / Advertising
        "GOOGL": "META",
        "META": "GOOGL",
        # Tech / Hardware-Software
        "AAPL": "MSFT",
        "MSFT": "AAPL",
        # Financials
        "JPM": "BAC",
        "BAC": "JPM",
        # Energy
        "XOM": "CVX",
        "CVX": "XOM",
    }

    DEFAULT_CONFIG = {
        # Z-score thresholds (tuned for more signals)
        "z_score_entry": 1.5,           # Entry when |z-score| > 1.5 (tuned from 2.0)
        "z_score_exit": 0.3,            # Exit when |z-score| < 0.3 (tuned from 0.5)

        # Correlation requirements
        "min_correlation": 0.65,         # Minimum correlation to trade (tuned from 0.7)

        # Lookback period
        "lookback_period": 45,           # Days for calculations (tuned from 60)

        # Risk management
        "atr_period": 14,
        "atr_multiplier_stop": 1.5,      # Stop loss = 1.5 ATR (tuned from 2.0)
        "atr_multiplier_target": 2.5,    # Target = 2.5 ATR (tuned from 3.0)
        "risk_reward_ratio": 2.0,        # Target = 2x risk (tuned from 1.5)

        # Data requirements
        "min_data_bars": 50,             # Minimum bars needed (tuned from 60)

        # Entry settings
        "limit_order_offset_pct": 0.002,  # 0.2% offset for limit orders

        # HTTP settings for partner data fetch
        "http_timeout": 30.0,
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Pairs Trading strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="pairs_trading")
        logger.info("Pairs Trading strategy initialized", config=self.config)

    async def _fetch_partner_data(
        self,
        symbol: str,
        market: str,
        days: int = 100,
    ) -> Optional[List[dict]]:
        """
        Fetch OHLCV data for the partner symbol from Data Service (async version).

        Args:
            symbol: Partner symbol to fetch
            market: Market identifier
            days: Number of days of history to fetch

        Returns:
            List of OHLCV bars or None if fetch fails
        """
        try:
            async with httpx.AsyncClient() as client:
                from datetime import date
                end = date.today()
                start = end - timedelta(days=days)

                response = await client.get(
                    f"{DATA_SERVICE_URL}/api/v1/ohlcv/{symbol}",
                    params={
                        "market": market,
                        "start": str(start),
                        "end": str(end),
                        "timeframe": "1d",
                    },
                    timeout=self.config['http_timeout'],
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", [])
                else:
                    logger.warning(
                        "Failed to fetch partner data",
                        symbol=symbol,
                        status_code=response.status_code,
                    )
                    return None
        except httpx.TimeoutException:
            logger.error("Timeout fetching partner data", symbol=symbol)
            return None
        except Exception as e:
            logger.error("Error fetching partner data", symbol=symbol, error=str(e))
            return None

    def _fetch_partner_data_sync(
        self,
        symbol: str,
        market: str,
        days: int = 100,
    ) -> Optional[List[dict]]:
        """
        Synchronous wrapper for fetching partner data.

        Works both in sync and async contexts by running the async fetch
        in a separate thread with its own event loop. This avoids issues
        with nested event loops in FastAPI.

        Args:
            symbol: Partner symbol to fetch
            market: Market identifier
            days: Number of days of history to fetch

        Returns:
            List of OHLCV bars or None if fetch fails
        """
        def _run_async_fetch():
            """Run the async fetch in a new event loop."""
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    self._fetch_partner_data(symbol, market, days)
                )
            finally:
                loop.close()

        try:
            # Use ThreadPoolExecutor to run in a separate thread
            # This avoids issues with nested event loops in async contexts
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_run_async_fetch)
                # Add buffer to timeout for thread overhead
                return future.result(timeout=self.config['http_timeout'] + 5)
        except concurrent.futures.TimeoutError:
            logger.error("Timeout fetching partner data (thread)", symbol=symbol)
            return None
        except Exception as e:
            logger.error("Error fetching partner data (thread)", symbol=symbol, error=str(e))
            return None

    def _calculate_hedge_ratio(
        self,
        prices1: List[float],
        prices2: List[float],
    ) -> float:
        """
        Calculate hedge ratio using OLS regression.

        The hedge ratio tells us how many shares of stock2 to hold
        for each share of stock1 to create a market-neutral position.

        Formula: y = beta * x + alpha (we return beta)

        Args:
            prices1: Prices of the primary stock (dependent variable y)
            prices2: Prices of the partner stock (independent variable x)

        Returns:
            Hedge ratio (beta coefficient)
        """
        x = np.array(prices2)
        y = np.array(prices1)

        # Simple OLS: y = beta * x + alpha
        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        # Avoid division by zero
        if denominator == 0:
            return 1.0

        beta = numerator / denominator
        return float(beta)

    def _calculate_spread_zscore(
        self,
        prices1: List[float],
        prices2: List[float],
        hedge_ratio: float,
    ) -> tuple[float, np.ndarray]:
        """
        Calculate spread z-score.

        Spread = price1 - hedge_ratio * price2
        Z-Score = (current_spread - mean_spread) / std_spread

        Args:
            prices1: Prices of the primary stock
            prices2: Prices of the partner stock
            hedge_ratio: Hedge ratio from OLS regression

        Returns:
            Tuple of (z_score, spread_array)
        """
        spread = np.array(prices1) - hedge_ratio * np.array(prices2)

        spread_mean = np.mean(spread)
        spread_std = np.std(spread)

        # Avoid division by zero
        if spread_std == 0:
            return 0.0, spread

        z_score = (spread[-1] - spread_mean) / spread_std
        return float(z_score), spread

    def _calculate_correlation(
        self,
        prices1: List[float],
        prices2: List[float],
    ) -> float:
        """
        Calculate Pearson correlation coefficient between two price series.

        Args:
            prices1: Prices of the primary stock
            prices2: Prices of the partner stock

        Returns:
            Correlation coefficient (-1 to 1)
        """
        if len(prices1) != len(prices2) or len(prices1) < 2:
            return 0.0

        correlation_matrix = np.corrcoef(prices1, prices2)
        return float(correlation_matrix[0, 1])

    def _calculate_half_life(self, spread: np.ndarray) -> float:
        """
        Calculate mean-reversion half-life using Ornstein-Uhlenbeck process.

        Half-life tells us how long (in bars) the spread takes to revert
        halfway back to the mean.

        Args:
            spread: Spread time series

        Returns:
            Half-life in bars (lower is faster mean reversion)
        """
        if len(spread) < 3:
            return float('inf')

        # Calculate lagged spread
        spread_lag = spread[:-1]
        spread_change = spread[1:] - spread_lag

        # OLS regression: spread_change = theta * spread_lag + epsilon
        x = spread_lag.reshape(-1, 1)
        y = spread_change

        # Calculate theta
        x_mean = np.mean(x)
        y_mean = np.mean(y)

        numerator = np.sum((x.flatten() - x_mean) * (y - y_mean))
        denominator = np.sum((x.flatten() - x_mean) ** 2)

        if denominator == 0:
            return float('inf')

        theta = numerator / denominator

        # Half-life = -log(2) / theta
        if theta >= 0:
            return float('inf')  # Not mean reverting

        half_life = -np.log(2) / theta
        return float(half_life)

    def _align_price_data(
        self,
        ohlcv_data1: List[dict],
        ohlcv_data2: List[dict],
    ) -> tuple[List[float], List[float], List[dict]]:
        """
        Align two OHLCV datasets by date and extract closing prices.

        Args:
            ohlcv_data1: Primary symbol OHLCV data
            ohlcv_data2: Partner symbol OHLCV data

        Returns:
            Tuple of (aligned_prices1, aligned_prices2, aligned_ohlcv1)
        """
        # Create date-to-bar mapping for second symbol
        date_to_bar2 = {}
        for bar in ohlcv_data2:
            date_key = bar.get('date') or bar.get('timestamp', '')[:10]
            date_to_bar2[date_key] = bar

        aligned_prices1 = []
        aligned_prices2 = []
        aligned_ohlcv1 = []

        for bar1 in ohlcv_data1:
            date_key = bar1.get('date') or bar1.get('timestamp', '')[:10]
            if date_key in date_to_bar2:
                bar2 = date_to_bar2[date_key]
                aligned_prices1.append(bar1['close'])
                aligned_prices2.append(bar2['close'])
                aligned_ohlcv1.append(bar1)

        return aligned_prices1, aligned_prices2, aligned_ohlcv1

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal for pairs trading.

        This is a synchronous method that internally uses asyncio to fetch
        partner data from the Data Service.

        Args:
            symbol: Ticker symbol
            market: Market identifier (US, ASX, etc.)
            ohlcv_data: List of OHLCV bars for the primary symbol
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no trade opportunity
        """
        # =====================================================================
        # Step 1: Check if symbol has a trading pair
        # =====================================================================

        if symbol not in self.PAIRS:
            logger.debug("No trading pair defined", symbol=symbol)
            return None

        partner = self.PAIRS[symbol]

        # =====================================================================
        # Step 2: Validate primary symbol data
        # =====================================================================

        if not ohlcv_data or len(ohlcv_data) < self.config['min_data_bars']:
            logger.warning(
                "Insufficient data for analysis",
                symbol=symbol,
                bars=len(ohlcv_data) if ohlcv_data else 0,
                required=self.config['min_data_bars'],
            )
            return None

        if not validate_ohlcv_data(ohlcv_data, symbol):
            logger.warning(
                "Invalid OHLCV data",
                symbol=symbol,
                bars=len(ohlcv_data),
            )
            return None

        # =====================================================================
        # Step 3: Fetch partner data
        # =====================================================================

        # Use thread-safe sync wrapper that works in both sync and async contexts
        partner_data = self._fetch_partner_data_sync(
            partner,
            market,
            days=self.config['lookback_period'] + 20,  # Extra buffer
        )

        if not partner_data:
            logger.warning("Could not fetch partner data", partner=partner)
            return None

        if not validate_ohlcv_data(partner_data, partner):
            logger.warning("Invalid partner OHLCV data", partner=partner)
            return None

        # =====================================================================
        # Step 4: Align price data
        # =====================================================================

        prices1, prices2, aligned_ohlcv = self._align_price_data(ohlcv_data, partner_data)

        lookback = self.config['lookback_period']
        if len(prices1) < lookback:
            logger.warning(
                "Insufficient aligned data",
                symbol=symbol,
                partner=partner,
                aligned_bars=len(prices1),
                required=lookback,
            )
            return None

        # Use only lookback period
        prices1 = prices1[-lookback:]
        prices2 = prices2[-lookback:]
        aligned_ohlcv = aligned_ohlcv[-lookback:]

        # =====================================================================
        # Step 5: Calculate pairs trading metrics
        # =====================================================================

        # Calculate correlation
        correlation = self._calculate_correlation(prices1, prices2)

        if correlation < self.config['min_correlation']:
            logger.debug(
                "Correlation below threshold",
                symbol=symbol,
                partner=partner,
                correlation=correlation,
                threshold=self.config['min_correlation'],
            )
            return None

        # Calculate hedge ratio
        hedge_ratio = self._calculate_hedge_ratio(prices1, prices2)

        # Calculate spread and z-score
        z_score, spread = self._calculate_spread_zscore(prices1, prices2, hedge_ratio)

        # Calculate half-life for mean reversion speed
        half_life = self._calculate_half_life(spread)

        logger.info(
            "Pairs analysis complete",
            symbol=symbol,
            partner=partner,
            correlation=round(correlation, 3),
            hedge_ratio=round(hedge_ratio, 4),
            z_score=round(z_score, 3),
            half_life=round(half_life, 1) if half_life != float('inf') else "inf",
        )

        # =====================================================================
        # Step 6: Check for signal conditions
        # =====================================================================

        z_entry = self.config['z_score_entry']

        signal_side = SignalSide.HOLD

        # Z-score < -2.0 → BUY (spread too low, expect reversion up)
        if z_score < -z_entry:
            signal_side = SignalSide.BUY

        # Z-score > 2.0 → SELL (spread too high, expect reversion down)
        elif z_score > z_entry:
            signal_side = SignalSide.SELL

        if signal_side == SignalSide.HOLD:
            logger.debug(
                "No signal - z-score within normal range",
                symbol=symbol,
                z_score=z_score,
                entry_threshold=z_entry,
            )
            return None

        # =====================================================================
        # Step 7: Calculate technical indicators for features
        # =====================================================================

        # Extract OHLCV data for primary symbol
        highs = [bar['high'] for bar in aligned_ohlcv]
        lows = [bar['low'] for bar in aligned_ohlcv]
        closes = [bar['close'] for bar in aligned_ohlcv]
        volumes = [bar['volume'] for bar in aligned_ohlcv]

        current_price = closes[-1]
        current_volume = volumes[-1]

        # Calculate standard indicators
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, 14)
        atr = TechnicalIndicators.atr(highs, lows, closes, self.config['atr_period'])
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_sma_20 = sma_20[-1] if sma_20 else None
        current_sma_50 = sma_50[-1] if sma_50 else None
        current_sma_200 = sma_200[-1] if sma_200 else None
        current_rsi = rsi[-1] if rsi else None
        current_atr = atr[-1] if atr else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None

        # Bollinger Band values
        current_bb_upper = bb['upper'][-1] if bb['upper'] else None
        current_bb_middle = bb['middle'][-1] if bb['middle'] else None
        current_bb_lower = bb['lower'][-1] if bb['lower'] else None

        # Stochastic values
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Validate ATR
        if current_atr is None or current_atr <= 0:
            logger.warning("Invalid ATR", symbol=symbol, atr=current_atr)
            return None

        # Calculate BB metrics
        bb_width = 0.0
        bb_position = 0.5
        if current_bb_upper and current_bb_lower and current_bb_upper > current_bb_lower:
            bb_range = current_bb_upper - current_bb_lower
            bb_width = bb_range / current_bb_middle if current_bb_middle else 0.0
            bb_position = (current_price - current_bb_lower) / bb_range

        # Calculate volume metrics
        avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

        # Calculate trend strength from SMAs
        trend_strength = 0.0
        if current_sma_20 and current_sma_50 and current_sma_50 > 0:
            sma_spread = (current_sma_20 - current_sma_50) / current_sma_50
            trend_strength = max(-1.0, min(1.0, sma_spread * 10))

        # Price-to-SMA relationships
        price_to_sma_20 = (current_price - current_sma_20) / current_sma_20 if current_sma_20 else 0.0
        price_to_sma_50 = (current_price - current_sma_50) / current_sma_50 if current_sma_50 else 0.0

        # Build SignalFeatures snapshot
        features = SignalFeatures(
            price=current_price,
            sma_20=current_sma_20 or current_price,
            sma_50=current_sma_50 or current_sma_20 or current_price,
            sma_200=current_sma_200,
            rsi_14=current_rsi or 50.0,
            macd=current_macd or 0.0,
            macd_signal=current_macd_signal or 0.0,
            macd_histogram=current_macd_histogram or 0.0,
            bb_upper=current_bb_upper or 0.0,
            bb_middle=current_bb_middle or 0.0,
            bb_lower=current_bb_lower or 0.0,
            bb_width=bb_width,
            bb_position=bb_position,
            atr_14=current_atr,
            volume=int(current_volume),
            volume_sma_20=avg_volume,
            volume_ratio=volume_ratio,
            trend_strength=trend_strength,
            stoch_k=current_stoch_k,
            stoch_d=current_stoch_d,
            price_to_sma_20=price_to_sma_20,
            price_to_sma_50=price_to_sma_50,
        )

        # =====================================================================
        # Step 8: Build reasoning
        # =====================================================================

        reasoning_parts = []

        if signal_side == SignalSide.BUY:
            reasoning_parts.append(
                f"Pairs trade BUY: {symbol}/{partner} spread z-score at {z_score:.2f} "
                f"(below -{z_entry:.1f} threshold)"
            )
            reasoning_parts.append(f"Spread is oversold, expecting mean reversion upward")
        else:  # SELL
            reasoning_parts.append(
                f"Pairs trade SELL: {symbol}/{partner} spread z-score at {z_score:.2f} "
                f"(above +{z_entry:.1f} threshold)"
            )
            reasoning_parts.append(f"Spread is overbought, expecting mean reversion downward")

        reasoning_parts.append(f"Correlation: {correlation:.3f} (min: {self.config['min_correlation']})")
        reasoning_parts.append(f"Hedge ratio: {hedge_ratio:.4f}")

        if half_life != float('inf'):
            reasoning_parts.append(f"Mean reversion half-life: {half_life:.1f} bars")

        # =====================================================================
        # Step 9: Calculate confidence score
        # =====================================================================

        indicator_dict = {
            "z_score": abs(z_score),
            "correlation": correlation,
            "rsi": current_rsi,
            "trend_strength": trend_strength,
            "volume_ratio": volume_ratio,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Apply confidence adjustments based on pairs-specific factors
        confidence_boost = 0.0

        # 1. Higher z-score = stronger signal
        if abs(z_score) > 3.0:
            confidence_boost += 0.10
        elif abs(z_score) > 2.5:
            confidence_boost += 0.05

        # 2. Higher correlation = more reliable relationship
        if correlation > 0.85:
            confidence_boost += 0.08
        elif correlation > 0.80:
            confidence_boost += 0.05

        # 3. Good mean reversion speed (half-life < 20 bars)
        if half_life != float('inf') and half_life < 15:
            confidence_boost += 0.05
        elif half_life != float('inf') and half_life < 20:
            confidence_boost += 0.03

        # 4. Volume confirmation
        if volume_ratio >= 1.5:
            confidence_boost += 0.03

        # Apply boost (cap at 0.95)
        confidence_score = min(0.95, confidence_score + confidence_boost)

        # Update confidence factors with pairs-specific metrics
        confidence_factors["z_score"] = min(1.0, abs(z_score) / 4.0)
        confidence_factors["correlation"] = correlation
        confidence_factors["hedge_ratio"] = hedge_ratio
        confidence_factors["half_life"] = min(1.0, 20.0 / half_life) if half_life != float('inf') else 0.0

        # =====================================================================
        # Step 10: Calculate price targets
        # =====================================================================

        entry_price = current_price
        stop_loss = None
        target_price = None

        atr_stop_distance = current_atr * self.config['atr_multiplier_stop']
        risk_reward = self.config['risk_reward_ratio']

        if signal_side == SignalSide.BUY:
            stop_loss = entry_price - atr_stop_distance
            risk = entry_price - stop_loss
            target_price = entry_price + (risk * risk_reward)
        else:  # SELL
            stop_loss = entry_price + atr_stop_distance
            risk = stop_loss - entry_price
            target_price = entry_price - (risk * risk_reward)

        # =====================================================================
        # Step 11: Determine entry type
        # =====================================================================

        entry_type = EntryType.MARKET
        suggested_limit_price = None

        # Use limit orders for moderate confidence to get better entry
        if 0.55 < confidence_score < 0.85:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                suggested_limit_price = entry_price - offset
            else:
                suggested_limit_price = entry_price + offset

        # =====================================================================
        # Step 12: Generate invalidation rules
        # =====================================================================

        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="mean_reversion",  # Pairs trading is mean reversion
            atr=current_atr,
        )

        # Add pairs-specific invalidation rules
        z_exit = self.config['z_score_exit']

        if signal_side == SignalSide.BUY:
            # Exit BUY when z-score reverts to near zero (mean reversion complete)
            invalidation_rules.append(InvalidationRule(
                condition="z_score_mean_reversion",
                threshold=z_exit,
                description=f"Z-score reverted above {z_exit} (mean reversion complete, take profit)",
                comparison="gt",
                feature_name="z_score",
            ))
            # Invalidate if correlation breaks down
            invalidation_rules.append(InvalidationRule(
                condition="correlation_breakdown",
                threshold=self.config['min_correlation'] - 0.1,
                description=f"Correlation dropped below {self.config['min_correlation'] - 0.1:.2f} (relationship broken)",
                comparison="lt",
                feature_name="correlation",
            ))
        else:  # SELL
            # Exit SELL when z-score reverts to near zero
            invalidation_rules.append(InvalidationRule(
                condition="z_score_mean_reversion",
                threshold=-z_exit,
                description=f"Z-score reverted below {-z_exit} (mean reversion complete, take profit)",
                comparison="lt",
                feature_name="z_score",
            ))
            # Invalidate if correlation breaks down
            invalidation_rules.append(InvalidationRule(
                condition="correlation_breakdown",
                threshold=self.config['min_correlation'] - 0.1,
                description=f"Correlation dropped below {self.config['min_correlation'] - 0.1:.2f} (relationship broken)",
                comparison="lt",
                feature_name="correlation",
            ))

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="pairs_trading_v1",
            strategy_version=self.VERSION,
            market=market,
            entry_type=entry_type,
            suggested_limit_price=suggested_limit_price,
            time_in_force=TimeInForce.DAY,
            entry_price=entry_price,
            target_price=target_price,
            stop_loss=stop_loss,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors,
            reason=reasoning,
            features=features,
            invalidation_rules=invalidation_rules,
            valid_until=datetime.utcnow() + timedelta(days=1),
            data_snapshot_hash=data_hash,
            rule_version_id=f"pairs_trading_v1_{self.VERSION}",
        )
