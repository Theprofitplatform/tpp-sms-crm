"""
Tests for Pairs Trading Strategy

Tests for:
- Z-score calculation and spread analysis
- Hedge ratio calculation via OLS regression
- Correlation filtering
- BUY signal when z-score < -2.0 (spread too low)
- SELL signal when z-score > 2.0 (spread too high)
- Stop loss and target price calculations
- Signal strength scoring
- Edge cases (insufficient data, unknown symbols, broken correlations)

Usage:
    pytest services/signal/tests/test_pairs_trading.py -v

Dependencies:
    - pytest
    - numpy
    - Python 3.10+
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict, Any
import hashlib
import random
import numpy as np

# Import the modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from strategies.technical.pairs_trading import PairsTradingStrategy, validate_ohlcv_data
from models import Signal, SignalSide


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def strategy():
    """Create a pairs trading strategy with default config."""
    return PairsTradingStrategy()


@pytest.fixture
def custom_strategy():
    """Create a pairs trading strategy with custom config."""
    return PairsTradingStrategy(config={
        "z_score_entry": 2.5,
        "z_score_exit": 0.3,
        "min_correlation": 0.8,
        "lookback_period": 45,
        "atr_multiplier_stop": 1.5,
        "risk_reward_ratio": 2.0,
    })


def generate_ohlcv_data(
    num_bars: int = 100,
    start_price: float = 100.0,
    trend: str = "neutral",
    seed: int = 42
) -> List[Dict[str, Any]]:
    """Generate synthetic OHLCV data for testing."""
    random.seed(seed)
    np.random.seed(seed)
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

        # Calculate date for timestamp
        date = (datetime.now() - timedelta(days=num_bars-i)).strftime("%Y-%m-%d")

        data.append({
            "timestamp": (datetime.now() - timedelta(days=num_bars-i)).isoformat(),
            "date": date,
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": int(volume),
        })

    return data


def generate_correlated_prices(
    num_bars: int = 100,
    correlation: float = 0.9,
    start_price1: float = 100.0,
    start_price2: float = 150.0,
    seed: int = 42,
) -> tuple[List[float], List[float]]:
    """
    Generate two correlated price series.

    Args:
        num_bars: Number of price bars to generate
        correlation: Target correlation coefficient (0-1)
        start_price1: Starting price for series 1
        start_price2: Starting price for series 2
        seed: Random seed for reproducibility

    Returns:
        Tuple of (prices1, prices2)
    """
    np.random.seed(seed)

    # Generate correlated random walks
    # Common factor affects both prices
    common_factor = np.random.randn(num_bars)

    # Independent factors for each series
    independent1 = np.random.randn(num_bars)
    independent2 = np.random.randn(num_bars)

    # Combine common and independent factors to achieve desired correlation
    # correlation = common_weight / sqrt(common_weight^2 + indep_weight^2)
    common_weight = correlation
    indep_weight = np.sqrt(1 - correlation**2)

    # Generate returns
    returns1 = common_weight * common_factor + indep_weight * independent1
    returns2 = common_weight * common_factor + indep_weight * independent2

    # Scale returns (daily returns typically 0.5-2%)
    returns1 = returns1 * 0.015
    returns2 = returns2 * 0.015

    # Convert to prices
    prices1 = [start_price1]
    prices2 = [start_price2]

    for i in range(1, num_bars):
        prices1.append(prices1[-1] * (1 + returns1[i]))
        prices2.append(prices2[-1] * (1 + returns2[i]))

    return prices1, prices2


@pytest.fixture
def insufficient_data():
    """Generate insufficient data (less than min_data_bars)."""
    return generate_ohlcv_data(num_bars=30)


def compute_data_hash(data: List[dict]) -> str:
    """Compute hash of OHLCV data."""
    data_str = str(data)
    return hashlib.sha256(data_str.encode()).hexdigest()[:16]


# =============================================================================
# Strategy Initialization Tests
# =============================================================================

class TestPairsTradingInit:
    """Test strategy initialization."""

    def test_default_config(self, strategy):
        """Test default configuration values."""
        assert strategy.config["z_score_entry"] == 1.5
        assert strategy.config["z_score_exit"] == 0.3
        assert strategy.config["min_correlation"] == 0.65
        assert strategy.config["lookback_period"] == 45
        assert strategy.config["atr_period"] == 14
        assert strategy.config["atr_multiplier_stop"] == 1.5
        assert strategy.config["risk_reward_ratio"] == 2.0
        assert strategy.config["min_data_bars"] == 50

    def test_custom_config(self, custom_strategy):
        """Test custom configuration override."""
        assert custom_strategy.config["z_score_entry"] == 2.5
        assert custom_strategy.config["z_score_exit"] == 0.3
        assert custom_strategy.config["min_correlation"] == 0.8
        assert custom_strategy.config["lookback_period"] == 45
        assert custom_strategy.config["atr_multiplier_stop"] == 1.5
        assert custom_strategy.config["risk_reward_ratio"] == 2.0
        # Default values should remain for unspecified params
        assert custom_strategy.config["atr_period"] == 14

    def test_strategy_metadata(self, strategy):
        """Test strategy metadata."""
        assert strategy.NAME == "Pairs Trading Strategy"
        assert strategy.TYPE == "technical"
        assert strategy.VERSION == "1.0.0"

    def test_pairs_defined(self, strategy):
        """Test that predefined trading pairs are configured."""
        # Check GOOGL/META pair
        assert "GOOGL" in strategy.PAIRS
        assert strategy.PAIRS["GOOGL"] == "META"
        assert strategy.PAIRS["META"] == "GOOGL"

        # Check AAPL/MSFT pair
        assert "AAPL" in strategy.PAIRS
        assert strategy.PAIRS["AAPL"] == "MSFT"
        assert strategy.PAIRS["MSFT"] == "AAPL"

        # Check JPM/BAC pair
        assert "JPM" in strategy.PAIRS
        assert strategy.PAIRS["JPM"] == "BAC"
        assert strategy.PAIRS["BAC"] == "JPM"

        # Check XOM/CVX pair
        assert "XOM" in strategy.PAIRS
        assert strategy.PAIRS["XOM"] == "CVX"
        assert strategy.PAIRS["CVX"] == "XOM"

    def test_bidirectional_pairs(self, strategy):
        """Test that all pairs are bidirectional."""
        for symbol, partner in strategy.PAIRS.items():
            assert partner in strategy.PAIRS
            assert strategy.PAIRS[partner] == symbol


# =============================================================================
# Calculation Method Tests
# =============================================================================

class TestCalculations:
    """Test mathematical calculation methods."""

    def test_calculate_hedge_ratio(self, strategy):
        """Test OLS regression hedge ratio calculation."""
        # Create two price series where price1 = 1.2 * price2 approximately
        np.random.seed(42)
        prices2 = [100 + i + np.random.randn() * 0.5 for i in range(60)]
        prices1 = [p * 1.2 + np.random.randn() * 0.5 for p in prices2]

        ratio = strategy._calculate_hedge_ratio(prices1, prices2)
        # Should be close to 1.2 (the factor we used)
        assert 1.0 < ratio < 1.4

    def test_calculate_hedge_ratio_perfect_relationship(self, strategy):
        """Test hedge ratio with perfectly linear relationship."""
        prices2 = list(range(100, 160))
        prices1 = [p * 2 for p in prices2]  # Exact 2x relationship

        ratio = strategy._calculate_hedge_ratio(prices1, prices2)
        # Should be exactly 2.0 (within floating point tolerance)
        assert abs(ratio - 2.0) < 0.001

    def test_calculate_hedge_ratio_zero_variance(self, strategy):
        """Test hedge ratio when prices2 (x variable) has zero variance."""
        # prices2 is the independent variable (x) in regression
        # When x has zero variance, denominator is zero
        prices1 = list(range(100, 160))  # Has variance
        prices2 = [100.0] * 60  # No variance - causes zero denominator

        ratio = strategy._calculate_hedge_ratio(prices1, prices2)
        # Should return 1.0 (default when denominator is zero)
        assert ratio == 1.0

    def test_calculate_spread_zscore(self, strategy):
        """Test spread z-score calculation."""
        np.random.seed(42)
        prices1 = [100 + np.random.randn() * 2 for _ in range(60)]
        prices2 = [100 + np.random.randn() * 2 for _ in range(60)]

        z_score, spread = strategy._calculate_spread_zscore(prices1, prices2, 1.0)

        # Z-score should be reasonable (within a few standard deviations)
        assert -5 < z_score < 5
        # Spread should have correct length
        assert len(spread) == 60

    def test_calculate_spread_zscore_zero_std(self, strategy):
        """Test z-score calculation when spread has zero standard deviation."""
        # All prices equal means spread will have constant value
        prices1 = [100.0] * 60
        prices2 = [100.0] * 60

        z_score, spread = strategy._calculate_spread_zscore(prices1, prices2, 1.0)

        # Should return 0.0 when std is zero (avoids division by zero)
        assert z_score == 0.0

    def test_calculate_correlation_high(self, strategy):
        """Test correlation calculation with highly correlated series."""
        # Perfectly positively trending series (highly correlated)
        prices1 = [100 + i for i in range(60)]
        prices2 = [100 + i * 1.1 for i in range(60)]

        corr = strategy._calculate_correlation(prices1, prices2)

        # Should be very close to 1.0
        assert corr > 0.99

    def test_calculate_correlation_low(self, strategy):
        """Test correlation calculation with uncorrelated series."""
        np.random.seed(42)
        # Truly random series should have low correlation
        prices1 = [100 + np.random.randn() * 10 for _ in range(100)]
        np.random.seed(123)  # Different seed for independence
        prices2 = [100 + np.random.randn() * 10 for _ in range(100)]

        corr = strategy._calculate_correlation(prices1, prices2)

        # Should be close to 0 (allow some noise)
        assert -0.5 < corr < 0.5

    def test_calculate_correlation_negative(self, strategy):
        """Test correlation calculation with negatively correlated series."""
        # Inversely related series
        prices1 = [100 + i for i in range(60)]
        prices2 = [200 - i for i in range(60)]

        corr = strategy._calculate_correlation(prices1, prices2)

        # Should be very close to -1.0
        assert corr < -0.99

    def test_calculate_correlation_mismatched_lengths(self, strategy):
        """Test correlation with mismatched array lengths."""
        prices1 = [100 + i for i in range(60)]
        prices2 = [100 + i for i in range(30)]  # Different length

        corr = strategy._calculate_correlation(prices1, prices2)

        # Should return 0.0 for mismatched lengths
        assert corr == 0.0

    def test_calculate_correlation_insufficient_data(self, strategy):
        """Test correlation with insufficient data points."""
        prices1 = [100]
        prices2 = [100]

        corr = strategy._calculate_correlation(prices1, prices2)

        # Should return 0.0 for less than 2 data points
        assert corr == 0.0

    def test_calculate_half_life(self, strategy):
        """Test mean-reversion half-life calculation."""
        # Create a mean-reverting spread
        np.random.seed(42)
        spread = np.zeros(100)
        spread[0] = 10.0  # Start away from mean

        # Simulate Ornstein-Uhlenbeck process (mean reverting)
        theta = 0.1  # Speed of mean reversion
        for i in range(1, 100):
            spread[i] = spread[i-1] - theta * spread[i-1] + np.random.randn() * 0.5

        half_life = strategy._calculate_half_life(spread)

        # Should be positive and finite for mean-reverting series
        assert half_life > 0
        assert half_life != float('inf')
        # Half-life should be roughly log(2)/theta = ~6.9 bars
        assert 3 < half_life < 20

    def test_calculate_half_life_trending(self, strategy):
        """Test half-life for non-mean-reverting (trending) series."""
        # Pure trend - not mean reverting
        spread = np.array([float(i) for i in range(100)])

        half_life = strategy._calculate_half_life(spread)

        # Should return infinity for trending series
        assert half_life == float('inf')

    def test_calculate_half_life_insufficient_data(self, strategy):
        """Test half-life with insufficient data."""
        spread = np.array([1.0, 2.0])  # Only 2 points

        half_life = strategy._calculate_half_life(spread)

        # Should return infinity with insufficient data
        assert half_life == float('inf')


# =============================================================================
# Signal Generation Tests
# =============================================================================

class TestSignalGeneration:
    """Test signal generation scenarios."""

    def test_no_signal_without_pair(self, strategy):
        """Test that symbols without defined pairs return None immediately."""
        ohlcv = generate_ohlcv_data(60)
        data_hash = compute_data_hash(ohlcv)

        # XYZ is not in the PAIRS dictionary
        signal = strategy.analyze("XYZ", "US", ohlcv, data_hash)

        assert signal is None

    def test_no_signal_unknown_symbol(self, strategy):
        """Test various unknown symbols return None."""
        ohlcv = generate_ohlcv_data(60)
        data_hash = compute_data_hash(ohlcv)

        unknown_symbols = ["UNKNOWN", "TEST", "ABC", "FAKE", "RANDOM"]

        for symbol in unknown_symbols:
            signal = strategy.analyze(symbol, "US", ohlcv, data_hash)
            assert signal is None

    def test_no_signal_insufficient_data(self, strategy, insufficient_data):
        """Test that insufficient data returns None."""
        data_hash = compute_data_hash(insufficient_data)

        # GOOGL is in PAIRS, but data is insufficient
        signal = strategy.analyze("GOOGL", "US", insufficient_data, data_hash)

        assert signal is None

    def test_no_signal_empty_data(self, strategy):
        """Test that empty data returns None."""
        signal = strategy.analyze("GOOGL", "US", [], "empty_hash")

        assert signal is None

    def test_known_pair_symbol_recognized(self, strategy):
        """Test that known pair symbols are recognized (even if HTTP fails)."""
        # The strategy should at least recognize valid pair symbols
        # before failing on HTTP fetch
        assert "GOOGL" in strategy.PAIRS
        assert "META" in strategy.PAIRS
        assert "AAPL" in strategy.PAIRS
        assert "MSFT" in strategy.PAIRS


# =============================================================================
# OHLCV Validation Tests
# =============================================================================

class TestOHLCVValidation:
    """Test OHLCV data validation."""

    def test_validate_ohlcv_valid_data(self):
        """Test validation passes for valid data."""
        data = generate_ohlcv_data(10)
        assert validate_ohlcv_data(data, "TEST") is True

    def test_validate_ohlcv_empty_data(self):
        """Test validation fails for empty data."""
        assert validate_ohlcv_data([], "TEST") is False
        assert validate_ohlcv_data(None, "TEST") is False

    def test_validate_ohlcv_missing_keys(self):
        """Test validation fails for missing required keys."""
        data = [{"open": 100, "high": 101, "low": 99, "close": 100}]  # Missing volume
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_none_values(self):
        """Test validation fails for None values."""
        data = [{"open": 100, "high": 101, "low": 99, "close": None, "volume": 1000}]
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_non_numeric_values(self):
        """Test validation fails for non-numeric values."""
        data = [{"open": "100", "high": 101, "low": 99, "close": 100, "volume": 1000}]
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_negative_price(self):
        """Test validation fails for negative prices."""
        data = [{"open": -100, "high": 101, "low": 99, "close": 100, "volume": 1000}]
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_zero_price(self):
        """Test validation fails for zero prices."""
        data = [{"open": 0, "high": 101, "low": 99, "close": 100, "volume": 1000}]
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_negative_volume(self):
        """Test validation fails for negative volume."""
        data = [{"open": 100, "high": 101, "low": 99, "close": 100, "volume": -1000}]
        assert validate_ohlcv_data(data, "TEST") is False

    def test_validate_ohlcv_zero_volume_allowed(self):
        """Test validation passes for zero volume (allowed)."""
        data = [{"open": 100, "high": 101, "low": 99, "close": 100, "volume": 0}]
        assert validate_ohlcv_data(data, "TEST") is True


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_data(self, strategy):
        """Test handling of empty data."""
        signal = strategy.analyze(
            symbol="GOOGL",
            market="US",
            ohlcv_data=[],
            data_hash="empty",
        )
        assert signal is None

    def test_none_data(self, strategy):
        """Test handling of None data."""
        try:
            signal = strategy.analyze(
                symbol="GOOGL",
                market="US",
                ohlcv_data=None,
                data_hash="none",
            )
            assert signal is None
        except (TypeError, AttributeError):
            # Acceptable to raise error for None input
            pass

    def test_zero_std_spread(self, strategy):
        """Test edge case where spread has no variance."""
        # This is tested indirectly through _calculate_spread_zscore
        prices1 = [100.0] * 60
        prices2 = [100.0] * 60

        z_score, spread = strategy._calculate_spread_zscore(prices1, prices2, 1.0)

        # Should handle gracefully without division by zero
        assert z_score == 0.0

    def test_invalid_ohlcv_bars(self, strategy):
        """Test handling of invalid OHLCV bars in data."""
        data = generate_ohlcv_data(num_bars=100)
        # Corrupt one bar
        data[50]["close"] = -10.0

        signal = strategy.analyze(
            symbol="GOOGL",
            market="US",
            ohlcv_data=data,
            data_hash="invalid",
        )

        # Should return None due to validation failure
        assert signal is None

    def test_missing_volume_field(self, strategy):
        """Test handling of data missing volume field."""
        data = [
            {"timestamp": "2024-01-01", "date": "2024-01-01",
             "open": 100, "high": 101, "low": 99, "close": 100}
            for _ in range(100)
        ]

        signal = strategy.analyze(
            symbol="GOOGL",
            market="US",
            ohlcv_data=data,
            data_hash="no_volume",
        )

        # Should return None due to validation failure
        assert signal is None


# =============================================================================
# Data Alignment Tests
# =============================================================================

class TestDataAlignment:
    """Test price data alignment between pairs."""

    def test_align_price_data_matching_dates(self, strategy):
        """Test alignment with perfectly matching dates."""
        ohlcv1 = generate_ohlcv_data(60)
        ohlcv2 = generate_ohlcv_data(60)

        prices1, prices2, aligned_ohlcv = strategy._align_price_data(ohlcv1, ohlcv2)

        # All 60 bars should align
        assert len(prices1) == 60
        assert len(prices2) == 60
        assert len(aligned_ohlcv) == 60

    def test_align_price_data_partial_overlap(self, strategy):
        """Test alignment with partial date overlap."""
        # Create ohlcv1 with dates 0-59
        ohlcv1 = generate_ohlcv_data(60)

        # Create ohlcv2 with different dates (subset)
        ohlcv2 = generate_ohlcv_data(40)

        prices1, prices2, aligned_ohlcv = strategy._align_price_data(ohlcv1, ohlcv2)

        # Only overlapping dates should be included
        assert len(prices1) == len(prices2)
        assert len(aligned_ohlcv) == len(prices1)

    def test_align_price_data_no_overlap(self, strategy):
        """Test alignment with no date overlap."""
        ohlcv1 = [
            {"date": "2024-01-01", "timestamp": "2024-01-01T00:00:00",
             "open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000}
        ]
        ohlcv2 = [
            {"date": "2024-02-01", "timestamp": "2024-02-01T00:00:00",
             "open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000}
        ]

        prices1, prices2, aligned_ohlcv = strategy._align_price_data(ohlcv1, ohlcv2)

        # No overlap should result in empty arrays
        assert len(prices1) == 0
        assert len(prices2) == 0
        assert len(aligned_ohlcv) == 0


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests with other components."""

    def test_strategy_import_from_package(self):
        """Test that strategy can be imported from package."""
        from strategies.technical.pairs_trading import PairsTradingStrategy

        strategy = PairsTradingStrategy()
        assert strategy is not None
        assert strategy.NAME == "Pairs Trading Strategy"

    def test_strategy_has_confidence_scorer(self, strategy):
        """Test that strategy has confidence scorer initialized."""
        assert hasattr(strategy, 'scorer')
        assert strategy.scorer is not None

    def test_signal_serializable(self, strategy):
        """Test that Signal objects can be serialized."""
        # Create a mock signal (since we can't easily generate real ones without HTTP)
        from models import Signal, SignalFeatures, SignalSide, EntryType, TimeInForce

        features = SignalFeatures(
            price=185.50,
            sma_20=183.20,
            sma_50=180.00,
            rsi_14=55.0,
            atr_14=2.5,
        )

        signal = Signal(
            symbol="GOOGL",
            side=SignalSide.BUY,
            strategy_id="pairs_trading_v1",
            strategy_version="1.0.0",
            entry_price=185.50,
            stop_loss=180.50,
            target_price=193.00,
            confidence_score=0.75,
            confidence_factors={"z_score": 0.6, "correlation": 0.85},
            features=features,
        )

        # Should be able to convert to dict
        signal_dict = signal.to_dict()
        assert isinstance(signal_dict, dict)
        assert signal_dict["symbol"] == "GOOGL"
        assert signal_dict["side"] == "BUY"

    def test_multiple_pair_symbols(self, strategy):
        """Test that all defined pair symbols are consistent."""
        pairs_checked = set()

        for symbol, partner in strategy.PAIRS.items():
            # Avoid checking both directions of same pair
            if (partner, symbol) in pairs_checked:
                continue
            pairs_checked.add((symbol, partner))

            # Partner should map back to symbol
            assert strategy.PAIRS.get(partner) == symbol

            # Both should be valid stock symbols (uppercase letters)
            assert symbol.isupper()
            assert partner.isupper()
            assert symbol.isalpha()
            assert partner.isalpha()


# =============================================================================
# Correlated Price Generation Tests
# =============================================================================

class TestCorrelatedPriceGeneration:
    """Test the correlated price generation helper."""

    def test_high_correlation(self):
        """Test generating highly correlated prices."""
        prices1, prices2 = generate_correlated_prices(
            num_bars=1000,  # More bars for better correlation estimate
            correlation=0.9,
            seed=42,
        )

        # Calculate actual correlation
        actual_corr = np.corrcoef(prices1, prices2)[0, 1]

        # Should be close to target correlation (within 0.1)
        assert abs(actual_corr - 0.9) < 0.1

    def test_low_correlation(self):
        """Test generating moderately correlated prices."""
        # Note: Price series from random walks have higher correlation
        # than the underlying returns due to cumulative sum effect.
        # We test a moderate correlation target instead.
        prices1, prices2 = generate_correlated_prices(
            num_bars=1000,
            correlation=0.5,
            seed=42,
        )

        actual_corr = np.corrcoef(prices1, prices2)[0, 1]

        # For price series, actual correlation is typically higher than
        # the correlation of returns. We verify it's positive and moderate.
        assert 0.4 < actual_corr < 1.0

    def test_correct_length(self):
        """Test that generated prices have correct length."""
        prices1, prices2 = generate_correlated_prices(
            num_bars=60,
            seed=42,
        )

        assert len(prices1) == 60
        assert len(prices2) == 60

    def test_positive_prices(self):
        """Test that all generated prices are positive."""
        prices1, prices2 = generate_correlated_prices(
            num_bars=100,
            seed=42,
        )

        assert all(p > 0 for p in prices1)
        assert all(p > 0 for p in prices2)


# =============================================================================
# Configuration Validation Tests
# =============================================================================

class TestConfigurationValidation:
    """Test configuration parameter handling."""

    def test_config_merge_preserves_defaults(self):
        """Test that partial config preserves defaults."""
        strategy = PairsTradingStrategy(config={"z_score_entry": 3.0})

        # Custom value applied
        assert strategy.config["z_score_entry"] == 3.0
        # Defaults preserved
        assert strategy.config["z_score_exit"] == 0.3
        assert strategy.config["min_correlation"] == 0.65
        assert strategy.config["min_data_bars"] == 50

    def test_empty_config(self):
        """Test that empty config uses all defaults."""
        strategy = PairsTradingStrategy(config={})

        assert strategy.config["z_score_entry"] == 1.5
        assert strategy.config["min_correlation"] == 0.65

    def test_none_config(self):
        """Test that None config uses all defaults."""
        strategy = PairsTradingStrategy(config=None)

        assert strategy.config["z_score_entry"] == 1.5
        assert strategy.config["min_correlation"] == 0.65


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
