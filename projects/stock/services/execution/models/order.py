"""
Order Models with Multi-Currency Support

Defines order request and response models with FX fields for multi-currency trading.
Base currency: AUD, Trade currencies: USD, AUD, crypto symbols.
"""

from datetime import datetime
from typing import Optional
from enum import Enum

from pydantic import BaseModel, Field


class OrderSide(str, Enum):
    """Order side (buy or sell)."""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    """Order type."""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"


class OrderStatus(str, Enum):
    """Order status."""
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    PARTIAL = "PARTIAL"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class OrderRequest(BaseModel):
    """Request to submit an order."""
    symbol: str
    market: str = "US"
    side: OrderSide
    quantity: float
    order_type: OrderType = OrderType.MARKET
    price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"

    # Audit trail (REQUIRED)
    signal_id: Optional[str] = None
    reason: str
    data_snapshot_hash: str
    rule_version_id: str


class Order(BaseModel):
    """Order details (basic, without FX)."""
    id: str
    symbol: str
    market: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    status: str
    filled_quantity: float = 0
    average_fill_price: Optional[float] = None
    commission: float = 0

    # Audit trail
    signal_id: Optional[str] = None
    risk_check_id: Optional[str] = None
    reason: str
    data_snapshot_hash: str
    rule_version_id: str

    # Timestamps
    created_at: datetime
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None


class OrderWithFX(Order):
    """
    Order with multi-currency fields.

    Extends base Order with currency conversion information.
    """
    # Currency fields
    base_currency: str = Field(
        default="AUD",
        description="Portfolio base currency"
    )
    trade_currency: str = Field(
        default="USD",
        description="Currency the instrument trades in"
    )
    fx_rate_at_entry: Optional[float] = Field(
        default=None,
        description="FX rate at order creation (1 base = X trade)"
    )

    # Amount in both currencies
    amount_base: Optional[float] = Field(
        default=None,
        description="Order value in base currency (AUD)"
    )
    amount_trade: Optional[float] = Field(
        default=None,
        description="Order value in trade currency"
    )

    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "symbol": "AAPL",
                "market": "US",
                "side": "BUY",
                "order_type": "MARKET",
                "quantity": 10,
                "price": 175.50,
                "status": "FILLED",
                "filled_quantity": 10,
                "average_fill_price": 175.52,
                "commission": 0.05,
                "reason": "Momentum signal triggered",
                "data_snapshot_hash": "abc123...",
                "rule_version_id": "momentum_v1.2",
                "created_at": "2024-01-15T10:30:00Z",
                "filled_at": "2024-01-15T10:30:01Z",
                "base_currency": "AUD",
                "trade_currency": "USD",
                "fx_rate_at_entry": 0.6532,
                "amount_base": 2687.50,
                "amount_trade": 1755.20,
            }
        }
