"""Statistics and quota tracking for pipeline runs."""
import time
from collections import defaultdict
from typing import Dict, Any, Optional
from datetime import datetime


class PipelineStats:
    """Track statistics and quota usage during pipeline execution."""

    def __init__(self):
        self.start_time = time.time()
        self.keywords_processed = 0
        self.keywords_deduplicated = 0
        self.api_calls = defaultdict(int)
        self.retries = defaultdict(int)
        self.errors = defaultdict(int)
        self.backoff_time = 0.0
        self.rate_limit_delays = 0.0
        self.quota_consumed = defaultdict(int)
        self.stage_times = {}
        self.current_stage = None
        self.stage_start = None

    def start_stage(self, stage_name: str):
        """Mark the start of a pipeline stage."""
        if self.current_stage and self.stage_start:
            # Record previous stage time
            elapsed = time.time() - self.stage_start
            self.stage_times[self.current_stage] = elapsed

        self.current_stage = stage_name
        self.stage_start = time.time()

    def end_stage(self):
        """Mark the end of current stage."""
        if self.current_stage and self.stage_start:
            elapsed = time.time() - self.stage_start
            self.stage_times[self.current_stage] = elapsed
            self.current_stage = None
            self.stage_start = None

    def record_api_call(self, provider: str, quota_cost: int = 1):
        """Record an API call and quota consumption."""
        self.api_calls[provider] += 1
        self.quota_consumed[provider] += quota_cost

    def record_retry(self, provider: str):
        """Record a retry attempt."""
        self.retries[provider] += 1

    def record_error(self, error_type: str):
        """Record an error by type."""
        self.errors[error_type] += 1

    def record_backoff(self, duration: float):
        """Record time spent in exponential backoff."""
        self.backoff_time += duration

    def record_rate_limit_delay(self, duration: float):
        """Record time spent waiting for rate limit."""
        self.rate_limit_delays += duration

    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive statistics summary."""
        total_duration = time.time() - self.start_time

        return {
            'duration_seconds': round(total_duration, 2),
            'duration_formatted': self._format_duration(total_duration),
            'keywords_processed': self.keywords_processed,
            'keywords_deduplicated': self.keywords_deduplicated,
            'keywords_unique': self.keywords_processed - self.keywords_deduplicated,
            'api_calls': dict(self.api_calls),
            'total_api_calls': sum(self.api_calls.values()),
            'quota_consumed': dict(self.quota_consumed),
            'total_quota_consumed': sum(self.quota_consumed.values()),
            'retries': dict(self.retries),
            'total_retries': sum(self.retries.values()),
            'errors': dict(self.errors),
            'total_errors': sum(self.errors.values()),
            'rate_limit_delays_seconds': round(self.rate_limit_delays, 2),
            'backoff_time_seconds': round(self.backoff_time, 2),
            'stage_times': {k: round(v, 2) for k, v in self.stage_times.items()},
            'average_api_latency': self._calculate_avg_latency(total_duration)
        }

    def _format_duration(self, seconds: float) -> str:
        """Format duration as human-readable string."""
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            remaining_seconds = int(seconds % 60)
            return f"{minutes}m {remaining_seconds}s"
        else:
            hours = int(seconds / 3600)
            remaining_minutes = int((seconds % 3600) / 60)
            return f"{hours}h {remaining_minutes}m"

    def _calculate_avg_latency(self, total_duration: float) -> Optional[float]:
        """Calculate average API call latency."""
        total_calls = sum(self.api_calls.values())
        if total_calls == 0:
            return None

        # Subtract rate limit and backoff time from total
        active_time = total_duration - self.rate_limit_delays - self.backoff_time
        return round(active_time / total_calls, 3)

    def print_summary(self, quota_limits: Optional[Dict[str, int]] = None):
        """Print formatted summary to console."""
        summary = self.get_summary()

        print("\n" + "=" * 80)
        print("📊 PIPELINE EXECUTION SUMMARY")
        print("=" * 80)

        # Duration
        print(f"\n⏱️  Duration: {summary['duration_formatted']}")

        # Keywords
        print(f"\n📝 Keywords:")
        print(f"   Processed:      {summary['keywords_processed']}")
        if summary['keywords_deduplicated'] > 0:
            print(f"   Deduplicated:   {summary['keywords_deduplicated']}")
        print(f"   Unique:         {summary['keywords_unique']}")

        # API Calls
        if summary['total_api_calls'] > 0:
            print(f"\n🔌 API Calls:")
            for provider, count in sorted(summary['api_calls'].items()):
                print(f"   {provider:15s} {count:6d} calls")
            print(f"   {'TOTAL':15s} {summary['total_api_calls']:6d} calls")

        # Quota Usage
        if summary['total_quota_consumed'] > 0:
            print(f"\n💰 Quota Consumed:")
            for provider, consumed in sorted(summary['quota_consumed'].items()):
                remaining_str = ""
                if quota_limits and provider in quota_limits:
                    limit = quota_limits[provider]
                    remaining = limit - consumed
                    percent = (consumed / limit) * 100
                    remaining_str = f"({consumed}/{limit} = {percent:.1f}%, {remaining} remaining)"
                else:
                    remaining_str = "(unlimited)"

                print(f"   {provider:15s} {consumed:6d} {remaining_str}")

        # Rate Limiting
        if summary['rate_limit_delays_seconds'] > 0 or summary['backoff_time_seconds'] > 0:
            print(f"\n⏸️  Delays:")
            if summary['rate_limit_delays_seconds'] > 0:
                print(f"   Rate limiting:  {summary['rate_limit_delays_seconds']:.1f}s")
            if summary['backoff_time_seconds'] > 0:
                print(f"   Backoff:        {summary['backoff_time_seconds']:.1f}s")

        # Retries
        if summary['total_retries'] > 0:
            print(f"\n🔄 Retries:")
            for provider, count in sorted(summary['retries'].items()):
                print(f"   {provider:15s} {count} retries")

        # Errors
        if summary['total_errors'] > 0:
            print(f"\n❌ Errors:")
            for error_type, count in sorted(summary['errors'].items()):
                print(f"   {error_type:20s} {count}")

        # Performance
        if summary['stage_times']:
            print(f"\n⚡ Stage Performance:")
            for stage, duration in summary['stage_times'].items():
                print(f"   {stage:25s} {duration:6.2f}s")

        if summary['average_api_latency']:
            print(f"\n📈 Average API Latency: {summary['average_api_latency']}s per call")

        print("\n" + "=" * 80)


class QuotaTracker:
    """Track and enforce quota limits per provider."""

    def __init__(self, limits: Optional[Dict[str, int]] = None):
        """
        Initialize quota tracker.

        Args:
            limits: Dictionary of provider name -> max requests per run
                   None means unlimited
        """
        self.limits = limits or {}
        self.consumed = defaultdict(int)

    def can_make_request(self, provider: str, cost: int = 1) -> bool:
        """Check if request can be made without exceeding quota."""
        if provider not in self.limits:
            return True  # Unlimited

        return (self.consumed[provider] + cost) <= self.limits[provider]

    def consume(self, provider: str, cost: int = 1):
        """Record quota consumption."""
        self.consumed[provider] += cost

    def get_remaining(self, provider: str) -> Optional[int]:
        """Get remaining quota for provider."""
        if provider not in self.limits:
            return None  # Unlimited

        return max(0, self.limits[provider] - self.consumed[provider])

    def get_usage_percent(self, provider: str) -> Optional[float]:
        """Get quota usage percentage."""
        if provider not in self.limits:
            return None  # Unlimited

        return (self.consumed[provider] / self.limits[provider]) * 100

    def is_near_limit(self, provider: str, threshold: float = 0.9) -> bool:
        """Check if usage is near the limit (default 90%)."""
        percent = self.get_usage_percent(provider)
        if percent is None:
            return False

        return percent >= (threshold * 100)
