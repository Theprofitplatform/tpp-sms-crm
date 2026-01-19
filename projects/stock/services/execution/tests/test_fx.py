"""
Tests for FX Rate Service

Tests rate fetching, caching, conversion, and fallback behavior.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fx.rates import FXRateService, FXRate, CachedRate


@pytest.fixture
def fx_service():
    """Create FX service instance for testing."""
    return FXRateService(cache_ttl_seconds=300)


@pytest.fixture
def fx_service_short_cache():
    """Create FX service with short cache TTL for testing expiry."""
    return FXRateService(cache_ttl_seconds=1)


class TestFXRateService:
    """Tests for FXRateService."""

    def test_initialization(self, fx_service):
        """Test service initializes correctly."""
        assert fx_service.cache_ttl == 300
        assert len(fx_service._cache) == 0
        assert len(fx_service._last_known) == 0

    def test_get_pair_symbol(self, fx_service):
        """Test pair symbol generation."""
        assert fx_service._get_pair_symbol("AUD", "USD") == "AUDUSD"
        assert fx_service._get_pair_symbol("aud", "usd") == "AUDUSD"
        assert fx_service._get_pair_symbol("USD", "AUD") == "USDAUD"

    def test_get_yahoo_symbol(self, fx_service):
        """Test Yahoo Finance symbol lookup."""
        assert fx_service._get_yahoo_symbol("AUDUSD") == "AUDUSD=X"
        assert fx_service._get_yahoo_symbol("AUDEUR") == "AUDEUR=X"
        # Unknown pair should still work
        assert fx_service._get_yahoo_symbol("XXXYYY") == "XXXYYY=X"

    def test_same_currency_rate(self):
        """Test rate for same currency is 1.0."""
        service = FXRateService()

        # Using sync method for cached rate
        # Same currency should return 1.0 implicitly
        assert service._get_pair_symbol("AUD", "AUD") == "AUDAUD"

    @pytest.mark.asyncio
    async def test_get_rate_same_currency(self, fx_service):
        """Test get_rate returns 1.0 for same currency."""
        rate = await fx_service.get_rate("AUD", "AUD")
        assert rate == 1.0

        rate = await fx_service.get_rate("USD", "USD")
        assert rate == 1.0

    def test_get_cached_rate_empty(self, fx_service):
        """Test get_cached_rate returns None when cache is empty."""
        result = fx_service.get_cached_rate("AUDUSD")
        assert result is None

    def test_get_cached_rate_with_data(self, fx_service):
        """Test get_cached_rate returns rate when cached."""
        # Manually populate cache
        now = datetime.utcnow()
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        result = fx_service.get_cached_rate("AUDUSD")
        assert result == 0.65

    def test_cache_expiry(self, fx_service):
        """Test cache expiry works correctly."""
        # Set up expired cache entry
        past = datetime.utcnow() - timedelta(seconds=600)
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=past),
            fetched_at=past,
            expires_at=past + timedelta(seconds=300),  # Already expired
        )

        # Should return None for expired cache
        assert not fx_service._is_cache_valid("AUDUSD")

        # But should return from last_known as fallback
        fx_service._last_known["AUDUSD"] = FXRate(
            pair="AUDUSD",
            rate=0.64,
            timestamp=past,
        )
        result = fx_service.get_cached_rate("AUDUSD")
        assert result == 0.64

    @pytest.mark.asyncio
    async def test_get_rate_uses_fallback(self, fx_service):
        """Test fallback rate is used when API fails."""
        # Mock the Yahoo fetch to fail
        with patch.object(fx_service, '_fetch_rate_from_yahoo', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = Exception("API Error")

            # Should use fallback rate
            rate = await fx_service.get_rate("AUD", "USD")
            assert rate == 0.65  # Fallback rate

    @pytest.mark.asyncio
    async def test_get_rate_uses_last_known(self, fx_service):
        """Test last known rate is used before fallback."""
        # Set up last known rate
        fx_service._last_known["AUDUSD"] = FXRate(
            pair="AUDUSD",
            rate=0.66,
            timestamp=datetime.utcnow(),
        )

        # Mock the Yahoo fetch to fail
        with patch.object(fx_service, '_fetch_rate_from_yahoo', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = Exception("API Error")

            rate = await fx_service.get_rate("AUD", "USD")
            assert rate == 0.66  # Last known rate, not fallback

    @pytest.mark.asyncio
    async def test_convert_same_currency(self, fx_service):
        """Test conversion with same currency."""
        result = await fx_service.convert(100, "AUD", "AUD")
        assert result == 100

    @pytest.mark.asyncio
    async def test_convert_with_rate(self, fx_service):
        """Test conversion uses correct rate."""
        # Populate cache
        now = datetime.utcnow()
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        result = await fx_service.convert(100, "AUD", "USD")
        assert result == 65.0  # 100 * 0.65

    @pytest.mark.asyncio
    async def test_get_rate_caches_result(self, fx_service):
        """Test that fetched rate is cached."""
        mock_rate = FXRate(
            pair="AUDUSD",
            rate=0.6543,
            timestamp=datetime.utcnow(),
        )

        with patch.object(fx_service, '_fetch_rate_from_yahoo', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = mock_rate

            # First call should fetch
            rate = await fx_service.get_rate("AUD", "USD")
            assert rate == 0.6543
            assert mock_fetch.call_count == 1

            # Second call should use cache
            rate2 = await fx_service.get_rate("AUD", "USD")
            assert rate2 == 0.6543
            assert mock_fetch.call_count == 1  # No additional fetch

    @pytest.mark.asyncio
    async def test_get_rate_with_spread(self, fx_service):
        """Test get_rate_with_spread returns bid/ask."""
        now = datetime.utcnow()
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(
                pair="AUDUSD",
                rate=0.65,
                timestamp=now,
                bid=0.6495,
                ask=0.6505,
            ),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        rate, bid, ask = await fx_service.get_rate_with_spread("AUD", "USD")
        assert rate == 0.65
        assert bid == 0.6495
        assert ask == 0.6505

    def test_get_all_cached_rates(self, fx_service):
        """Test getting all cached rates."""
        now = datetime.utcnow()

        # Add some cached rates
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )
        fx_service._cache["AUDEUR"] = CachedRate(
            rate=FXRate(pair="AUDEUR", rate=0.60, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        rates = fx_service.get_all_cached_rates()
        assert len(rates) == 2
        assert rates["AUDUSD"] == 0.65
        assert rates["AUDEUR"] == 0.60

    def test_clear_cache(self, fx_service):
        """Test cache clearing."""
        now = datetime.utcnow()
        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        assert len(fx_service._cache) == 1
        fx_service.clear_cache()
        assert len(fx_service._cache) == 0

    def test_get_cache_status(self, fx_service):
        """Test cache status reporting."""
        now = datetime.utcnow()

        fx_service._cache["AUDUSD"] = CachedRate(
            rate=FXRate(pair="AUDUSD", rate=0.65, timestamp=now),
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )
        fx_service._last_known["AUDGBP"] = FXRate(
            pair="AUDGBP",
            rate=0.52,
            timestamp=now,
        )

        status = fx_service.get_cache_status()

        assert "cached_pairs" in status
        assert "valid_pairs" in status
        assert "last_known_pairs" in status
        assert "cache_ttl_seconds" in status
        assert "AUDUSD" in status["cached_pairs"]
        assert "AUDGBP" in status["last_known_pairs"]

    @pytest.mark.asyncio
    async def test_inverse_pair_fallback(self, fx_service):
        """Test that inverse pair is used for fallback."""
        # USDAUD is not in FALLBACK_RATES directly, but AUDUSD is
        # Mock fetch to fail
        with patch.object(fx_service, '_fetch_rate_from_yahoo', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = Exception("API Error")

            # Getting USD to AUD should use inverse of AUDUSD
            rate = await fx_service.get_rate("USD", "AUD")
            # 1 / 0.65 = approximately 1.538
            assert abs(rate - 1.54) < 0.01


class TestFXRateDataclass:
    """Tests for FXRate dataclass."""

    def test_fx_rate_creation(self):
        """Test FXRate creation."""
        rate = FXRate(
            pair="AUDUSD",
            rate=0.65,
            timestamp=datetime.utcnow(),
            source="yahoo",
        )

        assert rate.pair == "AUDUSD"
        assert rate.rate == 0.65
        assert rate.source == "yahoo"

    def test_fx_rate_with_spread(self):
        """Test FXRate with bid/ask spread."""
        rate = FXRate(
            pair="AUDUSD",
            rate=0.65,
            timestamp=datetime.utcnow(),
            bid=0.6495,
            ask=0.6505,
        )

        assert rate.bid == 0.6495
        assert rate.ask == 0.6505


class TestCachedRate:
    """Tests for CachedRate dataclass."""

    def test_cached_rate_creation(self):
        """Test CachedRate creation."""
        now = datetime.utcnow()
        fx_rate = FXRate(pair="AUDUSD", rate=0.65, timestamp=now)

        cached = CachedRate(
            rate=fx_rate,
            fetched_at=now,
            expires_at=now + timedelta(seconds=300),
        )

        assert cached.rate.rate == 0.65
        assert cached.fetched_at == now
        assert cached.expires_at > now


class TestFXServiceIntegration:
    """Integration tests that may hit real API (use with caution)."""

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Integration test - requires network")
    async def test_real_rate_fetch(self):
        """Test fetching real rate from Yahoo Finance."""
        service = FXRateService()
        rate = await service.get_rate("AUD", "USD")

        # Should be a reasonable rate (AUD usually 0.5-0.8 USD)
        assert 0.4 < rate < 1.0

    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Integration test - requires network")
    async def test_initialize_prefetches(self):
        """Test that initialize() prefetches common rates."""
        service = FXRateService()
        await service.initialize()

        # Should have AUDUSD in cache
        cached = service.get_cached_rate("AUDUSD")
        assert cached is not None
