"""
Signal Filters Module

Provides filters for signal generation including session-based filtering
to prevent signals outside of regular trading hours.

Usage:
    from filters import SessionFilter

    filter = SessionFilter(allow_extended_hours=False)
    if filter.should_generate_signal("US", timestamp):
        # Generate signal
"""

from .session_filter import (
    SessionFilter,
    SessionFilterConfig,
)

__all__ = [
    "SessionFilter",
    "SessionFilterConfig",
]
