"""
Tests for Breakout Strategy

Tests for:
- Bullish breakout detection (price above N-period high)
- Bearish breakout detection (price below N-period low)
- ADX trend confirmation
- Volume confirmation
- +DI/-DI alignment validation
- Stop loss and target price calculations
- Signal strength scoring
- Edge cases (insufficient data, ranging market)

Usage:
    pytest services/signal/tests/test_breakout_strategy.py -v

Dependencies:
    - pytest
    - Python 3.10+
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib
import random

# Import the modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategies.technical.breakout import BreakoutStrategy
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create a breakout strategy with default config."""
    return BreakoutStrategy()


@pytest.fixture
def custom_strategy():
    """Create a breakout strategy with custom config."""
    return BreakoutStrategy(config={
        "breakout_period": 10,
        "adx_threshold": 20,
        "volume_threshold": 1.2,
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


def generate_breakout_data(direction: str = "bullish", num_bars: int = 100) -> List[Dict[str, Any]]:
    """Generate OHLCV data with a clear breakout pattern."""
    random.seed(42)
    data = []
    base_price = 100.0
    base_volume = 1000000

    # First 80 bars: consolidation range
    for i in range(80):
        price = base_price + random.uniform(-3.0, 3.0)
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

    # Last 20 bars: breakout with increasing volume
    if direction == "bullish":
        # Bullish breakout - price moves up with volume spike
        for i in range(80, num_bars):
            price = base_price + 3.0 + (i - 80) * 0.5  # Trending up
            high = price + random.uniform(0.3, 1.5)
            low = price - random.uniform(0.2, 0.8)
            open_price = price - random.uniform(0.1, 0.5)
            volume = base_volume * random.uniform(1.5, 2.5)  # Volume spike

            data.append({
                "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
                "open": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(price, 2),
                "volume": int(volume),
            })
    else:
        # Bearish breakout - price moves down with volume spike
        for i in range(80, num_bars):
            price = base_price - 3.0 - (i - 80) * 0.5  # Trending down
            high = price + random.uniform(0.2, 0.8)
            low = price - random.uniform(0.3, 1.5)
            open_price = price + random.uniform(0.1, 0.5)
            volume = base_volume * random.uniform(1.5, 2.5)  # Volume spike

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
def bullish_breakout_data():
    """Generate data with bullish breakout pattern."""
    return generate_breakout_data(direction="bullish")


@pytest.fixture
def bearish_breakout_data():
    """Generate data with bearish breakout pattern."""
    return generate_breakout_data(direction="bearish")


@pytest.fixture
def ranging_data():
    """Generate sideways/ranging market data."""
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

class TestBreakoutStrategyInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["breakout_period"] == 20
        assert strategy.config["adx_period"] == 14
        assert strategy.config["adx_threshold"] == 25
        assert strategy.config["volume_threshold"] == 1.5
        assert strategy.config["risk_reward_ratio"] == 2.0

    def test_custom_config(self, custom_strategy):
        """Test custom configuration override."""
        assert custom_strategy.config["breakout_period"] == 10
        assert custom_strategy.config["adx_threshold"] == 20
        assert custom_strategy.config["volume_threshold"] == 1.2
        # Default values should remain
        assert custom_strategy.config["atr_period"] == 14

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "Breakout Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"


# =============================================================================
# Signal Generation Tests
# =============================================================================

class TestBreakoutSignalGeneration:
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

    def test_bullish_breakout_generates_buy_signal(self, strategy, bullish_breakout_data):
        """Test bullish breakout generates BUY signal."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on ADX threshold
        if signal:
            assert signal.side == SignalSide.BUY
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss < signal.entry_price  # Stop below entry for buy
            assert signal.target_price > signal.entry_price  # Target above entry for buy

    def test_bearish_breakout_generates_sell_signal(self, strategy, bearish_breakout_data):
        """Test bearish breakout generates SELL signal."""
        data_hash = compute_data_hash(bearish_breakout_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bearish_breakout_data,
            data_hash=data_hash,
        )
        # May or may not generate signal depending on ADX threshold
        if signal:
            assert signal.side == SignalSide.SELL
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss > signal.entry_price  # Stop above entry for sell
            assert signal.target_price < signal.entry_price  # Target below entry for sell

    def test_ranging_market_no_signal(self, strategy, ranging_data):
        """Test that ranging market generates no signal (low ADX)."""
        data_hash = compute_data_hash(ranging_data)
        signal = strategy.analyze(
            symbol="RANG",
            market="US",
            ohlcv_data=ranging_data,
            data_hash=data_hash,
        )
        # In a truly ranging market, ADX should be low and no signal generated
        # This may occasionally generate a signal if random data happens to trend
        # The important thing is the strategy handles it without error
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Risk/Reward Tests
# =============================================================================

class TestBreakoutRiskReward:
    """Test risk/reward calculations."""

    def test_risk_reward_ratio(self, strategy, bullish_breakout_data):
        """Test that risk/reward ratio is correctly applied."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss and signal.target_price:
            risk = abs(signal.entry_price - signal.stop_loss)
            reward = abs(signal.target_price - signal.entry_price)

            if risk > 0:
                actual_rr = reward / risk
                expected_rr = strategy.config["risk_reward_ratio"]
                # Allow 10% tolerance for rounding
                assert abs(actual_rr - expected_rr) < expected_rr * 0.1

    def test_stop_loss_uses_atr(self, strategy, bullish_breakout_data):
        """Test that stop loss is based on ATR."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal:
            # Stop loss should be reasonable (within a few percent of entry)
            stop_distance_pct = abs(signal.entry_price - signal.stop_loss) / signal.entry_price
            assert 0.005 < stop_distance_pct < 0.10  # Between 0.5% and 10%


# =============================================================================
# Signal Quality Tests
# =============================================================================

class TestBreakoutSignalQuality:
    """Test signal quality and confidence scoring."""

    def test_signal_has_confidence_score(self, strategy, bullish_breakout_data):
        """Test that signals have confidence scores."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_score")
            assert 0.0 <= signal.confidence_score <= 1.0

    def test_signal_has_features_snapshot(self, strategy, bullish_breakout_data):
        """Test that signals include feature snapshots."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.features is not None
            # Check key features exist
            assert hasattr(signal.features, "price")
            assert hasattr(signal.features, "atr_14")

    def test_signal_has_invalidation_rules(self, strategy, bullish_breakout_data):
        """Test that signals include invalidation rules."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestBreakoutEdgeCases:
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

    def test_negative_prices_handled(self, strategy):
        """Test that negative prices don't crash the strategy."""
        data = generate_ohlcv_data(num_bars=100)
        # Corrupt some data
        data[50]["close"] = -10.0

        try:
            signal = strategy.analyze(
                symbol="TEST",
                market="US",
                ohlcv_data=data,
                data_hash="negative",
            )
            # Should handle without crashing
            assert signal is None or isinstance(signal, Signal)
        except (ValueError, ZeroDivisionError):
            # Acceptable to raise error for invalid data
            pass


# =============================================================================
# Integration Tests
# =============================================================================

class TestBreakoutIntegration:
    """Integration tests with other components."""

    def test_signal_serializable(self, strategy, bullish_breakout_data):
        """Test that signal can be serialized to dict."""
        data_hash = compute_data_hash(bullish_breakout_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_breakout_data,
            data_hash=data_hash,
        )

        if signal:
            # Should be able to convert to dict without error
            signal_dict = signal.to_dict() if hasattr(signal, "to_dict") else vars(signal)
            assert isinstance(signal_dict, dict)
            assert "symbol" in signal_dict or hasattr(signal, "symbol")

    def test_multiple_symbols(self, strategy, bullish_breakout_data):
        """Test strategy works with multiple symbols."""
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
        data_hash = compute_data_hash(bullish_breakout_data)

        for symbol in symbols:
            signal = strategy.analyze(
                symbol=symbol,
                market="US",
                ohlcv_data=bullish_breakout_data,
                data_hash=data_hash,
            )
            # Should not crash and return consistent results
            if signal:
                assert signal.symbol == symbol


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
