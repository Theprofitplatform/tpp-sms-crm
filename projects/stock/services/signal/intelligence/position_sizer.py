"""
Adaptive Position Sizer - Intelligent position sizing based on Kelly criterion and market conditions.

Features:
1. Kelly criterion for optimal position sizing
2. Adjusts for confidence level
3. Scales with market regime (reduce in high vol)
4. Reduces size during drawdowns
5. Considers correlation with existing positions

Usage:
    sizer = AdaptivePositionSizer(equity=100000)
    size = sizer.calculate_position_size(
        signal=signal,
        regime=regime,
        current_drawdown=0.05,
    )
"""

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime


@dataclass
class PositionSizeResult:
    """Result of position sizing calculation."""
    shares: int
    dollar_amount: float
    position_pct: float  # Percentage of equity
    risk_per_share: float
    total_risk: float
    risk_pct: float  # Risk as % of equity

    # Adjustments applied
    base_size_pct: float
    kelly_factor: float
    confidence_adjustment: float
    regime_adjustment: float
    drawdown_adjustment: float
    correlation_adjustment: float
    final_adjustment: float

    # Reasoning
    sizing_reason: str


class AdaptivePositionSizer:
    """
    Calculates optimal position sizes using Kelly criterion and adaptive adjustments.

    Kelly Formula:
        f* = (p * b - q) / b
    Where:
        p = probability of winning (win rate)
        q = probability of losing (1 - p)
        b = win/loss ratio (avg win / avg loss)

    We use Fractional Kelly (typically 0.25-0.5) for safety.
    """

    DEFAULT_CONFIG = {
        # Kelly settings
        "kelly_fraction": 0.25,  # Use 25% of full Kelly (conservative)
        "min_kelly_trades": 20,  # Minimum trades before using Kelly

        # Default stats if no history
        "default_win_rate": 0.50,
        "default_win_loss_ratio": 1.5,

        # Position limits
        "max_position_pct": 10.0,  # Max 10% of equity in one position
        "min_position_pct": 1.0,   # Min 1% of equity
        "max_risk_per_trade_pct": 2.0,  # Max 2% risk per trade

        # Adjustment factors
        "confidence_scale_factor": 0.5,  # How much confidence affects size
        "drawdown_scale_factor": 2.0,    # How aggressively to reduce in drawdown
        "max_drawdown_reduction": 0.5,   # Max 50% reduction due to drawdown

        # Correlation settings
        "correlation_penalty_threshold": 0.7,  # Reduce if correlation > 70%
        "max_correlation_reduction": 0.3,      # Max 30% reduction for correlation

        # Regime adjustments (applied on top)
        "regime_adjustments": {
            "TRENDING_UP": 1.1,
            "TRENDING_DOWN": 0.8,
            "RANGING": 1.0,
            "HIGH_VOLATILITY": 0.6,
            "LOW_VOLATILITY": 1.0,
            "UNKNOWN": 0.8,
        },
    }

    def __init__(
        self,
        equity: float = 100000,
        config: Optional[Dict] = None,
        performance_tracker: Optional[Any] = None,
    ):
        self.equity = equity
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.performance_tracker = performance_tracker

    def calculate_position_size(
        self,
        symbol: str,
        entry_price: float,
        stop_loss: float,
        confidence: float = 0.5,
        regime_type: str = "UNKNOWN",
        current_drawdown_pct: float = 0.0,
        existing_positions: Optional[List[Dict]] = None,
        strategy_id: Optional[str] = None,
    ) -> PositionSizeResult:
        """
        Calculate optimal position size.

        Args:
            symbol: Stock symbol
            entry_price: Planned entry price
            stop_loss: Stop loss price
            confidence: Signal confidence (0-1)
            regime_type: Current market regime
            current_drawdown_pct: Current portfolio drawdown (0-1)
            existing_positions: List of current positions for correlation check
            strategy_id: Strategy that generated signal (for Kelly stats)

        Returns:
            PositionSizeResult with optimal position size and reasoning
        """
        # Calculate risk per share
        risk_per_share = abs(entry_price - stop_loss)

        if risk_per_share <= 0:
            return self._zero_position("Invalid stop loss - no risk defined")

        # Step 1: Calculate base Kelly position size
        kelly_factor, kelly_pct = self._calculate_kelly(strategy_id)

        # Step 2: Adjust for confidence
        confidence_adj = self._adjust_for_confidence(confidence)

        # Step 3: Adjust for regime
        regime_adj = self.config["regime_adjustments"].get(regime_type, 0.8)

        # Step 4: Adjust for drawdown
        drawdown_adj = self._adjust_for_drawdown(current_drawdown_pct)

        # Step 5: Adjust for correlation with existing positions
        correlation_adj = self._adjust_for_correlation(symbol, existing_positions)

        # Combine adjustments
        final_adjustment = confidence_adj * regime_adj * drawdown_adj * correlation_adj

        # Calculate position size percentage
        base_size_pct = kelly_pct * self.config["kelly_fraction"]
        adjusted_size_pct = base_size_pct * final_adjustment

        # Apply limits
        adjusted_size_pct = max(
            self.config["min_position_pct"],
            min(self.config["max_position_pct"], adjusted_size_pct)
        )

        # Calculate dollar amount and shares
        dollar_amount = self.equity * adjusted_size_pct / 100
        shares = int(dollar_amount / entry_price)

        if shares <= 0:
            return self._zero_position("Position size too small")

        # Verify risk limit
        total_risk = shares * risk_per_share
        risk_pct = total_risk / self.equity * 100

        if risk_pct > self.config["max_risk_per_trade_pct"]:
            # Reduce shares to meet risk limit
            max_risk = self.equity * self.config["max_risk_per_trade_pct"] / 100
            shares = int(max_risk / risk_per_share)
            total_risk = shares * risk_per_share
            risk_pct = total_risk / self.equity * 100
            dollar_amount = shares * entry_price
            adjusted_size_pct = dollar_amount / self.equity * 100

        # Build reasoning
        reason_parts = [
            f"Kelly base: {kelly_pct:.1f}% (fraction: {self.config['kelly_fraction']})",
        ]
        if confidence_adj != 1.0:
            reason_parts.append(f"Confidence adj: {confidence_adj:.2f}")
        if regime_adj != 1.0:
            reason_parts.append(f"Regime ({regime_type}): {regime_adj:.2f}")
        if drawdown_adj != 1.0:
            reason_parts.append(f"Drawdown adj: {drawdown_adj:.2f}")
        if correlation_adj != 1.0:
            reason_parts.append(f"Correlation adj: {correlation_adj:.2f}")

        return PositionSizeResult(
            shares=shares,
            dollar_amount=dollar_amount,
            position_pct=adjusted_size_pct,
            risk_per_share=risk_per_share,
            total_risk=total_risk,
            risk_pct=risk_pct,
            base_size_pct=base_size_pct,
            kelly_factor=kelly_factor,
            confidence_adjustment=confidence_adj,
            regime_adjustment=regime_adj,
            drawdown_adjustment=drawdown_adj,
            correlation_adjustment=correlation_adj,
            final_adjustment=final_adjustment,
            sizing_reason=" | ".join(reason_parts),
        )

    def _calculate_kelly(self, strategy_id: Optional[str]) -> tuple:
        """Calculate Kelly criterion position size."""
        # Get strategy stats from performance tracker
        win_rate = self.config["default_win_rate"]
        win_loss_ratio = self.config["default_win_loss_ratio"]

        if self.performance_tracker and strategy_id:
            metrics = self.performance_tracker.get_strategy_metrics(strategy_id)
            if metrics and metrics.total_signals >= self.config["min_kelly_trades"]:
                win_rate = metrics.win_rate
                if metrics.avg_loss_pct > 0:
                    win_loss_ratio = metrics.avg_win_pct / metrics.avg_loss_pct

        # Kelly formula: f* = (p * b - q) / b
        # p = win rate, q = loss rate, b = win/loss ratio
        p = win_rate
        q = 1 - p
        b = win_loss_ratio

        if b <= 0:
            return 0, 0

        kelly = (p * b - q) / b

        # Cap Kelly to prevent extreme values
        kelly = max(0, min(kelly, 0.5))  # Cap at 50%

        # Convert to percentage
        kelly_pct = kelly * 100

        return kelly, kelly_pct

    def _adjust_for_confidence(self, confidence: float) -> float:
        """Adjust position size based on signal confidence."""
        # Scale around 0.5 confidence
        # confidence 0.5 -> adjustment 1.0
        # confidence 1.0 -> adjustment 1.0 + scale_factor
        # confidence 0.0 -> adjustment 1.0 - scale_factor

        scale = self.config["confidence_scale_factor"]
        adjustment = 1.0 + (confidence - 0.5) * 2 * scale

        return max(0.5, min(1.5, adjustment))

    def _adjust_for_drawdown(self, drawdown_pct: float) -> float:
        """Reduce position size during drawdowns."""
        if drawdown_pct <= 0:
            return 1.0

        # Progressive reduction as drawdown increases
        # At 10% drawdown with scale_factor 2.0, reduce by 20%
        scale = self.config["drawdown_scale_factor"]
        reduction = min(
            self.config["max_drawdown_reduction"],
            drawdown_pct * scale
        )

        return 1.0 - reduction

    def _adjust_for_correlation(
        self,
        symbol: str,
        existing_positions: Optional[List[Dict]],
    ) -> float:
        """Reduce position size if correlated with existing positions."""
        if not existing_positions:
            return 1.0

        # Simplified correlation check based on sector
        # In production, would use actual correlation calculations
        sector_map = {
            # Tech
            "AAPL": "tech", "MSFT": "tech", "GOOGL": "tech", "META": "tech",
            "NVDA": "tech", "AMD": "tech", "INTC": "tech", "AMZN": "tech",
            # Finance
            "JPM": "finance", "BAC": "finance", "GS": "finance", "MS": "finance",
            # Energy
            "XOM": "energy", "CVX": "energy",
            # Consumer
            "WMT": "consumer", "HD": "consumer", "NKE": "consumer",
            # Auto
            "TSLA": "auto", "GM": "auto", "F": "auto",
        }

        symbol_sector = sector_map.get(symbol, "other")

        # Count same-sector positions
        same_sector_count = sum(
            1 for p in existing_positions
            if sector_map.get(p.get("symbol", ""), "other") == symbol_sector
        )

        if same_sector_count == 0:
            return 1.0

        # Reduce size based on number of same-sector positions
        # 1 same-sector: 10% reduction
        # 2 same-sector: 20% reduction
        # 3+ same-sector: 30% reduction
        reduction = min(
            self.config["max_correlation_reduction"],
            same_sector_count * 0.1
        )

        return 1.0 - reduction

    def _zero_position(self, reason: str) -> PositionSizeResult:
        """Return zero position result."""
        return PositionSizeResult(
            shares=0,
            dollar_amount=0,
            position_pct=0,
            risk_per_share=0,
            total_risk=0,
            risk_pct=0,
            base_size_pct=0,
            kelly_factor=0,
            confidence_adjustment=1.0,
            regime_adjustment=1.0,
            drawdown_adjustment=1.0,
            correlation_adjustment=1.0,
            final_adjustment=0,
            sizing_reason=reason,
        )

    def update_equity(self, new_equity: float) -> None:
        """Update equity for position calculations."""
        self.equity = new_equity

    def get_sizing_summary(self) -> Dict[str, Any]:
        """Get summary of sizing configuration."""
        return {
            "equity": self.equity,
            "kelly_fraction": self.config["kelly_fraction"],
            "max_position_pct": self.config["max_position_pct"],
            "max_risk_per_trade_pct": self.config["max_risk_per_trade_pct"],
            "regime_adjustments": self.config["regime_adjustments"],
        }
