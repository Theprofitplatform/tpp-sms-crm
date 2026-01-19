"""
VaR Validator - Validation and Backtesting for VaR Models

Provides validation checks to ensure VaR calculations are reliable:
- Return horizon matches strategy holding time
- Lookback window is stable and appropriate
- Missing data handling
- Correlation timestamp alignment
- Full audit trail logging

IMPORTANT DISCLAIMER:
VaR is an INFORMATIONAL METRIC for risk monitoring ONLY.
VaR should NOT be used to automatically gate or block trades.
See var_config.json: "var_blocks_trades": false

Usage:
    from analytics.var_validator import VaRValidator

    validator = VaRValidator()
    result = validator.validate_returns(returns, horizon=1)
    if result.is_valid:
        var_result = model.calculate(returns)
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from scipy import stats
import structlog

from .var_models import VaRModel, VaRResult, HistoricalVaR, create_var_model, load_var_config

logger = structlog.get_logger(__name__)


@dataclass
class VaRValidationResult:
    """
    Result from VaR data validation.

    Attributes:
        is_valid: Whether the data passes all validation checks
        warnings: List of non-fatal warnings
        errors: List of fatal errors that prevent calculation
        checks_passed: Dict of check name -> passed status
        parameters_logged: All validation parameters for audit
    """
    is_valid: bool
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    checks_passed: Dict[str, bool] = field(default_factory=dict)
    parameters_logged: Dict[str, Any] = field(default_factory=dict)
    validated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "is_valid": self.is_valid,
            "warnings": self.warnings,
            "errors": self.errors,
            "checks_passed": self.checks_passed,
            "parameters_logged": self.parameters_logged,
            "validated_at": self.validated_at.isoformat(),
        }


@dataclass
class VaRBacktestResult:
    """
    Result from VaR backtesting (historical accuracy check).

    Attributes:
        total_observations: Number of days in backtest period
        var_breaches: Number of times actual loss exceeded VaR
        breach_rate: Actual breach rate (should be close to 1-confidence)
        expected_breaches: Expected number of breaches
        is_accurate: Whether model passes accuracy test
        kupiec_test_pvalue: P-value from Kupiec POF test
        christoffersen_test_pvalue: P-value from Christoffersen independence test
        model_type: VaR model used
        confidence_level: Confidence level tested
    """
    total_observations: int
    var_breaches: int
    breach_rate: float
    expected_breaches: float
    is_accurate: bool
    kupiec_test_pvalue: float
    christoffersen_test_pvalue: Optional[float] = None
    model_type: str = "historical"
    confidence_level: float = 0.95
    parameters_logged: Dict[str, Any] = field(default_factory=dict)
    backtested_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "total_observations": self.total_observations,
            "var_breaches": self.var_breaches,
            "breach_rate": round(self.breach_rate, 4),
            "expected_breaches": round(self.expected_breaches, 2),
            "expected_breach_rate": round(1 - self.confidence_level, 4),
            "is_accurate": self.is_accurate,
            "kupiec_test_pvalue": round(self.kupiec_test_pvalue, 4),
            "christoffersen_test_pvalue": (
                round(self.christoffersen_test_pvalue, 4)
                if self.christoffersen_test_pvalue is not None
                else None
            ),
            "model_type": self.model_type,
            "confidence_level": self.confidence_level,
            "parameters_logged": self.parameters_logged,
            "backtested_at": self.backtested_at.isoformat(),
        }


class VaRValidator:
    """
    Validator for VaR calculations.

    Performs comprehensive validation of input data and parameters
    to ensure reliable VaR estimates. All validation parameters
    are logged for audit trail compliance.

    IMPORTANT:
    VaR is for monitoring only. Primary trade gates are:
    - Exposure limits
    - Drawdown limits
    - Circuit breakers

    VaR does NOT block trades by default (var_blocks_trades: false).
    """

    def __init__(
        self,
        config_path: Optional[str] = None,
        min_observations: int = 100,
        max_missing_pct: float = 0.05,
        max_stale_days: int = 5,
    ):
        """
        Initialize VaR validator.

        Args:
            config_path: Path to var_config.json
            min_observations: Minimum required observations
            max_missing_pct: Maximum allowed missing data percentage
            max_stale_days: Maximum days of stale data allowed
        """
        self.config = load_var_config(config_path)
        self.min_observations = min_observations or self.config.get("min_observations", 100)
        self.max_missing_pct = max_missing_pct
        self.max_stale_days = max_stale_days

        logger.info(
            "VaR Validator initialized",
            min_observations=self.min_observations,
            var_blocks_trades=self.config.get("var_blocks_trades", False),
        )

    def validate_returns(
        self,
        returns: pd.Series,
        expected_horizon: int = 1,
        strategy_holding_time: Optional[str] = None,
        correlation_data: Optional[pd.DataFrame] = None,
    ) -> VaRValidationResult:
        """
        Validate return series for VaR calculation.

        Checks:
        1. Sufficient observations
        2. Missing data within tolerance
        3. Horizon matches strategy (1d for daily, 5d for weekly)
        4. Lookback window is stable
        5. Data is not stale
        6. Correlation timestamps aligned (if provided)

        Args:
            returns: Return series to validate
            expected_horizon: Expected VaR horizon in days
            strategy_holding_time: Strategy holding period ('daily', 'weekly', etc.)
            correlation_data: Optional correlation DataFrame for alignment check

        Returns:
            VaRValidationResult with validation status
        """
        warnings: List[str] = []
        errors: List[str] = []
        checks: Dict[str, bool] = {}
        params: Dict[str, Any] = {}

        # Start logging parameters
        params["validation_timestamp"] = datetime.utcnow().isoformat()
        params["expected_horizon"] = expected_horizon
        params["strategy_holding_time"] = strategy_holding_time

        # CHECK 1: Series not empty
        if returns is None or len(returns) == 0:
            errors.append("Return series is empty or None")
            checks["series_not_empty"] = False
            return VaRValidationResult(
                is_valid=False,
                errors=errors,
                checks_passed=checks,
                parameters_logged=params,
            )
        checks["series_not_empty"] = True
        params["series_length"] = len(returns)

        # CHECK 2: Sufficient observations
        observation_count = len(returns.dropna())
        params["observation_count"] = observation_count
        params["min_required_observations"] = self.min_observations

        if observation_count < self.min_observations:
            errors.append(
                f"Insufficient observations: {observation_count} < {self.min_observations}"
            )
            checks["sufficient_observations"] = False
        else:
            checks["sufficient_observations"] = True

        # CHECK 3: Missing data check
        total_count = len(returns)
        nan_count = returns.isna().sum()
        missing_pct = nan_count / total_count if total_count > 0 else 0
        params["missing_count"] = int(nan_count)
        params["missing_pct"] = round(missing_pct, 4)

        if missing_pct > self.max_missing_pct:
            errors.append(
                f"Too much missing data: {missing_pct:.1%} > {self.max_missing_pct:.1%}"
            )
            checks["missing_data_acceptable"] = False
        elif nan_count > 0:
            warnings.append(f"Contains {nan_count} missing values ({missing_pct:.1%})")
            checks["missing_data_acceptable"] = True
        else:
            checks["missing_data_acceptable"] = True

        # CHECK 4: Horizon matches strategy holding time
        if strategy_holding_time:
            expected_horizons = {
                "daily": 1,
                "weekly": 5,
                "monthly": 21,
                "intraday": 1,
            }
            strategy_horizon = expected_horizons.get(strategy_holding_time.lower(), 1)
            params["strategy_expected_horizon"] = strategy_horizon

            if expected_horizon != strategy_horizon:
                warnings.append(
                    f"VaR horizon ({expected_horizon}d) doesn't match strategy "
                    f"holding time ({strategy_holding_time}: {strategy_horizon}d)"
                )
                checks["horizon_matches_strategy"] = False
            else:
                checks["horizon_matches_strategy"] = True
        else:
            checks["horizon_matches_strategy"] = True  # Not checked

        # CHECK 5: Lookback window stability
        if hasattr(returns.index, 'to_pydatetime'):
            try:
                dates = pd.to_datetime(returns.index)
                date_diffs = dates.diff().dropna()

                if len(date_diffs) > 0:
                    median_gap = date_diffs.median()
                    max_gap = date_diffs.max()

                    params["median_observation_gap_days"] = (
                        median_gap.days if hasattr(median_gap, 'days')
                        else median_gap / np.timedelta64(1, 'D')
                    )

                    # Check for large gaps (>5 days suggests missing data periods)
                    large_gaps = date_diffs[date_diffs > timedelta(days=5)]
                    if len(large_gaps) > 3:
                        warnings.append(
                            f"Found {len(large_gaps)} gaps > 5 days in data"
                        )
                        checks["lookback_stable"] = False
                    else:
                        checks["lookback_stable"] = True
                else:
                    checks["lookback_stable"] = True
            except Exception as e:
                warnings.append(f"Could not check date gaps: {str(e)}")
                checks["lookback_stable"] = True
        else:
            checks["lookback_stable"] = True

        # CHECK 6: Data freshness (not stale)
        if hasattr(returns.index, 'max'):
            try:
                latest_date = pd.to_datetime(returns.index.max())
                days_since_latest = (datetime.utcnow() - latest_date).days

                params["latest_observation_date"] = latest_date.isoformat()
                params["days_since_latest"] = days_since_latest

                if days_since_latest > self.max_stale_days:
                    warnings.append(
                        f"Data may be stale: latest observation is {days_since_latest} days old"
                    )
                    checks["data_not_stale"] = False
                else:
                    checks["data_not_stale"] = True
            except Exception:
                checks["data_not_stale"] = True
        else:
            checks["data_not_stale"] = True

        # CHECK 7: Correlation timestamp alignment (if provided)
        if correlation_data is not None and self.config.get("aligned_timestamps_required", True):
            alignment_result = self._check_timestamp_alignment(returns, correlation_data)
            checks["timestamps_aligned"] = alignment_result["aligned"]
            params["timestamp_alignment"] = alignment_result

            if not alignment_result["aligned"]:
                warnings.append(
                    f"Correlation data not aligned: {alignment_result['overlap_pct']:.1%} overlap"
                )

        # CHECK 8: Basic statistical sanity
        clean_returns = returns.dropna()
        if len(clean_returns) > 0:
            params["mean_return"] = float(clean_returns.mean())
            params["std_return"] = float(clean_returns.std())
            params["min_return"] = float(clean_returns.min())
            params["max_return"] = float(clean_returns.max())
            params["skewness"] = float(stats.skew(clean_returns))
            params["kurtosis"] = float(stats.kurtosis(clean_returns))

            # Check for extreme values
            if clean_returns.std() > 0:
                z_scores = np.abs((clean_returns - clean_returns.mean()) / clean_returns.std())
                extreme_count = (z_scores > 5).sum()
                if extreme_count > len(clean_returns) * 0.01:
                    warnings.append(
                        f"Found {extreme_count} extreme values (|z| > 5)"
                    )
                params["extreme_value_count"] = int(extreme_count)

        # Determine overall validity
        is_valid = len(errors) == 0

        # Log validation result
        params["config_used"] = {
            "min_observations": self.min_observations,
            "max_missing_pct": self.max_missing_pct,
            "max_stale_days": self.max_stale_days,
            "lookback_days": self.config.get("lookback_days", 252),
        }
        params["var_blocks_trades"] = self.config.get("var_blocks_trades", False)

        logger.info(
            "VaR validation completed",
            is_valid=is_valid,
            checks_passed=sum(checks.values()),
            checks_total=len(checks),
            warning_count=len(warnings),
            error_count=len(errors),
        )

        return VaRValidationResult(
            is_valid=is_valid,
            warnings=warnings,
            errors=errors,
            checks_passed=checks,
            parameters_logged=params,
        )

    def _check_timestamp_alignment(
        self,
        returns: pd.Series,
        correlation_data: pd.DataFrame,
    ) -> Dict[str, Any]:
        """
        Check if correlation data timestamps align with returns.

        Args:
            returns: Return series
            correlation_data: Correlation DataFrame with DatetimeIndex

        Returns:
            Dict with alignment check results
        """
        try:
            returns_dates = set(pd.to_datetime(returns.index).date)
            corr_dates = set(pd.to_datetime(correlation_data.index).date)

            overlap = returns_dates & corr_dates
            overlap_pct = len(overlap) / len(returns_dates) if returns_dates else 0

            return {
                "aligned": overlap_pct >= 0.90,
                "overlap_count": len(overlap),
                "returns_dates": len(returns_dates),
                "correlation_dates": len(corr_dates),
                "overlap_pct": overlap_pct,
            }
        except Exception as e:
            return {
                "aligned": True,  # Assume aligned on error
                "error": str(e),
            }

    def backtest_var(
        self,
        returns: pd.Series,
        model_type: str = "historical",
        confidence: float = 0.95,
        window: int = 252,
        horizon: int = 1,
        portfolio_value: Optional[float] = None,
    ) -> VaRBacktestResult:
        """
        Backtest VaR model accuracy using historical data.

        Performs rolling VaR calculation and counts how often actual losses
        exceeded the predicted VaR. A well-calibrated model should have
        breach rate close to (1 - confidence).

        Statistical tests performed:
        - Kupiec POF test: Tests if breach rate matches expected rate
        - Christoffersen test: Tests if breaches are independent

        Args:
            returns: Full historical return series
            model_type: VaR model to test ('historical', 'parametric', 'evt')
            confidence: Confidence level to test
            window: Rolling window size for VaR calculation
            horizon: VaR horizon in days
            portfolio_value: Portfolio value for scaling

        Returns:
            VaRBacktestResult with accuracy metrics
        """
        if len(returns) < window + 50:
            raise ValueError(
                f"Insufficient data for backtest: need {window + 50}, got {len(returns)}"
            )

        clean_returns = returns.dropna()
        model = create_var_model(model_type)

        breaches = []
        var_values = []
        actual_losses = []

        # Rolling backtest
        for i in range(window, len(clean_returns)):
            # Calculate VaR using data up to (but not including) day i
            historical_returns = clean_returns.iloc[i-window:i]

            try:
                result = model.calculate(
                    historical_returns,
                    confidence=confidence,
                    horizon=horizon,
                    portfolio_value=portfolio_value if portfolio_value else 1.0,
                )
                var_i = result.var_value
            except Exception:
                continue

            # Check if actual loss exceeded VaR
            if horizon == 1:
                actual_return = clean_returns.iloc[i]
            else:
                # Multi-day return
                end_idx = min(i + horizon, len(clean_returns))
                actual_return = clean_returns.iloc[i:end_idx].sum()

            actual_loss = -actual_return
            if portfolio_value:
                actual_loss = actual_loss * portfolio_value

            is_breach = actual_loss > var_i
            breaches.append(int(is_breach))
            var_values.append(var_i)
            actual_losses.append(actual_loss)

        if len(breaches) == 0:
            raise ValueError("No backtest observations generated")

        # Calculate statistics
        total_obs = len(breaches)
        breach_count = sum(breaches)
        breach_rate = breach_count / total_obs
        expected_breaches = total_obs * (1 - confidence)

        # Kupiec POF test (Proportion of Failures)
        kupiec_pvalue = self._kupiec_pof_test(total_obs, breach_count, confidence)

        # Christoffersen independence test
        chris_pvalue = self._christoffersen_test(breaches)

        # Model is accurate if:
        # 1. Kupiec test p-value > 0.05 (breach rate not significantly different)
        # 2. Breach rate within reasonable bounds
        is_accurate = (
            kupiec_pvalue > 0.05 and
            breach_rate < (1 - confidence) * 2  # Not more than 2x expected
        )

        params = {
            "model_type": model_type,
            "confidence": confidence,
            "window": window,
            "horizon": horizon,
            "portfolio_value": portfolio_value,
            "total_observations": total_obs,
            "expected_breach_rate": 1 - confidence,
            "actual_breach_rate": breach_rate,
            "mean_var": float(np.mean(var_values)),
            "mean_actual_loss": float(np.mean(actual_losses)),
            "max_actual_loss": float(np.max(actual_losses)),
        }

        logger.info(
            "VaR backtest completed",
            model_type=model_type,
            confidence=confidence,
            breach_rate=round(breach_rate, 4),
            expected_rate=round(1 - confidence, 4),
            is_accurate=is_accurate,
            kupiec_pvalue=round(kupiec_pvalue, 4),
        )

        return VaRBacktestResult(
            total_observations=total_obs,
            var_breaches=breach_count,
            breach_rate=breach_rate,
            expected_breaches=expected_breaches,
            is_accurate=is_accurate,
            kupiec_test_pvalue=kupiec_pvalue,
            christoffersen_test_pvalue=chris_pvalue,
            model_type=model_type,
            confidence_level=confidence,
            parameters_logged=params,
        )

    def _kupiec_pof_test(
        self,
        n: int,
        x: int,
        confidence: float,
    ) -> float:
        """
        Kupiec Proportion of Failures (POF) test.

        Tests if observed breach rate is significantly different from expected.

        Args:
            n: Total observations
            x: Number of breaches
            confidence: VaR confidence level

        Returns:
            P-value from likelihood ratio test
        """
        p = 1 - confidence  # Expected breach probability
        p_hat = x / n if n > 0 else 0  # Observed breach probability

        if p_hat == 0 or p_hat == 1:
            # Degenerate case
            return 0.0

        # Likelihood ratio statistic
        # LR = -2 * ln[(p^x * (1-p)^(n-x)) / (p_hat^x * (1-p_hat)^(n-x))]
        try:
            lr = -2 * (
                x * np.log(p / p_hat) +
                (n - x) * np.log((1 - p) / (1 - p_hat))
            )
            # LR ~ chi-squared(1)
            pvalue = 1 - stats.chi2.cdf(lr, 1)
            return float(pvalue)
        except Exception:
            return 0.0

    def _christoffersen_test(
        self,
        breaches: List[int],
    ) -> Optional[float]:
        """
        Christoffersen test for independence of breaches.

        Tests if breaches cluster together (bad) or are independent (good).

        Args:
            breaches: List of breach indicators (0 or 1)

        Returns:
            P-value from likelihood ratio test, or None if insufficient data
        """
        n = len(breaches)
        if n < 10:
            return None

        # Count transitions
        n00 = n01 = n10 = n11 = 0
        for i in range(1, n):
            if breaches[i-1] == 0 and breaches[i] == 0:
                n00 += 1
            elif breaches[i-1] == 0 and breaches[i] == 1:
                n01 += 1
            elif breaches[i-1] == 1 and breaches[i] == 0:
                n10 += 1
            else:
                n11 += 1

        if (n00 + n01) == 0 or (n10 + n11) == 0:
            return None

        # Transition probabilities
        pi01 = n01 / (n00 + n01) if (n00 + n01) > 0 else 0
        pi11 = n11 / (n10 + n11) if (n10 + n11) > 0 else 0
        pi = (n01 + n11) / (n - 1) if (n - 1) > 0 else 0

        if pi01 == 0 or pi11 == 0 or pi == 0:
            return None
        if pi01 == 1 or pi11 == 1 or pi == 1:
            return None

        try:
            # Likelihood ratio for independence
            lr_ind = -2 * (
                n00 * np.log(1 - pi) + n01 * np.log(pi) +
                n10 * np.log(1 - pi) + n11 * np.log(pi) -
                n00 * np.log(1 - pi01) - n01 * np.log(pi01) -
                n10 * np.log(1 - pi11) - n11 * np.log(pi11)
            )
            # LR ~ chi-squared(1)
            pvalue = 1 - stats.chi2.cdf(lr_ind, 1)
            return float(pvalue)
        except Exception:
            return None


def validate_var_calculation(
    returns: pd.Series,
    horizon: int = 1,
    strategy_holding_time: Optional[str] = None,
) -> Tuple[bool, VaRValidationResult]:
    """
    Convenience function to validate VaR inputs.

    Args:
        returns: Return series
        horizon: VaR horizon
        strategy_holding_time: Optional strategy type

    Returns:
        Tuple of (is_valid, validation_result)
    """
    validator = VaRValidator()
    result = validator.validate_returns(
        returns=returns,
        expected_horizon=horizon,
        strategy_holding_time=strategy_holding_time,
    )
    return result.is_valid, result
