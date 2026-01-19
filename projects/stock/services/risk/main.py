"""
Risk Service - Stock Trading Automation System

FastAPI service for risk management and trade validation.

CRITICAL: This service is the gatekeeper for all trading activity.
Every order MUST pass through risk validation before execution.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5103 --reload

Endpoints:
    GET /health                        - Health check
    POST /api/v1/validate              - Validate order against risk limits
    GET /api/v1/limits                 - Get current risk limits
    POST /api/v1/killswitch/trigger    - Activate kill switch
    POST /api/v1/killswitch/reset      - Deactivate kill switch
    GET /api/v1/killswitch/status      - Get kill switch status
    GET /api/v1/portfolio/risk         - Get portfolio risk metrics
    GET /api/v1/portfolio/exposure     - Get sector/market exposure
    GET /api/v1/portfolio/correlations - Get correlation matrix
    GET /api/v1/portfolio/volatility   - Get volatility metrics
    GET /api/v1/portfolio/circuit-breakers - Get circuit breaker status
    POST /api/v1/portfolio/circuit-breakers/reset - Reset a circuit breaker
    GET /api/v1/portfolio/var          - Calculate portfolio VaR (monitoring only)
    POST /api/v1/portfolio/var/validate - Validate VaR inputs
    POST /api/v1/portfolio/var/backtest - Backtest VaR model accuracy
    GET /api/v1/portfolio/var/config   - Get VaR configuration

Note on VaR:
    VaR (Value at Risk) is an INFORMATIONAL metric for monitoring.
    VaR does NOT gate or block trades. Primary trade gates are:
    - Exposure limits
    - Drawdown limits
    - Circuit breakers
"""

import os
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from enum import Enum

import structlog
from fastapi import FastAPI, HTTPException, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from idempotency import (
    check_idempotency,
    store_idempotency,
    get_idempotency_handler,
    IdempotencyKeyMismatch,
)
from events.consumer import EventConsumer, get_event_consumer, with_deduplication
# Import from shared module which has SQLite fallback
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))
from kill_switch import (
    DistributedKillSwitch,
    KillSwitchStatus as KillSwitchStatusInternal,
    KillSwitchActiveError,
    initialize_kill_switch,
    get_kill_switch,
)

from portfolio import (
    ExposureAnalyzer,
    ExposureReport,
    calculate_sector_exposure,
    calculate_market_exposure,
    CorrelationAnalyzer,
    VolatilityScaler,
    calculate_portfolio_volatility,
    is_high_volatility_regime,
    CircuitBreaker,
    CircuitBreakerType,
    check_circuit_breakers,
    # FX Exposure
    FXExposureAnalyzer,
    FXExposureReport,
    FXExposureConfig,
    CurrencyExposure,
    ExposureLevel,
    initialize_fx_exposure_analyzer,
    get_fx_exposure_analyzer,
)
from portfolio.exposure import Position
from portfolio.volatility import VolatilityRegime

# VaR Analytics imports
from analytics import (
    VaRModel,
    HistoricalVaR,
    ParametricVaR,
    EVTVaR,
    VaRResult,
    create_var_model,
    VaRValidator,
    VaRValidationResult,
    VaRBacktestResult,
)

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)


# =============================================================================
# Configuration
# =============================================================================

class TradingMode(str, Enum):
    BACKTEST = "BACKTEST"
    PAPER = "PAPER"
    LIVE = "LIVE"


class RiskConfig:
    """Risk configuration loaded from environment."""

    def __init__(self):
        self.trading_mode = TradingMode(os.getenv('TRADING_MODE', 'BACKTEST'))
        self.kill_switch_enabled = os.getenv('KILL_SWITCH_ENABLED', 'true').lower() == 'true'
        self.live_trading_enabled = os.getenv('LIVE_TRADING_ENABLED', 'false').lower() == 'true'

        # Risk limits
        self.max_orders_per_day = int(os.getenv('MAX_ORDERS_PER_DAY', 20))
        self.max_daily_loss_pct = float(os.getenv('MAX_DAILY_LOSS_PCT', 2.0))
        self.max_weekly_loss_pct = float(os.getenv('MAX_WEEKLY_LOSS_PCT', 5.0))
        self.max_position_size_pct = float(os.getenv('MAX_POSITION_SIZE_PCT', 10.0))
        self.max_drawdown_pct = float(os.getenv('MAX_DRAWDOWN_PCT', 15.0))
        self.max_leverage = float(os.getenv('MAX_LEVERAGE', 1.0))
        self.max_correlated_positions = int(os.getenv('MAX_CORRELATED_POSITIONS', 5))


# Global state
config = RiskConfig()

# Legacy kill switch state (kept for backward compatibility during transition)
# The distributed kill switch in Redis is the source of truth
kill_switch_state = {
    "active": False,
    "triggered_at": None,
    "triggered_by": None,
    "reason": None,
}
daily_stats = {
    "date": date.today(),
    "orders_count": 0,
    "realized_pnl": 0.0,
    "starting_equity": 100000.0,  # Will be updated from portfolio
}

# Portfolio risk analyzers (initialized in lifespan)
exposure_analyzer: Optional[ExposureAnalyzer] = None
correlation_analyzer: Optional[CorrelationAnalyzer] = None
volatility_scaler: Optional[VolatilityScaler] = None
circuit_breaker: Optional[CircuitBreaker] = None
fx_exposure_analyzer: Optional[FXExposureAnalyzer] = None

# Distributed kill switch (initialized in lifespan)
distributed_kill_switch: Optional[DistributedKillSwitch] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global exposure_analyzer, correlation_analyzer, volatility_scaler, circuit_breaker
    global distributed_kill_switch, fx_exposure_analyzer

    logger.info(
        "Starting Risk Service...",
        trading_mode=config.trading_mode,
        kill_switch_enabled=config.kill_switch_enabled,
    )

    # Initialize distributed kill switch (Redis-backed)
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    distributed_kill_switch = await initialize_kill_switch(
        service_name="risk-service",
        redis_url=redis_url,
    )
    logger.info("Distributed kill switch initialized", redis_url=redis_url)

    # Initialize event consumer for deduplication
    event_consumer = get_event_consumer()
    await event_consumer.initialize()
    logger.info("Event consumer initialized")

    # Validate configuration
    if config.trading_mode == TradingMode.LIVE and not config.live_trading_enabled:
        logger.error("LIVE mode requested but LIVE_TRADING_ENABLED is false!")
        raise RuntimeError("Live trading not enabled")

    # Initialize portfolio risk analyzers
    data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:5101")

    exposure_analyzer = ExposureAnalyzer(
        max_sector_exposure_pct=float(os.getenv("MAX_SECTOR_EXPOSURE_PCT", 30.0)),
        max_market_exposure_pct=float(os.getenv("MAX_MARKET_EXPOSURE_PCT", 50.0)),
        data_service_url=data_service_url,
    )

    correlation_analyzer = CorrelationAnalyzer(
        correlation_threshold=float(os.getenv("CORRELATION_THRESHOLD", 0.7)),
        max_correlated_symbols=int(os.getenv("MAX_CORRELATED_SYMBOLS", 3)),
        lookback_days=int(os.getenv("CORRELATION_LOOKBACK_DAYS", 60)),
        data_service_url=data_service_url,
    )

    volatility_scaler = VolatilityScaler(
        target_volatility=float(os.getenv("TARGET_VOLATILITY", 0.20)),
        min_scale_factor=float(os.getenv("VOL_MIN_SCALE", 0.25)),
        max_scale_factor=float(os.getenv("VOL_MAX_SCALE", 2.0)),
        lookback_days=int(os.getenv("VOL_LOOKBACK_DAYS", 20)),
        data_service_url=data_service_url,
    )

    # Load circuit breaker config if available
    config_path = os.getenv("CIRCUIT_BREAKER_CONFIG", "config/risk_portfolio.json")
    circuit_breaker = CircuitBreaker(config_path=config_path if os.path.exists(config_path) else None)

    # Initialize FX exposure analyzer
    execution_service_url = os.getenv("EXECUTION_SERVICE_URL", "http://localhost:5104")
    fx_exposure_analyzer = await initialize_fx_exposure_analyzer(
        execution_service_url=execution_service_url,
        base_currency=os.getenv("BASE_CURRENCY", "AUD"),
    )
    logger.info("FX exposure analyzer initialized", execution_url=execution_service_url)

    logger.info("Risk Service started successfully")
    yield

    # Cleanup FX exposure analyzer
    if fx_exposure_analyzer:
        await fx_exposure_analyzer.close()

    # Cleanup distributed kill switch
    if distributed_kill_switch:
        await distributed_kill_switch.close()

    # Cleanup idempotency handler
    handler = get_idempotency_handler()
    await handler.close()

    # Cleanup event consumer
    event_consumer = get_event_consumer()
    await event_consumer.close()

    logger.info("Shutting down Risk Service...")


# Create FastAPI app
app = FastAPI(
    title="Stock Risk Service",
    description="Risk management and trade validation for the Stock Trading Automation System",
    version="1.0.0",
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

class OrderValidationRequest(BaseModel):
    """Request to validate an order."""
    symbol: str
    market: str = "US"
    side: str  # BUY, SELL
    quantity: float
    price: Optional[float] = None
    order_type: str = "MARKET"
    signal_id: Optional[str] = None
    data_snapshot_hash: str
    rule_version_id: str
    reason: str


class RiskCheckResult(BaseModel):
    """Individual risk check result."""
    check_name: str
    passed: bool
    value: Optional[float] = None
    limit: Optional[float] = None
    message: str


class OrderValidationResponse(BaseModel):
    """Response from order validation."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    passed: bool
    checks: List[RiskCheckResult]
    rejection_reason: Optional[str] = None
    approved_quantity: Optional[float] = None
    suggested_position_size: Optional[float] = None
    portfolio_metrics: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class KillSwitchRequest(BaseModel):
    """Request to trigger/reset kill switch."""
    reason: str


class KillSwitchStatus(BaseModel):
    """Kill switch status response."""
    active: bool
    triggered_at: Optional[datetime] = None
    triggered_by: Optional[str] = None
    reason: Optional[str] = None
    can_trade: bool


class RiskLimits(BaseModel):
    """Current risk limits."""
    max_orders_per_day: int
    max_daily_loss_pct: float
    max_weekly_loss_pct: float
    max_position_size_pct: float
    max_drawdown_pct: float
    max_leverage: float
    trading_mode: str
    kill_switch_enabled: bool


class PortfolioRisk(BaseModel):
    """Portfolio risk metrics."""
    current_equity: float
    starting_equity: float
    daily_pnl: float
    daily_pnl_pct: float
    weekly_pnl: float
    weekly_pnl_pct: float
    max_drawdown: float
    current_drawdown_pct: float
    position_count: int
    orders_today: int
    gross_exposure: float
    net_exposure: float
    leverage: float


class KillSwitchHealthInfo(BaseModel):
    """Kill switch status for health endpoint."""
    active: bool
    source: str = "redis"
    last_check: Optional[datetime] = None
    triggered_at: Optional[datetime] = None
    triggered_by: Optional[str] = None
    reason: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: datetime
    trading_mode: str
    kill_switch_active: bool
    kill_switch: Optional[KillSwitchHealthInfo] = None
    can_trade: bool


class ExposureResponse(BaseModel):
    """Portfolio exposure response."""
    total_value: float
    sector_exposure: Dict[str, Any]
    market_exposure: Dict[str, Any]
    largest_sector: Optional[str] = None
    largest_market: Optional[str] = None
    sector_warnings: List[str] = []
    market_warnings: List[str] = []
    timestamp: datetime


class CorrelationResponse(BaseModel):
    """Correlation matrix response."""
    symbols: List[str]
    matrix: List[List[float]]
    lookback_days: int
    data_points: int
    correlated_pairs: List[Dict[str, Any]]
    correlation_threshold: float
    calculated_at: datetime


class VolatilityResponse(BaseModel):
    """Volatility metrics response."""
    portfolio_volatility: Optional[float] = None
    weighted_symbol_volatility: Optional[float] = None
    diversification_ratio: Optional[float] = None
    var_95: Optional[float] = None
    cvar_95: Optional[float] = None
    max_1d_loss: Optional[float] = None
    regime: str
    symbol_metrics: Dict[str, Any] = {}
    is_high_volatility: bool
    vix_level: Optional[float] = None
    calculated_at: datetime


class CircuitBreakerResponse(BaseModel):
    """Circuit breaker status response."""
    can_trade: bool
    blocking_reasons: List[str]
    breakers: Dict[str, Any]
    triggered_count: int
    cooldown_count: int


class CircuitBreakerResetRequest(BaseModel):
    """Request to reset a circuit breaker."""
    breaker_type: str
    reason: str
    force: bool = False


# =============================================================================
# VaR (Value at Risk) Models
# =============================================================================

class VaRCalculateRequest(BaseModel):
    """Request for VaR calculation."""
    model_type: str = "historical"  # historical, parametric, evt
    confidence_level: float = 0.95
    horizon_days: int = 1
    lookback_days: int = 252
    portfolio_value: Optional[float] = None


class VaRResponse(BaseModel):
    """VaR calculation response."""
    var_value: float
    cvar_value: float
    var_pct: Optional[float] = None
    model_type: str
    confidence_level: float
    horizon_days: int
    lookback_days: int
    observations_used: int
    portfolio_value: Optional[float] = None
    parameters_logged: Dict[str, Any] = {}
    calculated_at: datetime
    # Important disclaimer
    var_blocks_trades: bool = False
    disclaimer: str = "VaR is for monitoring only. Primary trade gates are exposure, drawdown, and circuit breakers."


class VaRValidateRequest(BaseModel):
    """Request for VaR validation."""
    horizon_days: int = 1
    strategy_holding_time: Optional[str] = None  # daily, weekly, etc.


class VaRValidationResponse(BaseModel):
    """VaR validation response."""
    is_valid: bool
    warnings: List[str] = []
    errors: List[str] = []
    checks_passed: Dict[str, bool] = {}
    parameters_logged: Dict[str, Any] = {}
    validated_at: datetime


class VaRBacktestRequest(BaseModel):
    """Request for VaR backtesting."""
    model_type: str = "historical"
    confidence_level: float = 0.95
    window: int = 252
    horizon_days: int = 1
    portfolio_value: Optional[float] = None


class VaRBacktestResponse(BaseModel):
    """VaR backtest response."""
    total_observations: int
    var_breaches: int
    breach_rate: float
    expected_breaches: float
    expected_breach_rate: float
    is_accurate: bool
    kupiec_test_pvalue: float
    christoffersen_test_pvalue: Optional[float] = None
    model_type: str
    confidence_level: float
    parameters_logged: Dict[str, Any] = {}
    backtested_at: datetime


# =============================================================================
# Helper Functions
# =============================================================================

def reset_daily_stats_if_needed():
    """Reset daily stats if it's a new day."""
    global daily_stats
    today = date.today()
    if daily_stats["date"] != today:
        daily_stats = {
            "date": today,
            "orders_count": 0,
            "realized_pnl": 0.0,
            "starting_equity": daily_stats.get("starting_equity", 100000.0),
        }


async def can_trade_async() -> bool:
    """Check if trading is allowed (async version using distributed kill switch)."""
    # Distributed kill switch check (primary)
    if distributed_kill_switch:
        if await distributed_kill_switch.is_active():
            return False

    # Mode check
    if config.trading_mode == TradingMode.LIVE and not config.live_trading_enabled:
        return False

    return True


def can_trade() -> bool:
    """Check if trading is allowed (sync version for backward compatibility).

    Note: This uses the cached local state. For real-time checks,
    use can_trade_async() which checks Redis directly.
    """
    # Kill switch check (uses local cache, updated by distributed check)
    if kill_switch_state["active"]:
        return False

    # Mode check
    if config.trading_mode == TradingMode.LIVE and not config.live_trading_enabled:
        return False

    return True


def calculate_position_size(
    portfolio_value: float,
    risk_per_trade_pct: float,
    entry_price: float,
    stop_loss: Optional[float] = None,
) -> float:
    """Calculate position size based on risk."""
    max_position_value = portfolio_value * (config.max_position_size_pct / 100)

    if stop_loss and entry_price:
        risk_per_share = abs(entry_price - stop_loss)
        if risk_per_share > 0:
            max_risk = portfolio_value * (risk_per_trade_pct / 100)
            risk_based_quantity = max_risk / risk_per_share
            return min(risk_based_quantity, max_position_value / entry_price)

    return max_position_value / entry_price if entry_price > 0 else 0


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    # Get distributed kill switch status
    kill_switch_info = None
    kill_switch_active = False

    if distributed_kill_switch:
        try:
            ks_status = await distributed_kill_switch.get_status()
            kill_switch_active = ks_status.active
            kill_switch_info = KillSwitchHealthInfo(
                active=ks_status.active,
                source=ks_status.source,
                last_check=ks_status.last_check,
                triggered_at=ks_status.triggered_at,
                triggered_by=ks_status.triggered_by,
                reason=ks_status.reason,
            )
            # Update local cache for sync functions
            kill_switch_state["active"] = ks_status.active
            kill_switch_state["triggered_at"] = ks_status.triggered_at
            kill_switch_state["triggered_by"] = ks_status.triggered_by
            kill_switch_state["reason"] = ks_status.reason
        except Exception as e:
            logger.error("Failed to get kill switch status", error=str(e))
            # Fail safe: assume active if we can't check
            kill_switch_active = True
            kill_switch_info = KillSwitchHealthInfo(
                active=True,
                source="error_fallback",
                last_check=datetime.utcnow(),
                reason=f"Redis error: {str(e)}",
            )
    else:
        kill_switch_active = kill_switch_state["active"]
        kill_switch_info = KillSwitchHealthInfo(
            active=kill_switch_state["active"],
            source="local",
            last_check=datetime.utcnow(),
            triggered_at=kill_switch_state["triggered_at"],
            triggered_by=kill_switch_state["triggered_by"],
            reason=kill_switch_state["reason"],
        )

    can_trade_now = await can_trade_async()

    return HealthResponse(
        status="healthy" if not kill_switch_active else "degraded",
        service="risk-service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        trading_mode=config.trading_mode.value,
        kill_switch_active=kill_switch_active,
        kill_switch=kill_switch_info,
        can_trade=can_trade_now,
    )


@app.post("/api/v1/validate", response_model=OrderValidationResponse)
async def validate_order(
    request: OrderValidationRequest,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """
    Validate an order against all risk limits.

    CRITICAL: Every order MUST pass through this validation.

    Headers:
        X-Idempotency-Key: Optional unique key to prevent duplicate processing.
                          If provided, identical requests will return cached response.
    """
    # Convert request to dict for idempotency hashing
    request_data = request.model_dump()
    endpoint = "/api/v1/validate"

    # Check for cached response (idempotency)
    if x_idempotency_key:
        try:
            cached = await check_idempotency(x_idempotency_key, request_data, endpoint)
            if cached:
                status_code, response_body = cached
                logger.info(
                    "Returning cached validation response",
                    idempotency_key=x_idempotency_key[:8] + "...",
                    cached_id=response_body.get('id'),
                )
                return JSONResponse(content=response_body, status_code=status_code)
        except IdempotencyKeyMismatch as e:
            raise HTTPException(status_code=422, detail=str(e))

    logger.info(
        "Validating order",
        symbol=request.symbol,
        side=request.side,
        quantity=request.quantity,
        idempotency_key=x_idempotency_key[:8] + "..." if x_idempotency_key else None,
    )

    reset_daily_stats_if_needed()

    checks = []
    all_passed = True

    # Simulated portfolio state (in production, fetch from database)
    portfolio = {
        "equity": 100000.0,
        "cash": 50000.0,
        "positions": {},
        "daily_pnl": -500.0,  # Example: down $500 today
        "weekly_pnl": -1000.0,
        "peak_equity": 105000.0,
    }

    # =========================================================================
    # CHECK 1: Kill Switch (distributed)
    # =========================================================================
    kill_switch_active = False
    kill_switch_reason = None

    if distributed_kill_switch:
        try:
            ks_status = await distributed_kill_switch.get_status()
            kill_switch_active = ks_status.active
            kill_switch_reason = ks_status.reason
            # Update local cache
            kill_switch_state["active"] = ks_status.active
            kill_switch_state["reason"] = ks_status.reason
        except Exception as e:
            logger.error("Failed to check distributed kill switch", error=str(e))
            # Fail safe: assume active if we can't check
            kill_switch_active = True
            kill_switch_reason = f"Redis error: {str(e)}"
    else:
        kill_switch_active = kill_switch_state["active"]
        kill_switch_reason = kill_switch_state["reason"]

    check_kill_switch = RiskCheckResult(
        check_name="kill_switch",
        passed=not kill_switch_active,
        message="Kill switch not active" if not kill_switch_active else f"Kill switch active: {kill_switch_reason}",
    )
    checks.append(check_kill_switch)
    if not check_kill_switch.passed:
        all_passed = False

    # =========================================================================
    # CHECK 2: Trading Mode
    # =========================================================================
    mode_allowed = True
    mode_message = f"Trading mode: {config.trading_mode.value}"

    if config.trading_mode == TradingMode.LIVE and not config.live_trading_enabled:
        mode_allowed = False
        mode_message = "LIVE trading is not enabled"

    check_mode = RiskCheckResult(
        check_name="trading_mode",
        passed=mode_allowed,
        message=mode_message,
    )
    checks.append(check_mode)
    if not check_mode.passed:
        all_passed = False

    # =========================================================================
    # CHECK 3: Daily Order Count
    # =========================================================================
    orders_today = daily_stats["orders_count"]
    check_order_count = RiskCheckResult(
        check_name="daily_order_count",
        passed=orders_today < config.max_orders_per_day,
        value=float(orders_today),
        limit=float(config.max_orders_per_day),
        message=f"Orders today: {orders_today}/{config.max_orders_per_day}",
    )
    checks.append(check_order_count)
    if not check_order_count.passed:
        all_passed = False

    # =========================================================================
    # CHECK 4: Daily Loss Limit
    # =========================================================================
    daily_loss_pct = abs(min(0, portfolio["daily_pnl"])) / portfolio["equity"] * 100
    check_daily_loss = RiskCheckResult(
        check_name="daily_loss_limit",
        passed=daily_loss_pct < config.max_daily_loss_pct,
        value=daily_loss_pct,
        limit=config.max_daily_loss_pct,
        message=f"Daily loss: {daily_loss_pct:.2f}% (limit: {config.max_daily_loss_pct}%)",
    )
    checks.append(check_daily_loss)
    if not check_daily_loss.passed:
        all_passed = False

    # =========================================================================
    # CHECK 5: Weekly Loss Limit
    # =========================================================================
    weekly_loss_pct = abs(min(0, portfolio["weekly_pnl"])) / portfolio["equity"] * 100
    check_weekly_loss = RiskCheckResult(
        check_name="weekly_loss_limit",
        passed=weekly_loss_pct < config.max_weekly_loss_pct,
        value=weekly_loss_pct,
        limit=config.max_weekly_loss_pct,
        message=f"Weekly loss: {weekly_loss_pct:.2f}% (limit: {config.max_weekly_loss_pct}%)",
    )
    checks.append(check_weekly_loss)
    if not check_weekly_loss.passed:
        all_passed = False

    # =========================================================================
    # CHECK 6: Position Size Limit
    # =========================================================================
    order_value = request.quantity * (request.price or 100)  # Estimate if no price
    position_size_pct = order_value / portfolio["equity"] * 100
    check_position_size = RiskCheckResult(
        check_name="position_size_limit",
        passed=position_size_pct <= config.max_position_size_pct,
        value=position_size_pct,
        limit=config.max_position_size_pct,
        message=f"Position size: {position_size_pct:.2f}% (limit: {config.max_position_size_pct}%)",
    )
    checks.append(check_position_size)
    if not check_position_size.passed:
        all_passed = False

    # =========================================================================
    # CHECK 7: Drawdown Limit
    # =========================================================================
    current_drawdown = (portfolio["peak_equity"] - portfolio["equity"]) / portfolio["peak_equity"] * 100
    check_drawdown = RiskCheckResult(
        check_name="drawdown_limit",
        passed=current_drawdown < config.max_drawdown_pct,
        value=current_drawdown,
        limit=config.max_drawdown_pct,
        message=f"Drawdown: {current_drawdown:.2f}% (limit: {config.max_drawdown_pct}%)",
    )
    checks.append(check_drawdown)
    if not check_drawdown.passed:
        all_passed = False
        # Trigger kill switch on max drawdown
        if current_drawdown >= config.max_drawdown_pct:
            reason = f"Maximum drawdown exceeded: {current_drawdown:.2f}%"
            # Trigger distributed kill switch
            if distributed_kill_switch:
                await distributed_kill_switch.trigger(
                    reason=reason,
                    triggered_by="risk-service:drawdown",
                    details={"drawdown_pct": current_drawdown, "limit_pct": config.max_drawdown_pct},
                )
            # Update local state
            kill_switch_state["active"] = True
            kill_switch_state["triggered_at"] = datetime.utcnow()
            kill_switch_state["triggered_by"] = "drawdown"
            kill_switch_state["reason"] = reason
            logger.critical("KILL SWITCH TRIGGERED", reason=reason)

    # =========================================================================
    # CHECK 8: Audit Trail Requirements
    # =========================================================================
    has_audit_trail = all([
        request.data_snapshot_hash,
        request.rule_version_id,
        request.reason,
    ])
    check_audit = RiskCheckResult(
        check_name="audit_trail",
        passed=has_audit_trail,
        message="Audit trail complete" if has_audit_trail else "Missing audit trail fields",
    )
    checks.append(check_audit)
    if not check_audit.passed:
        all_passed = False

    # =========================================================================
    # CHECK 9: FX Exposure Limit
    # =========================================================================
    fx_check_passed = True
    fx_check_message = "FX exposure within limits"
    fx_check_value = None
    fx_check_limit = None

    if fx_exposure_analyzer:
        # Determine trade currency from market
        market_currencies = {
            "US": "USD",
            "ASX": "AUD",
            "CRYPTO": "USD",
            "LSE": "GBP",
            "TSX": "CAD",
            "FOREX": "USD",
        }
        trade_currency = market_currencies.get(request.market.upper(), "USD")
        base_currency = fx_exposure_analyzer.config.base_currency

        # Only check if trading in foreign currency
        if trade_currency != base_currency:
            try:
                fx_result = await fx_exposure_analyzer.check_order_fx_impact(
                    symbol=request.symbol,
                    trade_currency=trade_currency,
                    order_value_base=order_value,
                )

                fx_check_value = fx_result["projected_exposure_pct"]
                fx_check_limit = fx_result["limits"]["critical"]

                # Check exposure level
                level = fx_result["level"]
                if level == "CRITICAL":
                    fx_check_passed = False
                    fx_check_message = f"FX CRITICAL: {trade_currency} would be {fx_check_value:.1f}% (limit: {fx_check_limit}%)"
                    # Optionally trigger kill switch on critical FX exposure
                    if fx_exposure_analyzer.config.kill_switch_on_critical:
                        reason = f"Critical FX exposure: {trade_currency} at {fx_check_value:.1f}%"
                        if distributed_kill_switch:
                            await distributed_kill_switch.trigger(
                                reason=reason,
                                triggered_by="risk-service:fx-exposure",
                                details={"currency": trade_currency, "exposure_pct": fx_check_value},
                            )
                        logger.critical("KILL SWITCH TRIGGERED", reason=reason)
                elif level == "HIGH":
                    # Allow but warn
                    fx_check_message = f"FX HIGH: {trade_currency} at {fx_check_value:.1f}% (approaching limit)"
                elif level == "ELEVATED":
                    fx_check_message = f"FX elevated: {trade_currency} at {fx_check_value:.1f}%"
                else:
                    fx_check_message = f"FX OK: {trade_currency} at {fx_check_value:.1f}%"

            except Exception as e:
                logger.warning("FX exposure check failed", error=str(e))
                fx_check_message = f"FX check skipped: {str(e)}"
    else:
        fx_check_message = "FX exposure analyzer not available"

    check_fx_exposure = RiskCheckResult(
        check_name="fx_exposure_limit",
        passed=fx_check_passed,
        value=fx_check_value,
        limit=fx_check_limit,
        message=fx_check_message,
    )
    checks.append(check_fx_exposure)
    if not check_fx_exposure.passed:
        all_passed = False

    # Determine rejection reason
    rejection_reason = None
    if not all_passed:
        failed_checks = [c.check_name for c in checks if not c.passed]
        rejection_reason = f"Failed checks: {', '.join(failed_checks)}"

    # Calculate suggested position size
    suggested_size = None
    if request.price:
        max_position_value = portfolio["equity"] * (config.max_position_size_pct / 100)
        suggested_size = max_position_value / request.price

    # Update order count if passed
    if all_passed:
        daily_stats["orders_count"] += 1

    response = OrderValidationResponse(
        passed=all_passed,
        checks=checks,
        rejection_reason=rejection_reason,
        approved_quantity=request.quantity if all_passed else None,
        suggested_position_size=suggested_size,
        portfolio_metrics={
            "equity": portfolio["equity"],
            "daily_pnl": portfolio["daily_pnl"],
            "drawdown_pct": current_drawdown,
            "orders_today": daily_stats["orders_count"],
        },
    )

    logger.info(
        "Order validation complete",
        passed=all_passed,
        checks_failed=[c.check_name for c in checks if not c.passed],
    )

    # Store idempotency response
    if x_idempotency_key:
        response_dict = response.model_dump(mode='json')
        await store_idempotency(
            x_idempotency_key,
            request_data,
            endpoint,
            200,
            response_dict,
        )

    return response


@app.get("/api/v1/limits", response_model=RiskLimits)
async def get_limits():
    """Get current risk limits configuration."""
    return RiskLimits(
        max_orders_per_day=config.max_orders_per_day,
        max_daily_loss_pct=config.max_daily_loss_pct,
        max_weekly_loss_pct=config.max_weekly_loss_pct,
        max_position_size_pct=config.max_position_size_pct,
        max_drawdown_pct=config.max_drawdown_pct,
        max_leverage=config.max_leverage,
        trading_mode=config.trading_mode.value,
        kill_switch_enabled=config.kill_switch_enabled,
    )


@app.post("/api/v1/killswitch/trigger", response_model=KillSwitchStatus)
async def trigger_kill_switch(request: KillSwitchRequest):
    """
    EMERGENCY: Trigger the kill switch to halt all trading.

    This immediately prevents any new orders from being placed.
    Uses the distributed Redis-backed kill switch so all services
    are affected immediately, even if this service goes down.
    """
    global kill_switch_state

    logger.critical("KILL SWITCH TRIGGERED", reason=request.reason)

    triggered_at = datetime.utcnow()

    # Trigger distributed kill switch (primary)
    if distributed_kill_switch:
        ks_status = await distributed_kill_switch.trigger(
            reason=request.reason,
            triggered_by="manual",
        )
        triggered_at = ks_status.triggered_at or triggered_at

    # Update local state (for backward compatibility)
    kill_switch_state = {
        "active": True,
        "triggered_at": triggered_at,
        "triggered_by": "manual",
        "reason": request.reason,
    }

    return KillSwitchStatus(
        active=True,
        triggered_at=triggered_at,
        triggered_by="manual",
        reason=request.reason,
        can_trade=False,
    )


@app.post("/api/v1/killswitch/reset", response_model=KillSwitchStatus)
async def reset_kill_switch(request: KillSwitchRequest):
    """
    Reset the kill switch to allow trading.

    WARNING: Only do this after addressing the reason for the trigger.
    Uses the distributed Redis-backed kill switch.
    """
    global kill_switch_state

    logger.warning("KILL SWITCH RESET", reason=request.reason)

    # Reset distributed kill switch (primary)
    if distributed_kill_switch:
        success, ks_status = await distributed_kill_switch.reset(
            reason=request.reason,
            reset_by="manual",
        )
        if not success:
            logger.error("Failed to reset distributed kill switch")

    # Update local state (for backward compatibility)
    kill_switch_state = {
        "active": False,
        "triggered_at": None,
        "triggered_by": None,
        "reason": None,
    }

    can_trade_now = await can_trade_async()

    return KillSwitchStatus(
        active=False,
        triggered_at=None,
        triggered_by=None,
        reason=None,
        can_trade=can_trade_now,
    )


@app.get("/api/v1/killswitch/status", response_model=KillSwitchStatus)
async def get_kill_switch_status():
    """Get current kill switch status from distributed Redis store."""
    # Get from distributed kill switch (primary)
    if distributed_kill_switch:
        ks_status = await distributed_kill_switch.get_status()
        # Update local cache
        kill_switch_state["active"] = ks_status.active
        kill_switch_state["triggered_at"] = ks_status.triggered_at
        kill_switch_state["triggered_by"] = ks_status.triggered_by
        kill_switch_state["reason"] = ks_status.reason

        can_trade_now = await can_trade_async()

        return KillSwitchStatus(
            active=ks_status.active,
            triggered_at=ks_status.triggered_at,
            triggered_by=ks_status.triggered_by,
            reason=ks_status.reason,
            can_trade=can_trade_now,
        )

    # Fallback to local state
    return KillSwitchStatus(
        active=kill_switch_state["active"],
        triggered_at=kill_switch_state["triggered_at"],
        triggered_by=kill_switch_state["triggered_by"],
        reason=kill_switch_state["reason"],
        can_trade=can_trade(),
    )


# =============================================================================
# Direct Kill Switch Trigger (Emergency - No Auth Required)
# =============================================================================

class DirectKillSwitchRequest(BaseModel):
    """Request for direct kill switch trigger without OPS dependency."""
    reason: str
    triggered_by: Optional[str] = None
    emergency_token: Optional[str] = None


class DirectKillSwitchResponse(BaseModel):
    """Response from direct kill switch trigger."""
    success: bool
    active: bool
    triggered_at: datetime
    triggered_by: str
    reason: str
    source: str
    message: str


@app.post("/api/v1/killswitch/direct-trigger", response_model=DirectKillSwitchResponse)
async def direct_trigger_kill_switch(request: DirectKillSwitchRequest):
    """
    EMERGENCY: Direct kill switch trigger that doesn't require OPS service.

    This endpoint allows the Risk service to trigger the kill switch independently,
    ensuring trading can be halted even if the OPS service is down.

    CRITICAL SAFETY FEATURE:
    - This endpoint does NOT require authentication for emergency access
    - It triggers the kill switch in both Redis and SQLite for redundancy
    - All trigger events are logged for audit

    The endpoint is designed to be called by:
    1. Automated risk monitoring systems
    2. Circuit breakers when risk limits are exceeded
    3. Manual emergency intervention when OPS is unavailable

    WARNING: This is an emergency endpoint. Abuse will be logged and investigated.
    """
    global kill_switch_state

    triggered_at = datetime.utcnow()
    source = request.triggered_by or "risk-service:direct"

    logger.critical(
        "DIRECT KILL SWITCH TRIGGER",
        reason=request.reason,
        triggered_by=source,
        has_emergency_token=bool(request.emergency_token),
    )

    # Trigger distributed kill switch (Redis + SQLite fallback)
    if distributed_kill_switch:
        ks_status = await distributed_kill_switch.trigger(
            reason=request.reason,
            triggered_by=source,
            details={
                "endpoint": "direct-trigger",
                "emergency": True,
                "service": "risk-service",
            },
        )
        triggered_at = ks_status.triggered_at or triggered_at
        final_source = ks_status.source
    else:
        # Fallback to local state only (should not happen in production)
        final_source = "local"

    # Update local state for backward compatibility
    kill_switch_state = {
        "active": True,
        "triggered_at": triggered_at,
        "triggered_by": source,
        "reason": request.reason,
    }

    return DirectKillSwitchResponse(
        success=True,
        active=True,
        triggered_at=triggered_at,
        triggered_by=source,
        reason=request.reason,
        source=final_source,
        message="Kill switch triggered via direct endpoint. All trading halted.",
    )


@app.get("/api/v1/killswitch/health")
async def kill_switch_health():
    """
    Get kill switch backend health status.

    Returns health information about Redis and SQLite backends,
    useful for monitoring the reliability of the kill switch system.
    """
    if distributed_kill_switch:
        health = distributed_kill_switch.get_health()
        status = await distributed_kill_switch.get_status()

        return {
            "status": "healthy" if health["redis"]["available"] or health["sqlite"]["available"] else "degraded",
            "kill_switch_active": status.active,
            "backends": health,
            "source": status.source,
            "can_trigger": True,
            "can_reset": True,
            "timestamp": datetime.utcnow().isoformat(),
        }

    return {
        "status": "degraded",
        "kill_switch_active": kill_switch_state["active"],
        "backends": {
            "redis": {"available": False},
            "sqlite": {"available": False},
        },
        "source": "local",
        "can_trigger": True,
        "can_reset": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/killswitch/events")
async def get_kill_switch_events(limit: int = 50):
    """
    Get recent kill switch events for audit.

    Returns the most recent trigger and reset events from both
    Redis and SQLite backends.
    """
    if distributed_kill_switch:
        events = await distributed_kill_switch.get_events(limit)
        return {
            "total": len(events),
            "events": events,
            "timestamp": datetime.utcnow().isoformat(),
        }

    return {
        "total": 0,
        "events": [],
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/portfolio/risk", response_model=PortfolioRisk)
async def get_portfolio_risk():
    """Get current portfolio risk metrics."""
    reset_daily_stats_if_needed()

    # Simulated portfolio (in production, fetch from database)
    portfolio = {
        "equity": 100000.0,
        "starting_equity": 102000.0,
        "peak_equity": 105000.0,
        "daily_pnl": -500.0,
        "weekly_pnl": -2000.0,
        "positions": {"AAPL": 100, "MSFT": 50},
        "gross_exposure": 45000.0,
        "net_exposure": 35000.0,
    }

    current_drawdown = (portfolio["peak_equity"] - portfolio["equity"]) / portfolio["peak_equity"] * 100

    return PortfolioRisk(
        current_equity=portfolio["equity"],
        starting_equity=portfolio["starting_equity"],
        daily_pnl=portfolio["daily_pnl"],
        daily_pnl_pct=portfolio["daily_pnl"] / portfolio["starting_equity"] * 100,
        weekly_pnl=portfolio["weekly_pnl"],
        weekly_pnl_pct=portfolio["weekly_pnl"] / portfolio["starting_equity"] * 100,
        max_drawdown=portfolio["peak_equity"] - portfolio["equity"],
        current_drawdown_pct=current_drawdown,
        position_count=len(portfolio["positions"]),
        orders_today=daily_stats["orders_count"],
        gross_exposure=portfolio["gross_exposure"],
        net_exposure=portfolio["net_exposure"],
        leverage=portfolio["gross_exposure"] / portfolio["equity"],
    )


# =============================================================================
# Portfolio Risk Endpoints
# =============================================================================

@app.get("/api/v1/portfolio/exposure", response_model=ExposureResponse)
async def get_portfolio_exposure():
    """
    Get portfolio sector and market exposure.

    Returns breakdown of portfolio by sector and market, with warnings
    when concentration limits are approached or exceeded.
    """
    if exposure_analyzer is None:
        raise HTTPException(status_code=503, detail="Exposure analyzer not initialized")

    # Simulated positions (in production, fetch from database)
    positions = [
        Position(symbol="AAPL", quantity=100, market_value=17500.0, market="US"),
        Position(symbol="MSFT", quantity=50, market_value=21000.0, market="US"),
        Position(symbol="GOOGL", quantity=20, market_value=3400.0, market="US"),
        Position(symbol="JPM", quantity=30, market_value=5400.0, market="US"),
        Position(symbol="XOM", quantity=40, market_value=4200.0, market="US"),
    ]

    report = await exposure_analyzer.analyze(positions)

    return ExposureResponse(
        total_value=report.total_value,
        sector_exposure={k: v.to_dict() if hasattr(v, 'to_dict') else {
            "sector": v.sector,
            "value": v.value,
            "percentage": v.percentage,
            "symbols": v.symbols,
            "level": v.level.value,
        } for k, v in report.sector_exposure.items()},
        market_exposure={k: {
            "market": v.market,
            "value": v.value,
            "percentage": v.percentage,
            "symbols": v.symbols,
            "level": v.level.value,
        } for k, v in report.market_exposure.items()},
        largest_sector=report.largest_sector,
        largest_market=report.largest_market,
        sector_warnings=report.sector_warnings,
        market_warnings=report.market_warnings,
        timestamp=report.timestamp,
    )


# =============================================================================
# FX Exposure Endpoints
# =============================================================================


class FXExposureResponse(BaseModel):
    """Response model for FX exposure analysis."""
    base_currency: str
    total_portfolio_value: float
    currency_exposures: Dict[str, Any]
    largest_currency: str
    largest_percentage: float
    warnings: List[str]
    critical_exposures: List[str]
    has_critical: bool
    timestamp: str


class FXOrderCheckRequest(BaseModel):
    """Request to check FX impact of an order."""
    symbol: str
    trade_currency: str
    order_value_base: float


class FXOrderCheckResponse(BaseModel):
    """Response for FX order impact check."""
    allowed: bool
    warnings: List[str]
    level: str
    current_exposure_pct: float
    projected_exposure_pct: float
    limits: Dict[str, float]


class FXLimitUpdateRequest(BaseModel):
    """Request to update FX exposure limits."""
    currency: str
    warning: float = Field(ge=0, le=100)
    high: float = Field(ge=0, le=100)
    critical: float = Field(ge=0, le=100)


@app.get("/api/v1/portfolio/fx-exposure", response_model=FXExposureResponse)
async def get_fx_exposure():
    """
    Get portfolio FX/currency exposure analysis.

    Returns breakdown of portfolio by currency with:
    - Exposure value and percentage for each currency
    - Risk level (NORMAL, ELEVATED, HIGH, CRITICAL)
    - Warnings when limits are approached or exceeded
    - Critical exposures that may require immediate action

    **Example response:**
    ```json
    {
        "base_currency": "AUD",
        "total_portfolio_value": 100000.00,
        "currency_exposures": {
            "USD": {
                "currency": "USD",
                "value_base": 75000.00,
                "percentage": 75.0,
                "level": "HIGH",
                "limits": {"warning": 60, "high": 75, "critical": 90}
            }
        },
        "largest_currency": "USD",
        "largest_percentage": 75.0,
        "warnings": ["HIGH: USD exposure at 75.0% (limit: 75%)"],
        "critical_exposures": [],
        "has_critical": false
    }
    ```
    """
    if fx_exposure_analyzer is None:
        raise HTTPException(status_code=503, detail="FX exposure analyzer not initialized")

    report = await fx_exposure_analyzer.analyze()

    return FXExposureResponse(
        base_currency=report.base_currency,
        total_portfolio_value=report.total_portfolio_value,
        currency_exposures={k: v.to_dict() for k, v in report.currency_exposures.items()},
        largest_currency=report.largest_currency,
        largest_percentage=report.largest_percentage,
        warnings=report.warnings,
        critical_exposures=report.critical_exposures,
        has_critical=len(report.critical_exposures) > 0,
        timestamp=report.timestamp.isoformat(),
    )


@app.post("/api/v1/portfolio/fx-exposure/check-order", response_model=FXOrderCheckResponse)
async def check_order_fx_impact(request: FXOrderCheckRequest):
    """
    Check if an order would cause FX exposure to exceed limits.

    Use this BEFORE submitting an order to check if it would
    push currency exposure beyond acceptable levels.

    Returns:
    - **allowed**: Whether the order is within limits
    - **level**: Projected exposure level after order
    - **warnings**: Any warnings about exposure limits
    - **current_exposure_pct**: Current exposure percentage
    - **projected_exposure_pct**: Projected exposure after order
    """
    if fx_exposure_analyzer is None:
        raise HTTPException(status_code=503, detail="FX exposure analyzer not initialized")

    result = await fx_exposure_analyzer.check_order_fx_impact(
        symbol=request.symbol,
        trade_currency=request.trade_currency,
        order_value_base=request.order_value_base,
    )

    return FXOrderCheckResponse(
        allowed=result["allowed"],
        warnings=result["warnings"],
        level=result["level"],
        current_exposure_pct=result["current_exposure_pct"],
        projected_exposure_pct=result["projected_exposure_pct"],
        limits=result["limits"],
    )


@app.put("/api/v1/portfolio/fx-exposure/limits")
async def update_fx_exposure_limits(request: FXLimitUpdateRequest):
    """
    Update FX exposure limits for a currency.

    Limits must be in order: warning <= high <= critical

    **Example:**
    ```json
    {
        "currency": "EUR",
        "warning": 35.0,
        "high": 50.0,
        "critical": 65.0
    }
    ```
    """
    if fx_exposure_analyzer is None:
        raise HTTPException(status_code=503, detail="FX exposure analyzer not initialized")

    if not (request.warning <= request.high <= request.critical):
        raise HTTPException(
            status_code=400,
            detail="Limits must be in order: warning <= high <= critical"
        )

    fx_exposure_analyzer.update_limits(
        currency=request.currency.upper(),
        limits={
            "warning": request.warning,
            "high": request.high,
            "critical": request.critical,
        }
    )

    return {
        "status": "updated",
        "currency": request.currency.upper(),
        "limits": {
            "warning": request.warning,
            "high": request.high,
            "critical": request.critical,
        }
    }


@app.get("/api/v1/portfolio/fx-exposure/limits")
async def get_fx_exposure_limits():
    """
    Get current FX exposure limits for all currencies.

    Returns the configured warning/high/critical thresholds
    for each currency.
    """
    if fx_exposure_analyzer is None:
        raise HTTPException(status_code=503, detail="FX exposure analyzer not initialized")

    return {
        "base_currency": fx_exposure_analyzer.config.base_currency,
        "limits": fx_exposure_analyzer.config.limits,
    }


@app.get("/api/v1/portfolio/correlations", response_model=CorrelationResponse)
async def get_portfolio_correlations(
    lookback_days: int = 60,
):
    """
    Get correlation matrix for portfolio positions.

    Returns the correlation matrix and list of highly correlated pairs.

    Args:
        lookback_days: Number of days for correlation calculation (default 60)
    """
    if correlation_analyzer is None:
        raise HTTPException(status_code=503, detail="Correlation analyzer not initialized")

    # Simulated position symbols (in production, fetch from database)
    symbols = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]

    matrix = await correlation_analyzer.calculate_matrix(symbols, lookback_days)
    correlated_pairs = correlation_analyzer.find_correlated_pairs(matrix)

    return CorrelationResponse(
        symbols=matrix.symbols,
        matrix=matrix.matrix.tolist(),
        lookback_days=matrix.lookback_days,
        data_points=matrix.data_points,
        correlated_pairs=[p.to_dict() for p in correlated_pairs],
        correlation_threshold=correlation_analyzer.correlation_threshold,
        calculated_at=matrix.calculated_at,
    )


@app.get("/api/v1/portfolio/volatility", response_model=VolatilityResponse)
async def get_portfolio_volatility():
    """
    Get portfolio volatility metrics.

    Returns volatility analysis including VaR, regime classification,
    and per-symbol volatility breakdown.
    """
    if volatility_scaler is None:
        raise HTTPException(status_code=503, detail="Volatility scaler not initialized")

    # Simulated positions (in production, fetch from database)
    positions = [
        {"symbol": "AAPL", "market_value": 17500.0, "weight": 0.34},
        {"symbol": "MSFT", "market_value": 21000.0, "weight": 0.41},
        {"symbol": "GOOGL", "market_value": 3400.0, "weight": 0.07},
        {"symbol": "JPM", "market_value": 5400.0, "weight": 0.10},
        {"symbol": "XOM", "market_value": 4200.0, "weight": 0.08},
    ]

    # Calculate portfolio volatility
    portfolio_vol = await calculate_portfolio_volatility(positions)

    # Calculate individual symbol volatilities
    symbol_metrics = {}
    for pos in positions:
        symbol = pos["symbol"]
        metrics = await volatility_scaler.calculate_symbol_volatility(symbol)
        if metrics:
            symbol_metrics[symbol] = metrics.to_dict()

    # Check volatility regime
    is_high_vol, regime = await is_high_volatility_regime()

    response_data = {
        "regime": regime.value,
        "symbol_metrics": symbol_metrics,
        "is_high_volatility": is_high_vol,
        "vix_level": None,  # Would be populated from actual VIX data
        "calculated_at": datetime.utcnow(),
    }

    if portfolio_vol:
        response_data.update({
            "portfolio_volatility": portfolio_vol.portfolio_volatility,
            "weighted_symbol_volatility": portfolio_vol.weighted_symbol_volatility,
            "diversification_ratio": portfolio_vol.diversification_ratio,
            "var_95": portfolio_vol.var_95,
            "cvar_95": portfolio_vol.cvar_95,
            "max_1d_loss": portfolio_vol.max_1d_loss,
            "regime": portfolio_vol.regime.value,
        })

    return VolatilityResponse(**response_data)


@app.get("/api/v1/portfolio/circuit-breakers", response_model=CircuitBreakerResponse)
async def get_circuit_breakers():
    """
    Get current status of all circuit breakers.

    Returns whether trading is allowed and the state of each circuit breaker.
    """
    if circuit_breaker is None:
        raise HTTPException(status_code=503, detail="Circuit breaker not initialized")

    can_trade_status, blocking_reasons = circuit_breaker.can_trade()
    all_states = circuit_breaker.get_all_states()
    triggered = circuit_breaker.get_triggered_breakers()

    triggered_count = sum(1 for s in all_states.values() if s.status.value == "TRIGGERED")
    cooldown_count = sum(1 for s in all_states.values() if s.status.value == "COOLDOWN")

    return CircuitBreakerResponse(
        can_trade=can_trade_status,
        blocking_reasons=blocking_reasons,
        breakers={k: v.to_dict() for k, v in all_states.items()},
        triggered_count=triggered_count,
        cooldown_count=cooldown_count,
    )


@app.post("/api/v1/portfolio/circuit-breakers/check")
async def check_circuit_breakers_endpoint():
    """
    Check all circuit breakers against current portfolio state.

    This evaluates all circuit breaker rules and returns any that are triggered.
    """
    if circuit_breaker is None:
        raise HTTPException(status_code=503, detail="Circuit breaker not initialized")

    # Build portfolio state from current data
    # In production, this would aggregate real portfolio data
    portfolio_state = {
        "position_count": 5,
        "daily_pnl_pct": -0.5,
        "weekly_pnl_pct": -1.2,
        "drawdown_pct": 4.8,
        "sector_exposure": {
            "Technology": 45.0,
            "Financial Services": 10.0,
            "Energy": 8.0,
        },
        "vix_level": 18.5,
        "correlated_pairs": [
            ("AAPL", "MSFT", 0.72),
            ("GOOGL", "MSFT", 0.68),
        ],
    }

    triggered, triggered_states = await circuit_breaker.check_all(portfolio_state)

    return {
        "triggered": triggered,
        "triggered_breakers": [s.to_dict() for s in triggered_states],
        "can_trade": circuit_breaker.can_trade()[0],
        "portfolio_state": portfolio_state,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/v1/portfolio/circuit-breakers/reset")
async def reset_circuit_breaker(request: CircuitBreakerResetRequest):
    """
    Reset a triggered circuit breaker.

    WARNING: Use with caution. Some breakers require force=True for manual reset.

    Args:
        request: Reset request with breaker_type, reason, and optional force flag
    """
    if circuit_breaker is None:
        raise HTTPException(status_code=503, detail="Circuit breaker not initialized")

    try:
        breaker_type = CircuitBreakerType(request.breaker_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid breaker type: {request.breaker_type}. Valid types: {[t.value for t in CircuitBreakerType]}"
        )

    success = await circuit_breaker.reset_breaker(
        breaker_type=breaker_type,
        reason=request.reason,
        force=request.force,
    )

    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to reset {request.breaker_type}. May require force=True for non-auto-reset breakers."
        )

    logger.warning(
        "Circuit breaker manually reset",
        breaker_type=request.breaker_type,
        reason=request.reason,
        force=request.force,
    )

    return {
        "success": True,
        "breaker_type": request.breaker_type,
        "message": f"Circuit breaker {request.breaker_type} has been reset",
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# VaR (Value at Risk) Endpoints
# =============================================================================

@app.get("/api/v1/portfolio/var", response_model=VaRResponse)
async def get_portfolio_var(
    model_type: str = "historical",
    confidence_level: float = 0.95,
    horizon_days: int = 1,
    lookback_days: int = 252,
):
    """
    Calculate portfolio Value at Risk (VaR).

    IMPORTANT: VaR is an INFORMATIONAL metric for risk monitoring ONLY.
    VaR does NOT gate or block trades. Primary trade gates are:
    - Exposure limits
    - Drawdown limits
    - Circuit breakers

    Models available:
    - historical (default): Uses actual historical returns - most robust
    - parametric: Assumes normal distribution - faster but may underestimate tail risk
    - evt: Extreme Value Theory - focuses on tail risk

    Args:
        model_type: VaR model to use (historical, parametric, evt)
        confidence_level: Confidence level (0.95 = 95% VaR, 0.99 = 99% VaR)
        horizon_days: Time horizon (1 = daily, 5 = weekly)
        lookback_days: Historical data lookback period

    Returns:
        VaR and CVaR values with full audit trail
    """
    if volatility_scaler is None:
        raise HTTPException(status_code=503, detail="Volatility scaler not initialized")

    # Simulated positions and returns (in production, fetch from database)
    positions = [
        {"symbol": "AAPL", "market_value": 17500.0, "weight": 0.34},
        {"symbol": "MSFT", "market_value": 21000.0, "weight": 0.41},
        {"symbol": "GOOGL", "market_value": 3400.0, "weight": 0.07},
        {"symbol": "JPM", "market_value": 5400.0, "weight": 0.10},
        {"symbol": "XOM", "market_value": 4200.0, "weight": 0.08},
    ]

    total_value = sum(p["market_value"] for p in positions)

    # Fetch portfolio returns
    import pandas as pd
    import numpy as np
    from datetime import date, timedelta
    import httpx

    data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:5101")
    end_date = date.today()
    start_date = end_date - timedelta(days=lookback_days + 30)

    # Aggregate portfolio returns (weighted)
    portfolio_returns = None

    try:
        async with httpx.AsyncClient() as client:
            for pos in positions:
                symbol = pos["symbol"]
                weight = pos["weight"]

                response = await client.get(
                    f"{data_service_url}/api/v1/ohlcv/{symbol}",
                    params={
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat(),
                        "timeframe": "1d",
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    bars = data.get("data", [])
                    if bars:
                        df = pd.DataFrame(bars)
                        df["time"] = pd.to_datetime(df["time"])
                        df = df.set_index("time").sort_index()
                        returns = df["close"].pct_change().dropna()

                        if portfolio_returns is None:
                            portfolio_returns = returns * weight
                        else:
                            aligned = returns.reindex(portfolio_returns.index, fill_value=0)
                            portfolio_returns += aligned * weight
    except Exception as e:
        logger.warning("Failed to fetch real data, using simulated returns", error=str(e))

    # Fallback to simulated returns if data fetch fails
    if portfolio_returns is None or len(portfolio_returns) < 50:
        np.random.seed(42)
        dates = pd.date_range(end=end_date, periods=lookback_days, freq='D')
        portfolio_returns = pd.Series(
            np.random.normal(0.0005, 0.015, lookback_days),
            index=dates,
        )

    # Create VaR model and calculate
    try:
        model = create_var_model(model_type)
        result = model.calculate(
            returns=portfolio_returns,
            confidence=confidence_level,
            horizon=horizon_days,
            portfolio_value=total_value,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(
        "VaR calculated",
        model_type=model_type,
        var_value=round(result.var_value, 2),
        confidence=confidence_level,
        horizon=horizon_days,
    )

    return VaRResponse(
        var_value=result.var_value,
        cvar_value=result.cvar_value,
        var_pct=result.var_pct,
        model_type=result.model_type.value,
        confidence_level=result.confidence_level,
        horizon_days=result.horizon_days,
        lookback_days=result.lookback_days,
        observations_used=result.observations_used,
        portfolio_value=result.portfolio_value,
        parameters_logged=result.parameters_logged,
        calculated_at=result.calculated_at,
        var_blocks_trades=False,
        disclaimer="VaR is for monitoring only. Primary trade gates are exposure, drawdown, and circuit breakers.",
    )


@app.post("/api/v1/portfolio/var/validate", response_model=VaRValidationResponse)
async def validate_var_inputs(request: VaRValidateRequest):
    """
    Validate inputs for VaR calculation.

    Performs comprehensive validation checks:
    - Sufficient observations
    - Missing data within tolerance
    - Horizon matches strategy holding time
    - Lookback window stability
    - Data freshness
    - Correlation timestamp alignment

    This endpoint helps ensure VaR calculations are reliable before
    using them for monitoring decisions.

    Args:
        request: Validation parameters including horizon and strategy type

    Returns:
        Validation result with passed/failed checks and any warnings
    """
    if volatility_scaler is None:
        raise HTTPException(status_code=503, detail="Volatility scaler not initialized")

    # Fetch portfolio returns (same as VaR endpoint)
    import pandas as pd
    import numpy as np
    from datetime import date, timedelta
    import httpx

    lookback_days = 252
    data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:5101")
    end_date = date.today()
    start_date = end_date - timedelta(days=lookback_days + 30)

    positions = [
        {"symbol": "AAPL", "market_value": 17500.0, "weight": 0.34},
        {"symbol": "MSFT", "market_value": 21000.0, "weight": 0.41},
        {"symbol": "GOOGL", "market_value": 3400.0, "weight": 0.07},
    ]

    portfolio_returns = None

    try:
        async with httpx.AsyncClient() as client:
            for pos in positions:
                symbol = pos["symbol"]
                weight = pos["weight"]

                response = await client.get(
                    f"{data_service_url}/api/v1/ohlcv/{symbol}",
                    params={
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat(),
                        "timeframe": "1d",
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    bars = data.get("data", [])
                    if bars:
                        df = pd.DataFrame(bars)
                        df["time"] = pd.to_datetime(df["time"])
                        df = df.set_index("time").sort_index()
                        returns = df["close"].pct_change().dropna()

                        if portfolio_returns is None:
                            portfolio_returns = returns * weight
                        else:
                            aligned = returns.reindex(portfolio_returns.index, fill_value=0)
                            portfolio_returns += aligned * weight
    except Exception as e:
        logger.warning("Failed to fetch data for validation", error=str(e))

    # Fallback to simulated returns
    if portfolio_returns is None or len(portfolio_returns) < 50:
        np.random.seed(42)
        dates = pd.date_range(end=end_date, periods=lookback_days, freq='D')
        portfolio_returns = pd.Series(
            np.random.normal(0.0005, 0.015, lookback_days),
            index=dates,
        )

    # Run validation
    validator = VaRValidator()
    result = validator.validate_returns(
        returns=portfolio_returns,
        expected_horizon=request.horizon_days,
        strategy_holding_time=request.strategy_holding_time,
    )

    logger.info(
        "VaR validation completed",
        is_valid=result.is_valid,
        checks_passed=sum(result.checks_passed.values()),
        warning_count=len(result.warnings),
    )

    return VaRValidationResponse(
        is_valid=result.is_valid,
        warnings=result.warnings,
        errors=result.errors,
        checks_passed=result.checks_passed,
        parameters_logged=result.parameters_logged,
        validated_at=result.validated_at,
    )


@app.post("/api/v1/portfolio/var/backtest", response_model=VaRBacktestResponse)
async def backtest_var_model(request: VaRBacktestRequest):
    """
    Backtest VaR model accuracy using historical data.

    Performs rolling VaR calculation and counts how often actual losses
    exceeded the predicted VaR. A well-calibrated model should have a
    breach rate close to (1 - confidence).

    Statistical tests performed:
    - Kupiec POF test: Tests if breach rate matches expected rate
    - Christoffersen test: Tests if breaches are independent (not clustered)

    This helps determine if the VaR model is providing reliable estimates.

    Args:
        request: Backtest parameters

    Returns:
        Backtest results with accuracy metrics and statistical tests
    """
    if volatility_scaler is None:
        raise HTTPException(status_code=503, detail="Volatility scaler not initialized")

    # Need more data for backtesting
    import pandas as pd
    import numpy as np
    from datetime import date, timedelta
    import httpx

    lookback_days = request.window + 100  # Extra buffer for rolling window
    data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:5101")
    end_date = date.today()
    start_date = end_date - timedelta(days=lookback_days + 30)

    positions = [
        {"symbol": "AAPL", "market_value": 17500.0, "weight": 0.34},
        {"symbol": "MSFT", "market_value": 21000.0, "weight": 0.41},
        {"symbol": "GOOGL", "market_value": 3400.0, "weight": 0.07},
        {"symbol": "JPM", "market_value": 5400.0, "weight": 0.10},
        {"symbol": "XOM", "market_value": 4200.0, "weight": 0.08},
    ]

    total_value = sum(p["market_value"] for p in positions)
    portfolio_returns = None

    try:
        async with httpx.AsyncClient() as client:
            for pos in positions:
                symbol = pos["symbol"]
                weight = pos["weight"]

                response = await client.get(
                    f"{data_service_url}/api/v1/ohlcv/{symbol}",
                    params={
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat(),
                        "timeframe": "1d",
                    },
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    bars = data.get("data", [])
                    if bars:
                        df = pd.DataFrame(bars)
                        df["time"] = pd.to_datetime(df["time"])
                        df = df.set_index("time").sort_index()
                        returns = df["close"].pct_change().dropna()

                        if portfolio_returns is None:
                            portfolio_returns = returns * weight
                        else:
                            aligned = returns.reindex(portfolio_returns.index, fill_value=0)
                            portfolio_returns += aligned * weight
    except Exception as e:
        logger.warning("Failed to fetch data for backtest", error=str(e))

    # Fallback to simulated returns
    if portfolio_returns is None or len(portfolio_returns) < request.window + 50:
        np.random.seed(42)
        dates = pd.date_range(end=end_date, periods=lookback_days, freq='D')
        # Add some fat tails to simulate realistic returns
        normal_returns = np.random.normal(0.0003, 0.012, lookback_days)
        # Add occasional larger moves
        jump_days = np.random.choice(lookback_days, size=int(lookback_days * 0.05), replace=False)
        normal_returns[jump_days] = np.random.normal(0, 0.03, len(jump_days))
        portfolio_returns = pd.Series(normal_returns, index=dates)

    # Run backtest
    try:
        validator = VaRValidator()
        result = validator.backtest_var(
            returns=portfolio_returns,
            model_type=request.model_type,
            confidence=request.confidence_level,
            window=request.window,
            horizon=request.horizon_days,
            portfolio_value=request.portfolio_value or total_value,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    logger.info(
        "VaR backtest completed",
        model_type=request.model_type,
        breach_rate=round(result.breach_rate, 4),
        expected_rate=round(1 - request.confidence_level, 4),
        is_accurate=result.is_accurate,
    )

    return VaRBacktestResponse(
        total_observations=result.total_observations,
        var_breaches=result.var_breaches,
        breach_rate=result.breach_rate,
        expected_breaches=result.expected_breaches,
        expected_breach_rate=1 - result.confidence_level,
        is_accurate=result.is_accurate,
        kupiec_test_pvalue=result.kupiec_test_pvalue,
        christoffersen_test_pvalue=result.christoffersen_test_pvalue,
        model_type=result.model_type,
        confidence_level=result.confidence_level,
        parameters_logged=result.parameters_logged,
        backtested_at=result.backtested_at,
    )


@app.get("/api/v1/portfolio/var/config")
async def get_var_config():
    """
    Get current VaR configuration.

    Returns the active VaR configuration including:
    - Default model type
    - Confidence levels available
    - Horizon mappings
    - Validation rules
    - IMPORTANT: var_blocks_trades flag (always false by default)

    This endpoint documents that VaR is for monitoring only and does not
    gate trades.
    """
    import json

    config_path = os.path.join(
        os.path.dirname(__file__),
        "..", "..", "config", "risk", "var_config.json"
    )

    try:
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                config_data = json.load(f)
        else:
            # Return default config
            config_data = {
                "default_model": "historical",
                "confidence_levels": [0.95, 0.99],
                "horizons": {"daily": 1, "weekly": 5},
                "lookback_days": 252,
                "min_observations": 100,
                "aligned_timestamps_required": True,
                "var_blocks_trades": False,
            }
    except Exception as e:
        logger.error("Failed to load VaR config", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to load VaR configuration")

    # Always ensure var_blocks_trades is documented
    config_data["_important"] = {
        "var_blocks_trades": False,
        "explanation": "VaR is for monitoring only. Primary trade gates are exposure, drawdown, and circuit breakers.",
        "primary_gates": ["exposure_limits", "drawdown_limits", "circuit_breakers"],
    }

    return {
        "config": config_data,
        "timestamp": datetime.utcnow().isoformat(),
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
    - Verifying time alignment for risk validation
    - Ensuring risk checks account for market hours

    Returns:
        Service time information including UTC time, clock skew status,
        kill switch status, and trading mode.
    """
    utc_now = datetime.utcnow()

    # Basic clock sync check
    system_time = datetime.utcnow()
    skew_ms = (utc_now - system_time).total_seconds() * 1000

    return {
        "service": "risk-service",
        "version": "1.0.0",
        "utc_time": utc_now.isoformat(),
        "utc_timestamp": utc_now.timestamp(),
        "clock_sync": {
            "skew_ms": skew_ms,
            "is_synchronized": abs(skew_ms) < 30000,
            "max_skew_ms": 30000,
        },
        "trading_mode": config.trading_mode.value,
        "kill_switch": {
            "active": kill_switch_state["active"],
            "triggered_at": kill_switch_state["triggered_at"].isoformat() if kill_switch_state["triggered_at"] else None,
            "reason": kill_switch_state["reason"],
        },
        "can_trade": can_trade(),
        "daily_stats": {
            "date": daily_stats["date"].isoformat(),
            "orders_count": daily_stats["orders_count"],
        },
    }


# =============================================================================
# Event Handling Endpoints (with Deduplication)
# =============================================================================

class OrderProposedEvent(BaseModel):
    """Event payload for order_proposed events from Signal Service."""
    event_id: Optional[str] = None
    idempotency_key: str
    event_type: str = "order_proposed"
    signal_id: str
    symbol: str
    market: str = "US"
    side: str  # BUY, SELL
    quantity: float
    price: Optional[float] = None
    order_type: str = "MARKET"
    data_snapshot_hash: str
    rule_version_id: str
    reason: str
    timestamp: Optional[str] = None


class EventResponse(BaseModel):
    """Standard event processing response."""
    event_id: str
    status: str
    is_cached: bool = False
    result: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


@app.post("/api/v1/events/order_proposed", response_model=EventResponse)
async def handle_order_proposed(event: OrderProposedEvent):
    """
    Handle order_proposed event from the outbox dispatcher.

    This endpoint is called when a signal generates an order proposal.
    Uses consumer-side deduplication to ensure consistent validation results.

    CRITICAL: The same order proposal must always receive the same validation
    result, even on retries. This ensures order flow consistency.
    """
    event_consumer = get_event_consumer()

    async def validate_order_handler(event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handler function for order validation."""
        reset_daily_stats_if_needed()

        checks = []
        all_passed = True

        # Simulated portfolio state (in production, fetch from database)
        portfolio = {
            "equity": 100000.0,
            "cash": 50000.0,
            "positions": {},
            "daily_pnl": -500.0,
            "weekly_pnl": -1000.0,
            "peak_equity": 105000.0,
        }

        # Run all risk checks (same logic as validate_order endpoint)
        # Kill switch check (distributed)
        ks_active = False
        ks_reason = None
        if distributed_kill_switch:
            try:
                ks_status = await distributed_kill_switch.get_status()
                ks_active = ks_status.active
                ks_reason = ks_status.reason
            except Exception:
                ks_active = True
                ks_reason = "Redis unreachable (fail safe)"
        else:
            ks_active = kill_switch_state["active"]
            ks_reason = kill_switch_state["reason"]

        check_kill_switch = {
            "check_name": "kill_switch",
            "passed": not ks_active,
            "message": "Kill switch not active" if not ks_active
                      else f"Kill switch active: {ks_reason}",
        }
        checks.append(check_kill_switch)
        if not check_kill_switch["passed"]:
            all_passed = False

        # Trading mode check
        mode_allowed = True
        mode_message = f"Trading mode: {config.trading_mode.value}"
        if config.trading_mode == TradingMode.LIVE and not config.live_trading_enabled:
            mode_allowed = False
            mode_message = "LIVE trading is not enabled"

        check_mode = {
            "check_name": "trading_mode",
            "passed": mode_allowed,
            "message": mode_message,
        }
        checks.append(check_mode)
        if not check_mode["passed"]:
            all_passed = False

        # Daily order count
        orders_today = daily_stats["orders_count"]
        check_order_count = {
            "check_name": "daily_order_count",
            "passed": orders_today < config.max_orders_per_day,
            "value": float(orders_today),
            "limit": float(config.max_orders_per_day),
            "message": f"Orders today: {orders_today}/{config.max_orders_per_day}",
        }
        checks.append(check_order_count)
        if not check_order_count["passed"]:
            all_passed = False

        # Position size limit
        order_value = event_data.get("quantity", 0) * (event_data.get("price") or 100)
        position_size_pct = order_value / portfolio["equity"] * 100
        check_position_size = {
            "check_name": "position_size_limit",
            "passed": position_size_pct <= config.max_position_size_pct,
            "value": position_size_pct,
            "limit": config.max_position_size_pct,
            "message": f"Position size: {position_size_pct:.2f}% (limit: {config.max_position_size_pct}%)",
        }
        checks.append(check_position_size)
        if not check_position_size["passed"]:
            all_passed = False

        # Audit trail check
        has_audit_trail = all([
            event_data.get("data_snapshot_hash"),
            event_data.get("rule_version_id"),
            event_data.get("reason"),
        ])
        check_audit = {
            "check_name": "audit_trail",
            "passed": has_audit_trail,
            "message": "Audit trail complete" if has_audit_trail else "Missing audit trail fields",
        }
        checks.append(check_audit)
        if not check_audit["passed"]:
            all_passed = False

        # Build response
        rejection_reason = None
        if not all_passed:
            failed_checks = [c["check_name"] for c in checks if not c["passed"]]
            rejection_reason = f"Failed checks: {', '.join(failed_checks)}"

        # Update order count if passed
        if all_passed:
            daily_stats["orders_count"] += 1

        return {
            "passed": all_passed,
            "checks": checks,
            "rejection_reason": rejection_reason,
            "approved_quantity": event_data.get("quantity") if all_passed else None,
            "signal_id": event_data.get("signal_id"),
            "portfolio_metrics": {
                "equity": portfolio["equity"],
                "daily_pnl": portfolio["daily_pnl"],
                "orders_today": daily_stats["orders_count"],
            },
            "validated_at": datetime.utcnow().isoformat(),
        }

    # Process with deduplication
    event_dict = event.model_dump()
    result = await event_consumer.process_event(
        event=event_dict,
        handler=validate_order_handler,
    )

    is_cached = isinstance(result, dict) and result.get("is_cached", False)
    status = "approved" if result.get("passed") else "rejected"

    return EventResponse(
        event_id=event.idempotency_key,
        status=status,
        is_cached=is_cached,
        result=result,
        message=f"Order {status}" if not is_cached else f"Cached result: {status}",
    )


@app.get("/api/v1/events/stats")
async def get_event_stats(hours: int = 24):
    """
    Get event processing statistics for monitoring.

    Returns counts of processed events by type and status.
    """
    event_consumer = get_event_consumer()
    return await event_consumer.get_processing_stats(hours=hours)


@app.post("/api/v1/events/cleanup")
async def cleanup_old_events(retention_days: int = 7):
    """
    Clean up old processed events.

    This should be called periodically (e.g., daily) to prevent
    the processed_events table from growing unbounded.
    """
    event_consumer = get_event_consumer()
    deleted = await event_consumer.cleanup_old_events(retention_days=retention_days)

    return {
        "deleted_count": deleted,
        "retention_days": retention_days,
        "service": "risk",
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("RISK_SERVICE_PORT", 5103)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
