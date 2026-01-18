"""
Momentum Strategy

A trend-following strategy that generates signals based on:
- SMA crossovers (fast/slow)
- RSI confirmation
- Volume confirmation

Entry Conditions (BUY):
- Fast SMA crosses above Slow SMA
- RSI > 50 and not overbought (< 70)
- Volume above average

Exit Conditions (SELL):
- Fast SMA crosses below Slow SMA
- RSI < 50 or overbought (> 70)

Usage:
    strategy = MomentumStrategy()
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


class MomentumStrategy:
    """
    Trend-following momentum strategy.

    Uses SMA crossovers with RSI and volume confirmation.
    """

    NAME = "Momentum Strategy"
    TYPE = "technical"
    VERSION = "1.1.0"
    DESCRIPTION = "Trend-following strategy using SMA crossovers with RSI and volume confirmation"

    DEFAULT_CONFIG = {
        "fast_period": 20,
        "slow_period": 50,
        "rsi_period": 14,
        "rsi_overbought": 70,
        "rsi_oversold": 30,
        "rsi_neutral": 50,
        "volume_threshold": 1.5,  # Volume must be 1.5x average
        "atr_multiplier_stop": 2.0,  # Stop loss = 2 ATR
        "atr_multiplier_target": 3.0,  # Target = 3 ATR (1.5:1 R:R)
        "min_data_bars": 60,
        "limit_order_offset_pct": 0.002,  # 0.2% below current for BUY limit orders
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize momentum strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="momentum")
        logger.info("Momentum strategy initialized", config=self.config)

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
        opens = [bar['open'] for bar in ohlcv_data]
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate indicators
        fast_sma = TechnicalIndicators.sma(closes, self.config['fast_period'])
        slow_sma = TechnicalIndicators.sma(closes, self.config['slow_period'])
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, self.config['rsi_period'])
        atr = TechnicalIndicators.atr(highs, lows, closes)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_fast_sma = fast_sma[-1]
        current_slow_sma = slow_sma[-1]
        prev_fast_sma = fast_sma[-2] if len(fast_sma) > 1 else None
        prev_slow_sma = slow_sma[-2] if len(slow_sma) > 1 else None
        current_rsi = rsi[-1] if rsi else None
        current_atr = atr[-1] if atr else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None
        current_sma_200 = sma_200[-1] if sma_200 else None

        # Bollinger Band values
        current_bb_upper = bb['upper'][-1] if bb['upper'] else None
        current_bb_middle = bb['middle'][-1] if bb['middle'] else None
        current_bb_lower = bb['lower'][-1] if bb['lower'] else None

        # Calculate BB position and width
        bb_width = 0.0
        bb_position = 0.5
        if current_bb_upper and current_bb_lower and current_bb_upper > current_bb_lower:
            bb_range = current_bb_upper - current_bb_lower
            bb_width = bb_range / current_bb_middle if current_bb_middle else 0.0
            bb_position = (current_price - current_bb_lower) / bb_range

        # Stochastic values
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Calculate volume average
        avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

        # Calculate price-to-SMA relationships
        price_to_sma_20 = (current_price - current_fast_sma) / current_fast_sma if current_fast_sma else 0.0
        price_to_sma_50 = (current_price - current_slow_sma) / current_slow_sma if current_slow_sma else 0.0

        # Calculate trend strength (-1 to 1)
        trend_strength = 0.0
        if current_fast_sma and current_slow_sma:
            sma_spread = (current_fast_sma - current_slow_sma) / current_slow_sma
            trend_strength = max(-1.0, min(1.0, sma_spread * 10))  # Normalize to -1 to 1

        # Validate we have all required values
        if None in [current_fast_sma, current_slow_sma, prev_fast_sma, prev_slow_sma, current_rsi]:
            logger.warning("Missing indicator values", symbol=symbol)
            return None

        # Build SignalFeatures snapshot
        features = SignalFeatures(
            price=current_price,
            sma_20=current_fast_sma,
            sma_50=current_slow_sma,
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

        # Check for crossover signals
        bullish_crossover = prev_fast_sma <= prev_slow_sma and current_fast_sma > current_slow_sma
        bearish_crossover = prev_fast_sma >= prev_slow_sma and current_fast_sma < current_slow_sma

        # Trend direction
        uptrend = current_fast_sma > current_slow_sma
        downtrend = current_fast_sma < current_slow_sma

        # RSI conditions
        rsi_bullish = self.config['rsi_neutral'] < current_rsi < self.config['rsi_overbought']
        rsi_bearish = current_rsi < self.config['rsi_neutral'] or current_rsi > self.config['rsi_overbought']
        rsi_oversold = current_rsi < self.config['rsi_oversold']

        # Volume confirmation
        volume_confirmed = volume_ratio >= self.config['volume_threshold']

        # Generate signal
        signal_side = SignalSide.HOLD
        reasoning_parts = []

        # BUY Signal Logic
        if bullish_crossover or (uptrend and rsi_oversold):
            signal_side = SignalSide.BUY

            if bullish_crossover:
                reasoning_parts.append(f"Bullish crossover: Fast SMA ({current_fast_sma:.2f}) crossed above Slow SMA ({current_slow_sma:.2f})")

            if rsi_bullish:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) confirms bullish momentum")

            if rsi_oversold:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) indicates oversold condition")

            if volume_confirmed:
                reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms move")

        # SELL Signal Logic
        elif bearish_crossover or (downtrend and current_rsi > self.config['rsi_overbought']):
            signal_side = SignalSide.SELL

            if bearish_crossover:
                reasoning_parts.append(f"Bearish crossover: Fast SMA ({current_fast_sma:.2f}) crossed below Slow SMA ({current_slow_sma:.2f})")

            if rsi_bearish:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) confirms bearish momentum")

            if volume_confirmed:
                reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms move")

        # If no clear signal, return None
        if signal_side == SignalSide.HOLD:
            return None

        # Calculate confidence score using the scorer
        indicator_dict = {
            "rsi": current_rsi,
            "macd_histogram": current_macd_histogram,
            "trend_strength": trend_strength,
            "volume_ratio": volume_ratio,
            "price_to_sma_20": price_to_sma_20,
            "stoch_k": current_stoch_k,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Calculate price targets
        entry_price = current_price
        stop_loss = None
        target_price = None

        if current_atr:
            if signal_side == SignalSide.BUY:
                stop_loss = entry_price - (current_atr * self.config['atr_multiplier_stop'])
                target_price = entry_price + (current_atr * self.config['atr_multiplier_target'])
            else:  # SELL
                stop_loss = entry_price + (current_atr * self.config['atr_multiplier_stop'])
                target_price = entry_price - (current_atr * self.config['atr_multiplier_target'])

        # Determine entry type and limit price
        entry_type = EntryType.MARKET
        suggested_limit_price = None

        # Use limit orders when confidence is moderate (not rushing in)
        if 0.5 < confidence_score < 0.85:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                suggested_limit_price = entry_price - offset  # Buy slightly lower
            else:
                suggested_limit_price = entry_price + offset  # Sell slightly higher

        # Generate invalidation rules
        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="momentum",
            atr=current_atr,
        )

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="momentum_v1",
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
            rule_version_id=f"momentum_v1_{self.VERSION}",
        )
