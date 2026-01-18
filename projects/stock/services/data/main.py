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

from providers import (
    ProviderRegistry,
    YahooProvider,
    AlpacaProvider,
    PolygonProvider,
    ResilientProvider,
    FetchStatus,
)
from providers.base import ProviderError, RateLimitError, SymbolNotFoundError
from providers.circuit_breaker import CircuitBreakerRegistry, CircuitOpenError
from storage.timescale import TimescaleStorage
from storage.cache import RedisCache
from quality.validators import DataQualityGate
from quality.report import DataQualityReport, DataQualityStatus, QualityIssue
from quality.storage_gate import StorageGate, StoragePolicy, get_storage_gate, set_storage_gate
from monitoring.staleness import StalenessMonitor, StalenessAlert, StalenessLevel
from monitoring.metrics import MetricsCollector, get_metrics_collector, set_metrics_collector

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
provider_registry: Optional[ProviderRegistry] = None
resilient_provider: Optional[ResilientProvider] = None
storage: Optional[TimescaleStorage] = None
cache: Optional[RedisCache] = None
storage_gate: Optional[StorageGate] = None
staleness_monitor: Optional[StalenessMonitor] = None
metrics_collector: Optional[MetricsCollector] = None


async def _on_all_providers_failed(symbol: str, providers: List[str]) -> None:
    """Callback when all providers fail - may trigger kill switch."""
    risk_service_url = os.getenv('RISK_SERVICE_URL', 'http://localhost:5103')
    trigger_kill_switch = os.getenv('DATA_FAILURE_TRIGGERS_KILL_SWITCH', 'false').lower() == 'true'

    if trigger_kill_switch:
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{risk_service_url}/api/v1/killswitch/trigger",
                    json={
                        "reason": f"Data Service: All providers failed for {symbol}",
                        "triggered_by": "data_service",
                    },
                    timeout=5.0,
                )
            logger.error(
                "Kill switch triggered due to data failure",
                symbol=symbol,
                providers=providers,
            )
        except Exception as e:
            logger.error(
                "Failed to trigger kill switch",
                error=str(e),
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global provider_registry, resilient_provider, storage, cache

    logger.info("Starting Data Service...")

    # Initialize provider registry
    config_path = os.getenv(
        'PROVIDERS_CONFIG',
        os.path.join(os.path.dirname(__file__), '..', '..', 'config', 'providers.json')
    )
    provider_registry = ProviderRegistry(config_path=config_path)

    # Register available providers
    provider_registry.register_provider(YahooProvider())

    # Register stub providers (will only work if configured with API keys)
    provider_registry.register_provider(AlpacaProvider())
    provider_registry.register_provider(PolygonProvider())

    # Initialize resilient provider with circuit breakers and failover
    resilient_provider = ResilientProvider(
        registry=provider_registry,
        on_all_providers_failed=_on_all_providers_failed,
    )

    logger.info(
        "Providers registered",
        count=provider_registry.provider_count,
        providers=[p["name"] for p in provider_registry.list_providers()],
        resilient_enabled=True,
    )

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

    # Initialize storage gate for mandatory quality validation
    storage_gate = StorageGate()
    set_storage_gate(storage_gate)
    logger.info(
        "Storage gate initialized",
        policy=storage_gate.policy.value,
        quarantine_enabled=storage_gate.quarantine_enabled,
    )

    # Initialize staleness monitor
    async def _on_staleness_critical(alert: StalenessAlert) -> None:
        """Handle critical staleness alert - may trigger kill switch."""
        risk_service_url = os.getenv('RISK_SERVICE_URL', 'http://localhost:5103')
        trigger_kill_switch = os.getenv('STALENESS_TRIGGERS_KILL_SWITCH', 'false').lower() == 'true'

        if trigger_kill_switch:
            import httpx
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{risk_service_url}/api/v1/killswitch/trigger",
                        json={
                            "reason": f"Data Service: Critical data staleness for {alert.symbol} ({alert.hours_stale:.1f}h stale)",
                            "triggered_by": "data_service_staleness",
                        },
                        timeout=5.0,
                    )
                logger.error(
                    "Kill switch triggered due to critical staleness",
                    symbol=alert.symbol,
                    hours_stale=alert.hours_stale,
                )
            except Exception as e:
                logger.error("Failed to trigger kill switch", error=str(e))

    staleness_monitor = StalenessMonitor(
        storage=storage,
        on_critical=_on_staleness_critical,
    )

    # Add default symbols to track
    default_symbols = os.getenv('STALENESS_TRACKED_SYMBOLS', 'AAPL,MSFT,GOOGL,AMZN,TSLA').split(',')
    staleness_monitor.add_tracked_symbols("US", default_symbols)

    # Start monitoring if enabled
    if os.getenv('STALENESS_MONITORING_ENABLED', 'true').lower() == 'true':
        await staleness_monitor.start()

    # Initialize Prometheus metrics collector
    metrics_collector = MetricsCollector()
    set_metrics_collector(metrics_collector)
    logger.info("Metrics collector initialized")

    logger.info("Data Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down Data Service...")
    if staleness_monitor:
        await staleness_monitor.stop()
    if storage:
        await storage.disconnect()
    if cache:
        await cache.disconnect()


# Create FastAPI app
app = FastAPI(
    title="Stock Data Service",
    description="Market data fetching and serving for the Stock Trading Automation System",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS middleware - use environment variable for production security
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
    provider: str = Field(default="database", description="Data provider used")
    data: List[OHLCVBar]
    data_hash: str = Field(description="SHA256 hash of the data for audit trail")
    count: int
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class QuoteResponse(BaseModel):
    """Real-time quote response."""
    symbol: str
    market: str
    provider: str = Field(default="yahoo", description="Data provider used")
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
    providers: Dict[str, bool] = Field(default_factory=dict)


class ProviderInfo(BaseModel):
    """Provider information."""
    name: str
    supported_markets: List[str]
    supports_intraday: bool
    rate_limit_per_minute: int
    is_default: bool
    is_healthy: Optional[bool] = None


class ProviderHealthResponse(BaseModel):
    """Provider health check response."""
    name: str
    healthy: bool
    details: Optional[Dict[str, Any]] = None


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
    provider: str = Field(default="database", description="Data provider used")
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
# API Endpoints - Providers
# =============================================================================

@app.get("/api/v1/providers", response_model=List[ProviderInfo])
async def list_providers():
    """
    List all registered data providers.

    Returns information about each provider including supported markets,
    intraday support, and rate limits.
    """
    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    providers = provider_registry.list_providers()

    # Add health status to each provider
    health_status = provider_registry.health_check_all()
    for p in providers:
        p["is_healthy"] = health_status.get(p["name"], False)

    return providers


@app.get("/api/v1/providers/{name}", response_model=Dict[str, Any])
async def get_provider_info(name: str):
    """
    Get detailed information about a specific provider.

    Args:
        name: Provider name (e.g., 'yahoo', 'alpaca', 'polygon')

    Returns:
        Detailed provider information including configuration.
    """
    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    try:
        provider = provider_registry.get_provider_by_name(name)
        return provider.get_info()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")


@app.get("/api/v1/providers/{name}/health", response_model=ProviderHealthResponse)
async def check_provider_health(name: str):
    """
    Check health of a specific data provider.

    Args:
        name: Provider name (e.g., 'yahoo', 'alpaca', 'polygon')

    Returns:
        Health status and provider details.
    """
    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    try:
        provider = provider_registry.get_provider_by_name(name)
        is_healthy = provider.health_check()
        return ProviderHealthResponse(
            name=name,
            healthy=is_healthy,
            details=provider.get_info(),
        )
    except Exception:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")


# =============================================================================
# API Endpoints - Circuit Breakers & Resilience
# =============================================================================

@app.get("/api/v1/providers/circuits")
async def get_circuit_breaker_status():
    """
    Get circuit breaker status for all providers.

    Returns the state (closed/open/half_open), statistics, and health
    information for each provider's circuit breaker.
    """
    if not resilient_provider:
        return {"error": "Resilient provider not initialized"}

    return {
        "circuits": resilient_provider.get_circuit_breaker_states(),
        "open_circuits": resilient_provider.get_open_circuits(),
        "health_scores": resilient_provider.get_health_scores(),
    }


@app.get("/api/v1/providers/{name}/circuit")
async def get_provider_circuit_status(name: str):
    """
    Get circuit breaker status for a specific provider.

    Args:
        name: Provider name

    Returns:
        Circuit breaker state and statistics for the provider.
    """
    breaker_registry = CircuitBreakerRegistry()
    breaker = breaker_registry.get(name)

    if not breaker:
        raise HTTPException(status_code=404, detail=f"No circuit breaker for provider '{name}'")

    stats = breaker.get_stats()
    return {
        "provider": name,
        "state": breaker.state.value,
        "is_open": breaker.is_open,
        "retry_after": breaker.get_retry_after(),
        "stats": stats.to_dict(),
    }


@app.post("/api/v1/providers/{name}/circuit/open")
async def force_circuit_open(
    name: str,
    reason: str = Query(default="manual", description="Reason for opening circuit"),
):
    """
    Manually open a provider's circuit breaker.

    This immediately stops all requests to this provider until manually
    closed or the recovery timeout elapses.

    Args:
        name: Provider name
        reason: Reason for forcing open (logged)
    """
    if not resilient_provider:
        raise HTTPException(status_code=503, detail="Resilient provider not initialized")

    if resilient_provider.force_circuit_open(name, reason):
        logger.warning(
            "Circuit manually opened",
            provider=name,
            reason=reason,
        )
        return {"status": "opened", "provider": name, "reason": reason}
    else:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")


@app.post("/api/v1/providers/{name}/circuit/close")
async def force_circuit_close(
    name: str,
    reason: str = Query(default="manual", description="Reason for closing circuit"),
):
    """
    Manually close a provider's circuit breaker.

    This re-enables requests to the provider immediately.

    Args:
        name: Provider name
        reason: Reason for forcing closed (logged)
    """
    if not resilient_provider:
        raise HTTPException(status_code=503, detail="Resilient provider not initialized")

    if resilient_provider.force_circuit_close(name, reason):
        logger.info(
            "Circuit manually closed",
            provider=name,
            reason=reason,
        )
        return {"status": "closed", "provider": name, "reason": reason}
    else:
        raise HTTPException(status_code=404, detail=f"Provider '{name}' not found")


@app.post("/api/v1/providers/circuits/reset")
async def reset_all_circuits():
    """
    Reset all circuit breakers.

    This clears all failure counters and closes all circuits.
    Use with caution in production.
    """
    if not resilient_provider:
        raise HTTPException(status_code=503, detail="Resilient provider not initialized")

    resilient_provider.reset_all_circuits()
    resilient_provider.reset_metrics()

    logger.info("All circuit breakers reset")

    return {
        "status": "reset",
        "message": "All circuit breakers and metrics reset",
    }


@app.get("/api/v1/providers/health-scores")
async def get_provider_health_scores():
    """
    Get health scores for all providers.

    Health scores are calculated based on:
    - Success rate (70% weight)
    - Average latency (30% weight)

    Higher scores indicate healthier providers.
    """
    if not resilient_provider:
        return {"error": "Resilient provider not initialized"}

    return {
        "scores": resilient_provider.get_health_scores(),
        "best_provider": max(
            resilient_provider.get_health_scores().items(),
            key=lambda x: x[1].get("health_score", 0),
            default=("none", {})
        )[0] if resilient_provider.get_health_scores() else None,
    }


# =============================================================================
# API Endpoints - Data Staleness Monitoring
# =============================================================================

@app.get("/api/v1/staleness")
async def get_staleness_report():
    """
    Get comprehensive data staleness report.

    Returns staleness status for all tracked symbols, including
    active alerts and summary statistics.
    """
    if not staleness_monitor:
        return {"error": "Staleness monitor not initialized"}

    return await staleness_monitor.get_staleness_report()


@app.get("/api/v1/staleness/{symbol}")
async def get_symbol_staleness(
    symbol: str,
    market: str = Query(default="US", description="Market identifier"),
    timeframe: str = Query(default="1d", description="Timeframe to check"),
):
    """
    Check staleness for a specific symbol.

    Args:
        symbol: Ticker symbol
        market: Market identifier
        timeframe: Data timeframe

    Returns:
        Freshness status for the symbol
    """
    if not staleness_monitor:
        raise HTTPException(status_code=503, detail="Staleness monitor not initialized")

    freshness = await staleness_monitor.check_symbol(symbol, market, timeframe)
    return freshness.to_dict()


@app.get("/api/v1/staleness/alerts/active")
async def get_active_staleness_alerts():
    """
    Get currently active staleness alerts.

    Returns:
        List of active alerts with severity levels
    """
    if not staleness_monitor:
        return {"error": "Staleness monitor not initialized", "alerts": []}

    alerts = staleness_monitor.get_active_alerts()
    return {
        "alerts": [a.to_dict() for a in alerts],
        "count": len(alerts),
        "has_critical": any(a.level == StalenessLevel.CRITICAL for a in alerts),
        "has_error": any(a.level == StalenessLevel.ERROR for a in alerts),
    }


@app.post("/api/v1/staleness/alerts/clear")
async def clear_staleness_alert(
    symbol: str = Query(description="Symbol to clear alert for"),
    market: str = Query(default="US", description="Market identifier"),
):
    """
    Clear an active staleness alert.

    Args:
        symbol: Symbol to clear
        market: Market identifier
    """
    if not staleness_monitor:
        raise HTTPException(status_code=503, detail="Staleness monitor not initialized")

    cleared = staleness_monitor.clear_alert(symbol, market)
    return {
        "cleared": cleared,
        "symbol": symbol,
        "market": market,
    }


@app.post("/api/v1/staleness/alerts/clear-all")
async def clear_all_staleness_alerts():
    """Clear all active staleness alerts."""
    if not staleness_monitor:
        raise HTTPException(status_code=503, detail="Staleness monitor not initialized")

    count = staleness_monitor.clear_all_alerts()
    return {
        "cleared": count,
        "message": f"Cleared {count} alerts",
    }


@app.get("/api/v1/staleness/stats")
async def get_staleness_monitor_stats():
    """
    Get staleness monitor statistics.

    Returns monitoring stats including total checks, alerts raised,
    and tracked symbols.
    """
    if not staleness_monitor:
        return {"error": "Staleness monitor not initialized"}

    return staleness_monitor.get_stats()


@app.post("/api/v1/staleness/track")
async def add_tracked_symbols(
    symbols: List[str] = Query(description="Symbols to track"),
    market: str = Query(default="US", description="Market identifier"),
):
    """
    Add symbols to staleness tracking.

    Args:
        symbols: List of symbols to track
        market: Market identifier
    """
    if not staleness_monitor:
        raise HTTPException(status_code=503, detail="Staleness monitor not initialized")

    staleness_monitor.add_tracked_symbols(market, symbols)
    return {
        "added": symbols,
        "market": market,
        "total_tracked": sum(len(s) for s in staleness_monitor.tracked_symbols.values()),
    }


# =============================================================================
# API Endpoints - Health & Data
# =============================================================================

@app.get("/metrics")
async def get_metrics():
    """
    Prometheus metrics endpoint.

    Returns all collected metrics in Prometheus text format for scraping
    by Prometheus server.

    Metrics include:
    - Provider request counts and latencies
    - Circuit breaker states
    - Quality gate statistics
    - Staleness monitoring data
    """
    from fastapi.responses import Response

    collector = get_metrics_collector()

    # Update health scores from resilient provider
    if resilient_provider:
        scores = resilient_provider.get_health_scores()
        for provider, data in scores.items():
            collector.update_health_score(provider, data.get("health_score", 0))

            # Update circuit state
            circuit_state = data.get("circuit_state", "closed")
            collector.update_circuit_state(provider, circuit_state)

    # Update staleness alerts count
    if staleness_monitor:
        alerts = staleness_monitor.get_active_alerts()
        alert_counts = {"warning": 0, "error": 0, "critical": 0}
        for alert in alerts:
            level = alert.level.value
            if level in alert_counts:
                alert_counts[level] += 1
        for level, count in alert_counts.items():
            collector.update_staleness_alerts(level, count)

    return Response(
        content=collector.export(),
        media_type=collector.get_content_type(),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    components = {
        "provider_registry": "healthy" if provider_registry else "not_initialized",
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

    # Check all providers
    provider_health = {}
    if provider_registry:
        provider_health = provider_registry.health_check_all()

    overall_status = "healthy" if all(
        v in ["healthy", "disabled"] for v in components.values()
    ) else "degraded"

    return HealthResponse(
        status=overall_status,
        service="data-service",
        version="1.1.0",
        timestamp=datetime.utcnow(),
        components=components,
        providers=provider_health,
    )


@app.get("/api/v1/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    market: str = Query(default="US", description="Market (US, ASX, CRYPTO)"),
    start: Optional[date] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end: Optional[date] = Query(default=None, description="End date (YYYY-MM-DD)"),
    timeframe: str = Query(default="1d", description="Timeframe (1d, 1h, 5m)"),
    source: str = Query(default="auto", description="Data source (auto, yahoo, alpaca, polygon, database)"),
    include_quality: bool = Query(default=False, description="Include data quality report"),
):
    """
    Get OHLCV data for a symbol.

    Returns historical OHLCV bars with a data hash for audit trail.
    Uses the provider registry to select the appropriate data source.

    When include_quality=true, also runs quality checks and includes:
    - data_quality_status: PASS, WARN, or FAIL
    - tradeable: Whether data is safe for signal generation
    - quality_issues: List of any problems found
    """
    logger.info("Fetching OHLCV", symbol=symbol, market=market, timeframe=timeframe, source=source, include_quality=include_quality)

    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

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
    provider_used = "database"

    if source in ["auto", "database"] and storage:
        # Try database first
        data = await storage.get_ohlcv(
            symbol=symbol,
            market=market,
            start=datetime.combine(start, datetime.min.time()),
            end=datetime.combine(end, datetime.max.time()),
            timeframe=timeframe,
        )

    if not data:
        # Get provider based on source parameter
        try:
            if source == "auto" and resilient_provider:
                # Use resilient provider with automatic failover
                result = await resilient_provider.get_ohlcv(
                    symbol=symbol,
                    start=start,
                    end=end,
                    interval=timeframe,
                    market=market,
                )

                if result.status == FetchStatus.FAILED:
                    raise HTTPException(
                        status_code=503,
                        detail={
                            "message": f"All providers failed for {symbol}",
                            "errors": result.errors,
                        }
                    )
                elif result.status == FetchStatus.CIRCUIT_OPEN:
                    raise HTTPException(
                        status_code=503,
                        detail={
                            "message": "All provider circuits are open",
                            "errors": result.errors,
                            "retry_after": 60,
                        }
                    )

                data = result.data
                provider_used = result.provider

                # Log if fallback was used
                if result.status == FetchStatus.FALLBACK:
                    logger.warning(
                        "Used fallback provider",
                        symbol=symbol,
                        provider=result.provider,
                        fallback_attempts=result.fallback_attempts,
                        errors=result.errors,
                    )

            elif source == "auto":
                # Fallback if resilient provider not available
                provider = provider_registry.get_healthy_provider(market)
                if not provider:
                    provider = provider_registry.get_provider(market)
                provider_used = provider.name
                data = await provider.get_ohlcv(
                    symbol=symbol,
                    start=start,
                    end=end,
                    interval=timeframe,
                )

            elif source == "database":
                raise HTTPException(status_code=404, detail=f"No data found in database for {symbol}")

            else:
                # Use specific provider directly (no resilience)
                provider = provider_registry.get_provider_by_name(source)
                provider_used = provider.name
                data = await provider.get_ohlcv(
                    symbol=symbol,
                    start=start,
                    end=end,
                    interval=timeframe,
                )

            # Store in database using storage gate (validates quality first)
            if storage and data:
                gate = get_storage_gate()
                store_result = await gate.validate_and_store(
                    bars=data,
                    symbol=symbol,
                    market=market,
                    timeframe=timeframe,
                    storage=storage,
                    start_date=start,
                    end_date=end,
                )
                if not store_result.stored:
                    logger.warning(
                        "Data not stored due to quality gate",
                        symbol=symbol,
                        reason=store_result.rejection_reason.value if store_result.rejection_reason else "unknown",
                        details=store_result.rejection_details,
                    )

        except CircuitOpenError as e:
            raise HTTPException(
                status_code=503,
                detail={
                    "message": str(e),
                    "retry_after": e.retry_after,
                }
            )
        except RateLimitError as e:
            raise HTTPException(status_code=429, detail=str(e))
        except SymbolNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ProviderError as e:
            raise HTTPException(status_code=503, detail=str(e))

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
            provider=provider_used,
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
            provider=provider_used,
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

    if not data and provider_registry:
        try:
            provider = provider_registry.get_healthy_provider(market)
            if not provider:
                provider = provider_registry.get_provider(market)

            data = await provider.get_ohlcv(
                symbol=symbol,
                start=start,
                end=end,
                interval=timeframe,
            )

            # Store in database using storage gate (validates quality first)
            if storage and data:
                gate = get_storage_gate()
                await gate.validate_and_store(
                    bars=data,
                    symbol=symbol,
                    market=market,
                    timeframe=timeframe,
                    storage=storage,
                    start_date=start,
                    end_date=end,
                )
        except ProviderError as e:
            logger.warning("Provider error during quality check", error=str(e))

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
    Uses the configured provider for the specified market.
    """
    logger.info("Bulk fetch request", symbols=request.symbols, market=request.market)

    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    if len(request.symbols) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 symbols per request")

    # Get provider for market
    try:
        provider = provider_registry.get_provider(request.market)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Queue background task
    async def fetch_all():
        results = {}
        for symbol in request.symbols:
            try:
                data = await provider.get_ohlcv(
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
        "provider": provider.name,
        "status": "processing",
    }


@app.get("/api/v1/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(
    symbol: str,
    market: str = Query(default="US", description="Market"),
    source: str = Query(default="auto", description="Data source (auto, yahoo, alpaca, polygon)"),
):
    """Get real-time quote for a symbol."""
    logger.info("Fetching quote", symbol=symbol, market=market, source=source)

    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    try:
        if source == "auto":
            provider = provider_registry.get_healthy_provider(market)
            if not provider:
                provider = provider_registry.get_provider(market)
        else:
            provider = provider_registry.get_provider_by_name(source)

        quote = await provider.get_quote(symbol)

        if not quote:
            raise HTTPException(status_code=404, detail=f"No quote found for {symbol}")

        return QuoteResponse(
            symbol=symbol.upper(),
            market=market.upper(),
            provider=provider.name,
            price=quote.price,
            change=quote.change or 0,
            change_percent=quote.change_percent or 0,
            volume=quote.volume,
            timestamp=quote.timestamp,
            bid=quote.bid,
            ask=quote.ask,
            high=quote.high,
            low=quote.low,
            open=quote.open,
            previous_close=quote.previous_close,
        )

    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except SymbolNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))


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


@app.get("/api/v1/symbols/search")
async def search_symbols(
    query: str = Query(description="Search term"),
    market: Optional[str] = Query(default=None, description="Optional market filter"),
):
    """
    Search for symbols using the configured provider.

    Uses the provider's symbol search functionality if available.
    """
    if not provider_registry:
        raise HTTPException(status_code=503, detail="Provider registry not initialized")

    try:
        # Get the default provider or one for the specified market
        if market:
            provider = provider_registry.get_provider(market)
        else:
            provider = provider_registry.get_provider("US")

        results = await provider.search_symbols(query, market)
        return [r.to_dict() for r in results]

    except Exception as e:
        logger.error("Symbol search error", query=query, error=str(e))
        return []


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
    if not storage:
        raise HTTPException(status_code=503, detail="Storage not available")

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
# Time Endpoints for Cross-Market Support
# =============================================================================

@app.get("/api/v1/time")
async def get_service_time():
    """
    Get current service time and clock synchronization status.

    This endpoint is used for:
    - Clock synchronization checks across services
    - Verifying time alignment for cross-market operations
    - Debugging timing-related issues

    Returns:
        Service time information including UTC time, clock skew status,
        and market session information for all supported markets.
    """
    from time.timezone import now_utc, from_utc, get_market_timezone
    from time.sessions import get_current_session, SessionType
    from time.market_hours import is_market_open

    utc_now = now_utc()

    # Get status for each supported market
    markets_status = {}
    for market in ["US", "ASX", "CRYPTO", "LSE", "TSX"]:
        try:
            session = get_current_session(market, utc_now)
            market_tz = get_market_timezone(market)
            local_time = from_utc(utc_now, market_tz)

            markets_status[market] = {
                "session_type": session.session_type,
                "is_open": is_market_open(market, utc_now),
                "is_trading_day": session.is_trading_day,
                "timezone": session.timezone,
                "local_time": local_time.isoformat(),
                "open_time": session.open_time.isoformat() if session.open_time else None,
                "close_time": session.close_time.isoformat() if session.close_time else None,
                "next_session_start": session.next_session_start.isoformat() if session.next_session_start else None,
            }
        except Exception as e:
            markets_status[market] = {"error": str(e)}

    # Basic clock sync check (in production, compare against NTP)
    system_time = datetime.utcnow()
    skew_ms = (utc_now.replace(tzinfo=None) - system_time).total_seconds() * 1000

    return {
        "service": "data-service",
        "version": "1.1.0",
        "utc_time": utc_now.isoformat(),
        "utc_timestamp": utc_now.timestamp(),
        "clock_sync": {
            "skew_ms": skew_ms,
            "is_synchronized": abs(skew_ms) < 30000,  # 30 second threshold
            "max_skew_ms": 30000,
        },
        "markets": markets_status,
    }


@app.get("/api/v1/time/market/{market}")
async def get_market_time(market: str):
    """
    Get detailed time information for a specific market.

    Args:
        market: Market identifier (US, ASX, CRYPTO, LSE, TSX)

    Returns:
        Detailed market time information including:
        - Current session type (pre, regular, post, closed)
        - Trading day status
        - Session open/close times
        - Time until next session
    """
    from time.timezone import now_utc, from_utc, get_market_timezone, get_timezone_offset_hours
    from time.sessions import get_current_session, get_next_session_start, get_time_to_session, SessionType
    from time.market_hours import is_market_open, get_trading_hours_utc

    market_upper = market.upper()
    utc_now = now_utc()

    try:
        session = get_current_session(market_upper, utc_now)
        market_tz = get_market_timezone(market_upper)
        local_time = from_utc(utc_now, market_tz)
        offset_hours = get_timezone_offset_hours(market_upper, utc_now)

        # Get trading hours for today
        trading_hours = get_trading_hours_utc(market_upper)

        # Calculate time to next session
        next_session = get_next_session_start(market_upper, utc_now)
        time_to_next = None
        if next_session:
            time_to_next = (next_session - utc_now).total_seconds()

        return {
            "market": market_upper,
            "utc_time": utc_now.isoformat(),
            "local_time": local_time.isoformat(),
            "timezone": session.timezone,
            "timezone_offset_hours": offset_hours,
            "session": {
                "type": session.session_type,
                "is_trading_day": session.is_trading_day,
                "is_open": is_market_open(market_upper, utc_now),
                "open_time": session.open_time.isoformat() if session.open_time else None,
                "close_time": session.close_time.isoformat() if session.close_time else None,
            },
            "trading_hours_utc": {
                "open": trading_hours[0].isoformat() if trading_hours else None,
                "close": trading_hours[1].isoformat() if trading_hours else None,
            } if trading_hours else None,
            "next_session": {
                "start_utc": next_session.isoformat() if next_session else None,
                "seconds_until": time_to_next,
            },
        }

    except Exception as e:
        logger.error("Error getting market time", market=market_upper, error=str(e))
        raise HTTPException(status_code=400, detail=f"Error getting time for market {market}: {str(e)}")


# =============================================================================
# Corporate Actions Endpoints
# =============================================================================

# Global corporate actions components
corporate_actions_applier = None
ticker_mapper = None


class CorporateActionResponse(BaseModel):
    """Corporate action response."""
    id: int
    symbol: str
    action_type: str
    ex_date: str
    split_ratio: Optional[str] = None
    dividend_amount: Optional[float] = None
    dividend_currency: Optional[str] = None
    applied_at: Optional[str] = None
    source: str = "yahoo"


class CorporateActionsList(BaseModel):
    """List of corporate actions."""
    symbol: str
    actions: List[CorporateActionResponse]
    count: int


class SymbolResolveResponse(BaseModel):
    """Symbol resolution response."""
    input_symbol: str
    resolved_symbol: str
    was_changed: bool
    change_history: List[dict] = []


class PendingActionsResponse(BaseModel):
    """Pending corporate actions response."""
    pending_count: int
    upcoming_count: int
    pending: List[dict]
    upcoming: List[dict]


class SplitDetectionResponse(BaseModel):
    """Split detection response."""
    symbol: str
    anomalies_found: int
    anomalies: List[dict]
    high_confidence_count: int


@app.get("/api/v1/corporate-actions/{symbol}", response_model=CorporateActionsList)
async def get_corporate_actions(
    symbol: str,
    start: Optional[date] = Query(default=None, description="Start date"),
    end: Optional[date] = Query(default=None, description="End date"),
    action_type: Optional[str] = Query(default=None, description="Filter by type (split, dividend)"),
):
    """
    Get corporate actions for a symbol.

    Fetches historical corporate actions including stock splits, dividends,
    and symbol changes from Yahoo Finance and local database.

    Args:
        symbol: Ticker symbol
        start: Start date (default: 5 years ago)
        end: End date (default: today)
        action_type: Optional filter for action type

    Returns:
        List of corporate actions sorted by date descending
    """
    from corporate_actions import CorporateActionsFetcher

    logger.info("Fetching corporate actions", symbol=symbol, action_type=action_type)

    if not end:
        end = date.today()
    if not start:
        start = end - timedelta(days=365 * 5)

    try:
        fetcher = CorporateActionsFetcher()
        actions = await fetcher.fetch_actions(symbol, start, end)

        # Filter by type if specified
        if action_type:
            actions = [a for a in actions if a.action_type.value == action_type]

        # Convert to response format
        response_actions = []
        for action in actions:
            response_actions.append(CorporateActionResponse(
                id=0,  # Not stored in DB yet
                symbol=action.symbol,
                action_type=action.action_type.value,
                ex_date=action.ex_date.isoformat(),
                split_ratio=action.split_ratio_str,
                dividend_amount=action.dividend_amount,
                dividend_currency=action.dividend_currency,
                source=action.source,
            ))

        return CorporateActionsList(
            symbol=symbol.upper(),
            actions=response_actions,
            count=len(response_actions),
        )

    except Exception as e:
        logger.error("Error fetching corporate actions", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching corporate actions: {str(e)}")


@app.get("/api/v1/corporate-actions/{symbol}/splits")
async def get_splits(
    symbol: str,
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
):
    """
    Get stock splits for a symbol.

    Returns historical stock splits including split ratio and dates.
    """
    from corporate_actions import CorporateActionsFetcher

    try:
        fetcher = CorporateActionsFetcher()
        splits = await fetcher.fetch_splits(symbol, start, end)

        return {
            "symbol": symbol.upper(),
            "splits": [
                {
                    "ex_date": s.ex_date.isoformat(),
                    "ratio": s.split_ratio_str,
                    "multiplier": s.split_multiplier,
                    "ratio_from": s.split_ratio_from,
                    "ratio_to": s.split_ratio_to,
                }
                for s in splits
            ],
            "count": len(splits),
        }

    except Exception as e:
        logger.error("Error fetching splits", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/corporate-actions/{symbol}/dividends")
async def get_dividends(
    symbol: str,
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
):
    """
    Get dividends for a symbol.

    Returns historical dividend payments including amounts and dates.
    """
    from corporate_actions import CorporateActionsFetcher

    try:
        fetcher = CorporateActionsFetcher()
        dividends = await fetcher.fetch_dividends(symbol, start, end)

        return {
            "symbol": symbol.upper(),
            "dividends": [
                {
                    "ex_date": d.ex_date.isoformat(),
                    "amount": d.dividend_amount,
                    "currency": d.dividend_currency,
                    "type": d.dividend_type,
                }
                for d in dividends
            ],
            "count": len(dividends),
        }

    except Exception as e:
        logger.error("Error fetching dividends", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/corporate-actions/{symbol}/detect-splits", response_model=SplitDetectionResponse)
async def detect_splits(
    symbol: str,
    market: str = Query(default="US"),
    lookback_days: int = Query(default=30, description="Days to analyze"),
):
    """
    Detect potential stock splits from price/volume anomalies.

    Analyzes historical data for patterns that may indicate stock splits,
    including sudden price changes and volume spikes.

    Args:
        symbol: Ticker symbol
        market: Market identifier
        lookback_days: Number of days to analyze

    Returns:
        Detected anomalies with confidence scores
    """
    from corporate_actions import SplitDetector

    logger.info("Detecting splits", symbol=symbol, lookback_days=lookback_days)

    if not storage:
        raise HTTPException(status_code=503, detail="Storage not available")

    try:
        detector = SplitDetector(storage)
        anomalies = await detector.detect_anomalies(
            symbol=symbol,
            market=market,
            lookback_days=lookback_days,
        )

        high_confidence = [a for a in anomalies if a.confidence >= 0.8]

        return SplitDetectionResponse(
            symbol=symbol.upper(),
            anomalies_found=len(anomalies),
            anomalies=[a.to_dict() for a in anomalies],
            high_confidence_count=len(high_confidence),
        )

    except Exception as e:
        logger.error("Error detecting splits", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/symbols/resolve/{symbol}", response_model=SymbolResolveResponse)
async def resolve_symbol(symbol: str):
    """
    Resolve a ticker symbol to its current symbol.

    If a company has changed its ticker (e.g., FB -> META), this endpoint
    returns the current symbol.

    Args:
        symbol: Ticker symbol (old or current)

    Returns:
        Resolved symbol and change history
    """
    if not storage or not storage._pool:
        # No database, just return the symbol as-is
        return SymbolResolveResponse(
            input_symbol=symbol.upper(),
            resolved_symbol=symbol.upper(),
            was_changed=False,
        )

    try:
        from corporate_actions import TickerMapper

        mapper = TickerMapper(storage._pool)
        resolved = await mapper.resolve(symbol)
        history = await mapper.get_history(symbol)

        return SymbolResolveResponse(
            input_symbol=symbol.upper(),
            resolved_symbol=resolved,
            was_changed=resolved.upper() != symbol.upper(),
            change_history=history,
        )

    except Exception as e:
        logger.error("Error resolving symbol", symbol=symbol, error=str(e))
        # Return the original symbol on error
        return SymbolResolveResponse(
            input_symbol=symbol.upper(),
            resolved_symbol=symbol.upper(),
            was_changed=False,
        )


@app.post("/api/v1/symbols/resolve/batch")
async def resolve_symbols_batch(symbols: List[str]):
    """
    Resolve multiple ticker symbols.

    Args:
        symbols: List of ticker symbols

    Returns:
        Dict mapping input symbols to resolved symbols
    """
    if not storage or not storage._pool:
        return {s: s.upper() for s in symbols}

    try:
        from corporate_actions import TickerMapper

        mapper = TickerMapper(storage._pool)
        resolved = await mapper.resolve_batch(symbols)

        return {
            "resolved": resolved,
            "changes_found": sum(1 for s in symbols if resolved.get(s, s).upper() != s.upper()),
        }

    except Exception as e:
        logger.error("Error resolving symbols batch", error=str(e))
        return {s: s.upper() for s in symbols}


@app.get("/api/v1/corporate-actions/pending")
async def get_pending_corporate_actions(days_ahead: int = Query(default=7)):
    """
    Get pending and upcoming corporate actions.

    Returns actions that need to be applied and upcoming actions
    that may affect trading.

    Args:
        days_ahead: Days to look ahead for upcoming actions

    Returns:
        Pending and upcoming corporate actions
    """
    if not storage or not storage._pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        from corporate_actions import CorporateActionsApplier

        applier = CorporateActionsApplier(storage, storage._pool)
        pending = await applier.get_pending_actions()
        upcoming = await applier.get_upcoming_actions(days_ahead)

        return PendingActionsResponse(
            pending_count=len(pending),
            upcoming_count=len(upcoming),
            pending=pending,
            upcoming=upcoming,
        )

    except Exception as e:
        logger.error("Error getting pending actions", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/ticker-mappings")
async def get_ticker_mappings(active_only: bool = Query(default=True)):
    """
    Get all ticker symbol mappings.

    Returns the list of symbol changes tracked by the system.
    """
    if not storage or not storage._pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        from corporate_actions import TickerMapper

        mapper = TickerMapper(storage._pool)
        mappings = await mapper.get_all_mappings(active_only)

        return {
            "mappings": mappings,
            "count": len(mappings),
        }

    except Exception as e:
        logger.error("Error getting ticker mappings", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ticker-mappings")
async def add_ticker_mapping(
    old_symbol: str,
    new_symbol: str,
    change_date: date,
    reason: Optional[str] = None,
):
    """
    Add a new ticker symbol mapping.

    Use this when a company changes its ticker symbol.

    Args:
        old_symbol: Previous ticker symbol
        new_symbol: New ticker symbol
        change_date: Date of the change
        reason: Optional reason for the change
    """
    if not storage or not storage._pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        from corporate_actions import TickerMapper

        mapper = TickerMapper(storage._pool)
        success = await mapper.add_mapping(old_symbol, new_symbol, change_date, reason)

        if success:
            return {
                "status": "success",
                "old_symbol": old_symbol.upper(),
                "new_symbol": new_symbol.upper(),
                "change_date": change_date.isoformat(),
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to add mapping")

    except Exception as e:
        logger.error("Error adding ticker mapping", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ticker-mappings/seed")
async def seed_ticker_mappings():
    """
    Seed the database with known ticker symbol changes.

    Populates the ticker_mapping table with common symbol changes
    like FB -> META, TWTR -> X, etc.
    """
    if not storage or not storage._pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        from corporate_actions import TickerMapper

        mapper = TickerMapper(storage._pool)
        count = await mapper.seed_known_mappings()

        return {
            "status": "success",
            "mappings_added": count,
        }

    except Exception as e:
        logger.error("Error seeding ticker mappings", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


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
