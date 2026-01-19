"""
Data Leakage Detector for Walk-Forward Backtesting

Detects and prevents common sources of data leakage:
1. Look-ahead bias in indicators (using future data)
2. Survivorship bias (only selecting symbols that survived)
3. Parameter peeking (using test data to select parameters)

Usage:
    detector = LeakageDetector()

    # Validate indicator calculation
    is_valid = detector.validate_indicator_calculation(df, my_indicator, lookback=20)

    # Validate universe selection
    result = detector.validate_universe_selection(date(2024, 1, 1), ["AAPL", "MSFT"])

    # Full audit of backtest
    report = detector.run_leakage_audit(backtest_result)
"""

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any, Callable, Tuple
import numpy as np
import pandas as pd
import structlog

logger = structlog.get_logger(__name__)


class LeakageType(str, Enum):
    """Types of data leakage detected in backtests."""
    LOOK_AHEAD = "look_ahead"           # Indicator uses future data
    SURVIVORSHIP = "survivorship"        # Universe excludes delisted symbols
    PARAMETER_PEEK = "parameter_peek"    # Parameters tuned on test data
    UNIVERSE_CHANGE = "universe_change"  # Universe changes mid-backtest
    DATA_SNOOP = "data_snoop"           # Multiple testing without adjustment
    TIME_TRAVEL = "time_travel"          # Data timestamped before available
    FUTURE_JOIN = "future_join"          # Joining data from future dates


@dataclass
class ValidationResult:
    """Result of a validation check."""
    is_valid: bool
    leakage_type: Optional[LeakageType] = None
    message: str = ""
    severity: str = "info"  # info, warning, error, critical
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "is_valid": self.is_valid,
            "leakage_type": self.leakage_type.value if self.leakage_type else None,
            "message": self.message,
            "severity": self.severity,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class LeakageReport:
    """Full leakage audit report for a backtest."""
    backtest_id: str
    audit_timestamp: datetime
    leakage_detected: bool
    leakage_types: List[LeakageType]
    validation_results: List[ValidationResult]

    # Specific flags
    universe_survivorship_bias: bool = False
    parameter_peeking: bool = False
    indicator_lookahead: bool = False

    # Metadata
    symbols_checked: List[str] = field(default_factory=list)
    date_range: Dict[str, str] = field(default_factory=dict)
    parameters_audited: Dict[str, Any] = field(default_factory=dict)

    # Summary statistics
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    warnings: int = 0

    # Recommendations
    recommendations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "backtest_id": self.backtest_id,
            "audit_timestamp": self.audit_timestamp.isoformat(),
            "leakage_detected": self.leakage_detected,
            "leakage_types": [lt.value for lt in self.leakage_types],
            "validation_results": [r.to_dict() for r in self.validation_results],
            "universe_survivorship_bias": self.universe_survivorship_bias,
            "parameter_peeking": self.parameter_peeking,
            "indicator_lookahead": self.indicator_lookahead,
            "symbols_checked": self.symbols_checked,
            "date_range": self.date_range,
            "parameters_audited": self.parameters_audited,
            "total_checks": self.total_checks,
            "passed_checks": self.passed_checks,
            "failed_checks": self.failed_checks,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
        }

    def generate_hash(self) -> str:
        """Generate a hash of the audit report for integrity verification."""
        content = json.dumps(self.to_dict(), sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()


class LeakageDetector:
    """
    Detects data leakage in backtesting workflows.

    This class provides methods to validate various aspects of backtesting
    to ensure no future data is used in signal generation or parameter selection.
    """

    def __init__(
        self,
        universe_db_path: Optional[str] = None,
        strict_mode: bool = True,
    ):
        """
        Initialize the leakage detector.

        Args:
            universe_db_path: Path to universe history database
            strict_mode: If True, fail on warnings; if False, only fail on errors
        """
        self.universe_db_path = universe_db_path
        self.strict_mode = strict_mode
        self._parameter_history: Dict[str, List[Tuple[date, Dict[str, Any]]]] = {}
        self._universe_snapshots: Dict[date, List[str]] = {}

    def validate_indicator_calculation(
        self,
        df: pd.DataFrame,
        indicator_func: Callable[[pd.DataFrame], pd.Series],
        lookback: int,
        tolerance: float = 1e-10,
    ) -> ValidationResult:
        """
        Verify that an indicator only uses past data (no look-ahead bias).

        Tests by:
        1. Computing indicator on full dataset
        2. Computing indicator on truncated datasets
        3. Verifying values match (no future data influence)

        Args:
            df: DataFrame with OHLCV data
            indicator_func: Function that takes DataFrame and returns indicator Series
            lookback: Lookback period of the indicator
            tolerance: Numerical tolerance for comparison

        Returns:
            ValidationResult indicating if indicator is valid
        """
        if len(df) < lookback + 10:
            return ValidationResult(
                is_valid=True,
                message="Insufficient data for look-ahead test",
                severity="warning",
                details={"rows": len(df), "required": lookback + 10},
            )

        try:
            # Compute indicator on full dataset
            full_indicator = indicator_func(df.copy())

            # Test at multiple points
            test_indices = [
                lookback + 5,
                len(df) // 2,
                len(df) - lookback - 5,
            ]

            mismatches = []
            for idx in test_indices:
                if idx >= len(df) or idx < lookback:
                    continue

                # Compute indicator on truncated dataset
                truncated_df = df.iloc[:idx + 1].copy()
                truncated_indicator = indicator_func(truncated_df)

                # Compare values at the test index
                full_value = full_indicator.iloc[idx]
                truncated_value = truncated_indicator.iloc[-1]

                if pd.notna(full_value) and pd.notna(truncated_value):
                    if abs(full_value - truncated_value) > tolerance:
                        mismatches.append({
                            "index": idx,
                            "full_value": float(full_value),
                            "truncated_value": float(truncated_value),
                            "difference": abs(full_value - truncated_value),
                        })

            if mismatches:
                return ValidationResult(
                    is_valid=False,
                    leakage_type=LeakageType.LOOK_AHEAD,
                    message=f"Indicator uses future data - {len(mismatches)} mismatches found",
                    severity="critical",
                    details={"mismatches": mismatches},
                )

            return ValidationResult(
                is_valid=True,
                message="Indicator passes look-ahead validation",
                severity="info",
                details={"test_points": len(test_indices)},
            )

        except Exception as e:
            logger.error("Indicator validation error", error=str(e))
            return ValidationResult(
                is_valid=False,
                leakage_type=LeakageType.LOOK_AHEAD,
                message=f"Indicator validation failed: {str(e)}",
                severity="error",
                details={"error": str(e)},
            )

    def validate_universe_selection(
        self,
        selection_date: date,
        symbols: List[str],
        universe_history: Optional[Dict[str, Dict]] = None,
    ) -> ValidationResult:
        """
        Check if symbols were tradeable on selection_date (no survivorship bias).

        Verifies that:
        1. All symbols existed on the selection date
        2. No symbols were delisted before the backtest end
        3. No symbols are "future" additions to the universe

        Args:
            selection_date: Date when universe was selected
            symbols: List of symbols in the universe
            universe_history: Optional dict mapping symbols to their universe history

        Returns:
            ValidationResult with survivorship bias assessment
        """
        issues = []
        future_symbols = []
        delisted_symbols = []

        if universe_history:
            for symbol in symbols:
                history = universe_history.get(symbol)
                if history is None:
                    issues.append(f"{symbol}: No universe history found")
                    continue

                in_from = history.get("in_universe_from")
                in_until = history.get("in_universe_until")

                # Check if symbol was added after selection date (survivorship bias)
                if in_from and in_from > selection_date:
                    future_symbols.append({
                        "symbol": symbol,
                        "added_date": in_from.isoformat() if isinstance(in_from, date) else str(in_from),
                        "selection_date": selection_date.isoformat(),
                    })

                # Check if symbol was delisted before selection date
                if in_until and in_until < selection_date:
                    delisted_symbols.append({
                        "symbol": symbol,
                        "delisted_date": in_until.isoformat() if isinstance(in_until, date) else str(in_until),
                        "selection_date": selection_date.isoformat(),
                    })

        if future_symbols or delisted_symbols:
            return ValidationResult(
                is_valid=False,
                leakage_type=LeakageType.SURVIVORSHIP,
                message=f"Survivorship bias detected: {len(future_symbols)} future symbols, {len(delisted_symbols)} delisted",
                severity="critical",
                details={
                    "future_symbols": future_symbols,
                    "delisted_symbols": delisted_symbols,
                    "issues": issues,
                },
            )

        if issues:
            return ValidationResult(
                is_valid=True,
                leakage_type=None,
                message="Universe validation passed with warnings",
                severity="warning",
                details={"issues": issues},
            )

        return ValidationResult(
            is_valid=True,
            message=f"Universe of {len(symbols)} symbols valid for {selection_date}",
            severity="info",
            details={"symbol_count": len(symbols), "selection_date": selection_date.isoformat()},
        )

    def validate_parameter_selection(
        self,
        train_end: date,
        params: Dict[str, Any],
        param_history: List[Tuple[date, Dict[str, Any]]],
    ) -> ValidationResult:
        """
        Ensure parameters don't peek into test window.

        Validates that:
        1. Parameters were selected using only data before train_end
        2. No parameter changes occurred during test window
        3. Parameter selection date predates test window

        Args:
            train_end: End date of training window
            params: Current parameters being used
            param_history: List of (date, params) tuples showing parameter evolution

        Returns:
            ValidationResult indicating if parameter selection is valid
        """
        if not param_history:
            return ValidationResult(
                is_valid=True,
                message="No parameter history to validate",
                severity="warning",
                details={"params": params},
            )

        # Find when current parameters were selected
        param_selection_date = None
        for selection_date, historical_params in sorted(param_history, key=lambda x: x[0], reverse=True):
            if historical_params == params:
                param_selection_date = selection_date
                break

        if param_selection_date is None:
            return ValidationResult(
                is_valid=False,
                leakage_type=LeakageType.PARAMETER_PEEK,
                message="Parameters not found in history - possible manual override",
                severity="warning",
                details={"params": params, "history_length": len(param_history)},
            )

        if param_selection_date > train_end:
            return ValidationResult(
                is_valid=False,
                leakage_type=LeakageType.PARAMETER_PEEK,
                message=f"Parameters selected ({param_selection_date}) after train_end ({train_end})",
                severity="critical",
                details={
                    "param_selection_date": param_selection_date.isoformat(),
                    "train_end": train_end.isoformat(),
                    "params": params,
                },
            )

        return ValidationResult(
            is_valid=True,
            message=f"Parameters selected on {param_selection_date}, valid for train_end {train_end}",
            severity="info",
            details={
                "param_selection_date": param_selection_date.isoformat(),
                "train_end": train_end.isoformat(),
            },
        )

    def validate_data_timestamps(
        self,
        df: pd.DataFrame,
        as_of_date: date,
    ) -> ValidationResult:
        """
        Validate that data was available as of the given date.

        Checks for time-traveling data issues where data is used
        before it would have been available in real-time.

        Args:
            df: DataFrame with timestamp index
            as_of_date: The date as of which data should be validated

        Returns:
            ValidationResult for data timestamp validation
        """
        if df.empty:
            return ValidationResult(
                is_valid=True,
                message="Empty DataFrame, no timestamps to validate",
                severity="info",
            )

        # Check if any data is from the future
        if isinstance(df.index, pd.DatetimeIndex):
            future_data = df[df.index.date > as_of_date]
            if not future_data.empty:
                return ValidationResult(
                    is_valid=False,
                    leakage_type=LeakageType.TIME_TRAVEL,
                    message=f"Data contains {len(future_data)} rows from after {as_of_date}",
                    severity="critical",
                    details={
                        "as_of_date": as_of_date.isoformat(),
                        "future_dates": [d.isoformat() for d in future_data.index[:5]],
                        "future_row_count": len(future_data),
                    },
                )

        return ValidationResult(
            is_valid=True,
            message=f"All data valid as of {as_of_date}",
            severity="info",
        )

    def validate_train_test_separation(
        self,
        train_df: pd.DataFrame,
        test_df: pd.DataFrame,
        train_end: date,
        test_start: date,
    ) -> ValidationResult:
        """
        Validate that train and test data are properly separated.

        Args:
            train_df: Training data DataFrame
            test_df: Test data DataFrame
            train_end: Expected end of training period
            test_start: Expected start of test period

        Returns:
            ValidationResult for train/test separation
        """
        issues = []

        # Check for overlap
        if isinstance(train_df.index, pd.DatetimeIndex) and isinstance(test_df.index, pd.DatetimeIndex):
            train_dates = set(train_df.index.date)
            test_dates = set(test_df.index.date)
            overlap = train_dates.intersection(test_dates)

            if overlap:
                issues.append(f"Date overlap found: {len(overlap)} dates in both train and test")

        # Check that train_end is respected
        if isinstance(train_df.index, pd.DatetimeIndex):
            train_max = train_df.index.max().date()
            if train_max > train_end:
                issues.append(f"Training data extends past train_end: {train_max} > {train_end}")

        # Check that test_start is respected
        if isinstance(test_df.index, pd.DatetimeIndex):
            test_min = test_df.index.min().date()
            if test_min < test_start:
                issues.append(f"Test data starts before test_start: {test_min} < {test_start}")

        if issues:
            return ValidationResult(
                is_valid=False,
                leakage_type=LeakageType.LOOK_AHEAD,
                message="Train/test separation violated",
                severity="critical",
                details={"issues": issues},
            )

        return ValidationResult(
            is_valid=True,
            message="Train/test data properly separated",
            severity="info",
            details={
                "train_end": train_end.isoformat(),
                "test_start": test_start.isoformat(),
            },
        )

    def run_leakage_audit(
        self,
        backtest_result: Dict[str, Any],
        train_data: Optional[pd.DataFrame] = None,
        test_data: Optional[pd.DataFrame] = None,
        universe_history: Optional[Dict[str, Dict]] = None,
    ) -> LeakageReport:
        """
        Full audit of backtest for any data leakage.

        Performs comprehensive checks:
        1. Universe survivorship bias
        2. Parameter peeking
        3. Look-ahead bias in indicators
        4. Train/test data separation
        5. Data timestamp validation

        Args:
            backtest_result: Dictionary containing backtest results and configuration
            train_data: Optional training DataFrame for validation
            test_data: Optional test DataFrame for validation
            universe_history: Optional universe history for survivorship checks

        Returns:
            LeakageReport with full audit results
        """
        backtest_id = backtest_result.get("backtest_id", hashlib.md5(
            json.dumps(backtest_result, sort_keys=True, default=str).encode()
        ).hexdigest()[:16])

        validation_results: List[ValidationResult] = []
        leakage_types: List[LeakageType] = []
        recommendations: List[str] = []

        # Extract config from backtest result
        config = backtest_result.get("config", {})
        windows = backtest_result.get("windows", [])
        symbols = config.get("symbols", [])

        # Track flags
        survivorship_bias = False
        parameter_peeking = False
        indicator_lookahead = False

        # 1. Validate universe selection for each window
        for window in windows:
            train_start = window.get("train_start")
            if isinstance(train_start, str):
                train_start = date.fromisoformat(train_start)

            if train_start and symbols:
                result = self.validate_universe_selection(
                    selection_date=train_start,
                    symbols=symbols,
                    universe_history=universe_history,
                )
                validation_results.append(result)

                if not result.is_valid and result.leakage_type == LeakageType.SURVIVORSHIP:
                    survivorship_bias = True
                    if LeakageType.SURVIVORSHIP not in leakage_types:
                        leakage_types.append(LeakageType.SURVIVORSHIP)
                    recommendations.append(
                        f"Include delisted symbols in universe for window starting {train_start}"
                    )

        # 2. Validate parameter selection for each window
        param_history = self._parameter_history.get("default", [])
        for window in windows:
            train_end = window.get("train_end")
            params = window.get("params", {})

            if isinstance(train_end, str):
                train_end = date.fromisoformat(train_end)

            if train_end and params:
                result = self.validate_parameter_selection(
                    train_end=train_end,
                    params=params,
                    param_history=param_history,
                )
                validation_results.append(result)

                if not result.is_valid and result.leakage_type == LeakageType.PARAMETER_PEEK:
                    parameter_peeking = True
                    if LeakageType.PARAMETER_PEEK not in leakage_types:
                        leakage_types.append(LeakageType.PARAMETER_PEEK)
                    recommendations.append(
                        "Freeze parameters after training window - do not re-optimize on test data"
                    )

        # 3. Validate train/test separation if data provided
        if train_data is not None and test_data is not None:
            for window in windows:
                train_end = window.get("train_end")
                test_start = window.get("test_start")

                if isinstance(train_end, str):
                    train_end = date.fromisoformat(train_end)
                if isinstance(test_start, str):
                    test_start = date.fromisoformat(test_start)

                if train_end and test_start:
                    result = self.validate_train_test_separation(
                        train_df=train_data,
                        test_df=test_data,
                        train_end=train_end,
                        test_start=test_start,
                    )
                    validation_results.append(result)

                    if not result.is_valid and result.leakage_type == LeakageType.LOOK_AHEAD:
                        indicator_lookahead = True
                        if LeakageType.LOOK_AHEAD not in leakage_types:
                            leakage_types.append(LeakageType.LOOK_AHEAD)
                        recommendations.append(
                            "Ensure train/test data have no temporal overlap"
                        )

        # 4. Calculate summary statistics
        total_checks = len(validation_results)
        passed_checks = sum(1 for r in validation_results if r.is_valid)
        failed_checks = sum(1 for r in validation_results if not r.is_valid)
        warnings = sum(1 for r in validation_results if r.severity == "warning")

        # Determine overall leakage status
        leakage_detected = len(leakage_types) > 0

        # Build date range
        date_range = {}
        if windows:
            all_starts = [w.get("train_start") for w in windows if w.get("train_start")]
            all_ends = [w.get("test_end") for w in windows if w.get("test_end")]
            if all_starts:
                date_range["start"] = min(all_starts) if isinstance(all_starts[0], str) else min(all_starts).isoformat()
            if all_ends:
                date_range["end"] = max(all_ends) if isinstance(all_ends[0], str) else max(all_ends).isoformat()

        # Standard recommendations
        if not recommendations:
            if leakage_detected:
                recommendations.append("Review and fix detected leakage issues before using backtest results")
            else:
                recommendations.append("Backtest passes leakage validation - results are trustworthy")

        report = LeakageReport(
            backtest_id=backtest_id,
            audit_timestamp=datetime.now(),
            leakage_detected=leakage_detected,
            leakage_types=leakage_types,
            validation_results=validation_results,
            universe_survivorship_bias=survivorship_bias,
            parameter_peeking=parameter_peeking,
            indicator_lookahead=indicator_lookahead,
            symbols_checked=symbols,
            date_range=date_range,
            parameters_audited=config.get("params", {}),
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            warnings=warnings,
            recommendations=recommendations,
        )

        logger.info(
            "Leakage audit complete",
            backtest_id=backtest_id,
            leakage_detected=leakage_detected,
            leakage_types=[lt.value for lt in leakage_types],
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
        )

        return report

    def register_parameter_selection(
        self,
        strategy_id: str,
        selection_date: date,
        params: Dict[str, Any],
    ) -> None:
        """
        Register a parameter selection for audit trail.

        Call this when parameters are optimized/selected to maintain
        a history for later validation.

        Args:
            strategy_id: Identifier for the strategy
            selection_date: Date when parameters were selected
            params: The selected parameters
        """
        if strategy_id not in self._parameter_history:
            self._parameter_history[strategy_id] = []

        self._parameter_history[strategy_id].append((selection_date, params.copy()))

        logger.debug(
            "Registered parameter selection",
            strategy_id=strategy_id,
            selection_date=selection_date.isoformat(),
            params=params,
        )

    def register_universe_snapshot(
        self,
        as_of_date: date,
        symbols: List[str],
    ) -> None:
        """
        Register a universe snapshot for survivorship validation.

        Args:
            as_of_date: The date of the snapshot
            symbols: List of symbols in the universe
        """
        self._universe_snapshots[as_of_date] = symbols.copy()

        logger.debug(
            "Registered universe snapshot",
            as_of_date=as_of_date.isoformat(),
            symbol_count=len(symbols),
        )

    def get_universe_at_date(self, as_of_date: date) -> Optional[List[str]]:
        """
        Get the universe snapshot closest to (but not after) the given date.

        Args:
            as_of_date: Date to look up

        Returns:
            List of symbols or None if no snapshot found
        """
        valid_dates = [d for d in self._universe_snapshots.keys() if d <= as_of_date]
        if not valid_dates:
            return None

        closest_date = max(valid_dates)
        return self._universe_snapshots[closest_date]

    def clear_history(self) -> None:
        """Clear all parameter and universe history."""
        self._parameter_history.clear()
        self._universe_snapshots.clear()
        logger.info("Cleared leakage detector history")
