"""
Account Models with Multi-Currency Support

Defines account models with portfolio value in base currency (AUD).
"""

from typing import Optional, Dict, List

from pydantic import BaseModel, Field


class Account(BaseModel):
    """Account information - basic."""
    cash: float
    equity: float
    buying_power: float
    positions_value: float
    unrealized_pnl: float
    realized_pnl: float
    trading_mode: str


class AccountWithFX(BaseModel):
    """
    Account with multi-currency portfolio value.

    All values reported in base currency (AUD).
    Includes breakdown by currency for transparency.
    """
    # All values in base currency (AUD)
    base_currency: str = Field(
        default="AUD",
        description="Base currency for all values"
    )

    # Cash balances
    cash_aud: float = Field(
        description="Cash balance in AUD"
    )
    cash_by_currency: Dict[str, float] = Field(
        default_factory=dict,
        description="Cash balances by currency (in original currency)"
    )
    total_cash_base: float = Field(
        description="Total cash in base currency (AUD)"
    )

    # Portfolio value
    equity: float = Field(
        description="Total portfolio equity in AUD"
    )
    buying_power: float = Field(
        description="Available buying power in AUD"
    )

    # Position values
    positions_value_base: float = Field(
        description="Total positions value in AUD"
    )
    positions_by_currency: Dict[str, float] = Field(
        default_factory=dict,
        description="Positions value by currency (in original currency)"
    )

    # P&L in base currency
    unrealized_pnl_base: float = Field(
        description="Total unrealized P&L in AUD"
    )
    realized_pnl_base: float = Field(
        description="Total realized P&L in AUD"
    )

    # FX impact
    total_fx_impact: float = Field(
        default=0,
        description="Total FX impact on P&L in AUD"
    )

    # Trading mode
    trading_mode: str = Field(
        description="Current trading mode (BACKTEST, PAPER, LIVE)"
    )

    # FX rates used for valuation
    fx_rates_used: Dict[str, float] = Field(
        default_factory=dict,
        description="FX rates used for currency conversion"
    )

    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "base_currency": "AUD",
                "cash_aud": 50000.00,
                "cash_by_currency": {
                    "AUD": 50000.00,
                    "USD": 10000.00
                },
                "total_cash_base": 65320.00,
                "equity": 100000.00,
                "buying_power": 65320.00,
                "positions_value_base": 34680.00,
                "positions_by_currency": {
                    "USD": 22650.00,
                    "AUD": 12030.00
                },
                "unrealized_pnl_base": 2150.00,
                "realized_pnl_base": 5430.00,
                "total_fx_impact": 125.50,
                "trading_mode": "PAPER",
                "fx_rates_used": {
                    "AUDUSD": 0.6532
                }
            }
        }
