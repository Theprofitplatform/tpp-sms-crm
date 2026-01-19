"""
Tests for Backtest Simulation Module

Comprehensive tests for:
- Slippage models (fixed, volatility, spread)
- Fill simulation (partial fills, limit orders, stops)
- Market hours and holiday calendars
- Transaction costs (US, ASX, Crypto)
- Corporate actions (splits, dividends)

Usage:
    pytest services/execution/tests/test_simulation.py -v
"""

import pytest
from datetime import datetime, date, time, timedelta
from unittest.mock import Mock, patch
import pytz

# Import simulation modules
from simulation.slippage import (
    SlippageModel,
    FixedSlippageModel,
    VolatilitySlippageModel,
    SpreadSlippageModel,
    CompositeSlippageModel,
    OrderInfo,
    MarketData,
    create_slippage_model,
)
from simulation.fills import (
    FillSimulator,
    FillResult,
    FillStatus,
    PartialFill,
    BarData,
    create_fill_simulator,
)
from simulation.market_hours import (
    MarketSession,
    MarketType,
    is_market_open,
    get_next_open,
    get_us_holidays,
    get_asx_holidays,
    filter_to_market_hours,
)
from simulation.costs import (
    TransactionCostModel,
    TransactionCosts,
    CostType,
    CostItem,
    USFeeConfig,
    ASXFeeConfig,
    CryptoFeeConfig,
    create_cost_model,
    get_zero_cost_model,
)
from simulation.corporate_actions import (
    CorporateActionHandler,
    CorporateAction,
    ActionType,
    Position,
    adjust_for_split,
    adjust_for_dividend,
    adjust_for_stock_dividend,
)


# =============================================================================
# Slippage Model Tests
# =============================================================================

class TestFixedSlippageModel:
    """Tests for FixedSlippageModel."""

    def test_basic_slippage_calculation(self):
        """Test basic slippage calculation."""
        model = FixedSlippageModel(bps=10.0, randomize=False)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=150.0, order_type="MARKET")
        market_data = MarketData(last_price=150.0)

        slippage = model.calculate_slippage(order, market_data)

        # 10 bps = 0.10% = $0.15 on $150
        assert slippage == pytest.approx(0.15, rel=0.01)

    def test_execution_price_buy(self):
        """Test execution price for buy orders (higher due to slippage)."""
        model = FixedSlippageModel(bps=10.0, randomize=False)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)

        exec_price = model.get_execution_price(order, market_data)

        assert exec_price > order.price  # Buy at higher price

    def test_execution_price_sell(self):
        """Test execution price for sell orders (lower due to slippage)."""
        model = FixedSlippageModel(bps=10.0, randomize=False)
        order = OrderInfo(symbol="AAPL", side="SELL", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)

        exec_price = model.get_execution_price(order, market_data)

        assert exec_price < order.price  # Sell at lower price

    def test_randomized_slippage_varies(self):
        """Test that randomized slippage produces variation."""
        model = FixedSlippageModel(bps=10.0, randomize=True)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)

        slippages = [model.calculate_slippage(order, market_data) for _ in range(100)]

        # Should have variation
        assert max(slippages) != min(slippages)
        # But all should be positive
        assert all(s >= 0 for s in slippages)


class TestVolatilitySlippageModel:
    """Tests for VolatilitySlippageModel."""

    def test_higher_volatility_increases_slippage(self):
        """Test that higher volatility increases slippage."""
        model = VolatilitySlippageModel(base_bps=5.0, vol_multiplier=1.0, randomize=False)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")

        low_vol_data = MarketData(last_price=100.0, volatility=0.01)
        high_vol_data = MarketData(last_price=100.0, volatility=0.05)

        low_vol_slippage = model.calculate_slippage(order, low_vol_data)
        high_vol_slippage = model.calculate_slippage(order, high_vol_data)

        assert high_vol_slippage > low_vol_slippage

    def test_larger_order_size_increases_slippage(self):
        """Test that larger order size relative to volume increases slippage."""
        model = VolatilitySlippageModel(
            base_bps=5.0, vol_multiplier=0.5, size_impact_factor=0.5, randomize=False
        )
        market_data = MarketData(last_price=100.0, avg_volume=1000000, volatility=0.02)

        small_order = OrderInfo(symbol="AAPL", side="BUY", quantity=1000, price=100.0, order_type="MARKET")
        large_order = OrderInfo(symbol="AAPL", side="BUY", quantity=100000, price=100.0, order_type="MARKET")

        small_slippage = model.calculate_slippage(small_order, market_data)
        large_slippage = model.calculate_slippage(large_order, market_data)

        assert large_slippage > small_slippage


class TestSpreadSlippageModel:
    """Tests for SpreadSlippageModel."""

    def test_uses_actual_spread(self):
        """Test that model uses actual bid-ask spread."""
        model = SpreadSlippageModel(impact_factor=0.0, use_full_spread=True)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(bid=99.95, ask=100.05, last_price=100.0)

        slippage = model.calculate_slippage(order, market_data)

        # Full spread is $0.10
        assert slippage >= 0.10

    def test_fallback_when_no_spread(self):
        """Test fallback when bid/ask not available."""
        model = SpreadSlippageModel(fallback_spread_bps=20.0)
        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)  # No bid/ask

        slippage = model.calculate_slippage(order, market_data)

        # Should use fallback
        assert slippage > 0


class TestCompositeSlippageModel:
    """Tests for CompositeSlippageModel."""

    def test_sum_aggregation(self):
        """Test sum aggregation of multiple models."""
        model1 = FixedSlippageModel(bps=5.0, randomize=False)
        model2 = FixedSlippageModel(bps=5.0, randomize=False)
        composite = CompositeSlippageModel([model1, model2], aggregation='sum')

        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)

        slippage = composite.calculate_slippage(order, market_data)

        # Should be sum of both (10 bps total)
        assert slippage == pytest.approx(0.10, rel=0.01)

    def test_max_aggregation(self):
        """Test max aggregation."""
        model1 = FixedSlippageModel(bps=5.0, randomize=False)
        model2 = FixedSlippageModel(bps=10.0, randomize=False)
        composite = CompositeSlippageModel([model1, model2], aggregation='max')

        order = OrderInfo(symbol="AAPL", side="BUY", quantity=100, price=100.0, order_type="MARKET")
        market_data = MarketData(last_price=100.0)

        slippage = composite.calculate_slippage(order, market_data)

        # Should be max (10 bps)
        assert slippage == pytest.approx(0.10, rel=0.01)


class TestSlippageModelFactory:
    """Tests for slippage model factory function."""

    def test_create_fixed_model(self):
        """Test creating fixed slippage model from config."""
        config = {"model": "fixed", "bps": 15.0, "randomize": False}
        model = create_slippage_model(config)

        assert isinstance(model, FixedSlippageModel)
        assert model.bps == 15.0

    def test_create_volatility_model(self):
        """Test creating volatility slippage model from config."""
        config = {"model": "volatility", "base_bps": 3.0, "vol_multiplier": 0.8}
        model = create_slippage_model(config)

        assert isinstance(model, VolatilitySlippageModel)
        assert model.base_bps == 3.0

    def test_create_spread_model(self):
        """Test creating spread slippage model from config."""
        config = {"model": "spread", "impact_factor": 0.3}
        model = create_slippage_model(config)

        assert isinstance(model, SpreadSlippageModel)


# =============================================================================
# Fill Simulation Tests
# =============================================================================

class TestFillSimulator:
    """Tests for FillSimulator."""

    def create_sample_bars(self, num_bars: int = 10) -> list:
        """Create sample bar data for testing."""
        base_date = datetime(2024, 1, 1, 10, 0, 0)
        bars = []
        for i in range(num_bars):
            bars.append(BarData(
                timestamp=base_date + timedelta(days=i),
                open=100.0 + i,
                high=102.0 + i,
                low=99.0 + i,
                close=101.0 + i,
                volume=1000000,
            ))
        return bars

    def test_market_order_fills_at_next_bar(self):
        """Test market order fills at next bar open."""
        simulator = FillSimulator(max_volume_participation=1.0)
        bars = self.create_sample_bars()

        order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "order_type": "MARKET",
        }

        result = simulator.simulate_fill(order, bars, start_bar_index=0)

        assert result.status == FillStatus.FILLED
        assert result.filled_quantity == 100
        # Should fill at bar index 1
        assert len(result.fills) >= 1

    def test_partial_fills_based_on_volume(self):
        """Test partial fills when order exceeds volume participation."""
        simulator = FillSimulator(max_volume_participation=0.01, enable_partial_fills=True)
        bars = self.create_sample_bars()

        # Order for 50,000 shares but only 1% of 1M volume = 10,000 per bar
        order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 50000,
            "order_type": "MARKET",
        }

        result = simulator.simulate_fill(order, bars, start_bar_index=0)

        # Should require multiple fills
        assert len(result.fills) > 1
        assert result.filled_quantity == 50000 or result.status == FillStatus.PARTIAL

    def test_limit_order_waits_for_price(self):
        """Test limit order only fills when price is reached."""
        simulator = FillSimulator(limit_order_delay_bars=1)

        # Bars where price doesn't reach limit until bar 5
        bars = [
            BarData(timestamp=datetime(2024, 1, i+1), open=105, high=106, low=104, close=105, volume=1000000)
            for i in range(5)
        ]
        bars.append(BarData(
            timestamp=datetime(2024, 1, 6),
            open=99, high=100, low=98, close=99, volume=1000000
        ))

        order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "price": 100.0,  # Limit price
            "order_type": "LIMIT",
        }

        result = simulator.simulate_fill(order, bars, start_bar_index=0)

        # Should only fill when price drops to 100
        if result.status == FillStatus.FILLED:
            assert result.fills[0].bar_index >= 5

    def test_stop_order_triggers_at_stop_price(self):
        """Test stop order becomes market order when stop price hit."""
        simulator = FillSimulator()

        # Price rises to trigger stop
        bars = [
            BarData(timestamp=datetime(2024, 1, i+1), open=100+i, high=102+i, low=99+i, close=101+i, volume=1000000)
            for i in range(5)
        ]

        order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "price": 105.0,
            "stop_price": 105.0,
            "order_type": "STOP",
        }

        result = simulator.simulate_fill(order, bars, start_bar_index=0)

        # Should trigger when high >= 105
        assert result.status in [FillStatus.FILLED, FillStatus.PENDING]


class TestFillSimulatorFactory:
    """Tests for fill simulator factory."""

    def test_create_from_config(self):
        """Test creating fill simulator from config."""
        config = {
            "partial_fills_enabled": True,
            "max_volume_participation": 0.05,
            "limit_order_delay_bars": 3,
        }
        simulator = create_fill_simulator(config)

        assert simulator.max_volume_participation == 0.05
        assert simulator.limit_order_delay_bars == 3
        assert simulator.enable_partial_fills is True


# =============================================================================
# Market Hours Tests
# =============================================================================

class TestMarketSession:
    """Tests for MarketSession."""

    def test_us_market_hours(self):
        """Test US market regular hours."""
        session = MarketSession("US")

        # 10:30 AM ET on a Monday should be open
        open_time = datetime(2024, 1, 8, 10, 30, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_open(open_time) is True

        # 5 PM ET should be closed
        closed_time = datetime(2024, 1, 8, 17, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_open(closed_time) is False

    def test_crypto_always_open(self):
        """Test crypto market is 24/7."""
        session = MarketSession("CRYPTO")

        # Any time should be open
        assert session.is_open(datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)) is True
        assert session.is_open(datetime(2024, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)) is True
        assert session.is_open(datetime(2024, 1, 1, 23, 59, 0, tzinfo=pytz.UTC)) is True

    def test_weekend_is_closed(self):
        """Test US market closed on weekends."""
        session = MarketSession("US")

        # Saturday
        saturday = datetime(2024, 1, 6, 12, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_trading_day(saturday) is False

        # Sunday
        sunday = datetime(2024, 1, 7, 12, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_trading_day(sunday) is False

    def test_holiday_is_closed(self):
        """Test market closed on holidays."""
        session = MarketSession("US")

        # Christmas 2024 is a Wednesday
        christmas = datetime(2024, 12, 25, 12, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_trading_day(christmas) is False

    def test_extended_hours(self):
        """Test extended hours session."""
        session = MarketSession("US", include_extended_hours=True)

        # 5 AM ET (pre-market) should be open with extended hours
        pre_market = datetime(2024, 1, 8, 5, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        assert session.is_open(pre_market) is True

        # Without extended hours
        session_regular = MarketSession("US", include_extended_hours=False)
        assert session_regular.is_open(pre_market) is False

    def test_get_next_open(self):
        """Test getting next market open time."""
        session = MarketSession("US")

        # On a Friday evening
        friday_eve = datetime(2024, 1, 5, 18, 0, 0, tzinfo=pytz.timezone("America/New_York"))
        next_open = session.get_next_open(friday_eve)

        # Should be Monday morning
        assert next_open.weekday() == 0  # Monday


class TestHolidayCalendars:
    """Tests for holiday calendar functions."""

    def test_us_holidays_2024(self):
        """Test US holidays for 2024."""
        holidays = get_us_holidays(2024)

        # New Year's Day (observed)
        assert date(2024, 1, 1) in holidays

        # MLK Day (3rd Monday in January)
        assert date(2024, 1, 15) in holidays

        # Christmas
        assert date(2024, 12, 25) in holidays

    def test_asx_holidays_2024(self):
        """Test ASX holidays for 2024."""
        holidays = get_asx_holidays(2024)

        # Australia Day (observed)
        assert date(2024, 1, 26) in holidays

        # ANZAC Day
        assert date(2024, 4, 25) in holidays


class TestMarketHoursConvenienceFunctions:
    """Tests for convenience functions."""

    def test_is_market_open_function(self):
        """Test is_market_open convenience function."""
        open_time = datetime(2024, 1, 8, 10, 30, 0, tzinfo=pytz.timezone("America/New_York"))
        assert is_market_open("US", open_time) is True

    def test_filter_to_market_hours(self):
        """Test filtering timestamps to market hours."""
        ny_tz = pytz.timezone("America/New_York")
        timestamps = [
            datetime(2024, 1, 8, 9, 0, 0, tzinfo=ny_tz),   # Before open
            datetime(2024, 1, 8, 10, 0, 0, tzinfo=ny_tz),  # During hours
            datetime(2024, 1, 8, 17, 0, 0, tzinfo=ny_tz),  # After close
        ]

        filtered = filter_to_market_hours(timestamps, "US")

        assert len(filtered) == 1
        assert filtered[0].hour == 10


# =============================================================================
# Transaction Cost Tests
# =============================================================================

class TestTransactionCostModel:
    """Tests for TransactionCostModel."""

    def test_us_sell_has_sec_fee(self):
        """Test US sell orders include SEC fee."""
        model = TransactionCostModel("US", USFeeConfig())
        costs = model.calculate_costs("AAPL", "SELL", 100, 150.0)

        # Should have SEC fee
        sec_fees = [c for c in costs.items if c.cost_type == CostType.REGULATORY_FEE]
        assert len(sec_fees) > 0

    def test_us_buy_no_sec_fee(self):
        """Test US buy orders don't have SEC fee."""
        model = TransactionCostModel("US", USFeeConfig())
        costs = model.calculate_costs("AAPL", "BUY", 100, 150.0)

        # Should not have SEC fee
        sec_fees = [
            c for c in costs.items
            if c.cost_type == CostType.REGULATORY_FEE and "SEC" in c.description
        ]
        assert len(sec_fees) == 0

    def test_asx_brokerage_calculation(self):
        """Test ASX brokerage fee calculation."""
        model = TransactionCostModel("ASX", ASXFeeConfig(flat_fee=9.50, percentage_fee=0.0011))

        # Small trade: flat fee
        small_costs = model.calculate_costs("CBA.AX", "BUY", 10, 100.0)
        assert small_costs.total >= 9.50

        # Large trade: percentage
        large_costs = model.calculate_costs("CBA.AX", "BUY", 1000, 100.0)
        assert large_costs.total > small_costs.total

    def test_crypto_maker_taker_fees(self):
        """Test crypto maker/taker fees."""
        model = TransactionCostModel("CRYPTO", CryptoFeeConfig(maker_fee_rate=0.001, taker_fee_rate=0.002))

        maker_costs = model.calculate_costs("BTC-USD", "BUY", 0.5, 50000.0, is_maker=True)
        taker_costs = model.calculate_costs("BTC-USD", "BUY", 0.5, 50000.0, is_maker=False)

        # Taker should be more expensive
        assert taker_costs.total > maker_costs.total

    def test_round_trip_cost_estimation(self):
        """Test round-trip cost estimation."""
        model = TransactionCostModel("US", USFeeConfig(commission_per_trade=4.95))

        round_trip = model.estimate_round_trip_cost("AAPL", 100, 150.0)

        # Should include buy and sell costs
        assert round_trip > 0

    def test_minimum_profitable_move(self):
        """Test minimum profitable move calculation."""
        model = TransactionCostModel("US", USFeeConfig(commission_per_trade=4.95))

        min_move = model.get_minimum_profitable_move("AAPL", 100, 150.0)

        # Should be positive
        assert min_move > 0


class TestCostModelFactory:
    """Tests for cost model factory functions."""

    def test_create_from_config(self):
        """Test creating cost model from config."""
        config = {
            "market": "US",
            "commission_per_trade": 9.95,
        }
        model = create_cost_model(config)

        assert isinstance(model, TransactionCostModel)
        assert model.market == "US"

    def test_zero_cost_model(self):
        """Test zero-cost model for comparison backtests."""
        model = get_zero_cost_model("US")
        costs = model.calculate_costs("AAPL", "SELL", 100, 150.0)

        assert costs.total == 0.0


# =============================================================================
# Corporate Actions Tests
# =============================================================================

class TestCorporateActionHandler:
    """Tests for CorporateActionHandler."""

    def test_add_split(self):
        """Test adding a stock split."""
        handler = CorporateActionHandler()
        action = handler.add_split("AAPL", date(2020, 8, 31), 4.0)

        assert action.action_type == ActionType.SPLIT
        assert action.ratio == 4.0

    def test_add_dividend(self):
        """Test adding a cash dividend."""
        handler = CorporateActionHandler()
        action = handler.add_dividend("AAPL", date(2023, 11, 10), 0.24)

        assert action.action_type == ActionType.CASH_DIVIDEND
        assert action.ratio == 0.24

    def test_get_adjustment_factor(self):
        """Test getting cumulative adjustment factor."""
        handler = CorporateActionHandler()
        handler.add_split("AAPL", date(2020, 8, 31), 4.0)
        handler.add_split("AAPL", date(2014, 6, 9), 7.0)

        factor = handler.get_adjustment_factor("AAPL")

        # Cumulative factor should be 4 * 7 = 28
        assert factor == 28.0


class TestPositionAdjustments:
    """Tests for position adjustment functions."""

    def test_adjust_for_split(self):
        """Test position adjustment for stock split."""
        # Before 4:1 split: 25 shares @ $400
        position = Position("AAPL", 25, 400.0, cost_basis=10000.0)

        # After 4:1 split: 100 shares @ $100
        adjusted = adjust_for_split(position, 4.0)

        assert adjusted.quantity == 100
        assert adjusted.average_price == pytest.approx(100.0, rel=0.01)
        # Cost basis should be unchanged
        assert adjusted.cost_basis == 10000.0

    def test_adjust_for_reverse_split(self):
        """Test position adjustment for reverse split."""
        # Before 1:10 reverse split: 100 shares @ $5
        position = Position("XYZ", 100, 5.0, cost_basis=500.0)

        # After 1:10 reverse split: 10 shares @ $50
        adjusted = adjust_for_split(position, 0.1)

        assert adjusted.quantity == 10
        assert adjusted.average_price == pytest.approx(50.0, rel=0.01)

    def test_adjust_for_dividend_cash(self):
        """Test cash dividend adjustment."""
        position = Position("AAPL", 100, 150.0)

        adjusted, cash = adjust_for_dividend(position, 0.24, reinvest=False)

        # Position unchanged
        assert adjusted.quantity == 100
        # Cash received
        assert cash == pytest.approx(24.0, rel=0.01)

    def test_adjust_for_dividend_reinvest(self):
        """Test dividend reinvestment (DRIP)."""
        position = Position("AAPL", 100, 150.0, cost_basis=15000.0)

        adjusted, cash = adjust_for_dividend(
            position, 0.24, reinvest=True, current_price=150.0
        )

        # Should have more shares
        assert adjusted.quantity > 100
        # No cash paid out
        assert cash == 0.0

    def test_adjust_for_stock_dividend(self):
        """Test stock dividend adjustment."""
        # 10% stock dividend on 100 shares
        position = Position("XYZ", 100, 50.0, cost_basis=5000.0)

        adjusted = adjust_for_stock_dividend(position, 0.1)

        # Should have 110 shares
        assert adjusted.quantity == 110
        # Cost basis unchanged, average price lower
        assert adjusted.cost_basis == 5000.0
        assert adjusted.average_price < 50.0


class TestCorporateActionIntegration:
    """Integration tests for corporate actions with positions."""

    def test_full_workflow(self):
        """Test complete workflow with multiple corporate actions."""
        handler = CorporateActionHandler()

        # Add actions
        handler.add_split("AAPL", date(2020, 8, 31), 4.0)
        handler.add_dividend("AAPL", date(2023, 11, 10), 0.24)

        # Get actions in range
        actions = handler.get_actions("AAPL", start_date=date(2020, 1, 1))

        assert len(actions) == 2

        # Verify adjustment factor
        factor = handler.get_adjustment_factor("AAPL")
        assert factor == 4.0  # Only split affects adjustment factor


# =============================================================================
# Integration Tests
# =============================================================================

class TestSimulationIntegration:
    """Integration tests combining multiple simulation components."""

    def test_full_trade_simulation(self):
        """Test complete trade simulation with all components."""
        # Setup components
        slippage_model = VolatilitySlippageModel(base_bps=5.0, randomize=False)
        cost_model = TransactionCostModel("US")
        market_session = MarketSession("US")

        # Sample order
        order = OrderInfo(
            symbol="AAPL",
            side="BUY",
            quantity=100,
            price=150.0,
            order_type="MARKET",
        )

        market_data = MarketData(
            last_price=150.0,
            volume=5000000,
            volatility=0.02,
        )

        # Calculate slippage
        slippage = slippage_model.calculate_slippage(order, market_data)
        exec_price = order.price + slippage

        # Calculate costs
        costs = cost_model.calculate_costs("AAPL", "BUY", 100, exec_price)

        # Verify all components work together
        assert slippage >= 0
        assert costs.total >= 0
        assert exec_price > order.price

    def test_round_trip_with_realism(self):
        """Test complete round-trip trade with realistic simulation."""
        cost_model = TransactionCostModel("US", USFeeConfig(commission_per_trade=0))
        slippage = VolatilitySlippageModel(base_bps=5.0, randomize=False)

        # Entry
        entry_order = OrderInfo("AAPL", "BUY", 100, 150.0, "MARKET")
        entry_market = MarketData(last_price=150.0, volume=1000000, volatility=0.02)
        entry_slippage = slippage.calculate_slippage(entry_order, entry_market)
        entry_price = 150.0 + entry_slippage
        entry_costs = cost_model.calculate_costs("AAPL", "BUY", 100, entry_price)

        # Exit at higher price
        exit_order = OrderInfo("AAPL", "SELL", 100, 155.0, "MARKET")
        exit_market = MarketData(last_price=155.0, volume=1000000, volatility=0.02)
        exit_slippage = slippage.calculate_slippage(exit_order, exit_market)
        exit_price = 155.0 - exit_slippage
        exit_costs = cost_model.calculate_costs("AAPL", "SELL", 100, exit_price)

        # Calculate P&L
        gross_pnl = (exit_price - entry_price) * 100
        net_pnl = gross_pnl - entry_costs.total - exit_costs.total

        # Should still be profitable but less than without costs
        theoretical_pnl = (155.0 - 150.0) * 100  # $500
        assert net_pnl < theoretical_pnl
        assert net_pnl > 0  # Still profitable


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
