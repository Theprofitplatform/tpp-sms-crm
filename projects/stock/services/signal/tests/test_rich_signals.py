"""
Tests for Rich Signal Output

Tests for:
- Signal dataclass with all new fields
- SignalFeatures snapshot creation
- InvalidationRule generation and checking
- ConfidenceScorer calculations
- Strategy integration with rich signals

Usage:
    pytest services/signal/tests/test_rich_signals.py -v

Dependencies:
    - pytest
    - Python 3.10+
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib

# Import the modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Signal, SignalFeatures, InvalidationRule, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer
from confidence.invalidation import (
    generate_invalidation_rules,
    check_invalidation_rules,
    validate_signal_against_market,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def sample_features() -> SignalFeatures:
    """Create sample signal features."""
    return SignalFeatures(
        price=185.50,
        sma_20=183.20,
        sma_50=180.00,
        sma_200=175.00,
        rsi_14=55.0,
        macd=1.5,
        macd_signal=1.2,
        macd_histogram=0.3,
        bb_upper=190.00,
        bb_middle=183.00,
        bb_lower=176.00,
        bb_width=0.076,
        bb_position=0.68,
        atr_14=3.50,
        volume=1500000,
        volume_sma_20=1200000.0,
        volume_ratio=1.25,
        trend_strength=0.35,
        stoch_k=65.0,
        stoch_d=60.0,
        price_to_sma_20=0.0125,
        price_to_sma_50=0.0306,
    )


@pytest.fixture
def sample_ohlcv_data() -> List[Dict[str, Any]]:
    """Create sample OHLCV data for 100 bars."""
    import random
    random.seed(42)

    data = []
    price = 180.0

    for i in range(100):
        change = random.uniform(-2, 2)
        price = max(150, min(220, price + change))

        data.append({
            "open": price,
            "high": price + random.uniform(0, 2),
            "low": price - random.uniform(0, 2),
            "close": price + random.uniform(-1, 1),
            "volume": random.randint(800000, 2000000),
            "date": (datetime.utcnow() - timedelta(days=100-i)).isoformat(),
        })

    return data


@pytest.fixture
def momentum_scorer() -> ConfidenceScorer:
    """Create momentum strategy scorer."""
    return ConfidenceScorer(strategy_type="momentum")


@pytest.fixture
def mean_reversion_scorer() -> ConfidenceScorer:
    """Create mean reversion strategy scorer."""
    return ConfidenceScorer(strategy_type="mean_reversion")


# =============================================================================
# Signal Model Tests
# =============================================================================

class TestSignalModel:
    """Tests for the Signal dataclass."""

    def test_signal_creation_basic(self, sample_features):
        """Test basic signal creation."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            confidence_score=0.85,
            reason="Bullish crossover detected",
            features=sample_features,
        )

        assert signal.symbol == "AAPL"
        assert signal.side == SignalSide.BUY
        assert signal.confidence_score == 0.85
        assert signal.status == "PENDING"
        assert signal.id is not None
        assert signal.timestamp is not None

    def test_signal_legacy_compatibility(self, sample_features):
        """Test backward compatibility with old signal format."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            confidence_score=0.85,
            reason="Test reason",
            features=sample_features,
        )

        # Check legacy field aliases
        assert signal.signal_type == "BUY"
        assert signal.strength == 0.85
        assert signal.confidence == 0.85
        assert signal.reasoning == "Test reason"
        assert signal.expires_at == signal.valid_until
        assert signal.time == signal.timestamp
        assert signal.indicators == sample_features.to_dict()

    def test_signal_to_dict(self, sample_features):
        """Test signal serialization to dictionary."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            entry_type=EntryType.LIMIT,
            suggested_limit_price=185.00,
            time_in_force=TimeInForce.DAY,
            entry_price=185.50,
            target_price=195.00,
            stop_loss=180.00,
            confidence_score=0.85,
            confidence_factors={"rsi": 0.9, "macd": 0.8},
            reason="Test reason",
            features=sample_features,
        )

        d = signal.to_dict()

        assert d["symbol"] == "AAPL"
        assert d["side"] == "BUY"
        assert d["entry_type"] == "limit"
        assert d["suggested_limit_price"] == 185.00
        assert d["confidence_score"] == 0.85
        assert d["confidence_factors"] == {"rsi": 0.9, "macd": 0.8}
        assert d["features"] is not None
        assert "id" in d
        assert "time" in d

    def test_signal_from_dict(self, sample_features):
        """Test signal deserialization from dictionary."""
        original = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            confidence_score=0.85,
            reason="Test reason",
            features=sample_features,
        )

        d = original.to_dict()
        restored = Signal.from_dict(d)

        assert restored.symbol == original.symbol
        assert restored.side == original.side
        assert restored.confidence_score == original.confidence_score
        assert restored.features.price == sample_features.price

    def test_signal_validity_check(self, sample_features):
        """Test signal validity checking."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            confidence_score=0.85,
            reason="Test reason",
            features=sample_features,
            valid_until=datetime.utcnow() + timedelta(hours=24),
        )

        is_valid, reasons = signal.is_valid()
        assert is_valid is True
        assert len(reasons) == 0

    def test_signal_expired(self, sample_features):
        """Test expired signal detection."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.BUY,
            strategy_id="momentum_v1",
            strategy_version="1.1.0",
            confidence_score=0.85,
            reason="Test reason",
            features=sample_features,
            valid_until=datetime.utcnow() - timedelta(hours=1),
        )

        is_valid, reasons = signal.is_valid()
        assert is_valid is False
        assert "Signal has expired" in reasons


# =============================================================================
# Signal Features Tests
# =============================================================================

class TestSignalFeatures:
    """Tests for SignalFeatures dataclass."""

    def test_features_creation(self):
        """Test features creation with all fields."""
        features = SignalFeatures(
            price=185.50,
            sma_20=183.20,
            sma_50=180.00,
            rsi_14=55.0,
        )

        assert features.price == 185.50
        assert features.sma_20 == 183.20
        assert features.rsi_14 == 55.0

    def test_features_to_dict(self, sample_features):
        """Test features serialization."""
        d = sample_features.to_dict()

        assert d["price"] == 185.50
        assert d["sma_20"] == 183.20
        assert d["rsi_14"] == 55.0
        assert d["bb_position"] == 0.68

    def test_features_from_dict(self, sample_features):
        """Test features deserialization."""
        d = sample_features.to_dict()
        restored = SignalFeatures.from_dict(d)

        assert restored.price == sample_features.price
        assert restored.rsi_14 == sample_features.rsi_14
        assert restored.bb_position == sample_features.bb_position

    def test_features_hash(self, sample_features):
        """Test features hash computation."""
        hash1 = sample_features.compute_hash()
        hash2 = sample_features.compute_hash()

        assert hash1 == hash2
        assert len(hash1) == 32  # MD5 hex length

        # Modify and check hash changes
        different = SignalFeatures(
            price=190.00,  # Different price
            sma_20=183.20,
            sma_50=180.00,
        )
        assert different.compute_hash() != hash1


# =============================================================================
# Invalidation Rules Tests
# =============================================================================

class TestInvalidationRules:
    """Tests for invalidation rule generation and checking."""

    def test_generate_buy_rules(self, sample_features):
        """Test invalidation rule generation for BUY signals."""
        rules = generate_invalidation_rules(
            signal_side="BUY",
            entry_price=185.50,
            stop_loss=180.00,
            target_price=195.00,
            features=sample_features.to_dict(),
            strategy_type="momentum",
            atr=3.50,
        )

        assert len(rules) > 0

        # Should have stop loss rule
        stop_rules = [r for r in rules if r.condition == "price_below_stop"]
        assert len(stop_rules) == 1
        assert stop_rules[0].threshold == 180.00

        # Should have RSI overbought rule
        rsi_rules = [r for r in rules if r.condition == "rsi_overbought"]
        assert len(rsi_rules) == 1

    def test_generate_sell_rules(self, sample_features):
        """Test invalidation rule generation for SELL signals."""
        rules = generate_invalidation_rules(
            signal_side="SELL",
            entry_price=185.50,
            stop_loss=190.00,
            target_price=175.00,
            features=sample_features.to_dict(),
            strategy_type="momentum",
            atr=3.50,
        )

        # Should have stop loss rule (price above stop)
        stop_rules = [r for r in rules if r.condition == "price_above_stop"]
        assert len(stop_rules) == 1
        assert stop_rules[0].threshold == 190.00

    def test_rule_check_triggered(self):
        """Test invalidation rule triggering."""
        rule = InvalidationRule(
            condition="price_below_stop",
            threshold=180.00,
            description="Price drops below stop",
            comparison="lte",
            feature_name="price",
        )

        # Price at 179 should trigger
        assert rule.check(179.00) is True
        # Price at 180 should trigger (lte)
        assert rule.check(180.00) is True
        # Price at 181 should not trigger
        assert rule.check(181.00) is False

    def test_check_invalidation_rules(self, sample_features):
        """Test checking multiple invalidation rules."""
        rules = [
            InvalidationRule(
                condition="price_below_stop",
                threshold=170.00,
                description="Price below stop",
                comparison="lte",
                feature_name="price",
            ),
            InvalidationRule(
                condition="rsi_overbought",
                threshold=80.00,
                description="RSI overbought",
                comparison="gte",
                feature_name="rsi_14",
            ),
        ]

        # Current features should not trigger any rules
        is_valid, triggered = check_invalidation_rules(rules, sample_features.to_dict())
        assert is_valid is True
        assert len(triggered) == 0

        # Test with triggered rule
        triggered_features = sample_features.to_dict()
        triggered_features["price"] = 165.00  # Below stop

        is_valid, triggered = check_invalidation_rules(rules, triggered_features)
        assert is_valid is False
        assert len(triggered) == 1
        assert "Price below stop" in triggered[0]

    def test_validate_signal_against_market(self, sample_features):
        """Test full signal validation against market."""
        rules = [
            InvalidationRule(
                condition="price_below_stop",
                threshold=170.00,
                description="Price below stop",
                comparison="lte",
                feature_name="price",
            ),
        ]

        # Same features - should be valid
        result = validate_signal_against_market(
            signal_side="BUY",
            original_features=sample_features.to_dict(),
            current_features=sample_features.to_dict(),
            invalidation_rules=rules,
        )

        assert result["is_valid"] is True
        assert result["recommendation"] == "HOLD"
        assert result["confidence_change"] == 0.0

    def test_validation_with_favorable_move(self, sample_features):
        """Test validation with favorable price movement."""
        original = sample_features.to_dict()

        # Price moved up for BUY signal
        current = sample_features.to_dict()
        current["price"] = 190.00  # +2.4%

        result = validate_signal_against_market(
            signal_side="BUY",
            original_features=original,
            current_features=current,
            invalidation_rules=[],
        )

        assert result["is_valid"] is True
        assert result["confidence_change"] > 0


# =============================================================================
# Confidence Scorer Tests
# =============================================================================

class TestConfidenceScorer:
    """Tests for the ConfidenceScorer."""

    def test_momentum_buy_confidence(self, momentum_scorer):
        """Test confidence calculation for momentum BUY signal."""
        indicators = {
            "rsi": 58.0,  # Bullish but not overbought
            "macd_histogram": 0.5,  # Positive
            "trend_strength": 0.4,  # Uptrend
            "volume_ratio": 1.8,  # Above average
            "price_to_sma_20": 0.02,  # Above SMA
        }

        score, factors = momentum_scorer.calculate_confidence("BUY", indicators)

        assert 0.0 <= score <= 1.0
        assert score > 0.6  # Should be fairly confident
        assert "rsi" in factors
        assert "macd" in factors
        assert "volume" in factors

    def test_momentum_sell_confidence(self, momentum_scorer):
        """Test confidence calculation for momentum SELL signal."""
        indicators = {
            "rsi": 42.0,  # Bearish
            "macd_histogram": -0.5,  # Negative
            "trend_strength": -0.3,  # Downtrend
            "volume_ratio": 1.5,  # Confirmed
            "price_to_sma_20": -0.02,  # Below SMA
        }

        score, factors = momentum_scorer.calculate_confidence("SELL", indicators)

        assert 0.0 <= score <= 1.0
        assert score > 0.6

    def test_hold_signal_zero_confidence(self, momentum_scorer):
        """Test that HOLD signals return zero confidence."""
        indicators = {"rsi": 50.0}

        score, factors = momentum_scorer.calculate_confidence("HOLD", indicators)

        assert score == 0.0
        assert len(factors) == 0

    def test_mean_reversion_buy_confidence(self, mean_reversion_scorer):
        """Test mean reversion BUY signal confidence."""
        indicators = {
            "rsi": 25.0,  # Oversold
            "bb_position": 0.1,  # Near lower band
            "sma_deviation": -0.03,  # Below SMA
            "volume_ratio": 1.3,
            "stoch_k": 15.0,  # Oversold
        }

        score, factors = mean_reversion_scorer.calculate_confidence("BUY", indicators)

        assert 0.0 <= score <= 1.0
        assert score > 0.7  # Should be very confident for mean reversion buy
        assert "bollinger" in factors
        assert "stochastic" in factors

    def test_mean_reversion_sell_confidence(self, mean_reversion_scorer):
        """Test mean reversion SELL signal confidence."""
        indicators = {
            "rsi": 78.0,  # Overbought
            "bb_position": 0.92,  # Near upper band
            "sma_deviation": 0.04,  # Above SMA
            "volume_ratio": 1.2,
            "stoch_k": 88.0,  # Overbought
        }

        score, factors = mean_reversion_scorer.calculate_confidence("SELL", indicators)

        assert 0.0 <= score <= 1.0
        assert score > 0.7

    def test_confidence_bounds(self, momentum_scorer):
        """Test that confidence is always between 0 and 1."""
        # Test with extreme values
        indicators = {
            "rsi": 100.0,
            "macd_histogram": 10.0,
            "trend_strength": 1.0,
            "volume_ratio": 5.0,
            "price_to_sma_20": 0.1,
        }

        score, _ = momentum_scorer.calculate_confidence("BUY", indicators)
        assert 0.0 <= score <= 1.0

        # Test with very negative values
        indicators["macd_histogram"] = -10.0
        indicators["trend_strength"] = -1.0

        score, _ = momentum_scorer.calculate_confidence("SELL", indicators)
        assert 0.0 <= score <= 1.0

    def test_missing_indicators(self, momentum_scorer):
        """Test handling of missing indicators."""
        indicators = {
            "rsi": 55.0,
            # Missing other indicators
        }

        score, factors = momentum_scorer.calculate_confidence("BUY", indicators)

        assert 0.0 <= score <= 1.0
        assert "rsi" in factors
        # Should still compute with available indicators


# =============================================================================
# Strategy Integration Tests
# =============================================================================

class TestStrategyIntegration:
    """Integration tests for strategies producing rich signals."""

    def test_momentum_strategy_produces_rich_signal(self, sample_ohlcv_data):
        """Test that MomentumStrategy produces rich signals."""
        from strategies.technical.momentum import MomentumStrategy

        strategy = MomentumStrategy()

        # Note: This may return None if no signal conditions are met
        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=sample_ohlcv_data,
            data_hash="test_hash",
        )

        # If a signal was generated, verify rich output
        if signal:
            # Check new fields exist
            assert signal.features is not None
            assert signal.confidence_score > 0
            assert len(signal.confidence_factors) > 0
            assert len(signal.invalidation_rules) > 0
            assert signal.entry_type in [EntryType.MARKET, EntryType.LIMIT]
            assert signal.time_in_force in [TimeInForce.DAY, TimeInForce.GTC, TimeInForce.IOC]
            assert signal.rule_version_id is not None

            # Check features snapshot
            assert signal.features.price > 0
            assert signal.features.sma_20 > 0
            assert signal.features.rsi_14 >= 0

    def test_mean_reversion_strategy_produces_rich_signal(self, sample_ohlcv_data):
        """Test that MeanReversionStrategy produces rich signals."""
        from strategies.technical.mean_reversion import MeanReversionStrategy

        strategy = MeanReversionStrategy()

        signal = strategy.analyze(
            symbol="AAPL",
            market="US",
            ohlcv_data=sample_ohlcv_data,
            data_hash="test_hash",
        )

        if signal:
            assert signal.features is not None
            assert signal.confidence_score > 0
            assert len(signal.invalidation_rules) > 0
            # Mean reversion typically uses limit orders
            assert signal.time_in_force == TimeInForce.GTC


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_features_dict(self):
        """Test SignalFeatures.from_dict with empty dict."""
        # Should use defaults
        features = SignalFeatures.from_dict({})
        # Will fail because price, sma_20, sma_50 are required with no defaults
        # This is expected behavior - required fields must be provided

    def test_signal_with_none_optional_fields(self):
        """Test signal creation with None optional fields."""
        signal = Signal(
            symbol="AAPL",
            side=SignalSide.HOLD,
            strategy_id="test",
            strategy_version="1.0.0",
            confidence_score=0.0,
            reason="No signal",
            features=None,
            target_price=None,
            stop_loss=None,
        )

        assert signal.features is None
        assert signal.target_price is None
        assert signal.indicators == {}

    def test_invalidation_rule_eq_comparison(self):
        """Test invalidation rule with equality comparison."""
        rule = InvalidationRule(
            condition="exact_match",
            threshold=100.0,
            description="Exact value match",
            comparison="eq",
            feature_name="test",
        )

        assert rule.check(100.0) is True
        assert rule.check(99.9) is False
        assert rule.check(100.1) is False

    def test_confidence_with_all_missing_indicators(self, momentum_scorer):
        """Test confidence calculation with no recognized indicators."""
        indicators = {
            "unknown_indicator": 50.0,
        }

        score, factors = momentum_scorer.calculate_confidence("BUY", indicators)

        # Should return neutral score
        assert 0.0 <= score <= 1.0
        assert len(factors) == 0


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
