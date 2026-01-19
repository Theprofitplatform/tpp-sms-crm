"""
FX Accounting Module - Multi-Currency P&L Tracking

Provides comprehensive FX accounting for multi-currency trading:
- FX impact separation from trading P&L
- Realized vs unrealized FX gains/losses
- Currency exposure tracking
- FX transaction ledger
- Position-level FX attribution
- Hedging simulation support

Usage:
    from fx.accounting import FXAccountingLedger, CurrencyExposure

    ledger = FXAccountingLedger(base_currency="AUD")

    # Record a trade
    ledger.record_trade(trade)

    # Get FX P&L breakdown
    fx_pnl = ledger.get_fx_pnl_summary()

    # Get currency exposure
    exposure = ledger.get_currency_exposure()

Configuration:
    BASE_CURRENCY: Portfolio base currency (default: AUD)
    FX_ACCOUNTING_ENABLED: Enable FX tracking (default: true)

Dependencies:
    - rates.py (FXRateService)
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Optional, Dict, List, Any, Tuple
from threading import Lock
import uuid

import structlog

logger = structlog.get_logger(__name__)


class FXTransactionType(str, Enum):
    """Types of FX transactions."""
    TRADE_OPEN = "TRADE_OPEN"           # Opening position in foreign currency
    TRADE_CLOSE = "TRADE_CLOSE"         # Closing position in foreign currency
    DIVIDEND = "DIVIDEND"               # Dividend received in foreign currency
    FX_CONVERSION = "FX_CONVERSION"     # Explicit FX conversion
    REVALUATION = "REVALUATION"         # Mark-to-market revaluation
    HEDGE_OPEN = "HEDGE_OPEN"           # Open hedge position
    HEDGE_CLOSE = "HEDGE_CLOSE"         # Close hedge position
    INTEREST = "INTEREST"               # Interest payment/receipt


class FXGainType(str, Enum):
    """Types of FX gains/losses."""
    REALIZED = "REALIZED"       # Closed positions, locked in
    UNREALIZED = "UNREALIZED"   # Open positions, mark-to-market


@dataclass
class FXTransaction:
    """
    Single FX transaction record.

    Records all currency movements with rates and impact.
    """
    id: str
    timestamp: datetime
    transaction_type: FXTransactionType
    trade_id: Optional[str]
    symbol: Optional[str]

    # Amount in trade currency
    trade_currency: str
    trade_amount: float

    # Amount in base currency
    base_currency: str
    base_amount: float

    # FX rate used (1 base = X trade)
    fx_rate: float

    # For realized gains: original entry rate
    entry_fx_rate: Optional[float] = None

    # FX impact (gain/loss from rate change)
    fx_impact: float = 0.0
    fx_gain_type: FXGainType = FXGainType.REALIZED

    # Reference data
    position_id: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "transaction_type": self.transaction_type.value,
            "trade_id": self.trade_id,
            "symbol": self.symbol,
            "trade_currency": self.trade_currency,
            "trade_amount": self.trade_amount,
            "base_currency": self.base_currency,
            "base_amount": self.base_amount,
            "fx_rate": self.fx_rate,
            "entry_fx_rate": self.entry_fx_rate,
            "fx_impact": self.fx_impact,
            "fx_gain_type": self.fx_gain_type.value,
            "position_id": self.position_id,
            "notes": self.notes,
        }


@dataclass
class CurrencyPosition:
    """
    Tracks position in a specific currency.

    Used for currency exposure calculation.
    """
    currency: str
    gross_long: float = 0.0      # Total long exposure
    gross_short: float = 0.0     # Total short exposure
    net_exposure: float = 0.0    # Net exposure
    position_count: int = 0      # Number of positions
    avg_entry_rate: float = 0.0  # Weighted avg entry FX rate
    current_rate: float = 0.0    # Current FX rate
    unrealized_fx_pnl: float = 0.0  # Unrealized FX P&L

    def to_dict(self) -> Dict[str, Any]:
        return {
            "currency": self.currency,
            "gross_long": round(self.gross_long, 2),
            "gross_short": round(self.gross_short, 2),
            "net_exposure": round(self.net_exposure, 2),
            "position_count": self.position_count,
            "avg_entry_rate": round(self.avg_entry_rate, 6),
            "current_rate": round(self.current_rate, 6),
            "unrealized_fx_pnl": round(self.unrealized_fx_pnl, 2),
        }


@dataclass
class FXPnLSummary:
    """
    FX P&L summary for reporting.

    Separates trading P&L from FX impact.
    """
    base_currency: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    # Realized FX gains/losses (closed positions)
    realized_fx_gain: float = 0.0
    realized_fx_loss: float = 0.0
    realized_fx_net: float = 0.0

    # Unrealized FX gains/losses (open positions)
    unrealized_fx_gain: float = 0.0
    unrealized_fx_loss: float = 0.0
    unrealized_fx_net: float = 0.0

    # Total
    total_fx_impact: float = 0.0

    # By currency breakdown
    by_currency: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_currency": self.base_currency,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "realized": {
                "gain": round(self.realized_fx_gain, 2),
                "loss": round(self.realized_fx_loss, 2),
                "net": round(self.realized_fx_net, 2),
            },
            "unrealized": {
                "gain": round(self.unrealized_fx_gain, 2),
                "loss": round(self.unrealized_fx_loss, 2),
                "net": round(self.unrealized_fx_net, 2),
            },
            "total_fx_impact": round(self.total_fx_impact, 2),
            "by_currency": {k: round(v, 2) for k, v in self.by_currency.items()},
        }


@dataclass
class PositionFXAttribution:
    """
    FX attribution for a single position.

    Breaks down position P&L into trading vs FX components.
    """
    position_id: str
    symbol: str
    trade_currency: str

    # Entry details
    entry_date: datetime
    entry_fx_rate: float
    cost_base_at_entry: float      # Cost in base currency at entry rate
    cost_trade: float              # Cost in trade currency

    # Current details
    current_fx_rate: float
    current_value_trade: float     # Current value in trade currency
    current_value_base: float      # Current value in base at current rate

    # Trading P&L (in trade currency, ignoring FX)
    trading_pnl_trade: float
    trading_pnl_base: float        # Trading P&L converted at current rate

    # FX impact
    fx_impact: float               # Gain/loss from FX movement
    fx_impact_pct: float           # FX impact as % of position

    # Total P&L
    total_pnl_base: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "position_id": self.position_id,
            "symbol": self.symbol,
            "trade_currency": self.trade_currency,
            "entry_date": self.entry_date.isoformat(),
            "entry_fx_rate": round(self.entry_fx_rate, 6),
            "cost_base_at_entry": round(self.cost_base_at_entry, 2),
            "cost_trade": round(self.cost_trade, 2),
            "current_fx_rate": round(self.current_fx_rate, 6),
            "current_value_trade": round(self.current_value_trade, 2),
            "current_value_base": round(self.current_value_base, 2),
            "trading_pnl_trade": round(self.trading_pnl_trade, 2),
            "trading_pnl_base": round(self.trading_pnl_base, 2),
            "fx_impact": round(self.fx_impact, 2),
            "fx_impact_pct": round(self.fx_impact_pct, 4),
            "total_pnl_base": round(self.total_pnl_base, 2),
        }


class FXAccountingLedger:
    """
    FX Accounting Ledger for multi-currency P&L tracking.

    Tracks all FX-related transactions, calculates realized and unrealized
    FX gains/losses, and provides currency exposure reporting.

    Example:
        ledger = FXAccountingLedger(base_currency="AUD")

        # Record a trade opening
        ledger.record_trade_open(
            trade_id="T001",
            symbol="AAPL",
            trade_currency="USD",
            trade_amount=15000,
            fx_rate=0.65,
        )

        # Mark-to-market revaluation
        ledger.revalue_positions(positions, current_rates)

        # Get FX P&L
        pnl = ledger.get_fx_pnl_summary()
        print(f"Total FX Impact: {pnl.total_fx_impact}")
    """

    def __init__(
        self,
        base_currency: str = "AUD",
        fx_service: Optional[Any] = None,
    ):
        """
        Initialize FX accounting ledger.

        Args:
            base_currency: Portfolio base currency
            fx_service: Optional FXRateService for rate lookups
        """
        self.base_currency = base_currency.upper()
        self.fx_service = fx_service

        # Transaction ledger
        self._transactions: List[FXTransaction] = []
        self._transactions_lock = Lock()

        # Position tracking (position_id -> entry info)
        self._position_entries: Dict[str, Dict[str, Any]] = {}

        # Currency exposure tracking
        self._currency_positions: Dict[str, CurrencyPosition] = {}

        # Running totals
        self._realized_fx_pnl: float = 0.0
        self._unrealized_fx_pnl: float = 0.0
        self._by_currency_realized: Dict[str, float] = {}
        self._by_currency_unrealized: Dict[str, float] = {}

        logger.info(
            "FX Accounting Ledger initialized",
            base_currency=base_currency,
        )

    def record_trade_open(
        self,
        trade_id: str,
        symbol: str,
        trade_currency: str,
        trade_amount: float,
        fx_rate: float,
        position_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> FXTransaction:
        """
        Record opening of a position in foreign currency.

        Args:
            trade_id: Trade identifier
            symbol: Ticker symbol
            trade_currency: Currency of the trade
            trade_amount: Amount in trade currency (positive = long, negative = short)
            fx_rate: FX rate at trade time (1 base = X trade)
            position_id: Position identifier
            timestamp: Trade timestamp

        Returns:
            FXTransaction record
        """
        ts = timestamp or datetime.utcnow()
        base_amount = trade_amount / fx_rate if fx_rate > 0 else trade_amount

        txn = FXTransaction(
            id=str(uuid.uuid4()),
            timestamp=ts,
            transaction_type=FXTransactionType.TRADE_OPEN,
            trade_id=trade_id,
            symbol=symbol,
            trade_currency=trade_currency.upper(),
            trade_amount=trade_amount,
            base_currency=self.base_currency,
            base_amount=base_amount,
            fx_rate=fx_rate,
            fx_gain_type=FXGainType.UNREALIZED,
            position_id=position_id,
        )

        with self._transactions_lock:
            self._transactions.append(txn)

        # Track position entry for FX attribution
        pos_id = position_id or f"{symbol}_{trade_id}"
        self._position_entries[pos_id] = {
            "symbol": symbol,
            "trade_currency": trade_currency.upper(),
            "entry_fx_rate": fx_rate,
            "entry_date": ts,
            "trade_amount": trade_amount,
            "base_amount": base_amount,
        }

        # Update currency exposure
        self._update_currency_exposure(
            trade_currency.upper(),
            trade_amount,
            fx_rate,
            is_open=True,
        )

        logger.info(
            "Trade open recorded",
            trade_id=trade_id,
            symbol=symbol,
            trade_currency=trade_currency,
            trade_amount=trade_amount,
            fx_rate=fx_rate,
        )

        return txn

    def record_trade_close(
        self,
        trade_id: str,
        symbol: str,
        trade_currency: str,
        trade_amount: float,
        fx_rate: float,
        entry_fx_rate: float,
        position_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
    ) -> FXTransaction:
        """
        Record closing of a position in foreign currency.

        Calculates realized FX gain/loss.

        Args:
            trade_id: Trade identifier
            symbol: Ticker symbol
            trade_currency: Currency of the trade
            trade_amount: Amount in trade currency (proceeds)
            fx_rate: Current FX rate
            entry_fx_rate: FX rate when position was opened
            position_id: Position identifier
            timestamp: Trade timestamp

        Returns:
            FXTransaction record
        """
        ts = timestamp or datetime.utcnow()

        # Calculate base amounts
        base_amount_current = trade_amount / fx_rate if fx_rate > 0 else trade_amount
        base_amount_at_entry = trade_amount / entry_fx_rate if entry_fx_rate > 0 else trade_amount

        # FX impact = difference between value at entry rate vs current rate
        fx_impact = base_amount_current - base_amount_at_entry

        txn = FXTransaction(
            id=str(uuid.uuid4()),
            timestamp=ts,
            transaction_type=FXTransactionType.TRADE_CLOSE,
            trade_id=trade_id,
            symbol=symbol,
            trade_currency=trade_currency.upper(),
            trade_amount=trade_amount,
            base_currency=self.base_currency,
            base_amount=base_amount_current,
            fx_rate=fx_rate,
            entry_fx_rate=entry_fx_rate,
            fx_impact=fx_impact,
            fx_gain_type=FXGainType.REALIZED,
            position_id=position_id,
        )

        with self._transactions_lock:
            self._transactions.append(txn)

        # Update realized P&L
        self._realized_fx_pnl += fx_impact
        ccy = trade_currency.upper()
        self._by_currency_realized[ccy] = self._by_currency_realized.get(ccy, 0) + fx_impact

        # Remove position entry
        pos_id = position_id or f"{symbol}_{trade_id}"
        if pos_id in self._position_entries:
            del self._position_entries[pos_id]

        # Update currency exposure
        self._update_currency_exposure(
            trade_currency.upper(),
            -trade_amount,  # Negative to reduce exposure
            fx_rate,
            is_open=False,
        )

        logger.info(
            "Trade close recorded",
            trade_id=trade_id,
            symbol=symbol,
            fx_impact=fx_impact,
            entry_rate=entry_fx_rate,
            exit_rate=fx_rate,
        )

        return txn

    def record_dividend(
        self,
        trade_id: str,
        symbol: str,
        trade_currency: str,
        dividend_amount: float,
        fx_rate: float,
        timestamp: Optional[datetime] = None,
    ) -> FXTransaction:
        """
        Record dividend received in foreign currency.

        Args:
            trade_id: Trade/dividend identifier
            symbol: Ticker symbol
            trade_currency: Currency of dividend
            dividend_amount: Dividend amount in trade currency
            fx_rate: FX rate at dividend date
            timestamp: Dividend date

        Returns:
            FXTransaction record
        """
        ts = timestamp or datetime.utcnow()
        base_amount = dividend_amount / fx_rate if fx_rate > 0 else dividend_amount

        txn = FXTransaction(
            id=str(uuid.uuid4()),
            timestamp=ts,
            transaction_type=FXTransactionType.DIVIDEND,
            trade_id=trade_id,
            symbol=symbol,
            trade_currency=trade_currency.upper(),
            trade_amount=dividend_amount,
            base_currency=self.base_currency,
            base_amount=base_amount,
            fx_rate=fx_rate,
            fx_gain_type=FXGainType.REALIZED,
        )

        with self._transactions_lock:
            self._transactions.append(txn)

        return txn

    def _update_currency_exposure(
        self,
        currency: str,
        amount: float,
        fx_rate: float,
        is_open: bool,
    ) -> None:
        """Update currency exposure tracking."""
        if currency == self.base_currency:
            return  # No FX exposure for base currency

        if currency not in self._currency_positions:
            self._currency_positions[currency] = CurrencyPosition(currency=currency)

        pos = self._currency_positions[currency]

        if is_open:
            if amount > 0:
                pos.gross_long += amount
            else:
                pos.gross_short += abs(amount)
            pos.position_count += 1

            # Update weighted average entry rate
            total_exposure = pos.gross_long - pos.gross_short
            if total_exposure != 0:
                # Weighted average calculation
                old_weight = (total_exposure - amount) / total_exposure if total_exposure != 0 else 0
                new_weight = amount / total_exposure if total_exposure != 0 else 1
                pos.avg_entry_rate = pos.avg_entry_rate * abs(old_weight) + fx_rate * abs(new_weight)
            else:
                pos.avg_entry_rate = fx_rate
        else:
            if amount < 0:  # Closing long
                pos.gross_long += amount  # Reduces long
            else:  # Closing short
                pos.gross_short -= amount  # Reduces short
            pos.position_count = max(0, pos.position_count - 1)

        pos.net_exposure = pos.gross_long - pos.gross_short
        pos.current_rate = fx_rate

    def revalue_positions(
        self,
        positions: List[Dict[str, Any]],
        current_rates: Dict[str, float],
    ) -> Tuple[float, List[FXTransaction]]:
        """
        Mark-to-market revaluation of all open positions.

        Calculates unrealized FX gains/losses.

        Args:
            positions: List of position dictionaries
            current_rates: Current FX rates by currency pair (e.g., {"AUDUSD": 0.65})

        Returns:
            Tuple of (total unrealized FX P&L, list of revaluation transactions)
        """
        ts = datetime.utcnow()
        total_unrealized = 0.0
        revaluation_txns = []

        for pos in positions:
            symbol = pos.get("symbol")
            pos_id = pos.get("id", symbol)
            trade_currency = pos.get("trade_currency", "USD")
            current_value_trade = pos.get("current_value", 0)

            # Get entry info
            entry_info = self._position_entries.get(pos_id)
            if not entry_info:
                continue

            entry_fx_rate = entry_info.get("entry_fx_rate", 1.0)

            # Get current rate
            pair = f"{self.base_currency}{trade_currency}"
            current_fx_rate = current_rates.get(pair, entry_fx_rate)

            # Calculate unrealized FX impact
            value_at_entry_rate = current_value_trade / entry_fx_rate if entry_fx_rate > 0 else current_value_trade
            value_at_current_rate = current_value_trade / current_fx_rate if current_fx_rate > 0 else current_value_trade
            fx_impact = value_at_current_rate - value_at_entry_rate

            total_unrealized += fx_impact

            # Create revaluation transaction
            txn = FXTransaction(
                id=str(uuid.uuid4()),
                timestamp=ts,
                transaction_type=FXTransactionType.REVALUATION,
                trade_id=None,
                symbol=symbol,
                trade_currency=trade_currency,
                trade_amount=current_value_trade,
                base_currency=self.base_currency,
                base_amount=value_at_current_rate,
                fx_rate=current_fx_rate,
                entry_fx_rate=entry_fx_rate,
                fx_impact=fx_impact,
                fx_gain_type=FXGainType.UNREALIZED,
                position_id=pos_id,
            )
            revaluation_txns.append(txn)

            # Update currency position
            if trade_currency in self._currency_positions:
                self._currency_positions[trade_currency].current_rate = current_fx_rate
                self._currency_positions[trade_currency].unrealized_fx_pnl = fx_impact

        self._unrealized_fx_pnl = total_unrealized

        logger.info(
            "Positions revalued",
            position_count=len(positions),
            total_unrealized_fx=total_unrealized,
        )

        return total_unrealized, revaluation_txns

    def get_fx_pnl_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> FXPnLSummary:
        """
        Get FX P&L summary.

        Args:
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            FXPnLSummary with realized and unrealized breakdown
        """
        # Filter transactions by date if specified
        with self._transactions_lock:
            txns = self._transactions.copy()

        if start_date:
            txns = [t for t in txns if t.timestamp >= start_date]
        if end_date:
            txns = [t for t in txns if t.timestamp <= end_date]

        # Calculate realized
        realized_gain = 0.0
        realized_loss = 0.0
        by_currency = {}

        for txn in txns:
            if txn.fx_gain_type == FXGainType.REALIZED:
                if txn.fx_impact > 0:
                    realized_gain += txn.fx_impact
                else:
                    realized_loss += abs(txn.fx_impact)

                ccy = txn.trade_currency
                by_currency[ccy] = by_currency.get(ccy, 0) + txn.fx_impact

        # Get unrealized from position tracking
        unrealized_gain = 0.0
        unrealized_loss = 0.0

        for ccy, pos in self._currency_positions.items():
            if pos.unrealized_fx_pnl > 0:
                unrealized_gain += pos.unrealized_fx_pnl
            else:
                unrealized_loss += abs(pos.unrealized_fx_pnl)

            by_currency[ccy] = by_currency.get(ccy, 0) + pos.unrealized_fx_pnl

        realized_net = realized_gain - realized_loss
        unrealized_net = unrealized_gain - unrealized_loss
        total = realized_net + unrealized_net

        return FXPnLSummary(
            base_currency=self.base_currency,
            period_start=start_date,
            period_end=end_date,
            realized_fx_gain=realized_gain,
            realized_fx_loss=realized_loss,
            realized_fx_net=realized_net,
            unrealized_fx_gain=unrealized_gain,
            unrealized_fx_loss=unrealized_loss,
            unrealized_fx_net=unrealized_net,
            total_fx_impact=total,
            by_currency=by_currency,
        )

    def get_currency_exposure(self) -> Dict[str, CurrencyPosition]:
        """
        Get current currency exposure.

        Returns:
            Dictionary of currency positions
        """
        return {ccy: pos for ccy, pos in self._currency_positions.items()}

    def get_position_fx_attribution(
        self,
        position_id: str,
        current_value_trade: float,
        current_fx_rate: float,
    ) -> Optional[PositionFXAttribution]:
        """
        Get FX attribution for a specific position.

        Breaks down P&L into trading vs FX components.

        Args:
            position_id: Position identifier
            current_value_trade: Current value in trade currency
            current_fx_rate: Current FX rate

        Returns:
            PositionFXAttribution or None if position not found
        """
        entry = self._position_entries.get(position_id)
        if not entry:
            return None

        entry_fx_rate = entry["entry_fx_rate"]
        cost_trade = entry["trade_amount"]
        cost_base = entry["base_amount"]

        # Trading P&L (in trade currency)
        trading_pnl_trade = current_value_trade - cost_trade

        # Convert trading P&L to base at current rate
        trading_pnl_base = trading_pnl_trade / current_fx_rate if current_fx_rate > 0 else trading_pnl_trade

        # Current value in base
        current_value_base = current_value_trade / current_fx_rate if current_fx_rate > 0 else current_value_trade

        # FX impact = (value at current rate) - (value at entry rate)
        value_at_entry_rate = current_value_trade / entry_fx_rate if entry_fx_rate > 0 else current_value_trade
        fx_impact = current_value_base - value_at_entry_rate

        # FX impact percentage
        fx_impact_pct = fx_impact / cost_base if cost_base != 0 else 0

        # Total P&L
        total_pnl_base = current_value_base - cost_base

        return PositionFXAttribution(
            position_id=position_id,
            symbol=entry["symbol"],
            trade_currency=entry["trade_currency"],
            entry_date=entry["entry_date"],
            entry_fx_rate=entry_fx_rate,
            cost_base_at_entry=cost_base,
            cost_trade=cost_trade,
            current_fx_rate=current_fx_rate,
            current_value_trade=current_value_trade,
            current_value_base=current_value_base,
            trading_pnl_trade=trading_pnl_trade,
            trading_pnl_base=trading_pnl_base,
            fx_impact=fx_impact,
            fx_impact_pct=fx_impact_pct,
            total_pnl_base=total_pnl_base,
        )

    def get_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        transaction_type: Optional[FXTransactionType] = None,
        currency: Optional[str] = None,
        limit: int = 100,
    ) -> List[FXTransaction]:
        """
        Get FX transactions with optional filtering.

        Args:
            start_date: Optional start date
            end_date: Optional end date
            transaction_type: Optional transaction type filter
            currency: Optional currency filter
            limit: Maximum transactions to return

        Returns:
            List of FXTransaction records
        """
        with self._transactions_lock:
            txns = self._transactions.copy()

        if start_date:
            txns = [t for t in txns if t.timestamp >= start_date]
        if end_date:
            txns = [t for t in txns if t.timestamp <= end_date]
        if transaction_type:
            txns = [t for t in txns if t.transaction_type == transaction_type]
        if currency:
            txns = [t for t in txns if t.trade_currency == currency.upper()]

        # Sort by timestamp descending
        txns.sort(key=lambda t: t.timestamp, reverse=True)

        return txns[:limit]

    def get_exposure_summary(self) -> Dict[str, Any]:
        """
        Get summary of all currency exposures.

        Returns:
            Summary dictionary with total exposure by currency
        """
        total_exposure_base = 0.0
        exposures = []

        for ccy, pos in self._currency_positions.items():
            if pos.current_rate > 0:
                exposure_base = pos.net_exposure / pos.current_rate
            else:
                exposure_base = pos.net_exposure

            total_exposure_base += abs(exposure_base)

            exposures.append({
                "currency": ccy,
                "net_exposure": pos.net_exposure,
                "net_exposure_base": exposure_base,
                "position_count": pos.position_count,
                "unrealized_fx_pnl": pos.unrealized_fx_pnl,
            })

        return {
            "base_currency": self.base_currency,
            "total_exposure_base": round(total_exposure_base, 2),
            "currencies": exposures,
            "currency_count": len(exposures),
        }

    def reset(self) -> None:
        """Reset all accounting data."""
        with self._transactions_lock:
            self._transactions.clear()

        self._position_entries.clear()
        self._currency_positions.clear()
        self._realized_fx_pnl = 0.0
        self._unrealized_fx_pnl = 0.0
        self._by_currency_realized.clear()
        self._by_currency_unrealized.clear()

        logger.info("FX Accounting Ledger reset")


# Global ledger instance
_fx_ledger: Optional[FXAccountingLedger] = None


def get_fx_ledger(base_currency: str = "AUD") -> FXAccountingLedger:
    """Get or create the global FX accounting ledger."""
    global _fx_ledger
    if _fx_ledger is None:
        _fx_ledger = FXAccountingLedger(base_currency=base_currency)
    return _fx_ledger


def set_fx_ledger(ledger: FXAccountingLedger) -> None:
    """Set the global FX accounting ledger."""
    global _fx_ledger
    _fx_ledger = ledger
