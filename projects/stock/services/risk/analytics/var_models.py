"""
VaR (Value at Risk) Models - Portfolio Risk Analytics

Implements multiple VaR calculation methodologies:
- Historical VaR: Uses actual historical returns distribution
- Parametric VaR: Assumes normal distribution (faster but less accurate for fat tails)
- EVT VaR: Extreme Value Theory for tail risk modeling

IMPORTANT DISCLAIMER:
VaR is an INFORMATIONAL METRIC for risk monitoring ONLY.
VaR should NOT be used to automatically gate or block trades.
Primary trade gates are: exposure limits, drawdown limits, and circuit breakers.

Usage:
    from analytics.var_models import HistoricalVaR, ParametricVaR, EVTVaR

    model = HistoricalVaR()
    result = model.calculate(returns, confidence=0.95, horizon=1)
    print(f"1-day 95% VaR: ${result.var_value:.2f}")
"""

import json
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats
import structlog

logger = structlog.get_logger(__name__)


class VaRModelType(str, Enum):
    """Available VaR model types."""
    HISTORICAL = "historical"
    PARAMETRIC = "parametric"
    EVT = "evt"  # Extreme Value Theory


@dataclass
class VaRResult:
    """
    Result from a VaR calculation.

    Attributes:
        var_value: The VaR value (positive number representing potential loss)
        cvar_value: Conditional VaR (Expected Shortfall) - average loss beyond VaR
        model_type: Which model was used for calculation
        confidence_level: Confidence level (e.g., 0.95 for 95%)
        horizon_days: Time horizon in days
        lookback_days: Number of historical days used
        observations_used: Actual number of observations in calculation
        portfolio_value: Portfolio value used for scaling (if provided)
        parameters_logged: All parameters used for audit trail
        calculated_at: Timestamp of calculation
    """
    var_value: float
    cvar_value: float
    model_type: VaRModelType
    confidence_level: float
    horizon_days: int
    lookback_days: int
    observations_used: int
    portfolio_value: Optional[float] = None
    parameters_logged: Dict[str, Any] = field(default_factory=dict)
    calculated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "var_value": round(self.var_value, 2),
            "cvar_value": round(self.cvar_value, 2),
            "model_type": self.model_type.value,
            "confidence_level": self.confidence_level,
            "horizon_days": self.horizon_days,
            "lookback_days": self.lookback_days,
            "observations_used": self.observations_used,
            "portfolio_value": self.portfolio_value,
            "parameters_logged": self.parameters_logged,
            "calculated_at": self.calculated_at.isoformat(),
        }

    @property
    def var_pct(self) -> float:
        """VaR as percentage of portfolio value."""
        if self.portfolio_value and self.portfolio_value > 0:
            return (self.var_value / self.portfolio_value) * 100
        return 0.0


class VaRModel(ABC):
    """
    Abstract base class for VaR models.

    All VaR implementations must inherit from this class and implement
    the calculate() method.
    """

    @abstractmethod
    def calculate(
        self,
        returns: pd.Series,
        confidence: float = 0.95,
        horizon: int = 1,
        portfolio_value: Optional[float] = None,
    ) -> VaRResult:
        """
        Calculate Value at Risk.

        Args:
            returns: Time series of portfolio returns (daily log or simple returns)
            confidence: Confidence level (0.95 = 95% VaR)
            horizon: Time horizon in days (1 for daily, 5 for weekly)
            portfolio_value: Optional portfolio value for dollar VaR

        Returns:
            VaRResult with VaR and CVaR values
        """
        pass

    @property
    @abstractmethod
    def model_type(self) -> VaRModelType:
        """Return the model type."""
        pass

    def _validate_inputs(
        self,
        returns: pd.Series,
        confidence: float,
        horizon: int,
        min_observations: int = 30,
    ) -> Tuple[bool, str]:
        """
        Validate inputs for VaR calculation.

        Args:
            returns: Return series to validate
            confidence: Confidence level
            horizon: Time horizon
            min_observations: Minimum required observations

        Returns:
            Tuple of (is_valid, error_message)
        """
        if returns is None or len(returns) == 0:
            return False, "Returns series is empty"

        if len(returns) < min_observations:
            return False, f"Insufficient observations: {len(returns)} < {min_observations}"

        if not 0.5 <= confidence <= 0.999:
            return False, f"Confidence must be between 0.5 and 0.999, got {confidence}"

        if horizon < 1:
            return False, f"Horizon must be at least 1 day, got {horizon}"

        # Check for NaN values
        nan_count = returns.isna().sum()
        if nan_count > 0:
            returns_clean = returns.dropna()
            if len(returns_clean) < min_observations:
                return False, f"Too many NaN values: {nan_count} NaN, only {len(returns_clean)} valid"

        return True, ""

    def _scale_to_horizon(
        self,
        daily_var: float,
        horizon: int,
        method: str = "sqrt",
    ) -> float:
        """
        Scale daily VaR to target horizon.

        Args:
            daily_var: 1-day VaR value
            horizon: Target horizon in days
            method: Scaling method ('sqrt' or 'linear')

        Returns:
            Scaled VaR for target horizon
        """
        if method == "sqrt":
            # Square-root-of-time rule (assumes independent returns)
            return daily_var * np.sqrt(horizon)
        elif method == "linear":
            # Linear scaling (more conservative)
            return daily_var * horizon
        else:
            return daily_var * np.sqrt(horizon)


class HistoricalVaR(VaRModel):
    """
    Historical Simulation VaR.

    The most robust and recommended approach. Uses actual historical returns
    without making distributional assumptions. Captures fat tails and
    non-normality naturally.

    Advantages:
    - No distributional assumptions
    - Captures fat tails and skewness
    - Easy to understand and explain

    Disadvantages:
    - Requires sufficient historical data
    - Past may not predict future
    - Can be slow for large portfolios

    This is the DEFAULT model and should be used unless there's a specific
    reason to use another approach.
    """

    @property
    def model_type(self) -> VaRModelType:
        return VaRModelType.HISTORICAL

    def calculate(
        self,
        returns: pd.Series,
        confidence: float = 0.95,
        horizon: int = 1,
        portfolio_value: Optional[float] = None,
    ) -> VaRResult:
        """
        Calculate Historical VaR using percentile method.

        Args:
            returns: Daily returns series
            confidence: Confidence level (default 0.95)
            horizon: Time horizon in days
            portfolio_value: Portfolio value for dollar VaR

        Returns:
            VaRResult with calculated values
        """
        # Validate inputs
        is_valid, error_msg = self._validate_inputs(returns, confidence, horizon)
        if not is_valid:
            logger.error("Historical VaR validation failed", error=error_msg)
            raise ValueError(f"VaR calculation failed: {error_msg}")

        # Clean returns
        clean_returns = returns.dropna()

        # Calculate percentile (VaR is the loss at confidence percentile)
        alpha = 1 - confidence
        var_percentile = np.percentile(clean_returns, alpha * 100)

        # VaR is the negative of the percentile (loss is positive)
        daily_var = -var_percentile

        # Scale to horizon using square-root-of-time rule
        var_value = self._scale_to_horizon(daily_var, horizon)

        # Calculate CVaR (Expected Shortfall) - average of returns below VaR
        tail_returns = clean_returns[clean_returns <= var_percentile]
        if len(tail_returns) > 0:
            cvar_pct = -tail_returns.mean()
            cvar_value = self._scale_to_horizon(cvar_pct, horizon)
        else:
            cvar_value = var_value * 1.2  # Fallback estimate

        # Scale to portfolio value if provided
        if portfolio_value:
            var_value = var_value * portfolio_value
            cvar_value = cvar_value * portfolio_value

        # Build audit parameters
        parameters = {
            "method": "historical_simulation",
            "confidence": confidence,
            "horizon": horizon,
            "lookback_days": len(clean_returns),
            "min_return": float(clean_returns.min()),
            "max_return": float(clean_returns.max()),
            "mean_return": float(clean_returns.mean()),
            "std_return": float(clean_returns.std()),
            "skewness": float(stats.skew(clean_returns)),
            "kurtosis": float(stats.kurtosis(clean_returns)),
            "tail_observations": len(tail_returns),
            "scaling_method": "sqrt_time",
        }

        logger.info(
            "Historical VaR calculated",
            var_value=round(var_value, 4),
            cvar_value=round(cvar_value, 4),
            confidence=confidence,
            horizon=horizon,
            observations=len(clean_returns),
        )

        return VaRResult(
            var_value=var_value,
            cvar_value=cvar_value,
            model_type=self.model_type,
            confidence_level=confidence,
            horizon_days=horizon,
            lookback_days=len(clean_returns),
            observations_used=len(clean_returns),
            portfolio_value=portfolio_value,
            parameters_logged=parameters,
        )


class ParametricVaR(VaRModel):
    """
    Parametric (Variance-Covariance) VaR.

    Assumes returns follow a normal distribution. Faster to compute but
    may underestimate tail risk due to the normality assumption.

    Advantages:
    - Fast computation
    - Works with limited data
    - Easy to decompose by risk factor

    Disadvantages:
    - Assumes normality (often violated)
    - Underestimates fat-tail risk
    - Doesn't capture skewness

    Use when speed is critical and you understand the limitations.
    """

    @property
    def model_type(self) -> VaRModelType:
        return VaRModelType.PARAMETRIC

    def calculate(
        self,
        returns: pd.Series,
        confidence: float = 0.95,
        horizon: int = 1,
        portfolio_value: Optional[float] = None,
    ) -> VaRResult:
        """
        Calculate Parametric VaR using normal distribution.

        Args:
            returns: Daily returns series
            confidence: Confidence level (default 0.95)
            horizon: Time horizon in days
            portfolio_value: Portfolio value for dollar VaR

        Returns:
            VaRResult with calculated values
        """
        # Validate inputs (parametric can work with fewer observations)
        is_valid, error_msg = self._validate_inputs(
            returns, confidence, horizon, min_observations=20
        )
        if not is_valid:
            logger.error("Parametric VaR validation failed", error=error_msg)
            raise ValueError(f"VaR calculation failed: {error_msg}")

        # Clean returns
        clean_returns = returns.dropna()

        # Calculate mean and standard deviation
        mu = clean_returns.mean()
        sigma = clean_returns.std()

        # Get z-score for confidence level
        z_score = stats.norm.ppf(confidence)

        # Calculate daily VaR: VaR = -mu + z * sigma
        # (We use -mu because we're measuring loss)
        daily_var = -mu + z_score * sigma

        # Scale to horizon
        var_value = self._scale_to_horizon(daily_var, horizon)

        # Calculate CVaR for normal distribution
        # CVaR = mu + sigma * phi(z) / (1 - confidence)
        # where phi is the standard normal PDF
        pdf_at_z = stats.norm.pdf(z_score)
        cvar_pct = -mu + sigma * pdf_at_z / (1 - confidence)
        cvar_value = self._scale_to_horizon(cvar_pct, horizon)

        # Scale to portfolio value if provided
        if portfolio_value:
            var_value = var_value * portfolio_value
            cvar_value = cvar_value * portfolio_value

        # Build audit parameters
        parameters = {
            "method": "parametric_gaussian",
            "confidence": confidence,
            "horizon": horizon,
            "lookback_days": len(clean_returns),
            "mean_return": float(mu),
            "std_return": float(sigma),
            "z_score": float(z_score),
            "actual_skewness": float(stats.skew(clean_returns)),
            "actual_kurtosis": float(stats.kurtosis(clean_returns)),
            "normality_assumption": True,
            "scaling_method": "sqrt_time",
            "warning": "Assumes normal distribution - may underestimate tail risk",
        }

        logger.info(
            "Parametric VaR calculated",
            var_value=round(var_value, 4),
            cvar_value=round(cvar_value, 4),
            confidence=confidence,
            horizon=horizon,
            observations=len(clean_returns),
        )

        return VaRResult(
            var_value=var_value,
            cvar_value=cvar_value,
            model_type=self.model_type,
            confidence_level=confidence,
            horizon_days=horizon,
            lookback_days=len(clean_returns),
            observations_used=len(clean_returns),
            portfolio_value=portfolio_value,
            parameters_logged=parameters,
        )


class EVTVaR(VaRModel):
    """
    Extreme Value Theory (EVT) VaR.

    Focuses on modeling the tail of the distribution using Generalized
    Pareto Distribution (GPD). Better for capturing extreme losses.

    Advantages:
    - Specifically models tail behavior
    - Better for extreme risk estimation
    - Captures fat tails accurately

    Disadvantages:
    - Requires more data for reliable estimates
    - Threshold selection is subjective
    - More complex implementation

    Use when tail risk is the primary concern (e.g., stress testing).
    """

    def __init__(self, threshold_percentile: float = 0.10):
        """
        Initialize EVT VaR model.

        Args:
            threshold_percentile: Percentile for POT threshold (default 10%)
        """
        self.threshold_percentile = threshold_percentile

    @property
    def model_type(self) -> VaRModelType:
        return VaRModelType.EVT

    def calculate(
        self,
        returns: pd.Series,
        confidence: float = 0.95,
        horizon: int = 1,
        portfolio_value: Optional[float] = None,
    ) -> VaRResult:
        """
        Calculate EVT VaR using Peaks Over Threshold (POT) method.

        Args:
            returns: Daily returns series
            confidence: Confidence level (default 0.95)
            horizon: Time horizon in days
            portfolio_value: Portfolio value for dollar VaR

        Returns:
            VaRResult with calculated values
        """
        # EVT needs more observations
        is_valid, error_msg = self._validate_inputs(
            returns, confidence, horizon, min_observations=100
        )
        if not is_valid:
            logger.error("EVT VaR validation failed", error=error_msg)
            raise ValueError(f"VaR calculation failed: {error_msg}")

        # Clean returns
        clean_returns = returns.dropna()

        # Convert to losses (positive values)
        losses = -clean_returns

        # Set threshold using percentile
        threshold = np.percentile(losses, (1 - self.threshold_percentile) * 100)

        # Get exceedances (losses above threshold)
        exceedances = losses[losses > threshold] - threshold

        if len(exceedances) < 10:
            logger.warning(
                "Insufficient exceedances for EVT, falling back to historical",
                exceedances=len(exceedances),
            )
            # Fallback to historical method
            historical_model = HistoricalVaR()
            return historical_model.calculate(returns, confidence, horizon, portfolio_value)

        # Fit Generalized Pareto Distribution to exceedances
        try:
            # Fit GPD using maximum likelihood
            shape, loc, scale = stats.genpareto.fit(exceedances, floc=0)
        except Exception as e:
            logger.warning(
                "GPD fit failed, falling back to historical",
                error=str(e),
            )
            historical_model = HistoricalVaR()
            return historical_model.calculate(returns, confidence, horizon, portfolio_value)

        # Calculate VaR using GPD
        n = len(clean_returns)
        n_u = len(exceedances)

        # Exceedance probability
        p_u = n_u / n

        # VaR quantile
        p = 1 - confidence

        if shape != 0:
            var_excess = (scale / shape) * (((p / p_u) ** (-shape)) - 1)
        else:
            var_excess = scale * np.log(p_u / p)

        daily_var = threshold + var_excess

        # Scale to horizon
        var_value = self._scale_to_horizon(daily_var, horizon)

        # Calculate CVaR for GPD
        if shape < 1:
            cvar_excess = var_excess / (1 - shape) + (scale - shape * threshold) / (1 - shape)
            cvar_value = self._scale_to_horizon(threshold + cvar_excess, horizon)
        else:
            # Shape >= 1 means infinite expected shortfall, use approximation
            cvar_value = var_value * 1.5

        # Scale to portfolio value if provided
        if portfolio_value:
            var_value = var_value * portfolio_value
            cvar_value = cvar_value * portfolio_value

        # Build audit parameters
        parameters = {
            "method": "extreme_value_theory",
            "sub_method": "peaks_over_threshold",
            "confidence": confidence,
            "horizon": horizon,
            "lookback_days": len(clean_returns),
            "threshold_percentile": self.threshold_percentile,
            "threshold_value": float(threshold),
            "exceedances_count": len(exceedances),
            "gpd_shape": float(shape),
            "gpd_scale": float(scale),
            "mean_return": float(clean_returns.mean()),
            "std_return": float(clean_returns.std()),
            "skewness": float(stats.skew(clean_returns)),
            "kurtosis": float(stats.kurtosis(clean_returns)),
            "scaling_method": "sqrt_time",
        }

        logger.info(
            "EVT VaR calculated",
            var_value=round(var_value, 4),
            cvar_value=round(cvar_value, 4),
            confidence=confidence,
            horizon=horizon,
            observations=len(clean_returns),
            exceedances=len(exceedances),
            gpd_shape=round(shape, 4),
        )

        return VaRResult(
            var_value=var_value,
            cvar_value=cvar_value,
            model_type=self.model_type,
            confidence_level=confidence,
            horizon_days=horizon,
            lookback_days=len(clean_returns),
            observations_used=len(clean_returns),
            portfolio_value=portfolio_value,
            parameters_logged=parameters,
        )


def create_var_model(
    model_type: str = "historical",
    config: Optional[Dict[str, Any]] = None,
) -> VaRModel:
    """
    Factory function to create VaR models.

    Args:
        model_type: Type of model ('historical', 'parametric', 'evt')
        config: Optional configuration parameters

    Returns:
        Configured VaRModel instance
    """
    config = config or {}
    model_type_lower = model_type.lower()

    if model_type_lower == "historical":
        return HistoricalVaR()
    elif model_type_lower == "parametric":
        return ParametricVaR()
    elif model_type_lower == "evt":
        threshold_pct = config.get("evt_threshold_percentile", 0.10)
        return EVTVaR(threshold_percentile=threshold_pct)
    else:
        logger.warning(
            f"Unknown VaR model type '{model_type}', defaulting to historical"
        )
        return HistoricalVaR()


def load_var_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load VaR configuration from file.

    Args:
        config_path: Path to config file (default: config/risk/var_config.json)

    Returns:
        Configuration dictionary
    """
    if config_path is None:
        config_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "..", "config", "risk", "var_config.json"
        )

    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return json.load(f)

    # Return default config
    return {
        "default_model": "historical",
        "confidence_levels": [0.95, 0.99],
        "horizons": {"daily": 1, "weekly": 5},
        "lookback_days": 252,
        "min_observations": 100,
        "aligned_timestamps_required": True,
        "var_blocks_trades": False,
    }
