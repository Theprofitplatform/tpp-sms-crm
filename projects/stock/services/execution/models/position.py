"""
Position Models with Multi-Currency Support

Defines position models with FX fields for tracking value in both currencies.
"""

from typing import Optional

from pydantic import BaseModel, Field


class Position(BaseModel):
    """Current position - basic."""
    symbol: str
    market: str
    side: str  # LONG or SHORT
    quantity: float
    average_entry_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    realized_pnl: float = 0


class PositionWithFX(Position):
    """
    Position with multi-currency value tracking.

    Tracks position value and P&L in both trade currency and base currency (AUD).
    Shows FX impact separately for transparency.
    """
    # Currency fields
    base_currency: str = Field(
        default="AUD",
        description="Portfolio base currency"
    )
    trade_currency: str = Field(
        default="USD",
        description="Currency the position is valued in"
    )

    # FX rates
    fx_rate_at_entry: Optional[float] = Field(
        default=None,
        description="FX rate when position was opened"
    )
    current_fx_rate: Optional[float] = Field(
        default=None,
        description="Current FX rate for valuation"
    )

    # Values in trade currency (inherited from Position)
    # unrealized_pnl: in trade currency
    # realized_pnl: in trade currency

    # Values in base currency (AUD)
    entry_value_base: Optional[float] = Field(
        default=None,
        description="Position entry value in AUD"
    )
    current_value_base: Optional[float] = Field(
        default=None,
        description="Current position value in AUD"
    )
    unrealized_pnl_base: Optional[float] = Field(
        default=None,
        description="Unrealized P&L in base currency (AUD)"
    )
    realized_pnl_base: float = Field(
        default=0,
        description="Realized P&L in base currency (AUD)"
    )

    # FX impact breakdown
    fx_impact: Optional[float] = Field(
        default=None,
        description="P&L impact from FX movement (in AUD)"
    )
    price_impact_base: Optional[float] = Field(
        default=None,
        description="P&L from price movement only (in AUD)"
    )

    def calculate_fx_impact(self) -> Optional[float]:
        """
        Calculate FX impact on unrealized P&L.

        FX impact = (current_value at current FX) - (current_value at entry FX)

        Returns:
            FX impact in base currency (AUD), or None if data missing
        """
        if (
            self.current_price is None or
            self.fx_rate_at_entry is None or
            self.current_fx_rate is None
        ):
            return None

        # Current value at entry FX rate
        current_value_at_entry_fx = (
            self.quantity * self.current_price / self.fx_rate_at_entry
        )

        # Current value at current FX rate
        current_value_at_current_fx = (
            self.quantity * self.current_price / self.current_fx_rate
        )

        # FX impact = difference
        # Positive = AUD weakened (favorable for long positions)
        # Negative = AUD strengthened (unfavorable for long positions)
        fx_impact = current_value_at_current_fx - current_value_at_entry_fx

        if self.side == "SHORT":
            fx_impact = -fx_impact

        return fx_impact

    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 10,
                "average_entry_price": 175.50,
                "current_price": 180.00,
                "unrealized_pnl": 45.00,
                "realized_pnl": 0,
                "base_currency": "AUD",
                "trade_currency": "USD",
                "fx_rate_at_entry": 0.6532,
                "current_fx_rate": 0.6580,
                "entry_value_base": 2687.50,
                "current_value_base": 2735.56,
                "unrealized_pnl_base": 68.39,
                "realized_pnl_base": 0,
                "fx_impact": 2.15,
                "price_impact_base": 66.24,
            }
        }
