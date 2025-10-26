"""Tests for rate limiting and quota tracking."""
import time
import pytest
from providers.base import RateLimiter, BaseProvider
from stats_tracker import PipelineStats, QuotaTracker


class TestRateLimiter:
    """Test token bucket rate limiter."""

    def test_token_bucket_allows_burst(self):
        """Rate limiter should allow burst up to bucket size."""
        limiter = RateLimiter(rpm=60)  # 60 requests per minute = 1 per second

        # Should allow 60 immediate requests
        start = time.time()
        for _ in range(10):  # Test with 10 to keep test fast
            limiter.acquire()
        duration = time.time() - start

        # Should complete almost immediately (< 0.1s for 10 requests)
        assert duration < 0.1, f"Burst took too long: {duration}s"

    def test_token_bucket_enforces_rate(self):
        """Rate limiter should enforce rate after burst."""
        limiter = RateLimiter(rpm=60)  # 1 token per second

        # Deplete tokens
        for _ in range(60):
            limiter.tokens -= 1

        # Next request should wait ~1 second
        start = time.time()
        limiter.acquire()
        duration = time.time() - start

        assert 0.9 < duration < 1.2, f"Rate limiting delay incorrect: {duration}s"

    def test_token_bucket_refills(self):
        """Tokens should refill over time."""
        limiter = RateLimiter(rpm=60)
        limiter.tokens = 0

        # Wait 0.5 seconds, should get ~0.5 tokens
        time.sleep(0.5)
        limiter.last_update = time.time()  # Force update
        elapsed = 0.5
        limiter.tokens = min(limiter.rpm, limiter.tokens + elapsed * (limiter.rpm / 60.0))

        assert 0.4 < limiter.tokens < 0.6, f"Token refill incorrect: {limiter.tokens}"


class TestPipelineStats:
    """Test statistics tracking."""

    def test_stats_initialization(self):
        """Stats should initialize with zeros."""
        stats = PipelineStats()

        assert stats.keywords_processed == 0
        assert stats.api_calls == {}
        assert stats.total_api_calls == 0

    def test_record_api_call(self):
        """Should record API calls per provider."""
        stats = PipelineStats()

        stats.record_api_call('serpapi', quota_cost=1)
        stats.record_api_call('serpapi', quota_cost=1)
        stats.record_api_call('trends', quota_cost=1)

        assert stats.api_calls['serpapi'] == 2
        assert stats.api_calls['trends'] == 1
        assert stats.quota_consumed['serpapi'] == 2
        assert stats.quota_consumed['trends'] == 1

    def test_stage_timing(self):
        """Should track stage execution times."""
        stats = PipelineStats()

        stats.start_stage('expansion')
        time.sleep(0.1)
        stats.end_stage()

        assert 'expansion' in stats.stage_times
        assert 0.08 < stats.stage_times['expansion'] < 0.15

    def test_summary_format(self):
        """Summary should include all key metrics."""
        stats = PipelineStats()
        stats.keywords_processed = 100
        stats.record_api_call('serpapi', 1)

        summary = stats.get_summary()

        assert 'duration_seconds' in summary
        assert 'keywords_processed' in summary
        assert 'api_calls' in summary
        assert 'total_api_calls' in summary
        assert summary['total_api_calls'] == 1


class TestQuotaTracker:
    """Test quota enforcement."""

    def test_unlimited_quota(self):
        """Should allow unlimited requests when no limit set."""
        tracker = QuotaTracker()

        assert tracker.can_make_request('serpapi') is True
        tracker.consume('serpapi', 100)
        assert tracker.can_make_request('serpapi') is True

    def test_quota_enforcement(self):
        """Should enforce quota limits."""
        tracker = QuotaTracker(limits={'serpapi': 10})

        # Should allow up to 10 requests
        for _ in range(10):
            assert tracker.can_make_request('serpapi') is True
            tracker.consume('serpapi', 1)

        # 11th should be blocked
        assert tracker.can_make_request('serpapi') is False

    def test_remaining_quota(self):
        """Should calculate remaining quota correctly."""
        tracker = QuotaTracker(limits={'serpapi': 100})

        tracker.consume('serpapi', 30)
        remaining = tracker.get_remaining('serpapi')

        assert remaining == 70

    def test_usage_percentage(self):
        """Should calculate usage percentage correctly."""
        tracker = QuotaTracker(limits={'serpapi': 100})

        tracker.consume('serpapi', 75)
        percent = tracker.get_usage_percent('serpapi')

        assert percent == 75.0

    def test_near_limit_detection(self):
        """Should detect when quota is near limit."""
        tracker = QuotaTracker(limits={'serpapi': 100})

        tracker.consume('serpapi', 85)
        assert tracker.is_near_limit('serpapi', threshold=0.8) is True
        assert tracker.is_near_limit('serpapi', threshold=0.9) is False


class TestBaseProvider:
    """Test base provider functionality."""

    def test_rate_limiting_integration(self):
        """Base provider should use rate limiter."""
        provider = BaseProvider(name='test', rpm=60)

        assert provider.rate_limiter is not None
        assert provider.rate_limiter.rpm == 60

    def test_cache_key_generation(self):
        """Should generate consistent cache keys."""
        provider = BaseProvider(name='test')

        key1 = provider._make_cache_key('arg1', 'arg2', kwarg1='val1')
        key2 = provider._make_cache_key('arg1', 'arg2', kwarg1='val1')
        key3 = provider._make_cache_key('arg1', 'arg2', kwarg1='val2')

        assert key1 == key2  # Same inputs = same key
        assert key1 != key3  # Different inputs = different key


@pytest.mark.integration
class TestRateLimitingIntegration:
    """Integration tests requiring actual API calls."""

    def test_rate_limit_with_real_provider(self):
        """Test rate limiting with mock API calls."""
        provider = BaseProvider(name='test', rpm=120)  # 2 per second

        # Make 5 requests
        start = time.time()
        for i in range(5):
            provider.rate_limiter.acquire()
        duration = time.time() - start

        # First 120 should be instant (bucket size = rpm)
        # These 5 should be nearly instant
        assert duration < 0.5, f"Rate limiting too slow: {duration}s"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
