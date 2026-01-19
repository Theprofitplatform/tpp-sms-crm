"""
Reconciliation Module - Stock Trading Automation System

Provides broker vs local position and order reconciliation to detect
discrepancies and ensure data integrity.

Components:
    - PositionReconciler: Compares broker and local positions
    - OrderReconciler: Compares broker and local open orders
    - ReconciliationResult: Result of reconciliation operation
    - PositionMismatch: Details of a position mismatch
    - OrderMismatch: Details of an order mismatch

Safety Features:
    - Automatic kill switch trigger on critical mismatches
    - Alert notifications (Discord, email)
    - Full audit trail in reconciliation_reports table
    - Manual resolution tracking

Usage:
    from reconciliation import PositionReconciler, OrderReconciler

    reconciler = PositionReconciler(broker, db_pool)
    result = await reconciler.reconcile()

    if result.requires_intervention:
        await reconciler.handle_mismatch(result)
"""

from .reconciler import (
    PositionReconciler,
    ReconciliationResult,
    PositionMismatch,
)
from .order_reconciler import (
    OrderReconciler,
    OrderReconciliationResult,
    OrderMismatch,
)

__all__ = [
    "PositionReconciler",
    "ReconciliationResult",
    "PositionMismatch",
    "OrderReconciler",
    "OrderReconciliationResult",
    "OrderMismatch",
]
