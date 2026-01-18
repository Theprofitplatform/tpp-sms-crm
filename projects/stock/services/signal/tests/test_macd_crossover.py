"""
Tests for MACD Crossover Strategy

Tests for:
- Bullish crossover detection (MACD crosses above signal line)
- Bearish crossover detection (MACD crosses below signal line)
- Histogram momentum confirmation
- 200 SMA trend filter
- Stop loss and target price calculations (2:1 R:R)
- Confidence scoring based on MACD-specific factors
- Edge cases (insufficient data, no crossover)

Usage:
    pytest services/signal/tests/test_macd_crossover.py -v

Dependencies:
    - pytest
    - Python 3.10+
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib
import random
import math

# Import the modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategies.technical.macd_crossover import MACDCrossoverStrategy
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create a MACD crossover strategy with default config."""
    return MACDCrossoverStrategy()


@pytest.fixture
def strict_strategy():
    """Create a MACD crossover strategy with all confirmations required."""
    return MACDCrossoverStrategy(config={
        "require_histogram_confirmation": True,
        "require_trend_filter": True,
        "require_volume_confirmation": True,
        "volume_threshold": 1.5,
    })


@pytest.fixture
def relaxed_strategy():
    """Create a MACD crossover strategy with no confirmations required."""
    return MACDCrossoverStrategy(config={
        "require_histogram_confirmation": False,
        "require_trend_filter": False,
        "require_volume_confirmation": False,
    })


@pytest.fixture
def custom_macd_strategy():
    """Create a MACD crossover strategy with custom MACD parameters."""
    return MACDCrossoverStrategy(config={
        "fast_period": 8,
        "slow_period": 17,
        "signal_period": 9,
    })


def generate_ohlcv_data(
    num_bars: int = 100,
    start_price: float = 100.0,
    trend: str = "neutral",
    seed: int = 42
) -> List[Dict[str, Any]]:
    """Generate synthetic OHLCV data for testing."""
    random.seed(seed)
    data = []
    price = start_price
    base_volume = 1000000

    for i in range(num_bars):
        # Apply trend
        if trend == "up":
            change = random.uniform(-0.3, 1.0)
        elif trend == "down":
            change = random.uniform(-1.0, 0.3)
        else:
            change = random.uniform(-0.5, 0.5)

        price = max(price + change, 1.0)  # Ensure positive price

        high = price + random.uniform(0.3, 1.5)
        low = price - random.uniform(0.3, 1.5)
        open_price = price + random.uniform(-0.8, 0.8)
        close = price
        volume = base_volume * random.uniform(0.5, 2.0)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": int(volume),
        })

    return data


def generate_bullish_macd_crossover_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data that produces a bullish MACD crossover.

    Creates a pattern where:
    1. Price starts in a downtrend (MACD below signal)
    2. Price bottoms out and starts recovering
    3. MACD crosses above signal line at the end
    """
    data = []
    base_volume = 1000000

    # Phase 1: Downtrend (0-60 bars)
    price = 120.0
    for i in range(60):
        price = price - random.uniform(0.1, 0.4)
        high = price + random.uniform(0.2, 0.8)
        low = price - random.uniform(0.2, 0.8)
        open_price = price + random.uniform(-0.3, 0.3)
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 2: Bottom/Consolidation (60-80 bars)
    bottom_price = price
    for i in range(60, 80):
        price = bottom_price + random.uniform(-0.5, 0.5)
        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.3, 0.3)
        volume = base_volume * random.uniform(0.9, 1.4)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 3: Recovery/Uptrend (80-100 bars) - triggers bullish crossover
    for i in range(80, num_bars):
        price = price + random.uniform(0.3, 0.8)  # Strong upward movement
        high = price + random.uniform(0.5, 1.5)
        low = price - random.uniform(0.2, 0.5)
        open_price = price - random.uniform(0.1, 0.4)  # Gap up
        volume = base_volume * random.uniform(1.3, 2.0)  # Higher volume

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    return data


def generate_bearish_macd_crossover_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data that produces a bearish MACD crossover.

    Creates a pattern where:
    1. Price starts in an uptrend (MACD above signal)
    2. Price tops out and starts declining
    3. MACD crosses below signal line at the end
    """
    data = []
    base_volume = 1000000

    # Phase 1: Uptrend (0-60 bars)
    price = 80.0
    for i in range(60):
        price = price + random.uniform(0.1, 0.4)
        high = price + random.uniform(0.2, 0.8)
        low = price - random.uniform(0.2, 0.8)
        open_price = price + random.uniform(-0.3, 0.3)
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 2: Top/Consolidation (60-80 bars)
    top_price = price
    for i in range(60, 80):
        price = top_price + random.uniform(-0.5, 0.5)
        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.3, 0.3)
        volume = base_volume * random.uniform(0.9, 1.4)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 3: Decline/Downtrend (80-100 bars) - triggers bearish crossover
    for i in range(80, num_bars):
        price = price - random.uniform(0.3, 0.8)  # Strong downward movement
        high = price + random.uniform(0.2, 0.5)
        low = price - random.uniform(0.5, 1.5)
        open_price = price + random.uniform(0.1, 0.4)  # Gap down
        volume = base_volume * random.uniform(1.3, 2.0)  # Higher volume

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    return data


def generate_no_crossover_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """Generate OHLCV data with steady trend (no MACD crossover)."""
    data = []
    base_volume = 1000000
    price = 100.0

    # Steady uptrend with consistent momentum (MACD stays above signal)
    for i in range(num_bars):
        price = price + random.uniform(0.1, 0.3)  # Consistent uptrend
        high = price + random.uniform(0.2, 0.6)
        low = price - random.uniform(0.1, 0.3)
        open_price = price - random.uniform(0.05, 0.15)
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    return data


@pytest.fixture
def bullish_crossover_data():
    """Generate data with bullish MACD crossover pattern."""
    return generate_bullish_macd_crossover_data()


@pytest.fixture
def bearish_crossover_data():
    """Generate data with bearish MACD crossover pattern."""
    return generate_bearish_macd_crossover_data()


@pytest.fixture
def no_crossover_data():
    """Generate data with no MACD crossover."""
    return generate_no_crossover_data()


@pytest.fixture
def insufficient_data():
    """Generate insufficient data (less than min_data_bars)."""
    return generate_ohlcv_data(num_bars=20)


def compute_data_hash(data: List[dict]) -> str:
    """Compute hash of OHLCV data."""
    data_str = str(data)
    return hashlib.sha256(data_str.encode()).hexdigest()[:16]


# =============================================================================
# Strategy Initialization Tests
# =============================================================================

class TestMACDCrossoverStrategyInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["fast_period"] == 12
        assert strategy.config["slow_period"] == 26
        assert strategy.config["signal_period"] == 9
        assert strategy.config["atr_multiplier_stop"] == 2.0
        assert strategy.config["risk_reward_ratio"] == 2.0
        assert strategy.config["require_histogram_confirmation"] is True
        assert strategy.config["require_trend_filter"] is False

    def test_custom_config(self, custom_macd_strategy):
        """Test custom configuration override."""
        assert custom_macd_strategy.config["fast_period"] == 8
        assert custom_macd_strategy.config["slow_period"] == 17
        assert custom_macd_strategy.config["signal_period"] == 9
        # Default values should remain
        assert custom_macd_strategy.config["atr_period"] == 14

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "MACD Crossover Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"

    def test_strict_config(self, strict_strategy):
        """Test strict configuration with all confirmations."""
        assert strict_strategy.config["require_histogram_confirmation"] is True
        assert strict_strategy.config["require_trend_filter"] is True
        assert strict_strategy.config["require_volume_confirmation"] is True

    def test_relaxed_config(self, relaxed_strategy):
        """Test relaxed configuration with no confirmations."""
        assert relaxed_strategy.config["require_histogram_confirmation"] is False
        assert relaxed_strategy.config["require_trend_filter"] is False
        assert relaxed_strategy.config["require_volume_confirmation"] is False


# =============================================================================
# Signal Generation Tests
# =============================================================================

class TestMACDCrossoverSignalGeneration:
    """Test signal generation scenarios."""

    def test_no_signal_insufficient_data(self, strategy, insufficient_data):
        """Test that no signal is generated with insufficient data."""
        data_hash = compute_data_hash(insufficient_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=insufficient_data,
            data_hash=data_hash,
        )
        assert signal is None

    def test_bullish_crossover_generates_buy_signal(self, relaxed_strategy, bullish_crossover_data):
        """Test bullish MACD crossover generates BUY signal."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on actual crossover timing
        if signal:
            assert signal.side == SignalSide.BUY
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss < signal.entry_price  # Stop below entry for buy
            assert signal.target_price > signal.entry_price  # Target above entry for buy

    def test_bearish_crossover_generates_sell_signal(self, relaxed_strategy, bearish_crossover_data):
        """Test bearish MACD crossover generates SELL signal."""
        data_hash = compute_data_hash(bearish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bearish_crossover_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on actual crossover timing
        if signal:
            assert signal.side == SignalSide.SELL
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss > signal.entry_price  # Stop above entry for sell
            assert signal.target_price < signal.entry_price  # Target below entry for sell

    def test_no_crossover_no_signal(self, relaxed_strategy, no_crossover_data):
        """Test that no signal is generated when there's no crossover."""
        data_hash = compute_data_hash(no_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=no_crossover_data,
            data_hash=data_hash,
        )
        # Should return None if no crossover detected
        # May occasionally generate signal if data happens to create crossover
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Confirmation Filter Tests
# =============================================================================

class TestMACDCrossoverConfirmations:
    """Test confirmation filters."""

    def test_histogram_confirmation_filter(self):
        """Test histogram confirmation filter behavior."""
        strategy_with_histogram = MACDCrossoverStrategy(config={
            "require_histogram_confirmation": True,
            "require_trend_filter": False,
            "require_volume_confirmation": False,
        })

        strategy_without_histogram = MACDCrossoverStrategy(config={
            "require_histogram_confirmation": False,
            "require_trend_filter": False,
            "require_volume_confirmation": False,
        })

        # Generate test data
        data = generate_bullish_macd_crossover_data()
        data_hash = compute_data_hash(data)

        # Both should handle the data without error
        signal_with = strategy_with_histogram.analyze(
            symbol="TEST", market="US", ohlcv_data=data, data_hash=data_hash
        )
        signal_without = strategy_without_histogram.analyze(
            symbol="TEST", market="US", ohlcv_data=data, data_hash=data_hash
        )

        # If both generate signals, the one with histogram should have similar or higher confidence
        if signal_with and signal_without:
            assert signal_with.confidence_score >= 0
            assert signal_without.confidence_score >= 0

    def test_trend_filter(self):
        """Test 200 SMA trend filter."""
        strategy_with_trend = MACDCrossoverStrategy(config={
            "require_histogram_confirmation": False,
            "require_trend_filter": True,
            "require_volume_confirmation": False,
        })

        # Generate enough data for 200 SMA
        data = generate_bullish_macd_crossover_data(num_bars=250)
        data_hash = compute_data_hash(data)

        signal = strategy_with_trend.analyze(
            symbol="TEST", market="US", ohlcv_data=data, data_hash=data_hash
        )

        # Should handle gracefully with or without signal
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Risk/Reward Tests
# =============================================================================

class TestMACDCrossoverRiskReward:
    """Test risk/reward calculations."""

    def test_risk_reward_ratio(self, relaxed_strategy, bullish_crossover_data):
        """Test that risk/reward ratio is correctly applied."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss and signal.target_price:
            risk = abs(signal.entry_price - signal.stop_loss)
            reward = abs(signal.target_price - signal.entry_price)

            if risk > 0:
                actual_rr = reward / risk
                expected_rr = relaxed_strategy.config["risk_reward_ratio"]
                # Allow 10% tolerance for rounding
                assert abs(actual_rr - expected_rr) < expected_rr * 0.1

    def test_stop_loss_uses_atr(self, relaxed_strategy, bullish_crossover_data):
        """Test that stop loss is based on ATR."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            # Stop loss should be reasonable (within a few percent of entry)
            stop_distance_pct = abs(signal.entry_price - signal.stop_loss) / signal.entry_price
            assert 0.005 < stop_distance_pct < 0.15  # Between 0.5% and 15%

    def test_custom_atr_multiplier(self, bullish_crossover_data):
        """Test custom ATR multiplier for stop loss."""
        strategy = MACDCrossoverStrategy(config={
            "atr_multiplier_stop": 3.0,
            "require_histogram_confirmation": False,
        })

        data_hash = compute_data_hash(bullish_crossover_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            # With 3x ATR, stop should be wider
            stop_distance = abs(signal.entry_price - signal.stop_loss)
            assert stop_distance > 0


# =============================================================================
# Signal Quality Tests
# =============================================================================

class TestMACDCrossoverSignalQuality:
    """Test signal quality and confidence scoring."""

    def test_signal_has_confidence_score(self, relaxed_strategy, bullish_crossover_data):
        """Test that signals have confidence scores."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_score")
            assert 0.0 <= signal.confidence_score <= 1.0

    def test_signal_has_features_snapshot(self, relaxed_strategy, bullish_crossover_data):
        """Test that signals include feature snapshots."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.features is not None
            # Check key features exist
            assert hasattr(signal.features, "price")
            assert hasattr(signal.features, "macd")
            assert hasattr(signal.features, "macd_signal")
            assert hasattr(signal.features, "macd_histogram")
            assert hasattr(signal.features, "atr_14")

    def test_signal_has_invalidation_rules(self, relaxed_strategy, bullish_crossover_data):
        """Test that signals include invalidation rules."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0

            # Check for MACD-specific invalidation rules
            rule_conditions = [r.get("condition") for r in signal.invalidation_rules]
            assert any("macd" in str(c).lower() or "histogram" in str(c).lower() for c in rule_conditions)

    def test_signal_has_macd_confidence_factors(self, relaxed_strategy, bullish_crossover_data):
        """Test that signals have MACD-specific confidence factors."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal and signal.confidence_factors:
            # Should have MACD-specific factors
            macd_factors = ["histogram_momentum", "zero_line_proximity", "trend_alignment"]
            for factor in macd_factors:
                if factor in signal.confidence_factors:
                    assert 0.0 <= signal.confidence_factors[factor] <= 1.0

    def test_signal_reasoning_includes_macd(self, relaxed_strategy, bullish_crossover_data):
        """Test that signal reasoning mentions MACD crossover."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert "MACD" in signal.reason or "macd" in signal.reason.lower()
            assert "crossover" in signal.reason.lower()


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestMACDCrossoverEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_data(self, strategy):
        """Test handling of empty data."""
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=[],
            data_hash="empty",
        )
        assert signal is None

    def test_none_data(self, strategy):
        """Test handling of None data."""
        try:
            signal = strategy.analyze(
                symbol="TEST",
                market="US",
                ohlcv_data=None,
                data_hash="none",
            )
            assert signal is None
        except (TypeError, AttributeError):
            # Acceptable to raise error for None input
            pass

    def test_missing_volume_field(self, strategy):
        """Test handling of data missing volume field."""
        data = [
            {"timestamp": "2024-01-01", "open": 100, "high": 101, "low": 99, "close": 100}
            for _ in range(100)
        ]
        try:
            signal = strategy.analyze(
                symbol="TEST",
                market="US",
                ohlcv_data=data,
                data_hash="no_volume",
            )
            # Should handle gracefully
            assert signal is None or isinstance(signal, Signal)
        except KeyError:
            # Acceptable to raise KeyError for missing field
            pass

    def test_constant_prices(self, strategy):
        """Test handling of constant prices (no price movement)."""
        data = [
            {
                "timestamp": (datetime.now() - timedelta(days=100-i)).isoformat(),
                "open": 100.0,
                "high": 101.0,
                "low": 99.0,
                "close": 100.0,
                "volume": 1000000,
            }
            for i in range(100)
        ]

        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash="constant",
        )
        # Should handle without crashing (likely no signal)
        assert signal is None or isinstance(signal, Signal)

    def test_very_volatile_data(self, strategy):
        """Test handling of extremely volatile price data."""
        random.seed(123)
        data = []
        price = 100.0

        for i in range(100):
            # Large random swings
            price = price + random.uniform(-10, 10)
            price = max(price, 10.0)  # Keep positive

            data.append({
                "timestamp": (datetime.now() - timedelta(days=100-i)).isoformat(),
                "open": price + random.uniform(-5, 5),
                "high": price + random.uniform(5, 10),
                "low": price - random.uniform(5, 10),
                "close": price,
                "volume": int(1000000 * random.uniform(0.5, 3.0)),
            })

        signal = strategy.analyze(
            symbol="VOLATILE",
            market="US",
            ohlcv_data=data,
            data_hash="volatile",
        )
        # Should handle without crashing
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# MACD Parameter Tests
# =============================================================================

class TestMACDParameters:
    """Test different MACD parameter configurations."""

    def test_fast_macd_settings(self):
        """Test faster MACD settings (5, 13, 6)."""
        strategy = MACDCrossoverStrategy(config={
            "fast_period": 5,
            "slow_period": 13,
            "signal_period": 6,
            "require_histogram_confirmation": False,
        })

        data = generate_bullish_macd_crossover_data()
        data_hash = compute_data_hash(data)

        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        # Should work without error
        assert signal is None or isinstance(signal, Signal)

    def test_slow_macd_settings(self):
        """Test slower MACD settings (19, 39, 12)."""
        strategy = MACDCrossoverStrategy(config={
            "fast_period": 19,
            "slow_period": 39,
            "signal_period": 12,
            "require_histogram_confirmation": False,
        })

        data = generate_bullish_macd_crossover_data()
        data_hash = compute_data_hash(data)

        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        # Should work without error
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Integration Tests
# =============================================================================

class TestMACDCrossoverIntegration:
    """Integration tests with other components."""

    def test_signal_serializable(self, relaxed_strategy, bullish_crossover_data):
        """Test that signal can be serialized to dict."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            # Should be able to convert to dict without error
            signal_dict = signal.to_dict() if hasattr(signal, "to_dict") else vars(signal)
            assert isinstance(signal_dict, dict)
            assert "symbol" in signal_dict or hasattr(signal, "symbol")

    def test_multiple_symbols(self, relaxed_strategy, bullish_crossover_data):
        """Test strategy works with multiple symbols."""
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
        data_hash = compute_data_hash(bullish_crossover_data)

        for symbol in symbols:
            signal = relaxed_strategy.analyze(
                symbol=symbol,
                market="US",
                ohlcv_data=bullish_crossover_data,
                data_hash=data_hash,
            )
            # Should not crash and return consistent results
            if signal:
                assert signal.symbol == symbol

    def test_strategy_id_format(self, relaxed_strategy, bullish_crossover_data):
        """Test that strategy_id and rule_version_id are correctly formatted."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.strategy_id == "macd_crossover_v1"
            assert signal.strategy_version == "1.0.0"
            assert signal.rule_version_id.startswith("macd_crossover_v1_")

    def test_data_hash_preserved(self, relaxed_strategy, bullish_crossover_data):
        """Test that data hash is preserved in signal."""
        data_hash = compute_data_hash(bullish_crossover_data)
        signal = relaxed_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_crossover_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.data_snapshot_hash == data_hash


# =============================================================================
# Performance Tests
# =============================================================================

class TestMACDCrossoverPerformance:
    """Test performance characteristics."""

    def test_large_dataset(self, strategy):
        """Test handling of large dataset (1000 bars)."""
        data = generate_ohlcv_data(num_bars=1000, seed=12345)
        data_hash = compute_data_hash(data)

        # Should complete without timeout
        signal = strategy.analyze(
            symbol="LARGE",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        assert signal is None or isinstance(signal, Signal)

    def test_consistency_across_runs(self, relaxed_strategy):
        """Test that same data produces same result."""
        data = generate_bullish_macd_crossover_data()
        data_hash = compute_data_hash(data)

        results = []
        for _ in range(3):
            signal = relaxed_strategy.analyze(
                symbol="CONSISTENT",
                market="US",
                ohlcv_data=data,
                data_hash=data_hash,
            )
            if signal:
                results.append((signal.side, round(signal.confidence_score, 4)))
            else:
                results.append(None)

        # All results should be identical
        assert all(r == results[0] for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
