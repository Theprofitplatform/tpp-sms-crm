"""
Signal Service - Stock Trading Automation System

FastAPI service for generating trading signals using various strategies.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5102 --reload

Endpoints:
    GET /health                     - Health check
    POST /api/v1/signals/generate   - Generate signals for symbols
    GET /api/v1/signals             - List signals
    GET /api/v1/strategies          - List available strategies
"""

import os
import uuid
import hashlib
import json
from datetime import datetime, date, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from indicators.technical import TechnicalIndicators
from strategies.technical.momentum import MomentumStrategy
from strategies.technical.mean_reversion import MeanReversionStrategy

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
}

# In-memory signal storage (in production, use a database)
SIGNAL_STORE: List[dict] = []
MAX_SIGNALS = 100  # Keep last 100 signals


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    logger.info("Starting Signal Service...")
    logger.info("Signal Service started", strategies=list(STRATEGIES.keys()))
    yield
    logger.info("Shutting down Signal Service...")


# Create FastAPI app
app = FastAPI(
    title="Stock Signal Service",
    description="Trading signal generation for the Stock Trading Automation System",
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

class Signal(BaseModel):
    """Trading signal."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    time: datetime = Field(default_factory=datetime.utcnow)
    symbol: str
    market: str = "US"
    strategy_id: str
    strategy_version: str
    signal_type: str  # BUY, SELL, HOLD
    strength: float = Field(ge=0, le=1)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    indicators: dict = Field(default_factory=dict)
    data_snapshot_hash: str
    reasoning: str
    status: str = "PENDING"
    expires_at: Optional[datetime] = None


class GenerateSignalRequest(BaseModel):
    """Request to generate signals."""
    symbols: List[str]
    market: str = "US"
    strategy_id: str
    strategy_config: Optional[dict] = None
    lookback_days: int = 100


class GenerateSignalResponse(BaseModel):
    """Response with generated signals."""
    signals: List[Signal]
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


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    timestamp: datetime
    components: dict


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


# =============================================================================
# API Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    components = {
        "strategies_loaded": len(STRATEGIES),
        "data_service": "unknown",
    }

    # Check Data Service
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{DATA_SERVICE_URL}/health", timeout=5.0)
            components["data_service"] = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception:
        components["data_service"] = "unreachable"

    overall_status = "healthy" if components["data_service"] == "healthy" else "degraded"

    return HealthResponse(
        status=overall_status,
        service="signal-service",
        version="1.0.0",
        timestamp=datetime.utcnow(),
        components=components,
    )


@app.post("/api/v1/signals/generate", response_model=GenerateSignalResponse)
async def generate_signals(request: GenerateSignalRequest):
    """
    Generate trading signals for given symbols using specified strategy.

    The strategy analyzes market data and produces BUY/SELL/HOLD signals
    with confidence levels and price targets.
    """
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
                    type=signal.signal_type,
                    strength=signal.strength,
                )

        except Exception as e:
            logger.error("Error analyzing symbol", symbol=symbol, error=str(e))

    # Store signals in memory
    for signal in signals:
        signal_dict = {
            "id": signal.id,
            "time": signal.time.isoformat(),
            "symbol": signal.symbol,
            "market": signal.market,
            "strategy_id": signal.strategy_id,
            "strategy_version": signal.strategy_version,
            "signal_type": signal.signal_type,
            "strength": signal.strength,
            "confidence": signal.confidence,
            "entry_price": signal.entry_price,
            "target_price": signal.target_price,
            "stop_loss": signal.stop_loss,
            "indicators": signal.indicators,
            "data_snapshot_hash": signal.data_snapshot_hash,
            "reasoning": signal.reasoning,
            "status": signal.status,
            "expires_at": signal.expires_at.isoformat() if signal.expires_at else None,
        }
        SIGNAL_STORE.insert(0, signal_dict)

    # Keep only last MAX_SIGNALS
    while len(SIGNAL_STORE) > MAX_SIGNALS:
        SIGNAL_STORE.pop()

    logger.info("Signals stored", count=len(signals), total_stored=len(SIGNAL_STORE))

    return GenerateSignalResponse(
        signals=signals,
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
    results = SIGNAL_STORE.copy()

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


@app.post("/api/v1/signals/{signal_id}/reject")
async def reject_signal(signal_id: str, reason: str = "Manual rejection"):
    """
    Reject a pending signal.
    """
    for signal in SIGNAL_STORE:
        if signal["id"] == signal_id:
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

    raise HTTPException(status_code=404, detail=f"Signal not found: {signal_id}")


@app.post("/api/v1/signals/demo")
async def create_demo_signals():
    """
    Create demo signals for testing the UI.
    """
    import random

    demo_stocks = [
        ("AAPL", "Apple Inc.", 185.50),
        ("GOOGL", "Alphabet Inc.", 142.30),
        ("MSFT", "Microsoft Corp.", 385.00),
        ("TSLA", "Tesla Inc.", 242.00),
        ("NVDA", "NVIDIA Corp.", 510.00),
        ("META", "Meta Platforms", 475.00),
        ("AMZN", "Amazon.com", 155.00),
    ]

    signals_created = []

    for symbol, name, price in demo_stocks:
        # Randomly decide signal type
        signal_type = random.choice(["BUY", "SELL", "BUY", "BUY"])  # Bias towards BUY
        strength = random.uniform(0.65, 0.95)

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

        signal_dict = {
            "id": str(uuid.uuid4()),
            "time": datetime.utcnow().isoformat(),
            "symbol": symbol,
            "market": "US",
            "strategy_id": random.choice(["momentum", "mean_reversion"]),
            "strategy_version": "1.0.0",
            "signal_type": signal_type,
            "strength": round(strength, 2),
            "confidence": round(strength * 0.9, 2),
            "entry_price": round(price, 2),
            "target_price": round(target, 2),
            "stop_loss": round(stop_loss, 2),
            "indicators": {
                "rsi": round(random.uniform(25, 75), 1),
                "macd": round(random.uniform(-2, 2), 2),
                "volume_ratio": round(random.uniform(1.1, 2.5), 1),
            },
            "data_snapshot_hash": hashlib.md5(f"{symbol}{datetime.utcnow()}".encode()).hexdigest()[:16],
            "reasoning": reasoning,
            "status": "PENDING",
            "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        }

        SIGNAL_STORE.insert(0, signal_dict)
        signals_created.append(signal_dict)

    # Keep only last MAX_SIGNALS
    while len(SIGNAL_STORE) > MAX_SIGNALS:
        SIGNAL_STORE.pop()

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
