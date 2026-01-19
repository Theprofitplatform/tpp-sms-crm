"""
Execution Service - Stock Trading Automation System

FastAPI service for order execution and position management.

CRITICAL: All orders MUST pass through risk validation before execution.

Features:
    - Multi-currency support with AUD as base currency
    - FX rate handling for USD/crypto trades
    - Real-time FX rate fetching from Yahoo Finance
    - FX rate caching (5 minute TTL)

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5104 --reload

Endpoints:
    GET /health                 - Health check
    POST /api/v1/orders         - Submit an order
    GET /api/v1/orders          - List orders
    GET /api/v1/orders/{id}     - Get order details
    DELETE /api/v1/orders/{id}  - Cancel order
    GET /api/v1/positions       - List positions
    GET /api/v1/trades          - List trades
    GET /api/v1/account         - Get account info
    GET /api/v1/fx/rates        - Get current FX rates
    POST /api/v1/fx/convert     - Convert between currencies
    GET /api/v1/performance     - Trading performance metrics
"""

import os
import json
import math
import statistics
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from enum import Enum

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from brokers.paper import PaperBroker
from fx import FXRateService, initialize_fx_service
from fx.accounting import (
    FXAccountingLedger,
    FXTransaction,
    FXTransactionType,
    FXGainType,
    CurrencyPosition,
    FXPnLSummary,
    PositionFXAttribution,
    get_fx_ledger,
    set_fx_ledger,
)
from idempotency import (
    check_idempotency,
    store_idempotency,
    get_idempotency_handler,
    IdempotencyKeyMismatch,
)
from events.consumer import (
    EventConsumer,
    get_event_consumer,
    with_deduplication,
    DuplicateOrderError,
)
from reconciliation import (
    PositionReconciler,
    OrderReconciler,
    ReconciliationResult,
    OrderReconciliationResult,
)
from kill_switch import (
    DistributedKillSwitch,
    KillSwitchStatus,
    KillSwitchActiveError,
    initialize_kill_switch,
    get_kill_switch,
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

# Service URLs
RISK_SERVICE_URL = os.getenv('RISK_SERVICE_URL', 'http://localhost:5103')
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:5101')

# Trading mode
TRADING_MODE = os.getenv('TRADING_MODE', 'BACKTEST')
LIVE_TRADING_ENABLED = os.getenv('LIVE_TRADING_ENABLED', 'false').lower() == 'true'

# Base currency (portfolio currency)
BASE_CURRENCY = os.getenv('BASE_CURRENCY', 'AUD')

# Global instances
broker: Optional[PaperBroker] = None
fx_service: Optional[FXRateService] = None
fx_ledger: Optional[FXAccountingLedger] = None
position_reconciler: Optional[PositionReconciler] = None
order_reconciler: Optional[OrderReconciler] = None
pg_pool = None  # PostgreSQL connection pool for reconciliation
distributed_kill_switch: Optional[DistributedKillSwitch] = None

# Market configuration
MARKETS_CONFIG: Dict[str, Any] = {}


def load_markets_config() -> Dict[str, Any]:
    """Load market configuration from config file."""
    config_path = Path(__file__).parent.parent.parent / "config" / "markets.json"
    try:
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
    except Exception as e:
        logger.warning("Could not load markets config", error=str(e))

    # Fallback default config
    return {
        "base_currency": "AUD",
        "markets": {
            "US": {"currency": "USD", "fx_pair": "AUDUSD"},
            "ASX": {"currency": "AUD", "fx_pair": None},
            "CRYPTO": {"currency": "USD", "fx_pair": "AUDUSD"},
        }
    }


def get_market_currency(market: str) -> str:
    """Get the trading currency for a market."""
    market_info = MARKETS_CONFIG.get("markets", {}).get(market.upper(), {})
    return market_info.get("currency", "USD")


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    PARTIAL = "PARTIAL"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global broker, fx_service, fx_ledger, MARKETS_CONFIG, position_reconciler, order_reconciler, pg_pool
    global distributed_kill_switch

    logger.info(
        "Starting Execution Service...",
        trading_mode=TRADING_MODE,
        live_enabled=LIVE_TRADING_ENABLED,
        base_currency=BASE_CURRENCY,
    )

    # Initialize distributed kill switch (Redis-backed)
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    distributed_kill_switch = await initialize_kill_switch(
        service_name="execution-service",
        redis_url=redis_url,
    )
    logger.info("Distributed kill switch initialized", redis_url=redis_url)

    # Load market configuration
    MARKETS_CONFIG = load_markets_config()
    logger.info("Markets config loaded", markets=list(MARKETS_CONFIG.get("markets", {}).keys()))

    # Initialize FX service
    fx_service = await initialize_fx_service(cache_ttl_seconds=300)
    logger.info("FX service initialized")

    # Initialize FX accounting ledger
    fx_ledger = FXAccountingLedger(base_currency=BASE_CURRENCY, fx_service=fx_service)
    set_fx_ledger(fx_ledger)
    logger.info("FX accounting ledger initialized", base_currency=BASE_CURRENCY)

    # Initialize broker based on mode
    if TRADING_MODE in ['BACKTEST', 'PAPER']:
        broker = PaperBroker(
            initial_balance=100000.0,
            base_currency=BASE_CURRENCY,
            fx_service=fx_service,
            fx_ledger=fx_ledger,
        )
        logger.info("Paper broker initialized", balance=100000.0, base_currency=BASE_CURRENCY, fx_ledger_enabled=True)
    else:
        if not LIVE_TRADING_ENABLED:
            raise RuntimeError("LIVE mode requires LIVE_TRADING_ENABLED=true")
        # TODO: Initialize Alpaca or IBKR broker
        broker = PaperBroker(
            initial_balance=100000.0,
            base_currency=BASE_CURRENCY,
            fx_service=fx_service,
            fx_ledger=fx_ledger,
        )
        logger.warning("Live broker not implemented, using paper broker")

    # Initialize PostgreSQL pool for reconciliation
    try:
        import asyncpg
        pg_pool = await asyncpg.create_pool(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER", "stock_user"),
            password=os.getenv("POSTGRES_PASSWORD", "stock_pass"),
            database=os.getenv("POSTGRES_DB", "stock_trading"),
            min_size=2,
            max_size=10,
        )
        logger.info("PostgreSQL pool initialized for reconciliation")

        # Initialize reconcilers
        position_reconciler = PositionReconciler(broker, pg_pool)
        order_reconciler = OrderReconciler(broker, pg_pool)
        logger.info("Reconcilers initialized")
    except Exception as e:
        logger.warning("Failed to initialize reconciliation system", error=str(e))
        logger.warning("Reconciliation endpoints will not be available")

    # Initialize event consumer for deduplication
    event_consumer = get_event_consumer()
    await event_consumer.initialize()
    logger.info("Event consumer initialized")

    logger.info("Execution Service started successfully")
    yield

    # Cleanup distributed kill switch
    if distributed_kill_switch:
        await distributed_kill_switch.close()
        logger.info("Distributed kill switch closed")

    # Cleanup PostgreSQL pool
    if pg_pool:
        await pg_pool.close()
        logger.info("PostgreSQL pool closed")

    # Cleanup idempotency handler
    handler = get_idempotency_handler()
    await handler.close()

    # Cleanup event consumer
    await event_consumer.close()

    logger.info("Shutting down Execution Service...")


# Create FastAPI app
app = FastAPI(
    title="Stock Execution Service",
    description="Order execution and position management for the Stock Trading Automation System",
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

class OrderRequest(BaseModel):
    """Request to submit an order."""
    symbol: str
    market: str = "US"
    side: OrderSide
    quantity: float
    order_type: OrderType = OrderType.MARKET
    price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"

    # Audit trail (REQUIRED)
    signal_id: Optional[str] = None
    reason: str
    data_snapshot_hash: str
    rule_version_id: str


class SignalProposeRequest(BaseModel):
    """Request to propose an order from a signal (via outbox pattern)."""
    signal_id: str
    symbol: str
    direction: str  # BUY or SELL
    strategy_id: str
    confidence: float
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class SignalProposeResponse(BaseModel):
    """Response from signal propose endpoint."""
    success: bool
    order_id: Optional[str] = None
    message: str
    signal_id: str


class Order(BaseModel):
    """Order details."""
    id: str
    symbol: str
    market: str
    side: str
    order_type: str
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    status: str
    filled_quantity: float = 0
    average_fill_price: Optional[float] = None
    commission: float = 0

    # Audit trail
    signal_id: Optional[str] = None
    risk_check_id: Optional[str] = None
    reason: str
    data_snapshot_hash: str
    rule_version_id: str

    # Timestamps
    created_at: datetime
    submitted_at: Optional[datetime] = None
    filled_at: Optional[datetime] = None


class Trade(BaseModel):
    """Trade (filled order) details."""
    id: str
    order_id: str
    symbol: str
    market: str
    side: str
    quantity: float
    price: float
    commission: float = 0

    # P&L
    gross_pnl: Optional[float] = None
    net_pnl: Optional[float] = None

    # Audit trail
    signal_id: Optional[str] = None
    risk_check_id: str
    reason: str
    data_snapshot_hash: str
    rule_version_id: str

    timestamp: datetime


class Position(BaseModel):
    """Current position."""
    symbol: str
    market: str
    side: str  # LONG or SHORT
    quantity: float
    average_entry_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    realized_pnl: float = 0


class Account(BaseModel):
    """Account information."""
    cash: float
    equity: float
    buying_power: float
    positions_value: float
    unrealized_pnl: float
    realized_pnl: float
    trading_mode: str


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
    broker: str
    components: dict
    kill_switch: Optional[KillSwitchHealthInfo] = None


# =============================================================================
# FX Pydantic Models
# =============================================================================

class FXRateResponse(BaseModel):
    """FX rate response."""
    pair: str
    rate: float
    timestamp: datetime
    source: str = "yahoo"
    bid: Optional[float] = None
    ask: Optional[float] = None


class FXRatesResponse(BaseModel):
    """Multiple FX rates response."""
    base_currency: str
    rates: Dict[str, float]
    timestamp: datetime


class FXConvertRequest(BaseModel):
    """FX conversion request."""
    amount: float
    from_currency: str
    to_currency: str


class FXConvertResponse(BaseModel):
    """FX conversion response."""
    amount: float
    from_currency: str
    to_currency: str
    rate: float
    converted_amount: float
    timestamp: datetime


# =============================================================================
# Helper Functions
# =============================================================================

async def validate_with_risk_service(order: OrderRequest) -> Dict[str, Any]:
    """Validate order with risk service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{RISK_SERVICE_URL}/api/v1/validate",
                json={
                    "symbol": order.symbol,
                    "market": order.market,
                    "side": order.side.value,
                    "quantity": order.quantity,
                    "price": order.price,
                    "order_type": order.order_type.value,
                    "signal_id": order.signal_id,
                    "data_snapshot_hash": order.data_snapshot_hash,
                    "rule_version_id": order.rule_version_id,
                    "reason": order.reason,
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error("Risk validation failed", status=response.status_code)
                return {"passed": False, "rejection_reason": "Risk service error"}

    except Exception as e:
        logger.error("Risk service unreachable", error=str(e))
        return {"passed": False, "rejection_reason": f"Risk service unreachable: {str(e)}"}


async def get_current_price(symbol: str, market: str) -> Optional[float]:
    """Get current price from data service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{DATA_SERVICE_URL}/api/v1/quote/{symbol}",
                params={"market": market},
                timeout=5.0,
            )

            if response.status_code == 200:
                return response.json().get("price")
            return None

    except Exception as e:
        logger.warning("Could not get price", symbol=symbol, error=str(e))
        return None


async def check_pending_corporate_actions(symbol: str, market: str) -> Optional[Dict[str, Any]]:
    """
    Check for pending corporate actions that may affect order execution.

    CRITICAL: Splits can affect position sizes and order quantities.
    This check warns about upcoming splits but doesn't block trading
    (unless configured to do so).

    Args:
        symbol: Ticker symbol
        market: Market identifier

    Returns:
        Warning dict if pending actions found, None otherwise
    """
    try:
        async with httpx.AsyncClient() as client:
            # Check for pending corporate actions via data service
            response = await client.get(
                f"{DATA_SERVICE_URL}/api/v1/corporate-actions/pending",
                params={"days_ahead": 3},  # Check 3 days ahead
                timeout=5.0,
            )

            if response.status_code != 200:
                return None

            data = response.json()

            # Check if this symbol has pending actions
            pending = [a for a in data.get("pending", []) if a.get("symbol") == symbol.upper()]
            upcoming = [a for a in data.get("upcoming", []) if a.get("symbol") == symbol.upper()]

            if pending:
                # There are past-due corporate actions that haven't been applied
                return {
                    "warning": "pending_corporate_action",
                    "symbol": symbol,
                    "actions": pending,
                    "severity": "high",
                    "message": f"Symbol {symbol} has {len(pending)} unapplied corporate action(s)",
                }

            if upcoming:
                # There are upcoming actions in the next 3 days
                splits = [a for a in upcoming if a.get("action_type") == "split"]
                if splits:
                    days_until = splits[0].get("days_until", 0)
                    return {
                        "warning": "upcoming_split",
                        "symbol": symbol,
                        "actions": splits,
                        "severity": "medium" if days_until > 1 else "high",
                        "message": f"Split for {symbol} in {days_until} day(s)",
                    }

            return None

    except Exception as e:
        # Don't block trading if we can't check
        logger.warning("Could not check corporate actions", symbol=symbol, error=str(e))
        return None


async def resolve_symbol(symbol: str) -> str:
    """
    Resolve a ticker symbol to its current symbol.

    Args:
        symbol: Ticker symbol (may be old)

    Returns:
        Current ticker symbol
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{DATA_SERVICE_URL}/api/v1/symbols/resolve/{symbol}",
                timeout=5.0,
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("resolved_symbol", symbol)

            return symbol

    except Exception as e:
        logger.warning("Could not resolve symbol", symbol=symbol, error=str(e))
        return symbol


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    components = {
        "broker": "healthy" if broker else "not_initialized",
        "fx_service": "unknown",
        "risk_service": "unknown",
        "data_service": "unknown",
        "kill_switch": "unknown",
    }

    # Check distributed kill switch
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
            components["kill_switch"] = "active" if ks_status.active else "inactive"
        except Exception as e:
            logger.error("Failed to get kill switch status", error=str(e))
            kill_switch_active = True  # Fail safe
            kill_switch_info = KillSwitchHealthInfo(
                active=True,
                source="error_fallback",
                last_check=datetime.utcnow(),
                reason=f"Redis error: {str(e)}",
            )
            components["kill_switch"] = "error"
    else:
        components["kill_switch"] = "not_initialized"

    # Check FX service
    if fx_service:
        try:
            # Try to get a cached rate or fetch one
            rate = fx_service.get_cached_rate("AUDUSD")
            if rate:
                components["fx_service"] = "healthy"
            else:
                # Try to fetch a rate
                rate = await fx_service.get_rate("AUD", "USD")
                components["fx_service"] = "healthy" if rate else "degraded"
        except Exception as e:
            components["fx_service"] = f"degraded: {str(e)}"
    else:
        components["fx_service"] = "not_initialized"

    # Check risk service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{RISK_SERVICE_URL}/health", timeout=5.0)
            components["risk_service"] = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception:
        components["risk_service"] = "unreachable"

    # Check data service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{DATA_SERVICE_URL}/health", timeout=5.0)
            components["data_service"] = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception:
        components["data_service"] = "unreachable"

    # If kill switch is active, status is degraded
    if kill_switch_active:
        overall_status = "degraded"
    else:
        overall_status = "healthy" if all(
            v in ["healthy", "inactive"] for v in components.values()
        ) else "degraded"

    return HealthResponse(
        status=overall_status,
        service="execution-service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        trading_mode=TRADING_MODE,
        broker=broker.__class__.__name__ if broker else "none",
        components=components,
        kill_switch=kill_switch_info,
    )


@app.post("/api/v1/orders", response_model=Order)
async def submit_order(
    request: OrderRequest,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """
    Submit an order for execution.

    CRITICAL: Order MUST pass risk validation before execution.

    Headers:
        X-Idempotency-Key: Optional unique key (UUID recommended) to prevent
                          duplicate order submissions. If a request with the
                          same key was already processed, returns the original
                          order result instead of creating a new order.

    This is critical for safety - network retries without idempotency keys
    could result in duplicate orders and unintended position sizes.
    """
    # Convert request to dict for idempotency hashing
    request_data = request.model_dump(mode='json')
    endpoint = "/api/v1/orders"

    # CRITICAL: Check for duplicate order submission
    if x_idempotency_key:
        try:
            cached = await check_idempotency(x_idempotency_key, request_data, endpoint)
            if cached:
                status_code, response_body = cached
                logger.info(
                    "Returning cached order (preventing duplicate)",
                    idempotency_key=x_idempotency_key[:8] + "...",
                    order_id=response_body.get('id'),
                    symbol=request.symbol,
                )
                return JSONResponse(content=response_body, status_code=status_code)
        except IdempotencyKeyMismatch as e:
            logger.error(
                "SECURITY: Idempotency key reused for different order",
                key=x_idempotency_key[:8] + "...",
            )
            raise HTTPException(status_code=422, detail=str(e))

    # CRITICAL: Check distributed kill switch before any order
    if distributed_kill_switch:
        try:
            if await distributed_kill_switch.is_active():
                ks_status = await distributed_kill_switch.get_status()
                logger.warning(
                    "Order rejected - kill switch active",
                    symbol=request.symbol,
                    reason=ks_status.reason,
                )
                raise HTTPException(
                    status_code=503,
                    detail=f"Trading halted: Kill switch is active. Reason: {ks_status.reason}",
                )
        except HTTPException:
            raise
        except Exception as e:
            # Fail safe: if we can't check Redis, reject the order
            logger.error("Kill switch check failed, rejecting order", error=str(e))
            raise HTTPException(
                status_code=503,
                detail="Trading halted: Unable to verify kill switch status (fail safe)",
            )

    logger.info(
        "Order submission request",
        symbol=request.symbol,
        side=request.side,
        quantity=request.quantity,
        reason=request.reason,
        idempotency_key=x_idempotency_key[:8] + "..." if x_idempotency_key else None,
    )

    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    # CRITICAL: Check for pending corporate actions (especially splits)
    corporate_action_warning = await check_pending_corporate_actions(
        request.symbol, request.market
    )
    if corporate_action_warning:
        logger.warning(
            "Pending corporate action detected",
            symbol=request.symbol,
            warning=corporate_action_warning,
        )
        # Include warning in response but don't block (configurable)
        # For splits happening today, we may want to block trading

    # CRITICAL: Validate with risk service
    risk_result = await validate_with_risk_service(request)

    if not risk_result.get("passed"):
        logger.warning(
            "Order rejected by risk service",
            reason=risk_result.get("rejection_reason"),
        )
        raise HTTPException(
            status_code=400,
            detail=f"Order rejected: {risk_result.get('rejection_reason')}",
        )

    risk_check_id = risk_result.get("id")

    # Get current price for market orders
    execution_price = request.price
    if request.order_type == OrderType.MARKET:
        current_price = await get_current_price(request.symbol, request.market)
        if current_price:
            execution_price = current_price
        else:
            execution_price = request.price or 100.0  # Fallback for paper trading

    # Execute order through broker
    try:
        order = broker.submit_order(
            symbol=request.symbol,
            market=request.market,
            side=request.side.value,
            quantity=request.quantity,
            order_type=request.order_type.value,
            price=execution_price,
            stop_price=request.stop_price,
            signal_id=request.signal_id,
            risk_check_id=risk_check_id,
            reason=request.reason,
            data_snapshot_hash=request.data_snapshot_hash,
            rule_version_id=request.rule_version_id,
        )

        logger.info(
            "Order submitted",
            order_id=order["id"],
            status=order["status"],
            idempotency_key=x_idempotency_key[:8] + "..." if x_idempotency_key else None,
        )

        # Store idempotency response to prevent duplicate orders on retry
        if x_idempotency_key:
            await store_idempotency(
                x_idempotency_key,
                request_data,
                endpoint,
                200,
                order,
            )

        return Order(**order)

    except Exception as e:
        logger.error("Order execution failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Order execution failed: {str(e)}")


@app.post("/api/v1/orders/propose", response_model=SignalProposeResponse)
async def propose_order_from_signal(
    request: SignalProposeRequest,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """
    Propose an order based on a signal (via outbox pattern).

    This endpoint receives signals from the outbox dispatcher and converts them
    to orders. The order then goes through normal risk validation and execution.

    Flow:
        Signal Service → Outbox → This endpoint → Risk Validation → Execution

    The signal must include sufficient audit trail information for compliance.
    """
    logger.info(
        "Signal propose request received",
        signal_id=request.signal_id,
        symbol=request.symbol,
        direction=request.direction,
        confidence=request.confidence,
    )

    # Validate direction
    if request.direction.upper() not in ["BUY", "SELL"]:
        return SignalProposeResponse(
            success=False,
            message=f"Invalid direction: {request.direction}. Must be BUY or SELL.",
            signal_id=request.signal_id,
        )

    # Check confidence threshold (configurable via env)
    min_confidence = float(os.getenv("MIN_SIGNAL_CONFIDENCE", "0.6"))
    if request.confidence < min_confidence:
        return SignalProposeResponse(
            success=False,
            message=f"Signal confidence {request.confidence} below threshold {min_confidence}",
            signal_id=request.signal_id,
        )

    # Extract metadata
    metadata = request.metadata or {}

    # Calculate position size based on confidence and risk limits
    # Default: 100 shares, but could be adjusted based on strategy
    base_quantity = float(os.getenv("DEFAULT_ORDER_QUANTITY", "100"))
    quantity = base_quantity

    # Build order request
    try:
        order_request = OrderRequest(
            symbol=request.symbol,
            market=metadata.get("market", "US"),
            side=OrderSide(request.direction.upper()),
            quantity=quantity,
            order_type=OrderType.MARKET,
            price=request.entry_price,
            stop_price=request.stop_loss,
            time_in_force=metadata.get("time_in_force", "DAY"),
            signal_id=request.signal_id,
            reason=metadata.get("reason", f"Signal from {request.strategy_id} (confidence: {request.confidence:.1%})"),
            data_snapshot_hash=metadata.get("data_snapshot_hash", ""),
            rule_version_id=metadata.get("rule_version_id", f"{request.strategy_id}_1.0.0"),
        )

        # Submit through normal order flow (with idempotency)
        idempotency_key = x_idempotency_key or f"signal_{request.signal_id}"

        # Call the order submission directly
        order = await submit_order(order_request, idempotency_key)

        logger.info(
            "Order proposed from signal",
            signal_id=request.signal_id,
            order_id=order.id,
            symbol=request.symbol,
        )

        return SignalProposeResponse(
            success=True,
            order_id=order.id,
            message=f"Order created from signal {request.signal_id}",
            signal_id=request.signal_id,
        )

    except HTTPException as e:
        logger.warning(
            "Order proposal rejected",
            signal_id=request.signal_id,
            reason=e.detail,
        )
        return SignalProposeResponse(
            success=False,
            message=str(e.detail),
            signal_id=request.signal_id,
        )
    except Exception as e:
        logger.error(
            "Order proposal failed",
            signal_id=request.signal_id,
            error=str(e),
        )
        return SignalProposeResponse(
            success=False,
            message=f"Order proposal failed: {str(e)}",
            signal_id=request.signal_id,
        )


@app.get("/api/v1/orders", response_model=List[Order])
async def list_orders(
    status: Optional[str] = None,
    symbol: Optional[str] = None,
    limit: int = 50,
):
    """List orders with optional filtering."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    orders = broker.get_orders(status=status, symbol=symbol, limit=limit)
    return [Order(**o) for o in orders]


@app.get("/api/v1/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order details."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    order = broker.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return Order(**order)


@app.delete("/api/v1/orders/{order_id}")
async def cancel_order(order_id: str):
    """Cancel an order."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    success = broker.cancel_order(order_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not cancel order")

    return {"message": "Order cancelled", "order_id": order_id}


@app.get("/api/v1/positions", response_model=List[Position])
async def list_positions():
    """List current positions."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    positions = broker.get_positions()
    return [Position(**p) for p in positions]


@app.get("/api/v1/trades", response_model=List[Trade])
async def list_trades(
    symbol: Optional[str] = None,
    limit: int = 50,
):
    """List trade history."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    trades = broker.get_trades(symbol=symbol, limit=limit)
    return [Trade(**t) for t in trades]


@app.get("/api/v1/account", response_model=Account)
async def get_account():
    """Get account information."""
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    account = broker.get_account()
    account["trading_mode"] = TRADING_MODE
    return Account(**account)


# =============================================================================
# FX Endpoints
# =============================================================================

@app.get("/api/v1/fx/rates", response_model=FXRatesResponse)
async def get_fx_rates():
    """
    Get current FX rates for all supported currency pairs.

    Returns rates relative to the base currency (AUD).
    """
    if not fx_service:
        raise HTTPException(status_code=503, detail="FX service not initialized")

    rates = {}
    timestamp = datetime.utcnow()

    # Get rates for common pairs
    pairs = ["AUDUSD", "AUDEUR", "AUDGBP", "AUDJPY", "AUDCAD"]
    for pair in pairs:
        try:
            base = pair[:3]
            quote = pair[3:]
            rate = await fx_service.get_rate(base, quote)
            rates[pair] = rate
        except Exception as e:
            logger.warning("Could not get FX rate", pair=pair, error=str(e))

    return FXRatesResponse(
        base_currency=BASE_CURRENCY,
        rates=rates,
        timestamp=timestamp,
    )


@app.get("/api/v1/fx/rate/{pair}", response_model=FXRateResponse)
async def get_fx_rate(pair: str):
    """
    Get current FX rate for a specific currency pair.

    Args:
        pair: Currency pair (e.g., 'AUDUSD', 'USDAUD')
    """
    if not fx_service:
        raise HTTPException(status_code=503, detail="FX service not initialized")

    pair = pair.upper()
    if len(pair) != 6:
        raise HTTPException(status_code=400, detail="Invalid pair format. Use 6 characters (e.g., AUDUSD)")

    base = pair[:3]
    quote = pair[3:]

    try:
        rate, bid, ask = await fx_service.get_rate_with_spread(base, quote)

        return FXRateResponse(
            pair=pair,
            rate=rate,
            timestamp=datetime.utcnow(),
            source="yahoo",
            bid=bid,
            ask=ask,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error fetching FX rate", pair=pair, error=str(e))
        raise HTTPException(status_code=500, detail="Could not fetch FX rate")


@app.post("/api/v1/fx/convert", response_model=FXConvertResponse)
async def convert_currency(request: FXConvertRequest):
    """
    Convert an amount between currencies.

    Useful for calculating order values in different currencies.
    """
    if not fx_service:
        raise HTTPException(status_code=503, detail="FX service not initialized")

    try:
        rate = await fx_service.get_rate(request.from_currency, request.to_currency)
        converted = await fx_service.convert(
            request.amount,
            request.from_currency,
            request.to_currency,
        )

        return FXConvertResponse(
            amount=request.amount,
            from_currency=request.from_currency.upper(),
            to_currency=request.to_currency.upper(),
            rate=rate,
            converted_amount=converted,
            timestamp=datetime.utcnow(),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Error converting currency", error=str(e))
        raise HTTPException(status_code=500, detail="Could not convert currency")


@app.get("/api/v1/fx/cache-status")
async def get_fx_cache_status():
    """Get FX rate cache status for monitoring."""
    if not fx_service:
        raise HTTPException(status_code=503, detail="FX service not initialized")

    return fx_service.get_cache_status()


@app.get("/api/v1/markets")
async def get_markets():
    """Get supported markets and their currency configuration."""
    return {
        "base_currency": MARKETS_CONFIG.get("base_currency", BASE_CURRENCY),
        "markets": MARKETS_CONFIG.get("markets", {}),
    }


# =============================================================================
# FX Accounting Endpoints
# =============================================================================


class FXPnLRequest(BaseModel):
    """Request for FX P&L calculation with optional date range."""
    start_date: Optional[str] = Field(None, description="Start date ISO format")
    end_date: Optional[str] = Field(None, description="End date ISO format")


class FXRevalueRequest(BaseModel):
    """Request to revalue positions at current FX rates."""
    force: bool = Field(False, description="Force revaluation even if recently done")


class FXTransactionFilter(BaseModel):
    """Filter criteria for FX transactions."""
    transaction_type: Optional[str] = None
    currency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)


class FXAttributionRequest(BaseModel):
    """Request for position FX attribution."""
    position_id: str
    current_value_trade: float
    current_fx_rate: float


@app.get("/api/v1/fx/accounting/pnl")
async def get_fx_pnl(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
):
    """
    Get FX P&L summary with realized and unrealized breakdown.

    Returns comprehensive FX impact analysis including:
    - Realized FX gains/losses (closed positions)
    - Unrealized FX gains/losses (open positions)
    - Total FX impact
    - Breakdown by currency

    **Example response:**
    ```json
    {
        "base_currency": "AUD",
        "realized": {"gain": 150.25, "loss": 45.10, "net": 105.15},
        "unrealized": {"gain": 200.00, "loss": 75.50, "net": 124.50},
        "total_fx_impact": 229.65,
        "by_currency": {"USD": 229.65}
    }
    ```
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    # Parse dates if provided
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format: {start_date}")

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format: {end_date}")

    summary = fx_ledger.get_fx_pnl_summary(start_date=start_dt, end_date=end_dt)
    return summary.to_dict()


@app.get("/api/v1/fx/accounting/exposure")
async def get_fx_exposure():
    """
    Get current currency exposure breakdown.

    Returns exposure for each currency including:
    - Gross long and short positions
    - Net exposure
    - Number of positions
    - Average entry FX rate
    - Current FX rate
    - Unrealized FX P&L

    This is essential for understanding portfolio FX risk.
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    exposure = fx_ledger.get_exposure_summary()
    return exposure


@app.get("/api/v1/fx/accounting/currencies")
async def get_currency_positions():
    """
    Get detailed currency position data.

    Returns per-currency position information for risk analysis
    and hedging decisions.
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    positions = fx_ledger.get_currency_exposure()
    return {
        "base_currency": BASE_CURRENCY,
        "positions": {ccy: pos.to_dict() for ccy, pos in positions.items()},
        "position_count": len(positions),
    }


@app.get("/api/v1/fx/accounting/transactions")
async def get_fx_transactions(
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    start_date: Optional[str] = Query(None, description="Start date (ISO)"),
    end_date: Optional[str] = Query(None, description="End date (ISO)"),
    limit: int = Query(100, ge=1, le=1000, description="Max transactions"),
):
    """
    Get FX transaction ledger with optional filtering.

    Returns a list of all FX transactions including:
    - Trade opens/closes with FX rates
    - Dividends received in foreign currencies
    - Mark-to-market revaluations
    - FX conversions

    **Transaction types:** TRADE_OPEN, TRADE_CLOSE, DIVIDEND, FX_CONVERSION, REVALUATION
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    # Parse dates
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid start_date format")

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid end_date format")

    # Parse transaction type if provided
    txn_type = None
    if transaction_type:
        try:
            txn_type = FXTransactionType(transaction_type.upper())
        except ValueError:
            valid_types = [t.value for t in FXTransactionType]
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transaction_type. Valid types: {valid_types}"
            )

    transactions = fx_ledger.get_transactions(
        start_date=start_dt,
        end_date=end_dt,
        transaction_type=txn_type,
        currency=currency.upper() if currency else None,
        limit=limit,
    )

    return {
        "transactions": [txn.to_dict() for txn in transactions],
        "count": len(transactions),
        "filters": {
            "transaction_type": transaction_type,
            "currency": currency,
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit,
        },
    }


@app.post("/api/v1/fx/accounting/revalue")
async def revalue_positions(request: FXRevalueRequest = FXRevalueRequest()):
    """
    Trigger mark-to-market revaluation of all open positions.

    Recalculates unrealized FX gains/losses for all positions
    using current FX rates.

    Returns:
    - Total unrealized FX P&L after revaluation
    - Number of positions revalued
    - Revaluation timestamp
    """
    if not fx_ledger or not fx_service:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    # Get current positions
    positions = broker.get_positions()

    if not positions:
        return {
            "status": "no_positions",
            "message": "No open positions to revalue",
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Get current FX rates
    current_rates = {}
    for pos in positions:
        trade_ccy = pos.get("trade_currency", "USD")
        if trade_ccy != BASE_CURRENCY:
            pair = f"{BASE_CURRENCY}{trade_ccy}"
            if pair not in current_rates:
                try:
                    rate = await fx_service.get_rate(BASE_CURRENCY, trade_ccy)
                    current_rates[pair] = rate
                except Exception as e:
                    logger.warning(f"Could not get rate for {pair}: {e}")

    # Perform revaluation
    total_unrealized, revaluation_txns = fx_ledger.revalue_positions(
        positions=positions,
        current_rates=current_rates,
    )

    logger.info(
        "Positions revalued",
        position_count=len(positions),
        unrealized_fx_pnl=total_unrealized,
    )

    return {
        "status": "revalued",
        "positions_revalued": len(positions),
        "total_unrealized_fx_pnl": round(total_unrealized, 2),
        "rates_used": {k: round(v, 6) for k, v in current_rates.items()},
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/v1/fx/accounting/attribution")
async def get_position_fx_attribution(request: FXAttributionRequest):
    """
    Get FX attribution breakdown for a specific position.

    Separates the position P&L into:
    - **Trading P&L**: Profit/loss from price movement in trade currency
    - **FX Impact**: Profit/loss from exchange rate movement

    This allows accurate performance attribution:
    - Was the profit from good trade selection?
    - Or from favorable FX movements?
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    attribution = fx_ledger.get_position_fx_attribution(
        position_id=request.position_id,
        current_value_trade=request.current_value_trade,
        current_fx_rate=request.current_fx_rate,
    )

    if not attribution:
        raise HTTPException(
            status_code=404,
            detail=f"Position {request.position_id} not found in FX ledger"
        )

    return attribution.to_dict()


@app.get("/api/v1/fx/accounting/attribution/{position_id}")
async def get_position_fx_attribution_by_id(
    position_id: str,
    current_value: Optional[float] = Query(None, description="Current value in trade currency"),
):
    """
    Get FX attribution for a position by ID.

    If current_value is not provided, attempts to get it from the broker.
    """
    if not fx_ledger or not broker:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    # Try to get position from broker
    positions = broker.get_positions()
    position = next(
        (p for p in positions if p.get("id") == position_id or p.get("symbol") == position_id),
        None
    )

    if not position and current_value is None:
        raise HTTPException(
            status_code=404,
            detail=f"Position {position_id} not found. Provide current_value parameter."
        )

    # Get current value
    if current_value is not None:
        curr_value = current_value
    else:
        quantity = position.get("quantity", 0)
        current_price = position.get("current_price", position.get("average_entry_price", 0))
        curr_value = quantity * current_price

    # Get current FX rate
    trade_ccy = position.get("trade_currency", "USD") if position else "USD"
    try:
        current_fx_rate = await fx_service.get_rate(BASE_CURRENCY, trade_ccy) if fx_service else 1.0
    except Exception:
        current_fx_rate = 1.0

    attribution = fx_ledger.get_position_fx_attribution(
        position_id=position_id,
        current_value_trade=curr_value,
        current_fx_rate=current_fx_rate,
    )

    if not attribution:
        # Return what we can calculate without ledger entry
        return {
            "position_id": position_id,
            "message": "Position not tracked in FX ledger yet",
            "current_value_trade": curr_value,
            "current_fx_rate": current_fx_rate,
        }

    return attribution.to_dict()


@app.post("/api/v1/fx/accounting/reset")
async def reset_fx_accounting():
    """
    Reset FX accounting ledger.

    **CAUTION:** This clears all FX transaction history and P&L tracking.
    Use only for testing or when starting fresh.

    Requires confirmation via query parameter.
    """
    if not fx_ledger:
        raise HTTPException(status_code=503, detail="FX accounting not initialized")

    fx_ledger.reset()
    logger.warning("FX accounting ledger reset")

    return {
        "status": "reset",
        "message": "FX accounting ledger has been reset",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/v1/fx/accounting/stats")
async def get_fx_accounting_stats():
    """
    Get FX accounting statistics and status.

    Returns:
    - Transaction count by type
    - Currency exposure summary
    - Realized and unrealized totals
    - Last revaluation time
    """
    if not fx_ledger:
        return {
            "status": "not_initialized",
            "base_currency": BASE_CURRENCY,
        }

    # Get transaction counts by type
    all_txns = fx_ledger.get_transactions(limit=10000)
    txn_counts = {}
    for txn in all_txns:
        txn_type = txn.transaction_type.value
        txn_counts[txn_type] = txn_counts.get(txn_type, 0) + 1

    # Get P&L summary
    pnl = fx_ledger.get_fx_pnl_summary()

    # Get exposure
    exposure = fx_ledger.get_exposure_summary()

    return {
        "status": "active",
        "base_currency": BASE_CURRENCY,
        "transaction_count": len(all_txns),
        "transactions_by_type": txn_counts,
        "realized_fx_pnl": round(pnl.realized_fx_net, 2),
        "unrealized_fx_pnl": round(pnl.unrealized_fx_net, 2),
        "total_fx_impact": round(pnl.total_fx_impact, 2),
        "currency_count": exposure.get("currency_count", 0),
        "total_exposure_base": exposure.get("total_exposure_base", 0),
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
    - Verifying time alignment for order execution
    - Ensuring orders are executed during appropriate market hours

    Returns:
        Service time information including UTC time, clock skew status,
        trading mode, and market session information.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))

    from time.timezone import now_utc, from_utc, get_market_timezone
    from time.sessions import get_current_session
    from time.market_hours import is_market_open
    from time_validator import TimeValidator, check_clock_sync

    utc_now = now_utc()

    # Get clock sync status
    clock_status = check_clock_sync()

    # Get status for each supported market
    markets_status = {}
    time_validator = TimeValidator()

    for market in ["US", "ASX", "CRYPTO", "LSE", "TSX"]:
        try:
            session = get_current_session(market, utc_now)
            market_tz = get_market_timezone(market)
            local_time = from_utc(utc_now, market_tz)

            # Check if orders can be executed
            timing_result = time_validator.validate_order_timing(market, "TEST", "MARKET", utc_now)

            markets_status[market] = {
                "session_type": session.session_type,
                "is_open": is_market_open(market, utc_now),
                "is_trading_day": session.is_trading_day,
                "timezone": session.timezone,
                "local_time": local_time.isoformat(),
                "can_execute_orders": timing_result.is_valid,
                "extended_hours_allowed": time_validator.can_trade_extended_hours(market),
            }
        except Exception as e:
            markets_status[market] = {"error": str(e)}

    return {
        "service": "execution-service",
        "version": "1.0.0",
        "utc_time": utc_now.isoformat(),
        "utc_timestamp": utc_now.timestamp(),
        "clock_sync": clock_status.to_dict(),
        "trading_mode": TRADING_MODE,
        "live_trading_enabled": LIVE_TRADING_ENABLED,
        "base_currency": BASE_CURRENCY,
        "markets": markets_status,
    }


@app.get("/api/v1/time/validate/{market}")
async def validate_order_timing(
    market: str,
    symbol: str = Query(default="TEST", description="Symbol to validate"),
    order_type: str = Query(default="MARKET", description="Order type (MARKET, LIMIT)"),
):
    """
    Validate order timing for a specific market.

    This endpoint checks if an order can be executed now based on
    market hours and extended hours configuration.

    Args:
        market: Market identifier (US, ASX, CRYPTO, etc.)
        symbol: Symbol to validate (for logging/audit)
        order_type: Order type to validate

    Returns:
        Timing validation result including whether order can be executed,
        current session type, and rejection reason if applicable.
    """
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))

    from time.timezone import now_utc
    from time_validator import TimeValidator

    time_validator = TimeValidator()
    result = time_validator.validate_order_timing(
        market=market,
        symbol=symbol,
        order_type=order_type,
        at_time=now_utc(),
    )

    return result.to_dict()


# =============================================================================
# Reconciliation Endpoints
# =============================================================================

class ReconciliationRunResponse(BaseModel):
    """Response from running reconciliation."""
    status: str
    broker_position_count: int
    local_position_count: int
    mismatch_count: int
    requires_intervention: bool
    execution_time_ms: int
    timestamp: datetime
    mismatches: List[dict] = []
    actions_taken: Optional[dict] = None


class ReconciliationStatusResponse(BaseModel):
    """Current reconciliation status."""
    last_run: Optional[datetime] = None
    last_status: Optional[str] = None
    last_mismatch_count: int = 0
    unresolved_mismatches: int = 0
    total_runs_24h: int = 0
    error_runs_24h: int = 0


class ReconciliationResolveRequest(BaseModel):
    """Request to resolve a reconciliation mismatch."""
    resolved_by: str
    notes: Optional[str] = None


@app.post("/api/v1/reconciliation/run", response_model=ReconciliationRunResponse)
async def run_reconciliation(include_orders: bool = False):
    """
    Run position reconciliation now.

    Compares broker positions with local database positions.
    If mismatches are found and require intervention, will:
    - Trigger kill switch (for critical mismatches)
    - Send Discord alert
    - Log to decision_log

    Args:
        include_orders: Also run order reconciliation

    Returns:
        Reconciliation result with any mismatches found
    """
    if not position_reconciler:
        raise HTTPException(
            status_code=503,
            detail="Reconciliation not available (PostgreSQL not configured)"
        )

    logger.info("Running position reconciliation")

    # Run position reconciliation
    result = await position_reconciler.reconcile()

    # Handle mismatches if needed
    actions_taken = None
    if result.status == "mismatch":
        actions_taken = await position_reconciler.handle_mismatch(result)
    elif result.status == "matched":
        # Store successful reconciliation for audit trail
        try:
            await position_reconciler._store_report(result, {"alert_sent": False})
        except Exception as e:
            logger.warning("Failed to store matched reconciliation report", error=str(e))

    # Optionally run order reconciliation
    if include_orders and order_reconciler:
        order_result = await order_reconciler.reconcile()
        if order_result.status == "mismatch":
            await order_reconciler.handle_mismatch(order_result)

    return ReconciliationRunResponse(
        status=result.status,
        broker_position_count=len(result.broker_positions),
        local_position_count=len(result.local_positions),
        mismatch_count=len(result.mismatches),
        requires_intervention=result.requires_intervention,
        execution_time_ms=result.execution_time_ms,
        timestamp=result.timestamp,
        mismatches=[m.to_dict() for m in result.mismatches],
        actions_taken=actions_taken,
    )


@app.get("/api/v1/reconciliation/status", response_model=ReconciliationStatusResponse)
async def get_reconciliation_status():
    """
    Get the current reconciliation status.

    Returns the last reconciliation result and summary statistics.
    """
    if not position_reconciler or not pg_pool:
        raise HTTPException(
            status_code=503,
            detail="Reconciliation not available (PostgreSQL not configured)"
        )

    try:
        async with pg_pool.acquire() as conn:
            # Get last reconciliation
            last_run = await conn.fetchrow(
                """
                SELECT run_at, status, mismatch_count
                FROM reconciliation_reports
                ORDER BY run_at DESC
                LIMIT 1
                """
            )

            # Get unresolved mismatches count
            unresolved = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM reconciliation_reports
                WHERE status = 'mismatch' AND resolved_at IS NULL
                """
            )

            # Get 24h stats
            stats = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) as total_runs,
                    COUNT(*) FILTER (WHERE status = 'error') as error_runs
                FROM reconciliation_reports
                WHERE run_at > NOW() - INTERVAL '24 hours'
                """
            )

            return ReconciliationStatusResponse(
                last_run=last_run["run_at"] if last_run else None,
                last_status=last_run["status"] if last_run else None,
                last_mismatch_count=last_run["mismatch_count"] if last_run else 0,
                unresolved_mismatches=unresolved or 0,
                total_runs_24h=stats["total_runs"] if stats else 0,
                error_runs_24h=stats["error_runs"] if stats else 0,
            )

    except Exception as e:
        logger.error("Failed to get reconciliation status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reconciliation/history")
async def get_reconciliation_history(limit: int = 50, status: Optional[str] = None):
    """
    Get recent reconciliation history.

    Args:
        limit: Maximum number of reports to return (default 50)
        status: Filter by status (matched, mismatch, error)

    Returns:
        List of reconciliation reports
    """
    if not pg_pool:
        raise HTTPException(
            status_code=503,
            detail="Reconciliation not available (PostgreSQL not configured)"
        )

    try:
        async with pg_pool.acquire() as conn:
            if status:
                rows = await conn.fetch(
                    """
                    SELECT
                        id,
                        run_at,
                        status,
                        broker_position_count,
                        local_position_count,
                        mismatch_count,
                        action_taken,
                        resolved_at,
                        resolved_by,
                        execution_time_ms
                    FROM reconciliation_reports
                    WHERE status = $1
                    ORDER BY run_at DESC
                    LIMIT $2
                    """,
                    status,
                    limit,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT
                        id,
                        run_at,
                        status,
                        broker_position_count,
                        local_position_count,
                        mismatch_count,
                        action_taken,
                        resolved_at,
                        resolved_by,
                        execution_time_ms
                    FROM reconciliation_reports
                    ORDER BY run_at DESC
                    LIMIT $1
                    """,
                    limit,
                )

            return {
                "reports": [dict(row) for row in rows],
                "count": len(rows),
            }

    except Exception as e:
        logger.error("Failed to get reconciliation history", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reconciliation/report/{report_id}")
async def get_reconciliation_report(report_id: int):
    """
    Get a specific reconciliation report with full details.

    Args:
        report_id: ID of the reconciliation report

    Returns:
        Full reconciliation report including snapshots
    """
    if not pg_pool:
        raise HTTPException(
            status_code=503,
            detail="Reconciliation not available (PostgreSQL not configured)"
        )

    try:
        async with pg_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT *
                FROM reconciliation_reports
                WHERE id = $1
                """,
                report_id,
            )

            if not row:
                raise HTTPException(status_code=404, detail="Report not found")

            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get reconciliation report", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reconciliation/resolve/{report_id}")
async def resolve_reconciliation_mismatch(
    report_id: int,
    request: ReconciliationResolveRequest,
):
    """
    Mark a reconciliation mismatch as resolved.

    This should be called after manual investigation and resolution
    of the mismatch cause.

    Args:
        report_id: ID of the reconciliation report to resolve
        request: Resolution details

    Returns:
        Updated report
    """
    if not position_reconciler or not pg_pool:
        raise HTTPException(
            status_code=503,
            detail="Reconciliation not available (PostgreSQL not configured)"
        )

    try:
        success = await position_reconciler.resolve_mismatch(
            report_id,
            request.resolved_by,
            request.notes,
        )

        if not success:
            raise HTTPException(
                status_code=400,
                detail="Could not resolve report (not found or already resolved)"
            )

        # Fetch and return updated report
        async with pg_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM reconciliation_reports WHERE id = $1",
                report_id,
            )
            return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to resolve reconciliation mismatch", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reconciliation/orders/run")
async def run_order_reconciliation():
    """
    Run order reconciliation now.

    Compares broker open orders with local database orders.
    Detects orphaned orders, missing fills, etc.

    Returns:
        Order reconciliation result with any mismatches found
    """
    if not order_reconciler:
        raise HTTPException(
            status_code=503,
            detail="Order reconciliation not available (PostgreSQL not configured)"
        )

    logger.info("Running order reconciliation")

    result = await order_reconciler.reconcile()

    actions_taken = None
    if result.status == "mismatch":
        actions_taken = await order_reconciler.handle_mismatch(result)

    return {
        "status": result.status,
        "broker_open_order_count": len(result.broker_orders),
        "local_open_order_count": len(result.local_orders),
        "orphaned_broker_orders": result.orphaned_broker_count,
        "missing_local_orders": result.missing_local_count,
        "mismatch_count": len(result.mismatches),
        "requires_intervention": result.requires_intervention,
        "execution_time_ms": result.execution_time_ms,
        "timestamp": result.timestamp.isoformat(),
        "mismatches": [m.to_dict() for m in result.mismatches],
        "actions_taken": actions_taken,
    }


# =============================================================================
# Event Handling Endpoints (with Deduplication)
# =============================================================================

class OrderApprovedEvent(BaseModel):
    """Event payload for order_approved events from Risk Service."""
    event_id: Optional[str] = None
    idempotency_key: str
    event_type: str = "order_approved"
    signal_id: Optional[str] = None
    risk_check_id: str
    symbol: str
    market: str = "US"
    side: str  # BUY, SELL
    quantity: float
    price: Optional[float] = None
    order_type: str = "MARKET"
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"
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


@app.post("/api/v1/events/order_approved", response_model=EventResponse)
async def handle_order_approved(event: OrderApprovedEvent):
    """
    Handle order_approved event from the outbox dispatcher.

    CRITICAL SAFETY: This endpoint executes orders. Consumer-side deduplication
    is essential to prevent duplicate order execution on retries.

    If this event was already processed:
    - Return the original order details
    - DO NOT create a new order

    This is the last line of defense against duplicate orders.
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    event_consumer = get_event_consumer()

    async def execute_order_handler(event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handler function for order execution."""
        symbol = event_data.get("symbol")
        market = event_data.get("market", "US")
        side = event_data.get("side")
        quantity = event_data.get("quantity")
        order_type = event_data.get("order_type", "MARKET")
        price = event_data.get("price")

        if not all([symbol, side, quantity]):
            return {"skipped": True, "reason": "Missing required fields"}

        # Get current price for market orders
        execution_price = price
        if order_type == "MARKET":
            current_price = await get_current_price(symbol, market)
            if current_price:
                execution_price = current_price
            else:
                execution_price = price or 100.0  # Fallback for paper trading

        # Execute order through broker
        try:
            order = broker.submit_order(
                symbol=symbol,
                market=market,
                side=side,
                quantity=quantity,
                order_type=order_type,
                price=execution_price,
                stop_price=event_data.get("stop_price"),
                signal_id=event_data.get("signal_id"),
                risk_check_id=event_data.get("risk_check_id"),
                reason=event_data.get("reason"),
                data_snapshot_hash=event_data.get("data_snapshot_hash"),
                rule_version_id=event_data.get("rule_version_id"),
            )

            logger.info(
                "Order executed from event",
                order_id=order.get("id"),
                symbol=symbol,
                side=side,
                quantity=quantity,
                idempotency_key=event_data.get("idempotency_key", "")[:16] + "...",
            )

            return order

        except Exception as e:
            logger.error(
                "Order execution failed from event",
                symbol=symbol,
                error=str(e),
            )
            raise

    # Process with deduplication - CRITICAL for order safety
    event_dict = event.model_dump()
    try:
        result = await event_consumer.process_event(
            event=event_dict,
            handler=execute_order_handler,
            skip_if_processed=True,  # Return cached order, don't create duplicate
        )
    except DuplicateOrderError as e:
        # This shouldn't happen with skip_if_processed=True, but handle it
        logger.warning(
            "Duplicate order event detected",
            event_id=e.event_id,
            order_id=e.order_id,
        )
        return EventResponse(
            event_id=event.idempotency_key,
            status="duplicate",
            is_cached=True,
            result=e.cached_result,
            message=f"Order already executed: {e.order_id}",
        )

    is_cached = isinstance(result, dict) and result.get("is_cached", False)
    order_id = result.get("id") if isinstance(result, dict) else None

    return EventResponse(
        event_id=event.idempotency_key,
        status="executed" if not is_cached else "cached",
        is_cached=is_cached,
        result=result,
        message=f"Order {order_id}" if order_id else ("Cached order returned" if is_cached else "Order executed"),
    )


@app.get("/api/v1/events/stats")
async def get_event_stats(hours: int = 24):
    """
    Get event processing statistics for monitoring.

    Returns counts of processed events by type and status.
    Especially useful for tracking duplicate order prevention.
    """
    event_consumer = get_event_consumer()
    return await event_consumer.get_processing_stats(hours=hours)


@app.post("/api/v1/events/cleanup")
async def cleanup_old_events(retention_days: int = 7):
    """
    Clean up old processed events.

    Note: For execution service, consider keeping records longer
    for audit trail purposes.
    """
    event_consumer = get_event_consumer()
    deleted = await event_consumer.cleanup_old_events(retention_days=retention_days)

    return {
        "deleted_count": deleted,
        "retention_days": retention_days,
        "service": "execution",
    }


@app.get("/api/v1/events/order/{idempotency_key}")
async def get_order_by_event(idempotency_key: str):
    """
    Get order details by event idempotency key.

    Useful for checking if an order was already placed for a specific event.
    """
    event_consumer = get_event_consumer()
    order = await event_consumer.get_order_by_event(idempotency_key, idempotency_key)

    if order is None:
        raise HTTPException(status_code=404, detail="No order found for this event")

    return order


# =============================================================================
# Corporate Actions Endpoints
# =============================================================================

@app.get("/api/v1/corporate-actions/check/{symbol}")
async def check_symbol_corporate_actions(
    symbol: str,
    market: str = Query(default="US"),
):
    """
    Check for pending or upcoming corporate actions for a symbol.

    This endpoint is used before order execution to warn about
    potential corporate action impacts.

    Returns:
        Corporate action status for the symbol
    """
    warning = await check_pending_corporate_actions(symbol, market)

    if warning:
        return {
            "symbol": symbol.upper(),
            "has_pending_actions": True,
            "warning": warning,
            "trading_allowed": warning.get("severity") != "critical",
        }

    return {
        "symbol": symbol.upper(),
        "has_pending_actions": False,
        "warning": None,
        "trading_allowed": True,
    }


@app.get("/api/v1/positions/adjustment-check")
async def check_position_adjustments():
    """
    Check if any positions need adjustment for corporate actions.

    This endpoint checks all current positions against pending
    corporate actions to identify any that need adjustment.

    Returns:
        List of positions that may need adjustment
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    positions = broker.get_positions()
    adjustments_needed = []

    for position in positions:
        symbol = position.get("symbol")
        if not symbol:
            continue

        warning = await check_pending_corporate_actions(symbol, position.get("market", "US"))
        if warning:
            adjustments_needed.append({
                "symbol": symbol,
                "position": position,
                "corporate_action": warning,
            })

    return {
        "positions_checked": len(positions),
        "adjustments_needed": len(adjustments_needed),
        "details": adjustments_needed,
    }


@app.post("/api/v1/positions/{symbol}/apply-split")
async def apply_split_to_position(
    symbol: str,
    split_ratio_from: int,
    split_ratio_to: int,
    applied_by: str = Query(default="manual"),
):
    """
    Apply a stock split adjustment to a position.

    CRITICAL: This adjusts the position quantity and average price.
    Should only be called after verifying the split details.

    For a 4-for-1 split:
    - split_ratio_from = 1
    - split_ratio_to = 4
    - Quantity multiplies by 4
    - Average price divides by 4
    - Cost basis remains the same

    Args:
        symbol: Ticker symbol
        split_ratio_from: Original share count (e.g., 1)
        split_ratio_to: New share count (e.g., 4)
        applied_by: User/system applying the adjustment

    Returns:
        Updated position details
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    # Get current position
    positions = broker.get_positions()
    position = next((p for p in positions if p.get("symbol") == symbol.upper()), None)

    if not position:
        raise HTTPException(status_code=404, detail=f"No position found for {symbol}")

    # Calculate adjustment
    split_factor = split_ratio_to / split_ratio_from
    old_quantity = position.get("quantity", 0)
    old_avg_price = position.get("average_entry_price", 0)

    new_quantity = old_quantity * split_factor
    new_avg_price = old_avg_price / split_factor

    logger.info(
        "Applying split to position",
        symbol=symbol,
        split_ratio=f"{split_ratio_to}-for-{split_ratio_from}",
        old_quantity=old_quantity,
        new_quantity=new_quantity,
        old_avg_price=old_avg_price,
        new_avg_price=new_avg_price,
        applied_by=applied_by,
    )

    # Update position in broker
    # Note: This depends on broker implementation
    try:
        if hasattr(broker, 'adjust_position'):
            broker.adjust_position(
                symbol=symbol.upper(),
                new_quantity=new_quantity,
                new_avg_price=new_avg_price,
                reason=f"Split {split_ratio_to}-for-{split_ratio_from}",
            )
        else:
            # Manual adjustment for paper broker
            broker._positions[symbol.upper()] = {
                **position,
                "quantity": new_quantity,
                "average_entry_price": new_avg_price,
            }

        return {
            "status": "success",
            "symbol": symbol.upper(),
            "split_ratio": f"{split_ratio_to}-for-{split_ratio_from}",
            "before": {
                "quantity": old_quantity,
                "average_price": old_avg_price,
            },
            "after": {
                "quantity": new_quantity,
                "average_price": new_avg_price,
            },
            "applied_by": applied_by,
        }

    except Exception as e:
        logger.error("Failed to apply split to position", symbol=symbol, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to apply split: {str(e)}")


# =============================================================================
# Performance Monitoring Endpoints
# =============================================================================

class PeriodEnum(str, Enum):
    """Time period for performance metrics."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


class PerformanceMetrics(BaseModel):
    """Core performance metrics."""
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    breakeven_trades: int = 0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    total_pnl: float = 0.0
    average_win: float = 0.0
    average_loss: float = 0.0
    largest_win: float = 0.0
    largest_loss: float = 0.0
    max_drawdown: float = 0.0
    sharpe_ratio: Optional[float] = None
    avg_holding_period_hours: Optional[float] = None


class SymbolPerformance(BaseModel):
    """Performance metrics for a single symbol."""
    trades: int = 0
    pnl: float = 0.0
    win_rate: float = 0.0


class StrategyPerformance(BaseModel):
    """Performance metrics for a single strategy."""
    trades: int = 0
    pnl: float = 0.0
    win_rate: float = 0.0


class PerformanceResponse(BaseModel):
    """Full performance response."""
    period: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    metrics: PerformanceMetrics
    by_symbol: Dict[str, SymbolPerformance]
    by_strategy: Dict[str, StrategyPerformance]
    recent_trades: List[Dict[str, Any]]


def _calculate_period_bounds(period: PeriodEnum) -> tuple:
    """
    Calculate the start and end datetime for a given period.

    Returns:
        Tuple of (start_datetime, end_datetime)
    """
    now = datetime.utcnow()

    if period == PeriodEnum.DAILY:
        # Start of today (midnight UTC)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now
    elif period == PeriodEnum.WEEKLY:
        # Start of this week (Monday midnight UTC)
        days_since_monday = now.weekday()
        start = (now - timedelta(days=days_since_monday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return start, now
    elif period == PeriodEnum.MONTHLY:
        # Start of this month
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now
    else:  # ALL_TIME
        return None, now


def _filter_trades_by_period(
    trades: List[Dict],
    period_start: Optional[datetime],
    period_end: datetime,
) -> List[Dict]:
    """Filter trades to only include those within the specified period."""
    if period_start is None:
        return trades

    filtered = []
    for trade in trades:
        trade_time = trade.get("timestamp")
        if isinstance(trade_time, str):
            trade_time = datetime.fromisoformat(trade_time.replace("Z", "+00:00"))
        if trade_time and period_start <= trade_time <= period_end:
            filtered.append(trade)

    return filtered


def _extract_strategy_from_trade(trade: Dict) -> str:
    """
    Extract strategy identifier from a trade.

    Tries to extract from:
    1. rule_version_id (e.g., "momentum_v1_1.0.0" -> "momentum")
    2. reason field (if contains strategy name)
    3. Default to "unknown"
    """
    # Try rule_version_id first
    rule_version = trade.get("rule_version_id", "")
    if rule_version:
        # Format is typically "strategy_id_version" like "momentum_v1_1.0.0"
        parts = rule_version.split("_")
        if len(parts) >= 1:
            # Return the strategy base name
            if parts[0] in ["momentum", "mean", "trend", "breakout", "scalp"]:
                return parts[0]
            if len(parts) >= 2 and parts[0] == "mean":
                return "mean_reversion"
            return parts[0]

    # Try reason field
    reason = trade.get("reason", "").lower()
    strategy_keywords = {
        "momentum": "momentum",
        "mean reversion": "mean_reversion",
        "trend": "trend_following",
        "breakout": "breakout",
        "scalp": "scalping",
    }
    for keyword, strategy in strategy_keywords.items():
        if keyword in reason:
            return strategy

    return "unknown"


def _calculate_performance_metrics(trades: List[Dict]) -> PerformanceMetrics:
    """
    Calculate comprehensive performance metrics from a list of trades.

    Args:
        trades: List of trade dictionaries with P&L information

    Returns:
        PerformanceMetrics object with calculated values
    """
    if not trades:
        return PerformanceMetrics()

    # Separate winning and losing trades
    # Only count trades that have realized P&L (closing trades)
    closing_trades = [t for t in trades if t.get("net_pnl") is not None]

    if not closing_trades:
        return PerformanceMetrics(total_trades=len(trades))

    winning_trades = [t for t in closing_trades if (t.get("net_pnl") or 0) > 0]
    losing_trades = [t for t in closing_trades if (t.get("net_pnl") or 0) < 0]
    breakeven_trades = [t for t in closing_trades if (t.get("net_pnl") or 0) == 0]

    # Calculate P&L values
    wins = [t.get("net_pnl", 0) for t in winning_trades]
    losses = [t.get("net_pnl", 0) for t in losing_trades]

    total_wins = sum(wins)
    total_losses = abs(sum(losses))
    total_pnl = sum(t.get("net_pnl", 0) for t in closing_trades)

    # Win rate
    win_rate = len(winning_trades) / len(closing_trades) if closing_trades else 0.0

    # Profit factor (total wins / total losses)
    profit_factor = total_wins / total_losses if total_losses > 0 else float('inf') if total_wins > 0 else 0.0

    # Average win and loss
    average_win = sum(wins) / len(wins) if wins else 0.0
    average_loss = sum(losses) / len(losses) if losses else 0.0

    # Largest win and loss
    largest_win = max(wins) if wins else 0.0
    largest_loss = min(losses) if losses else 0.0

    # Calculate max drawdown from equity curve
    max_drawdown = _calculate_max_drawdown(closing_trades)

    # Calculate Sharpe ratio (annualized)
    sharpe_ratio = _calculate_sharpe_ratio(closing_trades)

    # Calculate average holding period
    avg_holding_period = _calculate_avg_holding_period(closing_trades)

    return PerformanceMetrics(
        total_trades=len(trades),
        winning_trades=len(winning_trades),
        losing_trades=len(losing_trades),
        breakeven_trades=len(breakeven_trades),
        win_rate=round(win_rate, 4),
        profit_factor=round(profit_factor, 2) if profit_factor != float('inf') else 999.99,
        total_pnl=round(total_pnl, 2),
        average_win=round(average_win, 2),
        average_loss=round(average_loss, 2),
        largest_win=round(largest_win, 2),
        largest_loss=round(largest_loss, 2),
        max_drawdown=round(max_drawdown, 4),
        sharpe_ratio=round(sharpe_ratio, 2) if sharpe_ratio is not None else None,
        avg_holding_period_hours=round(avg_holding_period, 2) if avg_holding_period is not None else None,
    )


def _calculate_max_drawdown(trades: List[Dict]) -> float:
    """
    Calculate maximum drawdown from a sequence of trades.

    Max drawdown is the maximum peak-to-trough decline in the equity curve.

    Returns:
        Maximum drawdown as a decimal (0.05 = 5%)
    """
    if not trades:
        return 0.0

    # Sort trades by timestamp
    sorted_trades = sorted(
        trades,
        key=lambda t: t.get("timestamp") if isinstance(t.get("timestamp"), datetime)
        else datetime.fromisoformat(str(t.get("timestamp", "2000-01-01")).replace("Z", "+00:00"))
    )

    # Build equity curve (cumulative P&L)
    equity = 0.0
    peak = 0.0
    max_dd = 0.0

    for trade in sorted_trades:
        pnl = trade.get("net_pnl", 0) or 0
        equity += pnl

        if equity > peak:
            peak = equity

        if peak > 0:
            drawdown = (peak - equity) / peak
            max_dd = max(max_dd, drawdown)

    return max_dd


def _calculate_sharpe_ratio(trades: List[Dict], risk_free_rate: float = 0.02) -> Optional[float]:
    """
    Calculate annualized Sharpe ratio.

    Sharpe = (mean return - risk free rate) / std deviation of returns

    Args:
        trades: List of trades with P&L
        risk_free_rate: Annual risk-free rate (default 2%)

    Returns:
        Annualized Sharpe ratio or None if insufficient data
    """
    if len(trades) < 2:
        return None

    # Get daily returns
    returns = [t.get("net_pnl", 0) or 0 for t in trades]

    if not returns or all(r == 0 for r in returns):
        return None

    mean_return = statistics.mean(returns)

    try:
        std_return = statistics.stdev(returns)
    except statistics.StatisticsError:
        return None

    if std_return == 0:
        return None

    # Annualize (assuming ~252 trading days)
    # Daily risk-free rate
    daily_rf = risk_free_rate / 252

    # Sharpe ratio
    sharpe = (mean_return - daily_rf) / std_return

    # Annualize (multiply by sqrt of trading days)
    annualized_sharpe = sharpe * math.sqrt(252)

    return annualized_sharpe


def _calculate_avg_holding_period(trades: List[Dict]) -> Optional[float]:
    """
    Calculate average holding period in hours.

    This requires matching entry and exit trades, which is complex.
    For now, returns None as a placeholder.

    A full implementation would require tracking position entry/exit times.
    """
    # TODO: Implement holding period calculation by tracking entry/exit times
    # This requires associating entry trades with their corresponding exit trades
    return None


def _calculate_by_symbol(trades: List[Dict]) -> Dict[str, SymbolPerformance]:
    """Calculate performance metrics grouped by symbol."""
    by_symbol: Dict[str, Dict] = {}

    for trade in trades:
        symbol = trade.get("symbol", "UNKNOWN")
        if symbol not in by_symbol:
            by_symbol[symbol] = {"trades": 0, "wins": 0, "pnl": 0.0}

        by_symbol[symbol]["trades"] += 1
        pnl = trade.get("net_pnl", 0) or 0
        by_symbol[symbol]["pnl"] += pnl
        if pnl > 0:
            by_symbol[symbol]["wins"] += 1

    result = {}
    for symbol, data in by_symbol.items():
        win_rate = data["wins"] / data["trades"] if data["trades"] > 0 else 0.0
        result[symbol] = SymbolPerformance(
            trades=data["trades"],
            pnl=round(data["pnl"], 2),
            win_rate=round(win_rate, 2),
        )

    return result


def _calculate_by_strategy(trades: List[Dict]) -> Dict[str, StrategyPerformance]:
    """Calculate performance metrics grouped by strategy."""
    by_strategy: Dict[str, Dict] = {}

    for trade in trades:
        strategy = _extract_strategy_from_trade(trade)
        if strategy not in by_strategy:
            by_strategy[strategy] = {"trades": 0, "wins": 0, "pnl": 0.0}

        by_strategy[strategy]["trades"] += 1
        pnl = trade.get("net_pnl", 0) or 0
        by_strategy[strategy]["pnl"] += pnl
        if pnl > 0:
            by_strategy[strategy]["wins"] += 1

    result = {}
    for strategy, data in by_strategy.items():
        win_rate = data["wins"] / data["trades"] if data["trades"] > 0 else 0.0
        result[strategy] = StrategyPerformance(
            trades=data["trades"],
            pnl=round(data["pnl"], 2),
            win_rate=round(win_rate, 2),
        )

    return result


@app.get("/api/v1/performance", response_model=PerformanceResponse)
async def get_performance(
    period: PeriodEnum = Query(default=PeriodEnum.ALL_TIME, description="Time period for metrics"),
    limit_recent: int = Query(default=10, ge=1, le=100, description="Number of recent trades to include"),
):
    """
    Get comprehensive trading performance metrics.

    This endpoint calculates key trading statistics from historical trades,
    including win rate, profit factor, Sharpe ratio, and drawdown metrics.

    **Metrics calculated:**
    - Total trades, winning/losing trade counts
    - Win rate (percentage of profitable trades)
    - Profit factor (gross profits / gross losses)
    - Total P&L, average win/loss, largest win/loss
    - Maximum drawdown (peak-to-trough decline)
    - Sharpe ratio (risk-adjusted returns, annualized)

    **Groupings:**
    - By symbol: Performance breakdown per traded instrument
    - By strategy: Performance breakdown per trading strategy

    Args:
        period: Time period filter (daily, weekly, monthly, all_time)
        limit_recent: Number of recent trades to include in response

    Returns:
        PerformanceResponse with metrics, breakdowns, and recent trades
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    # Get all trades (no limit for calculations)
    all_trades = broker.get_trades(limit=10000)

    # Calculate period bounds
    period_start, period_end = _calculate_period_bounds(period)

    # Filter trades by period
    filtered_trades = _filter_trades_by_period(all_trades, period_start, period_end)

    logger.info(
        "Calculating performance metrics",
        period=period.value,
        total_trades=len(all_trades),
        filtered_trades=len(filtered_trades),
    )

    # Calculate metrics
    metrics = _calculate_performance_metrics(filtered_trades)

    # Calculate breakdowns
    by_symbol = _calculate_by_symbol(filtered_trades)
    by_strategy = _calculate_by_strategy(filtered_trades)

    # Get recent trades (already filtered, just limit)
    # Sort by timestamp descending
    sorted_trades = sorted(
        filtered_trades,
        key=lambda t: t.get("timestamp") if isinstance(t.get("timestamp"), datetime)
        else datetime.fromisoformat(str(t.get("timestamp", "2000-01-01")).replace("Z", "+00:00")),
        reverse=True,
    )
    recent_trades = sorted_trades[:limit_recent]

    # Convert datetime objects to ISO strings for JSON serialization
    serializable_trades = []
    for trade in recent_trades:
        trade_copy = trade.copy()
        if isinstance(trade_copy.get("timestamp"), datetime):
            trade_copy["timestamp"] = trade_copy["timestamp"].isoformat()
        serializable_trades.append(trade_copy)

    return PerformanceResponse(
        period=period.value,
        period_start=period_start,
        period_end=period_end,
        metrics=metrics,
        by_symbol=by_symbol,
        by_strategy=by_strategy,
        recent_trades=serializable_trades,
    )


# =============================================================================
# Fill Simulation Configuration Endpoints
# =============================================================================


class FillConfigUpdate(BaseModel):
    """Fill configuration update request."""
    max_volume_participation: Optional[float] = Field(
        None,
        ge=0.01,
        le=1.0,
        description="Maximum fraction of bar volume for fills (0.01-1.0)"
    )
    slippage_model: Optional[str] = Field(
        None,
        description="Slippage model: fixed, volatility, spread, or composite"
    )
    slippage_bps: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Base slippage in basis points"
    )
    enable_partial_fills: Optional[bool] = Field(
        None,
        description="Enable partial fill simulation"
    )
    enable_queue_delay: Optional[bool] = Field(
        None,
        description="Enable order queue delay simulation"
    )
    queue_delay_ms: Optional[float] = Field(
        None,
        ge=0,
        le=10000,
        description="Order queue delay in milliseconds"
    )
    apply_transaction_costs: Optional[bool] = Field(
        None,
        description="Apply market-specific transaction costs"
    )
    execution_algorithm: Optional[str] = Field(
        None,
        description="Execution algorithm: immediate, next_bar, vwap, twap, adaptive"
    )


class FillConfigResponse(BaseModel):
    """Fill configuration response."""
    max_volume_participation: float
    slippage_model: str
    slippage_bps: float
    enable_partial_fills: bool
    enable_price_improvement: bool
    enable_queue_delay: bool
    queue_delay_ms: float
    execution_algorithm: str
    limit_order_delay_bars: int
    apply_transaction_costs: bool
    fill_model_version: str


class FillStatsResponse(BaseModel):
    """Fill engine statistics response."""
    total_orders: int
    total_fills: int
    total_slippage: float
    total_costs: float
    average_slippage_per_fill: float
    fill_model_version: str
    config: Dict[str, Any]


@app.get("/api/v1/fills/config", response_model=FillConfigResponse)
async def get_fill_config():
    """
    Get current fill simulation configuration.

    Returns the current settings used for realistic fill simulation including:
    - Volume participation limits
    - Slippage model type and parameters
    - Partial fill and queue delay settings
    - Transaction cost application
    """
    # Try to get from realistic broker if available
    if broker and hasattr(broker, 'broker_config'):
        config = broker.broker_config
        return FillConfigResponse(
            max_volume_participation=config.max_volume_participation,
            slippage_model=config.slippage_model.value if hasattr(config.slippage_model, 'value') else str(config.slippage_model),
            slippage_bps=config.slippage_bps,
            enable_partial_fills=config.enable_partial_fills,
            enable_price_improvement=config.enable_price_improvement,
            enable_queue_delay=config.enable_queue_delay,
            queue_delay_ms=config.queue_delay_ms,
            execution_algorithm=config.execution_algorithm.value if hasattr(config.execution_algorithm, 'value') else str(config.execution_algorithm),
            limit_order_delay_bars=config.limit_order_delay_bars,
            apply_transaction_costs=config.apply_transaction_costs,
            fill_model_version="1.0.0",
        )

    # Fallback to environment defaults
    return FillConfigResponse(
        max_volume_participation=float(os.getenv('MAX_VOLUME_PARTICIPATION', '0.1')),
        slippage_model=os.getenv('SLIPPAGE_MODEL', 'volatility'),
        slippage_bps=float(os.getenv('SLIPPAGE_BPS', '5.0')),
        enable_partial_fills=os.getenv('ENABLE_PARTIAL_FILLS', 'true').lower() == 'true',
        enable_price_improvement=True,
        enable_queue_delay=os.getenv('ENABLE_QUEUE_DELAY', 'true').lower() == 'true',
        queue_delay_ms=float(os.getenv('ORDER_QUEUE_DELAY_MS', '50')),
        execution_algorithm=os.getenv('EXECUTION_ALGORITHM', 'next_bar'),
        limit_order_delay_bars=1,
        apply_transaction_costs=os.getenv('APPLY_TRANSACTION_COSTS', 'true').lower() == 'true',
        fill_model_version="1.0.0",
    )


@app.put("/api/v1/fills/config", response_model=FillConfigResponse)
async def update_fill_config(update: FillConfigUpdate):
    """
    Update fill simulation configuration.

    Allows runtime adjustment of fill simulation parameters without restart.
    Only non-null fields in the request will be updated.

    **Parameters:**
    - max_volume_participation: Max fraction of bar volume (0.01-1.0)
    - slippage_model: Slippage calculation method
    - slippage_bps: Base slippage in basis points
    - enable_partial_fills: Allow orders to fill across bars
    - enable_queue_delay: Simulate order queue latency
    - queue_delay_ms: Queue delay in milliseconds
    - apply_transaction_costs: Apply market fees
    - execution_algorithm: Order execution method
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    if not hasattr(broker, 'update_fill_config'):
        raise HTTPException(
            status_code=501,
            detail="Realistic fill configuration not available. Use RealisticPaperBroker."
        )

    # Build update dict from non-null fields
    updates = {}
    for field_name, value in update.dict().items():
        if value is not None:
            updates[field_name] = value

    if updates:
        broker.update_fill_config(**updates)
        logger.info("Fill config updated", updates=updates)

    return await get_fill_config()


@app.get("/api/v1/fills/stats", response_model=FillStatsResponse)
async def get_fill_stats():
    """
    Get fill engine statistics.

    Returns cumulative statistics from the fill simulation engine including:
    - Total orders processed
    - Total fills generated
    - Cumulative slippage and costs
    - Average slippage per fill
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    if hasattr(broker, 'get_fill_engine_stats'):
        stats = broker.get_fill_engine_stats()
        return FillStatsResponse(**stats)

    # Return empty stats for basic broker
    return FillStatsResponse(
        total_orders=0,
        total_fills=0,
        total_slippage=0.0,
        total_costs=0.0,
        average_slippage_per_fill=0.0,
        fill_model_version="basic",
        config={},
    )


@app.post("/api/v1/fills/stats/reset")
async def reset_fill_stats():
    """
    Reset fill engine statistics.

    Clears cumulative counters for slippage, costs, and fill counts.
    Useful for starting fresh tracking after configuration changes.
    """
    if not broker:
        raise HTTPException(status_code=503, detail="Broker not initialized")

    if hasattr(broker, 'fill_engine'):
        broker.fill_engine.reset_stats()
        logger.info("Fill stats reset")
        return {"status": "ok", "message": "Fill statistics reset"}

    return {"status": "ok", "message": "No fill statistics to reset (basic broker)"}


@app.get("/api/v1/fills/slippage-models")
async def get_slippage_models():
    """
    Get available slippage models and their descriptions.

    Returns information about each slippage model type including:
    - Model name and description
    - Configuration parameters
    - Use case recommendations
    """
    return {
        "models": [
            {
                "name": "fixed",
                "description": "Constant basis points slippage",
                "parameters": ["bps", "randomize"],
                "use_case": "Quick backtests, stable markets"
            },
            {
                "name": "volatility",
                "description": "Volatility-adjusted slippage with size impact",
                "parameters": ["base_bps", "vol_multiplier", "size_impact_factor"],
                "use_case": "Most realistic for varied market conditions"
            },
            {
                "name": "spread",
                "description": "Bid-ask spread based slippage",
                "parameters": ["impact_factor", "use_full_spread", "fallback_spread_bps"],
                "use_case": "When bid-ask data is available"
            },
            {
                "name": "composite",
                "description": "Combines multiple slippage models",
                "parameters": ["models", "aggregation"],
                "use_case": "Complex scenarios requiring multiple factors"
            }
        ],
        "default": "volatility",
    }


@app.get("/api/v1/fills/execution-algorithms")
async def get_execution_algorithms():
    """
    Get available execution algorithms and their descriptions.

    Returns information about each execution algorithm including:
    - Algorithm name and description
    - Behavior characteristics
    - Recommended use cases
    """
    return {
        "algorithms": [
            {
                "name": "immediate",
                "description": "Fill at current price immediately",
                "behavior": "Single fill at current price with slippage",
                "use_case": "HFT simulation, market orders"
            },
            {
                "name": "next_bar",
                "description": "Fill at next bar open price",
                "behavior": "More realistic delay, fills at bar open",
                "use_case": "Default for most backtests"
            },
            {
                "name": "vwap",
                "description": "Volume-weighted average price execution",
                "behavior": "Distributes order across bars by volume",
                "use_case": "Large orders, institutional simulation"
            },
            {
                "name": "twap",
                "description": "Time-weighted average price execution",
                "behavior": "Equal distribution across time periods",
                "use_case": "Large orders with time constraints"
            },
            {
                "name": "adaptive",
                "description": "Adapts algorithm based on order size",
                "behavior": "Uses VWAP for large orders, next_bar for small",
                "use_case": "Mixed order size scenarios"
            }
        ],
        "default": "next_bar",
    }


@app.get("/api/v1/fills/cost-models")
async def get_cost_models():
    """
    Get available transaction cost models by market.

    Returns fee structures for different markets including:
    - Commission rates
    - Exchange fees
    - Regulatory fees
    - Clearing fees
    """
    return {
        "markets": {
            "US": {
                "description": "US Equities (NYSE, NASDAQ)",
                "components": ["commission", "sec_fee", "taf_fee", "clearing_fee"],
                "typical_cost_bps": "1-5 bps"
            },
            "ASX": {
                "description": "Australian Securities Exchange",
                "components": ["commission", "exchange_fee", "clearing_fee"],
                "typical_cost_bps": "5-15 bps"
            },
            "CRYPTO": {
                "description": "Cryptocurrency exchanges",
                "components": ["maker_fee", "taker_fee"],
                "typical_cost_bps": "10-50 bps"
            },
            "FOREX": {
                "description": "Foreign Exchange",
                "components": ["spread_markup", "commission"],
                "typical_cost_bps": "0-3 bps"
            }
        }
    }


# =============================================================================
# Trading Session Endpoints
# =============================================================================

# Import session manager (lazy import to avoid circular dependencies)
_session_manager = None


def _get_session_manager():
    """Get or create session manager."""
    global _session_manager
    if _session_manager is None:
        try:
            from simulation.trading_sessions import TradingSessionManager
            _session_manager = TradingSessionManager()
        except ImportError:
            return None
    return _session_manager


class SessionStateEnum(str, Enum):
    """Session states for API responses."""
    CLOSED = "CLOSED"
    PRE_MARKET = "PRE_MARKET"
    PRE_OPEN = "PRE_OPEN"
    REGULAR = "REGULAR"
    PRE_CLOSE = "PRE_CLOSE"
    AFTER_HOURS = "AFTER_HOURS"
    HOLIDAY = "HOLIDAY"
    EARLY_CLOSE = "EARLY_CLOSE"
    HALTED = "HALTED"
    UNKNOWN = "UNKNOWN"


class SessionInfoResponse(BaseModel):
    """Session information response."""
    market: str
    state: str
    state_since: Optional[str]
    next_state: Optional[str]
    next_state_at: Optional[str]
    is_trading_allowed: bool
    is_extended_hours: bool
    regular_open: Optional[str]
    regular_close: Optional[str]
    pre_market_open: Optional[str]
    after_hours_close: Optional[str]
    early_close_time: Optional[str]
    timezone: str
    trading_day: bool
    holiday_name: Optional[str]


class AllSessionsResponse(BaseModel):
    """Response containing all market sessions."""
    sessions: Dict[str, SessionInfoResponse]
    timestamp: str


class OrderTimingRequest(BaseModel):
    """Order timing validation request."""
    symbol: str
    market: str = "US"
    order_type: str = "MARKET"
    allow_queue: bool = True


class OrderTimingResponse(BaseModel):
    """Order timing validation response."""
    allowed: bool
    reason: Optional[str]
    session_state: str
    would_execute_at: Optional[str]
    warning: Optional[str]


@app.get("/api/v1/sessions/{market}", response_model=SessionInfoResponse)
async def get_session_status(market: str):
    """
    Get current trading session status for a market.

    Returns comprehensive session information including:
    - Current session state (CLOSED, PRE_MARKET, REGULAR, etc.)
    - Session times (open, close, pre-market, after-hours)
    - Whether trading is currently allowed
    - Next state transition time

    **Markets available:** US, ASX, LSE, TSE, CRYPTO, FOREX, US_FUTURES
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    try:
        info = manager.get_session_info(market.upper())
        return SessionInfoResponse(**info.to_dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/sessions", response_model=AllSessionsResponse)
async def get_all_sessions():
    """
    Get trading session status for all markets.

    Returns current session state for all configured markets in one call.
    Useful for dashboards showing global market status.
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    all_sessions = manager.get_all_sessions()
    sessions_dict = {
        market: SessionInfoResponse(**info.to_dict())
        for market, info in all_sessions.items()
    }

    return AllSessionsResponse(
        sessions=sessions_dict,
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/v1/sessions/validate-timing", response_model=OrderTimingResponse)
async def validate_order_timing(request: OrderTimingRequest):
    """
    Validate if an order can be placed given current session state.

    Checks:
    - Is the market currently open?
    - Is extended hours trading enabled?
    - Can market orders be placed?
    - When would the order execute?

    Returns whether the order is allowed and any warnings.
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    validation = manager.validate_order_timing(
        order={
            "symbol": request.symbol,
            "market": request.market,
            "order_type": request.order_type,
        },
        allow_queue=request.allow_queue,
    )

    return OrderTimingResponse(**validation.to_dict())


@app.get("/api/v1/sessions/{market}/schedule")
async def get_trading_schedule(
    market: str,
    days: int = Query(default=5, ge=1, le=30, description="Number of days to include"),
):
    """
    Get trading schedule for upcoming days.

    Returns a list of upcoming trading days with:
    - Date and day of week
    - Whether it's a trading day
    - Open and close times
    - Holiday and early close indicators
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    try:
        schedule = manager.get_trading_schedule(market.upper(), days)
        return {
            "market": market.upper(),
            "schedule": schedule,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/sessions/{market}/halt")
async def halt_market_trading(
    market: str,
    reason: str = Query(default="manual", description="Reason for halt"),
):
    """
    Halt trading for a market (circuit breaker).

    This immediately sets the market session to HALTED state,
    preventing any new orders from being placed.

    **CAUTION:** This is a manual override. Use only when needed.
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    try:
        manager.halt_trading(market.upper(), reason)
        logger.warning("Market trading halted", market=market, reason=reason)
        return {
            "status": "halted",
            "market": market.upper(),
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/sessions/{market}/resume")
async def resume_market_trading(market: str):
    """
    Resume trading for a halted market.

    Removes the trading halt and recalculates the actual session state.
    """
    manager = _get_session_manager()
    if not manager:
        raise HTTPException(status_code=503, detail="Session manager not available")

    try:
        manager.resume_trading(market.upper())
        info = manager.get_session_info(market.upper())
        logger.info("Market trading resumed", market=market, new_state=info.state.value)
        return {
            "status": "resumed",
            "market": market.upper(),
            "current_state": info.state.value,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/v1/sessions/config")
async def get_session_config():
    """
    Get session manager configuration.

    Returns current settings for extended hours and monitoring.
    """
    manager = _get_session_manager()
    if not manager:
        return {
            "status": "unavailable",
            "allow_extended_hours": os.getenv('ALLOW_EXTENDED_HOURS_TRADING', 'false').lower() == 'true',
        }

    return {
        "status": "active",
        "allow_extended_hours": manager.allow_extended_hours,
        "check_interval_seconds": manager.check_interval,
        "markets_configured": list(manager._sessions.keys()),
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("EXECUTION_SERVICE_PORT", 5104)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
