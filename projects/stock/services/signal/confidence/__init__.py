"""
Confidence Scoring Module

Provides confidence scoring and invalidation rule generation for trading signals.
"""

from .scorer import ConfidenceScorer
from .invalidation import generate_invalidation_rules

__all__ = [
    "ConfidenceScorer",
    "generate_invalidation_rules",
]
