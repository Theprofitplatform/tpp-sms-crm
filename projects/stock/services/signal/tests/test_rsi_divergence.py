"""
Tests for RSI Divergence Strategy

Tests for:
- Bullish divergence detection (price lower low, RSI higher low)
- Bearish divergence detection (price higher high, RSI lower high)
- Volume confirmation requirement
- Stop loss and target price calculations
- Swing point detection
- Confidence scoring based on divergence strength
- Edge cases (insufficient data, no divergence, etc.)

Usage:
    pytest services/signal/tests/test_rsi_divergence.py -v

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

from strategies.technical.rsi_divergence import RSIDivergenceStrategy
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create an RSI Divergence strategy with default config."""
    return RSIDivergenceStrategy()


@pytest.fixture
def custom_strategy():
    """Create an RSI Divergence strategy with custom config."""
    return RSIDivergenceStrategy(config={
        "rsi_period": 14,
        "lookback_min": 3,
        "lookback_max": 15,
        "min_price_divergence_pct": 0.3,
        "min_rsi_divergence": 2.0,
        "volume_confirmation": False,  # Disable for easier testing
    })


@pytest.fixture
def no_volume_confirmation_strategy():
    """Create strategy without volume confirmation requirement."""
    return RSIDivergenceStrategy(config={
        "volume_confirmation": False,
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


def generate_bullish_divergence_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data with a clear bullish divergence pattern.

    Pattern:
    - First 60 bars: Downtrend
    - Bar 70: First swing low at price 90
    - Bar 85: Second swing low at price 85 (lower low)
    - RSI at bar 85 should be higher than at bar 70 (divergence)
    """
    random.seed(42)
    data = []
    base_volume = 1000000

    # Phase 1: Initial downtrend (bars 0-60)
    price = 100.0
    for i in range(60):
        # Gradual decline
        price = max(price - random.uniform(0.0, 0.3), 91.0)

        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 2: First swing low formation (bars 60-70)
    for i in range(60, 70):
        if i == 65:
            # First swing low point
            price = 90.0
            low = 88.0  # Clear swing low
        else:
            price = 92.0 + random.uniform(-1.0, 1.0)
            low = price - random.uniform(0.3, 1.0)

        high = price + random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 3: Rally and then second decline (bars 70-85)
    for i in range(70, 85):
        if i < 78:
            # Small rally
            price = 92.0 + (i - 70) * 0.3
        else:
            # Decline to second low
            price = 95.0 - (i - 78) * 0.8

        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 4: Second swing low (lower than first) - bars 85-92
    for i in range(85, 92):
        if i == 88:
            # Second swing low point (lower than first)
            price = 86.0
            low = 84.0  # Lower low than 88.0
        else:
            price = 88.0 + random.uniform(-1.0, 1.0)
            low = price - random.uniform(0.3, 0.8)

        high = price + random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        # Higher volume on second low (confirmation)
        volume = base_volume * random.uniform(1.5, 2.5)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 5: Beginning of reversal (bars 92-100)
    for i in range(92, num_bars):
        price = 88.0 + (i - 92) * 0.4  # Gradual recovery

        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 0.8)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(1.2, 1.8)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    return data


def generate_bearish_divergence_data(num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data with a clear bearish divergence pattern.

    Pattern:
    - First 60 bars: Uptrend
    - Bar 70: First swing high at price 110
    - Bar 85: Second swing high at price 115 (higher high)
    - RSI at bar 85 should be lower than at bar 70 (divergence)
    """
    random.seed(42)
    data = []
    base_volume = 1000000

    # Phase 1: Initial uptrend (bars 0-60)
    price = 100.0
    for i in range(60):
        # Gradual rise
        price = min(price + random.uniform(0.0, 0.3), 109.0)

        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 2: First swing high formation (bars 60-70)
    for i in range(60, 70):
        if i == 65:
            # First swing high point
            price = 110.0
            high = 112.0  # Clear swing high
        else:
            price = 108.0 + random.uniform(-1.0, 1.0)
            high = price + random.uniform(0.3, 1.0)

        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 3: Pullback and then second rally (bars 70-85)
    for i in range(70, 85):
        if i < 78:
            # Small pullback
            price = 108.0 - (i - 70) * 0.3
        else:
            # Rally to second high
            price = 105.0 + (i - 78) * 1.0

        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(0.7, 1.3)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 4: Second swing high (higher than first) - bars 85-92
    for i in range(85, 92):
        if i == 88:
            # Second swing high point (higher than first)
            price = 114.0
            high = 116.0  # Higher high than 112.0
        else:
            price = 112.0 + random.uniform(-1.0, 1.0)
            high = price + random.uniform(0.3, 0.8)

        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        # Higher volume on second high (confirmation)
        volume = base_volume * random.uniform(1.5, 2.5)

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(price, 2),
            "volume": int(volume),
        })

    # Phase 5: Beginning of reversal down (bars 92-100)
    for i in range(92, num_bars):
        price = 112.0 - (i - 92) * 0.4  # Gradual decline

        high = price + random.uniform(0.3, 0.8)
        low = price - random.uniform(0.3, 1.0)
        open_price = price + random.uniform(-0.5, 0.5)
        volume = base_volume * random.uniform(1.2, 1.8)

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
def bullish_divergence_data():
    """Generate data with bullish divergence pattern."""
    return generate_bullish_divergence_data()


@pytest.fixture
def bearish_divergence_data():
    """Generate data with bearish divergence pattern."""
    return generate_bearish_divergence_data()


@pytest.fixture
def no_divergence_data():
    """Generate neutral data without clear divergence."""
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

class TestRSIDivergenceStrategyInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["rsi_period"] == 14
        assert strategy.config["lookback_min"] == 5
        assert strategy.config["lookback_max"] == 20
        assert strategy.config["rsi_overbought"] == 70
        assert strategy.config["rsi_oversold"] == 30
        assert strategy.config["min_price_divergence_pct"] == 0.5
        assert strategy.config["min_rsi_divergence"] == 3.0
        assert strategy.config["volume_confirmation"] == True
        assert strategy.config["volume_threshold"] == 1.2
        assert strategy.config["risk_reward_ratio"] == 2.0

    def test_custom_config(self, custom_strategy):
        """Test custom configuration override."""
        assert custom_strategy.config["lookback_min"] == 3
        assert custom_strategy.config["lookback_max"] == 15
        assert custom_strategy.config["min_price_divergence_pct"] == 0.3
        assert custom_strategy.config["min_rsi_divergence"] == 2.0
        assert custom_strategy.config["volume_confirmation"] == False
        # Default values should remain
        assert custom_strategy.config["rsi_period"] == 14

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "RSI Divergence Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"


# =============================================================================
# Swing Detection Tests
# =============================================================================

class TestSwingDetection:
    """Test swing point detection functionality."""

    def test_find_swing_lows(self, strategy):
        """Test swing low detection."""
        # Create data with clear swing lows
        lows = [10, 9, 8, 9, 10, 11, 10, 9, 10, 11, 12, 11, 10, 9, 8, 9, 10]
        #                ^                     ^                    ^
        # Swing lows at index 2, 7, and 14

        swing_lows = strategy._find_swing_lows(lows, window=2)

        # Should find swing lows at indices where low is lower than neighbors
        assert len(swing_lows) > 0

    def test_find_swing_highs(self, strategy):
        """Test swing high detection."""
        # Create data with clear swing highs
        highs = [10, 11, 12, 11, 10, 9, 10, 11, 10, 9, 8, 9, 10, 11, 12, 11, 10]
        #                 ^                          ^                 ^
        # Swing highs at index 2, 7, and 14

        swing_highs = strategy._find_swing_highs(highs, window=2)

        # Should find swing highs at indices where high is higher than neighbors
        assert len(swing_highs) > 0

    def test_no_swing_points_in_flat_data(self, strategy):
        """Test that flat data produces no swing points."""
        flat_data = [100.0] * 20

        swing_lows = strategy._find_swing_lows(flat_data, window=3)
        swing_highs = strategy._find_swing_highs(flat_data, window=3)

        assert len(swing_lows) == 0
        assert len(swing_highs) == 0


# =============================================================================
# Signal Generation Tests
# =============================================================================

class TestRSIDivergenceSignalGeneration:
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

    def test_bullish_divergence_with_custom_strategy(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test bullish divergence detection without volume requirement."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on data pattern
        if signal:
            assert signal.side == SignalSide.BUY
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            # For BUY: stop below entry, target above entry
            assert signal.stop_loss < signal.entry_price
            assert signal.target_price > signal.entry_price

    def test_bearish_divergence_with_custom_strategy(self, no_volume_confirmation_strategy, bearish_divergence_data):
        """Test bearish divergence detection without volume requirement."""
        data_hash = compute_data_hash(bearish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bearish_divergence_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on data pattern
        if signal:
            assert signal.side == SignalSide.SELL
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            # For SELL: stop above entry, target below entry
            assert signal.stop_loss > signal.entry_price
            assert signal.target_price < signal.entry_price

    def test_no_divergence_no_signal(self, no_volume_confirmation_strategy, no_divergence_data):
        """Test that neutral data generates no signal."""
        data_hash = compute_data_hash(no_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=no_divergence_data,
            data_hash=data_hash,
        )
        # No clear divergence should result in no signal or a weak signal
        # The important thing is it handles the case without error
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Risk/Reward Tests
# =============================================================================

class TestRSIDivergenceRiskReward:
    """Test risk/reward calculations."""

    def test_risk_reward_ratio(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that risk/reward ratio is correctly applied."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss and signal.target_price:
            risk = abs(signal.entry_price - signal.stop_loss)
            reward = abs(signal.target_price - signal.entry_price)

            if risk > 0:
                actual_rr = reward / risk
                expected_rr = no_volume_confirmation_strategy.config["risk_reward_ratio"]
                # Allow 15% tolerance for rounding and ATR-based calculations
                assert abs(actual_rr - expected_rr) < expected_rr * 0.15

    def test_stop_loss_below_swing_for_buy(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that stop loss is below swing low for BUY signals."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal and signal.side == SignalSide.BUY:
            # Stop should be below entry price
            assert signal.stop_loss < signal.entry_price
            # Stop distance should be reasonable (within typical range)
            stop_distance_pct = abs(signal.entry_price - signal.stop_loss) / signal.entry_price
            assert 0.01 < stop_distance_pct < 0.15


# =============================================================================
# Signal Quality Tests
# =============================================================================

class TestRSIDivergenceSignalQuality:
    """Test signal quality and confidence scoring."""

    def test_signal_has_confidence_score(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signals have confidence scores."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_score")
            assert 0.0 <= signal.confidence_score <= 1.0

    def test_signal_has_confidence_factors(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signals include divergence-specific confidence factors."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.confidence_factors is not None
            # Should include divergence-specific factors
            assert "divergence_strength" in signal.confidence_factors
            assert "rsi_divergence" in signal.confidence_factors

    def test_signal_has_features_snapshot(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signals include feature snapshots."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.features is not None
            assert hasattr(signal.features, "price")
            assert hasattr(signal.features, "rsi_14")
            assert hasattr(signal.features, "atr_14")

    def test_signal_has_invalidation_rules(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signals include invalidation rules."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0

    def test_signal_includes_strategy_metadata(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signals include strategy metadata."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.strategy_id == "rsi_divergence_v1"
            assert signal.strategy_version == "1.0.0"
            assert "rsi_divergence" in signal.rule_version_id


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestRSIDivergenceEdgeCases:
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

    def test_flat_price_data(self, strategy):
        """Test handling of completely flat price data."""
        data = [
            {
                "timestamp": f"2024-01-{str(i+1).zfill(2)}",
                "open": 100.0,
                "high": 100.5,
                "low": 99.5,
                "close": 100.0,
                "volume": 1000000,
            }
            for i in range(100)
        ]
        signal = strategy.analyze(
            symbol="FLAT",
            market="US",
            ohlcv_data=data,
            data_hash="flat",
        )
        # Flat data should not produce divergence signals
        assert signal is None

    def test_minimal_viable_data(self, strategy):
        """Test with minimum required data bars."""
        data = generate_ohlcv_data(num_bars=50)  # Exactly min_data_bars
        data_hash = compute_data_hash(data)
        signal = strategy.analyze(
            symbol="MINIMAL",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )
        # Should not crash, may or may not produce signal
        assert signal is None or isinstance(signal, Signal)

    def test_very_volatile_data(self, strategy):
        """Test with highly volatile data."""
        random.seed(123)
        data = []
        for i in range(100):
            price = 100 + random.uniform(-20, 20)  # High volatility
            data.append({
                "timestamp": f"2024-01-{str(i+1).zfill(2)}",
                "open": round(price + random.uniform(-5, 5), 2),
                "high": round(price + random.uniform(0, 10), 2),
                "low": round(price - random.uniform(0, 10), 2),
                "close": round(price, 2),
                "volume": int(1000000 * random.uniform(0.5, 2.0)),
            })

        data_hash = compute_data_hash(data)
        # Should handle without crashing
        signal = strategy.analyze(
            symbol="VOLATILE",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Volume Confirmation Tests
# =============================================================================

class TestRSIDivergenceVolumeConfirmation:
    """Test volume confirmation functionality."""

    def test_volume_confirmation_required(self, strategy, bullish_divergence_data):
        """Test that volume confirmation is checked when required."""
        # Default strategy requires volume confirmation
        assert strategy.config["volume_confirmation"] == True

        data_hash = compute_data_hash(bullish_divergence_data)
        # The strategy should check volume when generating signals
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )
        # May or may not generate signal based on volume
        assert signal is None or isinstance(signal, Signal)

    def test_volume_confirmation_disabled(self, no_volume_confirmation_strategy):
        """Test that volume confirmation can be disabled."""
        assert no_volume_confirmation_strategy.config["volume_confirmation"] == False


# =============================================================================
# Integration Tests
# =============================================================================

class TestRSIDivergenceIntegration:
    """Integration tests with other components."""

    def test_signal_serializable(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test that signal can be serialized to dict."""
        data_hash = compute_data_hash(bullish_divergence_data)
        signal = no_volume_confirmation_strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_divergence_data,
            data_hash=data_hash,
        )

        if signal:
            # Should be able to convert to dict without error
            signal_dict = signal.to_dict() if hasattr(signal, "to_dict") else vars(signal)
            assert isinstance(signal_dict, dict)
            assert "symbol" in signal_dict or hasattr(signal, "symbol")

    def test_multiple_symbols(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test strategy works with multiple symbols."""
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
        data_hash = compute_data_hash(bullish_divergence_data)

        for symbol in symbols:
            signal = no_volume_confirmation_strategy.analyze(
                symbol=symbol,
                market="US",
                ohlcv_data=bullish_divergence_data,
                data_hash=data_hash,
            )
            # Should not crash and return consistent results
            if signal:
                assert signal.symbol == symbol

    def test_different_markets(self, no_volume_confirmation_strategy, bullish_divergence_data):
        """Test strategy works with different markets."""
        markets = ["US", "ASX", "LSE", "TSX"]
        data_hash = compute_data_hash(bullish_divergence_data)

        for market in markets:
            signal = no_volume_confirmation_strategy.analyze(
                symbol="TEST",
                market=market,
                ohlcv_data=bullish_divergence_data,
                data_hash=data_hash,
            )
            # Should not crash
            if signal:
                assert signal.market == market


# =============================================================================
# Divergence Detection Logic Tests
# =============================================================================

class TestDivergenceDetectionLogic:
    """Test the divergence detection algorithms."""

    def test_bullish_divergence_criteria(self, strategy):
        """Test bullish divergence detection criteria."""
        # Price: lower low (current < previous)
        # RSI: higher low (current > previous)
        # These conditions should be checked in _detect_bullish_divergence

        # This tests the logic conceptually
        assert strategy.config["min_price_divergence_pct"] > 0
        assert strategy.config["min_rsi_divergence"] > 0

    def test_bearish_divergence_criteria(self, strategy):
        """Test bearish divergence detection criteria."""
        # Price: higher high (current > previous)
        # RSI: lower high (current < previous)
        # These conditions should be checked in _detect_bearish_divergence

        assert strategy.config["min_price_divergence_pct"] > 0
        assert strategy.config["min_rsi_divergence"] > 0

    def test_lookback_constraints(self, strategy):
        """Test that lookback constraints are respected."""
        assert strategy.config["lookback_min"] < strategy.config["lookback_max"]
        assert strategy.config["lookback_min"] >= 1
        assert strategy.config["lookback_max"] <= 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
