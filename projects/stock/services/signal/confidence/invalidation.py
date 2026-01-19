"""
Invalidation Rule Generator

Generates invalidation rules for trading signals based on entry conditions,
risk parameters, and market conditions.

Usage:
    from confidence.invalidation import generate_invalidation_rules

    rules = generate_invalidation_rules(
        signal_side="BUY",
        entry_price=185.50,
        stop_loss=180.00,
        target_price=195.00,
        features=signal_features,
        strategy_type="momentum",
    )

Dependencies:
    - Python 3.10+
    - models.signal (InvalidationRule, SignalFeatures)
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class InvalidationRule:
    """
    Rule that invalidates a signal.

    When the condition is met, the signal is no longer valid.
    This enables automatic signal expiration based on market conditions.
    """

    condition: str           # Machine-readable condition identifier
    threshold: float         # Threshold value for the condition
    description: str         # Human-readable description
    comparison: str = "lt"   # "lt", "gt", "eq", "gte", "lte"
    feature_name: str = ""   # Which feature to check

    # Common condition types as class constants
    PRICE_BELOW_STOP = "price_below_stop"
    PRICE_ABOVE_STOP = "price_above_stop"
    RSI_OVERBOUGHT = "rsi_overbought"
    RSI_OVERSOLD = "rsi_oversold"
    TREND_REVERSAL = "trend_reversal"
    TIME_EXPIRED = "time_expired"
    SMA_CROSSOVER = "sma_crossover"
    BB_BREACH = "bollinger_band_breach"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "condition": self.condition,
            "threshold": self.threshold,
            "description": self.description,
            "comparison": self.comparison,
            "feature_name": self.feature_name,
        }

    def check(self, current_value: float) -> bool:
        """
        Check if the invalidation condition is met.

        Args:
            current_value: Current value of the feature to check

        Returns:
            True if the signal should be invalidated
        """
        if self.comparison == "lt":
            return current_value < self.threshold
        elif self.comparison == "gt":
            return current_value > self.threshold
        elif self.comparison == "lte":
            return current_value <= self.threshold
        elif self.comparison == "gte":
            return current_value >= self.threshold
        elif self.comparison == "eq":
            return current_value == self.threshold
        return False


def generate_invalidation_rules(
    signal_side: str,
    entry_price: float,
    stop_loss: Optional[float] = None,
    target_price: Optional[float] = None,
    features: Optional[Dict[str, Any]] = None,
    strategy_type: str = "momentum",
    atr: Optional[float] = None,
) -> List[InvalidationRule]:
    """
    Generate invalidation rules for a trading signal.

    Creates rules that will automatically invalidate the signal when:
    - Stop loss is hit
    - RSI reaches extreme levels
    - Trend reverses
    - Key support/resistance levels break

    Args:
        signal_side: Signal direction ("BUY" or "SELL")
        entry_price: Entry price for the signal
        stop_loss: Stop loss price (optional, will generate default if not provided)
        target_price: Target price (optional)
        features: Dictionary of current indicator values
        strategy_type: Type of strategy ("momentum" or "mean_reversion")
        atr: Average True Range for volatility-based rules

    Returns:
        List of InvalidationRule objects
    """
    rules = []
    is_buy = signal_side == "BUY"
    features = features or {}

    # 1. Stop Loss Rule
    if stop_loss:
        if is_buy:
            rules.append(InvalidationRule(
                condition=InvalidationRule.PRICE_BELOW_STOP,
                threshold=stop_loss,
                description=f"Price drops below stop loss at ${stop_loss:.2f}",
                comparison="lte",
                feature_name="price",
            ))
        else:
            rules.append(InvalidationRule(
                condition=InvalidationRule.PRICE_ABOVE_STOP,
                threshold=stop_loss,
                description=f"Price rises above stop loss at ${stop_loss:.2f}",
                comparison="gte",
                feature_name="price",
            ))
    elif atr:
        # Generate default stop loss based on ATR
        default_stop_multiplier = 2.0
        if is_buy:
            default_stop = entry_price - (atr * default_stop_multiplier)
            rules.append(InvalidationRule(
                condition=InvalidationRule.PRICE_BELOW_STOP,
                threshold=default_stop,
                description=f"Price drops below 2 ATR stop at ${default_stop:.2f}",
                comparison="lte",
                feature_name="price",
            ))
        else:
            default_stop = entry_price + (atr * default_stop_multiplier)
            rules.append(InvalidationRule(
                condition=InvalidationRule.PRICE_ABOVE_STOP,
                threshold=default_stop,
                description=f"Price rises above 2 ATR stop at ${default_stop:.2f}",
                comparison="gte",
                feature_name="price",
            ))

    # 2. RSI Extreme Rules
    if strategy_type == "momentum":
        # Momentum: invalidate on momentum exhaustion
        if is_buy:
            # For BUY signals, invalidate if RSI gets too overbought
            rules.append(InvalidationRule(
                condition=InvalidationRule.RSI_OVERBOUGHT,
                threshold=80.0,
                description="RSI exceeds 80 (extremely overbought)",
                comparison="gte",
                feature_name="rsi_14",
            ))
        else:
            # For SELL signals, invalidate if RSI gets too oversold
            rules.append(InvalidationRule(
                condition=InvalidationRule.RSI_OVERSOLD,
                threshold=20.0,
                description="RSI drops below 20 (extremely oversold)",
                comparison="lte",
                feature_name="rsi_14",
            ))
    else:
        # Mean reversion: invalidate when mean is reached
        if is_buy:
            # For BUY signals on mean reversion, invalidate if RSI reaches neutral
            rules.append(InvalidationRule(
                condition="rsi_neutral_reached",
                threshold=55.0,
                description="RSI reaches neutral zone (mean reversion complete)",
                comparison="gte",
                feature_name="rsi_14",
            ))
        else:
            # For SELL signals on mean reversion, invalidate if RSI reaches neutral
            rules.append(InvalidationRule(
                condition="rsi_neutral_reached",
                threshold=45.0,
                description="RSI reaches neutral zone (mean reversion complete)",
                comparison="lte",
                feature_name="rsi_14",
            ))

    # 3. Trend Reversal Rules (for momentum strategies)
    if strategy_type == "momentum":
        if is_buy:
            # BUY signal invalidated if trend turns bearish
            rules.append(InvalidationRule(
                condition=InvalidationRule.TREND_REVERSAL,
                threshold=-0.2,
                description="Trend turns bearish (trend strength < -0.2)",
                comparison="lte",
                feature_name="trend_strength",
            ))
        else:
            # SELL signal invalidated if trend turns bullish
            rules.append(InvalidationRule(
                condition=InvalidationRule.TREND_REVERSAL,
                threshold=0.2,
                description="Trend turns bullish (trend strength > 0.2)",
                comparison="gte",
                feature_name="trend_strength",
            ))

    # 4. SMA Crossover Rules
    sma_20 = features.get("sma_20")
    sma_50 = features.get("sma_50")

    if sma_20 and sma_50 and strategy_type == "momentum":
        if is_buy:
            # BUY signal invalidated if fast SMA crosses below slow SMA
            # We use price_to_sma_20 as a proxy (if price drops significantly below SMA20)
            rules.append(InvalidationRule(
                condition=InvalidationRule.SMA_CROSSOVER,
                threshold=-0.03,  # 3% below SMA
                description="Price drops more than 3% below 20-day SMA",
                comparison="lte",
                feature_name="price_to_sma_20",
            ))
        else:
            # SELL signal invalidated if price rises above SMA
            rules.append(InvalidationRule(
                condition=InvalidationRule.SMA_CROSSOVER,
                threshold=0.03,  # 3% above SMA
                description="Price rises more than 3% above 20-day SMA",
                comparison="gte",
                feature_name="price_to_sma_20",
            ))

    # 5. Bollinger Band Rules (for mean reversion)
    if strategy_type == "mean_reversion":
        bb_middle = features.get("bb_middle")
        if bb_middle:
            if is_buy:
                # BUY signal reaches target when price returns to middle band
                rules.append(InvalidationRule(
                    condition="bb_middle_reached",
                    threshold=0.45,  # Near middle of bands
                    description="Price returns to middle Bollinger Band (take profit zone)",
                    comparison="gte",
                    feature_name="bb_position",
                ))
            else:
                # SELL signal reaches target when price returns to middle band
                rules.append(InvalidationRule(
                    condition="bb_middle_reached",
                    threshold=0.55,  # Near middle of bands
                    description="Price returns to middle Bollinger Band (take profit zone)",
                    comparison="lte",
                    feature_name="bb_position",
                ))

    # 6. Target Reached Rule
    if target_price:
        if is_buy:
            rules.append(InvalidationRule(
                condition="target_reached",
                threshold=target_price,
                description=f"Price reaches target at ${target_price:.2f}",
                comparison="gte",
                feature_name="price",
            ))
        else:
            rules.append(InvalidationRule(
                condition="target_reached",
                threshold=target_price,
                description=f"Price reaches target at ${target_price:.2f}",
                comparison="lte",
                feature_name="price",
            ))

    # 7. Volume Collapse Rule
    rules.append(InvalidationRule(
        condition="volume_collapse",
        threshold=0.5,
        description="Volume drops to less than 50% of average (no conviction)",
        comparison="lte",
        feature_name="volume_ratio",
    ))

    # 8. MACD Divergence Rule
    if strategy_type == "momentum":
        if is_buy:
            rules.append(InvalidationRule(
                condition="macd_bearish_cross",
                threshold=-0.5,
                description="MACD histogram turns significantly negative",
                comparison="lte",
                feature_name="macd_histogram",
            ))
        else:
            rules.append(InvalidationRule(
                condition="macd_bullish_cross",
                threshold=0.5,
                description="MACD histogram turns significantly positive",
                comparison="gte",
                feature_name="macd_histogram",
            ))

    return rules


def check_invalidation_rules(
    rules: List[InvalidationRule],
    current_features: Dict[str, Any],
) -> tuple[bool, List[str]]:
    """
    Check if any invalidation rules are triggered.

    Args:
        rules: List of InvalidationRule objects to check
        current_features: Dictionary of current indicator values

    Returns:
        Tuple of (is_still_valid, list of triggered rule descriptions)
    """
    triggered_rules = []

    for rule in rules:
        if rule.feature_name and rule.feature_name in current_features:
            current_value = current_features[rule.feature_name]
            if current_value is not None and rule.check(current_value):
                triggered_rules.append(rule.description)

    is_valid = len(triggered_rules) == 0
    return is_valid, triggered_rules


def validate_signal_against_market(
    signal_side: str,
    original_features: Dict[str, Any],
    current_features: Dict[str, Any],
    invalidation_rules: List[InvalidationRule],
) -> Dict[str, Any]:
    """
    Validate a signal against current market conditions.

    Args:
        signal_side: Original signal direction ("BUY" or "SELL")
        original_features: Features at signal generation time
        current_features: Current market features
        invalidation_rules: Rules to check

    Returns:
        Dictionary with validation result:
        {
            "is_valid": bool,
            "triggered_rules": List[str],
            "confidence_change": float,
            "recommendation": str,
        }
    """
    is_valid, triggered_rules = check_invalidation_rules(
        invalidation_rules, current_features
    )

    # Calculate confidence change based on feature drift
    confidence_change = 0.0

    # Check RSI drift
    orig_rsi = original_features.get("rsi_14")
    curr_rsi = current_features.get("rsi_14")
    if orig_rsi and curr_rsi:
        rsi_drift = abs(curr_rsi - orig_rsi)
        if rsi_drift > 20:
            confidence_change -= 0.2
        elif rsi_drift > 10:
            confidence_change -= 0.1

    # Check price drift
    orig_price = original_features.get("price")
    curr_price = current_features.get("price")
    if orig_price and curr_price:
        price_change_pct = (curr_price - orig_price) / orig_price
        is_buy = signal_side == "BUY"

        # Favorable price movement increases confidence
        if is_buy and price_change_pct > 0:
            confidence_change += min(price_change_pct * 2, 0.1)
        elif not is_buy and price_change_pct < 0:
            confidence_change += min(abs(price_change_pct) * 2, 0.1)
        # Adverse price movement decreases confidence
        elif is_buy and price_change_pct < -0.02:
            confidence_change -= min(abs(price_change_pct) * 3, 0.2)
        elif not is_buy and price_change_pct > 0.02:
            confidence_change -= min(price_change_pct * 3, 0.2)

    # Generate recommendation
    if not is_valid:
        recommendation = "CLOSE"
    elif confidence_change < -0.15:
        recommendation = "REDUCE"
    elif confidence_change > 0.1:
        recommendation = "HOLD_STRONG"
    else:
        recommendation = "HOLD"

    return {
        "is_valid": is_valid,
        "triggered_rules": triggered_rules,
        "confidence_change": round(confidence_change, 3),
        "recommendation": recommendation,
    }
