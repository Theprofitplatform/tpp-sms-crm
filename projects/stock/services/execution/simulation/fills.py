"""
Fill Simulation for Backtest Realism

Simulates realistic order fills including:
- Partial fills based on volume participation
- Fill delays for limit orders
- Price improvement/deterioration
- Volume-weighted average price (VWAP) fills

Usage:
    simulator = FillSimulator(max_volume_participation=0.1)
    fills = simulator.simulate_fill(order, market_data)
    for fill in fills:
        print(f"Filled {fill.quantity} @ {fill.price}")

Dependencies:
    - dataclasses
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum
import random
import math


@dataclass
class PartialFill:
    """Represents a single partial fill of an order."""
    quantity: float
    price: float
    timestamp: datetime
    slippage: float = 0.0
    is_final: bool = False
    fill_id: Optional[str] = None
    bar_index: int = 0  # Which bar this fill occurred on

    @property
    def value(self) -> float:
        """Total value of this fill."""
        return self.quantity * self.price


class FillStatus(str, Enum):
    """Fill status for tracking order completion."""
    PENDING = "PENDING"
    PARTIAL = "PARTIAL"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


@dataclass
class FillResult:
    """Result of fill simulation for an order."""
    fills: List[PartialFill]
    status: FillStatus
    filled_quantity: float
    remaining_quantity: float
    average_price: float
    total_slippage: float
    bars_to_complete: int

    @property
    def is_complete(self) -> bool:
        """Check if order is completely filled."""
        return self.status == FillStatus.FILLED

    @property
    def total_value(self) -> float:
        """Total value of all fills."""
        return sum(f.value for f in self.fills)


@dataclass
class BarData:
    """OHLCV bar data for fill simulation."""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    vwap: Optional[float] = None

    @property
    def typical_price(self) -> float:
        """Typical price = (H + L + C) / 3"""
        return (self.high + self.low + self.close) / 3

    def price_in_range(self, price: float) -> bool:
        """Check if price is within bar's range."""
        return self.low <= price <= self.high


class FillSimulator:
    """
    Simulates realistic order fills for backtesting.

    Features:
    - Partial fills based on volume participation limits
    - Fill delay for limit orders
    - Price slippage based on market conditions
    - VWAP-based execution for large orders

    Example:
        simulator = FillSimulator(
            max_volume_participation=0.1,
            limit_order_delay_bars=2
        )
        result = simulator.simulate_fill(order, bars)
    """

    def __init__(
        self,
        max_volume_participation: float = 0.1,
        limit_order_delay_bars: int = 2,
        enable_partial_fills: bool = True,
        enable_price_improvement: bool = True,
        slippage_model: Optional[Any] = None
    ):
        """
        Initialize fill simulator.

        Args:
            max_volume_participation: Max fraction of bar volume to fill (0.1 = 10%)
            limit_order_delay_bars: Minimum bars before limit order can fill
            enable_partial_fills: Allow orders to fill across multiple bars
            enable_price_improvement: Allow fills at better-than-limit prices
            slippage_model: Optional SlippageModel for price adjustments
        """
        self.max_volume_participation = max_volume_participation
        self.limit_order_delay_bars = limit_order_delay_bars
        self.enable_partial_fills = enable_partial_fills
        self.enable_price_improvement = enable_price_improvement
        self.slippage_model = slippage_model

    def simulate_fill(
        self,
        order: Dict[str, Any],
        bars: List[BarData],
        start_bar_index: int = 0
    ) -> FillResult:
        """
        Simulate order fill across bars.

        Args:
            order: Order dictionary with symbol, side, quantity, price, order_type
            bars: List of BarData objects for simulation
            start_bar_index: Index of bar when order was submitted

        Returns:
            FillResult with list of partial fills and status
        """
        order_type = order.get('order_type', 'MARKET')
        order_quantity = order.get('quantity', 0)
        order_price = order.get('price')
        order_side = order.get('side', 'BUY')

        if order_type == 'MARKET':
            return self._simulate_market_order(order, bars, start_bar_index)
        elif order_type == 'LIMIT':
            return self._simulate_limit_order(order, bars, start_bar_index)
        elif order_type == 'STOP':
            return self._simulate_stop_order(order, bars, start_bar_index)
        else:
            # Default to market order behavior
            return self._simulate_market_order(order, bars, start_bar_index)

    def _simulate_market_order(
        self,
        order: Dict[str, Any],
        bars: List[BarData],
        start_bar_index: int
    ) -> FillResult:
        """
        Simulate market order fill.

        Market orders fill at the next bar's open with slippage.
        Large orders may require multiple bars if volume participation is limited.
        """
        fills: List[PartialFill] = []
        remaining_quantity = order.get('quantity', 0)
        order_side = order.get('side', 'BUY')
        total_slippage = 0.0

        # Market orders fill starting at the next bar
        fill_bar_index = start_bar_index + 1

        while remaining_quantity > 0 and fill_bar_index < len(bars):
            bar = bars[fill_bar_index]

            # Calculate max fill quantity based on volume participation
            max_fill_qty = bar.volume * self.max_volume_participation

            if not self.enable_partial_fills:
                # All-or-nothing: check if we can fill entirely
                if remaining_quantity > max_fill_qty:
                    # Move to next bar
                    fill_bar_index += 1
                    continue

            # Fill quantity is min of remaining and max participation
            fill_qty = min(remaining_quantity, max_fill_qty)

            if fill_qty <= 0:
                fill_bar_index += 1
                continue

            # Calculate execution price
            base_price = bar.open
            if bar.vwap:
                # Use VWAP for more realistic pricing
                base_price = bar.vwap

            # Apply slippage
            slippage = self._calculate_slippage(order, bar, fill_qty)
            if order_side == 'BUY':
                fill_price = base_price + slippage
                # Ensure price doesn't exceed bar high
                fill_price = min(fill_price, bar.high)
            else:
                fill_price = base_price - slippage
                # Ensure price doesn't go below bar low
                fill_price = max(fill_price, bar.low)

            total_slippage += slippage * fill_qty

            # Create fill
            fill = PartialFill(
                quantity=fill_qty,
                price=fill_price,
                timestamp=bar.timestamp,
                slippage=slippage,
                is_final=(remaining_quantity - fill_qty) <= 0,
                fill_id=f"fill_{fill_bar_index}_{len(fills)}",
                bar_index=fill_bar_index
            )
            fills.append(fill)

            remaining_quantity -= fill_qty
            fill_bar_index += 1

        # Calculate results
        filled_quantity = order.get('quantity', 0) - remaining_quantity
        status = (
            FillStatus.FILLED if remaining_quantity <= 0
            else FillStatus.PARTIAL if fills
            else FillStatus.PENDING
        )

        avg_price = (
            sum(f.quantity * f.price for f in fills) / filled_quantity
            if filled_quantity > 0 else 0
        )

        return FillResult(
            fills=fills,
            status=status,
            filled_quantity=filled_quantity,
            remaining_quantity=remaining_quantity,
            average_price=avg_price,
            total_slippage=total_slippage,
            bars_to_complete=len(fills)
        )

    def _simulate_limit_order(
        self,
        order: Dict[str, Any],
        bars: List[BarData],
        start_bar_index: int
    ) -> FillResult:
        """
        Simulate limit order fill.

        Limit orders have a delay before filling and only fill when
        the bar's price range touches the limit price.
        """
        fills: List[PartialFill] = []
        remaining_quantity = order.get('quantity', 0)
        order_side = order.get('side', 'BUY')
        limit_price = order.get('price', 0)
        total_slippage = 0.0

        # Limit orders have a delay
        fill_bar_index = start_bar_index + self.limit_order_delay_bars

        while remaining_quantity > 0 and fill_bar_index < len(bars):
            bar = bars[fill_bar_index]

            # Check if limit price was reached
            can_fill = False
            if order_side == 'BUY':
                # Buy limit fills if bar low <= limit price
                can_fill = bar.low <= limit_price
            else:
                # Sell limit fills if bar high >= limit price
                can_fill = bar.high >= limit_price

            if not can_fill:
                fill_bar_index += 1
                continue

            # Calculate max fill quantity
            max_fill_qty = bar.volume * self.max_volume_participation

            if not self.enable_partial_fills and remaining_quantity > max_fill_qty:
                fill_bar_index += 1
                continue

            fill_qty = min(remaining_quantity, max_fill_qty)

            if fill_qty <= 0:
                fill_bar_index += 1
                continue

            # Calculate execution price
            if self.enable_price_improvement:
                # Limit orders can get price improvement
                if order_side == 'BUY':
                    # May fill at or below limit price
                    fill_price = min(limit_price, bar.typical_price)
                    fill_price = max(fill_price, bar.low)
                else:
                    # May fill at or above limit price
                    fill_price = max(limit_price, bar.typical_price)
                    fill_price = min(fill_price, bar.high)
            else:
                fill_price = limit_price

            # Minimal slippage for limit orders (they got their price)
            slippage = abs(fill_price - limit_price)
            total_slippage += slippage * fill_qty

            # Create fill
            fill = PartialFill(
                quantity=fill_qty,
                price=fill_price,
                timestamp=bar.timestamp,
                slippage=slippage,
                is_final=(remaining_quantity - fill_qty) <= 0,
                fill_id=f"fill_{fill_bar_index}_{len(fills)}",
                bar_index=fill_bar_index
            )
            fills.append(fill)

            remaining_quantity -= fill_qty
            fill_bar_index += 1

        # Calculate results
        filled_quantity = order.get('quantity', 0) - remaining_quantity
        status = (
            FillStatus.FILLED if remaining_quantity <= 0
            else FillStatus.PARTIAL if fills
            else FillStatus.PENDING
        )

        avg_price = (
            sum(f.quantity * f.price for f in fills) / filled_quantity
            if filled_quantity > 0 else 0
        )

        return FillResult(
            fills=fills,
            status=status,
            filled_quantity=filled_quantity,
            remaining_quantity=remaining_quantity,
            average_price=avg_price,
            total_slippage=total_slippage,
            bars_to_complete=len(fills)
        )

    def _simulate_stop_order(
        self,
        order: Dict[str, Any],
        bars: List[BarData],
        start_bar_index: int
    ) -> FillResult:
        """
        Simulate stop order fill.

        Stop orders become market orders when the stop price is reached.
        """
        stop_price = order.get('stop_price') or order.get('price', 0)
        order_side = order.get('side', 'BUY')

        # Find the bar where stop is triggered
        trigger_bar_index = None
        for i in range(start_bar_index + 1, len(bars)):
            bar = bars[i]
            if order_side == 'BUY':
                # Buy stop triggers when price rises above stop
                if bar.high >= stop_price:
                    trigger_bar_index = i
                    break
            else:
                # Sell stop triggers when price falls below stop
                if bar.low <= stop_price:
                    trigger_bar_index = i
                    break

        if trigger_bar_index is None:
            # Stop not triggered
            return FillResult(
                fills=[],
                status=FillStatus.PENDING,
                filled_quantity=0,
                remaining_quantity=order.get('quantity', 0),
                average_price=0,
                total_slippage=0,
                bars_to_complete=0
            )

        # Stop triggered - simulate as market order from trigger bar
        return self._simulate_market_order(order, bars, trigger_bar_index)

    def _calculate_slippage(
        self,
        order: Dict[str, Any],
        bar: BarData,
        fill_quantity: float
    ) -> float:
        """Calculate slippage for a fill."""
        if self.slippage_model:
            from .slippage import OrderInfo, MarketData
            order_info = OrderInfo(
                symbol=order.get('symbol', ''),
                side=order.get('side', 'BUY'),
                quantity=fill_quantity,
                price=bar.open,
                order_type=order.get('order_type', 'MARKET')
            )
            market_data = MarketData(
                last_price=bar.close,
                volume=bar.volume,
            )
            return self.slippage_model.calculate_slippage(order_info, market_data)

        # Default simple slippage calculation
        # Based on order size relative to bar volume
        if bar.volume > 0:
            participation = fill_quantity / bar.volume
            # Slippage increases with participation
            slippage_bps = 2 + (participation * 50)  # 2-52 bps based on participation
        else:
            slippage_bps = 10  # Default slippage

        # Add randomness
        slippage_bps *= random.uniform(0.7, 1.3)

        return bar.open * (slippage_bps / 10000)


def create_fill_simulator(config: Dict[str, Any]) -> FillSimulator:
    """
    Factory function to create fill simulator from config.

    Args:
        config: Configuration dictionary

    Returns:
        Configured FillSimulator instance

    Example:
        config = {
            "partial_fills_enabled": True,
            "max_volume_participation": 0.1,
            "limit_order_delay_bars": 2
        }
        simulator = create_fill_simulator(config)
    """
    return FillSimulator(
        max_volume_participation=config.get('max_volume_participation', 0.1),
        limit_order_delay_bars=config.get('limit_order_delay_bars', 2),
        enable_partial_fills=config.get('partial_fills_enabled', True),
        enable_price_improvement=config.get('enable_price_improvement', True),
    )
