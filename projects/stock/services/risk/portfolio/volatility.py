"""
Volatility Analysis Module - Portfolio Risk Management

Calculates and tracks volatility for individual symbols and the overall portfolio.
Provides volatility scaling for position sizing and regime detection.

Usage:
    from portfolio.volatility import VolatilityScaler, calculate_symbol_volatility

    scaler = VolatilityScaler(config)
    scaled_size = scaler.scale_position(base_size, symbol_volatility)
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

import structlog
import numpy as np
import pandas as pd
import httpx

logger = structlog.get_logger(__name__)


# =============================================================================
# Volatility Regime Configuration
# =============================================================================

class VolatilityRegime(str, Enum):
    """Market volatility regime classification."""
    LOW = "LOW"           # VIX < 15
    NORMAL = "NORMAL"     # VIX 15-25
    HIGH = "HIGH"         # VIX 25-35
    EXTREME = "EXTREME"   # VIX > 35


# Default VIX levels for regime classification
DEFAULT_REGIME_THRESHOLDS = {
    "low_high": 15.0,
    "normal_high": 25.0,
    "high_extreme": 35.0,
}

# Default annualized volatility thresholds for individual symbols
SYMBOL_VOLATILITY_THRESHOLDS = {
    "low": 0.15,     # 15% annual vol
    "normal": 0.30,  # 30% annual vol
    "high": 0.50,    # 50% annual vol
}


@dataclass
class VolatilityMetrics:
    """Volatility metrics for a symbol or portfolio."""
    symbol: Optional[str]
    daily_volatility: float
    annualized_volatility: float
    realized_vol_20d: float
    realized_vol_60d: float
    atr_pct: float  # Average True Range as percentage
    regime: VolatilityRegime
    lookback_days: int
    calculated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "symbol": self.symbol,
            "daily_volatility": round(self.daily_volatility, 6),
            "annualized_volatility": round(self.annualized_volatility, 4),
            "realized_vol_20d": round(self.realized_vol_20d, 4),
            "realized_vol_60d": round(self.realized_vol_60d, 4),
            "atr_pct": round(self.atr_pct, 4),
            "regime": self.regime.value,
            "lookback_days": self.lookback_days,
            "calculated_at": self.calculated_at.isoformat(),
        }


@dataclass
class PortfolioVolatility:
    """Portfolio-level volatility analysis."""
    portfolio_volatility: float
    weighted_symbol_volatility: float
    diversification_ratio: float  # <1 means diversification benefit
    var_95: float  # Value at Risk 95%
    cvar_95: float  # Conditional VaR 95%
    max_1d_loss: float  # Maximum 1-day loss observed
    regime: VolatilityRegime
    symbol_contributions: Dict[str, float]
    calculated_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "portfolio_volatility": round(self.portfolio_volatility, 4),
            "weighted_symbol_volatility": round(self.weighted_symbol_volatility, 4),
            "diversification_ratio": round(self.diversification_ratio, 4),
            "var_95": round(self.var_95, 2),
            "cvar_95": round(self.cvar_95, 2),
            "max_1d_loss": round(self.max_1d_loss, 2),
            "regime": self.regime.value,
            "symbol_contributions": {
                k: round(v, 4) for k, v in self.symbol_contributions.items()
            },
            "calculated_at": self.calculated_at.isoformat(),
        }


class VolatilityScaler:
    """
    Scales position sizes based on volatility.

    Uses inverse volatility weighting to reduce position sizes when
    volatility is high and increase them when volatility is low.
    """

    def __init__(
        self,
        target_volatility: float = 0.20,
        min_scale_factor: float = 0.25,
        max_scale_factor: float = 2.0,
        lookback_days: int = 20,
        data_service_url: Optional[str] = None,
        db_pool: Optional[Any] = None,
    ):
        """
        Initialize volatility scaler.

        Args:
            target_volatility: Target annual volatility (default 20%)
            min_scale_factor: Minimum position scale (0.25 = 25% of base)
            max_scale_factor: Maximum position scale (2.0 = 200% of base)
            lookback_days: Days for volatility calculation
            data_service_url: URL for data service
            db_pool: Database connection pool
        """
        self.target_volatility = target_volatility
        self.min_scale_factor = min_scale_factor
        self.max_scale_factor = max_scale_factor
        self.lookback_days = lookback_days
        self.data_service_url = data_service_url or os.getenv(
            "DATA_SERVICE_URL", "http://localhost:5101"
        )
        self.db_pool = db_pool
        self._volatility_cache: Dict[str, Tuple[date, float]] = {}

    async def _fetch_prices(
        self,
        symbol: str,
        lookback_days: int,
    ) -> Optional[pd.DataFrame]:
        """Fetch OHLCV prices for volatility calculation."""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=lookback_days + 30)

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.data_service_url}/api/v1/ohlcv/{symbol}",
                    params={
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat(),
                        "timeframe": "1d",
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                bars = data.get("data", [])

                if not bars:
                    return None

                df = pd.DataFrame(bars)
                df["time"] = pd.to_datetime(df["time"])
                df = df.set_index("time").sort_index()

                return df

        except Exception as e:
            logger.error("Error fetching prices for volatility", symbol=symbol, error=str(e))
            return None

    async def calculate_symbol_volatility(
        self,
        symbol: str,
        lookback_days: Optional[int] = None,
        use_cache: bool = True,
    ) -> Optional[VolatilityMetrics]:
        """
        Calculate volatility metrics for a symbol.

        Args:
            symbol: Stock symbol
            lookback_days: Number of days to look back
            use_cache: Whether to use cached volatility

        Returns:
            VolatilityMetrics or None if calculation fails
        """
        lookback = lookback_days or self.lookback_days
        symbol_upper = symbol.upper()

        # Check cache
        today = date.today()
        if use_cache and symbol_upper in self._volatility_cache:
            cache_date, cached_vol = self._volatility_cache[symbol_upper]
            if cache_date == today:
                logger.debug("Using cached volatility", symbol=symbol_upper)
                # Return cached metrics (simplified)
                return VolatilityMetrics(
                    symbol=symbol_upper,
                    daily_volatility=cached_vol / np.sqrt(252),
                    annualized_volatility=cached_vol,
                    realized_vol_20d=cached_vol,
                    realized_vol_60d=cached_vol,
                    atr_pct=cached_vol / np.sqrt(252) * 1.5,
                    regime=self._classify_symbol_regime(cached_vol),
                    lookback_days=lookback,
                )

        # Fetch price data
        df = await self._fetch_prices(symbol_upper, max(lookback, 60))

        if df is None or len(df) < 20:
            logger.warning("Insufficient data for volatility", symbol=symbol_upper)
            return None

        # Calculate returns
        returns = df["close"].pct_change().dropna()

        # Calculate various volatility measures
        daily_vol = returns.std()
        annualized_vol = daily_vol * np.sqrt(252)

        # 20-day and 60-day realized volatility
        vol_20d = returns.tail(20).std() * np.sqrt(252) if len(returns) >= 20 else annualized_vol
        vol_60d = returns.tail(60).std() * np.sqrt(252) if len(returns) >= 60 else annualized_vol

        # Calculate ATR as percentage
        high = df["high"]
        low = df["low"]
        close = df["close"]

        tr = pd.concat([
            high - low,
            (high - close.shift(1)).abs(),
            (low - close.shift(1)).abs(),
        ], axis=1).max(axis=1)

        atr = tr.tail(14).mean()
        atr_pct = atr / close.iloc[-1] if close.iloc[-1] > 0 else 0

        # Classify regime
        regime = self._classify_symbol_regime(annualized_vol)

        # Cache result
        self._volatility_cache[symbol_upper] = (today, annualized_vol)

        return VolatilityMetrics(
            symbol=symbol_upper,
            daily_volatility=daily_vol,
            annualized_volatility=annualized_vol,
            realized_vol_20d=vol_20d,
            realized_vol_60d=vol_60d,
            atr_pct=atr_pct,
            regime=regime,
            lookback_days=lookback,
        )

    def _classify_symbol_regime(self, annualized_vol: float) -> VolatilityRegime:
        """Classify volatility regime based on annualized volatility."""
        if annualized_vol < SYMBOL_VOLATILITY_THRESHOLDS["low"]:
            return VolatilityRegime.LOW
        elif annualized_vol < SYMBOL_VOLATILITY_THRESHOLDS["normal"]:
            return VolatilityRegime.NORMAL
        elif annualized_vol < SYMBOL_VOLATILITY_THRESHOLDS["high"]:
            return VolatilityRegime.HIGH
        else:
            return VolatilityRegime.EXTREME

    def scale_position(
        self,
        base_quantity: float,
        symbol_volatility: float,
    ) -> float:
        """
        Scale position size based on volatility.

        Uses inverse volatility weighting:
        scale = target_vol / actual_vol

        Args:
            base_quantity: Base position size
            symbol_volatility: Annualized volatility of symbol

        Returns:
            Scaled position size
        """
        if symbol_volatility <= 0:
            return base_quantity

        # Calculate scale factor
        scale = self.target_volatility / symbol_volatility

        # Clip to bounds
        scale = max(self.min_scale_factor, min(self.max_scale_factor, scale))

        scaled_quantity = base_quantity * scale

        logger.debug(
            "Position scaled for volatility",
            base=base_quantity,
            scaled=scaled_quantity,
            factor=scale,
            volatility=symbol_volatility,
        )

        return scaled_quantity

    async def scale_position_async(
        self,
        base_quantity: float,
        symbol: str,
    ) -> Tuple[float, Optional[VolatilityMetrics]]:
        """
        Scale position size with automatic volatility calculation.

        Args:
            base_quantity: Base position size
            symbol: Stock symbol

        Returns:
            Tuple of (scaled_quantity, volatility_metrics)
        """
        metrics = await self.calculate_symbol_volatility(symbol)

        if metrics is None:
            logger.warning(
                "Could not calculate volatility, using base quantity",
                symbol=symbol,
            )
            return base_quantity, None

        scaled = self.scale_position(base_quantity, metrics.annualized_volatility)
        return scaled, metrics


async def calculate_symbol_volatility(
    symbol: str,
    lookback_days: int = 20,
    data_service_url: Optional[str] = None,
) -> Optional[float]:
    """
    Calculate annualized volatility for a symbol.

    Convenience function for simple usage.

    Args:
        symbol: Stock symbol
        lookback_days: Days to look back
        data_service_url: URL for data service

    Returns:
        Annualized volatility or None
    """
    scaler = VolatilityScaler(
        lookback_days=lookback_days,
        data_service_url=data_service_url,
    )
    metrics = await scaler.calculate_symbol_volatility(symbol, lookback_days)
    return metrics.annualized_volatility if metrics else None


async def calculate_portfolio_volatility(
    positions: List[Dict],
    correlation_matrix: Optional[np.ndarray] = None,
    data_service_url: Optional[str] = None,
) -> Optional[PortfolioVolatility]:
    """
    Calculate portfolio-level volatility metrics.

    Args:
        positions: List of position dicts with 'symbol', 'market_value', 'weight' keys
        correlation_matrix: Pre-calculated correlation matrix (optional)
        data_service_url: URL for data service

    Returns:
        PortfolioVolatility metrics or None
    """
    if not positions:
        return None

    scaler = VolatilityScaler(data_service_url=data_service_url)

    # Calculate individual volatilities
    symbol_vols = {}
    returns_data = {}

    for pos in positions:
        symbol = pos.get("symbol")
        if not symbol:
            continue

        metrics = await scaler.calculate_symbol_volatility(symbol, lookback_days=60)
        if metrics:
            symbol_vols[symbol] = metrics.annualized_volatility

            # Fetch returns for VaR calculation
            df = await scaler._fetch_prices(symbol, 60)
            if df is not None:
                returns_data[symbol] = df["close"].pct_change().dropna()

    if not symbol_vols:
        return None

    # Calculate weights
    total_value = sum(p.get("market_value", 0) for p in positions)
    if total_value <= 0:
        return None

    weights = {}
    for pos in positions:
        symbol = pos.get("symbol")
        value = pos.get("market_value", 0)
        if symbol in symbol_vols:
            weights[symbol] = value / total_value

    # Calculate weighted average volatility (undiversified)
    weighted_vol = sum(
        weights.get(s, 0) * v
        for s, v in symbol_vols.items()
    )

    # Calculate portfolio volatility with correlations
    symbols = list(weights.keys())
    n = len(symbols)

    if n == 0:
        return None

    weight_vector = np.array([weights.get(s, 0) for s in symbols])
    vol_vector = np.array([symbol_vols.get(s, 0) for s in symbols])

    # Use provided correlation matrix or assume identity (no correlation benefit)
    if correlation_matrix is not None and correlation_matrix.shape == (n, n):
        corr = correlation_matrix
    else:
        # Calculate from returns data if available
        if len(returns_data) >= 2:
            returns_df = pd.DataFrame({s: returns_data.get(s, pd.Series()) for s in symbols})
            returns_df = returns_df.dropna()
            if len(returns_df) >= 20:
                corr = returns_df.corr().values
            else:
                corr = np.eye(n)
        else:
            corr = np.eye(n)

    # Portfolio variance = w' * Cov * w
    # Cov = diag(vol) * Corr * diag(vol)
    cov_matrix = np.outer(vol_vector, vol_vector) * corr
    portfolio_variance = weight_vector @ cov_matrix @ weight_vector
    portfolio_vol = np.sqrt(portfolio_variance)

    # Diversification ratio
    div_ratio = portfolio_vol / weighted_vol if weighted_vol > 0 else 1.0

    # Calculate VaR and CVaR from portfolio returns
    if returns_data:
        # Combine returns weighted by position
        portfolio_returns = pd.Series(0.0, index=list(returns_data.values())[0].index)
        for symbol, rets in returns_data.items():
            if symbol in weights:
                aligned = rets.reindex(portfolio_returns.index, fill_value=0)
                portfolio_returns += aligned * weights[symbol]

        portfolio_returns = portfolio_returns.dropna()

        if len(portfolio_returns) >= 20:
            var_95 = -np.percentile(portfolio_returns, 5) * total_value
            cvar_95 = -portfolio_returns[portfolio_returns <= -np.percentile(portfolio_returns, 5)].mean() * total_value
            max_1d_loss = -portfolio_returns.min() * total_value
        else:
            var_95 = portfolio_vol / np.sqrt(252) * 1.645 * total_value
            cvar_95 = var_95 * 1.2
            max_1d_loss = portfolio_vol / np.sqrt(252) * 3 * total_value
    else:
        var_95 = portfolio_vol / np.sqrt(252) * 1.645 * total_value
        cvar_95 = var_95 * 1.2
        max_1d_loss = portfolio_vol / np.sqrt(252) * 3 * total_value

    # Calculate symbol contributions to portfolio volatility
    contributions = {}
    for i, symbol in enumerate(symbols):
        marginal_contribution = (cov_matrix[i, :] @ weight_vector) / portfolio_vol if portfolio_vol > 0 else 0
        contributions[symbol] = marginal_contribution * weight_vector[i]

    # Classify regime
    if portfolio_vol < 0.10:
        regime = VolatilityRegime.LOW
    elif portfolio_vol < 0.20:
        regime = VolatilityRegime.NORMAL
    elif portfolio_vol < 0.35:
        regime = VolatilityRegime.HIGH
    else:
        regime = VolatilityRegime.EXTREME

    return PortfolioVolatility(
        portfolio_volatility=portfolio_vol,
        weighted_symbol_volatility=weighted_vol,
        diversification_ratio=div_ratio,
        var_95=var_95,
        cvar_95=cvar_95,
        max_1d_loss=max_1d_loss,
        regime=regime,
        symbol_contributions=contributions,
    )


async def is_high_volatility_regime(
    vix_level: Optional[float] = None,
    data_service_url: Optional[str] = None,
) -> Tuple[bool, VolatilityRegime]:
    """
    Check if market is in high volatility regime.

    Args:
        vix_level: Current VIX level (if known)
        data_service_url: URL for data service to fetch VIX

    Returns:
        Tuple of (is_high_vol, regime)
    """
    # If VIX level provided, use it
    if vix_level is not None:
        regime = _classify_vix_regime(vix_level)
        is_high = regime in (VolatilityRegime.HIGH, VolatilityRegime.EXTREME)
        return is_high, regime

    # Try to fetch VIX from data service
    data_url = data_service_url or os.getenv("DATA_SERVICE_URL", "http://localhost:5101")

    try:
        async with httpx.AsyncClient() as client:
            # Try VIX symbol (^VIX on Yahoo Finance)
            response = await client.get(
                f"{data_url}/api/v1/ohlcv/^VIX",
                params={
                    "start": (date.today() - timedelta(days=5)).isoformat(),
                    "end": date.today().isoformat(),
                    "timeframe": "1d",
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                data = response.json()
                bars = data.get("data", [])
                if bars:
                    latest_vix = bars[-1].get("close", 20.0)
                    regime = _classify_vix_regime(latest_vix)
                    is_high = regime in (VolatilityRegime.HIGH, VolatilityRegime.EXTREME)

                    logger.info(
                        "VIX regime check",
                        vix=latest_vix,
                        regime=regime.value,
                        is_high=is_high,
                    )

                    return is_high, regime

    except Exception as e:
        logger.warning("Failed to fetch VIX for regime check", error=str(e))

    # Default to normal regime if cannot fetch
    return False, VolatilityRegime.NORMAL


def _classify_vix_regime(vix_level: float) -> VolatilityRegime:
    """Classify volatility regime based on VIX level."""
    if vix_level < DEFAULT_REGIME_THRESHOLDS["low_high"]:
        return VolatilityRegime.LOW
    elif vix_level < DEFAULT_REGIME_THRESHOLDS["normal_high"]:
        return VolatilityRegime.NORMAL
    elif vix_level < DEFAULT_REGIME_THRESHOLDS["high_extreme"]:
        return VolatilityRegime.HIGH
    else:
        return VolatilityRegime.EXTREME
