"""
Breakout Strategy

A trend-following strategy that generates signals when price breaks through
key support/resistance levels with volume confirmation and trend strength validation.

Entry Conditions (BUY - Bullish Breakout):
- Price breaks above the highest high of last N periods
- Volume is above average (confirmation)
- ADX > threshold (trending market, not ranging)
- Stop loss at breakout level minus 1 ATR
- Target at 2x risk (2:1 R:R)

Entry Conditions (SELL - Bearish Breakout):
- Price breaks below the lowest low of last N periods
- Volume is above average (confirmation)
- ADX > threshold (trending market)
- Stop loss at breakout level plus 1 ATR
- Target at 2x risk (2:1 R:R)

Signal Strength Factors:
- Higher volume = higher confidence
- Higher ADX = stronger trend confirmation
- +DI/-DI alignment with breakout direction

Usage:
    strategy = BreakoutStrategy()
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


class BreakoutStrategy:
    """
    Breakout trading strategy.

    Identifies price breakouts from consolidation ranges with volume and
    trend strength confirmation using ADX indicator.
    """

    NAME = "Breakout Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "Trend-following strategy using price breakouts with ADX and volume confirmation"

    DEFAULT_CONFIG = {
        "breakout_period": 20,  # Look for breakout from N-period high/low
        "adx_period": 14,
        "adx_threshold": 20,  # Minimum ADX for trending market (tuned from 25)
        "volume_threshold": 1.2,  # Volume must be 1.2x average (tuned from 1.5)
        "atr_period": 14,
        "atr_multiplier_stop": 1.5,  # Stop loss = 1.5 ATR from breakout level (tuned from 1.0)
        "risk_reward_ratio": 2.5,  # Target = 2.5x risk (tuned from 2.0)
        "min_data_bars": 50,  # Minimum bars needed for analysis
        "require_di_alignment": False,  # DI alignment optional (tuned from True)
        "limit_order_offset_pct": 0.001,  # 0.1% offset for limit orders
        "breakout_buffer_pct": 0.002,  # 0.2% buffer above/below breakout level (tuned from 0.1%)
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize breakout strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="breakout")
        logger.info("Breakout strategy initialized", config=self.config)

    def analyze(
        self,
        symbol: str,
        market: str,
        ohlcv_data: List[dict],
        data_hash: str,
    ) -> Optional[Signal]:
        """
        Analyze market data and generate a signal for breakout opportunities.

        Args:
            symbol: Ticker symbol
            market: Market identifier (US, ASX, etc.)
            ohlcv_data: List of OHLCV bars
            data_hash: Hash of the data for audit trail

        Returns:
            Signal object or None if no breakout detected
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

        # Calculate breakout levels (using previous period, not including current bar)
        breakout_period = self.config['breakout_period']
        highest_high = TechnicalIndicators.highest_high(highs[:-1], breakout_period)
        lowest_low = TechnicalIndicators.lowest_low(lows[:-1], breakout_period)

        # Calculate ADX for trend strength
        adx_data = TechnicalIndicators.adx(highs, lows, closes, self.config['adx_period'])

        # Calculate ATR for stop loss/target calculation
        atr = TechnicalIndicators.atr(highs, lows, closes, self.config['atr_period'])

        # Calculate other indicators for features
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, 14)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_high = highs[-1]
        current_low = lows[-1]
        current_volume = volumes[-1]

        # Get previous period's breakout levels (the level we need to break)
        prev_highest_high = highest_high[-1] if highest_high and highest_high[-1] is not None else None
        prev_lowest_low = lowest_low[-1] if lowest_low and lowest_low[-1] is not None else None

        # Get ADX values
        current_adx = adx_data['adx'][-1] if adx_data['adx'] and len(adx_data['adx']) > 0 else None
        current_plus_di = adx_data['plus_di'][-1] if adx_data['plus_di'] and len(adx_data['plus_di']) > 0 else None
        current_minus_di = adx_data['minus_di'][-1] if adx_data['minus_di'] and len(adx_data['minus_di']) > 0 else None

        current_atr = atr[-1] if atr else None
        current_sma_20 = sma_20[-1] if sma_20 else None
        current_sma_50 = sma_50[-1] if sma_50 else None
        current_sma_200 = sma_200[-1] if sma_200 else None
        current_rsi = rsi[-1] if rsi else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None
        current_stoch_k = stoch['k'][-1] if stoch['k'] else None
        current_stoch_d = stoch['d'][-1] if stoch['d'] else None

        # Bollinger Band values
        current_bb_upper = bb['upper'][-1] if bb['upper'] else None
        current_bb_middle = bb['middle'][-1] if bb['middle'] else None
        current_bb_lower = bb['lower'][-1] if bb['lower'] else None

        # Validate required values
        if None in [prev_highest_high, prev_lowest_low, current_atr, current_adx]:
            logger.warning("Missing indicator values", symbol=symbol)
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

        # =====================================================================
        # Breakout Detection Logic
        # =====================================================================

        # Calculate breakout buffer
        buffer_pct = self.config['breakout_buffer_pct']
        upper_breakout_level = prev_highest_high * (1 + buffer_pct)
        lower_breakout_level = prev_lowest_low * (1 - buffer_pct)

        # Check for breakouts (using current high/low, not just close)
        bullish_breakout = current_high > upper_breakout_level or current_price > upper_breakout_level
        bearish_breakout = current_low < lower_breakout_level or current_price < lower_breakout_level

        # Volume confirmation
        volume_confirmed = volume_ratio >= self.config['volume_threshold']

        # ADX confirmation (trending market)
        adx_confirmed = current_adx >= self.config['adx_threshold']

        # +DI/-DI alignment (optional but increases confidence)
        di_aligned_bullish = current_plus_di > current_minus_di if current_plus_di and current_minus_di else True
        di_aligned_bearish = current_minus_di > current_plus_di if current_plus_di and current_minus_di else True

        # Generate signal
        signal_side = SignalSide.HOLD
        reasoning_parts = []
        breakout_level = None

        # BUY Signal Logic (Bullish Breakout)
        if bullish_breakout and volume_confirmed and adx_confirmed:
            # Check DI alignment if required
            if self.config['require_di_alignment'] and not di_aligned_bullish:
                logger.debug(
                    "Bullish breakout rejected - DI not aligned",
                    symbol=symbol,
                    plus_di=current_plus_di,
                    minus_di=current_minus_di,
                )
            else:
                signal_side = SignalSide.BUY
                breakout_level = prev_highest_high

                reasoning_parts.append(
                    f"Bullish breakout: Price ({current_price:.2f}) broke above "
                    f"{breakout_period}-period high ({prev_highest_high:.2f})"
                )

                if volume_confirmed:
                    reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms breakout")

                if adx_confirmed:
                    reasoning_parts.append(f"ADX ({current_adx:.1f}) indicates strong trend")

                if di_aligned_bullish and current_plus_di and current_minus_di:
                    reasoning_parts.append(f"+DI ({current_plus_di:.1f}) > -DI ({current_minus_di:.1f}) confirms bullish direction")

        # SELL Signal Logic (Bearish Breakout)
        elif bearish_breakout and volume_confirmed and adx_confirmed:
            # Check DI alignment if required
            if self.config['require_di_alignment'] and not di_aligned_bearish:
                logger.debug(
                    "Bearish breakout rejected - DI not aligned",
                    symbol=symbol,
                    plus_di=current_plus_di,
                    minus_di=current_minus_di,
                )
            else:
                signal_side = SignalSide.SELL
                breakout_level = prev_lowest_low

                reasoning_parts.append(
                    f"Bearish breakout: Price ({current_price:.2f}) broke below "
                    f"{breakout_period}-period low ({prev_lowest_low:.2f})"
                )

                if volume_confirmed:
                    reasoning_parts.append(f"Volume ({volume_ratio:.1f}x average) confirms breakout")

                if adx_confirmed:
                    reasoning_parts.append(f"ADX ({current_adx:.1f}) indicates strong trend")

                if di_aligned_bearish and current_plus_di and current_minus_di:
                    reasoning_parts.append(f"-DI ({current_minus_di:.1f}) > +DI ({current_plus_di:.1f}) confirms bearish direction")

        # If no clear signal, return None
        if signal_side == SignalSide.HOLD:
            return None

        # =====================================================================
        # Calculate Confidence Score
        # =====================================================================

        # Custom confidence calculation for breakout strategy
        indicator_dict = {
            "adx": current_adx,
            "volume_ratio": volume_ratio,
            "plus_di": current_plus_di,
            "minus_di": current_minus_di,
            "trend_strength": trend_strength,
            "rsi": current_rsi,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Boost confidence based on breakout-specific factors
        confidence_boost = 0.0

        # Volume boost (higher volume = more conviction)
        if volume_ratio >= 2.0:
            confidence_boost += 0.05
        elif volume_ratio >= 1.75:
            confidence_boost += 0.03

        # ADX boost (stronger trend = more conviction)
        if current_adx >= 40:
            confidence_boost += 0.05
        elif current_adx >= 30:
            confidence_boost += 0.03

        # DI alignment boost
        if signal_side == SignalSide.BUY and di_aligned_bullish and current_plus_di and current_minus_di:
            di_spread = abs(current_plus_di - current_minus_di)
            if di_spread > 20:
                confidence_boost += 0.05
            elif di_spread > 10:
                confidence_boost += 0.03
        elif signal_side == SignalSide.SELL and di_aligned_bearish and current_plus_di and current_minus_di:
            di_spread = abs(current_minus_di - current_plus_di)
            if di_spread > 20:
                confidence_boost += 0.05
            elif di_spread > 10:
                confidence_boost += 0.03

        # Apply boost (cap at 0.95)
        confidence_score = min(0.95, confidence_score + confidence_boost)

        # Update confidence factors
        confidence_factors["volume_breakout"] = min(1.0, volume_ratio / 2.5)
        confidence_factors["adx_strength"] = min(1.0, current_adx / 50)

        # =====================================================================
        # Calculate Price Targets (2:1 R:R)
        # =====================================================================

        entry_price = current_price
        stop_loss = None
        target_price = None

        atr_stop_distance = current_atr * self.config['atr_multiplier_stop']
        risk_reward = self.config['risk_reward_ratio']

        if signal_side == SignalSide.BUY:
            # Stop loss below the breakout level (minus 1 ATR)
            stop_loss = breakout_level - atr_stop_distance
            # Risk = entry - stop
            risk = entry_price - stop_loss
            # Target = entry + (risk * R:R ratio)
            target_price = entry_price + (risk * risk_reward)

        else:  # SELL
            # Stop loss above the breakout level (plus 1 ATR)
            stop_loss = breakout_level + atr_stop_distance
            # Risk = stop - entry
            risk = stop_loss - entry_price
            # Target = entry - (risk * R:R ratio)
            target_price = entry_price - (risk * risk_reward)

        # =====================================================================
        # Determine Entry Type
        # =====================================================================

        # Use market orders for breakouts (momentum is key)
        # Use limit orders only for high confidence with better entry
        entry_type = EntryType.MARKET
        suggested_limit_price = None

        # For moderate confidence, try to get a better entry on pullback
        if 0.6 < confidence_score < 0.8:
            entry_type = EntryType.LIMIT
            offset = entry_price * self.config['limit_order_offset_pct']
            if signal_side == SignalSide.BUY:
                # Try to buy on pullback towards breakout level
                suggested_limit_price = max(breakout_level, entry_price - offset)
            else:
                # Try to sell on bounce towards breakout level
                suggested_limit_price = min(breakout_level, entry_price + offset)

        # =====================================================================
        # Generate Invalidation Rules
        # =====================================================================

        invalidation_rules = generate_invalidation_rules(
            signal_side=signal_side.value,
            entry_price=entry_price,
            stop_loss=stop_loss,
            target_price=target_price,
            features=features.to_dict(),
            strategy_type="breakout",
            atr=current_atr,
        )

        # Add breakout-specific invalidation rules
        if signal_side == SignalSide.BUY:
            invalidation_rules.append({
                "condition": "price_below_breakout_level",
                "threshold": breakout_level,
                "description": f"Price falls back below breakout level ({breakout_level:.2f})",
                "comparison": "lt",
                "feature_name": "price",
            })
            invalidation_rules.append({
                "condition": "adx_weakening",
                "threshold": 20,
                "description": "ADX falls below 20 (trend losing strength)",
                "comparison": "lt",
                "feature_name": "adx",
            })
        else:  # SELL
            invalidation_rules.append({
                "condition": "price_above_breakout_level",
                "threshold": breakout_level,
                "description": f"Price rises back above breakout level ({breakout_level:.2f})",
                "comparison": "gt",
                "feature_name": "price",
            })
            invalidation_rules.append({
                "condition": "adx_weakening",
                "threshold": 20,
                "description": "ADX falls below 20 (trend losing strength)",
                "comparison": "lt",
                "feature_name": "adx",
            })

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="breakout_v1",
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
            rule_version_id=f"breakout_v1_{self.VERSION}",
        )
