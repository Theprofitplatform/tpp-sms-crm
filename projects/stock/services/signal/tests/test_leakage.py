"""
Tests for data leakage detection in backtesting.

Tests cover:
- Look-ahead bias detection in indicators
- Survivorship bias detection in universe selection
- Parameter peeking validation
- Train/test separation validation
- Full backtest leakage audit

Usage:
    pytest services/signal/tests/test_leakage.py -v
"""

import pytest
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch
import pandas as pd
import numpy as np

from validation.leakage_detector import (
    LeakageDetector,
    LeakageReport,
    LeakageType,
    ValidationResult,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def detector():
    """Create a LeakageDetector instance."""
    return LeakageDetector(strict_mode=True)


@pytest.fixture
def sample_ohlcv_df():
    """Create sample OHLCV DataFrame for testing."""
    dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
    np.random.seed(42)

    df = pd.DataFrame({
        'open': 100 + np.cumsum(np.random.randn(100) * 0.5),
        'high': 100 + np.cumsum(np.random.randn(100) * 0.5) + 1,
        'low': 100 + np.cumsum(np.random.randn(100) * 0.5) - 1,
        'close': 100 + np.cumsum(np.random.randn(100) * 0.5),
        'volume': np.random.randint(1000000, 5000000, 100),
    }, index=dates)

    return df


@pytest.fixture
def sample_universe_history():
    """Create sample universe history for testing."""
    return {
        "AAPL": {
            "in_universe_from": date(2020, 1, 1),
            "in_universe_until": None,  # Still active
        },
        "MSFT": {
            "in_universe_from": date(2020, 1, 1),
            "in_universe_until": None,
        },
        "DELISTED": {
            "in_universe_from": date(2020, 1, 1),
            "in_universe_until": date(2022, 6, 15),  # Delisted
        },
        "FUTURE": {
            "in_universe_from": date(2024, 1, 1),  # Added in future
            "in_universe_until": None,
        },
    }


# =============================================================================
# Test: Indicator Validation (Look-Ahead Bias)
# =============================================================================

class TestIndicatorValidation:
    """Tests for look-ahead bias detection in indicators."""

    def test_valid_indicator_sma(self, detector, sample_ohlcv_df):
        """Test that a valid SMA indicator passes validation."""
        def sma_indicator(df: pd.DataFrame) -> pd.Series:
            return df['close'].rolling(window=20).mean()

        result = detector.validate_indicator_calculation(
            df=sample_ohlcv_df,
            indicator_func=sma_indicator,
            lookback=20,
        )

        assert result.is_valid
        assert result.leakage_type is None

    def test_invalid_indicator_future_sma(self, detector, sample_ohlcv_df):
        """Test that an indicator using future data fails validation."""
        def future_sma_indicator(df: pd.DataFrame) -> pd.Series:
            # This is a lookahead bias - using future values
            return df['close'].shift(-5).rolling(window=20).mean()

        result = detector.validate_indicator_calculation(
            df=sample_ohlcv_df,
            indicator_func=future_sma_indicator,
            lookback=20,
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.LOOK_AHEAD

    def test_valid_indicator_ema(self, detector, sample_ohlcv_df):
        """Test that a valid EMA indicator passes validation."""
        def ema_indicator(df: pd.DataFrame) -> pd.Series:
            return df['close'].ewm(span=20, adjust=False).mean()

        result = detector.validate_indicator_calculation(
            df=sample_ohlcv_df,
            indicator_func=ema_indicator,
            lookback=20,
        )

        assert result.is_valid

    def test_insufficient_data_warning(self, detector):
        """Test that insufficient data returns a warning."""
        small_df = pd.DataFrame({
            'close': [100, 101, 102, 103, 104],
        }, index=pd.date_range('2023-01-01', periods=5))

        def sma_indicator(df: pd.DataFrame) -> pd.Series:
            return df['close'].rolling(window=20).mean()

        result = detector.validate_indicator_calculation(
            df=small_df,
            indicator_func=sma_indicator,
            lookback=20,
        )

        assert result.is_valid
        assert result.severity == "warning"


# =============================================================================
# Test: Universe Selection (Survivorship Bias)
# =============================================================================

class TestUniverseValidation:
    """Tests for survivorship bias detection in universe selection."""

    def test_valid_universe_selection(self, detector, sample_universe_history):
        """Test that a valid universe passes validation."""
        result = detector.validate_universe_selection(
            selection_date=date(2023, 1, 1),
            symbols=["AAPL", "MSFT"],
            universe_history=sample_universe_history,
        )

        assert result.is_valid
        assert result.leakage_type is None

    def test_future_symbol_survivorship_bias(self, detector, sample_universe_history):
        """Test that selecting a future symbol fails validation."""
        result = detector.validate_universe_selection(
            selection_date=date(2023, 1, 1),
            symbols=["AAPL", "MSFT", "FUTURE"],  # FUTURE was added in 2024
            universe_history=sample_universe_history,
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.SURVIVORSHIP
        assert "future_symbols" in result.details

    def test_delisted_symbol_not_bias(self, detector, sample_universe_history):
        """Test that including delisted symbols is valid (they were tradeable)."""
        result = detector.validate_universe_selection(
            selection_date=date(2021, 1, 1),  # Before delisting
            symbols=["AAPL", "MSFT", "DELISTED"],
            universe_history=sample_universe_history,
        )

        assert result.is_valid

    def test_already_delisted_symbol(self, detector, sample_universe_history):
        """Test that a symbol delisted before selection date fails."""
        result = detector.validate_universe_selection(
            selection_date=date(2023, 1, 1),  # After DELISTED was removed
            symbols=["AAPL", "DELISTED"],
            universe_history=sample_universe_history,
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.SURVIVORSHIP
        assert "delisted_symbols" in result.details

    def test_no_universe_history_warning(self, detector):
        """Test that missing history returns a warning."""
        result = detector.validate_universe_selection(
            selection_date=date(2023, 1, 1),
            symbols=["AAPL", "UNKNOWN"],
            universe_history={"AAPL": {"in_universe_from": date(2020, 1, 1), "in_universe_until": None}},
        )

        assert result.is_valid
        assert result.severity == "warning"
        assert "issues" in result.details


# =============================================================================
# Test: Parameter Selection Validation
# =============================================================================

class TestParameterValidation:
    """Tests for parameter peeking detection."""

    def test_valid_parameter_selection(self, detector):
        """Test that parameters selected before train_end pass validation."""
        param_history = [
            (date(2023, 1, 1), {"lookback": 20}),
            (date(2023, 3, 1), {"lookback": 25}),
        ]

        result = detector.validate_parameter_selection(
            train_end=date(2023, 6, 1),
            params={"lookback": 25},
            param_history=param_history,
        )

        assert result.is_valid

    def test_parameter_peek_detected(self, detector):
        """Test that parameters selected after train_end fail validation."""
        param_history = [
            (date(2023, 1, 1), {"lookback": 20}),
            (date(2023, 6, 15), {"lookback": 25}),  # Selected after train_end
        ]

        result = detector.validate_parameter_selection(
            train_end=date(2023, 6, 1),
            params={"lookback": 25},
            param_history=param_history,
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.PARAMETER_PEEK

    def test_empty_param_history_warning(self, detector):
        """Test that empty parameter history returns a warning."""
        result = detector.validate_parameter_selection(
            train_end=date(2023, 6, 1),
            params={"lookback": 20},
            param_history=[],
        )

        assert result.is_valid
        assert result.severity == "warning"

    def test_params_not_in_history(self, detector):
        """Test that parameters not found in history return a warning."""
        param_history = [
            (date(2023, 1, 1), {"lookback": 20}),
        ]

        result = detector.validate_parameter_selection(
            train_end=date(2023, 6, 1),
            params={"lookback": 30},  # Not in history
            param_history=param_history,
        )

        assert not result.is_valid
        assert result.severity == "warning"


# =============================================================================
# Test: Train/Test Separation
# =============================================================================

class TestTrainTestSeparation:
    """Tests for train/test data separation validation."""

    def test_valid_separation(self, detector):
        """Test that properly separated train/test data passes."""
        train_dates = pd.date_range('2023-01-01', '2023-06-30')
        test_dates = pd.date_range('2023-07-01', '2023-09-30')

        train_df = pd.DataFrame({'close': range(len(train_dates))}, index=train_dates)
        test_df = pd.DataFrame({'close': range(len(test_dates))}, index=test_dates)

        result = detector.validate_train_test_separation(
            train_df=train_df,
            test_df=test_df,
            train_end=date(2023, 6, 30),
            test_start=date(2023, 7, 1),
        )

        assert result.is_valid

    def test_overlap_detected(self, detector):
        """Test that overlapping train/test data fails validation."""
        train_dates = pd.date_range('2023-01-01', '2023-07-15')
        test_dates = pd.date_range('2023-07-01', '2023-09-30')

        train_df = pd.DataFrame({'close': range(len(train_dates))}, index=train_dates)
        test_df = pd.DataFrame({'close': range(len(test_dates))}, index=test_dates)

        result = detector.validate_train_test_separation(
            train_df=train_df,
            test_df=test_df,
            train_end=date(2023, 6, 30),
            test_start=date(2023, 7, 1),
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.LOOK_AHEAD

    def test_train_extends_past_end(self, detector):
        """Test that training data extending past train_end fails."""
        train_dates = pd.date_range('2023-01-01', '2023-07-31')  # Past train_end
        test_dates = pd.date_range('2023-07-01', '2023-09-30')

        train_df = pd.DataFrame({'close': range(len(train_dates))}, index=train_dates)
        test_df = pd.DataFrame({'close': range(len(test_dates))}, index=test_dates)

        result = detector.validate_train_test_separation(
            train_df=train_df,
            test_df=test_df,
            train_end=date(2023, 6, 30),
            test_start=date(2023, 7, 1),
        )

        assert not result.is_valid


# =============================================================================
# Test: Data Timestamp Validation
# =============================================================================

class TestDataTimestampValidation:
    """Tests for data timestamp validation."""

    def test_valid_timestamps(self, detector, sample_ohlcv_df):
        """Test that valid timestamps pass."""
        result = detector.validate_data_timestamps(
            df=sample_ohlcv_df,
            as_of_date=date(2023, 12, 31),
        )

        assert result.is_valid

    def test_future_data_detected(self, detector, sample_ohlcv_df):
        """Test that future data is detected."""
        result = detector.validate_data_timestamps(
            df=sample_ohlcv_df,
            as_of_date=date(2023, 2, 15),  # Before end of data
        )

        assert not result.is_valid
        assert result.leakage_type == LeakageType.TIME_TRAVEL

    def test_empty_dataframe(self, detector):
        """Test that empty DataFrame passes."""
        result = detector.validate_data_timestamps(
            df=pd.DataFrame(),
            as_of_date=date(2023, 1, 1),
        )

        assert result.is_valid


# =============================================================================
# Test: Full Backtest Audit
# =============================================================================

class TestBacktestAudit:
    """Tests for full backtest leakage audit."""

    def test_audit_clean_backtest(self, detector):
        """Test audit of a clean backtest with no leakage."""
        backtest_result = {
            "backtest_id": "test_001",
            "config": {
                "symbols": ["AAPL", "MSFT"],
                "strategy": "momentum",
            },
            "windows": [
                {
                    "train_start": "2023-01-01",
                    "train_end": "2023-06-30",
                    "test_start": "2023-07-01",
                    "test_end": "2023-09-30",
                    "params": {"lookback": 20},
                },
            ],
        }

        report = detector.run_leakage_audit(backtest_result)

        assert isinstance(report, LeakageReport)
        assert report.backtest_id == "test_001"
        # Without universe history, survivorship can't be fully checked
        # but the audit should complete

    def test_audit_with_universe_history(self, detector, sample_universe_history):
        """Test audit with universe history provided."""
        backtest_result = {
            "backtest_id": "test_002",
            "config": {
                "symbols": ["AAPL", "MSFT", "FUTURE"],  # FUTURE is survivorship bias
            },
            "windows": [
                {
                    "train_start": "2023-01-01",
                    "train_end": "2023-06-30",
                    "test_start": "2023-07-01",
                    "test_end": "2023-09-30",
                    "params": {"lookback": 20},
                },
            ],
        }

        report = detector.run_leakage_audit(
            backtest_result,
            universe_history=sample_universe_history,
        )

        assert report.leakage_detected
        assert report.universe_survivorship_bias
        assert LeakageType.SURVIVORSHIP in report.leakage_types

    def test_audit_report_hash(self, detector):
        """Test that audit report generates a valid hash."""
        backtest_result = {
            "backtest_id": "test_003",
            "config": {"symbols": ["AAPL"]},
            "windows": [],
        }

        report = detector.run_leakage_audit(backtest_result)
        report_hash = report.generate_hash()

        assert isinstance(report_hash, str)
        assert len(report_hash) == 64  # SHA-256 hex

    def test_audit_recommendations(self, detector, sample_universe_history):
        """Test that audit generates appropriate recommendations."""
        backtest_result = {
            "backtest_id": "test_004",
            "config": {"symbols": ["FUTURE"]},
            "windows": [
                {
                    "train_start": "2023-01-01",
                    "train_end": "2023-06-30",
                    "test_start": "2023-07-01",
                    "test_end": "2023-09-30",
                    "params": {},
                },
            ],
        }

        report = detector.run_leakage_audit(
            backtest_result,
            universe_history=sample_universe_history,
        )

        assert len(report.recommendations) > 0


# =============================================================================
# Test: Parameter Registration
# =============================================================================

class TestParameterRegistration:
    """Tests for parameter history registration."""

    def test_register_parameter_selection(self, detector):
        """Test registering parameter selection."""
        detector.register_parameter_selection(
            strategy_id="momentum",
            selection_date=date(2023, 1, 1),
            params={"lookback": 20},
        )

        # Check that it was registered
        assert "momentum" in detector._parameter_history
        assert len(detector._parameter_history["momentum"]) == 1

    def test_register_multiple_parameters(self, detector):
        """Test registering multiple parameter selections."""
        detector.register_parameter_selection(
            strategy_id="momentum",
            selection_date=date(2023, 1, 1),
            params={"lookback": 20},
        )
        detector.register_parameter_selection(
            strategy_id="momentum",
            selection_date=date(2023, 3, 1),
            params={"lookback": 25},
        )

        assert len(detector._parameter_history["momentum"]) == 2


# =============================================================================
# Test: Universe Snapshot Registration
# =============================================================================

class TestUniverseSnapshotRegistration:
    """Tests for universe snapshot registration."""

    def test_register_universe_snapshot(self, detector):
        """Test registering universe snapshot."""
        detector.register_universe_snapshot(
            as_of_date=date(2023, 1, 1),
            symbols=["AAPL", "MSFT", "GOOGL"],
        )

        assert date(2023, 1, 1) in detector._universe_snapshots
        assert len(detector._universe_snapshots[date(2023, 1, 1)]) == 3

    def test_get_universe_at_date(self, detector):
        """Test retrieving universe at a specific date."""
        detector.register_universe_snapshot(
            as_of_date=date(2023, 1, 1),
            symbols=["AAPL", "MSFT"],
        )
        detector.register_universe_snapshot(
            as_of_date=date(2023, 6, 1),
            symbols=["AAPL", "MSFT", "GOOGL"],
        )

        # Query for date between snapshots
        symbols = detector.get_universe_at_date(date(2023, 3, 1))
        assert symbols == ["AAPL", "MSFT"]

        # Query for date after second snapshot
        symbols = detector.get_universe_at_date(date(2023, 7, 1))
        assert symbols == ["AAPL", "MSFT", "GOOGL"]

    def test_get_universe_at_date_no_match(self, detector):
        """Test that querying before any snapshot returns None."""
        detector.register_universe_snapshot(
            as_of_date=date(2023, 6, 1),
            symbols=["AAPL"],
        )

        symbols = detector.get_universe_at_date(date(2023, 1, 1))
        assert symbols is None


# =============================================================================
# Test: Clear History
# =============================================================================

class TestClearHistory:
    """Tests for clearing detector history."""

    def test_clear_history(self, detector):
        """Test clearing all history."""
        detector.register_parameter_selection(
            strategy_id="momentum",
            selection_date=date(2023, 1, 1),
            params={"lookback": 20},
        )
        detector.register_universe_snapshot(
            as_of_date=date(2023, 1, 1),
            symbols=["AAPL"],
        )

        detector.clear_history()

        assert len(detector._parameter_history) == 0
        assert len(detector._universe_snapshots) == 0


# =============================================================================
# Test: ValidationResult
# =============================================================================

class TestValidationResult:
    """Tests for ValidationResult class."""

    def test_to_dict(self):
        """Test converting ValidationResult to dict."""
        result = ValidationResult(
            is_valid=False,
            leakage_type=LeakageType.LOOK_AHEAD,
            message="Test message",
            severity="critical",
            details={"key": "value"},
        )

        result_dict = result.to_dict()

        assert result_dict["is_valid"] is False
        assert result_dict["leakage_type"] == "look_ahead"
        assert result_dict["message"] == "Test message"
        assert result_dict["severity"] == "critical"
        assert result_dict["details"] == {"key": "value"}


# =============================================================================
# Test: LeakageReport
# =============================================================================

class TestLeakageReport:
    """Tests for LeakageReport class."""

    def test_to_dict(self):
        """Test converting LeakageReport to dict."""
        report = LeakageReport(
            backtest_id="test_001",
            audit_timestamp=datetime(2023, 1, 1, 12, 0, 0),
            leakage_detected=True,
            leakage_types=[LeakageType.SURVIVORSHIP, LeakageType.LOOK_AHEAD],
            validation_results=[],
            universe_survivorship_bias=True,
            parameter_peeking=False,
            indicator_lookahead=True,
        )

        report_dict = report.to_dict()

        assert report_dict["backtest_id"] == "test_001"
        assert report_dict["leakage_detected"] is True
        assert "survivorship" in report_dict["leakage_types"]
        assert "look_ahead" in report_dict["leakage_types"]
        assert report_dict["universe_survivorship_bias"] is True
        assert report_dict["indicator_lookahead"] is True

    def test_generate_hash_deterministic(self):
        """Test that hash generation is deterministic."""
        report = LeakageReport(
            backtest_id="test_001",
            audit_timestamp=datetime(2023, 1, 1, 12, 0, 0),
            leakage_detected=False,
            leakage_types=[],
            validation_results=[],
        )

        hash1 = report.generate_hash()
        hash2 = report.generate_hash()

        assert hash1 == hash2
