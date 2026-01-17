"""
Data Service - Stock Trading Automation System

FastAPI service for fetching and serving market data from multiple sources.
Uses a provider abstraction layer for easy swapping between data sources.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5101 --reload

Endpoints:
    GET /health                         - Health check
    GET /api/v1/ohlcv/{symbol}          - Get OHLCV data
    GET /api/v1/ohlcv/{symbol}/quality  - Get data quality report
    POST /api/v1/ohlcv/bulk             - Fetch bulk OHLCV data
    GET /api/v1/quote/{symbol}          - Get real-time quote
    GET /api/v1/symbols                 - List available symbols
    GET /api/v1/providers               - List registered data providers
    GET /api/v1/providers/{name}/health - Check provider health
"""

import os
import hashlib
import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from providers import ProviderRegistry, YahooProvider, AlpacaProvider, PolygonProvider
from providers.base import ProviderError, RateLimitError, SymbolNotFoundError
from storage.timescale import TimescaleStorage
from storage.cache import RedisCache
from quality.validators import DataQualityGate
from quality.report import DataQualityReport, DataQualityStatus, QualityIssue

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)

# Global instances
yahoo_source: Optional[YahooDataSource] = None
storage: Optional[TimescaleStorage] = None
cache: Optional[RedisCache] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global yahoo_source, storage, cache

    logger.info("Starting Data Service...")

    # Initialize data sources
    yahoo_source = YahooDataSource()

    # Initialize storage
    storage = TimescaleStorage(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=int(os.getenv('POSTGRES_PORT', 5432)),
        database=os.getenv('POSTGRES_DB', 'stock_trading'),
        user=os.getenv('POSTGRES_USER', 'stock_user'),
        password=os.getenv('POSTGRES_PASSWORD', ''),
    )
    await storage.connect()

    # Initialize cache (optional)
    redis_host = os.getenv('REDIS_HOST')
    if redis_host:
        cache = RedisCache(
            host=redis_host,
            port=int(os.getenv('REDIS_PORT', 6379)),
        )
        await cache.connect()

    logger.info("Data Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down Data Service...")
    if storage:
        await storage.disconnect()
    if cache:
        await cache.disconnect()


# Create FastAPI app
app = FastAPI(
    title="Stock Data Service",
    description="Market data fetching and serving for the Stock Trading Automation System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Pydantic Models
# =============================================================================

class OHLCVBar(BaseModel):
    """Single OHLCV bar."""
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjusted_close: Optional[float] = None


class OHLCVResponse(BaseModel):
    """OHLCV response with metadata."""
    symbol: str
    market: str
    timeframe: str
    data: List[OHLCVBar]
    data_hash: str = Field(description="SHA256 hash of the data for audit trail")
    count: int
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class QuoteResponse(BaseModel):
    """Real-time quote response."""
    symbol: str
    market: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: datetime
    bid: Optional[float] = None
    ask: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    open: Optional[float] = None
    previous_close: Optional[float] = None


class BulkFetchRequest(BaseModel):
    """Request for bulk OHLCV fetch."""
    symbols: List[str]
    market: str = "US"
    start: date
    end: Optional[date] = None
    timeframe: str = "1d"


class SymbolInfo(BaseModel):
    """Symbol information."""
    symbol: str
    name: str
    market: str
    type: str  # stock, etf, crypto
    currency: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: datetime
    components: dict


class QualityIssueResponse(BaseModel):
    """Single quality issue in response."""
    check_name: str
    severity: str
    message: str
    affected_rows: int = 0
    affected_dates: List[str] = []
    details: dict = {}


class DataQualityResponse(BaseModel):
    """Data quality report response."""
    symbol: str
    market: str
    status: str = Field(description="PASS, WARN, or FAIL")
    tradeable: bool = Field(description="Whether data is safe for signal generation")
    issues: List[QualityIssueResponse] = []
    candle_count: int = 0
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    check_timestamp: str
    checks_performed: List[str] = []
    summary: str = ""


class OHLCVWithQualityResponse(BaseModel):
    """OHLCV response with optional quality information."""
    symbol: str
    market: str
    timeframe: str
    data: List[OHLCVBar]
    data_hash: str = Field(description="SHA256 hash of the data for audit trail")
    count: int
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    # Quality fields (included when include_quality=true)
    data_quality_status: Optional[str] = Field(default=None, description="PASS, WARN, or FAIL")
    tradeable: Optional[bool] = Field(default=None, description="Whether data is safe for trading")
    quality_issues: Optional[List[QualityIssueResponse]] = Field(default=None, description="List of quality issues found")


# =============================================================================
# Helper Functions
# =============================================================================

def calculate_data_hash(data: List[dict]) -> str:
    """Calculate SHA256 hash of data for audit trail."""
    data_str = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(data_str.encode()).hexdigest()


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    components = {
        "yahoo_finance": "healthy" if yahoo_source else "not_initialized",
        "database": "unknown",
        "cache": "unknown",
    }

    # Check database
    if storage:
        try:
            await storage.health_check()
            components["database"] = "healthy"
        except Exception as e:
            components["database"] = f"unhealthy: {str(e)}"

    # Check cache
    if cache:
        try:
            await cache.health_check()
            components["cache"] = "healthy"
        except Exception:
            components["cache"] = "unhealthy"
    else:
        components["cache"] = "disabled"

    overall_status = "healthy" if all(
        v in ["healthy", "disabled"] for v in components.values()
    ) else "degraded"

    return HealthResponse(
        status=overall_status,
        service="data-service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        components=components,
    )


@app.get("/api/v1/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    market: str = Query(default="US", description="Market (US, ASX, CRYPTO)"),
    start: Optional[date] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end: Optional[date] = Query(default=None, description="End date (YYYY-MM-DD)"),
    timeframe: str = Query(default="1d", description="Timeframe (1d, 1h, 5m)"),
    source: str = Query(default="auto", description="Data source (auto, yahoo, database)"),
    include_quality: bool = Query(default=False, description="Include data quality report"),
):
    """
    Get OHLCV data for a symbol.

    Returns historical OHLCV bars with a data hash for audit trail.
    When include_quality=true, also runs quality checks and includes:
    - data_quality_status: PASS, WARN, or FAIL
    - tradeable: Whether data is safe for signal generation
    - quality_issues: List of any problems found
    """
    logger.info("Fetching OHLCV", symbol=symbol, market=market, timeframe=timeframe, include_quality=include_quality)

    # Default date range
    if not end:
        end = date.today()
    if not start:
        start = end - timedelta(days=365)

    # Try cache first (only for non-quality requests to ensure fresh quality checks)
    cache_key = f"ohlcv:{symbol}:{market}:{timeframe}:{start}:{end}"
    if cache and not include_quality:
        cached = await cache.get(cache_key)
        if cached:
            logger.debug("Cache hit", key=cache_key)
            return OHLCVResponse(**cached)

    # Determine data source
    data = None

    if source in ["auto", "database"] and storage:
        # Try database first
        data = await storage.get_ohlcv(
            symbol=symbol,
            market=market,
            start=datetime.combine(start, datetime.min.time()),
            end=datetime.combine(end, datetime.max.time()),
            timeframe=timeframe,
        )

    if not data and source in ["auto", "yahoo"]:
        # Fetch from Yahoo Finance
        if not yahoo_source:
            raise HTTPException(status_code=503, detail="Yahoo data source not available")

        data = await yahoo_source.get_ohlcv(
            symbol=symbol,
            start=start,
            end=end,
            interval=timeframe,
        )

        # Store in database for future use
        if storage and data:
            await storage.store_ohlcv(symbol, market, data, timeframe)

    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    # Convert source OHLCVBar objects to dictionaries for Pydantic
    data_dicts = []
    for bar in data:
        bar_dict = {
            "time": bar.time,
            "open": bar.open,
            "high": bar.high,
            "low": bar.low,
            "close": bar.close,
            "volume": bar.volume,
            "adjusted_close": bar.adjusted_close,
        }
        data_dicts.append(bar_dict)

    # Calculate data hash for audit trail
    data_hash = calculate_data_hash(data_dicts)

    # Run quality checks if requested
    quality_status = None
    tradeable = None
    quality_issues = None

    if include_quality:
        gate = DataQualityGate(market=market)
        quality_report = gate.validate(
            bars=data,
            symbol=symbol,
            start_date=start,
            end_date=end,
        )

        quality_status = quality_report.status.value
        tradeable = quality_report.tradeable
        quality_issues = [
            QualityIssueResponse(
                check_name=issue.check_name,
                severity=issue.severity.value,
                message=issue.message,
                affected_rows=issue.affected_rows,
                affected_dates=[d.isoformat() for d in issue.affected_dates],
                details=issue.details,
            )
            for issue in quality_report.issues
        ]

        # Log quality results to database
        if storage:
            await _store_quality_report(quality_report)

    # Build response
    if include_quality:
        response = OHLCVWithQualityResponse(
            symbol=symbol.upper(),
            market=market.upper(),
            timeframe=timeframe,
            data=data_dicts,
            data_hash=data_hash,
            count=len(data_dicts),
            start=data_dicts[0]["time"] if data_dicts else None,
            end=data_dicts[-1]["time"] if data_dicts else None,
            data_quality_status=quality_status,
            tradeable=tradeable,
            quality_issues=quality_issues,
        )
    else:
        response = OHLCVResponse(
            symbol=symbol.upper(),
            market=market.upper(),
            timeframe=timeframe,
            data=data_dicts,
            data_hash=data_hash,
            count=len(data_dicts),
            start=data_dicts[0]["time"] if data_dicts else None,
            end=data_dicts[-1]["time"] if data_dicts else None,
        )

        # Cache the response (only non-quality responses)
        if cache:
            await cache.set(cache_key, response.model_dump(), ttl=300)  # 5 min TTL

    return response


async def _store_quality_report(report: DataQualityReport) -> None:
    """Store quality report in TimescaleDB."""
    if not storage or not storage._pool:
        return

    try:
        async with storage._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO data_quality_log (
                    symbol, market, check_timestamp, status, tradeable,
                    issues, candle_count, date_range_start, date_range_end,
                    checks_performed, summary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                report.symbol,
                report.market,
                report.check_timestamp,
                report.status.value,
                report.tradeable,
                json.dumps([issue.to_dict() for issue in report.issues]),
                report.candle_count,
                report.date_range_start,
                report.date_range_end,
                json.dumps(report.checks_performed),
                report.summary,
            )
            logger.debug("Stored quality report", symbol=report.symbol, status=report.status.value)
    except Exception as e:
        # Don't fail the request if logging fails
        logger.warning("Failed to store quality report", symbol=report.symbol, error=str(e))


@app.get("/api/v1/ohlcv/{symbol}/quality", response_model=DataQualityResponse)
async def get_ohlcv_quality(
    symbol: str,
    market: str = Query(default="US", description="Market (US, ASX, CRYPTO)"),
    start: Optional[date] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end: Optional[date] = Query(default=None, description="End date (YYYY-MM-DD)"),
    timeframe: str = Query(default="1d", description="Timeframe (1d, 1h, 5m)"),
    max_stale_hours: int = Query(default=24, description="Maximum data age in hours"),
    outlier_threshold: float = Query(default=0.20, description="Outlier return threshold (0.20 = 20%)"),
):
    """
    Get data quality report for a symbol.

    Runs all quality checks and returns a detailed report including:
    - Status: PASS (clean), WARN (minor issues), FAIL (unusable)
    - Tradeable: Whether data is safe for signal generation
    - Issues: Detailed list of problems found

    Quality checks performed:
    - missing_candles: Gaps in trading days
    - zero_volume: Bars with volume=0 on trading days
    - stale_data: Last bar too old
    - outlier_returns: >20% single day moves without splits
    - split_adjustment: Unadjusted split data detection
    """
    logger.info("Running quality check", symbol=symbol, market=market, timeframe=timeframe)

    # Default date range
    if not end:
        end = date.today()
    if not start:
        start = end - timedelta(days=365)

    # Fetch data
    data = None

    if storage:
        data = await storage.get_ohlcv(
            symbol=symbol,
            market=market,
            start=datetime.combine(start, datetime.min.time()),
            end=datetime.combine(end, datetime.max.time()),
            timeframe=timeframe,
        )

    if not data and yahoo_source:
        data = await yahoo_source.get_ohlcv(
            symbol=symbol,
            start=start,
            end=end,
            interval=timeframe,
        )

        # Store in database for future use
        if storage and data:
            await storage.store_ohlcv(symbol, market, data, timeframe)

    if not data:
        # Return FAIL report for missing data
        report = DataQualityReport(
            symbol=symbol.upper(),
            market=market.upper(),
            status=DataQualityStatus.FAIL,
            tradeable=False,
            summary=f"No data found for {symbol}",
        )
    else:
        # Run quality gate
        gate = DataQualityGate(
            market=market,
            max_stale_hours=max_stale_hours,
            outlier_threshold=outlier_threshold,
        )
        report = gate.validate(
            bars=data,
            symbol=symbol,
            start_date=start,
            end_date=end,
        )

    # Store report in database
    await _store_quality_report(report)

    # Convert to response
    return DataQualityResponse(
        symbol=report.symbol,
        market=report.market,
        status=report.status.value,
        tradeable=report.tradeable,
        issues=[
            QualityIssueResponse(
                check_name=issue.check_name,
                severity=issue.severity.value,
                message=issue.message,
                affected_rows=issue.affected_rows,
                affected_dates=[d.isoformat() for d in issue.affected_dates],
                details=issue.details,
            )
            for issue in report.issues
        ],
        candle_count=report.candle_count,
        date_range_start=report.date_range_start.isoformat() if report.date_range_start else None,
        date_range_end=report.date_range_end.isoformat() if report.date_range_end else None,
        check_timestamp=report.check_timestamp.isoformat(),
        checks_performed=report.checks_performed,
        summary=report.summary,
    )


@app.post("/api/v1/ohlcv/bulk")
async def bulk_fetch_ohlcv(request: BulkFetchRequest, background_tasks: BackgroundTasks):
    """
    Bulk fetch OHLCV data for multiple symbols.

    Fetches data in the background and stores in database.
    """
    logger.info("Bulk fetch request", symbols=request.symbols, market=request.market)

    if len(request.symbols) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 symbols per request")

    # Queue background task
    async def fetch_all():
        results = {}
        for symbol in request.symbols:
            try:
                data = await yahoo_source.get_ohlcv(
                    symbol=symbol,
                    start=request.start,
                    end=request.end or date.today(),
                    interval=request.timeframe,
                )
                if storage and data:
                    await storage.store_ohlcv(symbol, request.market, data, request.timeframe)
                results[symbol] = {"status": "success", "bars": len(data) if data else 0}
            except Exception as e:
                logger.error("Bulk fetch error", symbol=symbol, error=str(e))
                results[symbol] = {"status": "error", "error": str(e)}
        return results

    background_tasks.add_task(fetch_all)

    return {
        "message": "Bulk fetch started",
        "symbols": len(request.symbols),
        "status": "processing",
    }


@app.get("/api/v1/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(
    symbol: str,
    market: str = Query(default="US", description="Market"),
):
    """Get real-time quote for a symbol."""
    logger.info("Fetching quote", symbol=symbol, market=market)

    if not yahoo_source:
        raise HTTPException(status_code=503, detail="Data source not available")

    quote = await yahoo_source.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"No quote found for {symbol}")

    return QuoteResponse(
        symbol=symbol.upper(),
        market=market.upper(),
        **quote,
    )


@app.get("/api/v1/symbols", response_model=List[SymbolInfo])
async def list_symbols(
    market: str = Query(default="US", description="Market to list symbols for"),
    type: Optional[str] = Query(default=None, description="Filter by type (stock, etf, crypto)"),
    search: Optional[str] = Query(default=None, description="Search term"),
):
    """List available symbols."""
    # For now, return commonly traded symbols
    # In production, this would query a symbols table
    common_symbols = [
        {"symbol": "AAPL", "name": "Apple Inc.", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "market": "US", "type": "stock", "currency": "USD"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "market": "US", "type": "etf", "currency": "USD"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "market": "US", "type": "etf", "currency": "USD"},
        {"symbol": "BTC-USD", "name": "Bitcoin USD", "market": "CRYPTO", "type": "crypto", "currency": "USD"},
        {"symbol": "ETH-USD", "name": "Ethereum USD", "market": "CRYPTO", "type": "crypto", "currency": "USD"},
    ]

    results = [SymbolInfo(**s) for s in common_symbols if s["market"] == market.upper()]

    if type:
        results = [s for s in results if s.type == type.lower()]

    if search:
        search_lower = search.lower()
        results = [s for s in results if search_lower in s.symbol.lower() or search_lower in s.name.lower()]

    return results


@app.get("/api/v1/data-hash/{symbol}")
async def get_data_hash(
    symbol: str,
    market: str = Query(default="US"),
    as_of: Optional[datetime] = Query(default=None, description="Calculate hash as of this timestamp"),
):
    """
    Get data hash for audit trail verification.

    Returns SHA256 hash of the last 100 OHLCV bars up to the specified timestamp.
    """
    if not as_of:
        as_of = datetime.utcnow()

    start = as_of - timedelta(days=150)  # ~100 trading days

    data = await storage.get_ohlcv(
        symbol=symbol,
        market=market,
        start=start,
        end=as_of,
        timeframe="1d",
        limit=100,
    )

    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    data_hash = calculate_data_hash([bar.model_dump() for bar in data])

    return {
        "symbol": symbol.upper(),
        "market": market.upper(),
        "as_of": as_of.isoformat(),
        "bars_included": len(data),
        "data_hash": data_hash,
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("DATA_SERVICE_PORT", 5101)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
