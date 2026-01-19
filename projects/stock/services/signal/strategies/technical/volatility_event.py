"""
Volatility Event Strategy

Detects major market events (earnings-like) via volume/volatility spikes and gaps,
then trades the follow-through momentum.

Key Concept:
    Detect major market events through volume spikes and price gaps, then trade
    the drift/continuation in the direction of the gap.

Event Detection Criteria:
    1. Volume spike: current_volume > avg_volume * 2.5
    2. Price gap: abs(open - prev_close) / prev_close > 2%
    3. Volatility spike: current_atr > avg_atr * 1.5

Entry Conditions (BUY):
    - Gap up detected (open > prev_close by > 2%)
    - Volume spike confirms the move (> 2.5x average)
    - Price is following through (making higher closes)

Entry Conditions (SELL):
    - Gap down detected (open < prev_close by > 2%)
    - Volume spike confirms the move (> 2.5x average)
    - Price is following through (making lower closes)

Usage:
    strategy = VolatilityEventStrategy()
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
from typing import Optional, List, Dict, Any, Tuple

import structlog

from indicators.technical import TechnicalIndicators
from models import Signal, SignalFeatures, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer, generate_invalidation_rules

logger = structlog.get_logger(__name__)


class VolatilityEventStrategy:
    """
    Volatility event detection and momentum continuation strategy.

    Detects earnings-like events via volume/volatility spikes and gaps,
    then trades the follow-through drift.
    """

    NAME = "Volatility Event Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "Detects earnings-like events via volume/volatility spikes and trades momentum continuation"

    DEFAULT_CONFIG = {
        "volume_spike_threshold": 2.5,      # Volume > 2.5x average triggers event
        "gap_threshold_pct": 0.02,          # 2% gap triggers event
        "event_lookback_bars": 5,           # Bars to look back for event detection
        "require_follow_through": True,     # Require price continuation
        "follow_through_bars": 3,           # Bars to check for follow-through
        "volatility_spike_threshold": 1.5,  # ATR spike > 1.5x average triggers event
        "atr_multiplier_stop": 2.0,         # Stop loss = 2 ATR from entry
        "atr_multiplier_target": 3.0,       # Target = 3 ATR (1.5:1 R:R)
        "min_data_bars": 30,                # Minimum bars required
        "volume_lookback": 20,              # Bars for average volume calculation
        "atr_lookback": 20,                 # Bars for average ATR calculation
        "limit_order_offset_pct": 0.002,    # 0.2% offset for limit orders
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize volatility event strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="volatility_event")
        logger.info("Volatility Event strategy initialized", config=self.config)

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal based on volatility events.

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
        fast_sma = TechnicalIndicators.sma(closes, 20)
        slow_sma = TechnicalIndicators.sma(closes, 50)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, 14)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_fast_sma = fast_sma[-1]
        current_slow_sma = slow_sma[-1]
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

        # Calculate volume metrics
        volume_lookback = self.config['volume_lookback']
        avg_volume = sum(volumes[-volume_lookback-1:-1]) / volume_lookback if len(volumes) > volume_lookback else sum(volumes[:-1]) / max(1, len(volumes) - 1)
        current_volume = volumes[-1]
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

        # Calculate ATR metrics for volatility detection
        atr_lookback = self.config['atr_lookback']
        valid_atr = [a for a in atr[-atr_lookback-1:-1] if a is not None]
        avg_atr = sum(valid_atr) / len(valid_atr) if valid_atr else current_atr or 0
        atr_ratio = current_atr / avg_atr if avg_atr and current_atr else 1.0

        # Calculate price-to-SMA relationships
        price_to_sma_20 = (current_price - current_fast_sma) / current_fast_sma if current_fast_sma else 0.0
        price_to_sma_50 = (current_price - current_slow_sma) / current_slow_sma if current_slow_sma else 0.0

        # Calculate trend strength (-1 to 1)
        trend_strength = 0.0
        if current_fast_sma and current_slow_sma:
            sma_spread = (current_fast_sma - current_slow_sma) / current_slow_sma
            trend_strength = max(-1.0, min(1.0, sma_spread * 10))

        # Validate we have required values
        if current_atr is None or current_rsi is None:
            logger.warning("Missing indicator values", symbol=symbol)
            return None

        # =========================================================================
        # Event Detection
        # =========================================================================

        # Detect volume spike
        volume_spike = self._detect_volume_spike(
            volumes,
            threshold=self.config['volume_spike_threshold'],
            lookback=volume_lookback
        )

        # Detect price gap
        gap_direction, gap_pct = self._detect_gap(
            opens,
            closes,
            threshold_pct=self.config['gap_threshold_pct']
        )

        # Detect volatility spike
        volatility_spike = self._detect_volatility_spike(
            atr,
            threshold=self.config['volatility_spike_threshold'],
            lookback=atr_lookback
        )

        # Check for follow-through if required
        follow_through = True
        if self.config['require_follow_through'] and gap_direction:
            follow_through = self._check_follow_through(
                closes,
                gap_direction,
                lookback=self.config['follow_through_bars']
            )

        # Determine if we have an event
        event_detected = (volume_spike or volatility_spike) and gap_direction is not None

        # Log event detection for debugging
        logger.debug(
            "Event detection results",
            symbol=symbol,
            volume_spike=volume_spike,
            volatility_spike=volatility_spike,
            gap_direction=gap_direction,
            gap_pct=gap_pct,
            follow_through=follow_through,
            event_detected=event_detected,
        )

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

        # Generate signal based on event
        signal_side = SignalSide.HOLD
        reasoning_parts = []

        # BUY Signal: Gap up with volume/volatility spike and follow-through
        if event_detected and gap_direction == "gap_up" and follow_through:
            signal_side = SignalSide.BUY
            reasoning_parts.append(f"Gap up detected: {gap_pct*100:.1f}% gap on open")

            if volume_spike:
                reasoning_parts.append(f"Volume spike confirmed: {volume_ratio:.1f}x average")

            if volatility_spike:
                reasoning_parts.append(f"Volatility spike: ATR {atr_ratio:.1f}x average")

            if self.config['require_follow_through']:
                reasoning_parts.append("Price following through with higher closes")

        # SELL Signal: Gap down with volume/volatility spike and follow-through
        elif event_detected and gap_direction == "gap_down" and follow_through:
            signal_side = SignalSide.SELL
            reasoning_parts.append(f"Gap down detected: {abs(gap_pct)*100:.1f}% gap on open")

            if volume_spike:
                reasoning_parts.append(f"Volume spike confirmed: {volume_ratio:.1f}x average")

            if volatility_spike:
                reasoning_parts.append(f"Volatility spike: ATR {atr_ratio:.1f}x average")

            if self.config['require_follow_through']:
                reasoning_parts.append("Price following through with lower closes")

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

        # Add event-specific factors to boost confidence
        if volume_spike:
            indicator_dict["volume_ratio"] = max(volume_ratio, 2.0)  # Emphasize volume
        if volatility_spike:
            indicator_dict["trend_strength"] = abs(trend_strength) + 0.2  # Boost trend

        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Boost confidence for strong events
        event_strength_bonus = 0.0
        if volume_spike and volatility_spike:
            event_strength_bonus = 0.05  # Both signals are very strong
        if abs(gap_pct) > 0.04:  # 4%+ gap is significant
            event_strength_bonus += 0.03

        confidence_score = min(1.0, confidence_score + event_strength_bonus)

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
                suggested_limit_price = entry_price - offset
            else:
                suggested_limit_price = entry_price + offset

        # Generate invalidation rules
        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="volatility_event",
            atr=current_atr,
        )

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="volatility_event_v1",
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
            rule_version_id=f"volatility_event_v1_{self.VERSION}",
        )

    def _detect_volume_spike(
        self,
        volumes: List[int],
        threshold: float = 2.5,
        lookback: int = 20
    ) -> bool:
        """
        Detect volume spike.

        Args:
            volumes: List of volume values
            threshold: Multiplier threshold for spike detection
            lookback: Number of bars for average calculation

        Returns:
            True if volume spike detected
        """
        if len(volumes) < lookback + 1:
            return False

        # Calculate average volume excluding current bar
        avg_volume = sum(volumes[-lookback-1:-1]) / lookback
        current_volume = volumes[-1]

        if avg_volume <= 0:
            return False

        return current_volume > avg_volume * threshold

    def _detect_gap(
        self,
        opens: List[float],
        closes: List[float],
        threshold_pct: float = 0.02
    ) -> Tuple[Optional[str], float]:
        """
        Detect price gap.

        Args:
            opens: List of open prices
            closes: List of close prices
            threshold_pct: Percentage threshold for gap detection

        Returns:
            Tuple of (gap_direction, gap_percentage)
            gap_direction is "gap_up", "gap_down", or None
        """
        if len(opens) < 2 or len(closes) < 2:
            return None, 0.0

        prev_close = closes[-2]
        current_open = opens[-1]

        if prev_close <= 0:
            return None, 0.0

        gap_pct = (current_open - prev_close) / prev_close

        if gap_pct > threshold_pct:
            return "gap_up", gap_pct
        elif gap_pct < -threshold_pct:
            return "gap_down", gap_pct

        return None, gap_pct

    def _detect_volatility_spike(
        self,
        atr: List[Optional[float]],
        threshold: float = 1.5,
        lookback: int = 20
    ) -> bool:
        """
        Detect volatility spike via ATR.

        Args:
            atr: List of ATR values
            threshold: Multiplier threshold for spike detection
            lookback: Number of bars for average calculation

        Returns:
            True if volatility spike detected
        """
        # Get valid ATR values
        valid_atr = [a for a in atr if a is not None]

        if len(valid_atr) < lookback + 1:
            return False

        # Calculate average ATR excluding current bar
        avg_atr = sum(valid_atr[-lookback-1:-1]) / lookback
        current_atr = valid_atr[-1]

        if avg_atr <= 0:
            return False

        return current_atr > avg_atr * threshold

    def _check_follow_through(
        self,
        closes: List[float],
        gap_direction: str,
        lookback: int = 3
    ) -> bool:
        """
        Check if price is following through on the gap direction.

        For gap up: price should be making higher closes
        For gap down: price should be making lower closes

        Args:
            closes: List of close prices
            gap_direction: "gap_up" or "gap_down"
            lookback: Number of bars to check

        Returns:
            True if follow-through confirmed
        """
        if len(closes) < lookback:
            return False

        recent = closes[-lookback:]

        if gap_direction == "gap_up":
            # Price should be making higher closes (at least not declining)
            # Allow for some noise - just check overall trend
            return recent[-1] >= recent[0]
        elif gap_direction == "gap_down":
            # Price should be making lower closes (at least not rising)
            return recent[-1] <= recent[0]

        return False
