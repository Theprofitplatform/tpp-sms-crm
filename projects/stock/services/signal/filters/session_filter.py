"""
Session Filter for Signal Generation

Filters signals based on market session times to prevent generating
signals outside of regular trading hours.

Usage:
    from filters.session_filter import SessionFilter

    filter = SessionFilter(allow_extended_hours=False)

    # Check if signal should be generated
    if filter.should_generate_signal("US", timestamp):
        # Generate signal
    else:
        # Skip signal generation

    # Get session info for signal
    session_info = filter.get_session_info("US", timestamp)
"""

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any

import structlog

# Add parent paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'data'))

from time.timezone import now_utc
from time.sessions import (
    get_current_session,
    is_regular_session,
    SessionType,
    MarketSession,
)
from time.market_hours import is_market_open, get_market_config

logger = structlog.get_logger(__name__)


@dataclass
class SessionFilterConfig:
    """
    Configuration for session filtering.

    Attributes:
        allow_extended_hours: Allow signals during pre/post market sessions
        allow_closed_market: Allow signals when market is closed (use with caution)
        markets_config: Per-market override configuration
    """
    allow_extended_hours: bool = False
    allow_closed_market: bool = False
    markets_config: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    @classmethod
    def from_env(cls) -> "SessionFilterConfig":
        """Create config from environment variables."""
        return cls(
            allow_extended_hours=os.getenv("ALLOW_EXTENDED_HOURS", "false").lower() == "true",
            allow_closed_market=os.getenv("ALLOW_CLOSED_MARKET", "false").lower() == "true",
        )


class SessionFilter:
    """
    Filter signals based on market session times.

    Prevents signal generation outside of regular trading hours
    unless explicitly configured to allow extended hours.
    """

    def __init__(
        self,
        config: Optional[SessionFilterConfig] = None,
        allow_extended_hours: Optional[bool] = None,
    ):
        """
        Initialize session filter.

        Args:
            config: SessionFilterConfig object
            allow_extended_hours: Override for extended hours (convenience param)
        """
        if config is None:
            config = SessionFilterConfig.from_env()

        self.config = config

        # Allow convenience override
        if allow_extended_hours is not None:
            self.config.allow_extended_hours = allow_extended_hours

        logger.info(
            "Session filter initialized",
            allow_extended_hours=self.config.allow_extended_hours,
            allow_closed_market=self.config.allow_closed_market,
        )

    def should_generate_signal(
        self,
        market: str,
        timestamp: Optional[datetime] = None,
    ) -> bool:
        """
        Check if a signal should be generated at the given time.

        Args:
            market: Market identifier (US, ASX, CRYPTO, etc.)
            timestamp: Time to check (defaults to now in UTC)

        Returns:
            True if signal should be generated, False otherwise
        """
        if timestamp is None:
            timestamp = now_utc()

        # Get current session
        session = get_current_session(market, timestamp)

        # Crypto/24-7 markets are always open
        market_config = get_market_config(market)
        if market_config.get("is_24_7", False):
            return True

        # Check per-market config override
        market_override = self.config.markets_config.get(market.upper(), {})
        allow_extended = market_override.get(
            "allow_extended_hours",
            self.config.allow_extended_hours,
        )
        allow_closed = market_override.get(
            "allow_closed_market",
            self.config.allow_closed_market,
        )

        # Regular session - always allowed
        if session.session_type == SessionType.REGULAR:
            return True

        # Extended hours - check config
        if session.session_type in [SessionType.PRE, SessionType.POST]:
            if allow_extended:
                logger.debug(
                    "Signal allowed in extended hours",
                    market=market,
                    session=session.session_type,
                )
                return True
            else:
                logger.debug(
                    "Signal blocked - extended hours not allowed",
                    market=market,
                    session=session.session_type,
                )
                return False

        # Market closed
        if session.session_type == SessionType.CLOSED:
            if allow_closed:
                logger.warning(
                    "Signal allowed during closed market (use with caution)",
                    market=market,
                )
                return True
            else:
                logger.debug(
                    "Signal blocked - market closed",
                    market=market,
                    is_trading_day=session.is_trading_day,
                )
                return False

        return False

    def get_session_info(
        self,
        market: str,
        timestamp: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Get session information for a signal.

        Returns info to be included in the signal response.

        Args:
            market: Market identifier
            timestamp: Time to check (defaults to now)

        Returns:
            Dictionary with session information
        """
        if timestamp is None:
            timestamp = now_utc()

        session = get_current_session(market, timestamp)

        return {
            "session_type": session.session_type,
            "market_timezone": session.timezone,
            "market_open": session.open_time.isoformat() if session.open_time else None,
            "market_close": session.close_time.isoformat() if session.close_time else None,
            "is_trading_day": session.is_trading_day,
            "next_session_start": session.next_session_start.isoformat() if session.next_session_start else None,
        }

    def get_rejection_reason(
        self,
        market: str,
        timestamp: Optional[datetime] = None,
    ) -> Optional[str]:
        """
        Get the reason why a signal would be rejected.

        Args:
            market: Market identifier
            timestamp: Time to check

        Returns:
            Rejection reason string, or None if signal would be allowed
        """
        if self.should_generate_signal(market, timestamp):
            return None

        session = get_current_session(market, timestamp)

        if session.session_type == SessionType.CLOSED:
            if not session.is_trading_day:
                return f"Market {market} is closed - not a trading day"
            return f"Market {market} is closed"

        if session.session_type in [SessionType.PRE, SessionType.POST]:
            return f"Signal blocked during {session.session_type} market hours (extended hours not enabled)"

        return f"Signal blocked - market session: {session.session_type}"

    def configure_market(
        self,
        market: str,
        allow_extended_hours: Optional[bool] = None,
        allow_closed_market: Optional[bool] = None,
    ) -> None:
        """
        Configure per-market settings.

        Args:
            market: Market identifier
            allow_extended_hours: Override for this market
            allow_closed_market: Override for this market
        """
        market_upper = market.upper()

        if market_upper not in self.config.markets_config:
            self.config.markets_config[market_upper] = {}

        if allow_extended_hours is not None:
            self.config.markets_config[market_upper]["allow_extended_hours"] = allow_extended_hours

        if allow_closed_market is not None:
            self.config.markets_config[market_upper]["allow_closed_market"] = allow_closed_market

        logger.info(
            "Market filter configured",
            market=market_upper,
            config=self.config.markets_config[market_upper],
        )
