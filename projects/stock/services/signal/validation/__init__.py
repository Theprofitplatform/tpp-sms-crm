"""
Validation module for backtesting data leakage prevention.

This module provides tools to detect and prevent common sources of
data leakage in backtests:
- Look-ahead bias in indicators
- Survivorship bias in universe selection
- Parameter peeking into test windows
"""

from .leakage_detector import (
    LeakageDetector,
    LeakageReport,
    LeakageType,
    ValidationResult,
)

__all__ = [
    "LeakageDetector",
    "LeakageReport",
    "LeakageType",
    "ValidationResult",
]
