"""
Market Regime Detector - Classifies market conditions for adaptive strategy selection.

Detects market regimes:
- TRENDING_UP: Strong uptrend (use momentum strategies)
- TRENDING_DOWN: Strong downtrend (use momentum strategies, short bias)
- RANGING: Sideways market (use mean reversion strategies)
- HIGH_VOLATILITY: Elevated volatility (reduce position sizes, widen stops)
- LOW_VOLATILITY: Compressed volatility (breakout setups likely)

Usage:
    detector = MarketRegimeDetector()
    regime = detector.detect(ohlcv_data)
    print(f"Current regime: {regime.regime_type}")
    print(f"Recommended strategies: {regime.recommended_strategies}")
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Optional, Tuple
import statistics

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from indicators.technical import TechnicalIndicators


class RegimeType(str, Enum):
    """Market regime classifications."""
    TRENDING_UP = "TRENDING_UP"
    TRENDING_DOWN = "TRENDING_DOWN"
    RANGING = "RANGING"
    HIGH_VOLATILITY = "HIGH_VOLATILITY"
    LOW_VOLATILITY = "LOW_VOLATILITY"
    UNKNOWN = "UNKNOWN"


@dataclass
class RegimeAnalysis:
    """Result of regime detection analysis."""
    regime_type: RegimeType
    confidence: float  # 0-1 confidence in regime classification
    trend_strength: float  # -1 to 1, negative = downtrend
    volatility_percentile: float  # 0-100, current vol vs historical
    adx_value: float
    regime_duration_days: int  # Estimated days in current regime

    # Strategy recommendations
    recommended_strategies: List[str]
    strategy_weights: Dict[str, float]

    # Position sizing adjustments
    position_size_multiplier: float  # 0.5-1.5 based on regime
    stop_loss_multiplier: float  # Widen stops in high vol

    # Raw metrics for debugging
    metrics: Dict[str, float]


class MarketRegimeDetector:
    """
    Detects market regime to enable adaptive strategy selection.

    Uses multiple indicators:
    - ADX for trend strength
    - Price vs SMAs for trend direction
    - ATR percentile for volatility regime
    - Bollinger Band width for volatility compression
    """

    DEFAULT_CONFIG = {
        # Trend detection
        "adx_period": 14,
        "adx_trend_threshold": 25,  # ADX > 25 = trending
        "adx_strong_threshold": 40,  # ADX > 40 = strong trend
        "sma_fast": 20,
        "sma_slow": 50,
        "sma_trend": 200,

        # Volatility detection
        "atr_period": 14,
        "volatility_lookback": 100,  # Days to calculate percentile
        "high_vol_percentile": 75,
        "low_vol_percentile": 25,
        "bb_period": 20,
        "bb_squeeze_threshold": 0.04,  # BB width < 4% = squeeze

        # Regime persistence
        "min_regime_bars": 5,  # Minimum bars to confirm regime change
    }

    # Strategy recommendations per regime
    REGIME_STRATEGIES = {
        RegimeType.TRENDING_UP: {
            "recommended": ["momentum", "breakout", "macd_crossover", "ml_signals"],
            "weights": {"momentum": 0.3, "breakout": 0.25, "macd_crossover": 0.25, "ml_signals": 0.2},
            "position_mult": 1.2,
            "stop_mult": 1.0,
        },
        RegimeType.TRENDING_DOWN: {
            "recommended": ["momentum", "rsi_divergence", "macd_crossover", "ml_signals"],
            "weights": {"momentum": 0.3, "rsi_divergence": 0.25, "macd_crossover": 0.25, "ml_signals": 0.2},
            "position_mult": 0.8,  # Reduce size in downtrends
            "stop_mult": 1.0,
        },
        RegimeType.RANGING: {
            "recommended": ["mean_reversion", "rsi_divergence", "volume_profile", "pairs_trading"],
            "weights": {"mean_reversion": 0.35, "rsi_divergence": 0.25, "volume_profile": 0.2, "pairs_trading": 0.2},
            "position_mult": 1.0,
            "stop_mult": 0.8,  # Tighter stops in ranges
        },
        RegimeType.HIGH_VOLATILITY: {
            "recommended": ["volatility_event", "breakout", "ml_signals"],
            "weights": {"volatility_event": 0.4, "breakout": 0.3, "ml_signals": 0.3},
            "position_mult": 0.6,  # Reduce size significantly
            "stop_mult": 1.5,  # Wider stops
        },
        RegimeType.LOW_VOLATILITY: {
            "recommended": ["breakout", "mean_reversion", "volume_profile"],
            "weights": {"breakout": 0.4, "mean_reversion": 0.35, "volume_profile": 0.25},
            "position_mult": 1.0,
            "stop_mult": 0.7,  # Tighter stops, expect breakout
        },
        RegimeType.UNKNOWN: {
            "recommended": ["ml_signals", "momentum", "mean_reversion"],
            "weights": {"ml_signals": 0.4, "momentum": 0.3, "mean_reversion": 0.3},
            "position_mult": 0.8,
            "stop_mult": 1.0,
        },
    }

    def __init__(self, config: Optional[Dict] = None):
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self._last_regime = RegimeType.UNKNOWN
        self._regime_bar_count = 0

    def detect(self, ohlcv_data: List[dict]) -> RegimeAnalysis:
        """
        Detect current market regime from OHLCV data.

        Args:
            ohlcv_data: List of OHLCV bars (newest last)

        Returns:
            RegimeAnalysis with regime type and recommendations
        """
        if len(ohlcv_data) < self.config["volatility_lookback"]:
            return self._unknown_regime("Insufficient data")

        # Extract price arrays
        highs = [bar['high'] for bar in ohlcv_data]
        lows = [bar['low'] for bar in ohlcv_data]
        closes = [bar['close'] for bar in ohlcv_data]

        # Calculate indicators
        metrics = self._calculate_metrics(highs, lows, closes)

        # Determine regime
        regime_type, confidence = self._classify_regime(metrics)

        # Check regime persistence
        if regime_type != self._last_regime:
            self._regime_bar_count = 1
        else:
            self._regime_bar_count += 1

        # Only confirm regime change after min bars
        if self._regime_bar_count < self.config["min_regime_bars"]:
            regime_type = self._last_regime
            confidence *= 0.8  # Reduce confidence during transition
        else:
            self._last_regime = regime_type

        # Get strategy recommendations
        regime_config = self.REGIME_STRATEGIES.get(regime_type, self.REGIME_STRATEGIES[RegimeType.UNKNOWN])

        return RegimeAnalysis(
            regime_type=regime_type,
            confidence=confidence,
            trend_strength=metrics["trend_strength"],
            volatility_percentile=metrics["volatility_percentile"],
            adx_value=metrics["adx"],
            regime_duration_days=self._regime_bar_count,
            recommended_strategies=regime_config["recommended"],
            strategy_weights=regime_config["weights"],
            position_size_multiplier=regime_config["position_mult"],
            stop_loss_multiplier=regime_config["stop_mult"],
            metrics=metrics,
        )

    def _calculate_metrics(self, highs: List[float], lows: List[float],
                          closes: List[float]) -> Dict[str, float]:
        """Calculate all regime detection metrics."""
        # Trend indicators
        sma_fast = TechnicalIndicators.sma(closes, self.config["sma_fast"])
        sma_slow = TechnicalIndicators.sma(closes, self.config["sma_slow"])
        sma_trend = TechnicalIndicators.sma(closes, self.config["sma_trend"]) if len(closes) >= 200 else [None] * len(closes)

        # ADX for trend strength
        adx_data = TechnicalIndicators.adx(highs, lows, closes, self.config["adx_period"])
        adx = adx_data['adx'][-1] if adx_data and adx_data.get('adx') else 0
        plus_di = adx_data['plus_di'][-1] if adx_data and adx_data.get('plus_di') else 0
        minus_di = adx_data['minus_di'][-1] if adx_data and adx_data.get('minus_di') else 0

        # ATR for volatility
        atr = TechnicalIndicators.atr(highs, lows, closes, self.config["atr_period"])
        current_atr = atr[-1] if atr else 0

        # ATR as percentage of price
        current_price = closes[-1]
        atr_pct = (current_atr / current_price * 100) if current_price > 0 else 0

        # Calculate ATR percentile over lookback period
        lookback = self.config["volatility_lookback"]
        if len(atr) >= lookback:
            atr_history = atr[-lookback:]
            atr_percentile = sum(1 for a in atr_history if a < current_atr) / len(atr_history) * 100
        else:
            atr_percentile = 50  # Default to middle

        # Bollinger Band width for volatility squeeze detection
        bb = TechnicalIndicators.bollinger_bands(closes, self.config["bb_period"], 2.0)
        bb_width = 0
        if bb and bb.get('upper') and bb.get('lower') and bb.get('middle'):
            bb_upper = bb['upper'][-1]
            bb_lower = bb['lower'][-1]
            bb_middle = bb['middle'][-1]
            if bb_middle > 0:
                bb_width = (bb_upper - bb_lower) / bb_middle

        # Trend strength calculation (-1 to 1)
        trend_strength = 0
        if sma_fast and sma_slow and sma_fast[-1] and sma_slow[-1]:
            # SMA alignment
            sma_spread = (sma_fast[-1] - sma_slow[-1]) / sma_slow[-1]
            trend_strength = max(-1, min(1, sma_spread * 20))  # Normalize

            # Confirm with DI
            if plus_di > minus_di:
                trend_strength = abs(trend_strength)
            else:
                trend_strength = -abs(trend_strength)

        # Price position relative to SMAs
        price_vs_sma20 = (current_price - sma_fast[-1]) / sma_fast[-1] if sma_fast and sma_fast[-1] else 0
        price_vs_sma50 = (current_price - sma_slow[-1]) / sma_slow[-1] if sma_slow and sma_slow[-1] else 0
        price_vs_sma200 = (current_price - sma_trend[-1]) / sma_trend[-1] if sma_trend and sma_trend[-1] else 0

        return {
            "adx": adx,
            "plus_di": plus_di,
            "minus_di": minus_di,
            "trend_strength": trend_strength,
            "atr": current_atr,
            "atr_pct": atr_pct,
            "volatility_percentile": atr_percentile,
            "bb_width": bb_width,
            "price_vs_sma20": price_vs_sma20,
            "price_vs_sma50": price_vs_sma50,
            "price_vs_sma200": price_vs_sma200,
            "sma_fast": sma_fast[-1] if sma_fast else None,
            "sma_slow": sma_slow[-1] if sma_slow else None,
            "sma_trend": sma_trend[-1] if sma_trend and sma_trend[-1] else None,
        }

    def _classify_regime(self, metrics: Dict[str, float]) -> Tuple[RegimeType, float]:
        """Classify regime based on metrics."""
        adx = metrics["adx"]
        trend_strength = metrics["trend_strength"]
        vol_percentile = metrics["volatility_percentile"]
        bb_width = metrics["bb_width"]

        confidence = 0.5  # Start with neutral confidence

        # High volatility takes precedence
        if vol_percentile >= self.config["high_vol_percentile"]:
            confidence = 0.6 + (vol_percentile - 75) / 100  # Higher percentile = higher confidence
            return RegimeType.HIGH_VOLATILITY, min(confidence, 0.95)

        # Low volatility / squeeze
        if vol_percentile <= self.config["low_vol_percentile"] or bb_width < self.config["bb_squeeze_threshold"]:
            confidence = 0.6 + (25 - vol_percentile) / 100
            return RegimeType.LOW_VOLATILITY, min(confidence, 0.9)

        # Check for trending market
        if adx >= self.config["adx_trend_threshold"]:
            # Strong trend
            if adx >= self.config["adx_strong_threshold"]:
                confidence = 0.8 + (adx - 40) / 100
            else:
                confidence = 0.6 + (adx - 25) / 50

            if trend_strength > 0:
                return RegimeType.TRENDING_UP, min(confidence, 0.95)
            else:
                return RegimeType.TRENDING_DOWN, min(confidence, 0.95)

        # Default to ranging
        confidence = 0.5 + (25 - adx) / 50  # Lower ADX = more confident it's ranging
        return RegimeType.RANGING, min(confidence, 0.85)

    def _unknown_regime(self, reason: str) -> RegimeAnalysis:
        """Return unknown regime when detection fails."""
        regime_config = self.REGIME_STRATEGIES[RegimeType.UNKNOWN]
        return RegimeAnalysis(
            regime_type=RegimeType.UNKNOWN,
            confidence=0.3,
            trend_strength=0,
            volatility_percentile=50,
            adx_value=0,
            regime_duration_days=0,
            recommended_strategies=regime_config["recommended"],
            strategy_weights=regime_config["weights"],
            position_size_multiplier=regime_config["position_mult"],
            stop_loss_multiplier=regime_config["stop_mult"],
            metrics={"error": reason},
        )

    def get_regime_summary(self, regime: RegimeAnalysis) -> str:
        """Get human-readable regime summary."""
        descriptions = {
            RegimeType.TRENDING_UP: "Market is in an uptrend. Favor momentum and breakout strategies.",
            RegimeType.TRENDING_DOWN: "Market is in a downtrend. Favor momentum (short) and divergence strategies.",
            RegimeType.RANGING: "Market is ranging/sideways. Favor mean reversion and pairs trading.",
            RegimeType.HIGH_VOLATILITY: "High volatility regime. Reduce position sizes, use wider stops.",
            RegimeType.LOW_VOLATILITY: "Low volatility/squeeze. Watch for breakouts, use tighter stops.",
            RegimeType.UNKNOWN: "Unable to determine regime. Using balanced approach.",
        }

        return (
            f"{regime.regime_type.value}: {descriptions.get(regime.regime_type, 'Unknown')}\n"
            f"Confidence: {regime.confidence:.1%}\n"
            f"ADX: {regime.adx_value:.1f}, Trend: {regime.trend_strength:+.2f}\n"
            f"Volatility Percentile: {regime.volatility_percentile:.0f}%\n"
            f"Position Size Adjustment: {regime.position_size_multiplier:.1f}x"
        )
