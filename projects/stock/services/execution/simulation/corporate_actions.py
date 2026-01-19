"""
Corporate Actions Handler for Backtest Realism

Handles adjustments for corporate actions during backtesting:
- Stock splits (forward and reverse)
- Cash dividends
- Stock dividends
- Spin-offs
- Rights issues

Usage:
    from simulation.corporate_actions import CorporateActionHandler

    handler = CorporateActionHandler()
    handler.add_split("AAPL", date(2020, 8, 31), 4.0)  # 4:1 split
    handler.add_dividend("AAPL", date(2023, 11, 10), 0.24)  # $0.24 dividend

    # Adjust position for splits
    adjusted = handler.adjust_position_for_split(position, split_date)

    # Adjust price data for splits
    adjusted_prices = handler.adjust_prices_for_splits(prices, "AAPL")

Dependencies:
    - dataclasses
    - datetime
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Dict, List, Any, Tuple
from enum import Enum
import math


class ActionType(str, Enum):
    """Types of corporate actions."""
    SPLIT = "SPLIT"                 # Stock split (forward or reverse)
    CASH_DIVIDEND = "CASH_DIVIDEND"  # Cash dividend
    STOCK_DIVIDEND = "STOCK_DIVIDEND"  # Stock dividend (additional shares)
    SPINOFF = "SPINOFF"             # Company spin-off
    MERGER = "MERGER"               # Merger/acquisition
    RIGHTS_ISSUE = "RIGHTS_ISSUE"   # Rights offering


@dataclass
class CorporateAction:
    """
    Represents a corporate action event.

    Attributes:
        symbol: Trading symbol
        action_type: Type of corporate action
        ex_date: Ex-dividend/ex-split date
        record_date: Record date (for eligibility)
        pay_date: Payment/effective date
        ratio: Split ratio or dividend amount
        description: Human-readable description
    """
    symbol: str
    action_type: ActionType
    ex_date: date
    record_date: Optional[date] = None
    pay_date: Optional[date] = None
    ratio: float = 1.0  # Split ratio or per-share amount
    description: str = ""
    adjustment_factor: float = 1.0  # Cumulative adjustment factor

    def __post_init__(self):
        """Calculate adjustment factor based on action type."""
        if self.action_type == ActionType.SPLIT:
            self.adjustment_factor = self.ratio
        elif self.action_type == ActionType.STOCK_DIVIDEND:
            # Stock dividend: 10% dividend = 1.1 adjustment
            self.adjustment_factor = 1.0 + self.ratio


@dataclass
class Position:
    """Position data for adjustment calculations."""
    symbol: str
    quantity: float
    average_price: float
    cost_basis: float = 0.0
    realized_dividends: float = 0.0

    def __post_init__(self):
        if self.cost_basis == 0.0:
            self.cost_basis = self.quantity * self.average_price


@dataclass
class AdjustmentResult:
    """Result of a corporate action adjustment."""
    original_position: Position
    adjusted_position: Position
    action: CorporateAction
    cash_amount: float = 0.0  # Cash received (dividends, fractional shares)
    description: str = ""


@dataclass
class PriceBar:
    """OHLCV price bar for adjustment."""
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    adjusted_close: Optional[float] = None

    def apply_adjustment(self, factor: float) -> 'PriceBar':
        """Apply adjustment factor to all prices."""
        return PriceBar(
            date=self.date,
            open=self.open / factor,
            high=self.high / factor,
            low=self.low / factor,
            close=self.close / factor,
            volume=self.volume * factor,  # Volume increases with splits
            adjusted_close=self.adjusted_close / factor if self.adjusted_close else None,
        )


class CorporateActionHandler:
    """
    Handles corporate action adjustments for backtesting.

    Maintains a registry of corporate actions and applies them to:
    - Position quantities and cost basis
    - Historical price data
    - Dividend payments

    Example:
        handler = CorporateActionHandler()

        # Register a 4:1 stock split
        handler.add_split("AAPL", date(2020, 8, 31), 4.0)

        # Adjust position
        position = Position("AAPL", 25, 400.0)  # 25 shares @ $400
        result = handler.adjust_position_for_split(position, date(2020, 8, 31))
        # Result: 100 shares @ $100

        # Adjust historical prices
        prices = [PriceBar(...), ...]
        adjusted = handler.adjust_prices_for_splits(prices, "AAPL")
    """

    def __init__(self):
        """Initialize the corporate action handler."""
        # Actions indexed by symbol, sorted by date
        self._actions: Dict[str, List[CorporateAction]] = {}

        # Cumulative adjustment factors by symbol
        self._adjustment_factors: Dict[str, float] = {}

    def add_action(self, action: CorporateAction) -> None:
        """
        Add a corporate action to the registry.

        Args:
            action: CorporateAction to register
        """
        symbol = action.symbol.upper()
        if symbol not in self._actions:
            self._actions[symbol] = []

        self._actions[symbol].append(action)
        # Keep sorted by ex_date
        self._actions[symbol].sort(key=lambda a: a.ex_date)

        # Update cumulative adjustment factor
        self._recalculate_factors(symbol)

    def add_split(
        self,
        symbol: str,
        ex_date: date,
        ratio: float,
        description: str = ""
    ) -> CorporateAction:
        """
        Add a stock split.

        Args:
            symbol: Trading symbol
            ex_date: Ex-split date
            ratio: Split ratio (4.0 for 4:1 split, 0.5 for 1:2 reverse split)
            description: Optional description

        Returns:
            Created CorporateAction

        Example:
            # 4:1 split (4 new shares for each old share)
            handler.add_split("AAPL", date(2020, 8, 31), 4.0)

            # 1:10 reverse split (1 new share for every 10 old shares)
            handler.add_split("XYZ", date(2023, 1, 15), 0.1)
        """
        if not description:
            if ratio > 1:
                description = f"{int(ratio)}:1 forward stock split"
            else:
                reverse_ratio = int(1 / ratio)
                description = f"1:{reverse_ratio} reverse stock split"

        action = CorporateAction(
            symbol=symbol.upper(),
            action_type=ActionType.SPLIT,
            ex_date=ex_date,
            ratio=ratio,
            description=description,
        )
        self.add_action(action)
        return action

    def add_dividend(
        self,
        symbol: str,
        ex_date: date,
        amount: float,
        pay_date: Optional[date] = None,
        description: str = ""
    ) -> CorporateAction:
        """
        Add a cash dividend.

        Args:
            symbol: Trading symbol
            ex_date: Ex-dividend date
            amount: Dividend amount per share
            pay_date: Payment date (optional)
            description: Optional description

        Returns:
            Created CorporateAction

        Example:
            handler.add_dividend("AAPL", date(2023, 11, 10), 0.24)
        """
        if not description:
            description = f"${amount:.2f} cash dividend"

        action = CorporateAction(
            symbol=symbol.upper(),
            action_type=ActionType.CASH_DIVIDEND,
            ex_date=ex_date,
            pay_date=pay_date,
            ratio=amount,  # For dividends, ratio = per-share amount
            description=description,
        )
        self.add_action(action)
        return action

    def add_stock_dividend(
        self,
        symbol: str,
        ex_date: date,
        ratio: float,
        description: str = ""
    ) -> CorporateAction:
        """
        Add a stock dividend.

        Args:
            symbol: Trading symbol
            ex_date: Ex-dividend date
            ratio: Dividend ratio (0.1 = 10% stock dividend)
            description: Optional description

        Returns:
            Created CorporateAction

        Example:
            # 10% stock dividend (10 new shares for every 100 held)
            handler.add_stock_dividend("XYZ", date(2023, 6, 1), 0.1)
        """
        if not description:
            pct = int(ratio * 100)
            description = f"{pct}% stock dividend"

        action = CorporateAction(
            symbol=symbol.upper(),
            action_type=ActionType.STOCK_DIVIDEND,
            ex_date=ex_date,
            ratio=ratio,
            description=description,
        )
        self.add_action(action)
        return action

    def _recalculate_factors(self, symbol: str) -> None:
        """Recalculate cumulative adjustment factors for a symbol."""
        symbol = symbol.upper()
        factor = 1.0

        for action in self._actions.get(symbol, []):
            if action.action_type in [ActionType.SPLIT, ActionType.STOCK_DIVIDEND]:
                factor *= action.adjustment_factor

        self._adjustment_factors[symbol] = factor

    def get_actions(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        action_type: Optional[ActionType] = None
    ) -> List[CorporateAction]:
        """
        Get corporate actions for a symbol within a date range.

        Args:
            symbol: Trading symbol
            start_date: Start of date range (inclusive)
            end_date: End of date range (inclusive)
            action_type: Filter by action type

        Returns:
            List of matching CorporateAction objects
        """
        symbol = symbol.upper()
        actions = self._actions.get(symbol, [])

        if start_date:
            actions = [a for a in actions if a.ex_date >= start_date]
        if end_date:
            actions = [a for a in actions if a.ex_date <= end_date]
        if action_type:
            actions = [a for a in actions if a.action_type == action_type]

        return actions

    def get_adjustment_factor(
        self,
        symbol: str,
        as_of_date: Optional[date] = None
    ) -> float:
        """
        Get cumulative price adjustment factor for a symbol.

        The adjustment factor converts current prices to historical prices:
            historical_price = current_price / adjustment_factor

        Args:
            symbol: Trading symbol
            as_of_date: Calculate factor as of this date (default: all time)

        Returns:
            Cumulative adjustment factor
        """
        symbol = symbol.upper()

        if as_of_date is None:
            return self._adjustment_factors.get(symbol, 1.0)

        factor = 1.0
        for action in self._actions.get(symbol, []):
            if action.ex_date > as_of_date:
                break
            if action.action_type in [ActionType.SPLIT, ActionType.STOCK_DIVIDEND]:
                factor *= action.adjustment_factor

        return factor


# =============================================================================
# Position Adjustment Functions
# =============================================================================

def adjust_for_split(
    position: Position,
    split_ratio: float
) -> Position:
    """
    Adjust a position for a stock split.

    Args:
        position: Original position
        split_ratio: Split ratio (4.0 for 4:1 split)

    Returns:
        Adjusted Position with new quantity and average price

    Example:
        # Before 4:1 split: 25 shares @ $400 = $10,000
        position = Position("AAPL", 25, 400.0)

        # After 4:1 split: 100 shares @ $100 = $10,000
        adjusted = adjust_for_split(position, 4.0)
    """
    new_quantity = position.quantity * split_ratio
    new_avg_price = position.average_price / split_ratio

    # Handle fractional shares (round down, cash out remainder)
    whole_shares = math.floor(new_quantity)
    fractional_value = (new_quantity - whole_shares) * new_avg_price

    return Position(
        symbol=position.symbol,
        quantity=whole_shares,
        average_price=new_avg_price,
        cost_basis=position.cost_basis,  # Cost basis unchanged
        realized_dividends=position.realized_dividends + fractional_value,
    )


def adjust_for_dividend(
    position: Position,
    dividend_per_share: float,
    reinvest: bool = False,
    current_price: Optional[float] = None
) -> Tuple[Position, float]:
    """
    Adjust a position for a cash dividend.

    Args:
        position: Original position
        dividend_per_share: Dividend amount per share
        reinvest: If True, reinvest dividend into more shares (DRIP)
        current_price: Current price (required if reinvest=True)

    Returns:
        Tuple of (adjusted Position, cash received)

    Example:
        # $0.24 dividend on 100 shares = $24.00
        position = Position("AAPL", 100, 150.0)
        adjusted, cash = adjust_for_dividend(position, 0.24)
        # cash = 24.00, position unchanged
    """
    total_dividend = position.quantity * dividend_per_share

    if reinvest and current_price and current_price > 0:
        # DRIP: buy additional shares
        additional_shares = total_dividend / current_price
        new_quantity = position.quantity + additional_shares

        # Recalculate average price
        total_cost = position.cost_basis + total_dividend
        new_avg_price = total_cost / new_quantity

        adjusted = Position(
            symbol=position.symbol,
            quantity=new_quantity,
            average_price=new_avg_price,
            cost_basis=total_cost,
            realized_dividends=position.realized_dividends,
        )
        return adjusted, 0.0

    else:
        # Cash dividend: no position change, just track dividend received
        adjusted = Position(
            symbol=position.symbol,
            quantity=position.quantity,
            average_price=position.average_price,
            cost_basis=position.cost_basis,
            realized_dividends=position.realized_dividends + total_dividend,
        )
        return adjusted, total_dividend


def adjust_for_stock_dividend(
    position: Position,
    dividend_ratio: float
) -> Position:
    """
    Adjust a position for a stock dividend.

    Args:
        position: Original position
        dividend_ratio: Stock dividend ratio (0.1 = 10% dividend)

    Returns:
        Adjusted Position with additional shares

    Example:
        # 10% stock dividend on 100 shares = 10 new shares
        position = Position("XYZ", 100, 50.0)
        adjusted = adjust_for_stock_dividend(position, 0.1)
        # Result: 110 shares @ $45.45 (cost basis unchanged)
    """
    new_quantity = position.quantity * (1.0 + dividend_ratio)
    new_avg_price = position.cost_basis / new_quantity

    # Handle fractional shares
    whole_shares = math.floor(new_quantity)
    fractional_value = (new_quantity - whole_shares) * new_avg_price

    return Position(
        symbol=position.symbol,
        quantity=whole_shares,
        average_price=new_avg_price,
        cost_basis=position.cost_basis,  # Cost basis unchanged
        realized_dividends=position.realized_dividends + fractional_value,
    )


# =============================================================================
# Price Adjustment Functions
# =============================================================================

def adjust_prices_for_split(
    prices: List[PriceBar],
    split_date: date,
    split_ratio: float
) -> List[PriceBar]:
    """
    Adjust historical prices for a stock split.

    Prices BEFORE the split date are divided by the split ratio.
    Prices ON or AFTER the split date are unchanged.

    Args:
        prices: List of PriceBar objects (sorted by date ascending)
        split_date: Ex-split date
        split_ratio: Split ratio (4.0 for 4:1 split)

    Returns:
        List of adjusted PriceBar objects

    Example:
        # 4:1 split on 2020-08-31
        # Before: Close = $400
        # After:  Close = $100
        adjusted = adjust_prices_for_split(prices, date(2020, 8, 31), 4.0)
    """
    adjusted = []
    for bar in prices:
        if bar.date < split_date:
            adjusted.append(bar.apply_adjustment(split_ratio))
        else:
            adjusted.append(bar)
    return adjusted


def adjust_prices_for_dividend(
    prices: List[PriceBar],
    ex_date: date,
    dividend_per_share: float
) -> List[PriceBar]:
    """
    Adjust historical prices for a dividend (optional).

    This creates "total return" adjusted prices by accounting for dividends.
    Prices BEFORE the ex-date are reduced by the dividend amount.

    Note: This is optional and depends on whether you want price charts
    to reflect total return or just price return.

    Args:
        prices: List of PriceBar objects
        ex_date: Ex-dividend date
        dividend_per_share: Dividend amount

    Returns:
        List of adjusted PriceBar objects
    """
    adjusted = []
    for bar in prices:
        if bar.date < ex_date:
            # Reduce prices by dividend amount
            adj_bar = PriceBar(
                date=bar.date,
                open=bar.open - dividend_per_share,
                high=bar.high - dividend_per_share,
                low=bar.low - dividend_per_share,
                close=bar.close - dividend_per_share,
                volume=bar.volume,
                adjusted_close=(bar.adjusted_close - dividend_per_share
                               if bar.adjusted_close else None),
            )
            adjusted.append(adj_bar)
        else:
            adjusted.append(bar)
    return adjusted


def calculate_adjustment_factor(
    actions: List[CorporateAction],
    as_of_date: date
) -> float:
    """
    Calculate cumulative adjustment factor from a list of actions.

    Args:
        actions: List of CorporateAction objects
        as_of_date: Calculate factor as of this date

    Returns:
        Cumulative adjustment factor
    """
    factor = 1.0
    for action in sorted(actions, key=lambda a: a.ex_date):
        if action.ex_date > as_of_date:
            break
        if action.action_type == ActionType.SPLIT:
            factor *= action.ratio
        elif action.action_type == ActionType.STOCK_DIVIDEND:
            factor *= (1.0 + action.ratio)
    return factor
