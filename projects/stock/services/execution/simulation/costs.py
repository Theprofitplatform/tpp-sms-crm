"""
Transaction Cost Models for Backtest Realism

Provides per-market fee calculations for realistic backtesting:
- US Markets: SEC fees, FINRA TAF, exchange fees, broker commission
- ASX Markets: Flat fee + percentage-based brokerage
- Crypto Markets: Maker/taker fees, network fees
- Forex: Spread-based costs

Usage:
    from simulation.costs import TransactionCostModel, create_cost_model

    model = TransactionCostModel("US")
    costs = model.calculate_costs(
        symbol="AAPL",
        side="BUY",
        quantity=100,
        price=150.00
    )
    print(f"Total cost: ${costs.total}")

Dependencies:
    - dataclasses
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import math


class CostType(str, Enum):
    """Types of transaction costs."""
    COMMISSION = "COMMISSION"       # Broker commission
    EXCHANGE_FEE = "EXCHANGE_FEE"   # Exchange fees
    REGULATORY_FEE = "REGULATORY_FEE"  # SEC, FINRA, etc.
    CLEARING_FEE = "CLEARING_FEE"   # Clearinghouse fees
    NETWORK_FEE = "NETWORK_FEE"     # Crypto network fees
    SPREAD_COST = "SPREAD_COST"     # Bid-ask spread cost
    STAMP_DUTY = "STAMP_DUTY"       # UK stamp duty, etc.
    OTHER = "OTHER"


@dataclass
class CostItem:
    """Individual cost component."""
    cost_type: CostType
    amount: float
    description: str = ""
    rate: Optional[float] = None  # Rate used for calculation


@dataclass
class TransactionCosts:
    """
    Complete transaction cost breakdown.

    Contains all cost components for a trade.
    """
    symbol: str
    side: str  # BUY or SELL
    quantity: float
    price: float
    gross_value: float
    items: List[CostItem] = field(default_factory=list)
    market: str = ""
    timestamp: Optional[datetime] = None

    @property
    def total(self) -> float:
        """Total transaction costs."""
        return sum(item.amount for item in self.items)

    @property
    def net_value(self) -> float:
        """Net trade value including costs."""
        if self.side == "BUY":
            return self.gross_value + self.total
        else:
            return self.gross_value - self.total

    @property
    def cost_bps(self) -> float:
        """Total costs in basis points."""
        if self.gross_value > 0:
            return (self.total / self.gross_value) * 10000
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "symbol": self.symbol,
            "side": self.side,
            "quantity": self.quantity,
            "price": self.price,
            "gross_value": self.gross_value,
            "total_costs": self.total,
            "net_value": self.net_value,
            "cost_bps": self.cost_bps,
            "market": self.market,
            "items": [
                {
                    "type": item.cost_type.value,
                    "amount": item.amount,
                    "description": item.description,
                    "rate": item.rate,
                }
                for item in self.items
            ],
        }


# =============================================================================
# US Market Fee Configuration
# =============================================================================

@dataclass
class USFeeConfig:
    """US market fee configuration (as of 2024)."""
    # SEC Fee - $27.80 per $1,000,000 (0.00278%)
    sec_fee_rate: float = 0.0000278

    # FINRA TAF - $0.000166 per share (max $8.30 per trade)
    finra_taf_per_share: float = 0.000166
    finra_taf_max: float = 8.30

    # Exchange fees (approximate averages)
    exchange_fee_per_share: float = 0.003  # $0.003 per share

    # Broker commission (configurable, many are $0 now)
    commission_per_share: float = 0.0
    commission_minimum: float = 0.0
    commission_per_trade: float = 0.0


@dataclass
class ASXFeeConfig:
    """Australian Stock Exchange fee configuration."""
    # Brokerage - typically flat fee + percentage
    flat_fee: float = 9.50  # Flat brokerage fee
    percentage_fee: float = 0.0011  # 0.11%
    percentage_threshold: float = 8636.36  # Above this, percentage applies

    # GST on brokerage (10%)
    gst_rate: float = 0.10


@dataclass
class CryptoFeeConfig:
    """Cryptocurrency exchange fee configuration."""
    # Maker/Taker fees (varies by exchange, using Binance-like defaults)
    maker_fee_rate: float = 0.001  # 0.10%
    taker_fee_rate: float = 0.001  # 0.10%

    # Network fees (for withdrawals, usually not charged on trades)
    network_fee_btc: float = 0.0005  # BTC
    network_fee_eth: float = 0.005   # ETH

    # Minimum trade amounts
    minimum_trade_value: float = 10.0


@dataclass
class ForexFeeConfig:
    """Forex fee configuration."""
    # Spread cost (in pips, varies by pair)
    spread_pips: Dict[str, float] = field(default_factory=lambda: {
        "EURUSD": 0.5,
        "GBPUSD": 1.0,
        "USDJPY": 0.5,
        "AUDUSD": 1.0,
        "default": 1.5,
    })

    # Commission per lot (some brokers charge this instead of spread)
    commission_per_lot: float = 0.0

    # Swap rates (overnight holding costs) - not implemented yet
    swap_enabled: bool = False


# =============================================================================
# Transaction Cost Model
# =============================================================================

class TransactionCostModel:
    """
    Transaction cost calculator for a specific market.

    Calculates all applicable fees and costs for a trade.

    Example:
        model = TransactionCostModel("US", USFeeConfig(commission_per_trade=4.95))
        costs = model.calculate_costs("AAPL", "BUY", 100, 150.00)
        print(f"Total costs: ${costs.total:.2f}")
    """

    def __init__(self, market: str, config: Optional[Any] = None):
        """
        Initialize cost model for a market.

        Args:
            market: Market code (US, ASX, CRYPTO, FOREX)
            config: Optional fee configuration (uses defaults if not provided)
        """
        self.market = market.upper()
        self.config = config or self._get_default_config()

    def _get_default_config(self) -> Any:
        """Get default fee configuration for market."""
        defaults = {
            "US": USFeeConfig(),
            "ASX": ASXFeeConfig(),
            "CRYPTO": CryptoFeeConfig(),
            "FOREX": ForexFeeConfig(),
            "LSE": USFeeConfig(
                sec_fee_rate=0,
                finra_taf_per_share=0,
                commission_per_trade=4.95,
            ),
        }
        return defaults.get(self.market, USFeeConfig())

    def calculate_costs(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price: float,
        order_type: str = "MARKET",
        is_maker: bool = False,
    ) -> TransactionCosts:
        """
        Calculate all transaction costs for a trade.

        Args:
            symbol: Trading symbol
            side: BUY or SELL
            quantity: Number of shares/units
            price: Execution price
            order_type: MARKET, LIMIT, etc.
            is_maker: True if order added liquidity (for maker/taker fees)

        Returns:
            TransactionCosts object with full breakdown
        """
        gross_value = quantity * price
        items: List[CostItem] = []

        if self.market == "US":
            items = self._calculate_us_costs(side, quantity, price, gross_value)
        elif self.market == "ASX":
            items = self._calculate_asx_costs(side, quantity, price, gross_value)
        elif self.market == "CRYPTO":
            items = self._calculate_crypto_costs(
                side, quantity, price, gross_value, is_maker
            )
        elif self.market == "FOREX":
            items = self._calculate_forex_costs(symbol, side, quantity, price)
        else:
            # Default: basic commission
            items = self._calculate_default_costs(side, quantity, price, gross_value)

        return TransactionCosts(
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=price,
            gross_value=gross_value,
            items=items,
            market=self.market,
            timestamp=datetime.utcnow(),
        )

    def _calculate_us_costs(
        self,
        side: str,
        quantity: float,
        price: float,
        gross_value: float
    ) -> List[CostItem]:
        """Calculate US market costs."""
        items = []
        config = self.config

        # SEC Fee (only on SELL orders)
        if side == "SELL":
            sec_fee = gross_value * config.sec_fee_rate
            items.append(CostItem(
                cost_type=CostType.REGULATORY_FEE,
                amount=sec_fee,
                description="SEC Section 31 Transaction Fee",
                rate=config.sec_fee_rate,
            ))

        # FINRA TAF (only on SELL orders)
        if side == "SELL":
            finra_fee = min(
                quantity * config.finra_taf_per_share,
                config.finra_taf_max
            )
            items.append(CostItem(
                cost_type=CostType.REGULATORY_FEE,
                amount=finra_fee,
                description="FINRA Trading Activity Fee",
                rate=config.finra_taf_per_share,
            ))

        # Exchange fees (both buy and sell)
        exchange_fee = quantity * config.exchange_fee_per_share
        if exchange_fee > 0:
            items.append(CostItem(
                cost_type=CostType.EXCHANGE_FEE,
                amount=exchange_fee,
                description="Exchange Fee",
                rate=config.exchange_fee_per_share,
            ))

        # Broker commission
        if config.commission_per_trade > 0:
            items.append(CostItem(
                cost_type=CostType.COMMISSION,
                amount=config.commission_per_trade,
                description="Broker Commission (per trade)",
            ))
        elif config.commission_per_share > 0:
            commission = max(
                quantity * config.commission_per_share,
                config.commission_minimum
            )
            items.append(CostItem(
                cost_type=CostType.COMMISSION,
                amount=commission,
                description="Broker Commission",
                rate=config.commission_per_share,
            ))

        return items

    def _calculate_asx_costs(
        self,
        side: str,
        quantity: float,
        price: float,
        gross_value: float
    ) -> List[CostItem]:
        """Calculate ASX market costs."""
        items = []
        config = self.config

        # Brokerage: flat fee or percentage, whichever is greater
        if gross_value > config.percentage_threshold:
            brokerage = gross_value * config.percentage_fee
        else:
            brokerage = config.flat_fee

        # Add GST to brokerage
        gst = brokerage * config.gst_rate
        brokerage_with_gst = brokerage + gst

        items.append(CostItem(
            cost_type=CostType.COMMISSION,
            amount=brokerage,
            description="Brokerage Fee",
            rate=config.percentage_fee if gross_value > config.percentage_threshold else None,
        ))

        items.append(CostItem(
            cost_type=CostType.OTHER,
            amount=gst,
            description="GST on Brokerage",
            rate=config.gst_rate,
        ))

        return items

    def _calculate_crypto_costs(
        self,
        side: str,
        quantity: float,
        price: float,
        gross_value: float,
        is_maker: bool = False
    ) -> List[CostItem]:
        """Calculate cryptocurrency exchange costs."""
        items = []
        config = self.config

        # Maker/Taker fee
        if is_maker:
            fee_rate = config.maker_fee_rate
            fee_type = "Maker Fee"
        else:
            fee_rate = config.taker_fee_rate
            fee_type = "Taker Fee"

        trading_fee = gross_value * fee_rate
        items.append(CostItem(
            cost_type=CostType.EXCHANGE_FEE,
            amount=trading_fee,
            description=fee_type,
            rate=fee_rate,
        ))

        return items

    def _calculate_forex_costs(
        self,
        symbol: str,
        side: str,
        quantity: float,
        price: float
    ) -> List[CostItem]:
        """Calculate forex trading costs."""
        items = []
        config = self.config

        # Get spread for the pair
        spread_pips = config.spread_pips.get(symbol, config.spread_pips["default"])

        # Convert pips to cost (assumes quantity is in base currency units)
        # For most pairs, 1 pip = 0.0001; for JPY pairs, 1 pip = 0.01
        if "JPY" in symbol:
            pip_value = 0.01
        else:
            pip_value = 0.0001

        spread_cost = quantity * spread_pips * pip_value
        items.append(CostItem(
            cost_type=CostType.SPREAD_COST,
            amount=spread_cost,
            description=f"Spread Cost ({spread_pips} pips)",
            rate=spread_pips,
        ))

        # Commission per lot (if applicable)
        if config.commission_per_lot > 0:
            lots = quantity / 100000  # Standard lot = 100,000 units
            commission = lots * config.commission_per_lot
            items.append(CostItem(
                cost_type=CostType.COMMISSION,
                amount=commission,
                description="Commission",
                rate=config.commission_per_lot,
            ))

        return items

    def _calculate_default_costs(
        self,
        side: str,
        quantity: float,
        price: float,
        gross_value: float
    ) -> List[CostItem]:
        """Calculate default costs for unknown markets."""
        items = []

        # Default 0.1% commission
        commission = gross_value * 0.001
        items.append(CostItem(
            cost_type=CostType.COMMISSION,
            amount=commission,
            description="Commission (default)",
            rate=0.001,
        ))

        return items

    def estimate_round_trip_cost(
        self,
        symbol: str,
        quantity: float,
        entry_price: float,
        exit_price: Optional[float] = None
    ) -> float:
        """
        Estimate total round-trip transaction costs.

        Args:
            symbol: Trading symbol
            quantity: Number of shares/units
            entry_price: Entry price
            exit_price: Exit price (defaults to entry_price)

        Returns:
            Total estimated costs for buy and sell
        """
        if exit_price is None:
            exit_price = entry_price

        buy_costs = self.calculate_costs(symbol, "BUY", quantity, entry_price)
        sell_costs = self.calculate_costs(symbol, "SELL", quantity, exit_price)

        return buy_costs.total + sell_costs.total

    def get_minimum_profitable_move(
        self,
        symbol: str,
        quantity: float,
        entry_price: float
    ) -> float:
        """
        Calculate minimum price move needed to break even after costs.

        Args:
            symbol: Trading symbol
            quantity: Number of shares/units
            entry_price: Entry price

        Returns:
            Minimum profitable price move (in price terms)
        """
        round_trip = self.estimate_round_trip_cost(symbol, quantity, entry_price)
        return round_trip / quantity


# =============================================================================
# Factory Functions
# =============================================================================

def create_cost_model(config: Dict[str, Any]) -> TransactionCostModel:
    """
    Create a TransactionCostModel from configuration.

    Args:
        config: Configuration dictionary with 'market' and optional fee settings

    Returns:
        Configured TransactionCostModel instance

    Example:
        config = {
            "market": "US",
            "commission_per_trade": 4.95,
            "exchange_fee_per_share": 0.005
        }
        model = create_cost_model(config)
    """
    market = config.get("market", "US").upper()

    if market == "US":
        fee_config = USFeeConfig(
            sec_fee_rate=config.get("sec_fee_rate", 0.0000278),
            finra_taf_per_share=config.get("finra_taf_per_share", 0.000166),
            finra_taf_max=config.get("finra_taf_max", 8.30),
            exchange_fee_per_share=config.get("exchange_fee_per_share", 0.003),
            commission_per_share=config.get("commission_per_share", 0.0),
            commission_minimum=config.get("commission_minimum", 0.0),
            commission_per_trade=config.get("commission_per_trade", 0.0),
        )
    elif market == "ASX":
        fee_config = ASXFeeConfig(
            flat_fee=config.get("flat_fee", 9.50),
            percentage_fee=config.get("percentage_fee", 0.0011),
            percentage_threshold=config.get("percentage_threshold", 8636.36),
            gst_rate=config.get("gst_rate", 0.10),
        )
    elif market == "CRYPTO":
        fee_config = CryptoFeeConfig(
            maker_fee_rate=config.get("maker_fee_rate", 0.001),
            taker_fee_rate=config.get("taker_fee_rate", 0.001),
        )
    elif market == "FOREX":
        fee_config = ForexFeeConfig(
            spread_pips=config.get("spread_pips", {}),
            commission_per_lot=config.get("commission_per_lot", 0.0),
        )
    else:
        fee_config = None

    return TransactionCostModel(market, fee_config)


def get_zero_cost_model(market: str = "US") -> TransactionCostModel:
    """
    Get a cost model with zero fees (for comparison backtests).

    Args:
        market: Market code

    Returns:
        TransactionCostModel with all fees set to zero
    """
    if market.upper() == "US":
        config = USFeeConfig(
            sec_fee_rate=0,
            finra_taf_per_share=0,
            finra_taf_max=0,
            exchange_fee_per_share=0,
            commission_per_share=0,
            commission_minimum=0,
            commission_per_trade=0,
        )
    elif market.upper() == "ASX":
        config = ASXFeeConfig(flat_fee=0, percentage_fee=0, gst_rate=0)
    elif market.upper() == "CRYPTO":
        config = CryptoFeeConfig(maker_fee_rate=0, taker_fee_rate=0)
    else:
        config = USFeeConfig()

    return TransactionCostModel(market, config)
