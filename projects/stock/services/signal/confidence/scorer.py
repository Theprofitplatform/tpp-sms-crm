"""
Confidence Scorer

Calculates confidence scores for trading signals based on indicator agreement
and market conditions.

Usage:
    scorer = ConfidenceScorer()
    score, factors = scorer.calculate_confidence(
        signal_side="BUY",
        indicators={
            "rsi": 35.0,
            "macd_histogram": 0.5,
            "trend_strength": 0.7,
            "volume_ratio": 1.8,
            "bb_position": 0.15,
        }
    )
    # score = 0.82
    # factors = {"rsi": 0.85, "macd": 0.70, "trend": 0.90, ...}

Dependencies:
    - Python 3.10+
"""

from typing import Dict, Tuple, Any, Optional
from dataclasses import dataclass
import math


@dataclass
class IndicatorWeight:
    """Weight configuration for an indicator in confidence scoring."""
    base_weight: float      # Base contribution weight (0-1)
    bullish_threshold: float  # Value indicating bullish condition
    bearish_threshold: float  # Value indicating bearish condition
    neutral_zone: Tuple[float, float]  # Range considered neutral


class ConfidenceScorer:
    """
    Calculate confidence scores for trading signals.

    The scorer evaluates multiple technical indicators and computes
    both an overall confidence score and per-indicator breakdown.

    Scoring methodology:
    1. Each indicator contributes a 0-1 score based on its alignment with signal direction
    2. Indicators are weighted by their reliability for the strategy type
    3. Volume confirmation adds a multiplier
    4. Overall score is normalized to 0-1 range
    """

    # Default indicator weights for momentum strategies
    MOMENTUM_WEIGHTS = {
        "rsi": IndicatorWeight(0.20, 50.0, 50.0, (45.0, 55.0)),
        "macd": IndicatorWeight(0.25, 0.0, 0.0, (-0.1, 0.1)),
        "trend": IndicatorWeight(0.20, 0.3, -0.3, (-0.2, 0.2)),
        "volume": IndicatorWeight(0.15, 1.5, 1.5, (0.8, 1.2)),
        "sma_alignment": IndicatorWeight(0.20, 0.01, -0.01, (-0.005, 0.005)),
    }

    # Default indicator weights for mean reversion strategies
    MEAN_REVERSION_WEIGHTS = {
        "rsi": IndicatorWeight(0.30, 30.0, 70.0, (40.0, 60.0)),
        "bb_position": IndicatorWeight(0.30, 0.2, 0.8, (0.35, 0.65)),
        "deviation": IndicatorWeight(0.20, -0.02, 0.02, (-0.01, 0.01)),
        "volume": IndicatorWeight(0.10, 1.2, 1.2, (0.8, 1.2)),
        "stochastic": IndicatorWeight(0.10, 20.0, 80.0, (30.0, 70.0)),
    }

    def __init__(
        self,
        strategy_type: str = "momentum",
        custom_weights: Optional[Dict[str, IndicatorWeight]] = None,
    ):
        """
        Initialize the confidence scorer.

        Args:
            strategy_type: Type of strategy ("momentum" or "mean_reversion")
            custom_weights: Optional custom weights to override defaults
        """
        self.strategy_type = strategy_type

        if custom_weights:
            self.weights = custom_weights
        elif strategy_type == "mean_reversion":
            self.weights = self.MEAN_REVERSION_WEIGHTS
        else:
            self.weights = self.MOMENTUM_WEIGHTS

    def calculate_confidence(
        self,
        signal_side: str,
        indicators: Dict[str, Any],
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate overall confidence score and per-indicator breakdown.

        Args:
            signal_side: Signal direction ("BUY", "SELL", "HOLD")
            indicators: Dictionary of indicator values

        Returns:
            Tuple of (overall_score, {indicator: score})
        """
        if signal_side == "HOLD":
            return 0.0, {}

        is_buy = signal_side == "BUY"
        factors = {}
        total_weight = 0.0
        weighted_sum = 0.0

        # Score RSI
        if "rsi" in indicators and indicators["rsi"] is not None:
            rsi_score = self._score_rsi(indicators["rsi"], is_buy)
            factors["rsi"] = rsi_score
            weight = self.weights.get("rsi", IndicatorWeight(0.2, 50, 50, (45, 55))).base_weight
            weighted_sum += rsi_score * weight
            total_weight += weight

        # Score MACD
        macd_val = indicators.get("macd_histogram") or indicators.get("macd")
        if macd_val is not None:
            macd_score = self._score_macd(macd_val, is_buy)
            factors["macd"] = macd_score
            weight = self.weights.get("macd", IndicatorWeight(0.25, 0, 0, (-0.1, 0.1))).base_weight
            weighted_sum += macd_score * weight
            total_weight += weight

        # Score trend strength
        if "trend_strength" in indicators and indicators["trend_strength"] is not None:
            trend_score = self._score_trend(indicators["trend_strength"], is_buy)
            factors["trend"] = trend_score
            weight = self.weights.get("trend", IndicatorWeight(0.2, 0.3, -0.3, (-0.2, 0.2))).base_weight
            weighted_sum += trend_score * weight
            total_weight += weight

        # Score volume
        if "volume_ratio" in indicators and indicators["volume_ratio"] is not None:
            volume_score = self._score_volume(indicators["volume_ratio"])
            factors["volume"] = volume_score
            weight = self.weights.get("volume", IndicatorWeight(0.15, 1.5, 1.5, (0.8, 1.2))).base_weight
            weighted_sum += volume_score * weight
            total_weight += weight

        # Score Bollinger Band position (for mean reversion)
        if "bb_position" in indicators and indicators["bb_position"] is not None:
            bb_score = self._score_bb_position(indicators["bb_position"], is_buy)
            factors["bollinger"] = bb_score
            weight = self.weights.get("bb_position", IndicatorWeight(0.3, 0.2, 0.8, (0.35, 0.65))).base_weight
            weighted_sum += bb_score * weight
            total_weight += weight

        # Score SMA alignment
        sma_diff = indicators.get("price_to_sma_20") or indicators.get("sma_deviation")
        if sma_diff is not None:
            sma_score = self._score_sma_alignment(sma_diff, is_buy)
            factors["sma_alignment"] = sma_score
            weight = self.weights.get("sma_alignment", IndicatorWeight(0.2, 0.01, -0.01, (-0.005, 0.005))).base_weight
            weighted_sum += sma_score * weight
            total_weight += weight

        # Score stochastic
        stoch_k = indicators.get("stoch_k")
        if stoch_k is not None:
            stoch_score = self._score_stochastic(stoch_k, is_buy)
            factors["stochastic"] = stoch_score
            weight = self.weights.get("stochastic", IndicatorWeight(0.1, 20, 80, (30, 70))).base_weight
            weighted_sum += stoch_score * weight
            total_weight += weight

        # Calculate overall score
        if total_weight > 0:
            overall_score = weighted_sum / total_weight
        else:
            overall_score = 0.5  # Default neutral score

        # Apply confidence bounds
        overall_score = max(0.0, min(1.0, overall_score))

        # Round factors to 3 decimal places
        factors = {k: round(v, 3) for k, v in factors.items()}

        return round(overall_score, 3), factors

    def _score_rsi(self, rsi: float, is_buy: bool) -> float:
        """
        Score RSI indicator.

        For BUY signals: Lower RSI = higher confidence (oversold opportunity)
        For SELL signals: Higher RSI = higher confidence (overbought condition)
        """
        if self.strategy_type == "mean_reversion":
            # Mean reversion: extreme RSI values are good
            if is_buy:
                # Buying oversold: RSI < 30 is excellent
                if rsi <= 20:
                    return 1.0
                elif rsi <= 30:
                    return 0.9
                elif rsi <= 40:
                    return 0.7
                elif rsi <= 50:
                    return 0.5
                else:
                    return 0.3
            else:
                # Selling overbought: RSI > 70 is excellent
                if rsi >= 80:
                    return 1.0
                elif rsi >= 70:
                    return 0.9
                elif rsi >= 60:
                    return 0.7
                elif rsi >= 50:
                    return 0.5
                else:
                    return 0.3
        else:
            # Momentum: RSI confirms trend direction
            if is_buy:
                # Buying in uptrend: RSI > 50 but not overbought
                if 50 <= rsi <= 65:
                    return 0.9
                elif 45 <= rsi < 50:
                    return 0.7
                elif 30 <= rsi < 45:
                    return 0.6  # Oversold bounce potential
                elif rsi > 65 and rsi <= 75:
                    return 0.6  # Strong but getting overbought
                elif rsi > 75:
                    return 0.3  # Too overbought
                else:
                    return 0.4
            else:
                # Selling in downtrend: RSI < 50
                if 35 <= rsi <= 50:
                    return 0.9
                elif 50 < rsi <= 55:
                    return 0.7
                elif 55 < rsi <= 70:
                    return 0.6  # Overbought reversal potential
                elif rsi < 35 and rsi >= 25:
                    return 0.6  # Strong but getting oversold
                elif rsi < 25:
                    return 0.3  # Too oversold
                else:
                    return 0.4

    def _score_macd(self, macd_val: float, is_buy: bool) -> float:
        """
        Score MACD indicator.

        For BUY: Positive MACD histogram = bullish momentum
        For SELL: Negative MACD histogram = bearish momentum
        """
        # Normalize MACD value (assuming typical range of -3 to 3)
        normalized = max(-1.0, min(1.0, macd_val / 3.0))

        if is_buy:
            # Positive MACD is good for buy
            if normalized >= 0.3:
                return 0.9
            elif normalized >= 0.1:
                return 0.8
            elif normalized >= 0:
                return 0.7
            elif normalized >= -0.1:
                return 0.5
            else:
                return 0.3
        else:
            # Negative MACD is good for sell
            if normalized <= -0.3:
                return 0.9
            elif normalized <= -0.1:
                return 0.8
            elif normalized <= 0:
                return 0.7
            elif normalized <= 0.1:
                return 0.5
            else:
                return 0.3

    def _score_trend(self, trend_strength: float, is_buy: bool) -> float:
        """
        Score trend strength indicator.

        trend_strength ranges from -1 (strong downtrend) to 1 (strong uptrend)
        """
        if is_buy:
            if trend_strength >= 0.5:
                return 0.95
            elif trend_strength >= 0.3:
                return 0.85
            elif trend_strength >= 0.1:
                return 0.7
            elif trend_strength >= 0:
                return 0.6
            elif trend_strength >= -0.2:
                return 0.4
            else:
                return 0.2
        else:
            if trend_strength <= -0.5:
                return 0.95
            elif trend_strength <= -0.3:
                return 0.85
            elif trend_strength <= -0.1:
                return 0.7
            elif trend_strength <= 0:
                return 0.6
            elif trend_strength <= 0.2:
                return 0.4
            else:
                return 0.2

    def _score_volume(self, volume_ratio: float) -> float:
        """
        Score volume confirmation.

        Higher volume = higher confidence (confirms the move)
        """
        if volume_ratio >= 2.5:
            return 1.0
        elif volume_ratio >= 2.0:
            return 0.95
        elif volume_ratio >= 1.5:
            return 0.85
        elif volume_ratio >= 1.2:
            return 0.75
        elif volume_ratio >= 1.0:
            return 0.65
        elif volume_ratio >= 0.8:
            return 0.5
        else:
            return 0.3

    def _score_bb_position(self, bb_position: float, is_buy: bool) -> float:
        """
        Score Bollinger Band position.

        bb_position: 0 = at lower band, 0.5 = middle, 1 = at upper band

        For mean reversion:
        - BUY: Lower position = better (more room to revert up)
        - SELL: Higher position = better (more room to revert down)
        """
        if is_buy:
            if bb_position <= 0.1:
                return 1.0
            elif bb_position <= 0.2:
                return 0.9
            elif bb_position <= 0.3:
                return 0.75
            elif bb_position <= 0.4:
                return 0.6
            elif bb_position <= 0.5:
                return 0.4
            else:
                return 0.2
        else:
            if bb_position >= 0.9:
                return 1.0
            elif bb_position >= 0.8:
                return 0.9
            elif bb_position >= 0.7:
                return 0.75
            elif bb_position >= 0.6:
                return 0.6
            elif bb_position >= 0.5:
                return 0.4
            else:
                return 0.2

    def _score_sma_alignment(self, deviation: float, is_buy: bool) -> float:
        """
        Score SMA alignment.

        deviation: % distance from SMA (positive = above, negative = below)

        For momentum:
        - BUY: Price above SMA = good
        - SELL: Price below SMA = good
        """
        if self.strategy_type == "mean_reversion":
            # Mean reversion: larger deviation = better (more to revert)
            abs_deviation = abs(deviation)
            if is_buy and deviation < 0:  # Below SMA, buying
                if abs_deviation >= 0.03:
                    return 0.95
                elif abs_deviation >= 0.02:
                    return 0.85
                elif abs_deviation >= 0.01:
                    return 0.7
                else:
                    return 0.5
            elif not is_buy and deviation > 0:  # Above SMA, selling
                if abs_deviation >= 0.03:
                    return 0.95
                elif abs_deviation >= 0.02:
                    return 0.85
                elif abs_deviation >= 0.01:
                    return 0.7
                else:
                    return 0.5
            else:
                return 0.3  # Wrong direction for mean reversion
        else:
            # Momentum: price should be on the signal side
            if is_buy:
                if deviation >= 0.02:
                    return 0.9
                elif deviation >= 0.01:
                    return 0.8
                elif deviation >= 0:
                    return 0.7
                elif deviation >= -0.01:
                    return 0.5
                else:
                    return 0.3
            else:
                if deviation <= -0.02:
                    return 0.9
                elif deviation <= -0.01:
                    return 0.8
                elif deviation <= 0:
                    return 0.7
                elif deviation <= 0.01:
                    return 0.5
                else:
                    return 0.3

    def _score_stochastic(self, stoch_k: float, is_buy: bool) -> float:
        """
        Score stochastic oscillator.

        For mean reversion:
        - BUY: Low stochastic (< 20) = oversold
        - SELL: High stochastic (> 80) = overbought
        """
        if is_buy:
            if stoch_k <= 15:
                return 1.0
            elif stoch_k <= 20:
                return 0.9
            elif stoch_k <= 30:
                return 0.75
            elif stoch_k <= 50:
                return 0.5
            else:
                return 0.3
        else:
            if stoch_k >= 85:
                return 1.0
            elif stoch_k >= 80:
                return 0.9
            elif stoch_k >= 70:
                return 0.75
            elif stoch_k >= 50:
                return 0.5
            else:
                return 0.3
