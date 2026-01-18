"""
Data Quality Validators Module

Provides individual quality checks and a unified DataQualityGate for OHLCV data.

Checks:
    - check_missing_candles: Detect gaps in trading days
    - check_zero_volume: Find bars with volume=0 on trading days
    - check_stale_data: Verify data freshness
    - check_outlier_returns: Detect abnormal price moves without splits
    - check_split_adjustment: Detect unadjusted split data

Usage:
    from quality.validators import DataQualityGate

    gate = DataQualityGate(market="US")
    report = gate.validate(bars, symbol="AAPL")
"""

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Set, Tuple
import statistics
import structlog

from quality.report import (
    DataQualityReport,
    DataQualityStatus,
    QualityIssue,
    IssueSeverity,
)
from quality.calendar import get_expected_trading_days, get_calendar_for_market

logger = structlog.get_logger(__name__)


def check_missing_candles(
    bars: List,
    expected_dates: List[date],
    symbol: str,
) -> Optional[QualityIssue]:
    """
    Check for gaps in trading days.

    Compares actual bar dates against expected trading days from the calendar.
    Missing days indicate data gaps that could affect strategy calculations.

    Args:
        bars: List of OHLCV bar objects with 'time' attribute
        expected_dates: List of expected trading dates from calendar
        symbol: Symbol being checked (for logging)

    Returns:
        QualityIssue if missing candles found, None otherwise
    """
    if not bars or not expected_dates:
        return None

    # Extract actual dates from bars
    actual_dates = set()
    for bar in bars:
        bar_date = bar.time.date() if isinstance(bar.time, datetime) else bar.time
        actual_dates.add(bar_date)

    expected_set = set(expected_dates)

    # Find missing dates
    missing_dates = expected_set - actual_dates

    if not missing_dates:
        return None

    # Calculate missing percentage
    missing_pct = len(missing_dates) / len(expected_set) * 100

    # Determine severity based on percentage and count
    if missing_pct > 10 or len(missing_dates) > 10:
        severity = IssueSeverity.ERROR
    elif missing_pct > 5 or len(missing_dates) > 5:
        severity = IssueSeverity.WARNING
    else:
        severity = IssueSeverity.INFO

    # Find consecutive gaps (more concerning than scattered missing days)
    sorted_missing = sorted(missing_dates)
    consecutive_gaps = _find_consecutive_gaps(sorted_missing)

    logger.warning(
        "Missing candles detected",
        symbol=symbol,
        missing_count=len(missing_dates),
        missing_pct=round(missing_pct, 2),
        consecutive_gaps=len(consecutive_gaps),
    )

    return QualityIssue(
        check_name="missing_candles",
        severity=severity,
        message=f"Missing {len(missing_dates)} of {len(expected_set)} expected trading days ({missing_pct:.1f}%)",
        affected_rows=len(missing_dates),
        affected_dates=sorted_missing[:20],  # Limit to first 20
        details={
            "missing_count": len(missing_dates),
            "expected_count": len(expected_set),
            "missing_pct": round(missing_pct, 2),
            "consecutive_gaps": len(consecutive_gaps),
            "largest_gap_days": max(consecutive_gaps) if consecutive_gaps else 0,
        },
    )


def _find_consecutive_gaps(dates: List[date]) -> List[int]:
    """Find lengths of consecutive date gaps."""
    if not dates:
        return []

    gaps = []
    current_gap = 1

    for i in range(1, len(dates)):
        if dates[i] - dates[i - 1] == timedelta(days=1):
            current_gap += 1
        else:
            if current_gap > 1:
                gaps.append(current_gap)
            current_gap = 1

    if current_gap > 1:
        gaps.append(current_gap)

    return gaps


def check_zero_volume(
    bars: List,
    market: str,
    symbol: str,
) -> Optional[QualityIssue]:
    """
    Check for bars with zero volume on trading days.

    Zero volume on a trading day typically indicates bad data.
    Exception: Some illiquid stocks may have legitimate zero volume days.

    Args:
        bars: List of OHLCV bar objects
        market: Market identifier for calendar lookup
        symbol: Symbol being checked

    Returns:
        QualityIssue if zero volume bars found, None otherwise
    """
    if not bars:
        return None

    calendar = get_calendar_for_market(market)
    zero_volume_dates = []

    for bar in bars:
        bar_date = bar.time.date() if isinstance(bar.time, datetime) else bar.time

        # Only flag zero volume on trading days
        if calendar.is_trading_day(bar_date) and bar.volume == 0:
            zero_volume_dates.append(bar_date)

    if not zero_volume_dates:
        return None

    # Calculate percentage
    zero_pct = len(zero_volume_dates) / len(bars) * 100

    # Determine severity
    if zero_pct > 20:
        severity = IssueSeverity.ERROR
    elif zero_pct > 5:
        severity = IssueSeverity.WARNING
    else:
        severity = IssueSeverity.INFO

    logger.warning(
        "Zero volume bars detected",
        symbol=symbol,
        count=len(zero_volume_dates),
        pct=round(zero_pct, 2),
    )

    return QualityIssue(
        check_name="zero_volume",
        severity=severity,
        message=f"{len(zero_volume_dates)} bars with zero volume ({zero_pct:.1f}%)",
        affected_rows=len(zero_volume_dates),
        affected_dates=sorted(zero_volume_dates)[:20],
        details={
            "zero_volume_count": len(zero_volume_dates),
            "total_bars": len(bars),
            "zero_pct": round(zero_pct, 2),
        },
    )


def check_stale_data(
    bars: List,
    max_age_hours: int = 24,
    symbol: str = "",
) -> Optional[QualityIssue]:
    """
    Check if the most recent data is too old.

    Stale data could lead to signals based on outdated information.
    Default threshold is 24 hours from the last bar.

    Args:
        bars: List of OHLCV bar objects
        max_age_hours: Maximum acceptable age in hours
        symbol: Symbol being checked

    Returns:
        QualityIssue if data is stale, None otherwise
    """
    if not bars:
        return QualityIssue(
            check_name="stale_data",
            severity=IssueSeverity.CRITICAL,
            message="No data available - cannot generate signals",
            details={"reason": "empty_dataset"},
        )

    # Get most recent bar
    latest_bar = max(bars, key=lambda b: b.time)
    latest_time = latest_bar.time if isinstance(latest_bar.time, datetime) else datetime.combine(latest_bar.time, datetime.min.time())

    # Calculate age - ensure both datetimes have consistent timezone handling
    now = datetime.now(timezone.utc)
    # Make latest_time timezone-aware if it isn't
    if latest_time.tzinfo is None:
        latest_time = latest_time.replace(tzinfo=timezone.utc)
    age = now - latest_time
    age_hours = age.total_seconds() / 3600

    # Account for weekends (Friday to Monday = ~72 hours)
    # Don't flag as stale if we're just past a weekend
    if latest_time.weekday() == 4 and age_hours < 96:  # Friday, allow up to Monday EOD
        return None

    if age_hours <= max_age_hours:
        return None

    # Determine severity
    if age_hours > max_age_hours * 7:  # Week old
        severity = IssueSeverity.CRITICAL
    elif age_hours > max_age_hours * 3:  # 3 days old
        severity = IssueSeverity.ERROR
    else:
        severity = IssueSeverity.WARNING

    logger.warning(
        "Stale data detected",
        symbol=symbol,
        latest_bar=latest_time.isoformat(),
        age_hours=round(age_hours, 1),
        max_age_hours=max_age_hours,
    )

    return QualityIssue(
        check_name="stale_data",
        severity=severity,
        message=f"Data is {age_hours:.1f} hours old (max: {max_age_hours}h)",
        affected_rows=1,
        affected_dates=[latest_time.date()],
        details={
            "latest_bar_time": latest_time.isoformat(),
            "age_hours": round(age_hours, 1),
            "max_age_hours": max_age_hours,
        },
    )


def check_outlier_returns(
    bars: List,
    threshold: float = 0.20,
    symbol: str = "",
) -> Optional[QualityIssue]:
    """
    Check for abnormal single-day returns (>20% by default).

    Large moves without corresponding split/dividend adjustments may indicate
    bad data. However, legitimate large moves do occur (earnings, M&A, etc.).

    Args:
        bars: List of OHLCV bar objects
        threshold: Maximum expected single-day return (0.20 = 20%)
        symbol: Symbol being checked

    Returns:
        QualityIssue if outliers found, None otherwise
    """
    if len(bars) < 2:
        return None

    # Sort bars by time
    sorted_bars = sorted(bars, key=lambda b: b.time)

    outlier_dates = []
    returns = []

    for i in range(1, len(sorted_bars)):
        prev_close = sorted_bars[i - 1].close
        curr_close = sorted_bars[i].close

        if prev_close == 0:
            continue

        daily_return = (curr_close - prev_close) / prev_close
        returns.append(abs(daily_return))

        if abs(daily_return) > threshold:
            bar_date = sorted_bars[i].time.date() if isinstance(sorted_bars[i].time, datetime) else sorted_bars[i].time
            outlier_dates.append(bar_date)

    if not outlier_dates:
        return None

    # Calculate how unusual these outliers are
    if returns:
        mean_return = statistics.mean(returns)
        std_return = statistics.stdev(returns) if len(returns) > 1 else 0

    # Determine severity based on outlier count
    if len(outlier_dates) > 5:
        severity = IssueSeverity.ERROR
    elif len(outlier_dates) > 2:
        severity = IssueSeverity.WARNING
    else:
        severity = IssueSeverity.INFO  # Single outliers may be legitimate

    logger.warning(
        "Outlier returns detected",
        symbol=symbol,
        count=len(outlier_dates),
        threshold=threshold,
    )

    return QualityIssue(
        check_name="outlier_returns",
        severity=severity,
        message=f"{len(outlier_dates)} days with returns exceeding {threshold*100:.0f}%",
        affected_rows=len(outlier_dates),
        affected_dates=sorted(outlier_dates),
        details={
            "outlier_count": len(outlier_dates),
            "threshold_pct": threshold * 100,
            "mean_daily_return_pct": round(mean_return * 100, 2) if returns else 0,
            "std_daily_return_pct": round(std_return * 100, 2) if returns else 0,
        },
    )


def check_split_adjustment(
    bars: List,
    symbol: str = "",
) -> Optional[QualityIssue]:
    """
    Detect potentially unadjusted stock split data.

    Signs of unadjusted split data:
    - Sudden ~50% price drop with ~2x volume increase (2:1 split)
    - Sudden ~66% price drop (3:1 split)
    - Close differs significantly from adjusted close

    Args:
        bars: List of OHLCV bar objects with optional adjusted_close
        symbol: Symbol being checked

    Returns:
        QualityIssue if unadjusted splits detected, None otherwise
    """
    if len(bars) < 2:
        return None

    # Sort bars by time
    sorted_bars = sorted(bars, key=lambda b: b.time)

    # Common split ratios and their expected price changes
    split_patterns = [
        (0.45, 0.55, "2:1"),   # 50% drop for 2:1 split
        (0.30, 0.36, "3:1"),   # ~33% drop for 3:1 split
        (0.23, 0.27, "4:1"),   # 25% drop for 4:1 split
    ]

    suspect_dates = []
    split_details = []

    for i in range(1, len(sorted_bars)):
        prev_bar = sorted_bars[i - 1]
        curr_bar = sorted_bars[i]

        if prev_bar.close == 0:
            continue

        price_ratio = curr_bar.close / prev_bar.close

        # Check for split-like patterns
        for low, high, split_type in split_patterns:
            if low <= price_ratio <= high:
                # Additional check: volume should spike on split day
                volume_ratio = curr_bar.volume / prev_bar.volume if prev_bar.volume > 0 else 1

                # If close differs from adjusted close, likely unadjusted
                has_adj_close = hasattr(curr_bar, 'adjusted_close') and curr_bar.adjusted_close is not None
                adj_close_diff = 0
                if has_adj_close and curr_bar.adjusted_close > 0:
                    adj_close_diff = abs(curr_bar.close - curr_bar.adjusted_close) / curr_bar.adjusted_close

                bar_date = curr_bar.time.date() if isinstance(curr_bar.time, datetime) else curr_bar.time
                suspect_dates.append(bar_date)
                split_details.append({
                    "date": bar_date.isoformat(),
                    "suspected_split": split_type,
                    "price_ratio": round(price_ratio, 4),
                    "volume_ratio": round(volume_ratio, 2),
                    "adj_close_diff_pct": round(adj_close_diff * 100, 2),
                })

    if not suspect_dates:
        return None

    # Severity based on whether we have adjusted close data
    # If adjusted close is available and differs significantly, it's more serious
    severity = IssueSeverity.WARNING

    for detail in split_details:
        if detail["adj_close_diff_pct"] > 1:  # >1% difference
            severity = IssueSeverity.ERROR
            break

    logger.warning(
        "Potential unadjusted splits detected",
        symbol=symbol,
        count=len(suspect_dates),
    )

    return QualityIssue(
        check_name="split_adjustment",
        severity=severity,
        message=f"{len(suspect_dates)} potential unadjusted splits detected",
        affected_rows=len(suspect_dates),
        affected_dates=sorted(suspect_dates),
        details={
            "suspect_count": len(suspect_dates),
            "splits": split_details[:10],  # Limit to 10
        },
    )


class DataQualityGate:
    """
    Unified data quality gate that runs all validators.

    Usage:
        gate = DataQualityGate(market="US")
        report = gate.validate(bars, symbol="AAPL")

        if not report.tradeable:
            # Block signal generation
            pass
    """

    def __init__(
        self,
        market: str = "US",
        max_stale_hours: int = 24,
        outlier_threshold: float = 0.20,
    ):
        """
        Initialize the quality gate.

        Args:
            market: Market identifier for calendar
            max_stale_hours: Maximum data age in hours
            outlier_threshold: Maximum expected single-day return
        """
        self.market = market
        self.max_stale_hours = max_stale_hours
        self.outlier_threshold = outlier_threshold

    def validate(
        self,
        bars: List,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DataQualityReport:
        """
        Run all quality checks on the OHLCV data.

        Args:
            bars: List of OHLCV bar objects
            symbol: Symbol being checked
            start_date: Expected start of data range
            end_date: Expected end of data range

        Returns:
            DataQualityReport with results of all checks
        """
        logger.info(
            "Running data quality validation",
            symbol=symbol,
            market=self.market,
            bar_count=len(bars) if bars else 0,
        )

        # Initialize report
        report = DataQualityReport(
            symbol=symbol,
            market=self.market,
            status=DataQualityStatus.PASS,
            candle_count=len(bars) if bars else 0,
        )

        # Set date range
        if bars:
            sorted_bars = sorted(bars, key=lambda b: b.time)
            first_date = sorted_bars[0].time.date() if isinstance(sorted_bars[0].time, datetime) else sorted_bars[0].time
            last_date = sorted_bars[-1].time.date() if isinstance(sorted_bars[-1].time, datetime) else sorted_bars[-1].time
            report.date_range_start = start_date or first_date
            report.date_range_end = end_date or last_date

        checks_performed = []

        # 1. Check for missing candles
        checks_performed.append("missing_candles")
        if bars and report.date_range_start and report.date_range_end:
            expected_dates = get_expected_trading_days(
                self.market,
                report.date_range_start,
                report.date_range_end,
            )
            issue = check_missing_candles(bars, expected_dates, symbol)
            if issue:
                report.add_issue(issue)

        # 2. Check for zero volume
        checks_performed.append("zero_volume")
        if bars:
            issue = check_zero_volume(bars, self.market, symbol)
            if issue:
                report.add_issue(issue)

        # 3. Check for stale data
        checks_performed.append("stale_data")
        issue = check_stale_data(bars, self.max_stale_hours, symbol)
        if issue:
            report.add_issue(issue)

        # 4. Check for outlier returns
        checks_performed.append("outlier_returns")
        if bars:
            issue = check_outlier_returns(bars, self.outlier_threshold, symbol)
            if issue:
                report.add_issue(issue)

        # 5. Check for split adjustment
        checks_performed.append("split_adjustment")
        if bars:
            issue = check_split_adjustment(bars, symbol)
            if issue:
                report.add_issue(issue)

        report.checks_performed = checks_performed

        logger.info(
            "Data quality validation complete",
            symbol=symbol,
            status=report.status.value,
            tradeable=report.tradeable,
            issue_count=len(report.issues),
        )

        return report
