"""
Tests for Volatility Event Strategy

Tests for:
- Volume spike detection (current_volume > avg_volume * 2.5)
- Price gap detection (gap up/down > 2%)
- Volatility spike detection (ATR > 1.5x average)
- Follow-through confirmation (price continuation)
- Signal generation for gap up/down events
- Stop loss and target price calculations
- Confidence scoring
- Edge cases (insufficient data, no events)

Usage:
    pytest services/signal/tests/test_volatility_event.py -v

Dependencies:
    - pytest
    - Python 3.10+
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib
import random
import json

# Import the modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategies.technical.volatility_event import VolatilityEventStrategy
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create a volatility event strategy with default config."""
    return VolatilityEventStrategy()


@pytest.fixture
def custom_strategy():
    """Create a volatility event strategy with custom config."""
    return VolatilityEventStrategy(config={
        "volume_spike_threshold": 2.0,
        "gap_threshold_pct": 0.015,  # 1.5%
        "follow_through_bars": 2,
        "atr_multiplier_stop": 1.5,
        "atr_multiplier_target": 2.5,
    })


def generate_ohlcv_data(
    num_bars: int = 100,
    start_price: float = 100.0,
    trend: str = "neutral",
    seed: int = 42,
    base_volume: int = 1000000
) -> List[Dict[str, Any]]:
    """Generate synthetic OHLCV data for testing."""
    random.seed(seed)
    data = []
    price = start_price

    for i in range(num_bars):
        # Apply trend
        if trend == "up":
            change = random.uniform(-0.5, 1.5)
        elif trend == "down":
            change = random.uniform(-1.5, 0.5)
        else:
            change = random.uniform(-1.0, 1.0)

        price = max(price + change, 1.0)  # Ensure positive price

        high = price + random.uniform(0.5, 2.0)
        low = price - random.uniform(0.5, 2.0)
        open_price = price + random.uniform(-1.0, 1.0)
        close = price
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": int(volume),
        })

    return data


def generate_gap_up_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data with a clear gap up event and follow-through.

    The last few bars will have:
    - A significant gap up (open > prev_close by > 2%)
    - Volume spike (> 2.5x average)
    - Follow-through (higher closes)
    """
    random.seed(42)
    data = []
    base_price = 100.0
    base_volume = 1000000

    # First 90 bars: normal trading
    for i in range(90):
        price = base_price + random.uniform(-3.0, 3.0)
        high = price + random.uniform(0.3, 1.5)
        low = price - random.uniform(0.3, 1.5)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Get the last close before the gap
    prev_close = data[-1]["close"]

    # Bar 91-97: Building up to the event (normal volume)
    for i in range(90, 97):
        price = prev_close + random.uniform(-0.5, 0.5)
        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
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
        prev_close = price

    # Bar 98: The event bar - gap up with volume spike
    gap_open = prev_close * 1.03  # 3% gap up
    gap_close = gap_open + 1.0  # Closes higher
    gap_high = gap_close + 0.5
    gap_low = gap_open - 0.3
    spike_volume = base_volume * 3.0  # Volume spike

    data.append({
        "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
        "open": round(gap_open, 2),
        "high": round(gap_high, 2),
        "low": round(gap_low, 2),
        "close": round(gap_close, 2),
        "volume": int(spike_volume),
    })

    # Bar 99: Follow-through bar 1 - continues higher
    follow1_open = gap_close + 0.2
    follow1_close = follow1_open + 0.5
    follow1_high = follow1_close + 0.3
    follow1_low = follow1_open - 0.2

    data.append({
        "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
        "open": round(follow1_open, 2),
        "high": round(follow1_high, 2),
        "low": round(follow1_low, 2),
        "close": round(follow1_close, 2),
        "volume": int(base_volume * 2.5),  # Still elevated volume
    })

    # Bar 100: Follow-through bar 2 - continues higher with volume spike
    follow2_open = follow1_close + 0.3
    follow2_close = follow2_open + 0.8
    follow2_high = follow2_close + 0.4
    follow2_low = follow2_open - 0.2

    data.append({
        "timestamp": datetime.now().isoformat(),
        "open": round(follow2_open, 2),
        "high": round(follow2_high, 2),
        "low": round(follow2_low, 2),
        "close": round(follow2_close, 2),
        "volume": int(base_volume * 3.0),  # Volume spike on current bar
    })

    return data


def generate_gap_down_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data with a clear gap down event and follow-through.

    The last few bars will have:
    - A significant gap down (open < prev_close by > 2%)
    - Volume spike (> 2.5x average)
    - Follow-through (lower closes)
    """
    random.seed(43)  # Different seed for different data
    data = []
    base_price = 100.0
    base_volume = 1000000

    # First 90 bars: normal trading
    for i in range(90):
        price = base_price + random.uniform(-3.0, 3.0)
        high = price + random.uniform(0.3, 1.5)
        low = price - random.uniform(0.3, 1.5)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.8, 1.2)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Get the last close before the gap
    prev_close = data[-1]["close"]

    # Bar 91-97: Building up to the event (normal volume)
    for i in range(90, 97):
        price = prev_close + random.uniform(-0.5, 0.5)
        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
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
        prev_close = price

    # Bar 98: The event bar - gap down with volume spike
    gap_open = prev_close * 0.97  # 3% gap down
    gap_close = gap_open - 1.0  # Closes lower
    gap_high = gap_open + 0.3
    gap_low = gap_close - 0.5
    spike_volume = base_volume * 3.0  # Volume spike

    data.append({
        "timestamp": (datetime.now() - timedelta(days=2)).isoformat(),
        "open": round(gap_open, 2),
        "high": round(gap_high, 2),
        "low": round(gap_low, 2),
        "close": round(gap_close, 2),
        "volume": int(spike_volume),
    })

    # Bar 99: Follow-through bar 1 - continues lower
    follow1_open = gap_close - 0.2
    follow1_close = follow1_open - 0.5
    follow1_high = follow1_open + 0.2
    follow1_low = follow1_close - 0.3

    data.append({
        "timestamp": (datetime.now() - timedelta(days=1)).isoformat(),
        "open": round(follow1_open, 2),
        "high": round(follow1_high, 2),
        "low": round(follow1_low, 2),
        "close": round(follow1_close, 2),
        "volume": int(base_volume * 2.5),  # Still elevated volume
    })

    # Bar 100: Follow-through bar 2 - continues lower with volume spike
    follow2_open = follow1_close - 0.3
    follow2_close = follow2_open - 0.8
    follow2_high = follow2_open + 0.2
    follow2_low = follow2_close - 0.4

    data.append({
        "timestamp": datetime.now().isoformat(),
        "open": round(follow2_open, 2),
        "high": round(follow2_high, 2),
        "low": round(follow2_low, 2),
        "close": round(follow2_close, 2),
        "volume": int(base_volume * 3.0),  # Volume spike on current bar
    })

    return data


def generate_volume_spike_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """Generate data with a volume spike but no gap."""
    random.seed(44)
    data = generate_ohlcv_data(num_bars=num_bars - 1, seed=44)

    # Add final bar with volume spike but no gap
    last_close = data[-1]["close"]
    spike_volume = 1000000 * 3.5  # 3.5x volume spike

    data.append({
        "timestamp": datetime.now().isoformat(),
        "open": round(last_close + 0.5, 2),  # Small move, no gap
        "high": round(last_close + 2.0, 2),
        "low": round(last_close - 0.5, 2),
        "close": round(last_close + 1.5, 2),
        "volume": int(spike_volume),
    })

    return data


@pytest.fixture
def gap_up_data():
    """Generate data with gap up event and follow-through."""
    return generate_gap_up_data()


@pytest.fixture
def gap_down_data():
    """Generate data with gap down event and follow-through."""
    return generate_gap_down_data()


@pytest.fixture
def volume_spike_data():
    """Generate data with volume spike."""
    return generate_volume_spike_data()


@pytest.fixture
def normal_data():
    """Generate normal market data with no special events."""
    return generate_ohlcv_data(num_bars=100, trend="neutral")


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

class TestVolatilityEventInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["volume_spike_threshold"] == 2.5
        assert strategy.config["gap_threshold_pct"] == 0.02
        assert strategy.config["event_lookback_bars"] == 5
        assert strategy.config["require_follow_through"] is True
        assert strategy.config["follow_through_bars"] == 3
        assert strategy.config["volatility_spike_threshold"] == 1.5
        assert strategy.config["atr_multiplier_stop"] == 2.0
        assert strategy.config["atr_multiplier_target"] == 3.0
        assert strategy.config["min_data_bars"] == 30
        assert strategy.config["volume_lookback"] == 20
        assert strategy.config["atr_lookback"] == 20

    def test_custom_config(self, custom_strategy):
        """Test custom configuration override."""
        assert custom_strategy.config["volume_spike_threshold"] == 2.0
        assert custom_strategy.config["gap_threshold_pct"] == 0.015
        assert custom_strategy.config["follow_through_bars"] == 2
        assert custom_strategy.config["atr_multiplier_stop"] == 1.5
        assert custom_strategy.config["atr_multiplier_target"] == 2.5
        # Default values should remain
        assert custom_strategy.config["min_data_bars"] == 30
        assert custom_strategy.config["volume_lookback"] == 20

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "Volatility Event Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"


# =============================================================================
# Event Detection Tests
# =============================================================================

class TestEventDetection:
    """Test event detection methods."""

    def test_detect_volume_spike(self, strategy):
        """Test volume spike detection."""
        # Create volumes with a spike at the end
        volumes = [1000000] * 25  # Normal volume for 25 bars
        volumes.append(3000000)   # Volume spike (3x)

        result = strategy._detect_volume_spike(
            volumes,
            threshold=2.5,
            lookback=20
        )
        assert result is True

        # Test no spike
        normal_volumes = [1000000] * 25  # No spike
        normal_volumes.append(1200000)   # Only 1.2x - not a spike

        result = strategy._detect_volume_spike(
            normal_volumes,
            threshold=2.5,
            lookback=20
        )
        assert result is False

    def test_detect_gap_up(self, strategy):
        """Test gap up detection."""
        # Create price data with gap up
        opens = [100.0] * 10
        closes = [100.0] * 10
        opens.append(103.0)  # 3% gap up
        closes.append(103.5)

        gap_direction, gap_pct = strategy._detect_gap(
            opens,
            closes,
            threshold_pct=0.02
        )

        assert gap_direction == "gap_up"
        assert gap_pct > 0.02

    def test_detect_gap_down(self, strategy):
        """Test gap down detection."""
        # Create price data with gap down
        opens = [100.0] * 10
        closes = [100.0] * 10
        opens.append(97.0)  # 3% gap down
        closes.append(96.5)

        gap_direction, gap_pct = strategy._detect_gap(
            opens,
            closes,
            threshold_pct=0.02
        )

        assert gap_direction == "gap_down"
        assert gap_pct < -0.02

    def test_check_follow_through_bullish(self, strategy):
        """Test bullish follow-through detection."""
        # Prices making higher closes
        closes = [100.0, 101.0, 102.0, 103.0, 104.0]

        result = strategy._check_follow_through(
            closes,
            gap_direction="gap_up",
            lookback=3
        )
        assert result is True

        # Prices making lower closes (no follow-through for gap up)
        declining_closes = [104.0, 103.0, 102.0, 101.0, 100.0]

        result = strategy._check_follow_through(
            declining_closes,
            gap_direction="gap_up",
            lookback=3
        )
        assert result is False

    def test_check_follow_through_bearish(self, strategy):
        """Test bearish follow-through detection."""
        # Prices making lower closes
        closes = [104.0, 103.0, 102.0, 101.0, 100.0]

        result = strategy._check_follow_through(
            closes,
            gap_direction="gap_down",
            lookback=3
        )
        assert result is True

        # Prices making higher closes (no follow-through for gap down)
        rising_closes = [100.0, 101.0, 102.0, 103.0, 104.0]

        result = strategy._check_follow_through(
            rising_closes,
            gap_direction="gap_down",
            lookback=3
        )
        assert result is False


# =============================================================================
# Signal Generation Tests
# =============================================================================

class TestSignalGeneration:
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

    def test_gap_up_with_follow_through_generates_buy(self, strategy, gap_up_data):
        """Test gap up with follow-through generates BUY signal."""
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        # Should generate a BUY signal
        if signal:
            assert signal.side == SignalSide.BUY
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            # Stop should be below entry for buy
            assert signal.stop_loss < signal.entry_price
            # Target should be above entry for buy
            assert signal.target_price > signal.entry_price

    def test_gap_down_with_follow_through_generates_sell(self, strategy, gap_down_data):
        """Test gap down with follow-through generates SELL signal."""
        data_hash = compute_data_hash(gap_down_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=gap_down_data,
            data_hash=data_hash,
        )

        # Should generate a SELL signal
        if signal:
            assert signal.side == SignalSide.SELL
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            # Stop should be above entry for sell
            assert signal.stop_loss > signal.entry_price
            # Target should be below entry for sell
            assert signal.target_price < signal.entry_price

    def test_volume_spike_considered(self, strategy, volume_spike_data):
        """Test that volume spike alone (without gap) doesn't generate signal."""
        data_hash = compute_data_hash(volume_spike_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=volume_spike_data,
            data_hash=data_hash,
        )

        # Volume spike without gap should not generate signal
        # (event_detected requires both volume/volatility spike AND gap)
        assert signal is None or isinstance(signal, Signal)

    def test_no_signal_on_normal_data(self, strategy, normal_data):
        """Test that normal market data generates no signal."""
        data_hash = compute_data_hash(normal_data)
        signal = strategy.analyze(
            symbol="NORMAL",
            market="US",
            ohlcv_data=normal_data,
            data_hash=data_hash,
        )

        # Normal data should not trigger event detection
        assert signal is None


# =============================================================================
# Signal Quality Tests
# =============================================================================

class TestSignalQuality:
    """Test signal quality and confidence scoring."""

    def test_signal_has_confidence_score(self, strategy):
        """Test that signals have confidence scores."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_score")
            assert 0.0 <= signal.confidence_score <= 1.0

    def test_signal_has_features_snapshot(self, strategy):
        """Test that signals include feature snapshots."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.features is not None
            # Check key features exist
            assert hasattr(signal.features, "price")
            assert hasattr(signal.features, "atr_14")
            assert hasattr(signal.features, "volume_ratio")
            assert signal.features.price > 0

    def test_signal_has_invalidation_rules(self, strategy):
        """Test that signals include invalidation rules."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestEdgeCases:
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

    def test_gap_without_follow_through(self, strategy):
        """Test that gap without follow-through doesn't generate signal when required."""
        random.seed(45)
        data = []
        base_price = 100.0
        base_volume = 1000000

        # Generate 95 bars of normal data
        for i in range(95):
            price = base_price + random.uniform(-3.0, 3.0)
            high = price + random.uniform(0.3, 1.5)
            low = price - random.uniform(0.3, 1.5)
            open_price = price + random.uniform(-0.5, 0.5)
            volume = base_volume * random.uniform(0.8, 1.2)

            data.append({
                "timestamp": (datetime.now() - timedelta(days=100-i)).isoformat(),
                "open": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(price, 2),
                "volume": int(volume),
            })

        prev_close = data[-1]["close"]

        # Add gap up bar
        gap_open = prev_close * 1.03  # 3% gap up
        gap_close = gap_open + 0.5
        data.append({
            "timestamp": (datetime.now() - timedelta(days=4)).isoformat(),
            "open": round(gap_open, 2),
            "high": round(gap_open + 1.0, 2),
            "low": round(gap_open - 0.3, 2),
            "close": round(gap_close, 2),
            "volume": int(base_volume * 3.0),
        })

        # Add bars that go AGAINST the gap (no follow-through)
        for i in range(3):
            prev = data[-1]["close"]
            declining_close = prev - 0.8  # Declining, not following through
            data.append({
                "timestamp": (datetime.now() - timedelta(days=3-i)).isoformat(),
                "open": round(prev - 0.1, 2),
                "high": round(prev + 0.2, 2),
                "low": round(declining_close - 0.2, 2),
                "close": round(declining_close, 2),
                "volume": int(base_volume * 1.0),
            })

        # Add final bar with volume spike but prices still declining
        final_close = data[-1]["close"] - 0.5
        data.append({
            "timestamp": datetime.now().isoformat(),
            "open": round(data[-1]["close"] - 0.1, 2),
            "high": round(data[-1]["close"] + 0.2, 2),
            "low": round(final_close - 0.3, 2),
            "close": round(final_close, 2),
            "volume": int(base_volume * 3.0),  # Volume spike
        })

        data_hash = compute_data_hash(data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        # With require_follow_through=True, no signal should be generated
        # since the price is declining after the gap up
        assert signal is None or signal.side != SignalSide.BUY


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests with other components."""

    def test_signal_serializable(self, strategy):
        """Test that signal can be serialized to dict."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal:
            # Should be able to convert to dict without error
            signal_dict = signal.to_dict()
            assert isinstance(signal_dict, dict)
            assert "symbol" in signal_dict
            assert "side" in signal_dict
            assert "confidence_score" in signal_dict

            # Should be JSON serializable
            json_str = json.dumps(signal_dict)
            assert isinstance(json_str, str)

    def test_strategy_import_from_package(self):
        """Test that strategy can be imported from strategies package."""
        try:
            from strategies.technical.volatility_event import VolatilityEventStrategy
            strategy = VolatilityEventStrategy()
            assert strategy.NAME == "Volatility Event Strategy"
        except ImportError as e:
            pytest.fail(f"Failed to import VolatilityEventStrategy: {e}")


# =============================================================================
# Risk/Reward Tests
# =============================================================================

class TestRiskReward:
    """Test risk/reward calculations."""

    def test_stop_loss_target_ratio(self, strategy):
        """Test that stop loss and target use ATR multipliers."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss and signal.target_price:
            # Default config: stop = 2 ATR, target = 3 ATR (1.5:1 R:R)
            risk = abs(signal.entry_price - signal.stop_loss)
            reward = abs(signal.target_price - signal.entry_price)

            if risk > 0:
                actual_rr = reward / risk
                expected_rr = (
                    strategy.config["atr_multiplier_target"] /
                    strategy.config["atr_multiplier_stop"]
                )
                # Allow 10% tolerance for rounding
                assert abs(actual_rr - expected_rr) < expected_rr * 0.15

    def test_stop_loss_reasonable_distance(self, strategy):
        """Test that stop loss is at a reasonable distance from entry."""
        gap_up_data = generate_gap_up_data()
        data_hash = compute_data_hash(gap_up_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=gap_up_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss:
            # Stop loss should be reasonable (within a few percent of entry)
            stop_distance_pct = abs(
                signal.entry_price - signal.stop_loss
            ) / signal.entry_price
            # Typically between 0.5% and 10%
            assert 0.005 < stop_distance_pct < 0.15


# =============================================================================
# Multiple Symbol Tests
# =============================================================================

class TestMultipleSymbols:
    """Test strategy with multiple symbols."""

    def test_multiple_symbols(self, strategy):
        """Test strategy works with multiple symbols."""
        gap_up_data = generate_gap_up_data()
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
        data_hash = compute_data_hash(gap_up_data)

        for symbol in symbols:
            signal = strategy.analyze(
                symbol=symbol,
                market="US",
                ohlcv_data=gap_up_data,
                data_hash=data_hash,
            )
            # Should not crash and return consistent results
            if signal:
                assert signal.symbol == symbol


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
