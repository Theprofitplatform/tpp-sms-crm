"""
Backtest Realism Simulation Module

This module provides realistic simulation components for backtesting:
- Slippage models (fixed, volatility-based, spread-based)
- Partial fill simulation based on volume participation
- Market hours and holiday calendars
- Transaction cost models per market
- Corporate action adjustments (splits, dividends)

Usage:
    from simulation import SlippageModel, FillSimulator, MarketSession, TransactionCostModel
    from simulation.slippage import VolatilitySlippageModel, create_slippage_model
    from simulation.fills import FillSimulator, create_fill_simulator
    from simulation.market_hours import MarketSession, is_market_open, get_next_open
    from simulation.costs import TransactionCostModel, create_cost_model
    from simulation.corporate_actions import (
        CorporateActionHandler,
        adjust_for_split,
        adjust_for_dividend,
    )

Example - Realistic backtest setup:
    from simulation import (
        VolatilitySlippageModel,
        FillSimulator,
        MarketSession,
        TransactionCostModel,
        CorporateActionHandler,
    )

    # Initialize components
    slippage = VolatilitySlippageModel(base_bps=5, vol_multiplier=0.5)
    fills = FillSimulator(max_volume_participation=0.1)
    costs = TransactionCostModel("US")
    session = MarketSession("US")
    corp_actions = CorporateActionHandler()

    # Check if market is open
    if session.is_open():
        # Calculate slippage and costs
        order_info = OrderInfo("AAPL", "BUY", 100, 150.0, "MARKET")
        market_data = MarketData(last_price=150.0, volume=1000000)
        slip = slippage.calculate_slippage(order_info, market_data)
        trade_costs = costs.calculate_costs("AAPL", "BUY", 100, 150.0 + slip)
"""

from .slippage import (
    SlippageModel,
    FixedSlippageModel,
    VolatilitySlippageModel,
    SpreadSlippageModel,
    CompositeSlippageModel,
    OrderInfo,
    MarketData,
    create_slippage_model,
)
from .fills import (
    FillSimulator,
    FillResult,
    FillStatus,
    PartialFill,
    BarData,
    create_fill_simulator,
)
from .market_hours import (
    MarketSession,
    MarketType,
    MarketConfig,
    TradingHours,
    is_market_open,
    get_next_open,
    get_market_session,
    filter_to_market_hours,
    get_us_holidays,
    get_asx_holidays,
    get_crypto_holidays,
)
from .costs import (
    TransactionCostModel,
    TransactionCosts,
    CostType,
    CostItem,
    USFeeConfig,
    ASXFeeConfig,
    CryptoFeeConfig,
    ForexFeeConfig,
    create_cost_model,
    get_zero_cost_model,
)
from .corporate_actions import (
    CorporateActionHandler,
    CorporateAction,
    ActionType,
    Position,
    AdjustmentResult,
    PriceBar,
    adjust_for_split,
    adjust_for_dividend,
    adjust_for_stock_dividend,
    adjust_prices_for_split,
    adjust_prices_for_dividend,
    calculate_adjustment_factor,
)
from .realistic_engine import (
    RealisticFillEngine,
    FillConfig,
    MarketContext,
    FillEvent,
    ExecutionResult,
    ExecutionAlgorithm,
    SlippageModelType,
    FILL_MODEL_VERSION,
    get_fill_engine,
    set_fill_engine,
)
from .trading_sessions import (
    TradingSessionManager,
    SessionState,
    SessionInfo,
    SessionEvent,
    OrderTimingValidation,
    EarlyCloseCalendar,
    get_session_manager,
    set_session_manager,
)

__all__ = [
    # Slippage
    "SlippageModel",
    "FixedSlippageModel",
    "VolatilitySlippageModel",
    "SpreadSlippageModel",
    "CompositeSlippageModel",
    "OrderInfo",
    "MarketData",
    "create_slippage_model",
    # Fills
    "FillSimulator",
    "FillResult",
    "FillStatus",
    "PartialFill",
    "BarData",
    "create_fill_simulator",
    # Market Hours
    "MarketSession",
    "MarketType",
    "MarketConfig",
    "TradingHours",
    "is_market_open",
    "get_next_open",
    "get_market_session",
    "filter_to_market_hours",
    "get_us_holidays",
    "get_asx_holidays",
    "get_crypto_holidays",
    # Costs
    "TransactionCostModel",
    "TransactionCosts",
    "CostType",
    "CostItem",
    "USFeeConfig",
    "ASXFeeConfig",
    "CryptoFeeConfig",
    "ForexFeeConfig",
    "create_cost_model",
    "get_zero_cost_model",
    # Corporate Actions
    "CorporateActionHandler",
    "CorporateAction",
    "ActionType",
    "Position",
    "AdjustmentResult",
    "PriceBar",
    "adjust_for_split",
    "adjust_for_dividend",
    "adjust_for_stock_dividend",
    "adjust_prices_for_split",
    "adjust_prices_for_dividend",
    "calculate_adjustment_factor",
    # Realistic Fill Engine
    "RealisticFillEngine",
    "FillConfig",
    "MarketContext",
    "FillEvent",
    "ExecutionResult",
    "ExecutionAlgorithm",
    "SlippageModelType",
    "FILL_MODEL_VERSION",
    "get_fill_engine",
    "set_fill_engine",
    # Trading Sessions
    "TradingSessionManager",
    "SessionState",
    "SessionInfo",
    "SessionEvent",
    "OrderTimingValidation",
    "EarlyCloseCalendar",
    "get_session_manager",
    "set_session_manager",
]
