"""
Circuit Breaker Module - Portfolio Risk Management

Implements automated circuit breakers that halt trading when certain
conditions are met. Circuit breakers are the last line of defense
against runaway losses or system malfunctions.

Usage:
    from portfolio.circuit_breaker import CircuitBreaker, check_circuit_breakers

    breaker = CircuitBreaker(config)
    triggered, reasons = await breaker.check_all(portfolio_state)
"""

import os
import json
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

import structlog

logger = structlog.get_logger(__name__)


# =============================================================================
# Circuit Breaker Types
# =============================================================================

class CircuitBreakerType(str, Enum):
    """Types of circuit breakers."""
    MAX_POSITIONS = "MAX_POSITIONS"
    CORRELATION_LIMIT = "CORRELATION_LIMIT"
    LOSS_STREAK = "LOSS_STREAK"
    DAILY_LOSS = "DAILY_LOSS"
    WEEKLY_LOSS = "WEEKLY_LOSS"
    DRAWDOWN = "DRAWDOWN"
    VOLATILITY_PAUSE = "VOLATILITY_PAUSE"
    SECTOR_CONCENTRATION = "SECTOR_CONCENTRATION"
    ORDER_RATE = "ORDER_RATE"
    CONSECUTIVE_ERRORS = "CONSECUTIVE_ERRORS"


class CircuitBreakerStatus(str, Enum):
    """Status of a circuit breaker."""
    ACTIVE = "ACTIVE"       # Trading allowed
    TRIGGERED = "TRIGGERED"  # Trading halted
    COOLDOWN = "COOLDOWN"   # In cooldown period


@dataclass
class CircuitBreakerRule:
    """Configuration for a single circuit breaker rule."""
    breaker_type: CircuitBreakerType
    threshold: float
    cooldown_minutes: int = 60
    auto_reset: bool = True
    severity: str = "critical"  # warning, critical, emergency
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.breaker_type.value,
            "threshold": self.threshold,
            "cooldown_minutes": self.cooldown_minutes,
            "auto_reset": self.auto_reset,
            "severity": self.severity,
            "description": self.description,
        }


@dataclass
class CircuitBreakerState:
    """Current state of a circuit breaker."""
    rule: CircuitBreakerRule
    status: CircuitBreakerStatus
    current_value: float
    triggered_at: Optional[datetime] = None
    triggered_reason: Optional[str] = None
    cooldown_until: Optional[datetime] = None
    trigger_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.rule.breaker_type.value,
            "status": self.status.value,
            "current_value": self.current_value,
            "threshold": self.rule.threshold,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "triggered_reason": self.triggered_reason,
            "cooldown_until": self.cooldown_until.isoformat() if self.cooldown_until else None,
            "trigger_count": self.trigger_count,
            "severity": self.rule.severity,
        }


@dataclass
class CircuitBreakerEvent:
    """Event logged when a circuit breaker is triggered or reset."""
    breaker_type: CircuitBreakerType
    event_type: str  # "triggered", "reset", "cooldown_started", "cooldown_ended"
    current_value: float
    threshold: float
    reason: str
    portfolio_state: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "breaker_type": self.breaker_type.value,
            "event_type": self.event_type,
            "current_value": self.current_value,
            "threshold": self.threshold,
            "reason": self.reason,
            "portfolio_state": self.portfolio_state,
            "timestamp": self.timestamp.isoformat(),
        }


class CircuitBreakerTriggered(Exception):
    """Exception raised when a circuit breaker is triggered."""

    def __init__(self, breaker_type: CircuitBreakerType, reason: str, state: CircuitBreakerState):
        self.breaker_type = breaker_type
        self.reason = reason
        self.state = state
        super().__init__(f"Circuit breaker {breaker_type.value} triggered: {reason}")


# =============================================================================
# Default Rules
# =============================================================================

DEFAULT_RULES = [
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.MAX_POSITIONS,
        threshold=20,
        cooldown_minutes=30,
        auto_reset=True,
        severity="warning",
        description="Maximum number of concurrent positions",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.CORRELATION_LIMIT,
        threshold=0.8,
        cooldown_minutes=60,
        auto_reset=True,
        severity="warning",
        description="Maximum correlation between position pairs",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.LOSS_STREAK,
        threshold=5,
        cooldown_minutes=120,
        auto_reset=True,
        severity="critical",
        description="Maximum consecutive losing trades",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.DAILY_LOSS,
        threshold=2.0,
        cooldown_minutes=1440,  # Until next day
        auto_reset=True,
        severity="critical",
        description="Maximum daily loss percentage",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.WEEKLY_LOSS,
        threshold=5.0,
        cooldown_minutes=10080,  # Until next week
        auto_reset=True,
        severity="emergency",
        description="Maximum weekly loss percentage",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.DRAWDOWN,
        threshold=15.0,
        cooldown_minutes=0,  # Manual reset required
        auto_reset=False,
        severity="emergency",
        description="Maximum drawdown from peak",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.VOLATILITY_PAUSE,
        threshold=35.0,
        cooldown_minutes=60,
        auto_reset=True,
        severity="critical",
        description="VIX level that triggers trading pause",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.SECTOR_CONCENTRATION,
        threshold=40.0,
        cooldown_minutes=30,
        auto_reset=True,
        severity="warning",
        description="Maximum exposure to any single sector (%)",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.ORDER_RATE,
        threshold=50,
        cooldown_minutes=60,
        auto_reset=True,
        severity="warning",
        description="Maximum orders per hour",
    ),
    CircuitBreakerRule(
        breaker_type=CircuitBreakerType.CONSECUTIVE_ERRORS,
        threshold=5,
        cooldown_minutes=30,
        auto_reset=True,
        severity="critical",
        description="Maximum consecutive system errors",
    ),
]


class CircuitBreaker:
    """
    Manages circuit breakers for portfolio risk control.

    Circuit breakers automatically halt trading when certain thresholds
    are exceeded. They can auto-reset after a cooldown period or require
    manual intervention.
    """

    def __init__(
        self,
        rules: Optional[List[CircuitBreakerRule]] = None,
        config_path: Optional[str] = None,
        db_pool: Optional[Any] = None,
    ):
        """
        Initialize circuit breaker manager.

        Args:
            rules: List of circuit breaker rules (overrides defaults)
            config_path: Path to JSON config file with rules
            db_pool: Database connection pool for event logging
        """
        self.db_pool = db_pool

        # Load rules from config file if provided
        if config_path and os.path.exists(config_path):
            self.rules = self._load_rules_from_config(config_path)
        elif rules:
            self.rules = {r.breaker_type: r for r in rules}
        else:
            self.rules = {r.breaker_type: r for r in DEFAULT_RULES}

        # Initialize state for each rule
        self.states: Dict[CircuitBreakerType, CircuitBreakerState] = {}
        for breaker_type, rule in self.rules.items():
            self.states[breaker_type] = CircuitBreakerState(
                rule=rule,
                status=CircuitBreakerStatus.ACTIVE,
                current_value=0.0,
            )

        # Track recent events for rate limiting checks
        self._recent_orders: List[datetime] = []
        self._recent_errors: List[datetime] = []
        self._loss_streak: int = 0

    def _load_rules_from_config(self, config_path: str) -> Dict[CircuitBreakerType, CircuitBreakerRule]:
        """Load circuit breaker rules from JSON config file."""
        try:
            with open(config_path, "r") as f:
                config = json.load(f)

            rules = {}
            for rule_config in config.get("circuit_breakers", []):
                breaker_type = CircuitBreakerType(rule_config["type"])
                rules[breaker_type] = CircuitBreakerRule(
                    breaker_type=breaker_type,
                    threshold=rule_config["threshold"],
                    cooldown_minutes=rule_config.get("cooldown_minutes", 60),
                    auto_reset=rule_config.get("auto_reset", True),
                    severity=rule_config.get("severity", "critical"),
                    description=rule_config.get("description", ""),
                )
            return rules
        except Exception as e:
            logger.error("Failed to load circuit breaker config", path=config_path, error=str(e))
            return {r.breaker_type: r for r in DEFAULT_RULES}

    async def check_all(
        self,
        portfolio_state: Dict[str, Any],
    ) -> Tuple[bool, List[CircuitBreakerState]]:
        """
        Check all circuit breakers against current portfolio state.

        Args:
            portfolio_state: Current portfolio state dict containing:
                - position_count: Number of open positions
                - daily_pnl_pct: Today's P&L percentage
                - weekly_pnl_pct: This week's P&L percentage
                - drawdown_pct: Current drawdown percentage
                - sector_exposure: Dict of sector -> percentage
                - vix_level: Current VIX (optional)
                - correlated_pairs: List of (symbol_a, symbol_b, correlation)

        Returns:
            Tuple of (any_triggered, list of triggered states)
        """
        triggered_states = []
        now = datetime.utcnow()

        # Check for cooldown expiry
        for breaker_type, state in self.states.items():
            if state.status == CircuitBreakerStatus.COOLDOWN:
                if state.cooldown_until and now >= state.cooldown_until:
                    state.status = CircuitBreakerStatus.ACTIVE
                    state.cooldown_until = None
                    logger.info(
                        "Circuit breaker cooldown ended",
                        breaker_type=breaker_type.value,
                    )

        # Check each breaker type
        checks = [
            (CircuitBreakerType.MAX_POSITIONS, portfolio_state.get("position_count", 0)),
            (CircuitBreakerType.DAILY_LOSS, abs(min(0, portfolio_state.get("daily_pnl_pct", 0)))),
            (CircuitBreakerType.WEEKLY_LOSS, abs(min(0, portfolio_state.get("weekly_pnl_pct", 0)))),
            (CircuitBreakerType.DRAWDOWN, portfolio_state.get("drawdown_pct", 0)),
            (CircuitBreakerType.VOLATILITY_PAUSE, portfolio_state.get("vix_level", 0)),
            (CircuitBreakerType.LOSS_STREAK, self._loss_streak),
            (CircuitBreakerType.CONSECUTIVE_ERRORS, len([e for e in self._recent_errors if e > now - timedelta(minutes=5)])),
        ]

        # Check sector concentration
        sector_exposure = portfolio_state.get("sector_exposure", {})
        max_sector_pct = max(sector_exposure.values()) if sector_exposure else 0
        checks.append((CircuitBreakerType.SECTOR_CONCENTRATION, max_sector_pct))

        # Check correlation limit
        correlated_pairs = portfolio_state.get("correlated_pairs", [])
        max_correlation = max([p[2] for p in correlated_pairs], default=0) if correlated_pairs else 0
        checks.append((CircuitBreakerType.CORRELATION_LIMIT, max_correlation))

        # Check order rate
        hour_ago = now - timedelta(hours=1)
        recent_order_count = len([o for o in self._recent_orders if o > hour_ago])
        checks.append((CircuitBreakerType.ORDER_RATE, recent_order_count))

        # Evaluate each check
        for breaker_type, current_value in checks:
            if breaker_type not in self.rules:
                continue

            state = self.states[breaker_type]
            rule = self.rules[breaker_type]
            state.current_value = current_value

            # Skip if already in cooldown
            if state.status == CircuitBreakerStatus.COOLDOWN:
                continue

            # Check threshold
            if current_value >= rule.threshold:
                state.status = CircuitBreakerStatus.TRIGGERED
                state.triggered_at = now
                state.triggered_reason = f"{breaker_type.value}: {current_value:.2f} >= {rule.threshold:.2f}"
                state.trigger_count += 1

                if rule.cooldown_minutes > 0 and rule.auto_reset:
                    state.cooldown_until = now + timedelta(minutes=rule.cooldown_minutes)
                    state.status = CircuitBreakerStatus.COOLDOWN

                triggered_states.append(state)

                # Log event
                event = CircuitBreakerEvent(
                    breaker_type=breaker_type,
                    event_type="triggered",
                    current_value=current_value,
                    threshold=rule.threshold,
                    reason=state.triggered_reason,
                    portfolio_state=portfolio_state,
                )

                await self._log_event(event)

                logger.critical(
                    "CIRCUIT BREAKER TRIGGERED",
                    breaker_type=breaker_type.value,
                    current_value=current_value,
                    threshold=rule.threshold,
                    severity=rule.severity,
                )

        any_triggered = len(triggered_states) > 0
        return any_triggered, triggered_states

    async def _log_event(self, event: CircuitBreakerEvent) -> None:
        """Log circuit breaker event to database."""
        if not self.db_pool:
            return

        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO circuit_breaker_events
                        (breaker_type, event_type, current_value, threshold,
                         reason, portfolio_state, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    event.breaker_type.value,
                    event.event_type,
                    event.current_value,
                    event.threshold,
                    event.reason,
                    json.dumps(event.portfolio_state),
                    event.timestamp,
                )
        except Exception as e:
            logger.error("Failed to log circuit breaker event", error=str(e))

    def can_trade(self) -> Tuple[bool, List[str]]:
        """
        Check if trading is currently allowed.

        Returns:
            Tuple of (can_trade, list of blocking reasons)
        """
        blocking_reasons = []

        for breaker_type, state in self.states.items():
            if state.status == CircuitBreakerStatus.TRIGGERED:
                blocking_reasons.append(
                    f"{breaker_type.value}: {state.triggered_reason}"
                )

        return len(blocking_reasons) == 0, blocking_reasons

    def get_all_states(self) -> Dict[str, CircuitBreakerState]:
        """Get current state of all circuit breakers."""
        return {bt.value: state for bt, state in self.states.items()}

    def get_triggered_breakers(self) -> List[CircuitBreakerState]:
        """Get list of currently triggered circuit breakers."""
        return [
            state for state in self.states.values()
            if state.status in (CircuitBreakerStatus.TRIGGERED, CircuitBreakerStatus.COOLDOWN)
        ]

    async def reset_breaker(
        self,
        breaker_type: CircuitBreakerType,
        reason: str,
        force: bool = False,
    ) -> bool:
        """
        Manually reset a circuit breaker.

        Args:
            breaker_type: Type of breaker to reset
            reason: Reason for reset
            force: Force reset even if auto_reset is False

        Returns:
            True if reset successful
        """
        if breaker_type not in self.states:
            return False

        state = self.states[breaker_type]
        rule = self.rules[breaker_type]

        if state.status == CircuitBreakerStatus.ACTIVE:
            return True  # Already active

        if not rule.auto_reset and not force:
            logger.warning(
                "Cannot reset breaker - requires force flag",
                breaker_type=breaker_type.value,
            )
            return False

        # Reset state
        state.status = CircuitBreakerStatus.ACTIVE
        state.triggered_at = None
        state.triggered_reason = None
        state.cooldown_until = None

        # Log reset event
        event = CircuitBreakerEvent(
            breaker_type=breaker_type,
            event_type="reset",
            current_value=state.current_value,
            threshold=rule.threshold,
            reason=f"Manual reset: {reason}",
            portfolio_state={},
        )

        await self._log_event(event)

        logger.info(
            "Circuit breaker reset",
            breaker_type=breaker_type.value,
            reason=reason,
        )

        return True

    def record_order(self) -> None:
        """Record an order for rate limiting."""
        now = datetime.utcnow()
        self._recent_orders.append(now)

        # Clean up old entries
        hour_ago = now - timedelta(hours=1)
        self._recent_orders = [o for o in self._recent_orders if o > hour_ago]

    def record_error(self) -> None:
        """Record a system error."""
        now = datetime.utcnow()
        self._recent_errors.append(now)

        # Clean up old entries
        five_min_ago = now - timedelta(minutes=5)
        self._recent_errors = [e for e in self._recent_errors if e > five_min_ago]

    def record_trade_result(self, is_win: bool) -> None:
        """Record trade result for loss streak tracking."""
        if is_win:
            self._loss_streak = 0
        else:
            self._loss_streak += 1

    def update_rule(
        self,
        breaker_type: CircuitBreakerType,
        threshold: Optional[float] = None,
        cooldown_minutes: Optional[int] = None,
        auto_reset: Optional[bool] = None,
    ) -> bool:
        """
        Update a circuit breaker rule.

        Args:
            breaker_type: Type of breaker to update
            threshold: New threshold value
            cooldown_minutes: New cooldown period
            auto_reset: New auto_reset setting

        Returns:
            True if update successful
        """
        if breaker_type not in self.rules:
            return False

        rule = self.rules[breaker_type]

        if threshold is not None:
            rule.threshold = threshold
        if cooldown_minutes is not None:
            rule.cooldown_minutes = cooldown_minutes
        if auto_reset is not None:
            rule.auto_reset = auto_reset

        logger.info(
            "Circuit breaker rule updated",
            breaker_type=breaker_type.value,
            threshold=rule.threshold,
            cooldown_minutes=rule.cooldown_minutes,
        )

        return True


# =============================================================================
# Module-level convenience functions
# =============================================================================

# Global circuit breaker instance
_global_breaker: Optional[CircuitBreaker] = None


def get_circuit_breaker() -> CircuitBreaker:
    """Get or create global circuit breaker instance."""
    global _global_breaker
    if _global_breaker is None:
        _global_breaker = CircuitBreaker()
    return _global_breaker


async def check_circuit_breakers(
    portfolio_state: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    """
    Check all circuit breakers against portfolio state.

    Convenience function using global breaker instance.

    Args:
        portfolio_state: Current portfolio state

    Returns:
        Tuple of (any_triggered, list of trigger reasons)
    """
    breaker = get_circuit_breaker()
    triggered, states = await breaker.check_all(portfolio_state)

    reasons = [s.triggered_reason for s in states if s.triggered_reason]
    return triggered, reasons


def can_trade() -> Tuple[bool, List[str]]:
    """
    Check if trading is currently allowed.

    Convenience function using global breaker instance.

    Returns:
        Tuple of (can_trade, list of blocking reasons)
    """
    breaker = get_circuit_breaker()
    return breaker.can_trade()
