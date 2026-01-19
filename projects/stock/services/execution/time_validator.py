"""
Order Timing Validator for Execution Service

Validates order timing to ensure orders are only executed during appropriate
market hours. Rejects orders outside market hours unless explicitly configured
to allow extended hours trading.

Usage:
    from time_validator import TimeValidator, OrderTimingError

    validator = TimeValidator()

    # Validate order timing
    result = validator.validate_order_timing("US", "AAPL")
    if not result.is_valid:
        raise OrderTimingError(result.rejection_reason)

    # Check if extended hours are allowed
    if validator.can_trade_extended_hours("US"):
        # Execute extended hours order

Dependencies:
    - services/data/time (timezone, sessions, market_hours)
"""

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum

import structlog

# Add parent paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))

from time.timezone import now_utc, from_utc, get_market_timezone
from time.sessions import (
    get_current_session,
    SessionType,
    MarketSession,
    get_next_session_start,
)
from time.market_hours import is_market_open, get_market_config

logger = structlog.get_logger(__name__)


class TimingRejectionReason(str, Enum):
    """Reasons for order timing rejection."""
    MARKET_CLOSED = "market_closed"
    EXTENDED_HOURS_NOT_ALLOWED = "extended_hours_not_allowed"
    OUTSIDE_TRADING_HOURS = "outside_trading_hours"
    NON_TRADING_DAY = "non_trading_day"
    MARKET_ABOUT_TO_CLOSE = "market_about_to_close"
    CLOCK_SKEW_DETECTED = "clock_skew_detected"


@dataclass
class TimingValidationResult:
    """
    Result of order timing validation.

    Attributes:
        is_valid: Whether the order timing is valid
        market: Market identifier
        session_type: Current session type
        rejection_reason: Reason for rejection (if not valid)
        message: Human-readable message
        market_open_time: Market open time (if applicable)
        market_close_time: Market close time (if applicable)
        next_session_start: When the next session starts (UTC)
        can_execute_now: Whether the order can be executed immediately
        use_extended_hours: Whether extended hours should be used
    """
    is_valid: bool
    market: str
    session_type: str
    rejection_reason: Optional[TimingRejectionReason] = None
    message: str = ""
    market_open_time: Optional[time] = None
    market_close_time: Optional[time] = None
    next_session_start: Optional[datetime] = None
    can_execute_now: bool = False
    use_extended_hours: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "is_valid": self.is_valid,
            "market": self.market,
            "session_type": self.session_type,
            "rejection_reason": self.rejection_reason.value if self.rejection_reason else None,
            "message": self.message,
            "market_open_time": self.market_open_time.isoformat() if self.market_open_time else None,
            "market_close_time": self.market_close_time.isoformat() if self.market_close_time else None,
            "next_session_start": self.next_session_start.isoformat() if self.next_session_start else None,
            "can_execute_now": self.can_execute_now,
            "use_extended_hours": self.use_extended_hours,
        }


@dataclass
class TimeValidatorConfig:
    """
    Configuration for the time validator.

    Attributes:
        allow_extended_hours: Allow orders during pre/post market (per market)
        min_time_before_close: Minimum time (minutes) before market close for new orders
        reject_on_non_trading_days: Reject orders on non-trading days
        max_clock_skew_seconds: Maximum allowed clock skew for clock sync checks
    """
    allow_extended_hours: Dict[str, bool] = field(default_factory=lambda: {
        "US": False,
        "ASX": False,
        "CRYPTO": True,  # Always allowed for 24/7 markets
        "LSE": False,
        "TSX": False,
    })
    min_time_before_close: int = 5  # minutes
    reject_on_non_trading_days: bool = True
    max_clock_skew_seconds: int = 30

    @classmethod
    def from_env(cls) -> "TimeValidatorConfig":
        """Create config from environment variables."""
        allow_extended = {}
        for market in ["US", "ASX", "CRYPTO", "LSE", "TSX"]:
            env_key = f"ALLOW_EXTENDED_HOURS_{market}"
            allow_extended[market] = os.getenv(env_key, "false").lower() == "true"

        # Crypto is always 24/7
        allow_extended["CRYPTO"] = True

        return cls(
            allow_extended_hours=allow_extended,
            min_time_before_close=int(os.getenv("MIN_TIME_BEFORE_CLOSE", "5")),
            reject_on_non_trading_days=os.getenv("REJECT_NON_TRADING_DAYS", "true").lower() == "true",
            max_clock_skew_seconds=int(os.getenv("MAX_CLOCK_SKEW_SECONDS", "30")),
        )


class OrderTimingError(Exception):
    """Exception raised when order timing validation fails."""

    def __init__(self, result: TimingValidationResult):
        self.result = result
        super().__init__(result.message)


class TimeValidator:
    """
    Validates order timing for execution.

    Ensures orders are only executed during appropriate market hours
    and handles extended hours configuration.
    """

    def __init__(self, config: Optional[TimeValidatorConfig] = None):
        """
        Initialize time validator.

        Args:
            config: TimeValidatorConfig object (defaults to env-based config)
        """
        if config is None:
            config = TimeValidatorConfig.from_env()

        self.config = config

        logger.info(
            "Time validator initialized",
            allow_extended_hours=self.config.allow_extended_hours,
            min_time_before_close=self.config.min_time_before_close,
        )

    def validate_order_timing(
        self,
        market: str,
        symbol: str,
        order_type: str = "MARKET",
        at_time: Optional[datetime] = None,
    ) -> TimingValidationResult:
        """
        Validate order timing for a specific market and symbol.

        Args:
            market: Market identifier (US, ASX, CRYPTO, etc.)
            symbol: Symbol being traded
            order_type: Order type (MARKET, LIMIT, STOP, etc.)
            at_time: Time to validate (defaults to now in UTC)

        Returns:
            TimingValidationResult with validation details
        """
        if at_time is None:
            at_time = now_utc()

        market_upper = market.upper()

        # Get current session
        session = get_current_session(market_upper, at_time)
        market_config = get_market_config(market_upper)

        # Handle 24/7 markets (crypto)
        if market_config.get("is_24_7", False):
            return TimingValidationResult(
                is_valid=True,
                market=market_upper,
                session_type=SessionType.REGULAR,
                message="24/7 market - trading always allowed",
                can_execute_now=True,
            )

        # Check if trading day
        if not session.is_trading_day:
            if self.config.reject_on_non_trading_days:
                return TimingValidationResult(
                    is_valid=False,
                    market=market_upper,
                    session_type=SessionType.CLOSED,
                    rejection_reason=TimingRejectionReason.NON_TRADING_DAY,
                    message=f"Not a trading day for {market_upper}",
                    next_session_start=session.next_session_start,
                )

        # Regular session - always allowed
        if session.session_type == SessionType.REGULAR:
            # Check time before close
            if session.close_time:
                market_time = from_utc(at_time, get_market_timezone(market_upper))
                time_to_close = datetime.combine(
                    market_time.date(), session.close_time
                ) - datetime.combine(market_time.date(), market_time.time())

                if time_to_close.total_seconds() < self.config.min_time_before_close * 60:
                    if order_type == "MARKET":
                        return TimingValidationResult(
                            is_valid=False,
                            market=market_upper,
                            session_type=session.session_type,
                            rejection_reason=TimingRejectionReason.MARKET_ABOUT_TO_CLOSE,
                            message=f"Market closes in {int(time_to_close.total_seconds() / 60)} minutes - too close to execute MARKET order",
                            market_open_time=session.open_time,
                            market_close_time=session.close_time,
                            next_session_start=session.next_session_start,
                        )

            return TimingValidationResult(
                is_valid=True,
                market=market_upper,
                session_type=session.session_type,
                message="Regular trading session - order allowed",
                market_open_time=session.open_time,
                market_close_time=session.close_time,
                can_execute_now=True,
            )

        # Pre-market or post-market sessions
        if session.session_type in [SessionType.PRE, SessionType.POST]:
            allow_extended = self.config.allow_extended_hours.get(market_upper, False)

            if allow_extended:
                return TimingValidationResult(
                    is_valid=True,
                    market=market_upper,
                    session_type=session.session_type,
                    message=f"Extended hours trading allowed - {session.session_type} session",
                    market_open_time=session.open_time,
                    market_close_time=session.close_time,
                    can_execute_now=True,
                    use_extended_hours=True,
                )
            else:
                return TimingValidationResult(
                    is_valid=False,
                    market=market_upper,
                    session_type=session.session_type,
                    rejection_reason=TimingRejectionReason.EXTENDED_HOURS_NOT_ALLOWED,
                    message=f"Extended hours trading not enabled for {market_upper}",
                    market_open_time=session.open_time,
                    market_close_time=session.close_time,
                    next_session_start=session.next_session_start,
                )

        # Market closed
        return TimingValidationResult(
            is_valid=False,
            market=market_upper,
            session_type=session.session_type,
            rejection_reason=TimingRejectionReason.MARKET_CLOSED,
            message=f"Market {market_upper} is closed",
            next_session_start=session.next_session_start,
        )

    def can_trade_extended_hours(self, market: str) -> bool:
        """
        Check if extended hours trading is allowed for a market.

        Args:
            market: Market identifier

        Returns:
            True if extended hours trading is allowed
        """
        return self.config.allow_extended_hours.get(market.upper(), False)

    def get_time_to_next_session(
        self,
        market: str,
        at_time: Optional[datetime] = None,
    ) -> Optional[timedelta]:
        """
        Get time until the next trading session.

        Args:
            market: Market identifier
            at_time: Time to calculate from (defaults to now)

        Returns:
            timedelta until next session, or None for 24/7 markets
        """
        next_start = get_next_session_start(market, at_time)
        if next_start is None:
            return None

        if at_time is None:
            at_time = now_utc()

        return next_start - at_time

    def validate_order_or_raise(
        self,
        market: str,
        symbol: str,
        order_type: str = "MARKET",
        at_time: Optional[datetime] = None,
    ) -> TimingValidationResult:
        """
        Validate order timing and raise exception if invalid.

        Args:
            market: Market identifier
            symbol: Symbol being traded
            order_type: Order type
            at_time: Time to validate

        Returns:
            TimingValidationResult (only if valid)

        Raises:
            OrderTimingError: If order timing is invalid
        """
        result = self.validate_order_timing(market, symbol, order_type, at_time)

        if not result.is_valid:
            logger.warning(
                "Order timing validation failed",
                market=market,
                symbol=symbol,
                reason=result.rejection_reason,
                message=result.message,
            )
            raise OrderTimingError(result)

        return result

    def configure_market(
        self,
        market: str,
        allow_extended_hours: Optional[bool] = None,
    ) -> None:
        """
        Configure per-market settings at runtime.

        Args:
            market: Market identifier
            allow_extended_hours: Override for extended hours
        """
        market_upper = market.upper()

        if allow_extended_hours is not None:
            self.config.allow_extended_hours[market_upper] = allow_extended_hours

        logger.info(
            "Market timing config updated",
            market=market_upper,
            allow_extended_hours=self.config.allow_extended_hours.get(market_upper),
        )


# =============================================================================
# Clock Synchronization
# =============================================================================

@dataclass
class ClockSyncStatus:
    """
    Clock synchronization status.

    Attributes:
        service_time: Time reported by this service (UTC)
        reference_time: Reference time (NTP or system time)
        skew_ms: Clock skew in milliseconds
        is_synchronized: Whether clock is within acceptable skew
        max_skew_ms: Maximum allowed skew
    """
    service_time: datetime
    reference_time: datetime
    skew_ms: float
    is_synchronized: bool
    max_skew_ms: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "service_time": self.service_time.isoformat(),
            "reference_time": self.reference_time.isoformat(),
            "skew_ms": self.skew_ms,
            "is_synchronized": self.is_synchronized,
            "max_skew_ms": self.max_skew_ms,
        }


def check_clock_sync(
    max_skew_seconds: float = 30.0,
) -> ClockSyncStatus:
    """
    Check clock synchronization status.

    This is a basic implementation that compares against system time.
    In production, consider using NTP for more accurate time comparison.

    Args:
        max_skew_seconds: Maximum acceptable clock skew

    Returns:
        ClockSyncStatus with synchronization details
    """
    service_time = now_utc()
    # In production, you would compare against an NTP server
    # For now, we compare against the same clock (always synchronized)
    reference_time = datetime.utcnow().replace(tzinfo=service_time.tzinfo)

    skew = (service_time - reference_time).total_seconds() * 1000  # ms
    is_synchronized = abs(skew) < (max_skew_seconds * 1000)

    return ClockSyncStatus(
        service_time=service_time,
        reference_time=reference_time,
        skew_ms=skew,
        is_synchronized=is_synchronized,
        max_skew_ms=max_skew_seconds * 1000,
    )


def get_service_time_info() -> Dict[str, Any]:
    """
    Get comprehensive time information for the service.

    Returns dictionary with:
        - utc_time: Current UTC time
        - service_uptime_check: Basic health check
        - supported_markets: List of supported markets with current status
    """
    utc_now = now_utc()

    # Get status for each supported market
    markets_status = {}
    for market in ["US", "ASX", "CRYPTO", "LSE", "TSX"]:
        try:
            session = get_current_session(market, utc_now)
            markets_status[market] = {
                "session_type": session.session_type,
                "is_trading_day": session.is_trading_day,
                "timezone": session.timezone,
                "open_time": session.open_time.isoformat() if session.open_time else None,
                "close_time": session.close_time.isoformat() if session.close_time else None,
                "next_session_start": session.next_session_start.isoformat() if session.next_session_start else None,
            }
        except Exception as e:
            markets_status[market] = {"error": str(e)}

    return {
        "utc_time": utc_now.isoformat(),
        "utc_timestamp": utc_now.timestamp(),
        "supported_markets": markets_status,
    }
