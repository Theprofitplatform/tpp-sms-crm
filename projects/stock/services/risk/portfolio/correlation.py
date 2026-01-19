"""
Correlation Analysis Module - Portfolio Risk Management

Calculates correlation matrices between portfolio symbols and checks
correlation limits to prevent over-concentration in correlated assets.

Usage:
    from portfolio.correlation import CorrelationAnalyzer, calculate_correlation_matrix

    analyzer = CorrelationAnalyzer(config)
    matrix = await analyzer.calculate_matrix(symbols, lookback_days=60)
    correlated_pairs = analyzer.find_correlated_pairs(matrix, threshold=0.7)
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple, Any

import structlog
import numpy as np
import pandas as pd
import httpx

logger = structlog.get_logger(__name__)


@dataclass
class CorrelationMatrix:
    """Correlation matrix result with metadata."""
    symbols: List[str]
    matrix: np.ndarray
    lookback_days: int
    calculated_at: datetime = field(default_factory=datetime.utcnow)
    data_points: int = 0

    def get_correlation(self, symbol_a: str, symbol_b: str) -> Optional[float]:
        """Get correlation between two symbols."""
        try:
            idx_a = self.symbols.index(symbol_a.upper())
            idx_b = self.symbols.index(symbol_b.upper())
            return float(self.matrix[idx_a, idx_b])
        except (ValueError, IndexError):
            return None

    def to_dataframe(self) -> pd.DataFrame:
        """Convert to pandas DataFrame."""
        return pd.DataFrame(
            self.matrix,
            index=self.symbols,
            columns=self.symbols,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "symbols": self.symbols,
            "matrix": self.matrix.tolist(),
            "lookback_days": self.lookback_days,
            "calculated_at": self.calculated_at.isoformat(),
            "data_points": self.data_points,
        }


@dataclass
class CorrelatedPair:
    """A pair of correlated symbols."""
    symbol_a: str
    symbol_b: str
    correlation: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol_a": self.symbol_a,
            "symbol_b": self.symbol_b,
            "correlation": self.correlation,
        }


class CorrelationAnalyzer:
    """
    Analyzes correlations between portfolio symbols.

    Fetches price data from the data service and computes correlation
    matrices. Caches results for daily reuse.
    """

    def __init__(
        self,
        correlation_threshold: float = 0.7,
        max_correlated_symbols: int = 3,
        lookback_days: int = 60,
        data_service_url: Optional[str] = None,
        db_pool: Optional[Any] = None,
    ):
        """
        Initialize correlation analyzer.

        Args:
            correlation_threshold: Minimum correlation to consider symbols correlated
            max_correlated_symbols: Maximum correlated symbols allowed in portfolio
            lookback_days: Default lookback period for correlation calculation
            data_service_url: URL for data service
            db_pool: Database connection pool for caching
        """
        self.correlation_threshold = correlation_threshold
        self.max_correlated_symbols = max_correlated_symbols
        self.lookback_days = lookback_days
        self.data_service_url = data_service_url or os.getenv(
            "DATA_SERVICE_URL", "http://localhost:5101"
        )
        self.db_pool = db_pool
        self._matrix_cache: Dict[str, CorrelationMatrix] = {}
        self._cache_date: Optional[date] = None

    async def _fetch_prices(
        self,
        symbol: str,
        start: date,
        end: date,
    ) -> Optional[pd.Series]:
        """
        Fetch adjusted close prices for a symbol.

        Args:
            symbol: Stock symbol
            start: Start date
            end: End date

        Returns:
            Series of adjusted close prices indexed by date
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.data_service_url}/api/v1/ohlcv/{symbol}",
                    params={
                        "start": start.isoformat(),
                        "end": end.isoformat(),
                        "timeframe": "1d",
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    logger.warning("Failed to fetch prices", symbol=symbol, status=response.status_code)
                    return None

                data = response.json()
                bars = data.get("data", [])

                if not bars:
                    return None

                # Extract close prices
                prices = pd.Series(
                    [bar["adjusted_close"] or bar["close"] for bar in bars],
                    index=pd.to_datetime([bar["time"] for bar in bars]),
                    name=symbol,
                )

                return prices

        except Exception as e:
            logger.error("Error fetching prices", symbol=symbol, error=str(e))
            return None

    async def calculate_matrix(
        self,
        symbols: List[str],
        lookback_days: Optional[int] = None,
        use_cache: bool = True,
    ) -> CorrelationMatrix:
        """
        Calculate correlation matrix for given symbols.

        Args:
            symbols: List of symbols
            lookback_days: Number of days to look back
            use_cache: Whether to use cached data

        Returns:
            CorrelationMatrix object
        """
        if not symbols:
            return CorrelationMatrix(
                symbols=[],
                matrix=np.array([]),
                lookback_days=0,
            )

        lookback = lookback_days or self.lookback_days
        symbols = [s.upper() for s in symbols]
        cache_key = f"{','.join(sorted(symbols))}_{lookback}"

        # Check cache
        today = date.today()
        if use_cache and self._cache_date == today and cache_key in self._matrix_cache:
            logger.debug("Using cached correlation matrix", symbols=len(symbols))
            return self._matrix_cache[cache_key]

        # Reset cache if new day
        if self._cache_date != today:
            self._matrix_cache = {}
            self._cache_date = today

        # Fetch prices for all symbols
        end_date = today
        start_date = end_date - timedelta(days=lookback + 30)  # Extra buffer for trading days

        price_data = {}
        for symbol in symbols:
            prices = await self._fetch_prices(symbol, start_date, end_date)
            if prices is not None and len(prices) > 0:
                price_data[symbol] = prices

        if len(price_data) < 2:
            logger.warning("Insufficient price data for correlation", requested=len(symbols), fetched=len(price_data))
            # Return identity matrix for available symbols
            n = len(symbols)
            return CorrelationMatrix(
                symbols=symbols,
                matrix=np.eye(n),
                lookback_days=lookback,
            )

        # Create DataFrame with aligned dates
        df = pd.DataFrame(price_data)
        df = df.dropna()

        # Take last N days
        if len(df) > lookback:
            df = df.tail(lookback)

        # Calculate returns
        returns = df.pct_change().dropna()

        if len(returns) < 10:
            logger.warning("Insufficient data points for correlation", points=len(returns))
            n = len(symbols)
            return CorrelationMatrix(
                symbols=symbols,
                matrix=np.eye(n),
                lookback_days=lookback,
            )

        # Calculate correlation matrix
        corr_matrix = returns.corr()

        # Ensure all symbols are in matrix (fill missing with 0 correlation)
        full_matrix = np.eye(len(symbols))
        for i, sym_a in enumerate(symbols):
            for j, sym_b in enumerate(symbols):
                if sym_a in corr_matrix.columns and sym_b in corr_matrix.columns:
                    val = corr_matrix.loc[sym_a, sym_b]
                    full_matrix[i, j] = val if not np.isnan(val) else (1.0 if i == j else 0.0)

        result = CorrelationMatrix(
            symbols=symbols,
            matrix=full_matrix,
            lookback_days=lookback,
            data_points=len(returns),
        )

        # Cache result
        self._matrix_cache[cache_key] = result

        # Store in database cache
        if self.db_pool:
            await self._cache_correlations(result)

        logger.info(
            "Correlation matrix calculated",
            symbols=len(symbols),
            data_points=len(returns),
            lookback_days=lookback,
        )

        return result

    async def _cache_correlations(self, matrix: CorrelationMatrix) -> None:
        """Store correlation pairs in database cache."""
        if not self.db_pool:
            return

        try:
            async with self.db_pool.acquire() as conn:
                # Store each unique pair
                for i, sym_a in enumerate(matrix.symbols):
                    for j, sym_b in enumerate(matrix.symbols):
                        if i < j:  # Only store upper triangle
                            await conn.execute(
                                """
                                INSERT INTO correlation_cache
                                    (symbol_a, symbol_b, correlation, lookback_days, calculated_at)
                                VALUES ($1, $2, $3, $4, NOW())
                                ON CONFLICT (symbol_a, symbol_b, lookback_days) DO UPDATE
                                SET correlation = $3, calculated_at = NOW()
                                """,
                                sym_a,
                                sym_b,
                                float(matrix.matrix[i, j]),
                                matrix.lookback_days,
                            )
        except Exception as e:
            logger.warning("Failed to cache correlations", error=str(e))

    def find_correlated_pairs(
        self,
        matrix: CorrelationMatrix,
        threshold: Optional[float] = None,
    ) -> List[CorrelatedPair]:
        """
        Find pairs of symbols with correlation above threshold.

        Args:
            matrix: Correlation matrix
            threshold: Correlation threshold (default: self.correlation_threshold)

        Returns:
            List of correlated pairs
        """
        threshold = threshold or self.correlation_threshold
        pairs = []

        for i, sym_a in enumerate(matrix.symbols):
            for j, sym_b in enumerate(matrix.symbols):
                if i < j:  # Upper triangle only
                    corr = matrix.matrix[i, j]
                    if abs(corr) >= threshold:
                        pairs.append(CorrelatedPair(
                            symbol_a=sym_a,
                            symbol_b=sym_b,
                            correlation=round(float(corr), 4),
                        ))

        # Sort by absolute correlation (descending)
        pairs.sort(key=lambda p: abs(p.correlation), reverse=True)

        return pairs

    async def check_correlation_limit(
        self,
        new_symbol: str,
        existing_positions: List[str],
        max_correlation: Optional[float] = None,
    ) -> Tuple[bool, List[CorrelatedPair]]:
        """
        Check if adding a new symbol would violate correlation limits.

        Args:
            new_symbol: Symbol to add
            existing_positions: Current position symbols
            max_correlation: Maximum allowed correlation

        Returns:
            Tuple of (passed, list of problematic pairs)
        """
        max_corr = max_correlation or self.correlation_threshold

        if not existing_positions:
            return True, []

        # Calculate correlation matrix including new symbol
        all_symbols = list(set(existing_positions + [new_symbol]))
        matrix = await self.calculate_matrix(all_symbols)

        # Find symbols highly correlated with new symbol
        correlated = []
        new_idx = matrix.symbols.index(new_symbol.upper()) if new_symbol.upper() in matrix.symbols else -1

        if new_idx < 0:
            return True, []

        for i, symbol in enumerate(matrix.symbols):
            if i != new_idx and symbol in [s.upper() for s in existing_positions]:
                corr = matrix.matrix[new_idx, i]
                if abs(corr) >= max_corr:
                    correlated.append(CorrelatedPair(
                        symbol_a=new_symbol.upper(),
                        symbol_b=symbol,
                        correlation=round(float(corr), 4),
                    ))

        # Check if adding this symbol exceeds max correlated symbols
        passed = len(correlated) < self.max_correlated_symbols

        if not passed:
            logger.warning(
                "Correlation limit exceeded",
                new_symbol=new_symbol,
                correlated_count=len(correlated),
                limit=self.max_correlated_symbols,
            )

        return passed, correlated


# =============================================================================
# Module-level convenience functions
# =============================================================================

async def calculate_correlation_matrix(
    symbols: List[str],
    lookback_days: int = 60,
    data_service_url: Optional[str] = None,
) -> pd.DataFrame:
    """
    Calculate correlation matrix for symbols.

    Convenience function for simple usage without instantiating analyzer.

    Args:
        symbols: List of symbols
        lookback_days: Number of days to look back
        data_service_url: URL for data service

    Returns:
        Correlation matrix as DataFrame
    """
    analyzer = CorrelationAnalyzer(
        lookback_days=lookback_days,
        data_service_url=data_service_url,
    )
    matrix = await analyzer.calculate_matrix(symbols, lookback_days)
    return matrix.to_dataframe()


def find_correlated_pairs(
    matrix: pd.DataFrame,
    threshold: float = 0.7,
) -> List[Tuple[str, str, float]]:
    """
    Find pairs of symbols with correlation above threshold.

    Args:
        matrix: Correlation matrix DataFrame
        threshold: Correlation threshold

    Returns:
        List of (symbol_a, symbol_b, correlation) tuples
    """
    pairs = []

    for i, sym_a in enumerate(matrix.index):
        for j, sym_b in enumerate(matrix.columns):
            if i < j:
                corr = matrix.iloc[i, j]
                if abs(corr) >= threshold:
                    pairs.append((sym_a, sym_b, round(float(corr), 4)))

    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    return pairs


async def check_correlation_limit(
    new_symbol: str,
    existing_positions: List[str],
    max_correlation: float = 0.8,
    data_service_url: Optional[str] = None,
) -> bool:
    """
    Check if adding a new symbol would violate correlation limits.

    Args:
        new_symbol: Symbol to add
        existing_positions: Current position symbols
        max_correlation: Maximum allowed correlation

    Returns:
        True if within limits, False otherwise
    """
    analyzer = CorrelationAnalyzer(
        correlation_threshold=max_correlation,
        data_service_url=data_service_url,
    )
    passed, _ = await analyzer.check_correlation_limit(new_symbol, existing_positions, max_correlation)
    return passed
