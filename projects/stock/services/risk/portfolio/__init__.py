"""
Portfolio-level risk management module.

This module provides comprehensive portfolio risk analysis including:
- Sector and market exposure tracking
- FX/currency exposure tracking
- Correlation matrix analysis
- Volatility scaling for position sizing
- Circuit breakers for automated risk control

Usage:
    from portfolio import ExposureAnalyzer, FXExposureAnalyzer, CorrelationAnalyzer, VolatilityScaler, CircuitBreaker
"""

from .exposure import (
    ExposureAnalyzer,
    ExposureReport,
    calculate_sector_exposure,
    calculate_market_exposure,
)
from .fx_exposure import (
    FXExposureAnalyzer,
    FXExposureReport,
    FXExposureConfig,
    CurrencyExposure,
    ExposureLevel,
    get_fx_exposure_analyzer,
    set_fx_exposure_analyzer,
    initialize_fx_exposure_analyzer,
)
from .correlation import (
    CorrelationAnalyzer,
    calculate_correlation_matrix,
    find_correlated_pairs,
    check_correlation_limit,
)
from .volatility import (
    VolatilityScaler,
    calculate_symbol_volatility,
    calculate_portfolio_volatility,
    is_high_volatility_regime,
)
from .circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerTriggered,
    CircuitBreakerType,
    check_circuit_breakers,
)

__all__ = [
    # Exposure
    "ExposureAnalyzer",
    "ExposureReport",
    "calculate_sector_exposure",
    "calculate_market_exposure",
    # FX Exposure
    "FXExposureAnalyzer",
    "FXExposureReport",
    "FXExposureConfig",
    "CurrencyExposure",
    "ExposureLevel",
    "get_fx_exposure_analyzer",
    "set_fx_exposure_analyzer",
    "initialize_fx_exposure_analyzer",
    # Correlation
    "CorrelationAnalyzer",
    "calculate_correlation_matrix",
    "find_correlated_pairs",
    "check_correlation_limit",
    # Volatility
    "VolatilityScaler",
    "calculate_symbol_volatility",
    "calculate_portfolio_volatility",
    "is_high_volatility_regime",
    # Circuit Breaker
    "CircuitBreaker",
    "CircuitBreakerTriggered",
    "CircuitBreakerType",
    "check_circuit_breakers",
]
