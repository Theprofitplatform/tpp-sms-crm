"""
Realistic Fill Engine - Unified Fill Simulation

Integrates all simulation components into a single, production-ready
fill engine with comprehensive order execution realism.

Features:
    - Volume-constrained partial fills
    - Volatility and spread-based slippage
    - Market-specific transaction costs
    - Order queue delay simulation
    - Bid-ask spread modeling
    - Fill model versioning for audit trail
    - VWAP/TWAP execution algorithms

Usage:
    from simulation.realistic_engine import RealisticFillEngine, FillConfig

    config = FillConfig(
        max_volume_participation=0.1,
        slippage_model="volatility",
        enable_partial_fills=True,
    )

    engine = RealisticFillEngine(config)
    result = await engine.execute_order(order, market_context)

Configuration:
    FILL_MODEL_VERSION: Version string for audit trail
    MAX_VOLUME_PARTICIPATION: Default max volume participation (0.1 = 10%)
    SLIPPAGE_MODEL: Default slippage model (fixed, volatility, spread)
    ENABLE_PARTIAL_FILLS: Enable partial fill simulation
    ORDER_QUEUE_DELAY_MS: Simulated order queue delay

Dependencies:
    - fills.py (FillSimulator, PartialFill)
    - slippage.py (SlippageModels)
    - costs.py (TransactionCostModel)
"""

import os
import uuid
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
import random
import math

import structlog

from simulation.fills import FillSimulator, FillResult, FillStatus, PartialFill, BarData
from simulation.slippage import (
    SlippageModel,
    FixedSlippageModel,
    VolatilitySlippageModel,
    SpreadSlippageModel,
    OrderInfo,
    MarketData,
)
from simulation.costs import (
    TransactionCostModel,
    TransactionCosts,
    USFeeConfig,
    ASXFeeConfig,
    CryptoFeeConfig,
)

logger = structlog.get_logger(__name__)


# Current fill model version - increment when logic changes
FILL_MODEL_VERSION = "1.0.0"


class SlippageModelType(str, Enum):
    """Available slippage model types."""
    FIXED = "fixed"
    VOLATILITY = "volatility"
    SPREAD = "spread"
    COMPOSITE = "composite"


class ExecutionAlgorithm(str, Enum):
    """Order execution algorithms."""
    IMMEDIATE = "immediate"    # Fill at current price
    NEXT_BAR = "next_bar"      # Fill at next bar open
    VWAP = "vwap"              # Volume-weighted average price
    TWAP = "twap"              # Time-weighted average price
    ADAPTIVE = "adaptive"      # Adapts based on order size/urgency


@dataclass
class MarketContext:
    """
    Market context for fill simulation.

    Provides all market data needed for realistic fill calculations.
    """
    symbol: str
    market: str
    current_price: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: float = 0.0
    avg_daily_volume: float = 0.0
    volatility: float = 0.0  # Annualized volatility
    atr: float = 0.0  # Average True Range
    spread_bps: Optional[float] = None  # Bid-ask spread in basis points
    bars: List[BarData] = field(default_factory=list)  # Historical bars for simulation
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def mid_price(self) -> float:
        """Calculate mid price from bid/ask or use current price."""
        if self.bid and self.ask:
            return (self.bid + self.ask) / 2
        return self.current_price

    @property
    def spread(self) -> float:
        """Calculate bid-ask spread."""
        if self.bid and self.ask:
            return self.ask - self.bid
        if self.spread_bps:
            return self.current_price * (self.spread_bps / 10000)
        # Default spread estimate based on price
        return self.current_price * 0.001  # 10 bps default

    def to_market_data(self) -> MarketData:
        """Convert to MarketData for slippage calculation."""
        return MarketData(
            bid=self.bid,
            ask=self.ask,
            last_price=self.current_price,
            volume=self.volume,
            avg_volume=self.avg_daily_volume,
            volatility=self.volatility,
            atr=self.atr,
        )


@dataclass
class FillConfig:
    """
    Configuration for realistic fill simulation.

    Attributes:
        max_volume_participation: Max fraction of bar volume to fill (0.1 = 10%)
        slippage_model: Type of slippage model to use
        slippage_bps: Base slippage in basis points (for fixed model)
        enable_partial_fills: Allow orders to fill across multiple bars
        enable_price_improvement: Allow fills at better-than-limit prices
        enable_queue_delay: Simulate order queue delay
        queue_delay_ms: Order queue delay in milliseconds
        execution_algorithm: Execution algorithm to use
        limit_order_delay_bars: Minimum bars before limit order can fill
        apply_transaction_costs: Apply market-specific fees
    """
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

    @classmethod
    def from_env(cls) -> "FillConfig":
        """Create config from environment variables."""
        return cls(
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

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
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


@dataclass
class FillEvent:
    """
    Single fill event within an order.

    Represents one execution of a portion of an order.
    """
    fill_id: str
    order_id: str
    quantity: float
    price: float
    slippage: float
    timestamp: datetime
    bar_index: int = 0
    is_final: bool = False
    execution_venue: str = "paper"

    @property
    def value(self) -> float:
        """Total value of this fill."""
        return self.quantity * self.price

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "fill_id": self.fill_id,
            "order_id": self.order_id,
            "quantity": self.quantity,
            "price": self.price,
            "slippage": self.slippage,
            "timestamp": self.timestamp.isoformat(),
            "bar_index": self.bar_index,
            "is_final": self.is_final,
            "execution_venue": self.execution_venue,
        }


@dataclass
class ExecutionResult:
    """
    Complete result of order execution.

    Contains all fills, costs, and audit information.
    """
    order_id: str
    status: str  # FILLED, PARTIAL, PENDING, REJECTED
    fills: List[FillEvent]
    filled_quantity: float
    remaining_quantity: float
    average_price: float
    total_slippage: float
    transaction_costs: Optional[TransactionCosts] = None
    bars_to_complete: int = 0
    queue_delay_ms: float = 0.0
    fill_model_version: str = FILL_MODEL_VERSION
    config_snapshot: Dict[str, Any] = field(default_factory=dict)
    execution_start: datetime = field(default_factory=datetime.utcnow)
    execution_end: Optional[datetime] = None

    @property
    def is_complete(self) -> bool:
        """Check if order is completely filled."""
        return self.status == "FILLED"

    @property
    def total_value(self) -> float:
        """Total value of all fills."""
        return sum(f.value for f in self.fills)

    @property
    def total_cost(self) -> float:
        """Total execution cost including slippage and fees."""
        base_cost = self.total_slippage
        if self.transaction_costs:
            base_cost += self.transaction_costs.total
        return base_cost

    @property
    def execution_duration_ms(self) -> float:
        """Execution duration in milliseconds."""
        if self.execution_end:
            delta = self.execution_end - self.execution_start
            return delta.total_seconds() * 1000
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "order_id": self.order_id,
            "status": self.status,
            "fills": [f.to_dict() for f in self.fills],
            "filled_quantity": self.filled_quantity,
            "remaining_quantity": self.remaining_quantity,
            "average_price": self.average_price,
            "total_slippage": self.total_slippage,
            "total_cost": self.total_cost,
            "transaction_costs": (
                self.transaction_costs.to_dict() if self.transaction_costs else None
            ),
            "bars_to_complete": self.bars_to_complete,
            "queue_delay_ms": self.queue_delay_ms,
            "fill_model_version": self.fill_model_version,
            "config_snapshot": self.config_snapshot,
            "execution_duration_ms": self.execution_duration_ms,
        }


class RealisticFillEngine:
    """
    Unified fill simulation engine with production-grade realism.

    Combines volume-constrained fills, sophisticated slippage models,
    market-specific transaction costs, and order queue simulation.

    Example:
        config = FillConfig(
            max_volume_participation=0.1,
            slippage_model=SlippageModelType.VOLATILITY,
        )

        engine = RealisticFillEngine(config)

        result = await engine.execute_order(
            order={"symbol": "AAPL", "side": "BUY", "quantity": 1000, "order_type": "MARKET"},
            context=MarketContext(symbol="AAPL", market="US", current_price=150.0, volume=5000000),
        )

        if result.status == "FILLED":
            print(f"Filled {result.filled_quantity} @ {result.average_price}")
            print(f"Total cost: ${result.total_cost}")
    """

    def __init__(self, config: Optional[FillConfig] = None):
        """
        Initialize realistic fill engine.

        Args:
            config: Fill configuration (uses defaults from env if not provided)
        """
        self.config = config or FillConfig.from_env()

        # Initialize slippage model
        self.slippage_model = self._create_slippage_model()

        # Initialize fill simulator
        self.fill_simulator = FillSimulator(
            max_volume_participation=self.config.max_volume_participation,
            limit_order_delay_bars=self.config.limit_order_delay_bars,
            enable_partial_fills=self.config.enable_partial_fills,
            enable_price_improvement=self.config.enable_price_improvement,
            slippage_model=self.slippage_model,
        )

        # Transaction cost models by market
        self._cost_models: Dict[str, TransactionCostModel] = {}

        # Statistics
        self._total_orders = 0
        self._total_fills = 0
        self._total_slippage = 0.0
        self._total_costs = 0.0

        logger.info(
            "Realistic fill engine initialized",
            config=self.config.to_dict(),
            version=FILL_MODEL_VERSION,
        )

    def _create_slippage_model(self) -> SlippageModel:
        """Create slippage model based on config."""
        if self.config.slippage_model == SlippageModelType.FIXED:
            return FixedSlippageModel(
                bps=self.config.slippage_bps,
                randomize=True,
            )
        elif self.config.slippage_model == SlippageModelType.VOLATILITY:
            return VolatilitySlippageModel(
                base_bps=self.config.slippage_bps,
                vol_multiplier=0.5,
                size_impact_factor=0.1,
            )
        elif self.config.slippage_model == SlippageModelType.SPREAD:
            return SpreadSlippageModel(
                impact_factor=0.5,
                fallback_spread_bps=self.config.slippage_bps,
            )
        else:
            # Default to volatility model
            return VolatilitySlippageModel(base_bps=self.config.slippage_bps)

    def _get_cost_model(self, market: str) -> TransactionCostModel:
        """Get or create transaction cost model for a market."""
        if market not in self._cost_models:
            self._cost_models[market] = TransactionCostModel(market)
        return self._cost_models[market]

    def _calculate_slippage(
        self,
        order: Dict[str, Any],
        context: MarketContext,
        fill_quantity: float,
    ) -> float:
        """
        Calculate slippage for a fill.

        Args:
            order: Order dictionary
            context: Market context
            fill_quantity: Quantity being filled

        Returns:
            Slippage amount in price terms
        """
        order_info = OrderInfo(
            symbol=order["symbol"],
            side=order["side"],
            quantity=fill_quantity,
            price=context.current_price,
            order_type=order.get("order_type", "MARKET"),
        )

        market_data = context.to_market_data()
        return self.slippage_model.calculate_slippage(order_info, market_data)

    def _apply_slippage_to_price(
        self,
        price: float,
        slippage: float,
        side: str,
    ) -> float:
        """Apply slippage to price based on order side."""
        if side == "BUY":
            return price + slippage  # Buyer pays more
        else:
            return price - slippage  # Seller receives less

    async def _simulate_queue_delay(self) -> float:
        """
        Simulate order queue delay.

        Returns:
            Actual delay in milliseconds
        """
        if not self.config.enable_queue_delay:
            return 0.0

        # Add some randomness to delay (0.5x to 2x of configured delay)
        delay_ms = self.config.queue_delay_ms * random.uniform(0.5, 2.0)

        # Actually wait (scaled down for testing - 1ms real per 100ms simulated)
        await asyncio.sleep(delay_ms / 100000)

        return delay_ms

    def _calculate_volume_constraint(
        self,
        order_quantity: float,
        bar_volume: float,
    ) -> Tuple[float, float]:
        """
        Calculate volume-constrained fill quantity.

        Args:
            order_quantity: Desired order quantity
            bar_volume: Available bar volume

        Returns:
            Tuple of (fill_quantity, remaining_quantity)
        """
        if bar_volume <= 0:
            return 0.0, order_quantity

        max_fill = bar_volume * self.config.max_volume_participation
        fill_qty = min(order_quantity, max_fill)
        remaining = order_quantity - fill_qty

        return fill_qty, remaining

    def _execute_immediate(
        self,
        order: Dict[str, Any],
        context: MarketContext,
    ) -> ExecutionResult:
        """Execute order immediately at current price."""
        order_id = order.get("id", str(uuid.uuid4()))
        now = datetime.utcnow()

        quantity = order["quantity"]
        side = order["side"]

        # Apply volume constraint if volume data available
        if context.volume > 0:
            fill_qty, remaining = self._calculate_volume_constraint(
                quantity, context.volume
            )
        else:
            fill_qty = quantity
            remaining = 0.0

        if fill_qty == 0:
            return ExecutionResult(
                order_id=order_id,
                status="PENDING",
                fills=[],
                filled_quantity=0.0,
                remaining_quantity=quantity,
                average_price=0.0,
                total_slippage=0.0,
                config_snapshot=self.config.to_dict(),
            )

        # Calculate slippage
        slippage = self._calculate_slippage(order, context, fill_qty)
        fill_price = self._apply_slippage_to_price(
            context.current_price, slippage, side
        )

        # Create fill event
        fill = FillEvent(
            fill_id=str(uuid.uuid4()),
            order_id=order_id,
            quantity=fill_qty,
            price=fill_price,
            slippage=slippage,
            timestamp=now,
            bar_index=0,
            is_final=(remaining == 0),
        )

        # Calculate transaction costs
        transaction_costs = None
        if self.config.apply_transaction_costs:
            cost_model = self._get_cost_model(context.market)
            transaction_costs = cost_model.calculate_costs(
                symbol=order["symbol"],
                side=side,
                quantity=fill_qty,
                price=fill_price,
            )

        status = "FILLED" if remaining == 0 else "PARTIAL"

        return ExecutionResult(
            order_id=order_id,
            status=status,
            fills=[fill],
            filled_quantity=fill_qty,
            remaining_quantity=remaining,
            average_price=fill_price,
            total_slippage=slippage * fill_qty,
            transaction_costs=transaction_costs,
            bars_to_complete=0,
            queue_delay_ms=0.0,
            config_snapshot=self.config.to_dict(),
            execution_end=datetime.utcnow(),
        )

    def _execute_next_bar(
        self,
        order: Dict[str, Any],
        context: MarketContext,
    ) -> ExecutionResult:
        """Execute order at next bar open (more realistic)."""
        order_id = order.get("id", str(uuid.uuid4()))
        now = datetime.utcnow()

        quantity = order["quantity"]
        side = order["side"]

        # If we have bar data, use the first bar's open as fill price
        if context.bars:
            base_price = context.bars[0].open
        else:
            base_price = context.current_price

        # Apply volume constraint
        bar_volume = context.bars[0].volume if context.bars else context.volume
        fill_qty, remaining = self._calculate_volume_constraint(quantity, bar_volume)

        if fill_qty == 0:
            return ExecutionResult(
                order_id=order_id,
                status="PENDING",
                fills=[],
                filled_quantity=0.0,
                remaining_quantity=quantity,
                average_price=0.0,
                total_slippage=0.0,
                config_snapshot=self.config.to_dict(),
            )

        # Calculate slippage based on volume participation
        participation = fill_qty / bar_volume if bar_volume > 0 else 1.0
        base_slippage = self._calculate_slippage(order, context, fill_qty)

        # Add market impact for larger orders
        impact_multiplier = 1.0 + (participation * 2.0)  # Up to 3x slippage at 100% participation
        total_slippage = base_slippage * impact_multiplier

        fill_price = self._apply_slippage_to_price(base_price, total_slippage, side)

        fills = []
        total_filled = 0.0
        remaining_qty = quantity
        bar_index = 0

        # Simulate fills across multiple bars if partial fills enabled
        while remaining_qty > 0 and bar_index < len(context.bars) if context.bars else remaining_qty > 0 and bar_index < 1:
            bar = context.bars[bar_index] if context.bars and bar_index < len(context.bars) else None
            bar_vol = bar.volume if bar else bar_volume

            if bar_vol > 0:
                max_fill = bar_vol * self.config.max_volume_participation
                this_fill = min(remaining_qty, max_fill)

                if this_fill > 0:
                    # Calculate fill price for this bar
                    bar_price = bar.open if bar else base_price
                    bar_slippage = self._calculate_slippage(order, context, this_fill)
                    bar_fill_price = self._apply_slippage_to_price(
                        bar_price, bar_slippage, side
                    )

                    fill = FillEvent(
                        fill_id=str(uuid.uuid4()),
                        order_id=order_id,
                        quantity=this_fill,
                        price=bar_fill_price,
                        slippage=bar_slippage,
                        timestamp=bar.timestamp if bar else now,
                        bar_index=bar_index,
                        is_final=(remaining_qty - this_fill == 0),
                    )
                    fills.append(fill)

                    total_filled += this_fill
                    remaining_qty -= this_fill

            bar_index += 1

            # Break if partial fills disabled
            if not self.config.enable_partial_fills:
                break

        # Calculate weighted average price
        if fills:
            total_value = sum(f.quantity * f.price for f in fills)
            avg_price = total_value / total_filled
            total_slip = sum(f.slippage * f.quantity for f in fills)
        else:
            avg_price = 0.0
            total_slip = 0.0

        # Calculate transaction costs
        transaction_costs = None
        if self.config.apply_transaction_costs and total_filled > 0:
            cost_model = self._get_cost_model(context.market)
            transaction_costs = cost_model.calculate_costs(
                symbol=order["symbol"],
                side=side,
                quantity=total_filled,
                price=avg_price,
            )

        status = "FILLED" if remaining_qty == 0 else "PARTIAL" if total_filled > 0 else "PENDING"

        return ExecutionResult(
            order_id=order_id,
            status=status,
            fills=fills,
            filled_quantity=total_filled,
            remaining_quantity=remaining_qty,
            average_price=avg_price,
            total_slippage=total_slip,
            transaction_costs=transaction_costs,
            bars_to_complete=bar_index,
            queue_delay_ms=0.0,
            config_snapshot=self.config.to_dict(),
            execution_end=datetime.utcnow(),
        )

    def _execute_vwap(
        self,
        order: Dict[str, Any],
        context: MarketContext,
    ) -> ExecutionResult:
        """Execute order using VWAP algorithm across bars."""
        order_id = order.get("id", str(uuid.uuid4()))
        now = datetime.utcnow()

        if not context.bars:
            # Fall back to immediate execution if no bar data
            return self._execute_immediate(order, context)

        quantity = order["quantity"]
        side = order["side"]

        # Calculate total volume across bars
        total_volume = sum(b.volume for b in context.bars)
        if total_volume == 0:
            return self._execute_immediate(order, context)

        fills = []
        total_filled = 0.0
        remaining_qty = quantity

        # Distribute order across bars proportionally to volume
        for bar_index, bar in enumerate(context.bars):
            if remaining_qty <= 0:
                break

            # Allocate based on volume proportion
            volume_fraction = bar.volume / total_volume
            target_fill = quantity * volume_fraction

            # Apply volume participation limit
            max_fill = bar.volume * self.config.max_volume_participation
            this_fill = min(remaining_qty, target_fill, max_fill)

            if this_fill > 0:
                # Use bar's VWAP if available, otherwise typical price
                fill_price = bar.vwap if bar.vwap else bar.typical_price

                # Apply slippage
                slippage = self._calculate_slippage(order, context, this_fill)
                fill_price = self._apply_slippage_to_price(fill_price, slippage, side)

                fill = FillEvent(
                    fill_id=str(uuid.uuid4()),
                    order_id=order_id,
                    quantity=this_fill,
                    price=fill_price,
                    slippage=slippage,
                    timestamp=bar.timestamp,
                    bar_index=bar_index,
                    is_final=False,
                )
                fills.append(fill)

                total_filled += this_fill
                remaining_qty -= this_fill

        # Mark last fill as final
        if fills:
            fills[-1].is_final = True

        # Calculate weighted average price
        if fills:
            total_value = sum(f.quantity * f.price for f in fills)
            avg_price = total_value / total_filled
            total_slip = sum(f.slippage * f.quantity for f in fills)
        else:
            avg_price = 0.0
            total_slip = 0.0

        # Calculate transaction costs
        transaction_costs = None
        if self.config.apply_transaction_costs and total_filled > 0:
            cost_model = self._get_cost_model(context.market)
            transaction_costs = cost_model.calculate_costs(
                symbol=order["symbol"],
                side=side,
                quantity=total_filled,
                price=avg_price,
            )

        status = "FILLED" if remaining_qty == 0 else "PARTIAL" if total_filled > 0 else "PENDING"

        return ExecutionResult(
            order_id=order_id,
            status=status,
            fills=fills,
            filled_quantity=total_filled,
            remaining_quantity=remaining_qty,
            average_price=avg_price,
            total_slippage=total_slip,
            transaction_costs=transaction_costs,
            bars_to_complete=len(fills),
            queue_delay_ms=0.0,
            config_snapshot=self.config.to_dict(),
            execution_end=datetime.utcnow(),
        )

    async def execute_order(
        self,
        order: Dict[str, Any],
        context: MarketContext,
        algorithm: Optional[ExecutionAlgorithm] = None,
    ) -> ExecutionResult:
        """
        Execute an order with realistic simulation.

        Args:
            order: Order dictionary with symbol, side, quantity, order_type, price
            context: Market context with current prices and volume
            algorithm: Optional execution algorithm override

        Returns:
            ExecutionResult with fills, costs, and audit data
        """
        self._total_orders += 1
        algo = algorithm or self.config.execution_algorithm

        # Simulate queue delay
        queue_delay = await self._simulate_queue_delay()

        # Execute based on algorithm
        if algo == ExecutionAlgorithm.IMMEDIATE:
            result = self._execute_immediate(order, context)
        elif algo == ExecutionAlgorithm.NEXT_BAR:
            result = self._execute_next_bar(order, context)
        elif algo == ExecutionAlgorithm.VWAP:
            result = self._execute_vwap(order, context)
        elif algo == ExecutionAlgorithm.TWAP:
            # TWAP distributes evenly across time - similar to VWAP but equal weights
            result = self._execute_next_bar(order, context)
        else:
            # Adaptive - choose based on order size
            if order["quantity"] * context.current_price > 100000:
                result = self._execute_vwap(order, context)
            else:
                result = self._execute_next_bar(order, context)

        # Update statistics
        self._total_fills += len(result.fills)
        self._total_slippage += result.total_slippage
        if result.transaction_costs:
            self._total_costs += result.transaction_costs.total

        # Add queue delay to result
        result.queue_delay_ms = queue_delay

        logger.info(
            "Order executed",
            order_id=result.order_id,
            status=result.status,
            fills=len(result.fills),
            filled_qty=result.filled_quantity,
            avg_price=result.average_price,
            total_slippage=result.total_slippage,
            total_cost=result.total_cost,
            algorithm=algo.value,
        )

        return result

    def execute_order_sync(
        self,
        order: Dict[str, Any],
        context: MarketContext,
        algorithm: Optional[ExecutionAlgorithm] = None,
    ) -> ExecutionResult:
        """
        Synchronous version of execute_order.

        For use in non-async contexts.
        """
        algo = algorithm or self.config.execution_algorithm

        if algo == ExecutionAlgorithm.IMMEDIATE:
            return self._execute_immediate(order, context)
        elif algo == ExecutionAlgorithm.VWAP:
            return self._execute_vwap(order, context)
        else:
            return self._execute_next_bar(order, context)

    def get_stats(self) -> Dict[str, Any]:
        """Get engine statistics."""
        return {
            "total_orders": self._total_orders,
            "total_fills": self._total_fills,
            "total_slippage": self._total_slippage,
            "total_costs": self._total_costs,
            "average_slippage_per_fill": (
                self._total_slippage / self._total_fills
                if self._total_fills > 0 else 0
            ),
            "fill_model_version": FILL_MODEL_VERSION,
            "config": self.config.to_dict(),
        }

    def reset_stats(self) -> None:
        """Reset engine statistics."""
        self._total_orders = 0
        self._total_fills = 0
        self._total_slippage = 0.0
        self._total_costs = 0.0

    def update_config(self, **kwargs) -> None:
        """
        Update configuration parameters.

        Args:
            **kwargs: Configuration parameters to update
        """
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)

        # Recreate slippage model if model type changed
        if "slippage_model" in kwargs or "slippage_bps" in kwargs:
            self.slippage_model = self._create_slippage_model()

        # Update fill simulator
        self.fill_simulator = FillSimulator(
            max_volume_participation=self.config.max_volume_participation,
            limit_order_delay_bars=self.config.limit_order_delay_bars,
            enable_partial_fills=self.config.enable_partial_fills,
            enable_price_improvement=self.config.enable_price_improvement,
            slippage_model=self.slippage_model,
        )

        logger.info("Fill engine config updated", updates=kwargs)


# Global engine instance
_fill_engine: Optional[RealisticFillEngine] = None


def get_fill_engine() -> RealisticFillEngine:
    """Get the global fill engine instance."""
    global _fill_engine
    if _fill_engine is None:
        _fill_engine = RealisticFillEngine()
    return _fill_engine


def set_fill_engine(engine: RealisticFillEngine) -> None:
    """Set the global fill engine instance."""
    global _fill_engine
    _fill_engine = engine
