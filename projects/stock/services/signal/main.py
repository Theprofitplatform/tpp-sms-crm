"""
Signal Service - Stock Trading Automation System

FastAPI service for generating trading signals using various strategies.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5102 --reload

Endpoints:
    GET /health                         - Health check
    POST /api/v1/signals/generate       - Generate signals for symbols
    GET /api/v1/signals                 - List signals
    GET /api/v1/signals/{id}            - Get signal by ID
    GET /api/v1/signals/{id}/validate   - Validate signal against current market
    GET /api/v1/signals/features/{symbol} - Get current features for a symbol
    GET /api/v1/strategies              - List available strategies

Dependencies:
    - Python 3.10+
    - FastAPI
    - httpx
    - structlog
"""

import os
import uuid
import hashlib
import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from indicators.technical import TechnicalIndicators
from strategies.technical.momentum import MomentumStrategy
from strategies.technical.mean_reversion import MeanReversionStrategy
from strategies.technical.breakout import BreakoutStrategy
from strategies.technical.macd_crossover import MACDCrossoverStrategy
from strategies.technical.rsi_divergence import RSIDivergenceStrategy
from models import Signal as SignalModel, SignalFeatures, SignalSide, EntryType, TimeInForce
from confidence import ConfidenceScorer
from confidence.invalidation import validate_signal_against_market, InvalidationRule
from events.consumer import EventConsumer, get_event_consumer, with_deduplication
from kill_switch import (
    DistributedKillSwitch,
    KillSwitchStatus as KillSwitchStatusModel,
    KillSwitchActiveError,
    initialize_kill_switch,
    get_kill_switch,
)

# Configure structured logging
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
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:5101')

# Strategy registry
STRATEGIES = {
    'momentum': MomentumStrategy,
    'mean_reversion': MeanReversionStrategy,
    'breakout': BreakoutStrategy,
    'macd_crossover': MACDCrossoverStrategy,
    'rsi_divergence': RSIDivergenceStrategy,
}

# In-memory signal storage (in production, use a database)
SIGNAL_STORE: Dict[str, dict] = {}  # id -> signal dict
MAX_SIGNALS = 100  # Keep last 100 signals

# Distributed kill switch (initialized in lifespan)
distributed_kill_switch: Optional[DistributedKillSwitch] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    global distributed_kill_switch

    logger.info("Starting Signal Service...")

    # Initialize distributed kill switch (Redis-backed)
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
    distributed_kill_switch = await initialize_kill_switch(
        service_name="signal-service",
        redis_url=redis_url,
    )
    logger.info("Distributed kill switch initialized", redis_url=redis_url)

    # Initialize event consumer for deduplication
    event_consumer = get_event_consumer()
    await event_consumer.initialize()
    logger.info("Event consumer initialized")

    logger.info("Signal Service started", strategies=list(STRATEGIES.keys()))
    yield

    # Cleanup distributed kill switch
    if distributed_kill_switch:
        await distributed_kill_switch.close()

    # Cleanup event consumer
    await event_consumer.close()
    logger.info("Shutting down Signal Service...")


# Create FastAPI app
app = FastAPI(
    title="Stock Signal Service",
    description="Trading signal generation for the Stock Trading Automation System",
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

class SignalFeaturesResponse(BaseModel):
    """Signal features response."""
    price: float
    sma_20: float
    sma_50: float
    sma_200: Optional[float] = None
    rsi_14: float
    macd: float
    macd_signal: float
    macd_histogram: float
    bb_upper: float
    bb_middle: float
    bb_lower: float
    bb_width: float
    bb_position: float
    atr_14: float
    volume: int
    volume_sma_20: float
    volume_ratio: float
    trend_strength: float
    stoch_k: Optional[float] = None
    stoch_d: Optional[float] = None
    price_to_sma_20: float
    price_to_sma_50: float


class InvalidationRuleResponse(BaseModel):
    """Invalidation rule response."""
    condition: str
    threshold: float
    description: str
    comparison: str
    feature_name: str


class SignalResponse(BaseModel):
    """Trading signal response."""
    id: str
    time: datetime
    symbol: str
    market: str = "US"
    side: str
    signal_type: str  # Legacy compatibility
    strategy_id: str
    strategy_version: str
    entry_type: str
    suggested_limit_price: Optional[float] = None
    time_in_force: str
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    confidence_score: float = Field(ge=0, le=1)
    strength: float = Field(ge=0, le=1)  # Legacy compatibility
    confidence: Optional[float] = Field(default=None, ge=0, le=1)  # Legacy
    confidence_factors: Dict[str, float] = Field(default_factory=dict)
    reason: str
    reasoning: str  # Legacy compatibility
    features: Optional[Dict[str, Any]] = None
    indicators: Dict[str, Any] = Field(default_factory=dict)  # Legacy
    invalidation_rules: List[Dict[str, Any]] = Field(default_factory=list)
    valid_until: Optional[datetime] = None
    expires_at: Optional[datetime] = None  # Legacy compatibility
    data_snapshot_hash: str
    rule_version_id: str
    status: str = "PENDING"


class GenerateSignalRequest(BaseModel):
    """Request to generate signals."""
    symbols: List[str]
    market: str = "US"
    strategy_id: str
    strategy_config: Optional[dict] = None
    lookback_days: int = 100


class GenerateSignalResponse(BaseModel):
    """Response with generated signals."""
    signals: List[SignalResponse]
    strategy_id: str
    strategy_version: str
    symbols_analyzed: int
    signals_generated: int
    timestamp: datetime


class StrategyInfo(BaseModel):
    """Strategy information."""
    id: str
    name: str
    type: str
    version: str
    description: str
    default_config: dict


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
    components: dict
    kill_switch: Optional[KillSwitchHealthInfo] = None


class ValidateSignalResponse(BaseModel):
    """Response for signal validation."""
    signal_id: str
    is_valid: bool
    triggered_rules: List[str]
    confidence_change: float
    recommendation: str
    original_confidence: float
    adjusted_confidence: float


# =============================================================================
# Helper Functions
# =============================================================================

async def fetch_ohlcv(symbol: str, market: str, days: int = 100) -> Optional[dict]:
    """Fetch OHLCV data from Data Service."""
    try:
        async with httpx.AsyncClient() as client:
            end = date.today()
            start = end - timedelta(days=days)

            response = await client.get(
                f"{DATA_SERVICE_URL}/api/v1/ohlcv/{symbol}",
                params={
                    "market": market,
                    "start": str(start),
                    "end": str(end),
                    "timeframe": "1d",
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(
                    "Failed to fetch OHLCV",
                    symbol=symbol,
                    status=response.status_code,
                )
                return None

    except Exception as e:
        logger.error("Error fetching OHLCV", symbol=symbol, error=str(e))
        return None


def signal_to_response(signal: SignalModel) -> SignalResponse:
    """Convert Signal model to SignalResponse."""
    signal_dict = signal.to_dict()
    return SignalResponse(
        id=signal_dict["id"],
        time=datetime.fromisoformat(signal_dict["time"]),
        symbol=signal_dict["symbol"],
        market=signal_dict["market"],
        side=signal_dict["side"],
        signal_type=signal_dict["signal_type"],
        strategy_id=signal_dict["strategy_id"],
        strategy_version=signal_dict["strategy_version"],
        entry_type=signal_dict["entry_type"],
        suggested_limit_price=signal_dict.get("suggested_limit_price"),
        time_in_force=signal_dict["time_in_force"],
        entry_price=signal_dict.get("entry_price"),
        target_price=signal_dict.get("target_price"),
        stop_loss=signal_dict.get("stop_loss"),
        confidence_score=signal_dict["confidence_score"],
        strength=signal_dict["strength"],
        confidence=signal_dict.get("confidence"),
        confidence_factors=signal_dict.get("confidence_factors", {}),
        reason=signal_dict["reason"],
        reasoning=signal_dict["reasoning"],
        features=signal_dict.get("features"),
        indicators=signal_dict.get("indicators", {}),
        invalidation_rules=signal_dict.get("invalidation_rules", []),
        valid_until=datetime.fromisoformat(signal_dict["valid_until"]) if signal_dict.get("valid_until") else None,
        expires_at=datetime.fromisoformat(signal_dict["expires_at"]) if signal_dict.get("expires_at") else None,
        data_snapshot_hash=signal_dict["data_snapshot_hash"],
        rule_version_id=signal_dict["rule_version_id"],
        status=signal_dict["status"],
    )


def calculate_features_from_ohlcv(ohlcv_data: List[dict]) -> Optional[SignalFeatures]:
    """Calculate all features from OHLCV data."""
    if len(ohlcv_data) < 30:
        return None

    highs = [bar['high'] for bar in ohlcv_data]
    lows = [bar['low'] for bar in ohlcv_data]
    closes = [bar['close'] for bar in ohlcv_data]
    volumes = [bar['volume'] for bar in ohlcv_data]

    # Calculate all indicators
    sma_20 = TechnicalIndicators.sma(closes, 20)
    sma_50 = TechnicalIndicators.sma(closes, 50) if len(closes) >= 50 else [None] * len(closes)
    sma_200 = TechnicalIndicators.sma(closes, 200) if len(closes) >= 200 else [None] * len(closes)
    rsi = TechnicalIndicators.rsi(closes, 14)
    atr = TechnicalIndicators.atr(highs, lows, closes)
    macd = TechnicalIndicators.macd(closes)
    bb = TechnicalIndicators.bollinger_bands(closes, 20, 2.0)
    stoch = TechnicalIndicators.stochastic(highs, lows, closes)

    current_price = closes[-1]
    current_sma_20 = sma_20[-1] if sma_20 else None
    current_sma_50 = sma_50[-1] if sma_50 else None
    current_sma_200 = sma_200[-1] if sma_200 else None

    if current_sma_20 is None:
        return None

    # Volume metrics
    avg_volume = sum(volumes[-20:]) / min(20, len(volumes))
    current_volume = volumes[-1]
    volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0

    # Bollinger Band metrics
    current_bb_upper = bb['upper'][-1] if bb['upper'] else 0.0
    current_bb_middle = bb['middle'][-1] if bb['middle'] else 0.0
    current_bb_lower = bb['lower'][-1] if bb['lower'] else 0.0

    bb_range = current_bb_upper - current_bb_lower if current_bb_upper and current_bb_lower else 1.0
    bb_position = (current_price - current_bb_lower) / bb_range if bb_range > 0 else 0.5
    bb_width = bb_range / current_bb_middle if current_bb_middle else 0.0

    # Trend strength
    trend_strength = 0.0
    if current_sma_20 and current_sma_50:
        sma_spread = (current_sma_20 - current_sma_50) / current_sma_50
        trend_strength = max(-1.0, min(1.0, sma_spread * 10))

    # Price-to-SMA
    price_to_sma_20 = (current_price - current_sma_20) / current_sma_20 if current_sma_20 else 0.0
    price_to_sma_50 = (current_price - current_sma_50) / current_sma_50 if current_sma_50 else 0.0

    return SignalFeatures(
        price=current_price,
        sma_20=current_sma_20,
        sma_50=current_sma_50 or current_sma_20,
        sma_200=current_sma_200,
        rsi_14=rsi[-1] if rsi else 50.0,
        macd=macd['macd'][-1] if macd['macd'] else 0.0,
        macd_signal=macd['signal'][-1] if macd['signal'] else 0.0,
        macd_histogram=macd['histogram'][-1] if macd['histogram'] else 0.0,
        bb_upper=current_bb_upper,
        bb_middle=current_bb_middle,
        bb_lower=current_bb_lower,
        bb_width=bb_width,
        bb_position=bb_position,
        atr_14=atr[-1] if atr else 0.0,
        volume=int(current_volume),
        volume_sma_20=avg_volume,
        volume_ratio=volume_ratio,
        trend_strength=trend_strength,
        stoch_k=stoch['k'][-1] if stoch['k'] else None,
        stoch_d=stoch['d'][-1] if stoch['d'] else None,
        price_to_sma_20=price_to_sma_20,
        price_to_sma_50=price_to_sma_50,
    )


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    components = {
        "strategies_loaded": len(STRATEGIES),
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

    # Check Data Service
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
        overall_status = "healthy" if components["data_service"] == "healthy" else "degraded"

    return HealthResponse(
        status=overall_status,
        service="signal-service",
        version="1.1.0",
        timestamp=datetime.utcnow(),
        components=components,
        kill_switch=kill_switch_info,
    )


@app.post("/api/v1/signals/generate", response_model=GenerateSignalResponse)
async def generate_signals(request: GenerateSignalRequest):
    """
    Generate trading signals for given symbols using specified strategy.

    The strategy analyzes market data and produces BUY/SELL/HOLD signals
    with confidence levels, feature snapshots, and invalidation rules.

    NOTE: If kill switch is active, signals will NOT be generated to prevent
    downstream systems from acting on them.
    """
    # Check kill switch before generating signals
    if distributed_kill_switch:
        try:
            if await distributed_kill_switch.is_active():
                ks_status = await distributed_kill_switch.get_status()
                logger.warning(
                    "Signal generation blocked - kill switch active",
                    symbols=request.symbols,
                    reason=ks_status.reason,
                )
                raise HTTPException(
                    status_code=503,
                    detail=f"Signal generation halted: Kill switch is active. Reason: {ks_status.reason}",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Kill switch check failed", error=str(e))
            # For signals, we can be more lenient - log warning but proceed
            # (Unlike order execution, generating signals doesn't directly risk capital)
            logger.warning(
                "Proceeding with signal generation despite kill switch check failure",
                error=str(e),
            )

    logger.info(
        "Generating signals",
        symbols=request.symbols,
        strategy=request.strategy_id,
    )

    # Validate strategy
    if request.strategy_id not in STRATEGIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown strategy: {request.strategy_id}. Available: {list(STRATEGIES.keys())}",
        )

    # Initialize strategy
    strategy_class = STRATEGIES[request.strategy_id]
    config = request.strategy_config or strategy_class.DEFAULT_CONFIG
    strategy = strategy_class(config)

    signals = []

    for symbol in request.symbols:
        # Fetch market data
        data = await fetch_ohlcv(symbol, request.market, request.lookback_days)

        if not data or not data.get("data"):
            logger.warning("No data for symbol", symbol=symbol)
            continue

        try:
            # Generate signal
            signal = strategy.analyze(
                symbol=symbol,
                market=request.market,
                ohlcv_data=data["data"],
                data_hash=data.get("data_hash", ""),
            )

            if signal:
                signals.append(signal)
                logger.info(
                    "Signal generated",
                    symbol=symbol,
                    type=signal.side.value,
                    confidence=signal.confidence_score,
                )

        except Exception as e:
            logger.error("Error analyzing symbol", symbol=symbol, error=str(e))

    # Store signals in memory
    for signal in signals:
        signal_dict = signal.to_dict()
        SIGNAL_STORE[signal.id] = signal_dict

    # Keep only last MAX_SIGNALS by time
    if len(SIGNAL_STORE) > MAX_SIGNALS:
        sorted_ids = sorted(
            SIGNAL_STORE.keys(),
            key=lambda x: SIGNAL_STORE[x]["time"],
            reverse=True,
        )
        for old_id in sorted_ids[MAX_SIGNALS:]:
            del SIGNAL_STORE[old_id]

    logger.info("Signals stored", count=len(signals), total_stored=len(SIGNAL_STORE))

    return GenerateSignalResponse(
        signals=[signal_to_response(s) for s in signals],
        strategy_id=request.strategy_id,
        strategy_version=strategy.VERSION,
        symbols_analyzed=len(request.symbols),
        signals_generated=len(signals),
        timestamp=datetime.utcnow(),
    )


@app.get("/api/v1/signals")
async def list_signals(
    symbol: Optional[str] = Query(default=None),
    strategy_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """
    List recent signals from in-memory storage.
    """
    results = list(SIGNAL_STORE.values())

    # Sort by time (newest first)
    results.sort(key=lambda x: x["time"], reverse=True)

    # Filter by symbol
    if symbol:
        results = [s for s in results if s["symbol"] == symbol.upper()]

    # Filter by strategy
    if strategy_id:
        results = [s for s in results if s["strategy_id"] == strategy_id]

    # Filter by status
    if status:
        results = [s for s in results if s["status"] == status.upper()]

    return results[:limit]


@app.get("/api/v1/signals/{signal_id}")
async def get_signal(signal_id: str):
    """
    Get a specific signal by ID.
    """
    if signal_id not in SIGNAL_STORE:
        raise HTTPException(status_code=404, detail=f"Signal not found: {signal_id}")

    return SIGNAL_STORE[signal_id]


@app.get("/api/v1/signals/{signal_id}/validate", response_model=ValidateSignalResponse)
async def validate_signal(signal_id: str):
    """
    Validate a signal against current market conditions.

    Fetches current market data, calculates features, and checks
    if any invalidation rules have been triggered.
    """
    if signal_id not in SIGNAL_STORE:
        raise HTTPException(status_code=404, detail=f"Signal not found: {signal_id}")

    signal_dict = SIGNAL_STORE[signal_id]
    symbol = signal_dict["symbol"]
    market = signal_dict.get("market", "US")

    # Fetch current market data
    data = await fetch_ohlcv(symbol, market, 100)

    if not data or not data.get("data"):
        raise HTTPException(
            status_code=503,
            detail=f"Could not fetch current market data for {symbol}",
        )

    # Calculate current features
    current_features = calculate_features_from_ohlcv(data["data"])

    if not current_features:
        raise HTTPException(
            status_code=503,
            detail="Insufficient data to calculate features",
        )

    # Get original features
    original_features = signal_dict.get("features", {})

    # Build invalidation rules from signal
    invalidation_rules = []
    for rule_dict in signal_dict.get("invalidation_rules", []):
        invalidation_rules.append(InvalidationRule(
            condition=rule_dict["condition"],
            threshold=rule_dict["threshold"],
            description=rule_dict["description"],
            comparison=rule_dict.get("comparison", "lt"),
            feature_name=rule_dict.get("feature_name", ""),
        ))

    # Validate signal
    validation_result = validate_signal_against_market(
        signal_side=signal_dict.get("side") or signal_dict.get("signal_type"),
        original_features=original_features,
        current_features=current_features.to_dict(),
        invalidation_rules=invalidation_rules,
    )

    original_confidence = signal_dict.get("confidence_score") or signal_dict.get("confidence", 0.5)
    adjusted_confidence = max(0.0, min(1.0, original_confidence + validation_result["confidence_change"]))

    # Update signal status if invalid
    if not validation_result["is_valid"]:
        SIGNAL_STORE[signal_id]["status"] = "INVALIDATED"

    return ValidateSignalResponse(
        signal_id=signal_id,
        is_valid=validation_result["is_valid"],
        triggered_rules=validation_result["triggered_rules"],
        confidence_change=validation_result["confidence_change"],
        recommendation=validation_result["recommendation"],
        original_confidence=original_confidence,
        adjusted_confidence=adjusted_confidence,
    )


@app.get("/api/v1/signals/features/{symbol}")
async def get_signal_features(
    symbol: str,
    market: str = Query(default="US"),
):
    """
    Get current signal features for a symbol.

    Calculates all technical indicators and returns them as a feature snapshot.
    This is useful for:
    - Debugging and monitoring
    - Manual signal analysis
    - Feature engineering validation
    """
    # Fetch market data
    data = await fetch_ohlcv(symbol.upper(), market, 200)

    if not data or not data.get("data"):
        raise HTTPException(
            status_code=404,
            detail=f"No market data available for {symbol.upper()}",
        )

    # Calculate features
    features = calculate_features_from_ohlcv(data["data"])

    if not features:
        raise HTTPException(
            status_code=503,
            detail="Insufficient data to calculate features",
        )

    return {
        "symbol": symbol.upper(),
        "market": market,
        "timestamp": datetime.utcnow().isoformat(),
        "features": features.to_dict(),
        "data_hash": data.get("data_hash", ""),
    }


@app.post("/api/v1/signals/{signal_id}/reject")
async def reject_signal(signal_id: str, reason: str = "Manual rejection"):
    """
    Reject a pending signal.
    """
    if signal_id not in SIGNAL_STORE:
        raise HTTPException(status_code=404, detail=f"Signal not found: {signal_id}")

    signal = SIGNAL_STORE[signal_id]
    if signal["status"] != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Signal is already {signal['status']}"
        )

    signal["status"] = "REJECTED"
    signal["rejected_reason"] = reason
    signal["rejected_at"] = datetime.utcnow().isoformat()

    logger.info("Signal rejected", signal_id=signal_id, reason=reason)
    return {"status": "success", "signal": signal}


async def fetch_real_time_prices(symbols: List[str]) -> Dict[str, float]:
    """
    Fetch real-time prices from the Data Service.

    Args:
        symbols: List of stock symbols

    Returns:
        Dictionary mapping symbol to current price
    """
    data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:5101")
    prices = {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        for symbol in symbols:
            try:
                response = await client.get(f"{data_service_url}/api/v1/quote/{symbol}")
                if response.status_code == 200:
                    quote = response.json()
                    prices[symbol] = quote.get("price", 0)
                    logger.debug("Fetched real-time price", symbol=symbol, price=prices[symbol])
                else:
                    logger.warning("Failed to fetch quote", symbol=symbol, status=response.status_code)
            except Exception as e:
                logger.warning("Error fetching quote", symbol=symbol, error=str(e))

    return prices


# Fallback prices if Data Service is unavailable
FALLBACK_PRICES = {
    "AAPL": 230.00,
    "GOOGL": 195.00,
    "MSFT": 425.00,
    "TSLA": 400.00,
    "NVDA": 140.00,
    "META": 600.00,
    "AMZN": 230.00,
}


@app.post("/api/v1/signals/demo")
async def create_demo_signals():
    """
    Create demo signals for testing the UI.
    Uses real-time prices from the Data Service when available.
    """
    import random

    demo_stocks_info = [
        ("AAPL", "Apple Inc."),
        ("GOOGL", "Alphabet Inc."),
        ("MSFT", "Microsoft Corp."),
        ("TSLA", "Tesla Inc."),
        ("NVDA", "NVIDIA Corp."),
        ("META", "Meta Platforms"),
        ("AMZN", "Amazon.com"),
    ]

    # Fetch real-time prices
    symbols = [s[0] for s in demo_stocks_info]
    real_time_prices = await fetch_real_time_prices(symbols)

    # Build demo_stocks with real prices (fallback to hardcoded if unavailable)
    demo_stocks = []
    for symbol, name in demo_stocks_info:
        price = real_time_prices.get(symbol) or FALLBACK_PRICES.get(symbol, 100.0)
        demo_stocks.append((symbol, name, price))

    logger.info(
        "Demo signals using prices",
        real_time_count=len(real_time_prices),
        fallback_count=len(symbols) - len(real_time_prices),
    )

    signals_created = []

    for symbol, name, price in demo_stocks:
        # Randomly decide signal type
        signal_type = random.choice(["BUY", "SELL", "BUY", "BUY"])  # Bias towards BUY
        confidence = random.uniform(0.65, 0.95)

        if signal_type == "BUY":
            target = price * (1 + random.uniform(0.05, 0.12))
            stop_loss = price * (1 - random.uniform(0.03, 0.06))
            reasoning = random.choice([
                f"RSI oversold bounce + MACD bullish crossover",
                f"Price broke above resistance with volume confirmation",
                f"Bullish engulfing pattern at support level",
                f"Golden cross: 50 SMA crossed above 200 SMA",
            ])
        else:
            target = price * (1 - random.uniform(0.05, 0.12))
            stop_loss = price * (1 + random.uniform(0.03, 0.06))
            reasoning = random.choice([
                f"RSI overbought with bearish divergence",
                f"Price rejected at major resistance",
                f"Death cross: 50 SMA crossed below 200 SMA",
                f"Bearish engulfing pattern at resistance",
            ])

        rsi = random.uniform(25, 75)
        macd = random.uniform(-2, 2)
        volume_ratio = random.uniform(1.1, 2.5)

        signal_dict = {
            "id": str(uuid.uuid4()),
            "time": datetime.utcnow().isoformat(),
            "symbol": symbol,
            "market": "US",
            "side": signal_type,
            "signal_type": signal_type,  # Legacy compatibility
            "strategy_id": random.choice(["momentum_v1", "mean_reversion_v1"]),
            "strategy_version": "1.1.0",
            "entry_type": random.choice(["market", "limit"]),
            "suggested_limit_price": round(price * (0.998 if signal_type == "BUY" else 1.002), 2),
            "time_in_force": "DAY",
            "entry_price": round(price, 2),
            "target_price": round(target, 2),
            "stop_loss": round(stop_loss, 2),
            "confidence_score": round(confidence, 3),
            "strength": round(confidence, 3),  # Legacy compatibility
            "confidence": round(confidence, 3),  # Legacy compatibility
            "confidence_factors": {
                "rsi": round(random.uniform(0.6, 0.9), 3),
                "macd": round(random.uniform(0.5, 0.85), 3),
                "volume": round(random.uniform(0.7, 0.95), 3),
                "trend": round(random.uniform(0.5, 0.9), 3),
            },
            "reason": reasoning,
            "reasoning": reasoning,  # Legacy compatibility
            "features": {
                "price": round(price, 2),
                "sma_20": round(price * random.uniform(0.97, 1.03), 2),
                "sma_50": round(price * random.uniform(0.95, 1.05), 2),
                "rsi_14": round(rsi, 1),
                "macd": round(macd, 2),
                "macd_signal": round(macd * 0.9, 2),
                "macd_histogram": round(macd * 0.1, 3),
                "bb_upper": round(price * 1.05, 2),
                "bb_middle": round(price, 2),
                "bb_lower": round(price * 0.95, 2),
                "bb_position": round(random.uniform(0.2, 0.8), 3),
                "atr_14": round(price * 0.02, 2),
                "volume_ratio": round(volume_ratio, 1),
            },
            "indicators": {
                "rsi": round(rsi, 1),
                "macd": round(macd, 2),
                "volume_ratio": round(volume_ratio, 1),
            },  # Legacy compatibility
            "invalidation_rules": [
                {
                    "condition": "price_below_stop" if signal_type == "BUY" else "price_above_stop",
                    "threshold": round(stop_loss, 2),
                    "description": f"Price {'drops below' if signal_type == 'BUY' else 'rises above'} stop loss at ${stop_loss:.2f}",
                    "comparison": "lte" if signal_type == "BUY" else "gte",
                    "feature_name": "price",
                },
                {
                    "condition": "rsi_overbought" if signal_type == "BUY" else "rsi_oversold",
                    "threshold": 80.0 if signal_type == "BUY" else 20.0,
                    "description": f"RSI exceeds {'80' if signal_type == 'BUY' else '20'}",
                    "comparison": "gte" if signal_type == "BUY" else "lte",
                    "feature_name": "rsi_14",
                },
            ],
            "valid_until": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),  # Legacy
            "data_snapshot_hash": hashlib.md5(f"{symbol}{datetime.utcnow()}".encode()).hexdigest()[:16],
            "rule_version_id": f"{'momentum' if 'momentum' in random.choice(['momentum', 'mean']) else 'mean_reversion'}_v1_1.1.0",
            "status": "PENDING",
        }

        SIGNAL_STORE[signal_dict["id"]] = signal_dict
        signals_created.append(signal_dict)

    # Keep only last MAX_SIGNALS
    if len(SIGNAL_STORE) > MAX_SIGNALS:
        sorted_ids = sorted(
            SIGNAL_STORE.keys(),
            key=lambda x: SIGNAL_STORE[x]["time"],
            reverse=True,
        )
        for old_id in sorted_ids[MAX_SIGNALS:]:
            del SIGNAL_STORE[old_id]

    logger.info("Demo signals created", count=len(signals_created))

    return {
        "status": "success",
        "signals_created": len(signals_created),
        "total_signals": len(SIGNAL_STORE),
        "signals": signals_created,
    }


@app.get("/api/v1/strategies", response_model=List[StrategyInfo])
async def list_strategies():
    """List available trading strategies."""
    strategies = []

    for strategy_id, strategy_class in STRATEGIES.items():
        strategies.append(StrategyInfo(
            id=strategy_id,
            name=strategy_class.NAME,
            type=strategy_class.TYPE,
            version=strategy_class.VERSION,
            description=strategy_class.DESCRIPTION,
            default_config=strategy_class.DEFAULT_CONFIG,
        ))

    return strategies


@app.get("/api/v1/strategies/{strategy_id}", response_model=StrategyInfo)
async def get_strategy(strategy_id: str):
    """Get details for a specific strategy."""
    if strategy_id not in STRATEGIES:
        raise HTTPException(status_code=404, detail=f"Strategy not found: {strategy_id}")

    strategy_class = STRATEGIES[strategy_id]
    return StrategyInfo(
        id=strategy_id,
        name=strategy_class.NAME,
        type=strategy_class.TYPE,
        version=strategy_class.VERSION,
        description=strategy_class.DESCRIPTION,
        default_config=strategy_class.DEFAULT_CONFIG,
    )


@app.post("/api/v1/backtest")
async def run_backtest(
    strategy_id: str,
    symbols: List[str],
    start_date: date,
    end_date: date,
    initial_capital: float = 100000,
    strategy_config: Optional[dict] = None,
):
    """
    Run a backtest for a strategy.

    Note: Full backtesting is handled by the backtest scripts.
    This endpoint provides a simple backtest preview.
    """
    # TODO: Implement backtest logic
    raise HTTPException(status_code=501, detail="Backtest endpoint not yet implemented")


# =============================================================================
# Time Endpoints for Cross-Market Support
# =============================================================================

@app.get("/api/v1/time")
async def get_service_time():
    """
    Get current service time and clock synchronization status.

    This endpoint is used for:
    - Clock synchronization checks across services
    - Verifying time alignment for signal generation
    - Ensuring signals are generated during appropriate market hours

    Returns:
        Service time information including UTC time, clock skew status,
        and market session information for all supported markets.
    """
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data'))

    try:
        from time.timezone import now_utc, from_utc, get_market_timezone
        from time.sessions import get_current_session
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
                    "can_generate_signals": session.session_type in ["regular", "pre", "post"],
                }
            except Exception as e:
                markets_status[market] = {"error": str(e)}

        # Basic clock sync check
        system_time = datetime.utcnow()
        skew_ms = (utc_now.replace(tzinfo=None) - system_time).total_seconds() * 1000

        return {
            "service": "signal-service",
            "version": "1.1.0",
            "utc_time": utc_now.isoformat(),
            "utc_timestamp": utc_now.timestamp(),
            "clock_sync": {
                "skew_ms": skew_ms,
                "is_synchronized": abs(skew_ms) < 30000,
                "max_skew_ms": 30000,
            },
            "markets": markets_status,
            "strategies_loaded": list(STRATEGIES.keys()),
        }
    except ImportError:
        # Fallback if time modules are not available
        utc_now = datetime.utcnow()
        return {
            "service": "signal-service",
            "version": "1.1.0",
            "utc_time": utc_now.isoformat(),
            "utc_timestamp": utc_now.timestamp(),
            "clock_sync": {
                "skew_ms": 0,
                "is_synchronized": True,
                "max_skew_ms": 30000,
            },
            "markets": {"note": "Time modules not available"},
            "strategies_loaded": list(STRATEGIES.keys()),
        }


# =============================================================================
# Event Handling Endpoints (with Deduplication)
# =============================================================================

class MarketDataReadyEvent(BaseModel):
    """Event payload for market data ready events."""
    event_id: Optional[str] = None
    idempotency_key: str
    event_type: str = "market_data_ready"
    symbols: List[str]
    market: str = "US"
    strategy_id: str = "momentum"
    data_hash: Optional[str] = None
    timestamp: Optional[str] = None


class EventResponse(BaseModel):
    """Standard event processing response."""
    event_id: str
    status: str
    is_cached: bool = False
    result: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


@app.post("/api/v1/events/market_data_ready", response_model=EventResponse)
async def handle_market_data_ready(event: MarketDataReadyEvent):
    """
    Handle market_data_ready event from the outbox dispatcher.

    This endpoint is called when new market data is available for signal generation.
    Uses consumer-side deduplication to prevent duplicate signal generation on retries.

    The event consumer will:
    1. Check if this event was already processed (by idempotency_key)
    2. If yes: return cached signals without regenerating
    3. If no: generate signals and cache the result
    """
    event_consumer = get_event_consumer()

    async def generate_signals_handler(event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handler function for signal generation."""
        symbols = event_data.get("symbols", [])
        market = event_data.get("market", "US")
        strategy_id = event_data.get("strategy_id", "momentum")

        if not symbols:
            return {"skipped": True, "reason": "No symbols provided"}

        # Validate strategy
        if strategy_id not in STRATEGIES:
            return {
                "skipped": True,
                "reason": f"Unknown strategy: {strategy_id}",
            }

        # Initialize strategy
        strategy_class = STRATEGIES[strategy_id]
        strategy = strategy_class(strategy_class.DEFAULT_CONFIG)

        signals = []
        for symbol in symbols:
            # Fetch market data
            data = await fetch_ohlcv(symbol, market, 100)

            if not data or not data.get("data"):
                logger.warning("No data for symbol", symbol=symbol)
                continue

            try:
                signal = strategy.analyze(
                    symbol=symbol,
                    market=market,
                    ohlcv_data=data["data"],
                    data_hash=data.get("data_hash", ""),
                )

                if signal:
                    signals.append(signal.to_dict())
                    # Store in memory
                    SIGNAL_STORE[signal.id] = signal.to_dict()

            except Exception as e:
                logger.error("Error analyzing symbol", symbol=symbol, error=str(e))

        return {
            "signals_generated": len(signals),
            "signals": signals,
            "strategy_id": strategy_id,
            "symbols_analyzed": len(symbols),
        }

    # Process with deduplication
    event_dict = event.model_dump()
    result = await event_consumer.process_event(
        event=event_dict,
        handler=generate_signals_handler,
    )

    is_cached = isinstance(result, dict) and result.get("is_cached", False)

    return EventResponse(
        event_id=event.idempotency_key,
        status="success",
        is_cached=is_cached,
        result=result,
        message="Signals generated" if not is_cached else "Cached result returned",
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
        "service": "signal",
    }


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("SIGNAL_SERVICE_PORT", 5102)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
