"""
FX Rate Service

Handles foreign exchange rate fetching, caching, and conversion for multi-currency trading.

Features:
- Fetches FX rates from Yahoo Finance (e.g., AUDUSD=X)
- Caches rates for 5 minutes to reduce API calls
- Falls back to last known rate if fetch fails
- Supports AUD base currency with USD/crypto trades

Usage:
    fx_service = FXRateService()
    await fx_service.initialize()

    # Get current rate
    rate = await fx_service.get_rate("AUD", "USD")

    # Convert amount
    usd_amount = await fx_service.convert(1000, "AUD", "USD")

    # Get cached rate without API call
    cached = fx_service.get_cached_rate("AUDUSD")
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field

import yfinance as yf
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger(__name__)


@dataclass
class FXRate:
    """FX Rate data structure."""
    pair: str
    rate: float
    timestamp: datetime
    source: str = "yahoo"
    bid: Optional[float] = None
    ask: Optional[float] = None


@dataclass
class CachedRate:
    """Cached FX rate with expiry."""
    rate: FXRate
    fetched_at: datetime
    expires_at: datetime


class FXRateService:
    """
    FX Rate service for multi-currency trading.

    Fetches and caches exchange rates, with AUD as the base portfolio currency.
    Supports conversion between AUD and trade currencies (USD, etc.).
    """

    # Cache TTL in seconds (5 minutes)
    CACHE_TTL_SECONDS = 300

    # Yahoo Finance FX symbol format
    # AUDUSD=X means 1 AUD = X USD
    FX_SYMBOL_FORMAT = "{base}{quote}=X"

    # Supported currency pairs with their Yahoo symbols
    SUPPORTED_PAIRS = {
        "AUDUSD": "AUDUSD=X",   # 1 AUD = X USD
        "AUDEUR": "AUDEUR=X",   # 1 AUD = X EUR
        "AUDGBP": "AUDGBP=X",   # 1 AUD = X GBP
        "AUDJPY": "AUDJPY=X",   # 1 AUD = X JPY
        "AUDCAD": "AUDCAD=X",   # 1 AUD = X CAD
        "AUDNZD": "AUDNZD=X",   # 1 AUD = X NZD
        "USDAUD": "USDAUD=X",   # 1 USD = X AUD (inverse)
    }

    # Fallback rates (last known good rates, updated manually as safety net)
    FALLBACK_RATES = {
        "AUDUSD": 0.65,  # Approximate AUD/USD rate
        "USDAUD": 1.54,  # Approximate USD/AUD rate
        "AUDEUR": 0.60,
        "AUDGBP": 0.52,
        "AUDJPY": 97.0,
        "AUDCAD": 0.88,
        "AUDNZD": 1.08,
    }

    def __init__(
        self,
        cache_ttl_seconds: int = 300,
        db_connection: Optional[Any] = None,
    ):
        """
        Initialize FX Rate service.

        Args:
            cache_ttl_seconds: How long to cache rates (default 5 min)
            db_connection: Optional database connection for storing rates
        """
        self.cache_ttl = cache_ttl_seconds
        self.db = db_connection

        # In-memory cache: pair -> CachedRate
        self._cache: Dict[str, CachedRate] = {}

        # Last known rates (fallback if cache and API both fail)
        self._last_known: Dict[str, FXRate] = {}

        logger.info(
            "FX Rate service initialized",
            cache_ttl=cache_ttl_seconds,
            supported_pairs=list(self.SUPPORTED_PAIRS.keys()),
        )

    async def initialize(self) -> None:
        """
        Initialize the service and pre-fetch common rates.

        Call this at startup to warm the cache.
        """
        logger.info("Initializing FX Rate service, pre-fetching rates...")

        # Pre-fetch the most commonly used rate
        try:
            await self.get_rate("AUD", "USD")
            logger.info("FX Rate service initialized successfully")
        except Exception as e:
            logger.warning("Could not pre-fetch FX rates, using fallbacks", error=str(e))

    def _get_pair_symbol(self, base: str, quote: str) -> str:
        """Get the pair symbol (e.g., 'AUDUSD')."""
        return f"{base.upper()}{quote.upper()}"

    def _get_yahoo_symbol(self, pair: str) -> str:
        """Get Yahoo Finance symbol for a pair."""
        return self.SUPPORTED_PAIRS.get(pair, f"{pair}=X")

    def _is_cache_valid(self, pair: str) -> bool:
        """Check if cached rate is still valid."""
        if pair not in self._cache:
            return False
        return datetime.utcnow() < self._cache[pair].expires_at

    def get_cached_rate(self, pair: str) -> Optional[float]:
        """
        Get cached rate without making an API call.

        Args:
            pair: Currency pair (e.g., 'AUDUSD')

        Returns:
            Cached rate if valid, None otherwise
        """
        pair = pair.upper()

        if self._is_cache_valid(pair):
            return self._cache[pair].rate.rate

        # Return last known rate if cache expired
        if pair in self._last_known:
            logger.debug("Using last known rate (cache expired)", pair=pair)
            return self._last_known[pair].rate

        return None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def _fetch_rate_from_yahoo(self, pair: str) -> Optional[FXRate]:
        """
        Fetch FX rate from Yahoo Finance.

        Args:
            pair: Currency pair (e.g., 'AUDUSD')

        Returns:
            FXRate object or None if fetch fails
        """
        yahoo_symbol = self._get_yahoo_symbol(pair)
        logger.debug("Fetching FX rate from Yahoo", pair=pair, symbol=yahoo_symbol)

        try:
            loop = asyncio.get_event_loop()
            ticker = await loop.run_in_executor(None, lambda: yf.Ticker(yahoo_symbol))
            info = await loop.run_in_executor(None, lambda: ticker.info)

            if not info:
                logger.warning("No data from Yahoo for FX pair", pair=pair)
                return None

            # Extract rate - try multiple fields
            rate = (
                info.get('regularMarketPrice') or
                info.get('ask') or
                info.get('bid') or
                info.get('previousClose')
            )

            if not rate or rate <= 0:
                logger.warning("Invalid rate from Yahoo", pair=pair, rate=rate)
                return None

            fx_rate = FXRate(
                pair=pair,
                rate=float(rate),
                timestamp=datetime.utcnow(),
                source="yahoo",
                bid=info.get('bid'),
                ask=info.get('ask'),
            )

            logger.info("Fetched FX rate", pair=pair, rate=rate)
            return fx_rate

        except Exception as e:
            logger.error("Error fetching FX rate from Yahoo", pair=pair, error=str(e))
            raise

    async def get_rate(self, base: str, quote: str) -> float:
        """
        Get current FX rate between two currencies.

        Args:
            base: Base currency (e.g., 'AUD')
            quote: Quote currency (e.g., 'USD')

        Returns:
            Exchange rate (1 base = X quote)

        Raises:
            ValueError: If currencies are invalid or rate unavailable
        """
        base = base.upper()
        quote = quote.upper()

        # Same currency = rate of 1
        if base == quote:
            return 1.0

        pair = self._get_pair_symbol(base, quote)

        # Check cache first
        if self._is_cache_valid(pair):
            logger.debug("Cache hit for FX rate", pair=pair)
            return self._cache[pair].rate.rate

        # Try to fetch from Yahoo
        try:
            fx_rate = await self._fetch_rate_from_yahoo(pair)

            if fx_rate:
                # Update cache
                now = datetime.utcnow()
                self._cache[pair] = CachedRate(
                    rate=fx_rate,
                    fetched_at=now,
                    expires_at=now + timedelta(seconds=self.cache_ttl),
                )

                # Update last known
                self._last_known[pair] = fx_rate

                # Store in database if available
                if self.db:
                    await self._store_rate_in_db(fx_rate)

                return fx_rate.rate

        except Exception as e:
            logger.warning("Failed to fetch FX rate", pair=pair, error=str(e))

        # Fallback to last known rate
        if pair in self._last_known:
            logger.warning("Using last known FX rate", pair=pair)
            return self._last_known[pair].rate

        # Fallback to hardcoded rate
        if pair in self.FALLBACK_RATES:
            logger.warning("Using fallback FX rate", pair=pair, rate=self.FALLBACK_RATES[pair])
            return self.FALLBACK_RATES[pair]

        # Try inverse pair
        inverse_pair = self._get_pair_symbol(quote, base)
        if inverse_pair in self.FALLBACK_RATES:
            rate = 1.0 / self.FALLBACK_RATES[inverse_pair]
            logger.warning("Using inverse fallback FX rate", pair=pair, rate=rate)
            return rate

        raise ValueError(f"Unable to get FX rate for {pair}")

    async def convert(
        self,
        amount: float,
        from_ccy: str,
        to_ccy: str,
    ) -> float:
        """
        Convert amount between currencies.

        Args:
            amount: Amount to convert
            from_ccy: Source currency
            to_ccy: Target currency

        Returns:
            Converted amount
        """
        if from_ccy.upper() == to_ccy.upper():
            return amount

        rate = await self.get_rate(from_ccy, to_ccy)
        return amount * rate

    async def get_rate_with_spread(
        self,
        base: str,
        quote: str,
    ) -> Tuple[float, Optional[float], Optional[float]]:
        """
        Get rate with bid/ask spread if available.

        Args:
            base: Base currency
            quote: Quote currency

        Returns:
            Tuple of (mid_rate, bid, ask)
        """
        base = base.upper()
        quote = quote.upper()
        pair = self._get_pair_symbol(base, quote)

        # Get the rate (will use cache or fetch)
        rate = await self.get_rate(base, quote)

        # Get bid/ask from cache if available
        bid = None
        ask = None

        if pair in self._cache:
            fx_rate = self._cache[pair].rate
            bid = fx_rate.bid
            ask = fx_rate.ask
        elif pair in self._last_known:
            fx_rate = self._last_known[pair]
            bid = fx_rate.bid
            ask = fx_rate.ask

        return rate, bid, ask

    async def _store_rate_in_db(self, fx_rate: FXRate) -> None:
        """Store FX rate in database for historical tracking."""
        if not self.db:
            return

        try:
            # This would use the actual database connection
            # For now, just log
            logger.debug(
                "Storing FX rate in database",
                pair=fx_rate.pair,
                rate=fx_rate.rate,
                timestamp=fx_rate.timestamp.isoformat(),
            )
        except Exception as e:
            logger.error("Failed to store FX rate in database", error=str(e))

    def get_all_cached_rates(self) -> Dict[str, float]:
        """Get all currently cached rates."""
        return {
            pair: cached.rate.rate
            for pair, cached in self._cache.items()
            if self._is_cache_valid(pair)
        }

    def clear_cache(self) -> None:
        """Clear the rate cache."""
        self._cache.clear()
        logger.info("FX rate cache cleared")

    def get_cache_status(self) -> Dict[str, Any]:
        """Get cache status for monitoring."""
        now = datetime.utcnow()
        return {
            "cached_pairs": list(self._cache.keys()),
            "valid_pairs": [
                pair for pair in self._cache.keys()
                if self._is_cache_valid(pair)
            ],
            "last_known_pairs": list(self._last_known.keys()),
            "cache_ttl_seconds": self.cache_ttl,
            "timestamp": now.isoformat(),
        }


# Singleton instance for the service
_fx_service_instance: Optional[FXRateService] = None


def get_fx_service() -> FXRateService:
    """Get the singleton FX service instance."""
    global _fx_service_instance
    if _fx_service_instance is None:
        _fx_service_instance = FXRateService()
    return _fx_service_instance


async def initialize_fx_service(
    cache_ttl_seconds: int = 300,
    db_connection: Optional[Any] = None,
) -> FXRateService:
    """
    Initialize and return the FX service.

    Call this at application startup.
    """
    global _fx_service_instance
    _fx_service_instance = FXRateService(
        cache_ttl_seconds=cache_ttl_seconds,
        db_connection=db_connection,
    )
    await _fx_service_instance.initialize()
    return _fx_service_instance
