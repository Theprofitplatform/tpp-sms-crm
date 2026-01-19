"""
Tests for Portfolio Risk Management Module.

Tests cover:
- Exposure analysis (sector and market)
- Correlation matrix calculation
- Volatility scaling
- Circuit breaker functionality
"""

import pytest
import numpy as np
from datetime import datetime, date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import sys

# Mock asyncpg before importing modules that use it
sys.modules['asyncpg'] = MagicMock()

from portfolio.exposure import (
    ExposureAnalyzer,
    ExposureReport,
    Position,
    ExposureLevel,
    calculate_sector_exposure,
    calculate_market_exposure,
    DEFAULT_SECTOR_MAP,
)
from portfolio.correlation import (
    CorrelationAnalyzer,
    CorrelationMatrix,
    CorrelatedPair,
    find_correlated_pairs,
)
from portfolio.volatility import (
    VolatilityScaler,
    VolatilityMetrics,
    VolatilityRegime,
    calculate_symbol_volatility,
    is_high_volatility_regime,
    _classify_vix_regime,
)
from portfolio.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerType,
    CircuitBreakerStatus,
    CircuitBreakerRule,
    CircuitBreakerTriggered,
    DEFAULT_RULES,
)


# =============================================================================
# Exposure Tests
# =============================================================================

class TestExposureAnalyzer:
    """Tests for ExposureAnalyzer class."""

    @pytest.fixture
    def analyzer(self):
        """Create exposure analyzer with test config."""
        return ExposureAnalyzer(
            max_sector_exposure_pct=30.0,
            max_market_exposure_pct=50.0,
        )

    @pytest.fixture
    def sample_positions(self):
        """Create sample positions for testing."""
        return [
            Position(symbol="AAPL", quantity=100, market_value=17500.0, market="US"),
            Position(symbol="MSFT", quantity=50, market_value=21000.0, market="US"),
            Position(symbol="JPM", quantity=30, market_value=5400.0, market="US"),
            Position(symbol="XOM", quantity=40, market_value=4200.0, market="US"),
        ]

    @pytest.mark.asyncio
    async def test_analyze_empty_positions(self, analyzer):
        """Test analyzing empty portfolio."""
        report = await analyzer.analyze([])

        assert report.total_value == 0.0
        assert report.sector_exposure == {}
        assert report.market_exposure == {}

    @pytest.mark.asyncio
    async def test_analyze_calculates_total_value(self, analyzer, sample_positions):
        """Test total value calculation."""
        report = await analyzer.analyze(sample_positions)

        expected_total = sum(p.market_value for p in sample_positions)
        assert report.total_value == expected_total

    @pytest.mark.asyncio
    async def test_analyze_sector_breakdown(self, analyzer, sample_positions):
        """Test sector exposure breakdown."""
        report = await analyzer.analyze(sample_positions)

        # AAPL and MSFT should be in Technology
        assert "Technology" in report.sector_exposure
        tech_exposure = report.sector_exposure["Technology"]
        assert tech_exposure.value == 17500.0 + 21000.0  # AAPL + MSFT

    @pytest.mark.asyncio
    async def test_analyze_generates_warnings(self, analyzer):
        """Test warning generation when limits exceeded."""
        # Create concentrated portfolio
        positions = [
            Position(symbol="AAPL", quantity=100, market_value=35000.0, market="US"),
            Position(symbol="MSFT", quantity=50, market_value=35000.0, market="US"),
        ]

        report = await analyzer.analyze(positions)

        # Tech sector should be at 100%, which exceeds 30% limit
        assert len(report.sector_warnings) > 0
        assert any("Technology" in w for w in report.sector_warnings)

    def test_exposure_level_classification(self, analyzer):
        """Test exposure level classification."""
        # Below 50% of limit = LOW
        assert analyzer._get_exposure_level(10.0, 30.0) == ExposureLevel.LOW

        # 50-80% of limit = MODERATE
        assert analyzer._get_exposure_level(20.0, 30.0) == ExposureLevel.MODERATE

        # 80-100% of limit = HIGH
        assert analyzer._get_exposure_level(25.0, 30.0) == ExposureLevel.HIGH

        # Above limit = CRITICAL
        assert analyzer._get_exposure_level(35.0, 30.0) == ExposureLevel.CRITICAL

    def test_market_detection(self, analyzer):
        """Test market detection from symbol."""
        assert analyzer._detect_market("AAPL") == "US"
        assert analyzer._detect_market("CBA.AX") == "ASX"
        assert analyzer._detect_market("BTC-USD") == "CRYPTO"
        assert analyzer._detect_market("ETH-USDT") == "CRYPTO"


class TestExposureConvenienceFunctions:
    """Tests for module-level exposure functions."""

    def test_calculate_sector_exposure_empty(self):
        """Test sector exposure with empty positions."""
        result = calculate_sector_exposure([])
        assert result == {}

    def test_calculate_sector_exposure(self):
        """Test sector exposure calculation."""
        positions = [
            {"symbol": "AAPL", "market_value": 10000},
            {"symbol": "MSFT", "market_value": 10000},
            {"symbol": "JPM", "market_value": 5000},
        ]

        result = calculate_sector_exposure(positions)

        assert "Technology" in result
        assert "Financial Services" in result
        assert result["Technology"] == 80.0  # 20000/25000
        assert result["Financial Services"] == 20.0  # 5000/25000

    def test_calculate_market_exposure(self):
        """Test market exposure calculation."""
        positions = [
            {"symbol": "AAPL", "market_value": 10000, "market": "US"},
            {"symbol": "BTC-USD", "market_value": 5000, "market": "US"},  # Will be detected as CRYPTO
        ]

        result = calculate_market_exposure(positions)

        assert "US" in result
        assert "CRYPTO" in result


# =============================================================================
# Correlation Tests
# =============================================================================

class TestCorrelationAnalyzer:
    """Tests for CorrelationAnalyzer class."""

    @pytest.fixture
    def analyzer(self):
        """Create correlation analyzer with test config."""
        return CorrelationAnalyzer(
            correlation_threshold=0.7,
            max_correlated_symbols=3,
            lookback_days=60,
        )

    def test_find_correlated_pairs_empty_matrix(self, analyzer):
        """Test finding pairs with empty matrix."""
        matrix = CorrelationMatrix(
            symbols=[],
            matrix=np.array([]),
            lookback_days=60,
        )

        pairs = analyzer.find_correlated_pairs(matrix)
        assert pairs == []

    def test_find_correlated_pairs(self, analyzer):
        """Test finding correlated pairs."""
        # Create correlation matrix with known correlations
        matrix = CorrelationMatrix(
            symbols=["AAPL", "MSFT", "XOM"],
            matrix=np.array([
                [1.0, 0.85, 0.3],
                [0.85, 1.0, 0.2],
                [0.3, 0.2, 1.0],
            ]),
            lookback_days=60,
        )

        pairs = analyzer.find_correlated_pairs(matrix, threshold=0.7)

        assert len(pairs) == 1
        assert pairs[0].symbol_a == "AAPL"
        assert pairs[0].symbol_b == "MSFT"
        assert pairs[0].correlation == 0.85

    def test_find_correlated_pairs_negative_correlation(self, analyzer):
        """Test finding negatively correlated pairs."""
        matrix = CorrelationMatrix(
            symbols=["SPY", "VXX"],
            matrix=np.array([
                [1.0, -0.85],
                [-0.85, 1.0],
            ]),
            lookback_days=60,
        )

        pairs = analyzer.find_correlated_pairs(matrix, threshold=0.7)

        assert len(pairs) == 1
        assert pairs[0].correlation == -0.85

    def test_correlation_matrix_get_correlation(self):
        """Test getting correlation between specific symbols."""
        matrix = CorrelationMatrix(
            symbols=["AAPL", "MSFT", "GOOGL"],
            matrix=np.array([
                [1.0, 0.8, 0.6],
                [0.8, 1.0, 0.7],
                [0.6, 0.7, 1.0],
            ]),
            lookback_days=60,
        )

        assert matrix.get_correlation("AAPL", "MSFT") == 0.8
        assert matrix.get_correlation("MSFT", "AAPL") == 0.8  # Symmetric
        assert matrix.get_correlation("AAPL", "AAPL") == 1.0
        assert matrix.get_correlation("AAPL", "UNKNOWN") is None


class TestCorrelationConvenienceFunctions:
    """Tests for module-level correlation functions."""

    def test_find_correlated_pairs_dataframe(self):
        """Test finding pairs from DataFrame."""
        import pandas as pd

        matrix = pd.DataFrame(
            [[1.0, 0.9], [0.9, 1.0]],
            index=["A", "B"],
            columns=["A", "B"],
        )

        pairs = find_correlated_pairs(matrix, threshold=0.8)

        assert len(pairs) == 1
        assert pairs[0] == ("A", "B", 0.9)


# =============================================================================
# Volatility Tests
# =============================================================================

class TestVolatilityScaler:
    """Tests for VolatilityScaler class."""

    @pytest.fixture
    def scaler(self):
        """Create volatility scaler with test config."""
        return VolatilityScaler(
            target_volatility=0.20,
            min_scale_factor=0.25,
            max_scale_factor=2.0,
            lookback_days=20,
        )

    def test_scale_position_high_volatility(self, scaler):
        """Test position scaling for high volatility symbol."""
        # 40% vol should scale down position
        scaled = scaler.scale_position(100, 0.40)

        # target(0.20) / actual(0.40) = 0.5
        assert scaled == 50

    def test_scale_position_low_volatility(self, scaler):
        """Test position scaling for low volatility symbol."""
        # 10% vol should scale up position (capped at max)
        scaled = scaler.scale_position(100, 0.10)

        # target(0.20) / actual(0.10) = 2.0, capped at max_scale_factor
        assert scaled == 200

    def test_scale_position_very_low_volatility(self, scaler):
        """Test position scaling capped at max."""
        # 5% vol would give 4x scaling, but capped at 2x
        scaled = scaler.scale_position(100, 0.05)

        assert scaled == 200  # Capped at 2x

    def test_scale_position_very_high_volatility(self, scaler):
        """Test position scaling floored at min."""
        # 100% vol would give 0.2x scaling, but floored at 0.25x
        scaled = scaler.scale_position(100, 1.0)

        assert scaled == 25  # Floored at 0.25x

    def test_scale_position_zero_volatility(self, scaler):
        """Test position scaling with zero volatility."""
        scaled = scaler.scale_position(100, 0)

        assert scaled == 100  # No scaling

    def test_classify_symbol_regime(self, scaler):
        """Test symbol volatility regime classification."""
        assert scaler._classify_symbol_regime(0.10) == VolatilityRegime.LOW
        assert scaler._classify_symbol_regime(0.20) == VolatilityRegime.NORMAL
        assert scaler._classify_symbol_regime(0.40) == VolatilityRegime.HIGH
        assert scaler._classify_symbol_regime(0.60) == VolatilityRegime.EXTREME


class TestVolatilityRegimeClassification:
    """Tests for VIX regime classification."""

    def test_classify_vix_regime_low(self):
        """Test LOW regime classification."""
        assert _classify_vix_regime(12.0) == VolatilityRegime.LOW

    def test_classify_vix_regime_normal(self):
        """Test NORMAL regime classification."""
        assert _classify_vix_regime(20.0) == VolatilityRegime.NORMAL

    def test_classify_vix_regime_high(self):
        """Test HIGH regime classification."""
        assert _classify_vix_regime(30.0) == VolatilityRegime.HIGH

    def test_classify_vix_regime_extreme(self):
        """Test EXTREME regime classification."""
        assert _classify_vix_regime(45.0) == VolatilityRegime.EXTREME


# =============================================================================
# Circuit Breaker Tests
# =============================================================================

class TestCircuitBreaker:
    """Tests for CircuitBreaker class."""

    @pytest.fixture
    def breaker(self):
        """Create circuit breaker with default rules."""
        return CircuitBreaker()

    @pytest.fixture
    def custom_breaker(self):
        """Create circuit breaker with custom rules."""
        rules = [
            CircuitBreakerRule(
                breaker_type=CircuitBreakerType.MAX_POSITIONS,
                threshold=5,
                cooldown_minutes=30,
                auto_reset=True,
            ),
            CircuitBreakerRule(
                breaker_type=CircuitBreakerType.DAILY_LOSS,
                threshold=1.0,
                cooldown_minutes=60,
                auto_reset=True,
            ),
        ]
        return CircuitBreaker(rules=rules)

    def test_default_rules_loaded(self, breaker):
        """Test that default rules are loaded."""
        assert len(breaker.rules) == len(DEFAULT_RULES)
        assert CircuitBreakerType.MAX_POSITIONS in breaker.rules
        assert CircuitBreakerType.DRAWDOWN in breaker.rules

    def test_custom_rules_override_defaults(self, custom_breaker):
        """Test that custom rules override defaults."""
        assert len(custom_breaker.rules) == 2
        assert custom_breaker.rules[CircuitBreakerType.MAX_POSITIONS].threshold == 5

    def test_initial_state_is_active(self, breaker):
        """Test that all breakers start in ACTIVE state."""
        for state in breaker.states.values():
            assert state.status == CircuitBreakerStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_check_triggers_max_positions(self, custom_breaker):
        """Test that MAX_POSITIONS breaker triggers correctly."""
        portfolio_state = {
            "position_count": 10,  # Exceeds threshold of 5
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": {},
            "correlated_pairs": [],
        }

        triggered, states = await custom_breaker.check_all(portfolio_state)

        assert triggered is True
        assert len(states) == 1
        assert states[0].rule.breaker_type == CircuitBreakerType.MAX_POSITIONS

    @pytest.mark.asyncio
    async def test_check_no_trigger_when_below_threshold(self, custom_breaker):
        """Test that breakers don't trigger when below threshold."""
        portfolio_state = {
            "position_count": 3,  # Below threshold of 5
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": {},
            "correlated_pairs": [],
        }

        triggered, states = await custom_breaker.check_all(portfolio_state)

        assert triggered is False
        assert len(states) == 0

    def test_can_trade_when_all_active(self, breaker):
        """Test can_trade returns True when all breakers active."""
        can_trade, reasons = breaker.can_trade()

        assert can_trade is True
        assert reasons == []

    @pytest.mark.asyncio
    async def test_can_trade_false_when_triggered(self, custom_breaker):
        """Test can_trade returns False when breaker triggered."""
        # Trigger a breaker
        portfolio_state = {
            "position_count": 10,
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": {},
            "correlated_pairs": [],
        }

        await custom_breaker.check_all(portfolio_state)

        can_trade, reasons = custom_breaker.can_trade()

        assert can_trade is False
        assert len(reasons) > 0

    def test_record_order(self, breaker):
        """Test order recording for rate limiting."""
        assert len(breaker._recent_orders) == 0

        breaker.record_order()

        assert len(breaker._recent_orders) == 1

    def test_record_trade_result_win_resets_streak(self, breaker):
        """Test that win resets loss streak."""
        breaker._loss_streak = 3
        breaker.record_trade_result(is_win=True)

        assert breaker._loss_streak == 0

    def test_record_trade_result_loss_increments_streak(self, breaker):
        """Test that loss increments streak."""
        breaker._loss_streak = 3
        breaker.record_trade_result(is_win=False)

        assert breaker._loss_streak == 4

    @pytest.mark.asyncio
    async def test_reset_breaker(self, custom_breaker):
        """Test manual breaker reset."""
        # Trigger a breaker
        custom_breaker.states[CircuitBreakerType.MAX_POSITIONS].status = CircuitBreakerStatus.TRIGGERED
        custom_breaker.states[CircuitBreakerType.MAX_POSITIONS].triggered_reason = "Test trigger"

        success = await custom_breaker.reset_breaker(
            CircuitBreakerType.MAX_POSITIONS,
            reason="Test reset",
        )

        assert success is True
        assert custom_breaker.states[CircuitBreakerType.MAX_POSITIONS].status == CircuitBreakerStatus.ACTIVE

    def test_update_rule(self, breaker):
        """Test updating a circuit breaker rule."""
        original_threshold = breaker.rules[CircuitBreakerType.MAX_POSITIONS].threshold

        success = breaker.update_rule(
            CircuitBreakerType.MAX_POSITIONS,
            threshold=10,
        )

        assert success is True
        assert breaker.rules[CircuitBreakerType.MAX_POSITIONS].threshold == 10
        assert breaker.rules[CircuitBreakerType.MAX_POSITIONS].threshold != original_threshold


class TestCircuitBreakerState:
    """Tests for CircuitBreakerState serialization."""

    def test_state_to_dict(self):
        """Test state to_dict method."""
        from portfolio.circuit_breaker import CircuitBreakerState

        rule = CircuitBreakerRule(
            breaker_type=CircuitBreakerType.MAX_POSITIONS,
            threshold=20,
        )

        state = CircuitBreakerState(
            rule=rule,
            status=CircuitBreakerStatus.ACTIVE,
            current_value=5,
        )

        result = state.to_dict()

        assert result["type"] == "MAX_POSITIONS"
        assert result["status"] == "ACTIVE"
        assert result["current_value"] == 5
        assert result["threshold"] == 20


# =============================================================================
# Integration Tests
# =============================================================================

class TestPortfolioRiskIntegration:
    """Integration tests for portfolio risk module."""

    @pytest.mark.asyncio
    async def test_exposure_and_circuit_breaker_integration(self):
        """Test that exposure warnings can feed into circuit breakers."""
        # Create analyzer
        exposure_analyzer = ExposureAnalyzer(max_sector_exposure_pct=30.0)

        # Create concentrated positions
        positions = [
            Position(symbol="AAPL", quantity=100, market_value=45000.0, market="US"),
            Position(symbol="MSFT", quantity=50, market_value=45000.0, market="US"),
            Position(symbol="JPM", quantity=20, market_value=10000.0, market="US"),
        ]

        # Get exposure
        exposure = await exposure_analyzer.analyze(positions)

        # Build portfolio state from exposure
        sector_exposure = {
            k: v.percentage for k, v in exposure.sector_exposure.items()
        }

        # Create circuit breaker
        breaker = CircuitBreaker()

        portfolio_state = {
            "position_count": len(positions),
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": sector_exposure,
            "correlated_pairs": [],
        }

        triggered, states = await breaker.check_all(portfolio_state)

        # Should trigger sector concentration breaker
        # Technology is at 90% (45k + 45k) / 100k
        assert triggered is True
        triggered_types = [s.rule.breaker_type for s in states]
        assert CircuitBreakerType.SECTOR_CONCENTRATION in triggered_types

    @pytest.mark.asyncio
    async def test_volatility_and_circuit_breaker_integration(self):
        """Test volatility regime triggering circuit breaker."""
        breaker = CircuitBreaker()

        # Simulate extreme VIX level
        portfolio_state = {
            "position_count": 5,
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": {},
            "vix_level": 40.0,  # Extreme volatility
            "correlated_pairs": [],
        }

        triggered, states = await breaker.check_all(portfolio_state)

        assert triggered is True
        triggered_types = [s.rule.breaker_type for s in states]
        assert CircuitBreakerType.VOLATILITY_PAUSE in triggered_types


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_sector_map_coverage(self):
        """Test that DEFAULT_SECTOR_MAP has expected symbols."""
        assert "AAPL" in DEFAULT_SECTOR_MAP
        assert "SPY" in DEFAULT_SECTOR_MAP
        assert "BTC-USD" in DEFAULT_SECTOR_MAP

    def test_correlation_matrix_single_symbol(self):
        """Test correlation matrix with single symbol."""
        matrix = CorrelationMatrix(
            symbols=["AAPL"],
            matrix=np.array([[1.0]]),
            lookback_days=60,
        )

        assert matrix.get_correlation("AAPL", "AAPL") == 1.0

    def test_volatility_metrics_to_dict(self):
        """Test VolatilityMetrics serialization."""
        metrics = VolatilityMetrics(
            symbol="AAPL",
            daily_volatility=0.02,
            annualized_volatility=0.32,
            realized_vol_20d=0.30,
            realized_vol_60d=0.35,
            atr_pct=0.025,
            regime=VolatilityRegime.NORMAL,
            lookback_days=20,
        )

        result = metrics.to_dict()

        assert result["symbol"] == "AAPL"
        assert result["regime"] == "NORMAL"
        assert "calculated_at" in result

    @pytest.mark.asyncio
    async def test_circuit_breaker_cooldown_expiry(self):
        """Test circuit breaker cooldown expiry."""
        rules = [
            CircuitBreakerRule(
                breaker_type=CircuitBreakerType.MAX_POSITIONS,
                threshold=5,
                cooldown_minutes=0,  # Immediate cooldown end
                auto_reset=True,
            ),
        ]
        breaker = CircuitBreaker(rules=rules)

        # Set to cooldown with past expiry
        breaker.states[CircuitBreakerType.MAX_POSITIONS].status = CircuitBreakerStatus.COOLDOWN
        breaker.states[CircuitBreakerType.MAX_POSITIONS].cooldown_until = datetime.utcnow() - timedelta(minutes=1)

        # Run check - should reset to ACTIVE
        portfolio_state = {
            "position_count": 3,
            "daily_pnl_pct": 0,
            "weekly_pnl_pct": 0,
            "drawdown_pct": 0,
            "sector_exposure": {},
            "correlated_pairs": [],
        }

        await breaker.check_all(portfolio_state)

        assert breaker.states[CircuitBreakerType.MAX_POSITIONS].status == CircuitBreakerStatus.ACTIVE
