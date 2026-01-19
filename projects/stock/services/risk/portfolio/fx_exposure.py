"""
FX Exposure Analysis Module - Currency Risk Management

Calculates and tracks currency exposure for portfolio positions.
Helps ensure diversification and prevent FX concentration risk.

Features:
- Currency exposure calculation and monitoring
- Configurable concentration limits per currency
- Warning levels (NORMAL, ELEVATED, HIGH, CRITICAL)
- Integration with kill switch for critical exposure
- Fetches data from Execution service FX accounting

Usage:
    from portfolio.fx_exposure import FXExposureAnalyzer

    analyzer = FXExposureAnalyzer(config)
    report = await analyzer.analyze()
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

import structlog
import httpx

logger = structlog.get_logger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Default FX exposure limits (percentage of portfolio)
DEFAULT_FX_LIMITS = {
    "USD": {
        "warning": 60.0,      # 60% - elevated warning
        "high": 75.0,         # 75% - high risk
        "critical": 90.0,     # 90% - critical, may trigger kill switch
    },
    "EUR": {
        "warning": 40.0,
        "high": 55.0,
        "critical": 70.0,
    },
    "GBP": {
        "warning": 30.0,
        "high": 45.0,
        "critical": 60.0,
    },
    "JPY": {
        "warning": 25.0,
        "high": 40.0,
        "critical": 55.0,
    },
    # Default for any other currency
    "DEFAULT": {
        "warning": 25.0,
        "high": 40.0,
        "critical": 55.0,
    },
}


class ExposureLevel(str, Enum):
    """FX exposure risk level."""
    NORMAL = "NORMAL"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class CurrencyExposure:
    """Exposure data for a single currency."""
    currency: str
    value_base: float
    percentage: float
    position_count: int
    level: ExposureLevel
    limit_warning: float
    limit_high: float
    limit_critical: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "currency": self.currency,
            "value_base": round(self.value_base, 2),
            "percentage": round(self.percentage, 2),
            "position_count": self.position_count,
            "level": self.level.value,
            "limits": {
                "warning": self.limit_warning,
                "high": self.limit_high,
                "critical": self.limit_critical,
            },
        }


@dataclass
class FXExposureReport:
    """Complete FX exposure analysis report."""
    base_currency: str
    total_portfolio_value: float
    currency_exposures: Dict[str, CurrencyExposure]
    largest_currency: str
    largest_percentage: float
    warnings: List[str]
    critical_exposures: List[str]
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_currency": self.base_currency,
            "total_portfolio_value": round(self.total_portfolio_value, 2),
            "currency_exposures": {
                k: v.to_dict() for k, v in self.currency_exposures.items()
            },
            "largest_currency": self.largest_currency,
            "largest_percentage": round(self.largest_percentage, 2),
            "warnings": self.warnings,
            "critical_exposures": self.critical_exposures,
            "has_critical": len(self.critical_exposures) > 0,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class FXExposureConfig:
    """Configuration for FX exposure analyzer."""
    execution_service_url: str = "http://localhost:5104"
    base_currency: str = "AUD"
    limits: Dict[str, Dict[str, float]] = field(default_factory=lambda: DEFAULT_FX_LIMITS.copy())
    # Whether to trigger kill switch on critical exposure
    kill_switch_on_critical: bool = False
    # Timeout for HTTP requests
    request_timeout: float = 10.0


class FXExposureAnalyzer:
    """
    Analyzes portfolio FX exposure and monitors currency concentration risk.

    Fetches exposure data from Execution service and evaluates against
    configurable limits per currency.
    """

    def __init__(self, config: Optional[FXExposureConfig] = None):
        """
        Initialize FX exposure analyzer.

        Args:
            config: Configuration for the analyzer
        """
        self.config = config or FXExposureConfig()
        self._http_client: Optional[httpx.AsyncClient] = None

        logger.info(
            "FX exposure analyzer initialized",
            base_currency=self.config.base_currency,
            execution_url=self.config.execution_service_url,
        )

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=self.config.request_timeout,
            )
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    def _get_limits(self, currency: str) -> Dict[str, float]:
        """Get exposure limits for a currency."""
        if currency in self.config.limits:
            return self.config.limits[currency]
        return self.config.limits.get("DEFAULT", DEFAULT_FX_LIMITS["DEFAULT"])

    def _determine_level(self, percentage: float, limits: Dict[str, float]) -> ExposureLevel:
        """Determine exposure level based on percentage and limits."""
        if percentage >= limits["critical"]:
            return ExposureLevel.CRITICAL
        elif percentage >= limits["high"]:
            return ExposureLevel.HIGH
        elif percentage >= limits["warning"]:
            return ExposureLevel.ELEVATED
        return ExposureLevel.NORMAL

    async def fetch_exposure_from_execution(self) -> Optional[Dict[str, Any]]:
        """
        Fetch FX exposure data from Execution service.

        Returns:
            Exposure data dict or None if unavailable
        """
        try:
            client = await self._get_client()
            url = f"{self.config.execution_service_url}/api/v1/fx/accounting/exposure"

            response = await client.get(url)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 503:
                logger.warning("Execution service FX accounting not initialized")
                return None
            else:
                logger.warning(
                    "Failed to fetch FX exposure",
                    status=response.status_code,
                    detail=response.text[:200],
                )
                return None

        except httpx.ConnectError:
            logger.warning("Could not connect to Execution service")
            return None
        except Exception as e:
            logger.error("Error fetching FX exposure", error=str(e))
            return None

    async def fetch_positions_from_execution(self) -> Optional[List[Dict[str, Any]]]:
        """
        Fetch current positions from Execution service.

        Returns:
            List of position dicts or None if unavailable
        """
        try:
            client = await self._get_client()
            url = f"{self.config.execution_service_url}/api/v1/positions"

            response = await client.get(url)

            if response.status_code == 200:
                data = response.json()
                return data.get("positions", [])
            else:
                logger.warning(
                    "Failed to fetch positions",
                    status=response.status_code,
                )
                return None

        except Exception as e:
            logger.error("Error fetching positions", error=str(e))
            return None

    async def fetch_account_from_execution(self) -> Optional[Dict[str, Any]]:
        """
        Fetch account data from Execution service.

        Returns:
            Account data dict or None if unavailable
        """
        try:
            client = await self._get_client()
            url = f"{self.config.execution_service_url}/api/v1/account"

            response = await client.get(url)

            if response.status_code == 200:
                return response.json()
            else:
                return None

        except Exception as e:
            logger.error("Error fetching account", error=str(e))
            return None

    async def analyze(self) -> FXExposureReport:
        """
        Analyze current FX exposure.

        Fetches data from Execution service and calculates exposure
        metrics against configured limits.

        Returns:
            FXExposureReport with complete analysis
        """
        # Fetch data from execution service
        exposure_data = await self.fetch_exposure_from_execution()
        positions = await self.fetch_positions_from_execution()
        account = await self.fetch_account_from_execution()

        # Calculate total portfolio value
        total_value = 0.0
        if account:
            total_value = account.get("equity", account.get("total_equity", 0.0))

        # If we couldn't get total value from account, calculate from positions
        if total_value == 0.0 and positions:
            for pos in positions:
                value = pos.get("market_value_base", pos.get("market_value", 0))
                total_value += abs(value)

        # Default to initial balance if no data
        if total_value == 0.0:
            total_value = 100000.0  # Default initial balance

        # Build currency exposures
        currency_exposures: Dict[str, CurrencyExposure] = {}
        warnings: List[str] = []
        critical_exposures: List[str] = []

        # Group positions by currency
        currency_values: Dict[str, float] = {}
        currency_counts: Dict[str, int] = {}

        if positions:
            for pos in positions:
                trade_ccy = pos.get("trade_currency", "USD")
                value_base = abs(pos.get("market_value_base", pos.get("market_value", 0)))

                currency_values[trade_ccy] = currency_values.get(trade_ccy, 0) + value_base
                currency_counts[trade_ccy] = currency_counts.get(trade_ccy, 0) + 1

        # If we got exposure data from execution service, use that too
        if exposure_data and "exposures" in exposure_data:
            for ccy, exp_data in exposure_data["exposures"].items():
                if ccy not in currency_values:
                    currency_values[ccy] = exp_data.get("net_exposure_base", 0)
                    currency_counts[ccy] = exp_data.get("position_count", 0)

        # Calculate percentages and build exposure objects
        largest_currency = self.config.base_currency
        largest_percentage = 0.0

        for currency, value in currency_values.items():
            if currency == self.config.base_currency:
                continue  # Skip base currency

            percentage = (value / total_value * 100) if total_value > 0 else 0.0
            limits = self._get_limits(currency)
            level = self._determine_level(percentage, limits)

            exposure = CurrencyExposure(
                currency=currency,
                value_base=value,
                percentage=percentage,
                position_count=currency_counts.get(currency, 0),
                level=level,
                limit_warning=limits["warning"],
                limit_high=limits["high"],
                limit_critical=limits["critical"],
            )

            currency_exposures[currency] = exposure

            # Track largest exposure
            if percentage > largest_percentage:
                largest_percentage = percentage
                largest_currency = currency

            # Generate warnings
            if level == ExposureLevel.ELEVATED:
                warnings.append(
                    f"{currency} exposure at {percentage:.1f}% (warning level: {limits['warning']}%)"
                )
            elif level == ExposureLevel.HIGH:
                warnings.append(
                    f"HIGH: {currency} exposure at {percentage:.1f}% (limit: {limits['high']}%)"
                )
            elif level == ExposureLevel.CRITICAL:
                critical_exposures.append(currency)
                warnings.append(
                    f"CRITICAL: {currency} exposure at {percentage:.1f}% exceeds {limits['critical']}%"
                )

        report = FXExposureReport(
            base_currency=self.config.base_currency,
            total_portfolio_value=total_value,
            currency_exposures=currency_exposures,
            largest_currency=largest_currency,
            largest_percentage=largest_percentage,
            warnings=warnings,
            critical_exposures=critical_exposures,
        )

        logger.info(
            "FX exposure analyzed",
            currencies=len(currency_exposures),
            largest=largest_currency,
            largest_pct=round(largest_percentage, 1),
            warnings=len(warnings),
            critical=len(critical_exposures),
        )

        return report

    async def check_order_fx_impact(
        self,
        symbol: str,
        trade_currency: str,
        order_value_base: float,
    ) -> Dict[str, Any]:
        """
        Check if an order would cause FX exposure to exceed limits.

        Args:
            symbol: Symbol being traded
            trade_currency: Currency of the trade
            order_value_base: Order value in base currency

        Returns:
            Dict with 'allowed' bool and 'warnings' list
        """
        if trade_currency == self.config.base_currency:
            return {"allowed": True, "warnings": [], "level": ExposureLevel.NORMAL.value}

        # Get current exposure
        report = await self.analyze()

        # Calculate new exposure after trade
        current_exposure = report.currency_exposures.get(trade_currency)
        current_value = current_exposure.value_base if current_exposure else 0.0
        new_value = current_value + order_value_base
        new_percentage = (new_value / report.total_portfolio_value * 100) if report.total_portfolio_value > 0 else 0.0

        limits = self._get_limits(trade_currency)
        new_level = self._determine_level(new_percentage, limits)

        warnings = []
        allowed = True

        if new_level == ExposureLevel.CRITICAL:
            warnings.append(
                f"Order would push {trade_currency} exposure to {new_percentage:.1f}% (critical limit: {limits['critical']}%)"
            )
            if self.config.kill_switch_on_critical:
                allowed = False
        elif new_level == ExposureLevel.HIGH:
            warnings.append(
                f"Order would increase {trade_currency} exposure to {new_percentage:.1f}% (high risk)"
            )
        elif new_level == ExposureLevel.ELEVATED:
            warnings.append(
                f"Note: {trade_currency} exposure would be {new_percentage:.1f}% after this trade"
            )

        return {
            "allowed": allowed,
            "warnings": warnings,
            "level": new_level.value,
            "current_exposure_pct": round(current_exposure.percentage if current_exposure else 0.0, 2),
            "projected_exposure_pct": round(new_percentage, 2),
            "limits": limits,
        }

    def update_limits(self, currency: str, limits: Dict[str, float]) -> None:
        """
        Update exposure limits for a currency.

        Args:
            currency: Currency code
            limits: Dict with 'warning', 'high', 'critical' percentages
        """
        required = {"warning", "high", "critical"}
        if not required.issubset(limits.keys()):
            raise ValueError(f"Limits must include: {required}")

        # Validate ordering
        if not (limits["warning"] <= limits["high"] <= limits["critical"]):
            raise ValueError("Limits must be in order: warning <= high <= critical")

        self.config.limits[currency] = limits
        logger.info("FX exposure limits updated", currency=currency, limits=limits)


# =============================================================================
# Module-level singleton
# =============================================================================

_fx_exposure_analyzer: Optional[FXExposureAnalyzer] = None


def get_fx_exposure_analyzer() -> Optional[FXExposureAnalyzer]:
    """Get the global FX exposure analyzer instance."""
    return _fx_exposure_analyzer


def set_fx_exposure_analyzer(analyzer: FXExposureAnalyzer) -> None:
    """Set the global FX exposure analyzer instance."""
    global _fx_exposure_analyzer
    _fx_exposure_analyzer = analyzer


async def initialize_fx_exposure_analyzer(
    execution_service_url: Optional[str] = None,
    base_currency: str = "AUD",
) -> FXExposureAnalyzer:
    """
    Initialize the FX exposure analyzer.

    Args:
        execution_service_url: URL of the Execution service
        base_currency: Portfolio base currency

    Returns:
        Initialized FXExposureAnalyzer
    """
    config = FXExposureConfig(
        execution_service_url=execution_service_url or os.getenv(
            "EXECUTION_SERVICE_URL", "http://localhost:5104"
        ),
        base_currency=base_currency,
    )

    analyzer = FXExposureAnalyzer(config)
    set_fx_exposure_analyzer(analyzer)

    return analyzer
