"""
Signal Models Module

Rich signal data structures with confidence scores, feature snapshots, and invalidation rules.
"""

from .signal import (
    Signal,
    SignalFeatures,
    InvalidationRule,
    SignalSide,
    EntryType,
    TimeInForce,
)

__all__ = [
    "Signal",
    "SignalFeatures",
    "InvalidationRule",
    "SignalSide",
    "EntryType",
    "TimeInForce",
]
