"""
RSI Divergence Strategy

A reversal strategy that generates signals based on divergences between price action
and the Relative Strength Index (RSI) indicator.

Bullish Divergence (BUY Signal):
- Price makes a LOWER LOW (new swing low below previous swing low)
- RSI makes a HIGHER LOW (RSI at new price low is higher than RSI at previous price low)
- This divergence suggests weakening bearish momentum and potential reversal upward
- Volume confirmation optional (higher volume on second low adds confidence)

Bearish Divergence (SELL Signal):
- Price makes a HIGHER HIGH (new swing high above previous swing high)
- RSI makes a LOWER HIGH (RSI at new price high is lower than RSI at previous price high)
- This divergence suggests weakening bullish momentum and potential reversal downward
- Volume confirmation optional (higher volume on second high adds confidence)

Signal Strength Factors:
- Divergence magnitude (larger difference = stronger signal)
- RSI level (oversold/overbought adds confirmation)
- Volume confirmation
- Time between divergence points
- Price action context (support/resistance levels)

Usage:
    strategy = RSIDivergenceStrategy()
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
from confidence.invalidation import InvalidationRule

logger = structlog.get_logger(__name__)

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


class RSIDivergenceStrategy:
    """
    RSI Divergence trading strategy.

    Identifies divergences between price and RSI to detect potential reversals.
    Bullish divergence: Price lower low + RSI higher low -> BUY
    Bearish divergence: Price higher high + RSI lower high -> SELL
    """

    NAME = "RSI Divergence Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "Reversal strategy using RSI divergence detection with volume confirmation"

    DEFAULT_CONFIG = {
        "rsi_period": 14,
        "lookback_min": 5,  # Minimum bars between divergence points
        "lookback_max": 20,  # Maximum bars between divergence points
        "rsi_overbought": 70,  # RSI overbought threshold
        "rsi_oversold": 30,  # RSI oversold threshold
        "min_price_divergence_pct": 0.5,  # Minimum price difference for swing detection (%)
        "min_rsi_divergence": 3.0,  # Minimum RSI difference for divergence
        "volume_confirmation": True,  # Require volume confirmation
        "volume_threshold": 1.2,  # Volume must be 1.2x average for confirmation
        "atr_period": 14,
        "atr_multiplier_stop": 1.5,  # Stop loss = 1.5 ATR from swing low/high
        "risk_reward_ratio": 2.0,  # Target = 2x risk (2:1 R:R)
        "min_data_bars": 50,  # Minimum bars needed for analysis
        "swing_detection_window": 3,  # Bars on each side for swing detection
        "limit_order_offset_pct": 0.002,  # 0.2% offset for limit orders
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize RSI Divergence strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="divergence")
        logger.info("RSI Divergence strategy initialized", config=self.config)

    def _find_swing_lows(
        self,
        lows: List[float],
        window: int = 3,
    ) -> List[Tuple[int, float]]:
        """
        Find swing low points in price data.

        A swing low is a point where the low is lower than the lows
        on both sides within the window.

        Args:
            lows: List of low prices
            window: Number of bars on each side to check

        Returns:
            List of (index, price) tuples for swing lows
        """
        swing_lows = []

        for i in range(window, len(lows) - window):
            is_swing_low = True
            current_low = lows[i]

            # Check bars on the left
            for j in range(1, window + 1):
                if lows[i - j] <= current_low:
                    is_swing_low = False
                    break

            # Check bars on the right
            if is_swing_low:
                for j in range(1, window + 1):
                    if lows[i + j] <= current_low:
                        is_swing_low = False
                        break

            if is_swing_low:
                swing_lows.append((i, current_low))

        return swing_lows

    def _find_swing_highs(
        self,
        highs: List[float],
        window: int = 3,
    ) -> List[Tuple[int, float]]:
        """
        Find swing high points in price data.

        A swing high is a point where the high is higher than the highs
        on both sides within the window.

        Args:
            highs: List of high prices
            window: Number of bars on each side to check

        Returns:
            List of (index, price) tuples for swing highs
        """
        swing_highs = []

        for i in range(window, len(highs) - window):
            is_swing_high = True
            current_high = highs[i]

            # Check bars on the left
            for j in range(1, window + 1):
                if highs[i - j] >= current_high:
                    is_swing_high = False
                    break

            # Check bars on the right
            if is_swing_high:
                for j in range(1, window + 1):
                    if highs[i + j] >= current_high:
                        is_swing_high = False
                        break

            if is_swing_high:
                swing_highs.append((i, current_high))

        return swing_highs

    def _detect_bullish_divergence(
        self,
        lows: List[float],
        rsi: List[Optional[float]],
        volumes: List[int],
    ) -> Optional[Dict[str, Any]]:
        """
        Detect bullish divergence: Price lower low + RSI higher low.

        Args:
            lows: List of low prices
            rsi: List of RSI values
            volumes: List of volume values

        Returns:
            Dictionary with divergence details or None if not found
        """
        window = self.config["swing_detection_window"]
        lookback_min = self.config["lookback_min"]
        lookback_max = self.config["lookback_max"]
        min_price_div_pct = self.config["min_price_divergence_pct"]
        min_rsi_div = self.config["min_rsi_divergence"]

        # Find swing lows
        swing_lows = self._find_swing_lows(lows, window)

        if len(swing_lows) < 2:
            return None

        # Check recent swing lows for divergence (most recent first)
        for i in range(len(swing_lows) - 1, 0, -1):
            current_idx, current_price = swing_lows[i]
            prev_idx, prev_price = swing_lows[i - 1]

            # Check lookback constraints
            bars_between = current_idx - prev_idx
            if bars_between < lookback_min or bars_between > lookback_max:
                continue

            # Get RSI values at swing lows
            current_rsi = rsi[current_idx] if current_idx < len(rsi) and rsi[current_idx] is not None else None
            prev_rsi = rsi[prev_idx] if prev_idx < len(rsi) and rsi[prev_idx] is not None else None

            if current_rsi is None or prev_rsi is None:
                continue

            # Check for bullish divergence:
            # Price: lower low (current < previous)
            # RSI: higher low (current > previous)
            price_divergence_pct = ((prev_price - current_price) / prev_price) * 100
            rsi_divergence = current_rsi - prev_rsi

            if price_divergence_pct >= min_price_div_pct and rsi_divergence >= min_rsi_div:
                # Calculate volume confirmation
                avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
                current_volume = volumes[current_idx] if current_idx < len(volumes) else 0
                volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
                volume_confirmed = volume_ratio >= self.config["volume_threshold"]

                # Calculate divergence strength (0-1 scale)
                # Stronger divergence = larger price drop with larger RSI increase
                strength = min(1.0, (price_divergence_pct / 5.0 + rsi_divergence / 20.0) / 2)

                return {
                    "type": "bullish",
                    "current_idx": current_idx,
                    "prev_idx": prev_idx,
                    "current_price": current_price,
                    "prev_price": prev_price,
                    "current_rsi": current_rsi,
                    "prev_rsi": prev_rsi,
                    "price_divergence_pct": price_divergence_pct,
                    "rsi_divergence": rsi_divergence,
                    "bars_between": bars_between,
                    "volume_confirmed": volume_confirmed,
                    "volume_ratio": volume_ratio,
                    "strength": strength,
                }

        return None

    def _detect_bearish_divergence(
        self,
        highs: List[float],
        rsi: List[Optional[float]],
        volumes: List[int],
    ) -> Optional[Dict[str, Any]]:
        """
        Detect bearish divergence: Price higher high + RSI lower high.

        Args:
            highs: List of high prices
            rsi: List of RSI values
            volumes: List of volume values

        Returns:
            Dictionary with divergence details or None if not found
        """
        window = self.config["swing_detection_window"]
        lookback_min = self.config["lookback_min"]
        lookback_max = self.config["lookback_max"]
        min_price_div_pct = self.config["min_price_divergence_pct"]
        min_rsi_div = self.config["min_rsi_divergence"]

        # Find swing highs
        swing_highs = self._find_swing_highs(highs, window)

        if len(swing_highs) < 2:
            return None

        # Check recent swing highs for divergence (most recent first)
        for i in range(len(swing_highs) - 1, 0, -1):
            current_idx, current_price = swing_highs[i]
            prev_idx, prev_price = swing_highs[i - 1]

            # Check lookback constraints
            bars_between = current_idx - prev_idx
            if bars_between < lookback_min or bars_between > lookback_max:
                continue

            # Get RSI values at swing highs
            current_rsi = rsi[current_idx] if current_idx < len(rsi) and rsi[current_idx] is not None else None
            prev_rsi = rsi[prev_idx] if prev_idx < len(rsi) and rsi[prev_idx] is not None else None

            if current_rsi is None or prev_rsi is None:
                continue

            # Check for bearish divergence:
            # Price: higher high (current > previous)
            # RSI: lower high (current < previous)
            price_divergence_pct = ((current_price - prev_price) / prev_price) * 100
            rsi_divergence = prev_rsi - current_rsi

            if price_divergence_pct >= min_price_div_pct and rsi_divergence >= min_rsi_div:
                # Calculate volume confirmation
                avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
                current_volume = volumes[current_idx] if current_idx < len(volumes) else 0
                volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
                volume_confirmed = volume_ratio >= self.config["volume_threshold"]

                # Calculate divergence strength (0-1 scale)
                strength = min(1.0, (price_divergence_pct / 5.0 + rsi_divergence / 20.0) / 2)

                return {
                    "type": "bearish",
                    "current_idx": current_idx,
                    "prev_idx": prev_idx,
                    "current_price": current_price,
                    "prev_price": prev_price,
                    "current_rsi": current_rsi,
                    "prev_rsi": prev_rsi,
                    "price_divergence_pct": price_divergence_pct,
                    "rsi_divergence": rsi_divergence,
                    "bars_between": bars_between,
                    "volume_confirmed": volume_confirmed,
                    "volume_ratio": volume_ratio,
                    "strength": strength,
                }

        return None

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal for RSI divergence.

        Args:
            symbol: Ticker symbol
            market: Market identifier (US, ASX, etc.)
            ohlcv_data: List of OHLCV bars
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no divergence detected
        """
        # Validate data
        if not ohlcv_data or len(ohlcv_data) < self.config['min_data_bars']:
            logger.warning(
                "Insufficient data for analysis",
                symbol=symbol,
                bars=len(ohlcv_data) if ohlcv_data else 0,
                required=self.config['min_data_bars'],
            )
            return None

        # Extract price and volume data
        opens = [bar['open'] for bar in ohlcv_data]
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]
        volumes = [bar['volume'] for bar in ohlcv_data]

        # Calculate RSI
        rsi = TechnicalIndicators.rsi(closes, self.config['rsi_period'])

        # Calculate other indicators for features and stops
        atr = TechnicalIndicators.atr(highs, lows, closes, self.config['atr_period'])
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Validate RSI calculated
        if not rsi or rsi[-1] is None:
            logger.warning("RSI calculation failed", symbol=symbol)
            return None

        # Get current values
        current_price = closes[-1]
        current_rsi = rsi[-1]
        current_atr = atr[-1] if atr and atr[-1] is not None else None
        current_sma_20 = sma_20[-1] if sma_20 else None
        current_sma_50 = sma_50[-1] if sma_50 else None
        current_sma_200 = sma_200[-1] if sma_200 else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Bollinger Band values
        current_bb_upper = bb['upper'][-1] if bb['upper'] else None
        current_bb_middle = bb['middle'][-1] if bb['middle'] else None
        current_bb_lower = bb['lower'][-1] if bb['lower'] else None

        # Validate ATR
        if current_atr is None:
            logger.warning("ATR calculation failed", symbol=symbol)
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
        current_volume = volumes[-1]
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
            rsi_14=current_rsi,
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
        # Divergence Detection
        # =====================================================================

        # Try to detect bullish divergence first (more common in uptrends approaching support)
        bullish_div = self._detect_bullish_divergence(lows, rsi, volumes)

        # Try to detect bearish divergence (more common approaching resistance)
        bearish_div = self._detect_bearish_divergence(highs, rsi, volumes)

        # Determine which divergence to use (prefer the one with higher strength)
        divergence = None
        signal_side = SignalSide.HOLD

        if bullish_div and bearish_div:
            # Both detected - use the stronger one
            if bullish_div["strength"] >= bearish_div["strength"]:
                divergence = bullish_div
                signal_side = SignalSide.BUY
            else:
                divergence = bearish_div
                signal_side = SignalSide.SELL
        elif bullish_div:
            divergence = bullish_div
            signal_side = SignalSide.BUY
        elif bearish_div:
            divergence = bearish_div
            signal_side = SignalSide.SELL

        # If no divergence detected, return None
        if divergence is None:
            return None

        # Check volume confirmation if required
        if self.config["volume_confirmation"] and not divergence["volume_confirmed"]:
            logger.debug(
                "Divergence rejected - volume not confirmed",
                symbol=symbol,
                type=divergence["type"],
                volume_ratio=divergence["volume_ratio"],
            )
            return None

        # =====================================================================
        # Build Reasoning
        # =====================================================================

        reasoning_parts = []

        if signal_side == SignalSide.BUY:
            reasoning_parts.append(
                f"Bullish divergence detected: Price made lower low "
                f"({divergence['current_price']:.2f} < {divergence['prev_price']:.2f}) "
                f"while RSI made higher low ({divergence['current_rsi']:.1f} > {divergence['prev_rsi']:.1f})"
            )

            if current_rsi < self.config["rsi_oversold"]:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) in oversold territory confirms reversal potential")

        else:  # SELL
            reasoning_parts.append(
                f"Bearish divergence detected: Price made higher high "
                f"({divergence['current_price']:.2f} > {divergence['prev_price']:.2f}) "
                f"while RSI made lower high ({divergence['current_rsi']:.1f} < {divergence['prev_rsi']:.1f})"
            )

            if current_rsi > self.config["rsi_overbought"]:
                reasoning_parts.append(f"RSI ({current_rsi:.1f}) in overbought territory confirms reversal potential")

        if divergence["volume_confirmed"]:
            reasoning_parts.append(f"Volume ({divergence['volume_ratio']:.1f}x average) confirms divergence")

        reasoning_parts.append(f"Divergence formed over {divergence['bars_between']} bars")

        # =====================================================================
        # Calculate Confidence Score
        # =====================================================================

        indicator_dict = {
            "rsi": current_rsi,
            "divergence_strength": divergence["strength"],
            "volume_ratio": divergence["volume_ratio"],
            "trend_strength": trend_strength,
            "macd_histogram": current_macd_histogram,
            "stoch_k": current_stoch_k,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Boost/penalty based on divergence-specific factors
        confidence_boost = 0.0

        # Boost for RSI extremes (oversold for buy, overbought for sell)
        if signal_side == SignalSide.BUY and current_rsi < self.config["rsi_oversold"]:
            confidence_boost += 0.05
        elif signal_side == SignalSide.SELL and current_rsi > self.config["rsi_overbought"]:
            confidence_boost += 0.05

        # Boost for stronger divergence
        if divergence["strength"] > 0.7:
            confidence_boost += 0.05
        elif divergence["strength"] > 0.5:
            confidence_boost += 0.03

        # Boost for volume confirmation
        if divergence["volume_confirmed"] and divergence["volume_ratio"] > 1.5:
            confidence_boost += 0.03

        # Boost for larger RSI divergence
        if divergence["rsi_divergence"] > 10:
            confidence_boost += 0.05
        elif divergence["rsi_divergence"] > 5:
            confidence_boost += 0.02

        # Apply boost (cap at 0.95)
        confidence_score = min(0.95, confidence_score + confidence_boost)

        # Update confidence factors
        confidence_factors["divergence_strength"] = divergence["strength"]
        confidence_factors["rsi_divergence"] = min(1.0, divergence["rsi_divergence"] / 20.0)
        confidence_factors["price_divergence"] = min(1.0, divergence["price_divergence_pct"] / 5.0)

        # =====================================================================
        # Calculate Price Targets
        # =====================================================================

        entry_price = current_price
        stop_loss = None
        target_price = None

        atr_stop_distance = current_atr * self.config['atr_multiplier_stop']
        risk_reward = self.config['risk_reward_ratio']

        if signal_side == SignalSide.BUY:
            # Stop loss below the recent swing low
            swing_low_price = divergence["current_price"]
            stop_loss = swing_low_price - atr_stop_distance

            # Calculate risk and target
            risk = entry_price - stop_loss
            target_price = entry_price + (risk * risk_reward)

        else:  # SELL
            # Stop loss above the recent swing high
            swing_high_price = divergence["current_price"]
            stop_loss = swing_high_price + atr_stop_distance

            # Calculate risk and target
            risk = stop_loss - entry_price
            target_price = entry_price - (risk * risk_reward)

        # =====================================================================
        # Determine Entry Type
        # =====================================================================

        entry_type = EntryType.MARKET
        suggested_limit_price = None

        # Use limit orders for moderate confidence to get better entry
        if 0.5 < confidence_score < 0.85:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                # Try to buy on pullback
                suggested_limit_price = entry_price - offset
            else:
                # Try to sell on bounce
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
            strategy_type="divergence",
            atr=current_atr,
        )

        # Add divergence-specific invalidation rules
        if signal_side == SignalSide.BUY:
            invalidation_rules.append(InvalidationRule(
                condition="price_below_swing_low",
                threshold=divergence["current_price"],
                description=f"Price falls below swing low ({divergence['current_price']:.2f}) - divergence invalidated",
                comparison="lt",
                feature_name="price",
            ))
            invalidation_rules.append(InvalidationRule(
                condition="rsi_overbought_exit",
                threshold=self.config["rsi_overbought"],
                description=f"RSI exceeds {self.config['rsi_overbought']} (overbought) - take profits",
                comparison="gt",
                feature_name="rsi_14",
            ))
        else:  # SELL
            invalidation_rules.append(InvalidationRule(
                condition="price_above_swing_high",
                threshold=divergence["current_price"],
                description=f"Price rises above swing high ({divergence['current_price']:.2f}) - divergence invalidated",
                comparison="gt",
                feature_name="price",
            ))
            invalidation_rules.append(InvalidationRule(
                condition="rsi_oversold_exit",
                threshold=self.config["rsi_oversold"],
                description=f"RSI falls below {self.config['rsi_oversold']} (oversold) - take profits",
                comparison="lt",
                feature_name="rsi_14",
            ))

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="rsi_divergence_v1",
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
            rule_version_id=f"rsi_divergence_v1_{self.VERSION}",
        )
