"""
Trade Models with Multi-Currency Support

Defines trade (filled order) models with FX fields for P&L calculation in both currencies.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Trade(BaseModel):
    """Trade (filled order) details - basic."""
    id: str
    order_id: str
    symbol: str
    market: str
    side: str
    quantity: float
    price: float
    commission: float = 0

    # P&L in trade currency
    gross_pnl: Optional[float] = None
    net_pnl: Optional[float] = None

    # Audit trail
    signal_id: Optional[str] = None
    risk_check_id: str
    reason: str
    data_snapshot_hash: str
    rule_version_id: str

    timestamp: datetime


class TradeWithFX(Trade):
    """
    Trade with multi-currency P&L fields.

    Tracks P&L in both trade currency and base currency (AUD),
    with separate FX impact calculation.
    """
    # Currency fields
    base_currency: str = Field(
        default="AUD",
        description="Portfolio base currency"
    )
    trade_currency: str = Field(
        default="USD",
        description="Currency the trade executed in"
    )
    fx_rate_at_execution: Optional[float] = Field(
        default=None,
        description="FX rate at trade execution"
    )

    # P&L in base currency (AUD)
    gross_pnl_base: Optional[float] = Field(
        default=None,
        description="Gross P&L in base currency (AUD)"
    )
    net_pnl_base: Optional[float] = Field(
        default=None,
        description="Net P&L in base currency (AUD)"
    )

    # FX impact
    fx_impact: Optional[float] = Field(
        default=None,
        description="P&L impact from FX rate movement (in base currency)"
    )

    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "id": "trade-001",
                "order_id": "order-001",
                "symbol": "AAPL",
                "market": "US",
                "side": "SELL",
                "quantity": 10,
                "price": 180.00,
                "commission": 0.05,
                "gross_pnl": 45.00,
                "net_pnl": 44.95,
                "risk_check_id": "risk-001",
                "reason": "Take profit triggered",
                "data_snapshot_hash": "def456...",
                "rule_version_id": "momentum_v1.2",
                "timestamp": "2024-01-20T14:30:00Z",
                "base_currency": "AUD",
                "trade_currency": "USD",
                "fx_rate_at_execution": 0.6580,
                "gross_pnl_base": 68.39,
                "net_pnl_base": 68.31,
                "fx_impact": 2.15,
            }
        }
