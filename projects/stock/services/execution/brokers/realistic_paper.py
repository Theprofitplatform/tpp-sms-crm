"""
Realistic Paper Trading Broker

Extends the PaperBroker with production-grade fill simulation including:
- Volume-constrained partial fills
- Sophisticated slippage models
- Market-specific transaction costs
- Order queue delay simulation
- VWAP/TWAP execution algorithms
- Full audit trail with fill model versioning

Usage:
    from brokers.realistic_paper import RealisticPaperBroker, BrokerConfig

    config = BrokerConfig(
        initial_balance=100000,
        max_volume_participation=0.1,
        slippage_model="volatility",
        enable_partial_fills=True,
    )

    broker = RealisticPaperBroker(config)
    result = await broker.submit_order_async(order, market_context)

Configuration:
    All FillConfig options plus:
    - initial_balance: Starting cash balance
    - base_currency: Portfolio base currency (default AUD)
    - commission_per_trade: Fixed commission per trade

Dependencies:
    - brokers/paper.py (PaperBroker)
    - simulation/realistic_engine.py (RealisticFillEngine)
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any

import structlog

from brokers.paper import PaperBroker, DEFAULT_MARKET_CURRENCIES
from simulation.realistic_engine import (
    RealisticFillEngine,
    FillConfig,
    MarketContext,
    ExecutionResult,
    ExecutionAlgorithm,
    SlippageModelType,
    FILL_MODEL_VERSION,
)
from simulation.costs import TransactionCosts

logger = structlog.get_logger(__name__)


@dataclass
class BrokerConfig:
    """
    Configuration for RealisticPaperBroker.

    Combines broker settings with fill simulation settings.
    """
    # Broker settings
    initial_balance: float = 100000.0
    base_currency: str = "AUD"
    commission_per_trade: float = 0.0

    # Fill settings (from FillConfig)
    max_volume_participation: float = 0.1
    slippage_model: SlippageModelType = SlippageModelType.VOLATILITY
    slippage_bps: float = 5.0
    enable_partial_fills: bool = True
    enable_price_improvement: bool = True
    enable_queue_delay: bool = True
    queue_delay_ms: float = 50.0
    execution_algorithm: ExecutionAlgorithm = ExecutionAlgorithm.NEXT_BAR
    limit_order_delay_bars: int = 1
    apply_transaction_costs: bool = True

    def to_fill_config(self) -> FillConfig:
        """Convert to FillConfig."""
        return FillConfig(
            max_volume_participation=self.max_volume_participation,
            slippage_model=self.slippage_model,
            slippage_bps=self.slippage_bps,
            enable_partial_fills=self.enable_partial_fills,
            enable_price_improvement=self.enable_price_improvement,
            enable_queue_delay=self.enable_queue_delay,
            queue_delay_ms=self.queue_delay_ms,
            execution_algorithm=self.execution_algorithm,
            limit_order_delay_bars=self.limit_order_delay_bars,
            apply_transaction_costs=self.apply_transaction_costs,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "initial_balance": self.initial_balance,
            "base_currency": self.base_currency,
            "commission_per_trade": self.commission_per_trade,
            "max_volume_participation": self.max_volume_participation,
            "slippage_model": self.slippage_model.value,
            "slippage_bps": self.slippage_bps,
            "enable_partial_fills": self.enable_partial_fills,
            "enable_price_improvement": self.enable_price_improvement,
            "enable_queue_delay": self.enable_queue_delay,
            "queue_delay_ms": self.queue_delay_ms,
            "execution_algorithm": self.execution_algorithm.value,
            "limit_order_delay_bars": self.limit_order_delay_bars,
            "apply_transaction_costs": self.apply_transaction_costs,
        }


class RealisticPaperBroker(PaperBroker):
    """
    Paper trading broker with realistic fill simulation.

    Extends PaperBroker with:
    - Volume-constrained partial fills
    - Sophisticated slippage models
    - Market-specific transaction costs
    - Order queue delay simulation
    - Full audit trail with fill model versioning

    Example:
        config = BrokerConfig(
            initial_balance=100000,
            slippage_model=SlippageModelType.VOLATILITY,
            enable_partial_fills=True,
        )

        broker = RealisticPaperBroker(config)

        # Create market context
        context = MarketContext(
            symbol="AAPL",
            market="US",
            current_price=150.0,
            volume=5000000,
            avg_daily_volume=10000000,
            volatility=0.02,
        )

        # Submit order with realistic fill simulation
        result = await broker.submit_order_async(
            symbol="AAPL",
            market="US",
            side="BUY",
            quantity=1000,
            order_type="MARKET",
            context=context,
        )

        if result["status"] == "FILLED":
            print(f"Filled {result['filled_quantity']} @ {result['average_fill_price']}")
            print(f"Slippage: ${result['total_slippage']}")
            print(f"Costs: ${result['transaction_costs']['total']}")
    """

    def __init__(
        self,
        config: Optional[BrokerConfig] = None,
        fx_service: Optional[Any] = None,
    ):
        """
        Initialize realistic paper broker.

        Args:
            config: Broker configuration (uses defaults if not provided)
            fx_service: FXRateService instance for currency conversion
        """
        self.broker_config = config or BrokerConfig()

        # Initialize parent PaperBroker
        super().__init__(
            initial_balance=self.broker_config.initial_balance,
            commission_per_trade=self.broker_config.commission_per_trade,
            slippage_pct=0.0,  # We use the fill engine for slippage
            base_currency=self.broker_config.base_currency,
            fx_service=fx_service,
        )

        # Initialize realistic fill engine
        self.fill_engine = RealisticFillEngine(
            config=self.broker_config.to_fill_config()
        )

        # Track pending partial orders
        self._pending_partials: Dict[str, Dict[str, Any]] = {}

        # Execution statistics
        self._execution_stats = {
            "total_orders": 0,
            "filled_orders": 0,
            "partial_orders": 0,
            "rejected_orders": 0,
            "total_slippage": 0.0,
            "total_costs": 0.0,
            "avg_fill_time_ms": 0.0,
        }

        logger.info(
            "Realistic paper broker initialized",
            config=self.broker_config.to_dict(),
            fill_model_version=FILL_MODEL_VERSION,
        )

    async def submit_order_async(
        self,
        symbol: str,
        market: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        signal_id: Optional[str] = None,
        risk_check_id: Optional[str] = None,
        reason: str = "",
        data_snapshot_hash: str = "",
        rule_version_id: str = "",
        context: Optional[MarketContext] = None,
        algorithm: Optional[ExecutionAlgorithm] = None,
    ) -> Dict[str, Any]:
        """
        Submit an order with realistic fill simulation.

        Args:
            symbol: Ticker symbol
            market: Market identifier (US, ASX, CRYPTO)
            side: BUY or SELL
            quantity: Order quantity
            order_type: MARKET, LIMIT, STOP, etc.
            price: Limit price (required for LIMIT orders)
            stop_price: Stop price (for STOP orders)
            signal_id: Associated signal ID
            risk_check_id: Risk validation ID
            reason: Trade reason for audit
            data_snapshot_hash: Hash of data used
            rule_version_id: Version of rules used
            context: Market context for fill simulation
            algorithm: Execution algorithm override

        Returns:
            Order dictionary with fill details
        """
        order_id = str(uuid.uuid4())
        now = datetime.utcnow()
        self._execution_stats["total_orders"] += 1

        # Get trade currency and FX rate
        trade_currency = self._get_market_currency(market)
        fx_rate = self._get_fx_rate_sync(trade_currency)

        # Create base order
        order = {
            "id": order_id,
            "symbol": symbol,
            "market": market,
            "side": side,
            "order_type": order_type,
            "quantity": quantity,
            "price": price,
            "stop_price": stop_price,
            "status": "PENDING",
            "filled_quantity": 0,
            "average_fill_price": None,
            "commission": 0,
            "signal_id": signal_id,
            "risk_check_id": risk_check_id,
            "reason": reason,
            "data_snapshot_hash": data_snapshot_hash,
            "rule_version_id": rule_version_id,
            "created_at": now,
            "submitted_at": now,
            "filled_at": None,
            # FX fields
            "base_currency": self.base_currency,
            "trade_currency": trade_currency,
            "fx_rate_at_entry": fx_rate,
            "amount_base": None,
            "amount_trade": None,
            # Fill simulation fields
            "fill_model_version": FILL_MODEL_VERSION,
            "execution_algorithm": (algorithm or self.broker_config.execution_algorithm).value,
            "total_slippage": 0.0,
            "transaction_costs": None,
            "queue_delay_ms": 0.0,
            "fill_events": [],
        }

        # Build market context if not provided
        if context is None:
            context = MarketContext(
                symbol=symbol,
                market=market,
                current_price=price or 100.0,
                volume=0,  # No volume constraint without context
            )

        # Check if we can afford the order
        estimated_cost = context.current_price * quantity
        estimated_cost_base = estimated_cost / fx_rate if fx_rate > 0 else estimated_cost
        total_cash_base = self._get_total_cash_base()

        if side == "BUY" and estimated_cost_base > total_cash_base:
            order["status"] = "REJECTED"
            order["reject_reason"] = "INSUFFICIENT_FUNDS"
            self.orders[order_id] = order
            self._execution_stats["rejected_orders"] += 1
            logger.warning(
                "Order rejected - insufficient funds",
                order_id=order_id,
                required=estimated_cost_base,
                available=total_cash_base,
            )
            return order

        # Execute order through fill engine
        order_dict = {
            "id": order_id,
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "order_type": order_type,
            "price": price,
        }

        result = await self.fill_engine.execute_order(
            order=order_dict,
            context=context,
            algorithm=algorithm,
        )

        # Process execution result
        order = self._process_execution_result(
            order=order,
            result=result,
            trade_currency=trade_currency,
            fx_rate=fx_rate,
        )

        self.orders[order_id] = order

        # Handle partial fills
        if order["status"] == "PARTIAL" and result.remaining_quantity > 0:
            self._pending_partials[order_id] = {
                "order": order,
                "remaining": result.remaining_quantity,
                "context": context,
                "algorithm": algorithm,
            }

        return order

    def _process_execution_result(
        self,
        order: Dict[str, Any],
        result: ExecutionResult,
        trade_currency: str,
        fx_rate: float,
    ) -> Dict[str, Any]:
        """
        Process execution result and update order/positions.

        Args:
            order: Order dictionary
            result: ExecutionResult from fill engine
            trade_currency: Trading currency
            fx_rate: FX rate at execution

        Returns:
            Updated order dictionary
        """
        now = datetime.utcnow()

        if not result.fills:
            # No fills occurred
            order["status"] = "PENDING"
            return order

        # Update order with fill information
        order["status"] = result.status
        order["filled_quantity"] = result.filled_quantity
        order["average_fill_price"] = result.average_price
        order["total_slippage"] = result.total_slippage
        order["queue_delay_ms"] = result.queue_delay_ms
        order["fill_events"] = [f.to_dict() for f in result.fills]

        if result.transaction_costs:
            order["transaction_costs"] = result.transaction_costs.to_dict()
            order["commission"] = result.transaction_costs.total

        # Calculate trade values
        trade_value_trade = result.average_price * result.filled_quantity
        trade_value_base = trade_value_trade / fx_rate if fx_rate > 0 else trade_value_trade
        order["amount_trade"] = trade_value_trade
        order["amount_base"] = trade_value_base

        # Update position for each fill
        total_pnl_trade = 0.0
        total_pnl_base = 0.0
        total_fx_impact = 0.0

        for fill_event in result.fills:
            realized = self._update_position(
                symbol=order["symbol"],
                market=order["market"],
                side=order["side"],
                quantity=fill_event.quantity,
                price=fill_event.price,
                trade_currency=trade_currency,
                fx_rate=fx_rate,
            )

            if realized:
                total_pnl_trade += realized["pnl_trade"]
                total_pnl_base += realized["pnl_base"]
                total_fx_impact += realized["fx_impact"]

        # Update cash
        if order["side"] == "BUY":
            self._deduct_cash(trade_value_base + order["commission"])
        else:
            self._add_cash(trade_value_base - order["commission"])

        # Update realized P&L
        if total_pnl_base != 0:
            self.realized_pnl_base += total_pnl_base
            self.total_fx_impact += total_fx_impact

        # Create trade records
        for fill in result.fills:
            trade = self._create_trade_record(
                order=order,
                fill=fill,
                trade_currency=trade_currency,
                fx_rate=fx_rate,
                transaction_costs=result.transaction_costs,
            )
            self.trades.append(trade)

        # Mark order as filled
        if result.status == "FILLED":
            order["filled_at"] = now
            self._execution_stats["filled_orders"] += 1
        elif result.status == "PARTIAL":
            self._execution_stats["partial_orders"] += 1

        # Update statistics
        self._execution_stats["total_slippage"] += result.total_slippage
        if result.transaction_costs:
            self._execution_stats["total_costs"] += result.transaction_costs.total

        logger.info(
            "Order processed",
            order_id=order["id"],
            status=order["status"],
            filled_qty=result.filled_quantity,
            avg_price=result.average_price,
            slippage=result.total_slippage,
            fills=len(result.fills),
            algorithm=order["execution_algorithm"],
        )

        return order

    def _create_trade_record(
        self,
        order: Dict[str, Any],
        fill: Any,
        trade_currency: str,
        fx_rate: float,
        transaction_costs: Optional[TransactionCosts],
    ) -> Dict[str, Any]:
        """Create a trade record from a fill event."""
        # Allocate costs proportionally
        fill_fraction = fill.quantity / order["filled_quantity"]
        allocated_costs = (
            transaction_costs.total * fill_fraction
            if transaction_costs else 0
        )

        return {
            "id": str(uuid.uuid4()),
            "fill_id": fill.fill_id,
            "order_id": order["id"],
            "symbol": order["symbol"],
            "market": order["market"],
            "side": order["side"],
            "quantity": fill.quantity,
            "price": fill.price,
            "slippage": fill.slippage,
            "commission": allocated_costs,
            "signal_id": order.get("signal_id"),
            "risk_check_id": order.get("risk_check_id"),
            "reason": order["reason"],
            "data_snapshot_hash": order["data_snapshot_hash"],
            "rule_version_id": order["rule_version_id"],
            "fill_model_version": order["fill_model_version"],
            "timestamp": fill.timestamp,
            "bar_index": fill.bar_index,
            # FX fields
            "base_currency": self.base_currency,
            "trade_currency": trade_currency,
            "fx_rate_at_execution": fx_rate,
            # Execution details
            "execution_venue": fill.execution_venue,
            "is_final_fill": fill.is_final,
        }

    async def continue_partial_orders(
        self,
        new_contexts: Dict[str, MarketContext],
    ) -> List[Dict[str, Any]]:
        """
        Continue filling partially filled orders with new market data.

        Args:
            new_contexts: New market contexts keyed by symbol

        Returns:
            List of updated orders
        """
        updated_orders = []

        for order_id, pending in list(self._pending_partials.items()):
            symbol = pending["order"]["symbol"]
            if symbol not in new_contexts:
                continue

            context = new_contexts[symbol]
            remaining = pending["remaining"]

            # Create order for remaining quantity
            order_dict = {
                "id": order_id,
                "symbol": symbol,
                "side": pending["order"]["side"],
                "quantity": remaining,
                "order_type": pending["order"]["order_type"],
                "price": pending["order"]["price"],
            }

            # Execute remaining
            result = await self.fill_engine.execute_order(
                order=order_dict,
                context=context,
                algorithm=pending["algorithm"],
            )

            if result.fills:
                # Update order with new fills
                order = pending["order"]
                trade_currency = order["trade_currency"]
                fx_rate = self._get_fx_rate_sync(trade_currency)

                # Process additional fills
                order = self._process_execution_result(
                    order=order,
                    result=result,
                    trade_currency=trade_currency,
                    fx_rate=fx_rate,
                )

                # Update remaining
                if result.remaining_quantity > 0:
                    pending["remaining"] = result.remaining_quantity
                else:
                    del self._pending_partials[order_id]
                    order["status"] = "FILLED"
                    order["filled_at"] = datetime.utcnow()

                self.orders[order_id] = order
                updated_orders.append(order)

        return updated_orders

    def submit_order(
        self,
        symbol: str,
        market: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        signal_id: Optional[str] = None,
        risk_check_id: Optional[str] = None,
        reason: str = "",
        data_snapshot_hash: str = "",
        rule_version_id: str = "",
    ) -> Dict[str, Any]:
        """
        Synchronous order submission (falls back to parent behavior).

        For realistic fill simulation, use submit_order_async instead.
        """
        # For sync calls, use simplified parent behavior
        return super().submit_order(
            symbol=symbol,
            market=market,
            side=side,
            quantity=quantity,
            order_type=order_type,
            price=price,
            stop_price=stop_price,
            signal_id=signal_id,
            risk_check_id=risk_check_id,
            reason=reason,
            data_snapshot_hash=data_snapshot_hash,
            rule_version_id=rule_version_id,
        )

    def get_fill_engine_stats(self) -> Dict[str, Any]:
        """Get fill engine statistics."""
        return self.fill_engine.get_stats()

    def get_execution_stats(self) -> Dict[str, Any]:
        """Get broker execution statistics."""
        stats = self._execution_stats.copy()
        stats["fill_engine"] = self.get_fill_engine_stats()
        stats["pending_partials"] = len(self._pending_partials)
        return stats

    def update_fill_config(self, **kwargs) -> None:
        """
        Update fill engine configuration.

        Args:
            **kwargs: Configuration parameters to update
        """
        self.fill_engine.update_config(**kwargs)

        # Update broker config
        for key, value in kwargs.items():
            if hasattr(self.broker_config, key):
                setattr(self.broker_config, key, value)

        logger.info("Broker config updated", updates=kwargs)

    def reset(self) -> None:
        """Reset broker to initial state."""
        # Reset parent state
        self.cash_by_currency = {self.base_currency: self.broker_config.initial_balance}
        self.orders = {}
        self.positions = {}
        self.trades = []
        self.realized_pnl_base = 0.0
        self.total_fx_impact = 0.0
        self.peak_equity = self.broker_config.initial_balance

        # Reset fill engine
        self.fill_engine.reset_stats()

        # Reset pending partials
        self._pending_partials = {}

        # Reset execution stats
        self._execution_stats = {
            "total_orders": 0,
            "filled_orders": 0,
            "partial_orders": 0,
            "rejected_orders": 0,
            "total_slippage": 0.0,
            "total_costs": 0.0,
            "avg_fill_time_ms": 0.0,
        }

        logger.info("Realistic paper broker reset")

    def get_account_with_fill_info(self) -> Dict[str, Any]:
        """Get account info including fill simulation details."""
        account = self.get_account_extended()
        account["execution_stats"] = self.get_execution_stats()
        account["fill_model_version"] = FILL_MODEL_VERSION
        account["broker_config"] = self.broker_config.to_dict()
        return account


# Factory function for creating broker from environment
def create_realistic_broker(
    initial_balance: Optional[float] = None,
    fx_service: Optional[Any] = None,
    **kwargs,
) -> RealisticPaperBroker:
    """
    Create a RealisticPaperBroker from environment and kwargs.

    Args:
        initial_balance: Starting balance (overrides env)
        fx_service: FXRateService instance
        **kwargs: Additional config parameters

    Returns:
        Configured RealisticPaperBroker instance
    """
    import os

    config = BrokerConfig(
        initial_balance=initial_balance or float(
            os.getenv('INITIAL_BALANCE', '100000')
        ),
        base_currency=os.getenv('BASE_CURRENCY', 'AUD'),
        commission_per_trade=float(
            os.getenv('COMMISSION_PER_TRADE', '0')
        ),
        max_volume_participation=float(
            os.getenv('MAX_VOLUME_PARTICIPATION', '0.1')
        ),
        slippage_model=SlippageModelType(
            os.getenv('SLIPPAGE_MODEL', 'volatility')
        ),
        slippage_bps=float(os.getenv('SLIPPAGE_BPS', '5.0')),
        enable_partial_fills=os.getenv(
            'ENABLE_PARTIAL_FILLS', 'true'
        ).lower() == 'true',
        enable_queue_delay=os.getenv(
            'ENABLE_QUEUE_DELAY', 'true'
        ).lower() == 'true',
        queue_delay_ms=float(os.getenv('ORDER_QUEUE_DELAY_MS', '50')),
        apply_transaction_costs=os.getenv(
            'APPLY_TRANSACTION_COSTS', 'true'
        ).lower() == 'true',
    )

    # Override with kwargs
    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)

    return RealisticPaperBroker(config=config, fx_service=fx_service)
