"""
Strategy Performance Tracker - Tracks and scores strategy performance for adaptive weighting.

Features:
- Tracks signal outcomes (win/loss, P&L)
- Calculates rolling performance metrics (Sharpe, win rate, profit factor)
- Adjusts strategy weights based on recent performance
- Identifies strategy strengths by regime and symbol

Usage:
    tracker = StrategyPerformanceTracker()
    tracker.record_signal_outcome(signal_id, strategy_id, symbol, side, entry, exit, pnl)
    weights = tracker.get_strategy_weights()
    print(f"ML signals weight: {weights['ml_signals']:.2f}")
"""

import json
import os
import math
import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from pathlib import Path


@dataclass
class SignalOutcome:
    """Record of a signal's outcome."""
    signal_id: str
    strategy_id: str
    symbol: str
    side: str  # BUY or SELL
    entry_price: float
    exit_price: float
    pnl_pct: float  # Percentage return
    pnl_dollars: float
    holding_period_hours: float
    regime: Optional[str] = None  # Market regime when signal was generated
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def is_win(self) -> bool:
        return self.pnl_pct > 0


@dataclass
class StrategyMetrics:
    """Performance metrics for a strategy."""
    strategy_id: str
    total_signals: int
    wins: int
    losses: int
    win_rate: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float  # Gross profit / Gross loss
    sharpe_ratio: float  # Risk-adjusted return
    expectancy: float  # Expected return per trade
    max_drawdown_pct: float
    avg_holding_hours: float
    recent_performance: float  # Last 20 trades performance
    weight: float  # Recommended weight 0-1

    def to_dict(self) -> dict:
        return {
            "strategy_id": self.strategy_id,
            "total_signals": self.total_signals,
            "wins": self.wins,
            "losses": self.losses,
            "win_rate": self.win_rate,
            "avg_win_pct": self.avg_win_pct,
            "avg_loss_pct": self.avg_loss_pct,
            "profit_factor": self.profit_factor,
            "sharpe_ratio": self.sharpe_ratio,
            "expectancy": self.expectancy,
            "max_drawdown_pct": self.max_drawdown_pct,
            "avg_holding_hours": self.avg_holding_hours,
            "recent_performance": self.recent_performance,
            "weight": self.weight,
        }


class StrategyPerformanceTracker:
    """
    Tracks strategy performance and calculates adaptive weights.

    Weight calculation:
    1. Base weight from Sharpe ratio (higher = better)
    2. Adjusted by recent performance (momentum)
    3. Minimum weight floor (no strategy completely excluded)
    4. Normalized to sum to 1.0
    """

    DEFAULT_CONFIG = {
        # Lookback periods
        "rolling_window_days": 30,
        "recent_trades_count": 20,
        "min_trades_for_weight": 5,

        # Weight calculation
        "sharpe_weight": 0.4,  # Weight given to Sharpe ratio
        "recent_perf_weight": 0.3,  # Weight given to recent performance
        "win_rate_weight": 0.2,  # Weight given to win rate
        "profit_factor_weight": 0.1,  # Weight given to profit factor

        # Bounds
        "min_strategy_weight": 0.05,  # No strategy below 5%
        "max_strategy_weight": 0.40,  # No strategy above 40%
        "default_weight": 0.15,  # Default for new strategies

        # Risk-free rate for Sharpe (annualized)
        "risk_free_rate": 0.05,

        # Persistence
        "data_dir": None,  # Set to path to persist data
    }

    def __init__(self, config: Optional[Dict] = None):
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}

        # Outcome storage: strategy_id -> list of outcomes
        self.outcomes: Dict[str, List[SignalOutcome]] = defaultdict(list)

        # Cached metrics
        self._metrics_cache: Dict[str, StrategyMetrics] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl_seconds = 300  # 5 minute cache

        # Load persisted data if available
        self._load_data()

    def record_signal_outcome(
        self,
        signal_id: str,
        strategy_id: str,
        symbol: str,
        side: str,
        entry_price: float,
        exit_price: float,
        pnl_dollars: float,
        holding_period_hours: float,
        regime: Optional[str] = None,
        confidence: float = 0.5,
    ) -> None:
        """Record the outcome of a signal."""
        # Calculate P&L percentage
        if side.upper() == "BUY":
            pnl_pct = (exit_price - entry_price) / entry_price * 100
        else:
            pnl_pct = (entry_price - exit_price) / entry_price * 100

        outcome = SignalOutcome(
            signal_id=signal_id,
            strategy_id=strategy_id,
            symbol=symbol,
            side=side.upper(),
            entry_price=entry_price,
            exit_price=exit_price,
            pnl_pct=pnl_pct,
            pnl_dollars=pnl_dollars,
            holding_period_hours=holding_period_hours,
            regime=regime,
            confidence=confidence,
        )

        self.outcomes[strategy_id].append(outcome)

        # Invalidate cache
        self._cache_timestamp = None

        # Persist
        self._save_data()

    def get_strategy_metrics(self, strategy_id: str) -> Optional[StrategyMetrics]:
        """Get performance metrics for a specific strategy."""
        self._ensure_cache_valid()
        return self._metrics_cache.get(strategy_id)

    def get_all_metrics(self) -> Dict[str, StrategyMetrics]:
        """Get metrics for all tracked strategies."""
        self._ensure_cache_valid()
        return self._metrics_cache.copy()

    def get_strategy_weights(self, available_strategies: Optional[List[str]] = None) -> Dict[str, float]:
        """
        Get recommended weights for strategies.

        Args:
            available_strategies: List of strategy IDs to include (uses all tracked if None)

        Returns:
            Dict of strategy_id -> weight (0-1), normalized to sum to 1.0
        """
        self._ensure_cache_valid()

        if available_strategies is None:
            available_strategies = list(self.outcomes.keys())

        if not available_strategies:
            return {}

        weights = {}

        for strategy_id in available_strategies:
            metrics = self._metrics_cache.get(strategy_id)

            if metrics and metrics.total_signals >= self.config["min_trades_for_weight"]:
                weights[strategy_id] = metrics.weight
            else:
                weights[strategy_id] = self.config["default_weight"]

        # Normalize weights to sum to 1.0
        total = sum(weights.values())
        if total > 0:
            weights = {k: v / total for k, v in weights.items()}

        return weights

    def get_regime_weights(self, regime: str, available_strategies: List[str]) -> Dict[str, float]:
        """
        Get weights optimized for a specific regime.

        Analyzes historical performance per regime and adjusts weights accordingly.
        """
        regime_outcomes: Dict[str, List[SignalOutcome]] = defaultdict(list)

        for strategy_id in available_strategies:
            for outcome in self.outcomes.get(strategy_id, []):
                if outcome.regime == regime:
                    regime_outcomes[strategy_id].append(outcome)

        # Calculate regime-specific metrics
        regime_weights = {}
        for strategy_id in available_strategies:
            outcomes = regime_outcomes.get(strategy_id, [])
            if len(outcomes) >= 3:  # Need at least 3 trades in regime
                win_rate = sum(1 for o in outcomes if o.is_win) / len(outcomes)
                avg_return = statistics.mean(o.pnl_pct for o in outcomes)
                regime_weights[strategy_id] = max(0.1, min(0.9, 0.5 + avg_return / 10 + (win_rate - 0.5)))
            else:
                regime_weights[strategy_id] = self.config["default_weight"]

        # Normalize
        total = sum(regime_weights.values())
        if total > 0:
            regime_weights = {k: v / total for k, v in regime_weights.items()}

        return regime_weights

    def _ensure_cache_valid(self) -> None:
        """Ensure metrics cache is valid, recalculate if needed."""
        now = datetime.utcnow()

        if self._cache_timestamp and (now - self._cache_timestamp).total_seconds() < self._cache_ttl_seconds:
            return

        self._recalculate_metrics()
        self._cache_timestamp = now

    def _recalculate_metrics(self) -> None:
        """Recalculate all strategy metrics."""
        self._metrics_cache.clear()

        cutoff = datetime.utcnow() - timedelta(days=self.config["rolling_window_days"])

        for strategy_id, all_outcomes in self.outcomes.items():
            # Filter to rolling window
            outcomes = [o for o in all_outcomes if o.timestamp >= cutoff]

            if not outcomes:
                continue

            metrics = self._calculate_metrics(strategy_id, outcomes)
            self._metrics_cache[strategy_id] = metrics

    def _calculate_metrics(self, strategy_id: str, outcomes: List[SignalOutcome]) -> StrategyMetrics:
        """Calculate performance metrics for a list of outcomes."""
        if not outcomes:
            return self._empty_metrics(strategy_id)

        wins = [o for o in outcomes if o.is_win]
        losses = [o for o in outcomes if not o.is_win]

        total = len(outcomes)
        win_count = len(wins)
        loss_count = len(losses)
        win_rate = win_count / total if total > 0 else 0

        # Average returns
        avg_win_pct = statistics.mean(o.pnl_pct for o in wins) if wins else 0
        avg_loss_pct = statistics.mean(abs(o.pnl_pct) for o in losses) if losses else 0

        # Profit factor
        gross_profit = sum(o.pnl_pct for o in wins)
        gross_loss = sum(abs(o.pnl_pct) for o in losses)
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf') if gross_profit > 0 else 0

        # Sharpe ratio (annualized)
        returns = [o.pnl_pct for o in outcomes]
        if len(returns) >= 2:
            mean_return = statistics.mean(returns)
            std_return = statistics.stdev(returns)
            # Annualize assuming daily returns
            annual_return = mean_return * 252
            annual_vol = std_return * math.sqrt(252)
            sharpe = (annual_return - self.config["risk_free_rate"]) / annual_vol if annual_vol > 0 else 0
        else:
            sharpe = 0

        # Expectancy
        expectancy = win_rate * avg_win_pct - (1 - win_rate) * avg_loss_pct

        # Max drawdown
        cumulative = 0
        peak = 0
        max_dd = 0
        for o in sorted(outcomes, key=lambda x: x.timestamp):
            cumulative += o.pnl_pct
            peak = max(peak, cumulative)
            drawdown = peak - cumulative
            max_dd = max(max_dd, drawdown)

        # Average holding period
        avg_holding = statistics.mean(o.holding_period_hours for o in outcomes)

        # Recent performance (last N trades)
        recent_count = self.config["recent_trades_count"]
        recent = sorted(outcomes, key=lambda x: x.timestamp)[-recent_count:]
        recent_perf = statistics.mean(o.pnl_pct for o in recent) if recent else 0

        # Calculate weight
        weight = self._calculate_weight(
            sharpe=sharpe,
            recent_perf=recent_perf,
            win_rate=win_rate,
            profit_factor=profit_factor,
        )

        return StrategyMetrics(
            strategy_id=strategy_id,
            total_signals=total,
            wins=win_count,
            losses=loss_count,
            win_rate=win_rate,
            avg_win_pct=avg_win_pct,
            avg_loss_pct=avg_loss_pct,
            profit_factor=min(profit_factor, 10),  # Cap at 10
            sharpe_ratio=sharpe,
            expectancy=expectancy,
            max_drawdown_pct=max_dd,
            avg_holding_hours=avg_holding,
            recent_performance=recent_perf,
            weight=weight,
        )

    def _calculate_weight(
        self,
        sharpe: float,
        recent_perf: float,
        win_rate: float,
        profit_factor: float,
    ) -> float:
        """Calculate strategy weight from metrics."""
        # Normalize each metric to 0-1 scale
        sharpe_score = max(0, min(1, (sharpe + 1) / 4))  # -1 to 3 -> 0 to 1
        recent_score = max(0, min(1, (recent_perf + 5) / 10))  # -5% to +5% -> 0 to 1
        win_score = win_rate  # Already 0-1
        pf_score = max(0, min(1, (profit_factor - 0.5) / 2))  # 0.5 to 2.5 -> 0 to 1

        # Weighted combination
        raw_weight = (
            sharpe_score * self.config["sharpe_weight"] +
            recent_score * self.config["recent_perf_weight"] +
            win_score * self.config["win_rate_weight"] +
            pf_score * self.config["profit_factor_weight"]
        )

        # Apply bounds
        weight = max(
            self.config["min_strategy_weight"],
            min(self.config["max_strategy_weight"], raw_weight)
        )

        return weight

    def _empty_metrics(self, strategy_id: str) -> StrategyMetrics:
        """Return empty metrics for a strategy with no data."""
        return StrategyMetrics(
            strategy_id=strategy_id,
            total_signals=0,
            wins=0,
            losses=0,
            win_rate=0,
            avg_win_pct=0,
            avg_loss_pct=0,
            profit_factor=0,
            sharpe_ratio=0,
            expectancy=0,
            max_drawdown_pct=0,
            avg_holding_hours=0,
            recent_performance=0,
            weight=self.config["default_weight"],
        )

    def _save_data(self) -> None:
        """Persist outcome data to disk."""
        data_dir = self.config.get("data_dir")
        if not data_dir:
            return

        path = Path(data_dir) / "strategy_performance.json"
        path.parent.mkdir(parents=True, exist_ok=True)

        # Convert outcomes to serializable format
        data = {}
        for strategy_id, outcomes in self.outcomes.items():
            data[strategy_id] = [
                {
                    "signal_id": o.signal_id,
                    "strategy_id": o.strategy_id,
                    "symbol": o.symbol,
                    "side": o.side,
                    "entry_price": o.entry_price,
                    "exit_price": o.exit_price,
                    "pnl_pct": o.pnl_pct,
                    "pnl_dollars": o.pnl_dollars,
                    "holding_period_hours": o.holding_period_hours,
                    "regime": o.regime,
                    "confidence": o.confidence,
                    "timestamp": o.timestamp.isoformat(),
                }
                for o in outcomes
            ]

        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

    def _load_data(self) -> None:
        """Load persisted outcome data."""
        data_dir = self.config.get("data_dir")
        if not data_dir:
            return

        path = Path(data_dir) / "strategy_performance.json"
        if not path.exists():
            return

        try:
            with open(path) as f:
                data = json.load(f)

            for strategy_id, outcomes in data.items():
                for o in outcomes:
                    self.outcomes[strategy_id].append(SignalOutcome(
                        signal_id=o["signal_id"],
                        strategy_id=o["strategy_id"],
                        symbol=o["symbol"],
                        side=o["side"],
                        entry_price=o["entry_price"],
                        exit_price=o["exit_price"],
                        pnl_pct=o["pnl_pct"],
                        pnl_dollars=o["pnl_dollars"],
                        holding_period_hours=o["holding_period_hours"],
                        regime=o.get("regime"),
                        confidence=o.get("confidence", 0.5),
                        timestamp=datetime.fromisoformat(o["timestamp"]),
                    ))
        except Exception:
            pass  # Ignore load errors
