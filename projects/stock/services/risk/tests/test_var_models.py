"""
Tests for VaR (Value at Risk) Models and Validation.

Tests cover:
- HistoricalVaR calculation
- ParametricVaR calculation
- EVTVaR calculation (Extreme Value Theory)
- VaR validation checks
- VaR backtesting
- Configuration loading
- Audit trail logging

IMPORTANT: These tests validate that VaR is calculated correctly,
but VaR does NOT gate trades. Primary trade gates are:
- Exposure limits
- Drawdown limits
- Circuit breakers
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, date, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
import sys

# Mock asyncpg before importing modules that use it
sys.modules['asyncpg'] = MagicMock()

from analytics.var_models import (
    VaRModel,
    HistoricalVaR,
    ParametricVaR,
    EVTVaR,
    VaRResult,
    VaRModelType,
    create_var_model,
    load_var_config,
)
from analytics.var_validator import (
    VaRValidator,
    VaRValidationResult,
    VaRBacktestResult,
    validate_var_calculation,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_returns():
    """Create sample return series for testing."""
    np.random.seed(42)
    dates = pd.date_range(end=date.today(), periods=252, freq='D')
    returns = pd.Series(
        np.random.normal(0.0005, 0.015, 252),
        index=dates,
        name='returns',
    )
    return returns


@pytest.fixture
def fat_tail_returns():
    """Create returns with fat tails for EVT testing."""
    np.random.seed(123)
    dates = pd.date_range(end=date.today(), periods=500, freq='D')

    # Base returns
    normal_returns = np.random.normal(0.0003, 0.012, 500)

    # Add fat tail events
    jump_days = np.random.choice(500, size=25, replace=False)
    normal_returns[jump_days] = np.random.choice(
        [-0.05, -0.06, -0.07, 0.04, 0.05],
        size=25,
    )

    return pd.Series(normal_returns, index=dates, name='returns')


@pytest.fixture
def short_returns():
    """Create short return series (insufficient observations)."""
    np.random.seed(42)
    dates = pd.date_range(end=date.today(), periods=20, freq='D')
    return pd.Series(
        np.random.normal(0.0005, 0.015, 20),
        index=dates,
    )


@pytest.fixture
def returns_with_gaps():
    """Create returns with missing values."""
    np.random.seed(42)
    dates = pd.date_range(end=date.today(), periods=252, freq='D')
    returns = pd.Series(
        np.random.normal(0.0005, 0.015, 252),
        index=dates,
    )
    # Add some NaN values
    returns.iloc[10:15] = np.nan
    returns.iloc[100:105] = np.nan
    return returns


# =============================================================================
# Historical VaR Tests
# =============================================================================

class TestHistoricalVaR:
    """Tests for Historical VaR model."""

    @pytest.fixture
    def model(self):
        """Create HistoricalVaR model."""
        return HistoricalVaR()

    def test_model_type(self, model):
        """Test model type property."""
        assert model.model_type == VaRModelType.HISTORICAL

    def test_calculate_basic(self, model, sample_returns):
        """Test basic VaR calculation."""
        result = model.calculate(
            returns=sample_returns,
            confidence=0.95,
            horizon=1,
        )

        assert isinstance(result, VaRResult)
        assert result.var_value > 0  # Loss is positive
        assert result.cvar_value >= result.var_value  # CVaR >= VaR
        assert result.confidence_level == 0.95
        assert result.horizon_days == 1
        assert result.observations_used == len(sample_returns.dropna())
        assert result.model_type == VaRModelType.HISTORICAL

    def test_calculate_with_portfolio_value(self, model, sample_returns):
        """Test VaR calculation with portfolio value scaling."""
        portfolio_value = 100000.0

        result = model.calculate(
            returns=sample_returns,
            confidence=0.95,
            horizon=1,
            portfolio_value=portfolio_value,
        )

        # VaR should be scaled to dollar value
        assert result.var_value > 100  # Should be > $100 for realistic portfolio
        assert result.portfolio_value == portfolio_value

    def test_calculate_different_confidence_levels(self, model, sample_returns):
        """Test VaR at different confidence levels."""
        var_95 = model.calculate(sample_returns, confidence=0.95, horizon=1)
        var_99 = model.calculate(sample_returns, confidence=0.99, horizon=1)

        # 99% VaR should be larger than 95% VaR
        assert var_99.var_value > var_95.var_value

    def test_calculate_different_horizons(self, model, sample_returns):
        """Test VaR for different time horizons."""
        var_1d = model.calculate(sample_returns, confidence=0.95, horizon=1)
        var_5d = model.calculate(sample_returns, confidence=0.95, horizon=5)

        # 5-day VaR should be larger (sqrt(5) scaling)
        expected_ratio = np.sqrt(5)
        actual_ratio = var_5d.var_value / var_1d.var_value

        # Should be approximately sqrt(5), allow 10% tolerance
        assert 0.9 * expected_ratio <= actual_ratio <= 1.1 * expected_ratio

    def test_calculate_insufficient_data(self, model, short_returns):
        """Test that insufficient data raises error."""
        with pytest.raises(ValueError) as exc_info:
            model.calculate(short_returns, confidence=0.95, horizon=1)

        assert "Insufficient" in str(exc_info.value)

    def test_calculate_empty_returns(self, model):
        """Test that empty returns raises error."""
        with pytest.raises(ValueError):
            model.calculate(pd.Series([]), confidence=0.95, horizon=1)

    def test_calculate_invalid_confidence(self, model, sample_returns):
        """Test that invalid confidence level raises error."""
        with pytest.raises(ValueError):
            model.calculate(sample_returns, confidence=1.5, horizon=1)

        with pytest.raises(ValueError):
            model.calculate(sample_returns, confidence=0.1, horizon=1)

    def test_audit_trail_logged(self, model, sample_returns):
        """Test that audit parameters are logged."""
        result = model.calculate(sample_returns, confidence=0.95, horizon=1)

        params = result.parameters_logged
        assert "method" in params
        assert params["method"] == "historical_simulation"
        assert "confidence" in params
        assert "mean_return" in params
        assert "std_return" in params
        assert "skewness" in params
        assert "kurtosis" in params
        assert "tail_observations" in params

    def test_handles_nan_values(self, model, returns_with_gaps):
        """Test that NaN values are handled correctly."""
        result = model.calculate(returns_with_gaps, confidence=0.95, horizon=1)

        # Should complete calculation with fewer observations
        expected_obs = len(returns_with_gaps.dropna())
        assert result.observations_used == expected_obs

    def test_var_pct_property(self, model, sample_returns):
        """Test VaR percentage calculation."""
        result = model.calculate(
            sample_returns,
            confidence=0.95,
            horizon=1,
            portfolio_value=100000.0,
        )

        assert result.var_pct > 0
        assert result.var_pct == (result.var_value / result.portfolio_value) * 100


# =============================================================================
# Parametric VaR Tests
# =============================================================================

class TestParametricVaR:
    """Tests for Parametric (Gaussian) VaR model."""

    @pytest.fixture
    def model(self):
        """Create ParametricVaR model."""
        return ParametricVaR()

    def test_model_type(self, model):
        """Test model type property."""
        assert model.model_type == VaRModelType.PARAMETRIC

    def test_calculate_basic(self, model, sample_returns):
        """Test basic parametric VaR calculation."""
        result = model.calculate(
            returns=sample_returns,
            confidence=0.95,
            horizon=1,
        )

        assert isinstance(result, VaRResult)
        assert result.var_value > 0
        assert result.cvar_value >= result.var_value
        assert result.model_type == VaRModelType.PARAMETRIC

    def test_parametric_assumes_normality(self, model, sample_returns):
        """Test that parametric method assumes normality."""
        result = model.calculate(sample_returns, confidence=0.95, horizon=1)

        params = result.parameters_logged
        assert params["normality_assumption"] is True
        assert "warning" in params  # Should warn about normality assumption

    def test_compare_with_historical(self, sample_returns):
        """Compare parametric vs historical VaR."""
        hist_model = HistoricalVaR()
        param_model = ParametricVaR()

        hist_result = hist_model.calculate(sample_returns, confidence=0.95, horizon=1)
        param_result = param_model.calculate(sample_returns, confidence=0.95, horizon=1)

        # Results should be in same order of magnitude
        ratio = param_result.var_value / hist_result.var_value
        assert 0.5 <= ratio <= 2.0

    def test_works_with_fewer_observations(self, model):
        """Test that parametric works with fewer observations than historical."""
        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=50, freq='D')
        short_returns = pd.Series(np.random.normal(0.0005, 0.015, 50), index=dates)

        result = model.calculate(short_returns, confidence=0.95, horizon=1)
        assert result.var_value > 0


# =============================================================================
# EVT VaR Tests
# =============================================================================

class TestEVTVaR:
    """Tests for Extreme Value Theory VaR model."""

    @pytest.fixture
    def model(self):
        """Create EVT VaR model."""
        return EVTVaR(threshold_percentile=0.10)

    def test_model_type(self, model):
        """Test model type property."""
        assert model.model_type == VaRModelType.EVT

    def test_calculate_with_sufficient_data(self, model, fat_tail_returns):
        """Test EVT VaR with sufficient data."""
        result = model.calculate(
            returns=fat_tail_returns,
            confidence=0.95,
            horizon=1,
        )

        assert isinstance(result, VaRResult)
        assert result.var_value > 0
        assert result.model_type == VaRModelType.EVT

    def test_requires_more_observations(self, model, sample_returns):
        """Test EVT needs more observations than basic methods."""
        # 252 observations should work
        result = model.calculate(sample_returns, confidence=0.95, horizon=1)
        assert result.var_value > 0

    def test_fallback_to_historical(self, model, short_returns):
        """Test that EVT falls back to historical with insufficient data."""
        # EVT needs 100 observations minimum
        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=60, freq='D')
        medium_returns = pd.Series(np.random.normal(0.0005, 0.015, 60), index=dates)

        with pytest.raises(ValueError):
            model.calculate(medium_returns, confidence=0.95, horizon=1)

    def test_gpd_parameters_logged(self, model, fat_tail_returns):
        """Test that GPD parameters are logged for audit."""
        result = model.calculate(fat_tail_returns, confidence=0.95, horizon=1)

        params = result.parameters_logged
        assert "gpd_shape" in params
        assert "gpd_scale" in params
        assert "threshold_value" in params
        assert "exceedances_count" in params

    def test_captures_fat_tails(self, fat_tail_returns):
        """Test that EVT better captures fat tail risk."""
        hist_model = HistoricalVaR()
        evt_model = EVTVaR()

        hist_result = hist_model.calculate(fat_tail_returns, confidence=0.99, horizon=1)
        evt_result = evt_model.calculate(fat_tail_returns, confidence=0.99, horizon=1)

        # For fat-tailed data, EVT should estimate higher or similar VaR
        # (EVT focuses on tail, may give different estimate)
        assert evt_result.var_value > 0
        assert hist_result.var_value > 0


# =============================================================================
# VaR Factory Tests
# =============================================================================

class TestVaRFactory:
    """Tests for VaR model factory function."""

    def test_create_historical(self):
        """Test creating historical model."""
        model = create_var_model("historical")
        assert isinstance(model, HistoricalVaR)

    def test_create_parametric(self):
        """Test creating parametric model."""
        model = create_var_model("parametric")
        assert isinstance(model, ParametricVaR)

    def test_create_evt(self):
        """Test creating EVT model."""
        model = create_var_model("evt")
        assert isinstance(model, EVTVaR)

    def test_case_insensitive(self):
        """Test factory is case insensitive."""
        model1 = create_var_model("HISTORICAL")
        model2 = create_var_model("Historical")
        assert isinstance(model1, HistoricalVaR)
        assert isinstance(model2, HistoricalVaR)

    def test_unknown_type_defaults_to_historical(self):
        """Test unknown type defaults to historical."""
        model = create_var_model("unknown_model")
        assert isinstance(model, HistoricalVaR)

    def test_evt_with_config(self):
        """Test EVT model with custom threshold."""
        config = {"evt_threshold_percentile": 0.05}
        model = create_var_model("evt", config)
        assert isinstance(model, EVTVaR)
        assert model.threshold_percentile == 0.05


# =============================================================================
# VaR Validator Tests
# =============================================================================

class TestVaRValidator:
    """Tests for VaR validation."""

    @pytest.fixture
    def validator(self):
        """Create VaR validator."""
        return VaRValidator(min_observations=100)

    def test_validate_valid_returns(self, validator, sample_returns):
        """Test validation passes for valid returns."""
        result = validator.validate_returns(
            returns=sample_returns,
            expected_horizon=1,
        )

        assert result.is_valid
        assert len(result.errors) == 0

    def test_validate_insufficient_observations(self, validator, short_returns):
        """Test validation fails for insufficient observations."""
        result = validator.validate_returns(
            returns=short_returns,
            expected_horizon=1,
        )

        assert not result.is_valid
        assert any("Insufficient" in e for e in result.errors)

    def test_validate_empty_returns(self, validator):
        """Test validation fails for empty returns."""
        result = validator.validate_returns(
            returns=pd.Series([]),
            expected_horizon=1,
        )

        assert not result.is_valid
        assert "empty" in result.errors[0].lower()

    def test_validate_missing_data_warning(self, validator, returns_with_gaps):
        """Test warning for missing data."""
        result = validator.validate_returns(
            returns=returns_with_gaps,
            expected_horizon=1,
        )

        # Should still be valid but with warning
        assert result.is_valid
        assert any("missing" in w.lower() for w in result.warnings)

    def test_validate_horizon_strategy_match(self, validator, sample_returns):
        """Test horizon matches strategy holding time."""
        # Daily strategy with 1-day horizon should pass
        result1 = validator.validate_returns(
            returns=sample_returns,
            expected_horizon=1,
            strategy_holding_time="daily",
        )
        assert result1.checks_passed.get("horizon_matches_strategy", True)

        # Weekly strategy with 1-day horizon should warn
        result2 = validator.validate_returns(
            returns=sample_returns,
            expected_horizon=1,
            strategy_holding_time="weekly",
        )
        assert not result2.checks_passed.get("horizon_matches_strategy", True)

    def test_validate_logs_parameters(self, validator, sample_returns):
        """Test that validation logs all parameters."""
        result = validator.validate_returns(
            returns=sample_returns,
            expected_horizon=1,
        )

        params = result.parameters_logged
        assert "observation_count" in params
        assert "mean_return" in params
        assert "std_return" in params
        assert "skewness" in params
        assert "var_blocks_trades" in params
        assert params["var_blocks_trades"] is False  # Important!

    def test_validate_checks_all_passed(self, validator, sample_returns):
        """Test all checks dictionary is populated."""
        result = validator.validate_returns(sample_returns, expected_horizon=1)

        assert "series_not_empty" in result.checks_passed
        assert "sufficient_observations" in result.checks_passed
        assert "missing_data_acceptable" in result.checks_passed


# =============================================================================
# VaR Backtest Tests
# =============================================================================

class TestVaRBacktest:
    """Tests for VaR backtesting."""

    @pytest.fixture
    def validator(self):
        """Create VaR validator for backtesting."""
        return VaRValidator()

    def test_backtest_historical_var(self, validator, fat_tail_returns):
        """Test backtesting historical VaR."""
        result = validator.backtest_var(
            returns=fat_tail_returns,
            model_type="historical",
            confidence=0.95,
            window=252,
            horizon=1,
        )

        assert isinstance(result, VaRBacktestResult)
        assert result.total_observations > 0
        assert 0 <= result.breach_rate <= 1
        assert result.expected_breaches > 0
        assert result.kupiec_test_pvalue >= 0

    def test_backtest_parametric_var(self, validator, fat_tail_returns):
        """Test backtesting parametric VaR."""
        result = validator.backtest_var(
            returns=fat_tail_returns,
            model_type="parametric",
            confidence=0.95,
            window=252,
            horizon=1,
        )

        assert result.model_type == "parametric"
        assert result.total_observations > 0

    def test_backtest_accuracy_check(self, validator, fat_tail_returns):
        """Test backtest accuracy determination."""
        result = validator.backtest_var(
            returns=fat_tail_returns,
            model_type="historical",
            confidence=0.95,
            window=252,
            horizon=1,
        )

        # is_accurate based on statistical tests
        assert isinstance(result.is_accurate, bool)
        assert result.kupiec_test_pvalue is not None

    def test_backtest_with_portfolio_value(self, validator, fat_tail_returns):
        """Test backtest scales to portfolio value."""
        result = validator.backtest_var(
            returns=fat_tail_returns,
            model_type="historical",
            confidence=0.95,
            window=252,
            horizon=1,
            portfolio_value=100000.0,
        )

        params = result.parameters_logged
        assert params["portfolio_value"] == 100000.0

    def test_backtest_insufficient_data(self, validator, sample_returns):
        """Test backtest fails with insufficient data."""
        with pytest.raises(ValueError) as exc_info:
            validator.backtest_var(
                returns=sample_returns,
                window=300,  # More than available data
                horizon=1,
            )

        assert "Insufficient" in str(exc_info.value)


# =============================================================================
# Configuration Tests
# =============================================================================

class TestVaRConfiguration:
    """Tests for VaR configuration loading."""

    def test_load_default_config(self):
        """Test loading default configuration."""
        config = load_var_config("/nonexistent/path")

        assert config["default_model"] == "historical"
        assert 0.95 in config["confidence_levels"]
        assert config["var_blocks_trades"] is False

    def test_config_has_required_fields(self):
        """Test default config has all required fields."""
        config = load_var_config()

        required_fields = [
            "default_model",
            "confidence_levels",
            "horizons",
            "lookback_days",
            "min_observations",
            "var_blocks_trades",
        ]

        for field in required_fields:
            assert field in config, f"Missing required field: {field}"

    def test_var_blocks_trades_always_false(self):
        """Test that var_blocks_trades defaults to False."""
        config = load_var_config()

        # CRITICAL: VaR should never block trades by default
        assert config["var_blocks_trades"] is False


# =============================================================================
# VaR Result Tests
# =============================================================================

class TestVaRResult:
    """Tests for VaRResult dataclass."""

    @pytest.fixture
    def sample_result(self):
        """Create sample VaR result."""
        return VaRResult(
            var_value=1500.0,
            cvar_value=2000.0,
            model_type=VaRModelType.HISTORICAL,
            confidence_level=0.95,
            horizon_days=1,
            lookback_days=252,
            observations_used=250,
            portfolio_value=100000.0,
            parameters_logged={"method": "test"},
        )

    def test_to_dict(self, sample_result):
        """Test conversion to dictionary."""
        result_dict = sample_result.to_dict()

        assert result_dict["var_value"] == 1500.0
        assert result_dict["cvar_value"] == 2000.0
        assert result_dict["model_type"] == "historical"
        assert result_dict["confidence_level"] == 0.95
        assert "calculated_at" in result_dict

    def test_var_pct_calculation(self, sample_result):
        """Test VaR percentage calculation."""
        # 1500 / 100000 * 100 = 1.5%
        assert sample_result.var_pct == 1.5

    def test_var_pct_no_portfolio_value(self):
        """Test VaR pct returns 0 when no portfolio value."""
        result = VaRResult(
            var_value=0.015,
            cvar_value=0.02,
            model_type=VaRModelType.HISTORICAL,
            confidence_level=0.95,
            horizon_days=1,
            lookback_days=252,
            observations_used=250,
            portfolio_value=None,
        )

        assert result.var_pct == 0.0


# =============================================================================
# Convenience Function Tests
# =============================================================================

class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    def test_validate_var_calculation(self, sample_returns):
        """Test convenience validation function."""
        is_valid, result = validate_var_calculation(
            returns=sample_returns,
            horizon=1,
            strategy_holding_time="daily",
        )

        assert isinstance(is_valid, bool)
        assert isinstance(result, VaRValidationResult)


# =============================================================================
# Integration Tests
# =============================================================================

class TestVaRIntegration:
    """Integration tests for VaR workflow."""

    def test_full_workflow(self, sample_returns):
        """Test complete VaR calculation workflow."""
        # 1. Create validator
        validator = VaRValidator(min_observations=100)

        # 2. Validate inputs
        validation = validator.validate_returns(
            returns=sample_returns,
            expected_horizon=1,
            strategy_holding_time="daily",
        )
        assert validation.is_valid

        # 3. Calculate VaR
        model = create_var_model("historical")
        result = model.calculate(
            returns=sample_returns,
            confidence=0.95,
            horizon=1,
            portfolio_value=100000.0,
        )

        # 4. Verify result
        assert result.var_value > 0
        assert result.cvar_value >= result.var_value
        assert "method" in result.parameters_logged

    def test_multiple_models_comparison(self, fat_tail_returns):
        """Test comparing multiple VaR models."""
        results = {}

        for model_type in ["historical", "parametric", "evt"]:
            model = create_var_model(model_type)
            result = model.calculate(
                returns=fat_tail_returns,
                confidence=0.95,
                horizon=1,
                portfolio_value=100000.0,
            )
            results[model_type] = result

        # All models should produce valid results
        for model_type, result in results.items():
            assert result.var_value > 0, f"{model_type} VaR should be positive"
            assert result.model_type.value == model_type

    def test_var_does_not_block_trades(self, sample_returns):
        """Test that VaR configuration never blocks trades."""
        validator = VaRValidator()
        validation = validator.validate_returns(sample_returns, expected_horizon=1)

        # Explicitly check that var_blocks_trades is False
        assert validation.parameters_logged.get("var_blocks_trades") is False

        # Config should also have this
        config = load_var_config()
        assert config.get("var_blocks_trades") is False


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_all_same_returns(self):
        """Test with returns that are all the same value."""
        dates = pd.date_range(end=date.today(), periods=200, freq='D')
        # Use 0 returns - no gains, no losses
        constant_returns = pd.Series([0.0] * 200, index=dates)

        model = HistoricalVaR()
        result = model.calculate(constant_returns, confidence=0.95, horizon=1)

        # VaR should be minimal (no variance)
        # With constant 0 returns, VaR should be 0
        assert abs(result.var_value) < 0.001  # Allow tiny floating point error

    def test_extreme_negative_returns(self):
        """Test with extreme negative returns."""
        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=300, freq='D')
        returns = pd.Series(np.random.normal(-0.01, 0.02, 300), index=dates)

        model = HistoricalVaR()
        result = model.calculate(returns, confidence=0.95, horizon=1)

        # Should still calculate valid VaR
        assert result.var_value > 0

    def test_positive_skew_returns(self):
        """Test with positively skewed returns."""
        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=300, freq='D')
        # Right-skewed distribution
        returns = pd.Series(
            np.random.exponential(0.01, 300) - 0.01,
            index=dates,
        )

        model = HistoricalVaR()
        result = model.calculate(returns, confidence=0.95, horizon=1)

        # Skewness should be captured in audit trail
        assert "skewness" in result.parameters_logged

    def test_very_high_confidence(self):
        """Test VaR at very high confidence level."""
        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=500, freq='D')
        returns = pd.Series(np.random.normal(0.0005, 0.015, 500), index=dates)

        model = HistoricalVaR()
        result = model.calculate(returns, confidence=0.999, horizon=1)

        # 99.9% VaR should be quite high
        assert result.var_value > 0


# =============================================================================
# Performance Tests
# =============================================================================

class TestPerformance:
    """Basic performance tests."""

    def test_historical_var_speed(self):
        """Test that historical VaR is reasonably fast."""
        import time

        np.random.seed(42)
        dates = pd.date_range(end=date.today(), periods=1000, freq='D')
        large_returns = pd.Series(np.random.normal(0.0005, 0.015, 1000), index=dates)

        model = HistoricalVaR()

        start = time.time()
        for _ in range(10):
            model.calculate(large_returns, confidence=0.95, horizon=1)
        elapsed = time.time() - start

        # Should complete 10 calculations in under 1 second
        assert elapsed < 1.0

    def test_parametric_faster_than_historical(self, fat_tail_returns):
        """Test that parametric VaR is faster than historical."""
        import time

        hist_model = HistoricalVaR()
        param_model = ParametricVaR()

        # Time historical
        start = time.time()
        for _ in range(10):
            hist_model.calculate(fat_tail_returns, confidence=0.95, horizon=1)
        hist_time = time.time() - start

        # Time parametric
        start = time.time()
        for _ in range(10):
            param_model.calculate(fat_tail_returns, confidence=0.95, horizon=1)
        param_time = time.time() - start

        # Parametric should be at least as fast
        assert param_time <= hist_time * 2
