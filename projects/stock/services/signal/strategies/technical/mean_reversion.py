"""
Mean Reversion Strategy

A contrarian strategy that generates signals based on:
- Bollinger Band extremes
- RSI overbought/oversold conditions
- Price deviation from moving average

Entry Conditions (BUY):
- Price touches or breaks below lower Bollinger Band
- RSI oversold (< 30)
- Price below SMA (deviation threshold)

Exit Conditions (SELL):
- Price touches or breaks above upper Bollinger Band
- RSI overbought (> 70)
- Price returns to middle band (profit target)

Usage:
    strategy = MeanReversionStrategy()
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


class MeanReversionStrategy:
    """
    Mean reversion strategy using Bollinger Bands and RSI.

    Buys when price is at extreme lows, sells when price reverts to mean.
    """

    NAME = "Mean Reversion Strategy"
    TYPE = "technical"
    VERSION = "1.1.0"
    DESCRIPTION = "Contrarian strategy using Bollinger Bands and RSI for mean reversion trades"

    DEFAULT_CONFIG = {
        "bb_period": 20,
        "bb_std": 2.0,
        "rsi_period": 14,
        "rsi_overbought": 70,
        "rsi_oversold": 30,
        "deviation_threshold": 0.02,  # 2% deviation from SMA
        "holding_period_days": 5,
        "atr_multiplier_stop": 1.5,  # Tighter stop for mean reversion
        "min_data_bars": 30,
        "limit_order_offset_pct": 0.003,  # 0.3% offset for limit orders
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize mean reversion strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="mean_reversion")
        logger.info("Mean reversion strategy initialized", config=self.config)

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal.

        Args:
            symbol: Ticker symbol
            market: Market identifier
            ohlcv_data: List of OHLCV bars
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no signal
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
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate indicators
        bb = TechnicalIndicators.bollinger_bands(
            closes,
            self.config['bb_period'],
            self.config['bb_std'],
        )
        rsi = TechnicalIndicators.rsi(closes, self.config['rsi_period'])
        atr = TechnicalIndicators.atr(highs, lows, closes)
        sma = TechnicalIndicators.sma(closes, self.config['bb_period'])
        sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        macd = TechnicalIndicators.macd(closes)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_bb_upper = bb['upper'][-1]
        current_bb_middle = bb['middle'][-1]
        current_bb_lower = bb['lower'][-1]
        current_rsi = rsi[-1] if rsi else None
        current_atr = atr[-1] if atr else None
        current_sma = sma[-1] if sma else None
        current_sma_50 = sma_50[-1] if sma_50 else None
        current_sma_200 = sma_200[-1] if sma_200 else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Validate we have all required values
        if None in [current_bb_upper, current_bb_middle, current_bb_lower, current_rsi, current_sma]:
            logger.warning("Missing indicator values", symbol=symbol)
            return None

        # Calculate price position relative to Bollinger Bands
        bb_range = current_bb_upper - current_bb_lower
        if bb_range <= 0:
            return None

        bb_position = (current_price - current_bb_lower) / bb_range  # 0 to 1 (below to above)
        bb_width = bb_range / current_bb_middle if current_bb_middle else 0.0

        # Calculate deviation from SMA
        sma_deviation = (current_price - current_sma) / current_sma if current_sma else 0

        # Calculate price-to-SMA relationships
        price_to_sma_20 = sma_deviation
        price_to_sma_50 = (current_price - current_sma_50) / current_sma_50 if current_sma_50 else 0.0

        # Calculate volume metrics
        avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

        # Calculate trend strength (for context)
        trend_strength = 0.0
        if current_sma and current_sma_50:
            sma_spread = (current_sma - current_sma_50) / current_sma_50
            trend_strength = max(-1.0, min(1.0, sma_spread * 10))

        # Build SignalFeatures snapshot
        features = SignalFeatures(
            price=current_price,
            sma_20=current_sma,
            sma_50=current_sma_50 or current_sma,
            sma_200=current_sma_200,
            rsi_14=current_rsi or 50.0,
            macd=current_macd or 0.0,
            macd_signal=current_macd_signal or 0.0,
            macd_histogram=current_macd_histogram or 0.0,
            bb_upper=current_bb_upper,
            bb_middle=current_bb_middle,
            bb_lower=current_bb_lower,
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

        # Signal conditions
        price_at_lower_band = current_price <= current_bb_lower
        price_near_lower_band = bb_position < 0.2
        price_at_upper_band = current_price >= current_bb_upper
        price_near_upper_band = bb_position > 0.8

        rsi_oversold = current_rsi < self.config['rsi_oversold']
        rsi_overbought = current_rsi > self.config['rsi_overbought']

        price_below_sma = sma_deviation < -self.config['deviation_threshold']
        price_above_sma = sma_deviation > self.config['deviation_threshold']

        # Generate signal
        signal_side = SignalSide.HOLD
        reasoning_parts = []

        # BUY Signal Logic (price at extreme lows)
        if (price_at_lower_band or price_near_lower_band) and rsi_oversold:
            signal_side = SignalSide.BUY

            if price_at_lower_band:
                reasoning_parts.append(f"Price ({current_price:.2f}) at lower Bollinger Band ({current_bb_lower:.2f})")
            elif price_near_lower_band:
                reasoning_parts.append(f"Price ({current_price:.2f}) near lower Bollinger Band (BB position: {bb_position:.2%})")

            if rsi_oversold:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) indicates oversold condition")

            if price_below_sma:
                reasoning_parts.append(f"Price {abs(sma_deviation):.1%} below SMA - reversion expected")

        # SELL Signal Logic (price at extreme highs or take profit)
        elif (price_at_upper_band or price_near_upper_band) and rsi_overbought:
            signal_side = SignalSide.SELL

            if price_at_upper_band:
                reasoning_parts.append(f"Price ({current_price:.2f}) at upper Bollinger Band ({current_bb_upper:.2f})")
            elif price_near_upper_band:
                reasoning_parts.append(f"Price ({current_price:.2f}) near upper Bollinger Band (BB position: {bb_position:.2%})")

            if rsi_overbought:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) indicates overbought condition")

            if price_above_sma:
                reasoning_parts.append(f"Price {sma_deviation:.1%} above SMA - reversion expected")

        # If no clear signal, return None
        if signal_side == SignalSide.HOLD:
            return None

        # Calculate confidence score using the scorer
        indicator_dict = {
            "rsi": current_rsi,
            "bb_position": bb_position,
            "sma_deviation": sma_deviation,
            "volume_ratio": volume_ratio,
            "stoch_k": current_stoch_k,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Calculate price targets
        entry_price = current_price
        stop_loss = None
        target_price = current_bb_middle  # Target is always the middle band

        if current_atr:
            if signal_side == SignalSide.BUY:
                stop_loss = entry_price - (current_atr * self.config['atr_multiplier_stop'])
            else:  # SELL
                stop_loss = entry_price + (current_atr * self.config['atr_multiplier_stop'])

        # Determine entry type and limit price
        # Mean reversion often benefits from limit orders at extremes
        entry_type = EntryType.LIMIT
        suggested_limit_price = None

        offset = entry_price * self.config['limit_order_offset_pct']
        if signal_side == SignalSide.BUY:
            # Try to buy at an even lower price
            suggested_limit_price = entry_price - offset
        else:
            # Try to sell at an even higher price
            suggested_limit_price = entry_price + offset

        # For very high confidence signals, use market orders
        if confidence_score > 0.85:
            entry_type = EntryType.MARKET
            suggested_limit_price = None

        # Generate invalidation rules
        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="mean_reversion",
            atr=current_atr,
        )

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="mean_reversion_v1",
            strategy_version=self.VERSION,
            market=market,
            entry_type=entry_type,
            suggested_limit_price=suggested_limit_price,
            time_in_force=TimeInForce.GTC,  # Mean reversion trades may take time
            entry_price=entry_price,
            target_price=target_price,
            stop_loss=stop_loss,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors,
            reason=reasoning,
            features=features,
            invalidation_rules=invalidation_rules,
            valid_until=datetime.utcnow() + timedelta(days=self.config['holding_period_days']),
            data_snapshot_hash=data_hash,
            rule_version_id=f"mean_reversion_v1_{self.VERSION}",
        )
