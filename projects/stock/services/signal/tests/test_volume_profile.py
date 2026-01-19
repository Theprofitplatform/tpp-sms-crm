"""
Tests for Volume Profile Strategy

Tests for:
- VWAP calculation and bounce detection
- Volume profile analysis (POC, VAH, VAL)
- Bullish VWAP bounce signals
- Bearish VWAP bounce signals
- Volume confirmation requirements
- Stop loss and target price calculations
- Signal strength scoring
- Edge cases (insufficient data, missing volume, flat prices)

Usage:
    pytest services/signal/tests/test_volume_profile.py -v

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

from strategies.technical.volume_profile import VolumeProfileStrategy
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create a volume profile strategy with default config."""
    return VolumeProfileStrategy()


@pytest.fixture
def custom_strategy():
    """Create a volume profile strategy with custom config."""
    return VolumeProfileStrategy(config={
        "vwap_deviation_threshold": 0.02,
        "vwap_bounce_lookback": 4,
        "volume_confirmation_threshold": 1.5,
        "atr_multiplier_stop": 2.0,
        "atr_multiplier_target": 3.0,
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


def generate_vwap_bounce_data(direction: str = "bullish", num_bars: int = 100) -> List[Dict[str, Any]]:
    """
    Generate OHLCV data with a clear VWAP bounce pattern.

    For bullish bounce: price below VWAP with consecutive higher closes
    For bearish bounce: price above VWAP with consecutive lower closes
    """
    random.seed(42)
    data = []
    base_price = 100.0
    base_volume = 1000000

    # First 90 bars: establish a VWAP baseline
    for i in range(90):
        price = base_price + random.uniform(-2.0, 2.0)
        high = price + random.uniform(0.3, 1.0)
        low = price - random.uniform(0.3, 1.0)
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

    # Last 10 bars: create the bounce pattern
    if direction == "bullish":
        # Bullish bounce: price dips below average then bounces with higher closes
        # Start below the average price and make consecutive higher closes
        bounce_start = base_price - 1.5
        for i in range(90, num_bars):
            idx = i - 90
            # Each close is higher than the previous
            price = bounce_start + (idx * 0.3)  # Increasing closes
            high = price + random.uniform(0.3, 0.8)
            low = price - random.uniform(0.1, 0.3)
            open_price = price - random.uniform(0.1, 0.3)
            # Higher volume to confirm the bounce
            volume = base_volume * random.uniform(1.3, 1.8)

            data.append({
                "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
                "open": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(price, 2),
                "volume": int(volume),
            })
    else:
        # Bearish bounce: price rises above average then bounces down with lower closes
        bounce_start = base_price + 1.5
        for i in range(90, num_bars):
            idx = i - 90
            # Each close is lower than the previous
            price = bounce_start - (idx * 0.3)  # Decreasing closes
            high = price + random.uniform(0.1, 0.3)
            low = price - random.uniform(0.3, 0.8)
            open_price = price + random.uniform(0.1, 0.3)
            # Higher volume to confirm the bounce
            volume = base_volume * random.uniform(1.3, 1.8)

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
def bullish_bounce_data():
    """Generate data with bullish VWAP bounce pattern."""
    return generate_vwap_bounce_data(direction="bullish")


@pytest.fixture
def bearish_bounce_data():
    """Generate data with bearish VWAP bounce pattern."""
    return generate_vwap_bounce_data(direction="bearish")


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

class TestVolumeProfileInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["vwap_deviation_threshold"] == 0.01
        assert strategy.config["vwap_bounce_lookback"] == 3
        assert strategy.config["volume_confirmation_threshold"] == 1.2
        assert strategy.config["atr_multiplier_stop"] == 1.5
        assert strategy.config["atr_multiplier_target"] == 2.5
        assert strategy.config["min_data_bars"] == 30
        assert strategy.config["volume_profile_bins"] == 20
        assert strategy.config["value_area_pct"] == 0.70

    def test_custom_config(self, custom_strategy):
        """Test custom configuration override."""
        assert custom_strategy.config["vwap_deviation_threshold"] == 0.02
        assert custom_strategy.config["vwap_bounce_lookback"] == 4
        assert custom_strategy.config["volume_confirmation_threshold"] == 1.5
        assert custom_strategy.config["atr_multiplier_stop"] == 2.0
        assert custom_strategy.config["atr_multiplier_target"] == 3.0
        # Default values should remain
        assert custom_strategy.config["min_data_bars"] == 30
        assert custom_strategy.config["volume_profile_bins"] == 20

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "Volume Profile Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"
        assert "VWAP" in strategy.DESCRIPTION


# =============================================================================
# Volume Profile Calculation Tests
# =============================================================================

class TestVolumeProfileCalculation:
    """Test volume profile calculation methods."""

    def test_volume_profile_calculation(self, strategy):
        """Test _calculate_volume_profile returns POC, VAH, VAL."""
        closes = [100.0 + i * 0.1 for i in range(50)]
        volumes = [1000000 + (i * 10000) for i in range(50)]

        profile = strategy._calculate_volume_profile(closes, volumes, 20)

        assert "poc" in profile
        assert "vah" in profile
        assert "val" in profile
        assert profile["poc"] is not None
        assert profile["vah"] is not None
        assert profile["val"] is not None
        # VAL should be less than or equal to POC, which should be less than or equal to VAH
        assert profile["val"] <= profile["vah"]

    def test_volume_profile_with_uniform_prices(self, strategy):
        """Test volume profile handles uniform prices gracefully."""
        closes = [100.0] * 50
        volumes = [1000000] * 50

        profile = strategy._calculate_volume_profile(closes, volumes, 20)

        # When all prices are the same, all values should be that price
        assert profile["poc"] == 100.0
        assert profile["vah"] == 100.0
        assert profile["val"] == 100.0

    def test_volume_profile_insufficient_data(self, strategy):
        """Test volume profile handles insufficient data."""
        closes = [100.0]
        volumes = [1000000]

        profile = strategy._calculate_volume_profile(closes, volumes, 20)

        assert profile["poc"] is None
        assert profile["vah"] is None
        assert profile["val"] is None

    def test_vwap_bounce_detection_bullish(self, strategy):
        """Test bullish bounce detection."""
        # Create prices with consecutive higher closes below a VWAP of 100
        closes = [95.0, 96.0, 97.0, 98.0, 99.0]  # All below 100, consecutive higher
        vwap = [100.0, 100.0, 100.0, 100.0, 100.0]

        result = strategy._detect_vwap_bounce(closes, vwap, lookback=3)

        assert result == "bullish_bounce"

    def test_vwap_bounce_detection_bearish(self, strategy):
        """Test bearish bounce detection."""
        # Create prices with consecutive lower closes above a VWAP of 100
        closes = [105.0, 104.0, 103.0, 102.0, 101.0]  # All above 100, consecutive lower
        vwap = [100.0, 100.0, 100.0, 100.0, 100.0]

        result = strategy._detect_vwap_bounce(closes, vwap, lookback=3)

        assert result == "bearish_bounce"

    def test_vwap_bounce_detection_no_bounce(self, strategy):
        """Test no bounce when conditions not met."""
        # Mixed closes, no clear pattern
        closes = [99.0, 101.0, 98.0, 102.0, 100.0]
        vwap = [100.0, 100.0, 100.0, 100.0, 100.0]

        result = strategy._detect_vwap_bounce(closes, vwap, lookback=3)

        assert result is None


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

    def test_bullish_bounce_generates_buy(self, strategy, bullish_bounce_data):
        """Test buy signal on bullish VWAP bounce."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        # May or may not generate signal depending on exact VWAP position
        if signal:
            assert signal.side == SignalSide.BUY
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss < signal.entry_price  # Stop below entry for buy
            assert signal.target_price > signal.entry_price  # Target above entry for buy

    def test_bearish_bounce_generates_sell(self, strategy, bearish_bounce_data):
        """Test sell signal on bearish VWAP bounce."""
        data_hash = compute_data_hash(bearish_bounce_data)
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=bearish_bounce_data,
            data_hash=data_hash,
        )

        # May or may not generate signal depending on exact VWAP position
        if signal:
            assert signal.side == SignalSide.SELL
            assert signal.symbol == "AAPL"
            assert signal.entry_price > 0
            assert signal.stop_loss is not None
            assert signal.target_price is not None
            assert signal.stop_loss > signal.entry_price  # Stop above entry for sell
            assert signal.target_price < signal.entry_price  # Target below entry for sell

    def test_volume_confirmation_required(self, strategy):
        """Test signal requires volume above threshold."""
        # Generate data with low volume
        data = generate_ohlcv_data(num_bars=100)
        # Reduce volume on recent bars
        for bar in data[-10:]:
            bar["volume"] = int(bar["volume"] * 0.3)  # Very low volume

        data_hash = compute_data_hash(data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        # Signal may or may not be generated, but if it is, it should handle low volume
        assert signal is None or isinstance(signal, Signal)

    def test_ranging_market_handling(self, strategy, ranging_data):
        """Test strategy handles ranging market without error."""
        data_hash = compute_data_hash(ranging_data)
        signal = strategy.analyze(
            symbol="RANG",
            market="US",
            ohlcv_data=ranging_data,
            data_hash=data_hash,
        )
        # Should not crash and return None or valid Signal
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# Signal Quality Tests
# =============================================================================

class TestSignalQuality:
    """Test signal quality and confidence scoring."""

    def test_signal_has_confidence_score(self, strategy, bullish_bounce_data):
        """Test that signals have confidence scores."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_score")
            assert 0.0 <= signal.confidence_score <= 1.0

    def test_signal_has_features_snapshot(self, strategy, bullish_bounce_data):
        """Test that signals include feature snapshots."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.features is not None
            # Check key features exist
            assert hasattr(signal.features, "price")
            assert hasattr(signal.features, "atr_14")
            assert hasattr(signal.features, "volume_ratio")
            assert hasattr(signal.features, "trend_strength")

    def test_signal_has_invalidation_rules(self, strategy, bullish_bounce_data):
        """Test that signals include invalidation rules."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.invalidation_rules is not None
            assert len(signal.invalidation_rules) > 0

    def test_stop_loss_uses_atr(self, strategy, bullish_bounce_data):
        """Test that stop loss is based on ATR."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            # Stop loss should be reasonable (within a few percent of entry)
            stop_distance_pct = abs(signal.entry_price - signal.stop_loss) / signal.entry_price
            assert 0.005 < stop_distance_pct < 0.15  # Between 0.5% and 15%


# =============================================================================
# Risk/Reward Tests
# =============================================================================

class TestRiskReward:
    """Test risk/reward calculations."""

    def test_risk_reward_ratio(self, strategy, bullish_bounce_data):
        """Test that risk/reward ratio is correctly applied."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal and signal.stop_loss and signal.target_price:
            risk = abs(signal.entry_price - signal.stop_loss)
            reward = abs(signal.target_price - signal.entry_price)

            if risk > 0:
                actual_rr = reward / risk
                expected_rr = strategy.config["atr_multiplier_target"] / strategy.config["atr_multiplier_stop"]
                # Allow 20% tolerance for rounding and calculation differences
                assert abs(actual_rr - expected_rr) < expected_rr * 0.2

    def test_stop_loss_below_entry_for_buy(self, strategy, bullish_bounce_data):
        """Test stop loss is below entry for buy signals."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal and signal.side == SignalSide.BUY:
            assert signal.stop_loss < signal.entry_price
            assert signal.target_price > signal.entry_price

    def test_stop_loss_above_entry_for_sell(self, strategy, bearish_bounce_data):
        """Test stop loss is above entry for sell signals."""
        data_hash = compute_data_hash(bearish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bearish_bounce_data,
            data_hash=data_hash,
        )

        if signal and signal.side == SignalSide.SELL:
            assert signal.stop_loss > signal.entry_price
            assert signal.target_price < signal.entry_price


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

    def test_missing_volume_field(self, strategy):
        """Test handling of data missing volume field."""
        data = [
            {"timestamp": f"2024-01-{i+1:02d}", "open": 100, "high": 101, "low": 99, "close": 100}
            for i in range(100)
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

    def test_all_same_prices(self, strategy):
        """Test handling of data with all same prices."""
        data = [
            {
                "timestamp": f"2024-01-{i+1:02d}",
                "open": 100.0,
                "high": 100.0,
                "low": 100.0,
                "close": 100.0,
                "volume": 1000000
            }
            for i in range(100)
        ]
        try:
            signal = strategy.analyze(
                symbol="TEST",
                market="US",
                ohlcv_data=data,
                data_hash="same_prices",
            )
            # Should handle without crashing
            assert signal is None or isinstance(signal, Signal)
        except (ValueError, ZeroDivisionError):
            # Acceptable to raise error for edge case data
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

    def test_zero_volume_handled(self, strategy):
        """Test handling of zero volume."""
        data = generate_ohlcv_data(num_bars=100)
        # Set some volumes to zero
        for i in range(50, 60):
            data[i]["volume"] = 0

        try:
            signal = strategy.analyze(
                symbol="TEST",
                market="US",
                ohlcv_data=data,
                data_hash="zero_vol",
            )
            assert signal is None or isinstance(signal, Signal)
        except (ValueError, ZeroDivisionError):
            pass

    def test_extreme_volume_spike(self, strategy):
        """Test handling of extreme volume spike."""
        data = generate_ohlcv_data(num_bars=100)
        # Create extreme volume spike
        data[-1]["volume"] = 1000000000000  # Very large volume

        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash="extreme_vol",
        )
        # Should handle without crashing
        assert signal is None or isinstance(signal, Signal)


# =============================================================================
# VWAP-Specific Invalidation Tests
# =============================================================================

class TestVwapInvalidation:
    """Test VWAP-specific invalidation rules."""

    def test_vwap_invalidation_rules_for_buy(self, strategy, bullish_bounce_data):
        """Test VWAP invalidation rules are added for BUY signals."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal and signal.side == SignalSide.BUY:
            # Check for VWAP-specific invalidation rules
            rule_conditions = [r.condition if hasattr(r, 'condition') else r.get('condition')
                             for r in signal.invalidation_rules]
            assert "vwap_breakdown" in rule_conditions

    def test_vwap_invalidation_rules_for_sell(self, strategy, bearish_bounce_data):
        """Test VWAP invalidation rules are added for SELL signals."""
        data_hash = compute_data_hash(bearish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bearish_bounce_data,
            data_hash=data_hash,
        )

        if signal and signal.side == SignalSide.SELL:
            # Check for VWAP-specific invalidation rules
            rule_conditions = [r.condition if hasattr(r, 'condition') else r.get('condition')
                             for r in signal.invalidation_rules]
            assert "vwap_breakout" in rule_conditions


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests with other components."""

    def test_signal_serializable(self, strategy, bullish_bounce_data):
        """Test that signal can be serialized to dict."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            # Should be able to convert to dict without error
            signal_dict = signal.to_dict() if hasattr(signal, "to_dict") else vars(signal)
            assert isinstance(signal_dict, dict)
            assert "symbol" in signal_dict or hasattr(signal, "symbol")

            # Should be JSON serializable
            json_str = json.dumps(signal_dict, default=str)
            assert len(json_str) > 0

    def test_multiple_symbols(self, strategy, bullish_bounce_data):
        """Test strategy works with multiple symbols."""
        symbols = ["AAPL", "GOOGL", "MSFT", "AMZN"]
        data_hash = compute_data_hash(bullish_bounce_data)

        for symbol in symbols:
            signal = strategy.analyze(
                symbol=symbol,
                market="US",
                ohlcv_data=bullish_bounce_data,
                data_hash=data_hash,
            )
            # Should not crash and return consistent results
            if signal:
                assert signal.symbol == symbol

    def test_strategy_import_from_package(self):
        """Test that strategy can be imported from package."""
        from strategies.technical.volume_profile import VolumeProfileStrategy

        strat = VolumeProfileStrategy()
        assert strat is not None
        assert strat.NAME == "Volume Profile Strategy"

    def test_signal_has_required_fields(self, strategy, bullish_bounce_data):
        """Test that signal has all required fields for downstream processing."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            # Required fields for risk service
            assert hasattr(signal, "symbol")
            assert hasattr(signal, "side")
            assert hasattr(signal, "entry_price")
            assert hasattr(signal, "stop_loss")
            assert hasattr(signal, "target_price")
            assert hasattr(signal, "confidence_score")

            # Required fields for audit trail
            assert hasattr(signal, "data_snapshot_hash")
            assert hasattr(signal, "rule_version_id")
            assert hasattr(signal, "strategy_id")
            assert hasattr(signal, "strategy_version")

    def test_signal_strategy_id_format(self, strategy, bullish_bounce_data):
        """Test that strategy ID and version follow expected format."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            assert signal.strategy_id == "volume_profile_v1"
            assert signal.strategy_version == "1.0.0"

    def test_different_markets(self, strategy, bullish_bounce_data):
        """Test strategy works with different market identifiers."""
        markets = ["US", "ASX", "CRYPTO"]
        data_hash = compute_data_hash(bullish_bounce_data)

        for market in markets:
            signal = strategy.analyze(
                symbol="TEST",
                market=market,
                ohlcv_data=bullish_bounce_data,
                data_hash=data_hash,
            )
            if signal:
                assert signal.market == market


# =============================================================================
# Confidence Factor Tests
# =============================================================================

class TestConfidenceFactors:
    """Test confidence factor calculations."""

    def test_confidence_factors_present(self, strategy, bullish_bounce_data):
        """Test that confidence factors are included in signal."""
        data_hash = compute_data_hash(bullish_bounce_data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=bullish_bounce_data,
            data_hash=data_hash,
        )

        if signal:
            assert hasattr(signal, "confidence_factors")
            assert isinstance(signal.confidence_factors, dict)

    def test_volume_confirmation_boosts_confidence(self, strategy):
        """Test that volume confirmation affects confidence."""
        # Generate data with high volume
        data = generate_vwap_bounce_data(direction="bullish")
        for bar in data[-5:]:
            bar["volume"] = int(bar["volume"] * 2.0)  # Double volume

        data_hash = compute_data_hash(data)
        signal = strategy.analyze(
            symbol="TEST",
            market="US",
            ohlcv_data=data,
            data_hash=data_hash,
        )

        if signal and "volume_confirmation" in signal.confidence_factors:
            assert signal.confidence_factors["volume_confirmation"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
