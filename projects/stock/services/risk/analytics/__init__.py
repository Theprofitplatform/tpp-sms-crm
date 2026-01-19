"""
Analytics Module - Advanced Risk Analytics

Provides VaR (Value at Risk) models and validation for portfolio risk management.

VaR models available:
- HistoricalVaR: Historical simulation - most robust, default choice
- ParametricVaR: Gaussian/normal distribution - faster but assumes normality
- EVTVaR: Extreme Value Theory - focuses on tail risk

IMPORTANT: VaR is for MONITORING ONLY. It does NOT gate trades.
Primary trade gates are: exposure limits, drawdown, and circuit breakers.
"""

from .var_models import (
    VaRModel,
    HistoricalVaR,
    ParametricVaR,
    EVTVaR,
    VaRResult,
    create_var_model,
)

from .var_validator import (
    VaRValidator,
    VaRValidationResult,
    VaRBacktestResult,
)

__all__ = [
    # Models
    "VaRModel",
    "HistoricalVaR",
    "ParametricVaR",
    "EVTVaR",
    "VaRResult",
    "create_var_model",
    # Validation
    "VaRValidator",
    "VaRValidationResult",
    "VaRBacktestResult",
]
