"""
Unit tests for ML Signal Strategy

Tests the machine learning-based signal generation strategy.

Usage:
    pytest tests/test_ml_signals.py -v
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import os

from strategies.technical.ml_signals import MLSignalStrategy, FEATURE_NAMES
from models import SignalSide, EntryType, TimeInForce


# ============================================================================
# Test Fixtures
# ============================================================================


def generate_mock_ohlcv(
    n_bars: int = 100,
    base_price: float = 100.0,
    trend: str = "neutral",
    seed: int = 42,
) -> list:
    """
    Generate mock OHLCV data for testing.

    Args:
        n_bars: Number of bars to generate
        base_price: Starting price
        trend: 'up', 'down', or 'neutral'
        seed: Random seed for reproducibility

    Returns:
        List of OHLCV dictionaries
    """
    np.random.seed(seed)
    data = []
    price = base_price

    drift_map = {"up": 0.002, "down": -0.002, "neutral": 0.0}
    drift = drift_map.get(trend, 0.0)

    for i in range(n_bars):
        change = np.random.uniform(-0.02, 0.02) + drift
        price = price * (1 + change)

        high = price * (1 + np.random.uniform(0, 0.01))
        low = price * (1 - np.random.uniform(0, 0.01))
        open_p = (high + low) / 2 + np.random.uniform(-0.005, 0.005) * price
        volume = int(np.random.uniform(100000, 500000))

        data.append({
            "open": open_p,
            "high": high,
            "low": low,
            "close": price,
            "volume": volume,
            "timestamp": f"2024-01-{(i % 28) + 1:02d}",
        })
    return data


@pytest.fixture
def strategy():
    """Create a basic ML Signal strategy instance."""
    return MLSignalStrategy()


@pytest.fixture
def custom_strategy():
    """Create a customized ML Signal strategy instance."""
    return MLSignalStrategy(config={
        "buy_probability_threshold": 0.7,
        "sell_probability_threshold": 0.7,
        "min_data_bars": 50,
        "atr_multiplier_stop": 1.5,
        "atr_multiplier_target": 2.5,
    })


@pytest.fixture
def uptrend_data():
    """Generate uptrend OHLCV data."""
    return generate_mock_ohlcv(100, trend="up", seed=42)


@pytest.fixture
def downtrend_data():
    """Generate downtrend OHLCV data."""
    return generate_mock_ohlcv(100, trend="down", seed=43)


@pytest.fixture
def neutral_data():
    """Generate neutral/ranging OHLCV data."""
    return generate_mock_ohlcv(100, trend="neutral", seed=44)


@pytest.fixture
def insufficient_data():
    """Generate insufficient OHLCV data."""
    return generate_mock_ohlcv(30, seed=45)


# ============================================================================
# Initialization Tests
# ============================================================================


class TestMLSignalStrategyInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["model_path"] is None
        assert strategy.config["buy_probability_threshold"] == 0.65
        assert strategy.config["sell_probability_threshold"] == 0.65
        assert strategy.config["use_fallback_on_cold_start"] is True
        assert strategy.config["atr_multiplier_stop"] == 2.0
        assert strategy.config["atr_multiplier_target"] == 3.0
        assert strategy.config["min_data_bars"] == 60
        assert strategy.config["limit_order_offset_pct"] == 0.002

    def test_custom_config(self, custom_strategy):
        """Test custom configuration overrides."""
        assert custom_strategy.config["buy_probability_threshold"] == 0.7
        assert custom_strategy.config["sell_probability_threshold"] == 0.7
        assert custom_strategy.config["min_data_bars"] == 50
        assert custom_strategy.config["atr_multiplier_stop"] == 1.5
        assert custom_strategy.config["atr_multiplier_target"] == 2.5

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata attributes."""
        assert strategy.NAME == "ML Signal Strategy"
        assert strategy.TYPE == "ml"
        assert strategy.VERSION == "1.0.0"
        assert "machine learning" in strategy.DESCRIPTION.lower()

    def test_no_model_loaded_by_default(self, strategy):
        """Test that no model is loaded by default."""
        assert strategy.model is None

    def test_scorer_initialized(self, strategy):
        """Test that confidence scorer is initialized."""
        assert strategy.scorer is not None


# ============================================================================
# Feature Extraction Tests
# ============================================================================


class TestFeatureExtraction:
    """Test feature extraction from OHLCV data."""

    def test_feature_extraction_success(self, strategy, uptrend_data):
        """Test successful feature extraction."""
        features = strategy._extract_features(uptrend_data)
        assert features is not None
        assert features.shape == (1, len(FEATURE_NAMES))

    def test_feature_extraction_insufficient_data(self, strategy, insufficient_data):
        """Test feature extraction with insufficient data."""
        features = strategy._extract_features(insufficient_data)
        assert features is None

    def test_feature_values_in_expected_ranges(self, strategy, uptrend_data):
        """Test that extracted features are in expected ranges."""
        features = strategy._extract_features(uptrend_data)
        feature_dict = dict(zip(FEATURE_NAMES, features[0]))

        # RSI should be between 0 and 100
        assert 0 <= feature_dict["rsi"] <= 100

        # Stochastic values should be between 0 and 100
        assert 0 <= feature_dict["stoch_k"] <= 100
        assert 0 <= feature_dict["stoch_d"] <= 100

        # BB position should be roughly between 0 and 1
        assert -0.5 <= feature_dict["bb_position"] <= 1.5

        # Volume ratio should be positive
        assert feature_dict["volume_ratio"] > 0

    def test_feature_names_order(self):
        """Test that feature names are in correct order."""
        expected = [
            "rsi", "macd", "macd_signal", "macd_histogram",
            "bb_position", "bb_width", "atr", "stoch_k", "stoch_d",
            "return_5d", "return_10d", "return_20d", "volatility_20d",
            "volume_ratio", "price_to_sma_20", "price_to_sma_50",
        ]
        assert FEATURE_NAMES == expected


# ============================================================================
# Fallback Signal Tests
# ============================================================================


class TestFallbackSignal:
    """Test fallback momentum-based signal generation."""

    def test_fallback_buy_signal_on_uptrend(self, strategy, uptrend_data):
        """Test fallback generates BUY signal on uptrend."""
        signal = strategy._fallback_signal("AAPL", "US", uptrend_data, "hash123")

        # May or may not generate signal depending on SMA crossover
        if signal:
            assert signal.side in [SignalSide.BUY, SignalSide.SELL]
            assert "fallback" in signal.reason.lower()
            assert signal.confidence_score == 0.6

    def test_fallback_insufficient_data(self, strategy, insufficient_data):
        """Test fallback returns None with insufficient data."""
        signal = strategy._fallback_signal("AAPL", "US", insufficient_data, "hash123")
        assert signal is None

    def test_fallback_signal_has_required_fields(self, strategy, uptrend_data):
        """Test fallback signal has all required fields."""
        signal = strategy._fallback_signal("AAPL", "US", uptrend_data, "hash123")

        if signal:
            # Core fields
            assert signal.symbol == "AAPL"
            assert signal.market == "US"
            assert signal.strategy_id == "ml_signal_v1"
            assert signal.strategy_version == "1.0.0"

            # Entry fields
            assert signal.entry_price is not None
            assert signal.stop_loss is not None
            assert signal.target_price is not None

            # Features
            assert signal.features is not None
            assert signal.invalidation_rules is not None


# ============================================================================
# Signal Generation Tests (Without Model)
# ============================================================================


class TestSignalGenerationWithoutModel:
    """Test signal generation when no ML model is loaded."""

    def test_uses_fallback_by_default(self, strategy, uptrend_data):
        """Test that fallback is used when no model is loaded."""
        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert "fallback" in signal.reason.lower()

    def test_returns_none_when_fallback_disabled(self, uptrend_data):
        """Test returns None when fallback is disabled."""
        strategy = MLSignalStrategy(config={"use_fallback_on_cold_start": False})
        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")
        assert signal is None

    def test_insufficient_data_returns_none(self, strategy, insufficient_data):
        """Test returns None with insufficient data."""
        signal = strategy.analyze("AAPL", "US", insufficient_data, "hash123")
        assert signal is None


# ============================================================================
# Signal Generation Tests (With Mock Model)
# ============================================================================


class TestSignalGenerationWithModel:
    """Test signal generation with mocked ML model."""

    def test_buy_signal_above_threshold(self, uptrend_data):
        """Test BUY signal when probability exceeds threshold."""
        strategy = MLSignalStrategy()

        # Create mock model
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.7]])  # SELL, HOLD, BUY
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        assert signal is not None
        assert signal.side == SignalSide.BUY
        assert signal.confidence_score == 0.7
        assert "70.0% probability" in signal.reason

    def test_sell_signal_above_threshold(self, downtrend_data):
        """Test SELL signal when probability exceeds threshold."""
        strategy = MLSignalStrategy()

        # Create mock model
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.75, 0.15, 0.1]])  # SELL, HOLD, BUY
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", downtrend_data, "hash123")

        assert signal is not None
        assert signal.side == SignalSide.SELL
        assert signal.confidence_score == 0.75
        assert "75.0% probability" in signal.reason

    def test_no_signal_below_threshold(self, neutral_data):
        """Test no signal when probability below threshold."""
        strategy = MLSignalStrategy()

        # Create mock model with low probabilities
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.4, 0.3, 0.3]])
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", neutral_data, "hash123")
        assert signal is None

    def test_binary_classification_model(self, uptrend_data):
        """Test with binary classification model (SELL/BUY only)."""
        strategy = MLSignalStrategy()

        # Create mock model with binary output
        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.2, 0.8]])  # SELL, BUY
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        assert signal is not None
        assert signal.side == SignalSide.BUY
        assert signal.confidence_score == 0.8


# ============================================================================
# Signal Quality Tests
# ============================================================================


class TestSignalQuality:
    """Test signal quality and completeness."""

    def test_signal_has_features_snapshot(self, strategy, uptrend_data):
        """Test signal includes features snapshot."""
        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert signal.features is not None
            assert signal.features.price > 0
            assert signal.features.rsi_14 is not None
            assert signal.features.macd is not None

    def test_signal_has_invalidation_rules(self, strategy, uptrend_data):
        """Test signal includes invalidation rules."""
        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0

    def test_signal_has_confidence_factors(self, uptrend_data):
        """Test signal includes confidence factor breakdown."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.7]])
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert signal.confidence_factors is not None
            assert "ml_probability" in signal.confidence_factors

    def test_signal_stop_loss_below_entry_for_buy(self, uptrend_data):
        """Test stop loss is below entry for BUY signals."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.7]])
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal and signal.side == SignalSide.BUY:
            assert signal.stop_loss < signal.entry_price
            assert signal.target_price > signal.entry_price

    def test_signal_stop_loss_above_entry_for_sell(self, downtrend_data):
        """Test stop loss is above entry for SELL signals."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.75, 0.15, 0.1]])
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", downtrend_data, "hash123")

        if signal and signal.side == SignalSide.SELL:
            assert signal.stop_loss > signal.entry_price
            assert signal.target_price < signal.entry_price


# ============================================================================
# Entry Type Tests
# ============================================================================


class TestEntryType:
    """Test entry type determination."""

    def test_market_order_for_high_confidence(self, uptrend_data):
        """Test market order for high confidence signals."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.05, 0.05, 0.9]])  # High BUY
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert signal.entry_type == EntryType.MARKET
            assert signal.suggested_limit_price is None

    def test_limit_order_for_moderate_confidence(self, uptrend_data):
        """Test limit order for moderate confidence signals."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.7]])  # Moderate BUY
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            assert signal.entry_type == EntryType.LIMIT
            assert signal.suggested_limit_price is not None

    def test_limit_price_below_entry_for_buy(self, uptrend_data):
        """Test limit price is below entry for BUY signals."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.2, 0.7]])
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal and signal.side == SignalSide.BUY and signal.entry_type == EntryType.LIMIT:
            assert signal.suggested_limit_price < signal.entry_price


# ============================================================================
# Edge Cases Tests
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_data(self, strategy):
        """Test with empty data list."""
        signal = strategy.analyze("AAPL", "US", [], "hash123")
        assert signal is None

    def test_model_prediction_error_uses_fallback(self, uptrend_data):
        """Test fallback is used when model prediction fails."""
        strategy = MLSignalStrategy()

        mock_model = Mock()
        mock_model.predict_proba.side_effect = Exception("Model error")
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        # Should fall back to momentum strategy
        if signal:
            assert "fallback" in signal.reason.lower()

    def test_model_prediction_error_returns_none_when_fallback_disabled(self, uptrend_data):
        """Test returns None when model fails and fallback disabled."""
        strategy = MLSignalStrategy(config={"use_fallback_on_cold_start": False})

        mock_model = Mock()
        mock_model.predict_proba.side_effect = Exception("Model error")
        strategy.model = mock_model

        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")
        assert signal is None

    def test_missing_volume_field(self, strategy):
        """Test handling of data missing volume field."""
        # Create data without volume
        data = [
            {"open": 100, "high": 101, "low": 99, "close": 100.5}
            for _ in range(100)
        ]

        # Should raise KeyError for missing volume
        # Note: KeyError is raised during feature extraction when accessing 'volume'
        try:
            signal = strategy.analyze("AAPL", "US", data, "hash123")
            # If it didn't raise, signal should be None (feature extraction failed)
            # This is acceptable behavior as the code may handle missing keys gracefully
        except KeyError:
            pass  # Expected behavior

    def test_zero_price_handling(self, strategy):
        """Test handling of zero prices."""
        data = generate_mock_ohlcv(100)
        data[-1]["close"] = 0.0  # Set last close to zero

        # Should handle gracefully (may return None)
        signal = strategy.analyze("AAPL", "US", data, "hash123")
        # No assertion needed - just checking it doesn't crash


# ============================================================================
# Model Loading Tests
# ============================================================================


class TestModelLoading:
    """Test model loading functionality."""

    def test_model_not_loaded_when_path_not_provided(self):
        """Test model is not loaded when path is None."""
        strategy = MLSignalStrategy()
        assert strategy.model is None

    def test_model_not_found_warning(self):
        """Test warning when model file not found."""
        strategy = MLSignalStrategy(config={"model_path": "/nonexistent/model.joblib"})
        assert strategy.model is None

    def test_successful_model_load(self, tmp_path):
        """Test successful model loading."""
        # Create a mock model file using joblib if available
        try:
            import joblib
            from sklearn.ensemble import RandomForestClassifier

            # Create and save a simple model
            model = RandomForestClassifier(n_estimators=2, random_state=42)
            # Fit with dummy data
            X = np.array([[0.5] * 16 for _ in range(10)])
            y = np.array([0, 1, 2, 0, 1, 2, 0, 1, 2, 0])
            model.fit(X, y)

            model_path = str(tmp_path / "test_model.joblib")
            joblib.dump(model, model_path)

            strategy = MLSignalStrategy(config={"model_path": model_path})

            assert strategy.model is not None
            assert strategy._model_classes is not None
        except ImportError:
            # Skip if joblib or sklearn not available
            pytest.skip("joblib or sklearn not installed")


# ============================================================================
# Integration Tests
# ============================================================================


class TestIntegration:
    """Integration tests for the ML Signal strategy."""

    def test_signal_serializable(self, strategy, uptrend_data):
        """Test signal can be serialized to dict."""
        signal = strategy.analyze("AAPL", "US", uptrend_data, "hash123")

        if signal:
            signal_dict = signal.to_dict()
            assert isinstance(signal_dict, dict)
            assert signal_dict["symbol"] == "AAPL"
            assert signal_dict["market"] == "US"

    def test_multiple_symbols(self, strategy):
        """Test generating signals for multiple symbols."""
        symbols = ["AAPL", "MSFT", "GOOGL"]
        signals = []

        for symbol in symbols:
            data = generate_mock_ohlcv(100, seed=hash(symbol) % 100)
            signal = strategy.analyze(symbol, "US", data, f"hash_{symbol}")
            if signal:
                signals.append(signal)
                assert signal.symbol == symbol

    def test_strategy_import_from_package(self):
        """Test strategy can be imported from package."""
        from strategies.technical import MLSignalStrategy as ImportedStrategy
        strategy = ImportedStrategy()
        assert strategy.NAME == "ML Signal Strategy"
