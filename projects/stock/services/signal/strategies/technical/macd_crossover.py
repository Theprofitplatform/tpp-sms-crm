"""
MACD Crossover Strategy

A trend-following strategy that generates signals based on MACD (Moving Average
Convergence Divergence) crossovers with optional trend and histogram confirmation.

Entry Conditions (BUY - Bullish Crossover):
- MACD line crosses above the signal line
- Histogram is positive and increasing (momentum confirmation)
- Optional: Price above 200 SMA (trend filter)
- Stop loss at entry minus ATR multiplier
- Target at risk:reward ratio (default 2:1)

Entry Conditions (SELL - Bearish Crossover):
- MACD line crosses below the signal line
- Histogram is negative and decreasing (momentum confirmation)
- Optional: Price below 200 SMA (trend filter)
- Stop loss at entry plus ATR multiplier
- Target at risk:reward ratio (default 2:1)

Signal Strength Factors:
- Histogram momentum (increasing/decreasing)
- Distance from zero line (stronger signals near zero)
- Trend alignment (price vs 200 SMA)
- Volume confirmation

Usage:
    strategy = MACDCrossoverStrategy()
    signal = strategy.analyze(symbol="AAPL", market="US", ohlcv_data=data, data_hash="abc123")
    if signal:
        print(f"Signal: {signal.side} with confidence {signal.confidence_score}")

Dependencies:
    - Python 3.10+
    - indicators.technical
    - models.signal
    - confidence.scorer
    - confidence.invalidation
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import structlog

from indicators.technical import TechnicalIndicators
from models import Signal, SignalFeatures, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer, generate_invalidation_rules

logger = structlog.get_logger(__name__)


class MACDCrossoverStrategy:
    """
    MACD Crossover trading strategy.

    Uses MACD line and signal line crossovers with histogram confirmation
    and optional 200 SMA trend filter for trade direction.
    """

    NAME = "MACD Crossover Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "Trend-following strategy using MACD crossovers with histogram and trend confirmation"

    DEFAULT_CONFIG = {
        # MACD parameters
        "fast_period": 12,      # Fast EMA period
        "slow_period": 26,      # Slow EMA period
        "signal_period": 9,     # Signal line period

        # Confirmation settings
        "require_histogram_confirmation": True,  # Require histogram momentum
        "require_trend_filter": False,           # Require 200 SMA alignment
        "histogram_bars_check": 2,               # Number of bars to check histogram trend

        # Risk management
        "atr_period": 14,
        "atr_multiplier_stop": 2.0,              # Stop loss = 2 ATR
        "risk_reward_ratio": 2.0,                # Target = 2x risk (2:1 R:R)

        # Volume confirmation (optional)
        "require_volume_confirmation": False,
        "volume_threshold": 1.2,                 # Volume must be 1.2x average

        # Entry settings
        "min_data_bars": 50,                     # Minimum bars needed for analysis
        "limit_order_offset_pct": 0.001,         # 0.1% offset for limit orders

        # Zero line distance scoring
        "zero_line_distance_threshold": 0.5,    # % of price for "near zero" bonus
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize MACD crossover strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="macd_crossover")
        logger.info("MACD Crossover strategy initialized", config=self.config)

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal based on MACD crossovers.

        Args:
            symbol: Ticker symbol
            market: Market identifier (US, ASX, etc.)
            ohlcv_data: List of OHLCV bars
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no crossover detected
        """
        # Validate data
        if len(ohlcv_data) < self.config['min_data_bars']:
            logger.warning(
                "Insufficient data for analysis",
                symbol=symbol,
                bars=len(ohlcv_data),
                required=self.config['min_data_bars'],
            )
            return None

        # Extract price and volume data
        opens = [bar['open'] for bar in ohlcv_data]
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate MACD with configurable parameters
        macd = TechnicalIndicators.macd(
            closes,
            fast_period=self.config['fast_period'],
            slow_period=self.config['slow_period'],
            signal_period=self.config['signal_period'],
        )

        # Calculate other indicators
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, 14)
        atr = TechnicalIndicators.atr(highs, lows, closes, self.config['atr_period'])
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_volume = volumes[-1]

        # MACD values (current and previous for crossover detection)
        current_macd = macd['macd'][-1] if macd['macd'] and macd['macd'][-1] is not None else None
        current_signal = macd['signal'][-1] if macd['signal'] and macd['signal'][-1] is not None else None
        current_histogram = macd['histogram'][-1] if macd['histogram'] and macd['histogram'][-1] is not None else None

        prev_macd = macd['macd'][-2] if len(macd['macd']) > 1 and macd['macd'][-2] is not None else None
        prev_signal = macd['signal'][-2] if len(macd['signal']) > 1 and macd['signal'][-2] is not None else None
        prev_histogram = macd['histogram'][-2] if len(macd['histogram']) > 1 and macd['histogram'][-2] is not None else None

        # Additional histogram history for momentum confirmation
        histogram_history = []
        for i in range(1, self.config['histogram_bars_check'] + 2):
            idx = -i
            if len(macd['histogram']) >= abs(idx) and macd['histogram'][idx] is not None:
                histogram_history.append(macd['histogram'][idx])

        # Other indicator values
        current_sma_20 = sma_20[-1] if sma_20 else None
        current_sma_50 = sma_50[-1] if sma_50 else None
        current_sma_200 = sma_200[-1] if sma_200 else None
        current_rsi = rsi[-1] if rsi else None
        current_atr = atr[-1] if atr else None

        # Bollinger Band values
        current_bb_upper = bb['upper'][-1] if bb['upper'] else None
        current_bb_middle = bb['middle'][-1] if bb['middle'] else None
        current_bb_lower = bb['lower'][-1] if bb['lower'] else None

        # Stochastic values
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Validate required values
        if None in [current_macd, current_signal, prev_macd, prev_signal, current_atr]:
            logger.warning("Missing MACD indicator values", symbol=symbol)
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
        if current_sma_20 and current_sma_50:
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
            macd_signal=current_signal or 0.0,
            macd_histogram=current_histogram or 0.0,
            bb_upper=current_bb_upper or 0.0,
            bb_middle=current_bb_middle or 0.0,
            bb_lower=current_bb_lower or 0.0,
            bb_width=bb_width,
            bb_position=bb_position,
            atr_14=current_atr or 0.0,
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
        # MACD Crossover Detection
        # =====================================================================

        # Detect crossovers
        bullish_crossover = prev_macd <= prev_signal and current_macd > current_signal
        bearish_crossover = prev_macd >= prev_signal and current_macd < current_signal

        # If no crossover, no signal
        if not bullish_crossover and not bearish_crossover:
            return None

        # =====================================================================
        # Confirmation Checks
        # =====================================================================

        # Histogram confirmation (momentum)
        histogram_bullish = False
        histogram_bearish = False

        if current_histogram is not None and prev_histogram is not None:
            # For bullish: histogram should be positive or increasing
            histogram_bullish = current_histogram > prev_histogram
            # For bearish: histogram should be negative or decreasing
            histogram_bearish = current_histogram < prev_histogram

        # Extended histogram momentum check (last N bars)
        histogram_momentum_confirmed = True
        if self.config['require_histogram_confirmation'] and len(histogram_history) >= 2:
            if bullish_crossover:
                # Check if histogram is consistently increasing
                for i in range(len(histogram_history) - 1):
                    if histogram_history[i] <= histogram_history[i + 1]:
                        histogram_momentum_confirmed = False
                        break
            elif bearish_crossover:
                # Check if histogram is consistently decreasing
                for i in range(len(histogram_history) - 1):
                    if histogram_history[i] >= histogram_history[i + 1]:
                        histogram_momentum_confirmed = False
                        break

        # Trend filter (200 SMA)
        trend_aligned = True
        if self.config['require_trend_filter'] and current_sma_200 is not None:
            if bullish_crossover:
                trend_aligned = current_price > current_sma_200
            elif bearish_crossover:
                trend_aligned = current_price < current_sma_200

        # Volume confirmation
        volume_confirmed = True
        if self.config['require_volume_confirmation']:
            volume_confirmed = volume_ratio >= self.config['volume_threshold']

        # Apply required confirmations
        if self.config['require_histogram_confirmation'] and not histogram_momentum_confirmed:
            logger.debug(
                "MACD crossover rejected - histogram momentum not confirmed",
                symbol=symbol,
                histogram_history=histogram_history,
            )
            return None

        if self.config['require_trend_filter'] and not trend_aligned:
            logger.debug(
                "MACD crossover rejected - trend filter not aligned",
                symbol=symbol,
                price=current_price,
                sma_200=current_sma_200,
            )
            return None

        if self.config['require_volume_confirmation'] and not volume_confirmed:
            logger.debug(
                "MACD crossover rejected - volume not confirmed",
                symbol=symbol,
                volume_ratio=volume_ratio,
            )
            return None

        # =====================================================================
        # Generate Signal
        # =====================================================================

        signal_side = SignalSide.HOLD
        reasoning_parts = []

        if bullish_crossover:
            signal_side = SignalSide.BUY

            reasoning_parts.append(
                f"Bullish MACD crossover: MACD ({current_macd:.4f}) crossed above "
                f"Signal ({current_signal:.4f})"
            )

            if histogram_bullish:
                reasoning_parts.append(f"Histogram increasing ({prev_histogram:.4f} -> {current_histogram:.4f})")

            if current_sma_200 and current_price > current_sma_200:
                reasoning_parts.append(f"Price ({current_price:.2f}) above 200 SMA ({current_sma_200:.2f})")

            if volume_ratio >= self.config['volume_threshold']:
                reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms move")

        elif bearish_crossover:
            signal_side = SignalSide.SELL

            reasoning_parts.append(
                f"Bearish MACD crossover: MACD ({current_macd:.4f}) crossed below "
                f"Signal ({current_signal:.4f})"
            )

            if histogram_bearish:
                reasoning_parts.append(f"Histogram decreasing ({prev_histogram:.4f} -> {current_histogram:.4f})")

            if current_sma_200 and current_price < current_sma_200:
                reasoning_parts.append(f"Price ({current_price:.2f}) below 200 SMA ({current_sma_200:.2f})")

            if volume_ratio >= self.config['volume_threshold']:
                reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms move")

        if signal_side == SignalSide.HOLD:
            return None

        # =====================================================================
        # Calculate Confidence Score
        # =====================================================================

        indicator_dict = {
            "macd_histogram": current_histogram,
            "rsi": current_rsi,
            "trend_strength": trend_strength,
            "volume_ratio": volume_ratio,
            "price_to_sma_20": price_to_sma_20,
            "stoch_k": current_stoch_k,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Apply confidence adjustments based on MACD-specific factors
        confidence_boost = 0.0

        # 1. Histogram momentum boost
        if bullish_crossover and histogram_bullish:
            histogram_change = abs(current_histogram - prev_histogram)
            if histogram_change > 0.1:  # Strong momentum
                confidence_boost += 0.05
            elif histogram_change > 0.05:
                confidence_boost += 0.03
        elif bearish_crossover and histogram_bearish:
            histogram_change = abs(current_histogram - prev_histogram)
            if histogram_change > 0.1:
                confidence_boost += 0.05
            elif histogram_change > 0.05:
                confidence_boost += 0.03

        # 2. Zero line distance bonus (crossovers near zero are often stronger)
        zero_distance = abs(current_macd)
        zero_threshold = current_price * (self.config['zero_line_distance_threshold'] / 100)
        if zero_distance < zero_threshold:
            confidence_boost += 0.05  # Near zero crossover
            reasoning_parts.append(f"Crossover near zero line (distance: {zero_distance:.4f})")

        # 3. Trend alignment boost
        if current_sma_200 is not None:
            if bullish_crossover and current_price > current_sma_200:
                confidence_boost += 0.05
            elif bearish_crossover and current_price < current_sma_200:
                confidence_boost += 0.05

        # 4. Volume boost
        if volume_ratio >= 2.0:
            confidence_boost += 0.05
        elif volume_ratio >= 1.5:
            confidence_boost += 0.03

        # Apply boost (cap at 0.95)
        confidence_score = min(0.95, confidence_score + confidence_boost)

        # Update confidence factors with MACD-specific metrics
        confidence_factors["histogram_momentum"] = min(1.0, abs(current_histogram - prev_histogram) * 10) if prev_histogram else 0.5
        confidence_factors["zero_line_proximity"] = max(0.0, 1.0 - (zero_distance / (current_price * 0.02)))
        confidence_factors["trend_alignment"] = 1.0 if (
            (bullish_crossover and current_sma_200 and current_price > current_sma_200) or
            (bearish_crossover and current_sma_200 and current_price < current_sma_200)
        ) else 0.5

        # =====================================================================
        # Calculate Price Targets
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
        # Determine Entry Type
        # =====================================================================

        entry_type = EntryType.MARKET
        suggested_limit_price = None

        # Use limit orders for moderate confidence
        if 0.6 < confidence_score < 0.8:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                suggested_limit_price = entry_price - offset
            else:
                suggested_limit_price = entry_price + offset

        # =====================================================================
        # Generate Invalidation Rules
        # =====================================================================

        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="macd_crossover",
            atr=current_atr,
        )

        # Add MACD-specific invalidation rules
        if signal_side == SignalSide.BUY:
            invalidation_rules.append({
                "condition": "macd_reversal",
                "threshold": current_signal,
                "description": f"MACD crosses back below signal line ({current_signal:.4f})",
                "comparison": "lt",
                "feature_name": "macd_vs_signal",
            })
            invalidation_rules.append({
                "condition": "histogram_reversal",
                "threshold": 0,
                "description": "Histogram turns negative",
                "comparison": "lt",
                "feature_name": "macd_histogram",
            })
        else:  # SELL
            invalidation_rules.append({
                "condition": "macd_reversal",
                "threshold": current_signal,
                "description": f"MACD crosses back above signal line ({current_signal:.4f})",
                "comparison": "gt",
                "feature_name": "macd_vs_signal",
            })
            invalidation_rules.append({
                "condition": "histogram_reversal",
                "threshold": 0,
                "description": "Histogram turns positive",
                "comparison": "gt",
                "feature_name": "macd_histogram",
            })

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="macd_crossover_v1",
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
            rule_version_id=f"macd_crossover_v1_{self.VERSION}",
        )
