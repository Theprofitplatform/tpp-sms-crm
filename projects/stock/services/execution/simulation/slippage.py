"""
Slippage Models for Backtest Realism

Provides various slippage models to simulate realistic execution costs:
- FixedSlippageModel: Constant basis points slippage
- VolatilitySlippageModel: Volatility-adjusted slippage
- SpreadSlippageModel: Uses actual bid-ask spread

Usage:
    model = VolatilitySlippageModel(base_bps=2, vol_multiplier=0.5)
    slippage = model.calculate_slippage(order, market_data)
    execution_price = order.price + slippage  # for BUY
    execution_price = order.price - slippage  # for SELL

Dependencies:
    - numpy (for statistical calculations)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any
import random
import math


@dataclass
class OrderInfo:
    """Order information for slippage calculation."""
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: float
    price: float
    order_type: str  # "MARKET", "LIMIT", etc.


@dataclass
class MarketData:
    """Market data for slippage calculation."""
    bid: Optional[float] = None
    ask: Optional[float] = None
    last_price: float = 0.0
    volume: float = 0.0
    avg_volume: float = 0.0
    volatility: float = 0.0  # Standard deviation of returns
    atr: float = 0.0  # Average True Range


class SlippageModel(ABC):
    """
    Base class for slippage models.

    Slippage represents the difference between expected and actual execution price.
    It typically occurs due to:
    - Market impact (large orders moving prices)
    - Execution delay
    - Bid-ask spread crossing
    """

    @abstractmethod
    def calculate_slippage(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """
        Calculate slippage amount in price terms.

        Args:
            order: Order information (symbol, side, quantity, price)
            market_data: Market data (bid, ask, volume, volatility)

        Returns:
            Slippage amount (always positive, direction handled by caller)
        """
        pass

    def get_execution_price(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """
        Calculate execution price including slippage.

        Args:
            order: Order information
            market_data: Market data

        Returns:
            Execution price adjusted for slippage
        """
        slippage = self.calculate_slippage(order, market_data)

        if order.side == "BUY":
            # Buyer pays more due to slippage
            return order.price + slippage
        else:
            # Seller receives less due to slippage
            return order.price - slippage


class FixedSlippageModel(SlippageModel):
    """
    Fixed basis points slippage model.

    Applies a constant percentage slippage to all orders.
    Simple but useful for quick backtests.

    Example:
        model = FixedSlippageModel(bps=5)  # 0.05% slippage
        For a $100 stock: slippage = $0.05
    """

    def __init__(self, bps: float = 5.0, randomize: bool = True):
        """
        Initialize fixed slippage model.

        Args:
            bps: Basis points of slippage (1 bp = 0.01%)
            randomize: If True, add random variation (0.5x to 1.5x)
        """
        self.bps = bps
        self.randomize = randomize

    def calculate_slippage(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """Calculate fixed basis points slippage."""
        base_slippage = order.price * (self.bps / 10000)

        if self.randomize:
            # Add random variation
            multiplier = random.uniform(0.5, 1.5)
            return base_slippage * multiplier

        return base_slippage


class VolatilitySlippageModel(SlippageModel):
    """
    Volatility-adjusted slippage model.

    Slippage increases with:
    - Base slippage in basis points
    - Asset volatility (higher vol = higher slippage)
    - Order size relative to average volume (market impact)

    Formula:
        slippage = price * (base_bps/10000) * (1 + vol_multiplier * volatility)
                   * (1 + size_impact)

    Example:
        model = VolatilitySlippageModel(base_bps=2, vol_multiplier=0.5)
        For a volatile stock (vol=0.03): slippage increases by 1.5%
    """

    def __init__(
        self,
        base_bps: float = 2.0,
        vol_multiplier: float = 0.5,
        size_impact_factor: float = 0.1,
        randomize: bool = True
    ):
        """
        Initialize volatility slippage model.

        Args:
            base_bps: Base slippage in basis points
            vol_multiplier: Multiplier for volatility impact
            size_impact_factor: Factor for order size impact
            randomize: If True, add random variation
        """
        self.base_bps = base_bps
        self.vol_multiplier = vol_multiplier
        self.size_impact_factor = size_impact_factor
        self.randomize = randomize

    def calculate_slippage(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """Calculate volatility-adjusted slippage."""
        # Base slippage
        base_slippage_pct = self.base_bps / 10000

        # Volatility adjustment
        vol_adjustment = 1.0 + (self.vol_multiplier * market_data.volatility)

        # Size impact (order size / average volume)
        size_impact = 1.0
        if market_data.avg_volume > 0:
            participation = order.quantity / market_data.avg_volume
            # Square root to dampen extreme impacts
            size_impact = 1.0 + (self.size_impact_factor * math.sqrt(participation))

        # Calculate total slippage
        slippage_pct = base_slippage_pct * vol_adjustment * size_impact
        slippage = order.price * slippage_pct

        if self.randomize:
            # Add random variation (0.7x to 1.3x)
            multiplier = random.uniform(0.7, 1.3)
            slippage *= multiplier

        return slippage


class SpreadSlippageModel(SlippageModel):
    """
    Bid-ask spread based slippage model.

    Uses actual bid-ask spread from market data:
    - BUY orders execute at ask (plus additional impact)
    - SELL orders execute at bid (minus additional impact)

    This is the most realistic model when bid-ask data is available.

    Example:
        Bid: $99.95, Ask: $100.05
        BUY order: executes near $100.05 + market impact
        SELL order: executes near $99.95 - market impact
    """

    def __init__(
        self,
        impact_factor: float = 0.5,
        use_full_spread: bool = True,
        fallback_spread_bps: float = 10.0
    ):
        """
        Initialize spread slippage model.

        Args:
            impact_factor: Additional market impact as fraction of spread
            use_full_spread: If True, use full spread; if False, use half spread
            fallback_spread_bps: Fallback spread in bps if bid/ask unavailable
        """
        self.impact_factor = impact_factor
        self.use_full_spread = use_full_spread
        self.fallback_spread_bps = fallback_spread_bps

    def calculate_slippage(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """Calculate spread-based slippage."""
        # Calculate spread
        if market_data.bid and market_data.ask and market_data.ask > market_data.bid:
            spread = market_data.ask - market_data.bid
        else:
            # Fallback to estimated spread
            spread = order.price * (self.fallback_spread_bps / 10000)

        # Base slippage is half or full spread
        if self.use_full_spread:
            base_slippage = spread
        else:
            base_slippage = spread / 2

        # Add market impact
        impact = spread * self.impact_factor

        # Add random variation to simulate market conditions
        variation = random.uniform(-0.1, 0.3) * spread

        total_slippage = base_slippage + impact + variation

        # Ensure non-negative slippage
        return max(0, total_slippage)


class CompositeSlippageModel(SlippageModel):
    """
    Composite slippage model that combines multiple models.

    Useful for combining different slippage factors:
    - Spread-based execution costs
    - Volatility-adjusted market impact
    - Fixed minimum slippage

    Example:
        model = CompositeSlippageModel([
            SpreadSlippageModel(),
            VolatilitySlippageModel(base_bps=1),
        ], aggregation='max')
    """

    def __init__(
        self,
        models: list,
        aggregation: str = 'sum'
    ):
        """
        Initialize composite model.

        Args:
            models: List of SlippageModel instances
            aggregation: 'sum', 'max', or 'avg'
        """
        self.models = models
        self.aggregation = aggregation

    def calculate_slippage(
        self,
        order: OrderInfo,
        market_data: MarketData
    ) -> float:
        """Calculate combined slippage from all models."""
        slippages = [
            model.calculate_slippage(order, market_data)
            for model in self.models
        ]

        if self.aggregation == 'sum':
            return sum(slippages)
        elif self.aggregation == 'max':
            return max(slippages)
        elif self.aggregation == 'avg':
            return sum(slippages) / len(slippages) if slippages else 0
        else:
            raise ValueError(f"Unknown aggregation: {self.aggregation}")


def create_slippage_model(config: Dict[str, Any]) -> SlippageModel:
    """
    Factory function to create slippage model from config.

    Args:
        config: Configuration dictionary with 'model' key and parameters

    Returns:
        Configured SlippageModel instance

    Example:
        config = {
            "model": "volatility",
            "base_bps": 2,
            "vol_multiplier": 0.5
        }
        model = create_slippage_model(config)
    """
    model_type = config.get('model', 'fixed').lower()

    if model_type == 'fixed':
        return FixedSlippageModel(
            bps=config.get('bps', 5.0),
            randomize=config.get('randomize', True)
        )

    elif model_type == 'volatility':
        return VolatilitySlippageModel(
            base_bps=config.get('base_bps', 2.0),
            vol_multiplier=config.get('vol_multiplier', 0.5),
            size_impact_factor=config.get('size_impact_factor', 0.1),
            randomize=config.get('randomize', True)
        )

    elif model_type == 'spread':
        return SpreadSlippageModel(
            impact_factor=config.get('impact_factor', 0.5),
            use_full_spread=config.get('use_full_spread', True),
            fallback_spread_bps=config.get('fallback_spread_bps', 10.0)
        )

    else:
        raise ValueError(f"Unknown slippage model: {model_type}")
