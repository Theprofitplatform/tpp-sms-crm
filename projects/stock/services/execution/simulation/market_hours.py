"""
Market Hours and Holiday Calendar for Backtest Realism

Provides market session information for realistic backtesting:
- Market open/close times by exchange
- Holiday calendars for US, ASX, and Crypto markets
- Pre-market and after-hours session handling
- Timezone-aware datetime handling

Usage:
    from simulation.market_hours import MarketSession, is_market_open, get_next_open

    session = MarketSession("US")
    if session.is_open(datetime.now()):
        print("Market is open!")

    # Check specific timestamp
    if is_market_open("ASX", some_datetime):
        print("ASX is trading")

Dependencies:
    - pytz (timezone handling)
    - datetime
"""

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, date
from typing import Optional, Dict, List, Tuple, Set
from enum import Enum
import pytz


class MarketType(str, Enum):
    """Type of market for session rules."""
    EQUITY = "EQUITY"           # Standard equity market
    FUTURES = "FUTURES"         # Futures (extended hours)
    CRYPTO = "CRYPTO"           # 24/7 markets
    FOREX = "FOREX"             # 24/5 markets


@dataclass
class TradingHours:
    """Trading hours configuration for a market."""
    open_time: time
    close_time: time
    pre_market_open: Optional[time] = None
    after_hours_close: Optional[time] = None
    lunch_break_start: Optional[time] = None
    lunch_break_end: Optional[time] = None


@dataclass
class MarketConfig:
    """Configuration for a specific market/exchange."""
    name: str
    timezone: str
    market_type: MarketType
    trading_hours: TradingHours
    trading_days: List[int] = field(default_factory=lambda: [0, 1, 2, 3, 4])  # Mon-Fri
    currency: str = "USD"


# =============================================================================
# Market Configurations
# =============================================================================

MARKET_CONFIGS: Dict[str, MarketConfig] = {
    # US Markets (NYSE/NASDAQ)
    "US": MarketConfig(
        name="US Equities (NYSE/NASDAQ)",
        timezone="America/New_York",
        market_type=MarketType.EQUITY,
        trading_hours=TradingHours(
            open_time=time(9, 30),
            close_time=time(16, 0),
            pre_market_open=time(4, 0),
            after_hours_close=time(20, 0),
        ),
        trading_days=[0, 1, 2, 3, 4],  # Mon-Fri
        currency="USD",
    ),

    # Australian Stock Exchange
    "ASX": MarketConfig(
        name="Australian Securities Exchange",
        timezone="Australia/Sydney",
        market_type=MarketType.EQUITY,
        trading_hours=TradingHours(
            open_time=time(10, 0),
            close_time=time(16, 0),
            pre_market_open=time(7, 0),
            after_hours_close=time(16, 10),
        ),
        trading_days=[0, 1, 2, 3, 4],  # Mon-Fri
        currency="AUD",
    ),

    # London Stock Exchange
    "LSE": MarketConfig(
        name="London Stock Exchange",
        timezone="Europe/London",
        market_type=MarketType.EQUITY,
        trading_hours=TradingHours(
            open_time=time(8, 0),
            close_time=time(16, 30),
            pre_market_open=time(5, 5),
            after_hours_close=time(17, 15),
        ),
        trading_days=[0, 1, 2, 3, 4],
        currency="GBP",
    ),

    # Tokyo Stock Exchange
    "TSE": MarketConfig(
        name="Tokyo Stock Exchange",
        timezone="Asia/Tokyo",
        market_type=MarketType.EQUITY,
        trading_hours=TradingHours(
            open_time=time(9, 0),
            close_time=time(15, 0),
            lunch_break_start=time(11, 30),
            lunch_break_end=time(12, 30),
        ),
        trading_days=[0, 1, 2, 3, 4],
        currency="JPY",
    ),

    # Cryptocurrency (24/7)
    "CRYPTO": MarketConfig(
        name="Cryptocurrency",
        timezone="UTC",
        market_type=MarketType.CRYPTO,
        trading_hours=TradingHours(
            open_time=time(0, 0),
            close_time=time(23, 59, 59),
        ),
        trading_days=[0, 1, 2, 3, 4, 5, 6],  # Every day
        currency="USD",
    ),

    # Forex (24/5 - Sunday 5pm EST to Friday 5pm EST)
    "FOREX": MarketConfig(
        name="Foreign Exchange",
        timezone="America/New_York",
        market_type=MarketType.FOREX,
        trading_hours=TradingHours(
            open_time=time(17, 0),  # Sunday 5pm
            close_time=time(17, 0),  # Friday 5pm
        ),
        trading_days=[0, 1, 2, 3, 4],  # Mon-Fri (special handling for Sun open)
        currency="USD",
    ),

    # US Futures (CME/CBOT) - Nearly 24 hours
    "US_FUTURES": MarketConfig(
        name="US Futures (CME/CBOT)",
        timezone="America/Chicago",
        market_type=MarketType.FUTURES,
        trading_hours=TradingHours(
            open_time=time(17, 0),   # Sunday 5pm CT
            close_time=time(16, 0),  # Friday 4pm CT
            # Daily maintenance break 4pm-5pm CT Mon-Thu
        ),
        trading_days=[0, 1, 2, 3, 4],
        currency="USD",
    ),
}


# =============================================================================
# Holiday Calendars
# =============================================================================

def get_us_holidays(year: int) -> Set[date]:
    """
    Get US stock market holidays for a given year.

    Includes: New Year's Day, MLK Day, Presidents' Day, Good Friday,
    Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas
    """
    holidays = set()

    # Fixed holidays
    holidays.add(date(year, 1, 1))    # New Year's Day
    holidays.add(date(year, 7, 4))    # Independence Day
    holidays.add(date(year, 12, 25))  # Christmas

    # MLK Day - Third Monday in January
    jan_first = date(year, 1, 1)
    mlk_day = jan_first + timedelta(days=((0 - jan_first.weekday()) % 7) + 14)
    holidays.add(mlk_day)

    # Presidents' Day - Third Monday in February
    feb_first = date(year, 2, 1)
    pres_day = feb_first + timedelta(days=((0 - feb_first.weekday()) % 7) + 14)
    holidays.add(pres_day)

    # Memorial Day - Last Monday in May
    may_last = date(year, 5, 31)
    memorial_day = may_last - timedelta(days=((may_last.weekday() - 0) % 7))
    holidays.add(memorial_day)

    # Labor Day - First Monday in September
    sep_first = date(year, 9, 1)
    labor_day = sep_first + timedelta(days=((0 - sep_first.weekday()) % 7))
    holidays.add(labor_day)

    # Thanksgiving - Fourth Thursday in November
    nov_first = date(year, 11, 1)
    thanksgiving = nov_first + timedelta(days=((3 - nov_first.weekday()) % 7) + 21)
    holidays.add(thanksgiving)

    # Good Friday - Calculated from Easter
    easter = _calculate_easter(year)
    good_friday = easter - timedelta(days=2)
    holidays.add(good_friday)

    # Handle weekend holidays (observed on nearest weekday)
    adjusted_holidays = set()
    for h in holidays:
        if h.weekday() == 5:  # Saturday
            adjusted_holidays.add(h - timedelta(days=1))  # Observe on Friday
        elif h.weekday() == 6:  # Sunday
            adjusted_holidays.add(h + timedelta(days=1))  # Observe on Monday
        else:
            adjusted_holidays.add(h)

    return adjusted_holidays


def get_asx_holidays(year: int) -> Set[date]:
    """
    Get Australian Stock Exchange holidays for a given year.

    Includes: New Year's Day, Australia Day, Good Friday, Easter Monday,
    ANZAC Day, Queen's Birthday, Christmas, Boxing Day
    """
    holidays = set()

    # Fixed holidays
    holidays.add(date(year, 1, 1))    # New Year's Day
    holidays.add(date(year, 1, 26))   # Australia Day
    holidays.add(date(year, 4, 25))   # ANZAC Day
    holidays.add(date(year, 12, 25))  # Christmas
    holidays.add(date(year, 12, 26))  # Boxing Day

    # Easter (Good Friday and Easter Monday)
    easter = _calculate_easter(year)
    good_friday = easter - timedelta(days=2)
    easter_monday = easter + timedelta(days=1)
    holidays.add(good_friday)
    holidays.add(easter_monday)

    # Queen's Birthday - Second Monday in June (for most states)
    june_first = date(year, 6, 1)
    queens_bday = june_first + timedelta(days=((0 - june_first.weekday()) % 7) + 7)
    holidays.add(queens_bday)

    # Handle weekend holidays
    adjusted_holidays = set()
    for h in holidays:
        if h.weekday() == 5:  # Saturday
            adjusted_holidays.add(h + timedelta(days=2))  # Observe on Monday
        elif h.weekday() == 6:  # Sunday
            adjusted_holidays.add(h + timedelta(days=1))  # Observe on Monday
        else:
            adjusted_holidays.add(h)

    return adjusted_holidays


def get_crypto_holidays(year: int) -> Set[date]:
    """
    Get cryptocurrency market holidays (none - 24/7/365).
    """
    return set()


def _calculate_easter(year: int) -> date:
    """
    Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm.
    """
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


# Holiday calendar registry
HOLIDAY_CALENDARS: Dict[str, callable] = {
    "US": get_us_holidays,
    "ASX": get_asx_holidays,
    "LSE": get_us_holidays,  # Similar to US
    "TSE": get_us_holidays,  # Placeholder - implement properly if needed
    "CRYPTO": get_crypto_holidays,
    "FOREX": get_us_holidays,  # Major bank holidays
    "US_FUTURES": get_us_holidays,
}


# =============================================================================
# MarketSession Class
# =============================================================================

class MarketSession:
    """
    Market session manager for a specific exchange.

    Handles:
    - Market open/close status
    - Holiday calendar checking
    - Pre-market and after-hours sessions
    - Timezone conversions

    Example:
        session = MarketSession("US")

        # Check if market is currently open
        if session.is_open():
            print("NYSE is trading!")

        # Get next market open time
        next_open = session.get_next_open()
        print(f"Market opens at {next_open}")
    """

    def __init__(self, market: str, include_extended_hours: bool = False):
        """
        Initialize market session.

        Args:
            market: Market code (US, ASX, CRYPTO, etc.)
            include_extended_hours: Include pre-market and after-hours
        """
        if market.upper() not in MARKET_CONFIGS:
            raise ValueError(f"Unknown market: {market}")

        self.market = market.upper()
        self.config = MARKET_CONFIGS[self.market]
        self.include_extended_hours = include_extended_hours
        self.timezone = pytz.timezone(self.config.timezone)

        # Cache holidays for current and next year
        current_year = datetime.now().year
        self._holidays: Set[date] = set()
        holiday_func = HOLIDAY_CALENDARS.get(self.market, lambda y: set())
        self._holidays.update(holiday_func(current_year))
        self._holidays.update(holiday_func(current_year + 1))

    def _to_market_time(self, dt: Optional[datetime] = None) -> datetime:
        """Convert datetime to market timezone."""
        if dt is None:
            dt = datetime.now(pytz.UTC)
        elif dt.tzinfo is None:
            dt = pytz.UTC.localize(dt)
        return dt.astimezone(self.timezone)

    def is_trading_day(self, dt: Optional[datetime] = None) -> bool:
        """
        Check if a given date is a trading day.

        Args:
            dt: Datetime to check (default: now)

        Returns:
            True if the date is a trading day
        """
        market_dt = self._to_market_time(dt)

        # Check if it's a trading day of the week
        if market_dt.weekday() not in self.config.trading_days:
            return False

        # Check if it's a holiday
        if market_dt.date() in self._holidays:
            return False

        return True

    def is_open(self, dt: Optional[datetime] = None) -> bool:
        """
        Check if market is currently open.

        Args:
            dt: Datetime to check (default: now)

        Returns:
            True if market is open for regular trading
        """
        # Crypto is always open
        if self.config.market_type == MarketType.CRYPTO:
            return True

        market_dt = self._to_market_time(dt)

        # Check trading day
        if not self.is_trading_day(market_dt):
            return False

        current_time = market_dt.time()
        hours = self.config.trading_hours

        # Determine session times
        if self.include_extended_hours:
            open_time = hours.pre_market_open or hours.open_time
            close_time = hours.after_hours_close or hours.close_time
        else:
            open_time = hours.open_time
            close_time = hours.close_time

        # Check if within trading hours
        if not (open_time <= current_time <= close_time):
            return False

        # Check lunch break (for markets like TSE)
        if hours.lunch_break_start and hours.lunch_break_end:
            if hours.lunch_break_start <= current_time <= hours.lunch_break_end:
                return False

        return True

    def is_pre_market(self, dt: Optional[datetime] = None) -> bool:
        """Check if in pre-market session."""
        if self.config.market_type == MarketType.CRYPTO:
            return False

        market_dt = self._to_market_time(dt)

        if not self.is_trading_day(market_dt):
            return False

        hours = self.config.trading_hours
        if not hours.pre_market_open:
            return False

        current_time = market_dt.time()
        return hours.pre_market_open <= current_time < hours.open_time

    def is_after_hours(self, dt: Optional[datetime] = None) -> bool:
        """Check if in after-hours session."""
        if self.config.market_type == MarketType.CRYPTO:
            return False

        market_dt = self._to_market_time(dt)

        if not self.is_trading_day(market_dt):
            return False

        hours = self.config.trading_hours
        if not hours.after_hours_close:
            return False

        current_time = market_dt.time()
        return hours.close_time < current_time <= hours.after_hours_close

    def get_session_times(self, dt: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """
        Get market open and close times for a given date.

        Args:
            dt: Date to get session times for (default: today)

        Returns:
            Tuple of (open_datetime, close_datetime) in UTC
        """
        market_dt = self._to_market_time(dt)
        market_date = market_dt.date()

        hours = self.config.trading_hours

        if self.include_extended_hours:
            open_time = hours.pre_market_open or hours.open_time
            close_time = hours.after_hours_close or hours.close_time
        else:
            open_time = hours.open_time
            close_time = hours.close_time

        open_dt = self.timezone.localize(datetime.combine(market_date, open_time))
        close_dt = self.timezone.localize(datetime.combine(market_date, close_time))

        return open_dt.astimezone(pytz.UTC), close_dt.astimezone(pytz.UTC)

    def get_next_open(self, dt: Optional[datetime] = None) -> datetime:
        """
        Get the next market open time.

        Args:
            dt: Starting datetime (default: now)

        Returns:
            Next market open time in UTC
        """
        # Crypto is always open
        if self.config.market_type == MarketType.CRYPTO:
            return datetime.now(pytz.UTC)

        market_dt = self._to_market_time(dt)
        hours = self.config.trading_hours
        open_time = hours.pre_market_open if self.include_extended_hours else hours.open_time

        # If market is currently open, return current time
        if self.is_open(market_dt):
            return market_dt.astimezone(pytz.UTC)

        current_date = market_dt.date()
        current_time = market_dt.time()

        # Check if market opens later today
        if self.is_trading_day(market_dt) and current_time < open_time:
            next_open = self.timezone.localize(datetime.combine(current_date, open_time))
            return next_open.astimezone(pytz.UTC)

        # Find next trading day
        check_date = current_date + timedelta(days=1)
        for _ in range(10):  # Max 10 days ahead
            check_dt = self.timezone.localize(datetime.combine(check_date, time(12, 0)))
            if self.is_trading_day(check_dt):
                next_open = self.timezone.localize(datetime.combine(check_date, open_time))
                return next_open.astimezone(pytz.UTC)
            check_date += timedelta(days=1)

        # Fallback: next weekday
        next_open = self.timezone.localize(datetime.combine(check_date, open_time))
        return next_open.astimezone(pytz.UTC)

    def get_next_close(self, dt: Optional[datetime] = None) -> datetime:
        """
        Get the next market close time.

        Args:
            dt: Starting datetime (default: now)

        Returns:
            Next market close time in UTC
        """
        if self.config.market_type == MarketType.CRYPTO:
            # For crypto, return far future
            return datetime.now(pytz.UTC) + timedelta(days=365 * 100)

        market_dt = self._to_market_time(dt)
        hours = self.config.trading_hours
        close_time = hours.after_hours_close if self.include_extended_hours else hours.close_time

        current_date = market_dt.date()

        # If market is open, close is today
        if self.is_open(market_dt):
            next_close = self.timezone.localize(datetime.combine(current_date, close_time))
            return next_close.astimezone(pytz.UTC)

        # Otherwise, find next trading day's close
        next_open = self.get_next_open(market_dt)
        next_open_local = next_open.astimezone(self.timezone)
        next_close = self.timezone.localize(
            datetime.combine(next_open_local.date(), close_time)
        )
        return next_close.astimezone(pytz.UTC)

    def time_until_open(self, dt: Optional[datetime] = None) -> timedelta:
        """Get time until market opens (returns 0 if open)."""
        if self.is_open(dt):
            return timedelta(0)
        next_open = self.get_next_open(dt)
        now = dt or datetime.now(pytz.UTC)
        if now.tzinfo is None:
            now = pytz.UTC.localize(now)
        return next_open - now

    def time_until_close(self, dt: Optional[datetime] = None) -> timedelta:
        """Get time until market closes."""
        next_close = self.get_next_close(dt)
        now = dt or datetime.now(pytz.UTC)
        if now.tzinfo is None:
            now = pytz.UTC.localize(now)
        return next_close - now

    def get_trading_days_in_range(
        self,
        start_date: date,
        end_date: date
    ) -> List[date]:
        """Get list of trading days in a date range."""
        trading_days = []
        current = start_date

        while current <= end_date:
            check_dt = self.timezone.localize(datetime.combine(current, time(12, 0)))
            if self.is_trading_day(check_dt):
                trading_days.append(current)
            current += timedelta(days=1)

        return trading_days


# =============================================================================
# Convenience Functions
# =============================================================================

def is_market_open(market: str, dt: Optional[datetime] = None) -> bool:
    """
    Check if a market is currently open.

    Args:
        market: Market code (US, ASX, CRYPTO, etc.)
        dt: Datetime to check (default: now)

    Returns:
        True if market is open
    """
    session = MarketSession(market)
    return session.is_open(dt)


def get_next_open(market: str, dt: Optional[datetime] = None) -> datetime:
    """
    Get the next market open time.

    Args:
        market: Market code
        dt: Starting datetime (default: now)

    Returns:
        Next market open time in UTC
    """
    session = MarketSession(market)
    return session.get_next_open(dt)


def get_market_session(market: str) -> MarketSession:
    """
    Get a MarketSession instance for a market.

    Args:
        market: Market code

    Returns:
        MarketSession instance
    """
    return MarketSession(market)


def filter_to_market_hours(
    timestamps: List[datetime],
    market: str,
    include_extended_hours: bool = False
) -> List[datetime]:
    """
    Filter a list of timestamps to only those during market hours.

    Args:
        timestamps: List of datetimes to filter
        market: Market code
        include_extended_hours: Include pre-market and after-hours

    Returns:
        Filtered list of timestamps during market hours
    """
    session = MarketSession(market, include_extended_hours=include_extended_hours)
    return [ts for ts in timestamps if session.is_open(ts)]
