"""
Tests for FX Exposure Analyzer

Tests currency exposure calculation, limit checking, and order impact analysis.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from portfolio.fx_exposure import (
    FXExposureAnalyzer,
    FXExposureConfig,
    FXExposureReport,
    CurrencyExposure,
    ExposureLevel,
    DEFAULT_FX_LIMITS,
)


@pytest.fixture
def fx_config():
    """Create FX exposure config for testing."""
    return FXExposureConfig(
        execution_service_url="http://localhost:5104",
        base_currency="AUD",
    )


@pytest.fixture
def fx_analyzer(fx_config):
    """Create FX exposure analyzer for testing."""
    return FXExposureAnalyzer(fx_config)


class TestFXExposureConfig:
    """Tests for FXExposureConfig."""

    def test_default_config(self):
        """Test default configuration values."""
        config = FXExposureConfig()

        assert config.execution_service_url == "http://localhost:5104"
        assert config.base_currency == "AUD"
        assert config.kill_switch_on_critical is False
        assert config.request_timeout == 10.0
        assert "USD" in config.limits
        assert "DEFAULT" in config.limits

    def test_custom_config(self):
        """Test custom configuration."""
        config = FXExposureConfig(
            execution_service_url="http://custom:5000",
            base_currency="USD",
            kill_switch_on_critical=True,
        )

        assert config.execution_service_url == "http://custom:5000"
        assert config.base_currency == "USD"
        assert config.kill_switch_on_critical is True


class TestExposureLevel:
    """Tests for ExposureLevel enum."""

    def test_all_levels_exist(self):
        """Test all expected exposure levels exist."""
        assert ExposureLevel.NORMAL
        assert ExposureLevel.ELEVATED
        assert ExposureLevel.HIGH
        assert ExposureLevel.CRITICAL


class TestFXExposureAnalyzer:
    """Tests for FXExposureAnalyzer."""

    def test_initialization(self, fx_analyzer):
        """Test analyzer initializes correctly."""
        assert fx_analyzer.config.base_currency == "AUD"
        assert fx_analyzer.config.execution_service_url == "http://localhost:5104"

    def test_get_limits_known_currency(self, fx_analyzer):
        """Test getting limits for known currency."""
        limits = fx_analyzer._get_limits("USD")

        assert "warning" in limits
        assert "high" in limits
        assert "critical" in limits
        assert limits["warning"] == 60.0
        assert limits["high"] == 75.0
        assert limits["critical"] == 90.0

    def test_get_limits_unknown_currency(self, fx_analyzer):
        """Test getting limits for unknown currency uses DEFAULT."""
        limits = fx_analyzer._get_limits("XYZ")

        assert limits == DEFAULT_FX_LIMITS["DEFAULT"]

    def test_determine_level_normal(self, fx_analyzer):
        """Test determining NORMAL exposure level."""
        limits = {"warning": 60.0, "high": 75.0, "critical": 90.0}

        level = fx_analyzer._determine_level(50.0, limits)
        assert level == ExposureLevel.NORMAL

    def test_determine_level_elevated(self, fx_analyzer):
        """Test determining ELEVATED exposure level."""
        limits = {"warning": 60.0, "high": 75.0, "critical": 90.0}

        level = fx_analyzer._determine_level(65.0, limits)
        assert level == ExposureLevel.ELEVATED

    def test_determine_level_high(self, fx_analyzer):
        """Test determining HIGH exposure level."""
        limits = {"warning": 60.0, "high": 75.0, "critical": 90.0}

        level = fx_analyzer._determine_level(80.0, limits)
        assert level == ExposureLevel.HIGH

    def test_determine_level_critical(self, fx_analyzer):
        """Test determining CRITICAL exposure level."""
        limits = {"warning": 60.0, "high": 75.0, "critical": 90.0}

        level = fx_analyzer._determine_level(95.0, limits)
        assert level == ExposureLevel.CRITICAL

    def test_update_limits(self, fx_analyzer):
        """Test updating exposure limits."""
        fx_analyzer.update_limits("EUR", {
            "warning": 35.0,
            "high": 50.0,
            "critical": 65.0,
        })

        limits = fx_analyzer._get_limits("EUR")
        assert limits["warning"] == 35.0
        assert limits["high"] == 50.0
        assert limits["critical"] == 65.0

    def test_update_limits_invalid_order(self, fx_analyzer):
        """Test updating limits with invalid ordering raises error."""
        with pytest.raises(ValueError):
            fx_analyzer.update_limits("EUR", {
                "warning": 50.0,
                "high": 40.0,  # Less than warning - invalid
                "critical": 60.0,
            })

    def test_update_limits_missing_keys(self, fx_analyzer):
        """Test updating limits with missing keys raises error."""
        with pytest.raises(ValueError):
            fx_analyzer.update_limits("EUR", {
                "warning": 35.0,
                # Missing 'high' and 'critical'
            })

    @pytest.mark.asyncio
    async def test_analyze_no_positions(self, fx_analyzer):
        """Test analysis with no positions."""
        # Mock HTTP client to return empty positions
        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=[]):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    report = await fx_analyzer.analyze()

        assert report.base_currency == "AUD"
        assert report.total_portfolio_value == 100000.0
        assert len(report.currency_exposures) == 0
        assert len(report.warnings) == 0
        assert len(report.critical_exposures) == 0

    @pytest.mark.asyncio
    async def test_analyze_with_positions(self, fx_analyzer):
        """Test analysis with positions in different currencies."""
        positions = [
            {"symbol": "AAPL", "trade_currency": "USD", "market_value_base": 60000.0},
            {"symbol": "BHP", "trade_currency": "AUD", "market_value_base": 30000.0},
        ]

        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=positions):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    report = await fx_analyzer.analyze()

        assert report.base_currency == "AUD"
        assert "USD" in report.currency_exposures
        assert report.currency_exposures["USD"].percentage == 60.0
        assert report.largest_currency == "USD"
        assert report.largest_percentage == 60.0

    @pytest.mark.asyncio
    async def test_analyze_with_elevated_exposure(self, fx_analyzer):
        """Test analysis with elevated USD exposure."""
        positions = [
            {"symbol": "AAPL", "trade_currency": "USD", "market_value_base": 65000.0},
            {"symbol": "BHP", "trade_currency": "AUD", "market_value_base": 35000.0},
        ]

        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=positions):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    report = await fx_analyzer.analyze()

        assert report.currency_exposures["USD"].level == ExposureLevel.ELEVATED
        assert len(report.warnings) > 0
        assert any("65.0%" in w for w in report.warnings)

    @pytest.mark.asyncio
    async def test_analyze_with_critical_exposure(self, fx_analyzer):
        """Test analysis with critical USD exposure."""
        positions = [
            {"symbol": "AAPL", "trade_currency": "USD", "market_value_base": 92000.0},
            {"symbol": "BHP", "trade_currency": "AUD", "market_value_base": 8000.0},
        ]

        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=positions):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    report = await fx_analyzer.analyze()

        assert report.currency_exposures["USD"].level == ExposureLevel.CRITICAL
        assert len(report.critical_exposures) > 0
        assert "USD" in report.critical_exposures
        assert any("CRITICAL" in w for w in report.warnings)

    @pytest.mark.asyncio
    async def test_check_order_fx_impact_allowed(self, fx_analyzer):
        """Test order check that stays within limits."""
        # Set up current exposure at 50%
        positions = [
            {"symbol": "AAPL", "trade_currency": "USD", "market_value_base": 50000.0},
        ]

        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=positions):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    result = await fx_analyzer.check_order_fx_impact(
                        symbol="MSFT",
                        trade_currency="USD",
                        order_value_base=5000.0,  # Would push to 55%
                    )

        assert result["allowed"] is True
        assert result["level"] == "NORMAL"
        assert result["projected_exposure_pct"] == 55.0

    @pytest.mark.asyncio
    async def test_check_order_fx_impact_critical(self, fx_analyzer):
        """Test order check that would exceed critical limit."""
        # Set up current exposure at 85%
        positions = [
            {"symbol": "AAPL", "trade_currency": "USD", "market_value_base": 85000.0},
        ]

        with patch.object(fx_analyzer, 'fetch_positions_from_execution', return_value=positions):
            with patch.object(fx_analyzer, 'fetch_exposure_from_execution', return_value=None):
                with patch.object(fx_analyzer, 'fetch_account_from_execution', return_value={"equity": 100000.0}):
                    result = await fx_analyzer.check_order_fx_impact(
                        symbol="MSFT",
                        trade_currency="USD",
                        order_value_base=10000.0,  # Would push to 95%
                    )

        assert result["allowed"] is False
        assert result["level"] == "CRITICAL"
        assert result["projected_exposure_pct"] == 95.0
        assert len(result["warnings"]) > 0

    @pytest.mark.asyncio
    async def test_check_order_base_currency_always_allowed(self, fx_analyzer):
        """Test order in base currency is always allowed."""
        result = await fx_analyzer.check_order_fx_impact(
            symbol="BHP",
            trade_currency="AUD",  # Same as base currency
            order_value_base=50000.0,
        )

        assert result["allowed"] is True
        assert result["level"] == "NORMAL"


class TestCurrencyExposure:
    """Tests for CurrencyExposure dataclass."""

    def test_to_dict(self):
        """Test serialization to dict."""
        exposure = CurrencyExposure(
            currency="USD",
            value_base=75000.0,
            percentage=75.0,
            position_count=3,
            level=ExposureLevel.HIGH,
            limit_warning=60.0,
            limit_high=75.0,
            limit_critical=90.0,
        )
        d = exposure.to_dict()

        assert d["currency"] == "USD"
        assert d["value_base"] == 75000.0
        assert d["percentage"] == 75.0
        assert d["position_count"] == 3
        assert d["level"] == "HIGH"
        assert d["limits"]["warning"] == 60.0
        assert d["limits"]["high"] == 75.0
        assert d["limits"]["critical"] == 90.0


class TestFXExposureReport:
    """Tests for FXExposureReport dataclass."""

    def test_to_dict(self):
        """Test serialization to dict."""
        report = FXExposureReport(
            base_currency="AUD",
            total_portfolio_value=100000.0,
            currency_exposures={},
            largest_currency="USD",
            largest_percentage=75.0,
            warnings=["Test warning"],
            critical_exposures=[],
        )
        d = report.to_dict()

        assert d["base_currency"] == "AUD"
        assert d["total_portfolio_value"] == 100000.0
        assert d["largest_currency"] == "USD"
        assert d["largest_percentage"] == 75.0
        assert d["has_critical"] is False
        assert "timestamp" in d

    def test_has_critical_true(self):
        """Test has_critical when critical exposures exist."""
        report = FXExposureReport(
            base_currency="AUD",
            total_portfolio_value=100000.0,
            currency_exposures={},
            largest_currency="USD",
            largest_percentage=95.0,
            warnings=["CRITICAL: USD at 95%"],
            critical_exposures=["USD"],
        )
        d = report.to_dict()

        assert d["has_critical"] is True


class TestDefaultFXLimits:
    """Tests for default FX limits configuration."""

    def test_usd_limits(self):
        """Test USD has appropriate limits."""
        assert DEFAULT_FX_LIMITS["USD"]["warning"] == 60.0
        assert DEFAULT_FX_LIMITS["USD"]["high"] == 75.0
        assert DEFAULT_FX_LIMITS["USD"]["critical"] == 90.0

    def test_default_limits_for_unknown(self):
        """Test DEFAULT limits exist for unknown currencies."""
        assert "DEFAULT" in DEFAULT_FX_LIMITS
        assert DEFAULT_FX_LIMITS["DEFAULT"]["warning"] == 25.0
        assert DEFAULT_FX_LIMITS["DEFAULT"]["high"] == 40.0
        assert DEFAULT_FX_LIMITS["DEFAULT"]["critical"] == 55.0

    def test_limits_are_ordered(self):
        """Test all limits are properly ordered."""
        for currency, limits in DEFAULT_FX_LIMITS.items():
            assert limits["warning"] <= limits["high"] <= limits["critical"], \
                f"Limits for {currency} are not properly ordered"
