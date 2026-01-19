"""
Volume Profile Strategy

A VWAP-based trading strategy that generates signals based on:
- VWAP (Volume Weighted Average Price) as dynamic support/resistance
- Volume Profile analysis (POC, VAH, VAL)
- Price bounces off VWAP with volume confirmation

Entry Conditions (BUY):
- Price below VWAP and bouncing up (2+ consecutive higher closes)
- Volume above 1.2x average (confirmation)
- Price not too far from VWAP (within deviation threshold)

Exit Conditions (SELL):
- Price above VWAP and bouncing down (2+ consecutive lower closes)
- Volume above 1.2x average (confirmation)
- Price not too far from VWAP (within deviation threshold)

Key Concept: Trade bounces off VWAP.

Usage:
    strategy = VolumeProfileStrategy()
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


class VolumeProfileStrategy:
    """
    VWAP-based volume profile strategy.

    Uses VWAP as dynamic support/resistance and trades bounces with volume confirmation.
    """

    NAME = "Volume Profile Strategy"
    TYPE = "technical"
    VERSION = "1.0.0"
    DESCRIPTION = "VWAP-based strategy trading bounces off volume-weighted support/resistance"

    DEFAULT_CONFIG = {
        "vwap_deviation_threshold": 0.01,  # 1% deviation from VWAP
        "vwap_bounce_lookback": 3,         # bars to detect bounce
        "volume_confirmation_threshold": 1.2,  # 1.2x avg volume
        "atr_multiplier_stop": 1.5,
        "atr_multiplier_target": 2.5,
        "min_data_bars": 30,
        "limit_order_offset_pct": 0.002,
        "volume_profile_bins": 20,         # number of bins for volume profile
        "value_area_pct": 0.70,            # 70% of volume for value area
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize volume profile strategy with configuration."""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.scorer = ConfidenceScorer(strategy_type="volume_profile")
        logger.info("Volume Profile strategy initialized", config=self.config)

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

        # Calculate VWAP
        vwap = TechnicalIndicators.vwap(highs, lows, closes, volumes)

        # Calculate other indicators
        sma_20 = TechnicalIndicators.sma(closes, 20)
        sma_50 = TechnicalIndicators.sma(closes, 50)
        sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
        rsi = TechnicalIndicators.rsi(closes, 14)
        atr = TechnicalIndicators.atr(highs, lows, closes)
        macd = TechnicalIndicators.macd(closes)
        bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
        stoch = TechnicalIndicators.stochastic(highs, lows, closes)

        # Get current values
        current_price = closes[-1]
        current_vwap = vwap[-1] if vwap else None
        current_sma_20 = sma_20[-1] if sma_20 else None
        current_sma_50 = sma_50[-1] if len(sma_50) > 0 and sma_50[-1] else None
        current_sma_200 = sma_200[-1] if sma_200 and len(sma_200) > 0 else None
        current_rsi = rsi[-1] if rsi else None
        current_atr = atr[-1] if atr else None
        current_macd = macd['macd'][-1] if macd['macd'] else None
        current_macd_signal = macd['signal'][-1] if macd['signal'] else None
        current_macd_histogram = macd['histogram'][-1] if macd['histogram'] else None

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

        # Validate we have required values
        if current_vwap is None or current_atr is None:
            logger.warning("Missing VWAP or ATR values", symbol=symbol)
            return None

        # Calculate VWAP deviation
        vwap_deviation = (current_price - current_vwap) / current_vwap if current_vwap > 0 else 0.0

        # Calculate volume profile
        volume_profile = self._calculate_volume_profile(
            closes, volumes, self.config['volume_profile_bins']
        )

        # Detect VWAP bounce
        bounce_direction = self._detect_vwap_bounce(
            closes, vwap, self.config['vwap_bounce_lookback']
        )

        # Calculate price-to-SMA relationships
        price_to_sma_20 = (current_price - current_sma_20) / current_sma_20 if current_sma_20 else 0.0
        price_to_sma_50 = (current_price - current_sma_50) / current_sma_50 if current_sma_50 else 0.0

        # Calculate trend strength based on VWAP position
        # Positive = price above VWAP (bullish bias), negative = below VWAP
        trend_strength = max(-1.0, min(1.0, vwap_deviation * 20))

        # Build SignalFeatures snapshot
        features = SignalFeatures(
            price=current_price,
            sma_20=current_sma_20 or current_price,
            sma_50=current_sma_50 or current_price,
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

        # Volume confirmation
        volume_confirmed = volume_ratio >= self.config['volume_confirmation_threshold']

        # Check if price is within reasonable range of VWAP
        within_vwap_range = abs(vwap_deviation) <= self.config['vwap_deviation_threshold'] * 2

        # Generate signal
        signal_side = SignalSide.HOLD
        reasoning_parts = []

        # BUY Signal Logic: Bullish bounce off VWAP
        if bounce_direction == "bullish_bounce" and within_vwap_range:
            signal_side = SignalSide.BUY

            reasoning_parts.append(
                f"Bullish bounce detected: price ({current_price:.2f}) bouncing up from VWAP ({current_vwap:.2f})"
            )

            if vwap_deviation < 0:
                reasoning_parts.append(
                    f"Price {abs(vwap_deviation) * 100:.1f}% below VWAP - good entry for bounce"
                )

            if volume_confirmed:
                reasoning_parts.append(
                    f"Volume ({volume_ratio:.1f}x average) confirms bullish conviction"
                )

            # Add volume profile context
            if volume_profile['poc']:
                reasoning_parts.append(
                    f"Point of Control at ${volume_profile['poc']:.2f}"
                )

        # SELL Signal Logic: Bearish bounce off VWAP
        elif bounce_direction == "bearish_bounce" and within_vwap_range:
            signal_side = SignalSide.SELL

            reasoning_parts.append(
                f"Bearish bounce detected: price ({current_price:.2f}) bouncing down from VWAP ({current_vwap:.2f})"
            )

            if vwap_deviation > 0:
                reasoning_parts.append(
                    f"Price {vwap_deviation * 100:.1f}% above VWAP - good entry for reversal"
                )

            if volume_confirmed:
                reasoning_parts.append(
                    f"Volume ({volume_ratio:.1f}x average) confirms bearish conviction"
                )

            # Add volume profile context
            if volume_profile['poc']:
                reasoning_parts.append(
                    f"Point of Control at ${volume_profile['poc']:.2f}"
                )

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
            "bb_position": bb_position,
        }
        confidence_score, confidence_factors = self.scorer.calculate_confidence(
            signal_side.value,
            indicator_dict,
        )

        # Boost confidence if volume confirms
        if volume_confirmed:
            confidence_score = min(1.0, confidence_score * 1.1)
            confidence_factors["volume_confirmation"] = 1.0

        # Boost confidence if price is near POC
        if volume_profile['poc']:
            poc_distance = abs(current_price - volume_profile['poc']) / current_price
            if poc_distance < 0.01:  # Within 1% of POC
                confidence_score = min(1.0, confidence_score * 1.05)
                confidence_factors["poc_proximity"] = 0.95

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
            strategy_type="volume_profile",
            atr=current_atr,
        )

        # Add VWAP-specific invalidation rules
        vwap_invalidation = self._generate_vwap_invalidation_rules(
            signal_side, entry_price, current_vwap, current_atr
        )
        invalidation_rules.extend(vwap_invalidation)

        reasoning = "; ".join(reasoning_parts)

        return Signal(
            symbol=symbol,
            side=signal_side,
            strategy_id="volume_profile_v1",
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
            rule_version_id=f"volume_profile_v1_{self.VERSION}",
        )

    def _calculate_volume_profile(
        self,
        closes: List[float],
        volumes: List[int],
        num_bins: int = 20,
    ) -> Dict[str, Any]:
        """
        Calculate volume profile (POC, VAH, VAL).

        Args:
            closes: List of closing prices
            volumes: List of volumes
            num_bins: Number of price bins for the profile

        Returns:
            Dictionary with 'poc', 'vah', 'val' (Point of Control, Value Area High/Low)
        """
        if len(closes) < 2 or len(volumes) < 2:
            return {"poc": None, "vah": None, "val": None}

        price_min = min(closes)
        price_max = max(closes)

        # Avoid division by zero
        if price_max == price_min:
            return {"poc": price_min, "vah": price_min, "val": price_min}

        bin_size = (price_max - price_min) / num_bins

        # Create bins and sum volume per bin
        bins = [0.0] * num_bins
        for price, vol in zip(closes, volumes):
            bin_idx = min(int((price - price_min) / bin_size), num_bins - 1)
            bins[bin_idx] += vol

        # POC = bin with highest volume
        max_vol = max(bins)
        poc_idx = bins.index(max_vol)
        poc_price = price_min + (poc_idx + 0.5) * bin_size

        # Calculate Value Area (70% of total volume)
        total_vol = sum(bins)
        target_vol = total_vol * self.config['value_area_pct']

        # Start from POC and expand outward until 70% of volume is captured
        accumulated_vol = bins[poc_idx]
        lower_idx = poc_idx
        upper_idx = poc_idx

        while accumulated_vol < target_vol and (lower_idx > 0 or upper_idx < num_bins - 1):
            # Check which direction has more volume
            lower_vol = bins[lower_idx - 1] if lower_idx > 0 else 0
            upper_vol = bins[upper_idx + 1] if upper_idx < num_bins - 1 else 0

            if lower_vol >= upper_vol and lower_idx > 0:
                lower_idx -= 1
                accumulated_vol += bins[lower_idx]
            elif upper_idx < num_bins - 1:
                upper_idx += 1
                accumulated_vol += bins[upper_idx]
            elif lower_idx > 0:
                lower_idx -= 1
                accumulated_vol += bins[lower_idx]
            else:
                break

        # Calculate VAH and VAL
        val_price = price_min + lower_idx * bin_size
        vah_price = price_min + (upper_idx + 1) * bin_size

        return {
            "poc": poc_price,
            "vah": vah_price,
            "val": val_price,
        }

    def _detect_vwap_bounce(
        self,
        closes: List[float],
        vwap: List[float],
        lookback: int = 3,
    ) -> Optional[str]:
        """
        Detect bounce off VWAP.

        Args:
            closes: List of closing prices
            vwap: List of VWAP values
            lookback: Number of bars to analyze for bounce detection

        Returns:
            "bullish_bounce", "bearish_bounce", or None
        """
        if len(closes) < lookback + 1 or len(vwap) < lookback + 1:
            return None

        recent_closes = closes[-lookback:]
        current_vwap = vwap[-1]

        # Check for bullish bounce (price below VWAP with higher lows/closes)
        if all(c < current_vwap for c in recent_closes[-2:]):
            # Check for 2+ consecutive higher closes
            if all(recent_closes[i] > recent_closes[i - 1] for i in range(1, len(recent_closes))):
                return "bullish_bounce"

        # Check for bearish bounce (price above VWAP with lower highs/closes)
        if all(c > current_vwap for c in recent_closes[-2:]):
            # Check for 2+ consecutive lower closes
            if all(recent_closes[i] < recent_closes[i - 1] for i in range(1, len(recent_closes))):
                return "bearish_bounce"

        return None

    def _generate_vwap_invalidation_rules(
        self,
        signal_side: SignalSide,
        entry_price: float,
        vwap: float,
        atr: float,
    ) -> List[Any]:
        """
        Generate VWAP-specific invalidation rules.

        Args:
            signal_side: Signal direction
            entry_price: Entry price
            vwap: Current VWAP value
            atr: Average True Range

        Returns:
            List of invalidation rules
        """
        from confidence.invalidation import InvalidationRule

        rules = []
        is_buy = signal_side == SignalSide.BUY

        if is_buy:
            # For BUY signals, invalidate if price breaks significantly below VWAP
            vwap_stop = vwap - (atr * 0.5)  # Half ATR below VWAP
            rules.append(InvalidationRule(
                condition="vwap_breakdown",
                threshold=vwap_stop,
                description=f"Price breaks below VWAP support zone at ${vwap_stop:.2f}",
                comparison="lte",
                feature_name="price",
            ))
        else:
            # For SELL signals, invalidate if price breaks significantly above VWAP
            vwap_stop = vwap + (atr * 0.5)  # Half ATR above VWAP
            rules.append(InvalidationRule(
                condition="vwap_breakout",
                threshold=vwap_stop,
                description=f"Price breaks above VWAP resistance zone at ${vwap_stop:.2f}",
                comparison="gte",
                feature_name="price",
            ))

        return rules
