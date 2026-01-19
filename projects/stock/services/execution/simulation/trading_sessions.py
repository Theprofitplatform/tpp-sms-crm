"""
Trading Session Manager - Comprehensive Session State Tracking

Provides production-grade trading session management with:
- Real-time session state tracking (PRE_MARKET, REGULAR, AFTER_HOURS, CLOSED)
- Session state change events and callbacks
- Early close / half-day support
- Session-aware order validation
- Multi-market coordination
- Session timeline visualization

Usage:
    from simulation.trading_sessions import (
        TradingSessionManager,
        SessionState,
        get_session_manager,
    )

    manager = TradingSessionManager()

    # Check current state
    state = manager.get_session_state("US")
    if state == SessionState.REGULAR:
        print("US market is in regular trading hours")

    # Register for session events
    manager.on_session_change("US", lambda old, new: print(f"US: {old} -> {new}"))

    # Validate order timing
    validation = manager.validate_order_timing(order)
    if not validation.allowed:
        print(f"Order rejected: {validation.reason}")

Configuration:
    TRADING_SESSION_CHECK_INTERVAL: Seconds between state checks (default: 60)
    ALLOW_EXTENDED_HOURS_TRADING: Enable pre/after hours (default: false)

Dependencies:
    - market_hours.py (MarketSession, MarketConfig)
    - pytz (timezone handling)
    - asyncio (for background monitoring)
"""

import os
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, date, time, timedelta
from enum import Enum
from typing import Optional, Dict, List, Callable, Set, Any, Tuple
from threading import Lock
import pytz

from simulation.market_hours import (
    MarketSession,
    MarketConfig,
    MarketType,
    MARKET_CONFIGS,
    get_us_holidays,
    get_asx_holidays,
)


class SessionState(str, Enum):
    """Trading session states."""
    CLOSED = "CLOSED"               # Market is closed
    PRE_MARKET = "PRE_MARKET"       # Pre-market session
    PRE_OPEN = "PRE_OPEN"           # Just before market open (last 5 min)
    REGULAR = "REGULAR"             # Regular trading hours
    PRE_CLOSE = "PRE_CLOSE"         # Just before market close (last 15 min)
    AFTER_HOURS = "AFTER_HOURS"     # After-hours session
    HOLIDAY = "HOLIDAY"             # Market holiday
    EARLY_CLOSE = "EARLY_CLOSE"     # Early close day (half day)
    HALTED = "HALTED"               # Trading halt (circuit breaker)
    UNKNOWN = "UNKNOWN"             # Cannot determine state


@dataclass
class SessionInfo:
    """Complete session information for a market."""
    market: str
    state: SessionState
    state_since: datetime
    next_state: Optional[SessionState] = None
    next_state_at: Optional[datetime] = None
    is_trading_allowed: bool = False
    is_extended_hours: bool = False
    regular_open: Optional[datetime] = None
    regular_close: Optional[datetime] = None
    pre_market_open: Optional[datetime] = None
    after_hours_close: Optional[datetime] = None
    early_close_time: Optional[datetime] = None
    timezone: str = "UTC"
    trading_day: bool = True
    holiday_name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "market": self.market,
            "state": self.state.value,
            "state_since": self.state_since.isoformat() if self.state_since else None,
            "next_state": self.next_state.value if self.next_state else None,
            "next_state_at": self.next_state_at.isoformat() if self.next_state_at else None,
            "is_trading_allowed": self.is_trading_allowed,
            "is_extended_hours": self.is_extended_hours,
            "regular_open": self.regular_open.isoformat() if self.regular_open else None,
            "regular_close": self.regular_close.isoformat() if self.regular_close else None,
            "pre_market_open": self.pre_market_open.isoformat() if self.pre_market_open else None,
            "after_hours_close": self.after_hours_close.isoformat() if self.after_hours_close else None,
            "early_close_time": self.early_close_time.isoformat() if self.early_close_time else None,
            "timezone": self.timezone,
            "trading_day": self.trading_day,
            "holiday_name": self.holiday_name,
        }


@dataclass
class OrderTimingValidation:
    """Result of order timing validation."""
    allowed: bool
    reason: Optional[str] = None
    session_state: SessionState = SessionState.UNKNOWN
    would_execute_at: Optional[datetime] = None
    warning: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "session_state": self.session_state.value,
            "would_execute_at": self.would_execute_at.isoformat() if self.would_execute_at else None,
            "warning": self.warning,
        }


@dataclass
class SessionEvent:
    """Session state change event."""
    market: str
    old_state: SessionState
    new_state: SessionState
    timestamp: datetime
    trading_day: date


# Type alias for session change callbacks
SessionCallback = Callable[[SessionState, SessionState], None]


class EarlyCloseCalendar:
    """
    Calendar of early close days for markets.

    US Markets typically close early on:
    - Day before Independence Day
    - Day after Thanksgiving (Black Friday)
    - Christmas Eve
    - New Year's Eve
    """

    @staticmethod
    def get_us_early_closes(year: int) -> Dict[date, time]:
        """
        Get US market early close dates and times.

        Returns dict mapping date to early close time.
        """
        early_closes = {}

        # Day before July 4th (if July 4 is not Monday)
        july_4 = date(year, 7, 4)
        if july_4.weekday() != 0:  # Not Monday
            day_before = july_4 - timedelta(days=1)
            if day_before.weekday() < 5:  # Weekday
                early_closes[day_before] = time(13, 0)

        # Day after Thanksgiving
        # Thanksgiving is 4th Thursday in November
        nov_first = date(year, 11, 1)
        thanksgiving = nov_first + timedelta(days=((3 - nov_first.weekday()) % 7) + 21)
        black_friday = thanksgiving + timedelta(days=1)
        early_closes[black_friday] = time(13, 0)

        # Christmas Eve (if weekday)
        christmas_eve = date(year, 12, 24)
        if christmas_eve.weekday() < 5:
            early_closes[christmas_eve] = time(13, 0)

        return early_closes

    @staticmethod
    def get_asx_early_closes(year: int) -> Dict[date, time]:
        """Get ASX early close dates."""
        early_closes = {}

        # Christmas Eve and New Year's Eve
        christmas_eve = date(year, 12, 24)
        new_years_eve = date(year, 12, 31)

        if christmas_eve.weekday() < 5:
            early_closes[christmas_eve] = time(14, 10)
        if new_years_eve.weekday() < 5:
            early_closes[new_years_eve] = time(14, 10)

        return early_closes


class TradingSessionManager:
    """
    Comprehensive trading session manager.

    Tracks session states for multiple markets, fires events on state changes,
    and provides session-aware order validation.

    Example:
        manager = TradingSessionManager()

        # Get session state
        info = manager.get_session_info("US")
        print(f"US market is {info.state.value}")

        # Register callback
        manager.on_session_change("US", my_callback)

        # Start background monitoring
        await manager.start()

        # Validate order
        validation = manager.validate_order_timing({
            "symbol": "AAPL",
            "market": "US",
            "order_type": "MARKET",
        })
    """

    def __init__(
        self,
        allow_extended_hours: Optional[bool] = None,
        check_interval: Optional[int] = None,
    ):
        """
        Initialize trading session manager.

        Args:
            allow_extended_hours: Allow pre/after-hours trading
            check_interval: Seconds between state checks
        """
        self.allow_extended_hours = allow_extended_hours or os.getenv(
            'ALLOW_EXTENDED_HOURS_TRADING', 'false'
        ).lower() == 'true'

        self.check_interval = check_interval or int(
            os.getenv('TRADING_SESSION_CHECK_INTERVAL', '60')
        )

        # Market sessions
        self._sessions: Dict[str, MarketSession] = {}
        for market in MARKET_CONFIGS:
            self._sessions[market] = MarketSession(
                market,
                include_extended_hours=self.allow_extended_hours,
            )

        # Current state tracking
        self._current_states: Dict[str, SessionState] = {}
        self._state_since: Dict[str, datetime] = {}
        self._lock = Lock()

        # Event callbacks
        self._callbacks: Dict[str, List[SessionCallback]] = {}
        self._global_callbacks: List[Callable[[str, SessionState, SessionState], None]] = []

        # Early close calendars
        self._early_closes: Dict[str, Dict[date, time]] = {}
        self._load_early_close_calendars()

        # Trading halts (manually set)
        self._halted_markets: Set[str] = set()

        # Background task
        self._monitoring_task: Optional[asyncio.Task] = None
        self._running = False

        # Initialize states
        self._initialize_states()

    def _load_early_close_calendars(self) -> None:
        """Load early close calendars for all markets."""
        current_year = datetime.now().year

        for year in [current_year, current_year + 1]:
            us_closes = EarlyCloseCalendar.get_us_early_closes(year)
            asx_closes = EarlyCloseCalendar.get_asx_early_closes(year)

            for d, t in us_closes.items():
                self._early_closes.setdefault("US", {})[d] = t
                self._early_closes.setdefault("US_FUTURES", {})[d] = t

            for d, t in asx_closes.items():
                self._early_closes.setdefault("ASX", {})[d] = t

    def _initialize_states(self) -> None:
        """Initialize current states for all markets."""
        now = datetime.now(pytz.UTC)
        for market in MARKET_CONFIGS:
            state = self._calculate_session_state(market, now)
            self._current_states[market] = state
            self._state_since[market] = now

    def _calculate_session_state(
        self,
        market: str,
        dt: Optional[datetime] = None,
    ) -> SessionState:
        """
        Calculate the current session state for a market.

        Args:
            market: Market code
            dt: Datetime to check (default: now)

        Returns:
            Current SessionState
        """
        if market in self._halted_markets:
            return SessionState.HALTED

        session = self._sessions.get(market)
        if not session:
            return SessionState.UNKNOWN

        if dt is None:
            dt = datetime.now(pytz.UTC)

        # Crypto is always in regular session
        if session.config.market_type == MarketType.CRYPTO:
            return SessionState.REGULAR

        # Check if trading day
        if not session.is_trading_day(dt):
            # Check if it's a holiday
            market_dt = session._to_market_time(dt)
            if market_dt.date() in session._holidays:
                return SessionState.HOLIDAY
            return SessionState.CLOSED

        # Check for early close
        market_dt = session._to_market_time(dt)
        early_close = self._early_closes.get(market, {}).get(market_dt.date())

        hours = session.config.trading_hours
        current_time = market_dt.time()

        # Define session boundaries
        pre_market_open = hours.pre_market_open or hours.open_time
        regular_open = hours.open_time
        regular_close = early_close or hours.close_time
        after_hours_close = hours.after_hours_close or hours.close_time

        # Handle early close
        if early_close:
            after_hours_close = early_close

        # Determine state
        if current_time < pre_market_open:
            return SessionState.CLOSED

        if hours.pre_market_open and current_time < regular_open:
            # Check for pre-open (last 5 minutes)
            pre_open_start = (
                datetime.combine(market_dt.date(), regular_open) - timedelta(minutes=5)
            ).time()
            if current_time >= pre_open_start:
                return SessionState.PRE_OPEN
            return SessionState.PRE_MARKET

        if current_time < regular_close:
            # Check for pre-close (last 15 minutes)
            pre_close_start = (
                datetime.combine(market_dt.date(), regular_close) - timedelta(minutes=15)
            ).time()
            if current_time >= pre_close_start:
                if early_close:
                    return SessionState.EARLY_CLOSE
                return SessionState.PRE_CLOSE
            return SessionState.REGULAR

        if hours.after_hours_close and current_time <= after_hours_close:
            return SessionState.AFTER_HOURS

        return SessionState.CLOSED

    def get_session_state(self, market: str) -> SessionState:
        """Get current session state for a market."""
        with self._lock:
            return self._current_states.get(market, SessionState.UNKNOWN)

    def get_session_info(self, market: str) -> SessionInfo:
        """
        Get complete session information for a market.

        Args:
            market: Market code

        Returns:
            SessionInfo with full session details
        """
        session = self._sessions.get(market)
        if not session:
            return SessionInfo(
                market=market,
                state=SessionState.UNKNOWN,
                state_since=datetime.now(pytz.UTC),
            )

        now = datetime.now(pytz.UTC)
        state = self.get_session_state(market)
        market_dt = session._to_market_time(now)
        hours = session.config.trading_hours

        # Get session times
        regular_open, regular_close = session.get_session_times(now)

        # Check for early close
        early_close = self._early_closes.get(market, {}).get(market_dt.date())
        early_close_dt = None
        if early_close:
            early_close_dt = session.timezone.localize(
                datetime.combine(market_dt.date(), early_close)
            ).astimezone(pytz.UTC)

        # Pre-market and after-hours
        pre_market_open = None
        after_hours_close = None
        if hours.pre_market_open:
            pre_market_open = session.timezone.localize(
                datetime.combine(market_dt.date(), hours.pre_market_open)
            ).astimezone(pytz.UTC)
        if hours.after_hours_close:
            after_hours_close = session.timezone.localize(
                datetime.combine(market_dt.date(), hours.after_hours_close)
            ).astimezone(pytz.UTC)

        # Calculate next state
        next_state, next_state_at = self._calculate_next_state(market, now)

        # Is trading allowed?
        is_trading = state in [
            SessionState.REGULAR,
            SessionState.PRE_CLOSE,
            SessionState.EARLY_CLOSE,
        ]
        if self.allow_extended_hours:
            is_trading = is_trading or state in [
                SessionState.PRE_MARKET,
                SessionState.PRE_OPEN,
                SessionState.AFTER_HOURS,
            ]

        # Check if holiday
        is_holiday = state == SessionState.HOLIDAY
        holiday_name = None
        if is_holiday:
            # Could add holiday name lookup here
            holiday_name = "Market Holiday"

        return SessionInfo(
            market=market,
            state=state,
            state_since=self._state_since.get(market, now),
            next_state=next_state,
            next_state_at=next_state_at,
            is_trading_allowed=is_trading,
            is_extended_hours=state in [SessionState.PRE_MARKET, SessionState.AFTER_HOURS],
            regular_open=regular_open if session.is_trading_day(now) else None,
            regular_close=regular_close if session.is_trading_day(now) else None,
            pre_market_open=pre_market_open,
            after_hours_close=after_hours_close,
            early_close_time=early_close_dt,
            timezone=session.config.timezone,
            trading_day=session.is_trading_day(now),
            holiday_name=holiday_name,
        )

    def _calculate_next_state(
        self,
        market: str,
        dt: datetime,
    ) -> Tuple[Optional[SessionState], Optional[datetime]]:
        """Calculate the next state transition for a market."""
        session = self._sessions.get(market)
        if not session:
            return None, None

        current_state = self.get_session_state(market)
        market_dt = session._to_market_time(dt)
        hours = session.config.trading_hours

        # Crypto never changes state
        if session.config.market_type == MarketType.CRYPTO:
            return None, None

        # Get early close if applicable
        early_close = self._early_closes.get(market, {}).get(market_dt.date())

        transitions = {
            SessionState.CLOSED: (
                SessionState.PRE_MARKET if hours.pre_market_open else SessionState.REGULAR,
                session.get_next_open(dt),
            ),
            SessionState.PRE_MARKET: (
                SessionState.PRE_OPEN,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), hours.open_time) - timedelta(minutes=5)
                ).astimezone(pytz.UTC),
            ),
            SessionState.PRE_OPEN: (
                SessionState.REGULAR,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), hours.open_time)
                ).astimezone(pytz.UTC),
            ),
            SessionState.REGULAR: (
                SessionState.PRE_CLOSE if not early_close else SessionState.EARLY_CLOSE,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), early_close or hours.close_time) - timedelta(minutes=15)
                ).astimezone(pytz.UTC),
            ),
            SessionState.PRE_CLOSE: (
                SessionState.AFTER_HOURS if hours.after_hours_close else SessionState.CLOSED,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), hours.close_time)
                ).astimezone(pytz.UTC),
            ),
            SessionState.EARLY_CLOSE: (
                SessionState.CLOSED,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), early_close)
                ).astimezone(pytz.UTC) if early_close else None,
            ),
            SessionState.AFTER_HOURS: (
                SessionState.CLOSED,
                session.timezone.localize(
                    datetime.combine(market_dt.date(), hours.after_hours_close)
                ).astimezone(pytz.UTC) if hours.after_hours_close else None,
            ),
            SessionState.HOLIDAY: (
                SessionState.CLOSED,
                session.get_next_open(dt),
            ),
        }

        return transitions.get(current_state, (None, None))

    def validate_order_timing(
        self,
        order: Dict[str, Any],
        allow_queue: bool = True,
    ) -> OrderTimingValidation:
        """
        Validate if an order can be placed given current session state.

        Args:
            order: Order dictionary with market, order_type, etc.
            allow_queue: Allow queuing for next session if closed

        Returns:
            OrderTimingValidation result
        """
        market = order.get("market", "US")
        order_type = order.get("order_type", "MARKET")

        state = self.get_session_state(market)
        info = self.get_session_info(market)

        # Crypto is always open
        if state == SessionState.REGULAR and info.trading_day:
            return OrderTimingValidation(
                allowed=True,
                session_state=state,
                would_execute_at=datetime.now(pytz.UTC),
            )

        # Market orders during regular hours
        if state in [SessionState.REGULAR, SessionState.PRE_CLOSE]:
            return OrderTimingValidation(
                allowed=True,
                session_state=state,
                would_execute_at=datetime.now(pytz.UTC),
                warning="Market closing soon" if state == SessionState.PRE_CLOSE else None,
            )

        # Early close - warning
        if state == SessionState.EARLY_CLOSE:
            return OrderTimingValidation(
                allowed=True,
                session_state=state,
                would_execute_at=datetime.now(pytz.UTC),
                warning=f"Early close today at {info.early_close_time}",
            )

        # Extended hours
        if state in [SessionState.PRE_MARKET, SessionState.PRE_OPEN, SessionState.AFTER_HOURS]:
            if self.allow_extended_hours:
                if order_type == "LIMIT":
                    return OrderTimingValidation(
                        allowed=True,
                        session_state=state,
                        would_execute_at=datetime.now(pytz.UTC),
                        warning="Extended hours: reduced liquidity, limit orders only",
                    )
                else:
                    return OrderTimingValidation(
                        allowed=False,
                        reason="Market orders not allowed during extended hours",
                        session_state=state,
                    )
            else:
                return OrderTimingValidation(
                    allowed=False,
                    reason=f"Market is in {state.value} session. Extended hours trading not enabled.",
                    session_state=state,
                    would_execute_at=info.regular_open if allow_queue else None,
                )

        # Halted
        if state == SessionState.HALTED:
            return OrderTimingValidation(
                allowed=False,
                reason="Trading is halted for this market",
                session_state=state,
            )

        # Holiday
        if state == SessionState.HOLIDAY:
            session = self._sessions.get(market)
            next_open = session.get_next_open() if session else None
            return OrderTimingValidation(
                allowed=False,
                reason=f"Market is closed for {info.holiday_name or 'holiday'}",
                session_state=state,
                would_execute_at=next_open if allow_queue else None,
            )

        # Market closed
        if state == SessionState.CLOSED:
            session = self._sessions.get(market)
            next_open = session.get_next_open() if session else None

            if allow_queue and order_type == "LIMIT":
                return OrderTimingValidation(
                    allowed=True,
                    session_state=state,
                    would_execute_at=next_open,
                    warning=f"Order queued for next session open at {next_open}",
                )
            elif allow_queue:
                return OrderTimingValidation(
                    allowed=False,
                    reason="Market is closed. Market orders cannot be queued.",
                    session_state=state,
                    would_execute_at=next_open,
                )
            else:
                return OrderTimingValidation(
                    allowed=False,
                    reason="Market is closed",
                    session_state=state,
                )

        return OrderTimingValidation(
            allowed=False,
            reason="Unable to determine market session state",
            session_state=state,
        )

    def on_session_change(
        self,
        market: str,
        callback: SessionCallback,
    ) -> None:
        """
        Register a callback for session state changes.

        Args:
            market: Market to monitor
            callback: Function(old_state, new_state) to call on change
        """
        with self._lock:
            if market not in self._callbacks:
                self._callbacks[market] = []
            self._callbacks[market].append(callback)

    def on_any_session_change(
        self,
        callback: Callable[[str, SessionState, SessionState], None],
    ) -> None:
        """
        Register a callback for any market session change.

        Args:
            callback: Function(market, old_state, new_state) to call on change
        """
        with self._lock:
            self._global_callbacks.append(callback)

    def _fire_session_event(
        self,
        market: str,
        old_state: SessionState,
        new_state: SessionState,
    ) -> None:
        """Fire callbacks for a session state change."""
        # Market-specific callbacks
        for callback in self._callbacks.get(market, []):
            try:
                callback(old_state, new_state)
            except Exception:
                pass  # Don't let callback errors break the manager

        # Global callbacks
        for callback in self._global_callbacks:
            try:
                callback(market, old_state, new_state)
            except Exception:
                pass

    def _check_and_update_states(self) -> List[SessionEvent]:
        """Check all markets for state changes."""
        now = datetime.now(pytz.UTC)
        events = []

        for market in MARKET_CONFIGS:
            new_state = self._calculate_session_state(market, now)
            old_state = self._current_states.get(market, SessionState.UNKNOWN)

            if new_state != old_state:
                with self._lock:
                    self._current_states[market] = new_state
                    self._state_since[market] = now

                event = SessionEvent(
                    market=market,
                    old_state=old_state,
                    new_state=new_state,
                    timestamp=now,
                    trading_day=self._sessions[market]._to_market_time(now).date(),
                )
                events.append(event)

                # Fire callbacks
                self._fire_session_event(market, old_state, new_state)

        return events

    async def start(self) -> None:
        """Start background session monitoring."""
        if self._running:
            return

        self._running = True
        self._monitoring_task = asyncio.create_task(self._monitoring_loop())

    async def stop(self) -> None:
        """Stop background session monitoring."""
        self._running = False
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
            self._monitoring_task = None

    async def _monitoring_loop(self) -> None:
        """Background loop to check session states."""
        while self._running:
            try:
                events = self._check_and_update_states()
                for event in events:
                    # Could log or handle events here
                    pass
            except Exception:
                pass  # Don't crash the monitoring loop

            await asyncio.sleep(self.check_interval)

    def halt_trading(self, market: str, reason: str = "manual") -> None:
        """
        Halt trading for a market.

        Args:
            market: Market to halt
            reason: Reason for halt
        """
        old_state = self.get_session_state(market)
        with self._lock:
            self._halted_markets.add(market)
            self._current_states[market] = SessionState.HALTED
            self._state_since[market] = datetime.now(pytz.UTC)

        self._fire_session_event(market, old_state, SessionState.HALTED)

    def resume_trading(self, market: str) -> None:
        """
        Resume trading for a halted market.

        Args:
            market: Market to resume
        """
        if market in self._halted_markets:
            with self._lock:
                self._halted_markets.remove(market)

            # Recalculate actual state
            now = datetime.now(pytz.UTC)
            new_state = self._calculate_session_state(market, now)
            old_state = self._current_states.get(market, SessionState.HALTED)

            with self._lock:
                self._current_states[market] = new_state
                self._state_since[market] = now

            self._fire_session_event(market, old_state, new_state)

    def get_all_sessions(self) -> Dict[str, SessionInfo]:
        """Get session info for all markets."""
        return {market: self.get_session_info(market) for market in MARKET_CONFIGS}

    def get_trading_schedule(
        self,
        market: str,
        days: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Get trading schedule for upcoming days.

        Args:
            market: Market code
            days: Number of days to include

        Returns:
            List of daily schedule info
        """
        session = self._sessions.get(market)
        if not session:
            return []

        schedule = []
        current_date = datetime.now(pytz.UTC).date()

        for i in range(days):
            check_date = current_date + timedelta(days=i)
            check_dt = session.timezone.localize(
                datetime.combine(check_date, time(12, 0))
            )

            is_trading = session.is_trading_day(check_dt)
            early_close = self._early_closes.get(market, {}).get(check_date)

            hours = session.config.trading_hours
            open_time, close_time = None, None

            if is_trading:
                open_time = session.timezone.localize(
                    datetime.combine(check_date, hours.open_time)
                ).astimezone(pytz.UTC).isoformat()
                close_time = session.timezone.localize(
                    datetime.combine(check_date, early_close or hours.close_time)
                ).astimezone(pytz.UTC).isoformat()

            schedule.append({
                "date": check_date.isoformat(),
                "day_of_week": check_date.strftime("%A"),
                "is_trading_day": is_trading,
                "is_holiday": check_date in session._holidays,
                "is_early_close": early_close is not None,
                "open_time": open_time,
                "close_time": close_time,
            })

        return schedule


# Global session manager instance
_session_manager: Optional[TradingSessionManager] = None


def get_session_manager() -> TradingSessionManager:
    """Get the global session manager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = TradingSessionManager()
    return _session_manager


def set_session_manager(manager: TradingSessionManager) -> None:
    """Set the global session manager instance."""
    global _session_manager
    _session_manager = manager
