"""
FX Rate handling for multi-currency trading.

Provides FX rate fetching, caching, and conversion utilities.
Supports AUD as base currency with USD and other trade currencies.

Also provides FX accounting for P&L tracking:
- Realized/unrealized FX gains and losses
- Currency exposure tracking
- FX transaction ledger
- Position-level FX attribution
"""

from .rates import FXRateService, FXRate, initialize_fx_service
from .accounting import (
    FXAccountingLedger,
    FXTransaction,
    FXTransactionType,
    FXGainType,
    CurrencyPosition,
    FXPnLSummary,
    PositionFXAttribution,
    get_fx_ledger,
    set_fx_ledger,
)

__all__ = [
    # Rate service
    'FXRateService',
    'FXRate',
    'initialize_fx_service',
    # Accounting
    'FXAccountingLedger',
    'FXTransaction',
    'FXTransactionType',
    'FXGainType',
    'CurrencyPosition',
    'FXPnLSummary',
    'PositionFXAttribution',
    'get_fx_ledger',
    'set_fx_ledger',
]
