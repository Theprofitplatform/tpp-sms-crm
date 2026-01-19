"""
Tests for Session Filter

Tests the signal filtering based on market session times to ensure
signals are only generated during appropriate trading hours.

Run with:
    pytest services/signal/tests/test_session_filter.py -v
"""

import pytest
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from unittest.mock import patch, MagicMock

import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'data'))

from filters.session_filter import SessionFilter, SessionFilterConfig
from time.sessions import SessionType, MarketSession


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def default_filter():
    """Session filter with default config (no extended hours)."""
    config = SessionFilterConfig(
        allow_extended_hours=False,
        allow_closed_market=False,
    )
    return SessionFilter(config=config)


@pytest.fixture
def extended_hours_filter():
    """Session filter that allows extended hours."""
    config = SessionFilterConfig(
        allow_extended_hours=True,
        allow_closed_market=False,
    )
    return SessionFilter(config=config)


@pytest.fixture
def allow_all_filter():
    """Session filter that allows all times (testing only)."""
    config = SessionFilterConfig(
        allow_extended_hours=True,
        allow_closed_market=True,
    )
    return SessionFilter(config=config)


@pytest.fixture
def us_regular_hours():
    """Time during US regular trading hours (10:00 AM ET on Tuesday)."""
    return datetime(2026, 1, 20, 15, 0, 0, tzinfo=ZoneInfo("UTC"))


@pytest.fixture
def us_pre_market():
    """Time during US pre-market (6:00 AM ET on Tuesday)."""
    return datetime(2026, 1, 20, 11, 0, 0, tzinfo=ZoneInfo("UTC"))


@pytest.fixture
def us_post_market():
    """Time during US after-hours (6:00 PM ET on Tuesday)."""
    return datetime(2026, 1, 20, 23, 0, 0, tzinfo=ZoneInfo("UTC"))


@pytest.fixture
def us_closed():
    """Time when US market is closed (10:00 PM ET on Tuesday)."""
    return datetime(2026, 1, 21, 3, 0, 0, tzinfo=ZoneInfo("UTC"))


@pytest.fixture
def us_weekend():
    """Time on a Saturday."""
    return datetime(2026, 1, 24, 15, 0, 0, tzinfo=ZoneInfo("UTC"))


# =============================================================================
# Basic Filtering Tests
# =============================================================================

class TestBasicFiltering:
    """Tests for basic signal filtering logic."""

    def test_allow_signal_during_regular_hours(self, default_filter, us_regular_hours):
        """Should allow signals during regular trading hours."""
        result = default_filter.should_generate_signal("US", us_regular_hours)
        assert result is True

    def test_block_signal_during_pre_market(self, default_filter, us_pre_market):
        """Should block signals during pre-market by default."""
        result = default_filter.should_generate_signal("US", us_pre_market)
        assert result is False

    def test_block_signal_during_post_market(self, default_filter, us_post_market):
        """Should block signals during after-hours by default."""
        result = default_filter.should_generate_signal("US", us_post_market)
        assert result is False

    def test_block_signal_when_closed(self, default_filter, us_closed):
        """Should block signals when market is closed."""
        result = default_filter.should_generate_signal("US", us_closed)
        assert result is False

    def test_block_signal_on_weekend(self, default_filter, us_weekend):
        """Should block signals on weekends."""
        result = default_filter.should_generate_signal("US", us_weekend)
        assert result is False

    def test_crypto_always_allowed(self, default_filter, us_weekend):
        """Should always allow signals for crypto (24/7 market)."""
        result = default_filter.should_generate_signal("CRYPTO", us_weekend)
        assert result is True


# =============================================================================
# Extended Hours Tests
# =============================================================================

class TestExtendedHours:
    """Tests for extended hours signal filtering."""

    def test_allow_pre_market_when_configured(self, extended_hours_filter, us_pre_market):
        """Should allow pre-market signals when extended hours enabled."""
        result = extended_hours_filter.should_generate_signal("US", us_pre_market)
        assert result is True

    def test_allow_post_market_when_configured(self, extended_hours_filter, us_post_market):
        """Should allow after-hours signals when extended hours enabled."""
        result = extended_hours_filter.should_generate_signal("US", us_post_market)
        assert result is True

    def test_still_block_closed_with_extended_hours(self, extended_hours_filter, us_closed):
        """Extended hours should not allow signals when market is fully closed."""
        result = extended_hours_filter.should_generate_signal("US", us_closed)
        assert result is False

    def test_still_block_weekend_with_extended_hours(self, extended_hours_filter, us_weekend):
        """Extended hours should not allow signals on weekends."""
        result = extended_hours_filter.should_generate_signal("US", us_weekend)
        assert result is False


# =============================================================================
# Allow All (Closed Market) Tests
# =============================================================================

class TestAllowClosedMarket:
    """Tests for allowing signals when market is closed (testing/backtesting)."""

    def test_allow_closed_market_when_configured(self, allow_all_filter, us_closed):
        """Should allow signals when closed market is enabled."""
        result = allow_all_filter.should_generate_signal("US", us_closed)
        assert result is True

    def test_allow_weekend_when_configured(self, allow_all_filter, us_weekend):
        """Should allow weekend signals when closed market is enabled."""
        result = allow_all_filter.should_generate_signal("US", us_weekend)
        assert result is True


# =============================================================================
# Per-Market Configuration Tests
# =============================================================================

class TestPerMarketConfig:
    """Tests for per-market configuration overrides."""

    def test_configure_market_extended_hours(self, default_filter, us_pre_market):
        """Should allow per-market extended hours configuration."""
        # Initially blocked
        assert default_filter.should_generate_signal("US", us_pre_market) is False

        # Configure US market to allow extended hours
        default_filter.configure_market("US", allow_extended_hours=True)

        # Now allowed
        assert default_filter.should_generate_signal("US", us_pre_market) is True

    def test_per_market_config_independent(self, default_filter, us_pre_market):
        """Per-market config should only affect that market."""
        # Configure ASX to allow extended hours
        default_filter.configure_market("ASX", allow_extended_hours=True)

        # US should still be blocked
        assert default_filter.should_generate_signal("US", us_pre_market) is False

    def test_multiple_market_configs(self, default_filter, us_pre_market):
        """Should support multiple market configurations."""
        default_filter.configure_market("US", allow_extended_hours=True)
        default_filter.configure_market("ASX", allow_extended_hours=False)
        default_filter.configure_market("LSE", allow_extended_hours=True)

        # US should be allowed during pre-market
        assert default_filter.should_generate_signal("US", us_pre_market) is True


# =============================================================================
# Session Info Tests
# =============================================================================

class TestSessionInfo:
    """Tests for session information retrieval."""

    def test_get_session_info_regular(self, default_filter, us_regular_hours):
        """Should return correct session info during regular hours."""
        info = default_filter.get_session_info("US", us_regular_hours)

        assert info["session_type"] == SessionType.REGULAR
        assert info["is_trading_day"] is True
        assert info["market_timezone"] == "America/New_York"
        assert info["market_open"] is not None
        assert info["market_close"] is not None

    def test_get_session_info_closed(self, default_filter, us_closed):
        """Should return correct session info when closed."""
        info = default_filter.get_session_info("US", us_closed)

        assert info["session_type"] == SessionType.CLOSED
        assert info["is_trading_day"] is True  # Still a weekday

    def test_get_session_info_weekend(self, default_filter, us_weekend):
        """Should return correct session info on weekend."""
        info = default_filter.get_session_info("US", us_weekend)

        assert info["session_type"] == SessionType.CLOSED
        assert info["is_trading_day"] is False
        assert info["next_session_start"] is not None


# =============================================================================
# Rejection Reason Tests
# =============================================================================

class TestRejectionReasons:
    """Tests for rejection reason messages."""

    def test_no_rejection_during_regular_hours(self, default_filter, us_regular_hours):
        """Should return None when signal is allowed."""
        reason = default_filter.get_rejection_reason("US", us_regular_hours)
        assert reason is None

    def test_rejection_reason_pre_market(self, default_filter, us_pre_market):
        """Should return meaningful reason for pre-market rejection."""
        reason = default_filter.get_rejection_reason("US", us_pre_market)

        assert reason is not None
        assert "pre" in reason.lower() or "extended" in reason.lower()

    def test_rejection_reason_post_market(self, default_filter, us_post_market):
        """Should return meaningful reason for after-hours rejection."""
        reason = default_filter.get_rejection_reason("US", us_post_market)

        assert reason is not None
        assert "post" in reason.lower() or "extended" in reason.lower()

    def test_rejection_reason_closed(self, default_filter, us_closed):
        """Should return meaningful reason when market closed."""
        reason = default_filter.get_rejection_reason("US", us_closed)

        assert reason is not None
        assert "closed" in reason.lower()

    def test_rejection_reason_weekend(self, default_filter, us_weekend):
        """Should return meaningful reason on weekend."""
        reason = default_filter.get_rejection_reason("US", us_weekend)

        assert reason is not None
        assert "trading day" in reason.lower() or "closed" in reason.lower()


# =============================================================================
# Config From Environment Tests
# =============================================================================

class TestConfigFromEnvironment:
    """Tests for configuration from environment variables."""

    def test_config_from_env_defaults(self):
        """Default config from env should disable extended hours."""
        with patch.dict(os.environ, {}, clear=True):
            config = SessionFilterConfig.from_env()

            assert config.allow_extended_hours is False
            assert config.allow_closed_market is False

    def test_config_from_env_extended_hours(self):
        """Should read extended hours from environment."""
        with patch.dict(os.environ, {"ALLOW_EXTENDED_HOURS": "true"}):
            config = SessionFilterConfig.from_env()

            assert config.allow_extended_hours is True

    def test_config_from_env_closed_market(self):
        """Should read closed market config from environment."""
        with patch.dict(os.environ, {"ALLOW_CLOSED_MARKET": "true"}):
            config = SessionFilterConfig.from_env()

            assert config.allow_closed_market is True


# =============================================================================
# Convenience Parameter Tests
# =============================================================================

class TestConvenienceParameters:
    """Tests for convenience constructor parameters."""

    def test_allow_extended_hours_convenience_param(self, us_pre_market):
        """Should accept allow_extended_hours as constructor param."""
        filter_with_extended = SessionFilter(allow_extended_hours=True)

        assert filter_with_extended.should_generate_signal("US", us_pre_market) is True

    def test_convenience_param_overrides_config(self, us_pre_market):
        """Convenience param should override config."""
        config = SessionFilterConfig(allow_extended_hours=False)
        filter_with_override = SessionFilter(config=config, allow_extended_hours=True)

        assert filter_with_override.should_generate_signal("US", us_pre_market) is True


# =============================================================================
# None Timestamp Tests
# =============================================================================

class TestNoneTimestamp:
    """Tests for handling None timestamps (use current time)."""

    def test_should_generate_signal_none_timestamp(self, default_filter):
        """Should use current time when timestamp is None."""
        # Should not raise - will use current UTC time
        result = default_filter.should_generate_signal("US", None)
        assert isinstance(result, bool)

    def test_get_session_info_none_timestamp(self, default_filter):
        """Should use current time when timestamp is None."""
        info = default_filter.get_session_info("US", None)

        assert info is not None
        assert "session_type" in info
        assert "is_trading_day" in info

    def test_get_rejection_reason_none_timestamp(self, default_filter):
        """Should use current time when timestamp is None."""
        # Should not raise
        reason = default_filter.get_rejection_reason("US", None)
        # Result depends on current time
        assert reason is None or isinstance(reason, str)


# =============================================================================
# Multiple Market Tests
# =============================================================================

class TestMultipleMarkets:
    """Tests for handling multiple markets."""

    def test_different_markets_same_time(self, default_filter, us_regular_hours):
        """Different markets should have independent session checks."""
        us_result = default_filter.should_generate_signal("US", us_regular_hours)
        asx_result = default_filter.should_generate_signal("ASX", us_regular_hours)
        crypto_result = default_filter.should_generate_signal("CRYPTO", us_regular_hours)

        # US is open at 10:00 AM ET
        assert us_result is True

        # Crypto always open
        assert crypto_result is True

        # ASX at 10:00 AM ET (2:00 AM AEDT next day) - closed
        assert asx_result is False

    def test_case_insensitive_market(self, default_filter, us_regular_hours):
        """Market names should be case-insensitive."""
        us_lower = default_filter.should_generate_signal("us", us_regular_hours)
        us_upper = default_filter.should_generate_signal("US", us_regular_hours)
        us_mixed = default_filter.should_generate_signal("Us", us_regular_hours)

        assert us_lower == us_upper == us_mixed


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases."""

    def test_exactly_at_market_open(self, default_filter):
        """Signal should be allowed exactly at market open."""
        # 9:30 AM ET on a Tuesday = 14:30 UTC
        market_open = datetime(2026, 1, 20, 14, 30, 0, tzinfo=ZoneInfo("UTC"))

        result = default_filter.should_generate_signal("US", market_open)
        assert result is True

    def test_one_second_before_open(self, default_filter):
        """Signal should be blocked one second before open."""
        # 9:29:59 AM ET on a Tuesday
        before_open = datetime(2026, 1, 20, 14, 29, 59, tzinfo=ZoneInfo("UTC"))

        result = default_filter.should_generate_signal("US", before_open)
        assert result is False  # Still pre-market

    def test_unknown_market_handling(self, default_filter, us_regular_hours):
        """Should handle unknown market gracefully."""
        try:
            result = default_filter.should_generate_signal("UNKNOWN", us_regular_hours)
            # If it doesn't raise, result should be a boolean
            assert isinstance(result, bool)
        except (ValueError, KeyError):
            # Raising is also acceptable
            pass

    def test_filter_preserves_state(self, default_filter, us_pre_market):
        """Filter state should persist across calls."""
        # Configure and verify
        default_filter.configure_market("US", allow_extended_hours=True)
        assert default_filter.should_generate_signal("US", us_pre_market) is True

        # Call again - should still be configured
        assert default_filter.should_generate_signal("US", us_pre_market) is True
