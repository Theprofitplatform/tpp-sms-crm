"""
Exposure Analysis Module - Portfolio Risk Management

Calculates and tracks sector and market exposure for portfolio positions.
Helps ensure diversification and prevent concentration risk.

Usage:
    from portfolio.exposure import ExposureAnalyzer, calculate_sector_exposure

    analyzer = ExposureAnalyzer(config)
    exposure = analyzer.analyze(positions)
"""

import os
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

import structlog
import httpx

logger = structlog.get_logger(__name__)


# =============================================================================
# Static Sector Mapping (fallback when Yahoo Finance unavailable)
# =============================================================================

# Well-known US stocks sector mapping
DEFAULT_SECTOR_MAP = {
    # Technology
    "AAPL": ("Technology", "Consumer Electronics"),
    "MSFT": ("Technology", "Software"),
    "GOOGL": ("Technology", "Internet Services"),
    "GOOG": ("Technology", "Internet Services"),
    "META": ("Technology", "Internet Services"),
    "NVDA": ("Technology", "Semiconductors"),
    "AMD": ("Technology", "Semiconductors"),
    "INTC": ("Technology", "Semiconductors"),
    "ADBE": ("Technology", "Software"),
    "CRM": ("Technology", "Software"),
    "ORCL": ("Technology", "Software"),
    "CSCO": ("Technology", "Networking"),
    "AVGO": ("Technology", "Semiconductors"),
    "QCOM": ("Technology", "Semiconductors"),

    # Consumer
    "AMZN": ("Consumer Cyclical", "E-Commerce"),
    "TSLA": ("Consumer Cyclical", "Auto Manufacturers"),
    "HD": ("Consumer Cyclical", "Home Improvement"),
    "NKE": ("Consumer Cyclical", "Apparel"),
    "SBUX": ("Consumer Cyclical", "Restaurants"),
    "MCD": ("Consumer Cyclical", "Restaurants"),
    "TGT": ("Consumer Cyclical", "Retail"),
    "WMT": ("Consumer Defensive", "Retail"),
    "COST": ("Consumer Defensive", "Retail"),
    "PG": ("Consumer Defensive", "Household Products"),
    "KO": ("Consumer Defensive", "Beverages"),
    "PEP": ("Consumer Defensive", "Beverages"),

    # Finance
    "JPM": ("Financial Services", "Banks"),
    "BAC": ("Financial Services", "Banks"),
    "WFC": ("Financial Services", "Banks"),
    "GS": ("Financial Services", "Investment Banking"),
    "MS": ("Financial Services", "Investment Banking"),
    "V": ("Financial Services", "Payment Processing"),
    "MA": ("Financial Services", "Payment Processing"),
    "PYPL": ("Financial Services", "Payment Processing"),
    "BRK.B": ("Financial Services", "Insurance"),
    "BLK": ("Financial Services", "Asset Management"),

    # Healthcare
    "JNJ": ("Healthcare", "Pharmaceuticals"),
    "UNH": ("Healthcare", "Healthcare Plans"),
    "PFE": ("Healthcare", "Pharmaceuticals"),
    "ABBV": ("Healthcare", "Pharmaceuticals"),
    "MRK": ("Healthcare", "Pharmaceuticals"),
    "LLY": ("Healthcare", "Pharmaceuticals"),
    "TMO": ("Healthcare", "Diagnostics"),
    "ABT": ("Healthcare", "Medical Devices"),

    # Energy
    "XOM": ("Energy", "Oil & Gas"),
    "CVX": ("Energy", "Oil & Gas"),
    "COP": ("Energy", "Oil & Gas"),
    "SLB": ("Energy", "Oil Services"),

    # Industrials
    "BA": ("Industrials", "Aerospace"),
    "CAT": ("Industrials", "Machinery"),
    "UPS": ("Industrials", "Logistics"),
    "GE": ("Industrials", "Conglomerates"),
    "HON": ("Industrials", "Conglomerates"),
    "LMT": ("Industrials", "Defense"),
    "RTX": ("Industrials", "Defense"),

    # Communication Services
    "NFLX": ("Communication Services", "Entertainment"),
    "DIS": ("Communication Services", "Entertainment"),
    "T": ("Communication Services", "Telecom"),
    "VZ": ("Communication Services", "Telecom"),
    "CMCSA": ("Communication Services", "Cable"),

    # Utilities
    "NEE": ("Utilities", "Electric Utilities"),
    "DUK": ("Utilities", "Electric Utilities"),
    "SO": ("Utilities", "Electric Utilities"),

    # Real Estate
    "AMT": ("Real Estate", "REITs"),
    "PLD": ("Real Estate", "REITs"),
    "SPG": ("Real Estate", "REITs"),

    # Materials
    "LIN": ("Materials", "Chemicals"),
    "APD": ("Materials", "Chemicals"),
    "SHW": ("Materials", "Chemicals"),
    "FCX": ("Materials", "Mining"),
    "NEM": ("Materials", "Gold"),

    # ETFs
    "SPY": ("ETF", "Large Cap Blend"),
    "QQQ": ("ETF", "Large Cap Growth"),
    "IWM": ("ETF", "Small Cap Blend"),
    "DIA": ("ETF", "Large Cap Value"),
    "VTI": ("ETF", "Total Market"),
    "VXX": ("ETF", "Volatility"),
    "GLD": ("ETF", "Gold"),
    "SLV": ("ETF", "Silver"),
    "TLT": ("ETF", "Bonds"),
    "XLF": ("ETF", "Financials"),
    "XLK": ("ETF", "Technology"),
    "XLE": ("ETF", "Energy"),
    "XLV": ("ETF", "Healthcare"),
    "XLY": ("ETF", "Consumer Discretionary"),
    "XLP": ("ETF", "Consumer Staples"),
    "XLI": ("ETF", "Industrials"),
    "XLB": ("ETF", "Materials"),
    "XLU": ("ETF", "Utilities"),
    "XLRE": ("ETF", "Real Estate"),

    # Crypto
    "BTC-USD": ("Cryptocurrency", "Bitcoin"),
    "ETH-USD": ("Cryptocurrency", "Ethereum"),
    "SOL-USD": ("Cryptocurrency", "Altcoin"),
    "DOGE-USD": ("Cryptocurrency", "Meme Coin"),
}

# Market mapping (symbol prefix patterns)
MARKET_PATTERNS = {
    "US": ["AAPL", "MSFT", "GOOGL"],  # Default for most
    "ASX": [".AX"],  # Australian stocks end with .AX
    "CRYPTO": ["-USD", "-USDT", "-BTC", "-ETH"],
}


class ExposureLevel(str, Enum):
    """Exposure concentration level."""
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class SectorExposure:
    """Exposure details for a single sector."""
    sector: str
    value: float
    percentage: float
    symbols: List[str]
    level: ExposureLevel = ExposureLevel.LOW


@dataclass
class MarketExposure:
    """Exposure details for a single market."""
    market: str
    value: float
    percentage: float
    symbols: List[str]
    level: ExposureLevel = ExposureLevel.LOW


@dataclass
class ExposureReport:
    """Complete exposure analysis report."""
    total_value: float
    sector_exposure: Dict[str, SectorExposure]
    market_exposure: Dict[str, MarketExposure]
    largest_sector: Optional[str] = None
    largest_market: Optional[str] = None
    sector_warnings: List[str] = field(default_factory=list)
    market_warnings: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "total_value": self.total_value,
            "sector_exposure": {
                k: {
                    "sector": v.sector,
                    "value": v.value,
                    "percentage": v.percentage,
                    "symbols": v.symbols,
                    "level": v.level.value,
                }
                for k, v in self.sector_exposure.items()
            },
            "market_exposure": {
                k: {
                    "market": v.market,
                    "value": v.value,
                    "percentage": v.percentage,
                    "symbols": v.symbols,
                    "level": v.level.value,
                }
                for k, v in self.market_exposure.items()
            },
            "largest_sector": self.largest_sector,
            "largest_market": self.largest_market,
            "sector_warnings": self.sector_warnings,
            "market_warnings": self.market_warnings,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Position:
    """Position information for exposure calculation."""
    symbol: str
    quantity: float
    market_value: float
    market: str = "US"
    sector: Optional[str] = None
    industry: Optional[str] = None


class ExposureAnalyzer:
    """
    Analyzes portfolio exposure across sectors and markets.

    Calculates concentration risk and generates warnings when
    exposure limits are exceeded.
    """

    def __init__(
        self,
        max_sector_exposure_pct: float = 30.0,
        max_market_exposure_pct: float = 50.0,
        data_service_url: Optional[str] = None,
        db_pool: Optional[Any] = None,
    ):
        """
        Initialize exposure analyzer.

        Args:
            max_sector_exposure_pct: Maximum exposure to any single sector
            max_market_exposure_pct: Maximum exposure to any single market
            data_service_url: URL for data service to fetch symbol info
            db_pool: Database connection pool for caching sector data
        """
        self.max_sector_exposure_pct = max_sector_exposure_pct
        self.max_market_exposure_pct = max_market_exposure_pct
        self.data_service_url = data_service_url or os.getenv(
            "DATA_SERVICE_URL", "http://localhost:5101"
        )
        self.db_pool = db_pool
        self._sector_cache: Dict[str, tuple] = {}

    async def get_symbol_sector(self, symbol: str) -> tuple[str, str]:
        """
        Get sector and industry for a symbol.

        First checks cache, then database, then static mapping,
        finally falls back to 'Unknown'.

        Args:
            symbol: Stock symbol

        Returns:
            Tuple of (sector, industry)
        """
        # Check memory cache
        if symbol in self._sector_cache:
            return self._sector_cache[symbol]

        # Check database cache
        if self.db_pool:
            try:
                async with self.db_pool.acquire() as conn:
                    row = await conn.fetchrow(
                        """
                        SELECT sector, industry FROM symbol_sectors
                        WHERE symbol = $1
                        """,
                        symbol,
                    )
                    if row:
                        result = (row["sector"], row["industry"])
                        self._sector_cache[symbol] = result
                        return result
            except Exception as e:
                logger.warning("Failed to query sector cache", symbol=symbol, error=str(e))

        # Check static mapping
        if symbol in DEFAULT_SECTOR_MAP:
            result = DEFAULT_SECTOR_MAP[symbol]
            self._sector_cache[symbol] = result
            return result

        # Try to fetch from data service (Yahoo Finance)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.data_service_url}/api/v1/symbols/info/{symbol}",
                    timeout=5.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    sector = data.get("sector", "Unknown")
                    industry = data.get("industry", "Unknown")
                    result = (sector, industry)
                    self._sector_cache[symbol] = result

                    # Cache in database
                    if self.db_pool:
                        await self._cache_sector(symbol, sector, industry)

                    return result
        except Exception as e:
            logger.debug("Failed to fetch sector from data service", symbol=symbol, error=str(e))

        # Fallback
        return ("Unknown", "Unknown")

    async def _cache_sector(self, symbol: str, sector: str, industry: str) -> None:
        """Cache sector information in database."""
        if not self.db_pool:
            return

        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO symbol_sectors (symbol, sector, industry, market, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (symbol) DO UPDATE
                    SET sector = $2, industry = $3, updated_at = NOW()
                    """,
                    symbol,
                    sector,
                    industry,
                    self._detect_market(symbol),
                )
        except Exception as e:
            logger.warning("Failed to cache sector", symbol=symbol, error=str(e))

    def _detect_market(self, symbol: str) -> str:
        """Detect market based on symbol pattern."""
        symbol_upper = symbol.upper()

        # Check crypto patterns
        for pattern in MARKET_PATTERNS["CRYPTO"]:
            if pattern in symbol_upper:
                return "CRYPTO"

        # Check ASX pattern
        if symbol_upper.endswith(".AX"):
            return "ASX"

        # Default to US
        return "US"

    def _get_exposure_level(self, percentage: float, max_pct: float) -> ExposureLevel:
        """Determine exposure level based on percentage of limit."""
        ratio = percentage / max_pct if max_pct > 0 else 0

        if ratio >= 1.0:
            return ExposureLevel.CRITICAL
        elif ratio >= 0.8:
            return ExposureLevel.HIGH
        elif ratio >= 0.5:
            return ExposureLevel.MODERATE
        else:
            return ExposureLevel.LOW

    async def analyze(self, positions: List[Position]) -> ExposureReport:
        """
        Analyze portfolio exposure.

        Args:
            positions: List of current positions

        Returns:
            ExposureReport with sector and market breakdowns
        """
        if not positions:
            return ExposureReport(
                total_value=0.0,
                sector_exposure={},
                market_exposure={},
            )

        total_value = sum(p.market_value for p in positions)

        # Calculate sector exposure
        sector_values: Dict[str, Dict] = {}
        for pos in positions:
            sector, industry = await self.get_symbol_sector(pos.symbol)

            if sector not in sector_values:
                sector_values[sector] = {"value": 0.0, "symbols": []}

            sector_values[sector]["value"] += pos.market_value
            sector_values[sector]["symbols"].append(pos.symbol)

        sector_exposure = {}
        for sector, data in sector_values.items():
            percentage = (data["value"] / total_value * 100) if total_value > 0 else 0
            sector_exposure[sector] = SectorExposure(
                sector=sector,
                value=data["value"],
                percentage=percentage,
                symbols=data["symbols"],
                level=self._get_exposure_level(percentage, self.max_sector_exposure_pct),
            )

        # Calculate market exposure
        market_values: Dict[str, Dict] = {}
        for pos in positions:
            market = pos.market or self._detect_market(pos.symbol)

            if market not in market_values:
                market_values[market] = {"value": 0.0, "symbols": []}

            market_values[market]["value"] += pos.market_value
            market_values[market]["symbols"].append(pos.symbol)

        market_exposure = {}
        for market, data in market_values.items():
            percentage = (data["value"] / total_value * 100) if total_value > 0 else 0
            market_exposure[market] = MarketExposure(
                market=market,
                value=data["value"],
                percentage=percentage,
                symbols=data["symbols"],
                level=self._get_exposure_level(percentage, self.max_market_exposure_pct),
            )

        # Generate warnings
        sector_warnings = []
        for sector, exp in sector_exposure.items():
            if exp.percentage > self.max_sector_exposure_pct:
                sector_warnings.append(
                    f"Sector '{sector}' exposure {exp.percentage:.1f}% exceeds limit {self.max_sector_exposure_pct}%"
                )
            elif exp.level == ExposureLevel.HIGH:
                sector_warnings.append(
                    f"Sector '{sector}' exposure {exp.percentage:.1f}% approaching limit {self.max_sector_exposure_pct}%"
                )

        market_warnings = []
        for market, exp in market_exposure.items():
            if exp.percentage > self.max_market_exposure_pct:
                market_warnings.append(
                    f"Market '{market}' exposure {exp.percentage:.1f}% exceeds limit {self.max_market_exposure_pct}%"
                )
            elif exp.level == ExposureLevel.HIGH:
                market_warnings.append(
                    f"Market '{market}' exposure {exp.percentage:.1f}% approaching limit {self.max_market_exposure_pct}%"
                )

        # Find largest exposures
        largest_sector = max(sector_exposure.items(), key=lambda x: x[1].percentage)[0] if sector_exposure else None
        largest_market = max(market_exposure.items(), key=lambda x: x[1].percentage)[0] if market_exposure else None

        logger.info(
            "Exposure analysis complete",
            total_value=total_value,
            sectors=len(sector_exposure),
            markets=len(market_exposure),
            warnings=len(sector_warnings) + len(market_warnings),
        )

        return ExposureReport(
            total_value=total_value,
            sector_exposure=sector_exposure,
            market_exposure=market_exposure,
            largest_sector=largest_sector,
            largest_market=largest_market,
            sector_warnings=sector_warnings,
            market_warnings=market_warnings,
        )


def calculate_sector_exposure(positions: List[Dict]) -> Dict[str, float]:
    """
    Calculate sector exposure percentages from positions.

    Simple synchronous version using static mapping only.

    Args:
        positions: List of position dicts with 'symbol' and 'market_value' keys

    Returns:
        Dict mapping sector names to exposure percentages
    """
    if not positions:
        return {}

    total_value = sum(p.get("market_value", 0) for p in positions)
    if total_value <= 0:
        return {}

    sector_values: Dict[str, float] = {}

    for pos in positions:
        symbol = pos.get("symbol", "")
        value = pos.get("market_value", 0)

        sector, _ = DEFAULT_SECTOR_MAP.get(symbol, ("Unknown", "Unknown"))
        sector_values[sector] = sector_values.get(sector, 0) + value

    return {
        sector: (value / total_value * 100)
        for sector, value in sector_values.items()
    }


def calculate_market_exposure(positions: List[Dict]) -> Dict[str, float]:
    """
    Calculate market exposure percentages from positions.

    Simple synchronous version.

    Args:
        positions: List of position dicts with 'symbol' and 'market_value' keys

    Returns:
        Dict mapping market names to exposure percentages
    """
    if not positions:
        return {}

    total_value = sum(p.get("market_value", 0) for p in positions)
    if total_value <= 0:
        return {}

    market_values: Dict[str, float] = {}

    for pos in positions:
        symbol = pos.get("symbol", "")
        value = pos.get("market_value", 0)
        market = pos.get("market", "US")

        # Detect market from symbol if not provided
        if market == "US":
            symbol_upper = symbol.upper()
            for pattern in MARKET_PATTERNS["CRYPTO"]:
                if pattern in symbol_upper:
                    market = "CRYPTO"
                    break
            if symbol_upper.endswith(".AX"):
                market = "ASX"

        market_values[market] = market_values.get(market, 0) + value

    return {
        market: (value / total_value * 100)
        for market, value in market_values.items()
    }
