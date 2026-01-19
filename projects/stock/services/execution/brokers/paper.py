"""
Paper Trading Broker with Multi-Currency Support

Simulates order execution for paper trading and backtesting.

Features:
- Instant market order fills
- Limit order simulation
- Position tracking
- P&L calculation in both trade and base currency
- Trade history with full audit trail
- Multi-currency support with FX conversion
- Separate FX impact tracking
"""

import uuid
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

import random
import structlog

logger = structlog.get_logger(__name__)


# Market currency mapping (fallback if markets.json not loaded)
DEFAULT_MARKET_CURRENCIES = {
    "US": "USD",
    "ASX": "AUD",
    "CRYPTO": "USD",
    "LSE": "GBP",
    "TSX": "CAD",
}


class PaperBroker:
    """
    Paper trading broker for simulation with multi-currency support.

    Simulates realistic order execution with configurable slippage.
    Tracks positions and P&L in both trade currency and base currency (AUD).
    """

    def __init__(
        self,
        initial_balance: float = 100000.0,
        commission_per_trade: float = 0.0,
        slippage_pct: float = 0.01,  # 0.01% slippage
        base_currency: str = "AUD",
        fx_service: Optional[Any] = None,
        fx_ledger: Optional[Any] = None,
    ):
        """
        Initialize paper broker.

        Args:
            initial_balance: Starting cash balance in base currency
            commission_per_trade: Fixed commission per trade
            slippage_pct: Slippage percentage for market orders
            base_currency: Portfolio base currency (default AUD)
            fx_service: FXRateService instance for currency conversion
            fx_ledger: FXAccountingLedger instance for FX P&L tracking
        """
        self.initial_balance = initial_balance
        self.base_currency = base_currency
        self.commission_per_trade = commission_per_trade
        self.slippage_pct = slippage_pct
        self.fx_service = fx_service
        self.fx_ledger = fx_ledger

        # Cash balances by currency
        self.cash_by_currency: Dict[str, float] = {
            base_currency: initial_balance,
        }

        self.orders: Dict[str, Dict] = {}
        self.positions: Dict[str, Dict] = {}  # key: symbol
        self.trades: List[Dict] = []

        # P&L tracking (in base currency)
        self.realized_pnl_base = 0.0
        self.total_fx_impact = 0.0
        self.peak_equity = initial_balance

        logger.info(
            "Paper broker initialized",
            initial_balance=initial_balance,
            base_currency=base_currency,
            commission=commission_per_trade,
            slippage=slippage_pct,
            fx_ledger_enabled=fx_ledger is not None,
        )

    def _get_market_currency(self, market: str) -> str:
        """Get the trading currency for a market."""
        return DEFAULT_MARKET_CURRENCIES.get(market.upper(), "USD")

    async def _get_fx_rate(self, trade_currency: str) -> float:
        """
        Get FX rate for converting trade currency to base currency.

        Returns rate where 1 base_currency = X trade_currency
        (or the inverse for conversion from trade to base)
        """
        if trade_currency == self.base_currency:
            return 1.0

        if not self.fx_service:
            # Fallback rates
            fallback_rates = {
                "USD": 0.65,   # 1 AUD = 0.65 USD
                "GBP": 0.52,
                "EUR": 0.60,
                "CAD": 0.88,
            }
            return fallback_rates.get(trade_currency, 1.0)

        try:
            # Get rate: 1 AUD = X trade_currency
            rate = await self.fx_service.get_rate(self.base_currency, trade_currency)
            return rate
        except Exception as e:
            logger.warning("Could not get FX rate, using fallback", error=str(e))
            return 0.65 if trade_currency == "USD" else 1.0

    def _get_fx_rate_sync(self, trade_currency: str) -> float:
        """Synchronous wrapper for getting FX rate."""
        if trade_currency == self.base_currency:
            return 1.0

        # Try to get cached rate
        if self.fx_service:
            pair = f"{self.base_currency}{trade_currency}"
            cached = self.fx_service.get_cached_rate(pair)
            if cached:
                return cached

        # Fallback
        fallback_rates = {"USD": 0.65, "GBP": 0.52, "EUR": 0.60, "CAD": 0.88}
        return fallback_rates.get(trade_currency, 1.0)

    def _apply_slippage(self, price: float, side: str) -> float:
        """Apply slippage to execution price."""
        slippage = price * (self.slippage_pct / 100) * random.uniform(0.5, 1.5)
        if side == "BUY":
            return price + slippage  # Buy at slightly higher price
        else:
            return price - slippage  # Sell at slightly lower price

    def _calculate_position_value(self) -> float:
        """Calculate total value of all positions in base currency."""
        total = 0.0
        for pos in self.positions.values():
            current_price = pos.get("current_price", pos["average_entry_price"])
            trade_currency = pos.get("trade_currency", "USD")
            fx_rate = pos.get("current_fx_rate") or self._get_fx_rate_sync(trade_currency)

            # Value in trade currency
            if pos["side"] == "LONG":
                value_trade = pos["quantity"] * current_price
            else:  # SHORT
                value_trade = -pos["quantity"] * current_price

            # Convert to base currency
            # fx_rate is 1 AUD = X trade_currency, so divide to get AUD
            if fx_rate > 0:
                value_base = value_trade / fx_rate
            else:
                value_base = value_trade

            total += value_base

        return total

    def _update_position(
        self,
        symbol: str,
        market: str,
        side: str,
        quantity: float,
        price: float,
        trade_currency: str,
        fx_rate: float,
        trade_id: Optional[str] = None,
    ) -> Optional[Dict[str, float]]:
        """
        Update position after a trade.

        Returns dict with realized P&L in trade and base currency if position was closed.
        Also records to FX accounting ledger if available.
        """
        key = symbol
        realized = None
        position_id = f"pos_{symbol}"

        if key not in self.positions:
            # New position
            self.positions[key] = {
                "id": position_id,
                "symbol": symbol,
                "market": market,
                "side": "LONG" if side == "BUY" else "SHORT",
                "quantity": quantity,
                "average_entry_price": price,
                "current_price": price,
                "unrealized_pnl": 0.0,
                "realized_pnl": 0.0,
                # FX fields
                "base_currency": self.base_currency,
                "trade_currency": trade_currency,
                "fx_rate_at_entry": fx_rate,
                "current_fx_rate": fx_rate,
                "unrealized_pnl_base": 0.0,
                "realized_pnl_base": 0.0,
                "fx_impact": 0.0,
            }

            # Record trade open in FX ledger
            if self.fx_ledger and trade_currency != self.base_currency:
                trade_amount = price * quantity
                if side == "SELL":
                    trade_amount = -trade_amount  # Short position
                try:
                    self.fx_ledger.record_trade_open(
                        trade_id=trade_id or position_id,
                        symbol=symbol,
                        trade_currency=trade_currency,
                        trade_amount=trade_amount,
                        fx_rate=fx_rate,
                        position_id=position_id,
                    )
                except Exception as e:
                    logger.warning("Failed to record trade open in FX ledger", error=str(e))
        else:
            pos = self.positions[key]
            existing_side = "BUY" if pos["side"] == "LONG" else "SELL"

            if side == existing_side:
                # Adding to position - recalculate average entry
                old_cost = pos["quantity"] * pos["average_entry_price"]
                new_cost = quantity * price
                total_quantity = pos["quantity"] + quantity
                new_avg_price = (old_cost + new_cost) / total_quantity

                # Recalculate entry FX rate (weighted average)
                old_fx = pos.get("fx_rate_at_entry", fx_rate)
                new_fx_rate = (pos["quantity"] * old_fx + quantity * fx_rate) / total_quantity

                pos["quantity"] = total_quantity
                pos["average_entry_price"] = new_avg_price
                pos["current_price"] = price
                pos["fx_rate_at_entry"] = new_fx_rate
                pos["current_fx_rate"] = fx_rate

                # Record position addition in FX ledger
                if self.fx_ledger and trade_currency != self.base_currency:
                    trade_amount = price * quantity
                    if side == "SELL":
                        trade_amount = -trade_amount
                    try:
                        self.fx_ledger.record_trade_open(
                            trade_id=trade_id or f"{position_id}_add",
                            symbol=symbol,
                            trade_currency=trade_currency,
                            trade_amount=trade_amount,
                            fx_rate=fx_rate,
                            position_id=position_id,
                        )
                    except Exception as e:
                        logger.warning("Failed to record position addition in FX ledger", error=str(e))
            else:
                # Reducing or closing position
                entry_fx = pos.get("fx_rate_at_entry", fx_rate)
                close_quantity = min(quantity, pos["quantity"])

                if quantity >= pos["quantity"]:
                    # Closing entire position
                    if pos["side"] == "LONG":
                        pnl_trade = (price - pos["average_entry_price"]) * pos["quantity"]
                    else:
                        pnl_trade = (pos["average_entry_price"] - price) * pos["quantity"]

                    # P&L in base currency at current FX rate
                    pnl_base = pnl_trade / fx_rate if fx_rate > 0 else pnl_trade

                    # Calculate FX impact
                    # FX impact = what the P&L would have been at entry FX vs current FX
                    pnl_at_entry_fx = pnl_trade / entry_fx if entry_fx > 0 else pnl_trade
                    fx_impact = pnl_base - pnl_at_entry_fx

                    realized = {
                        "pnl_trade": pnl_trade,
                        "pnl_base": pnl_base,
                        "fx_impact": fx_impact,
                    }

                    # Record trade close in FX ledger
                    if self.fx_ledger and trade_currency != self.base_currency:
                        trade_amount = price * close_quantity
                        try:
                            self.fx_ledger.record_trade_close(
                                trade_id=trade_id or position_id,
                                symbol=symbol,
                                trade_currency=trade_currency,
                                trade_amount=trade_amount,
                                fx_rate=fx_rate,
                                entry_fx_rate=entry_fx,
                                position_id=position_id,
                            )
                        except Exception as e:
                            logger.warning("Failed to record trade close in FX ledger", error=str(e))

                    del self.positions[key]
                else:
                    # Partial close
                    if pos["side"] == "LONG":
                        pnl_trade = (price - pos["average_entry_price"]) * quantity
                    else:
                        pnl_trade = (pos["average_entry_price"] - price) * quantity

                    pnl_base = pnl_trade / fx_rate if fx_rate > 0 else pnl_trade
                    pnl_at_entry_fx = pnl_trade / entry_fx if entry_fx > 0 else pnl_trade
                    fx_impact = pnl_base - pnl_at_entry_fx

                    realized = {
                        "pnl_trade": pnl_trade,
                        "pnl_base": pnl_base,
                        "fx_impact": fx_impact,
                    }

                    # Record partial trade close in FX ledger
                    if self.fx_ledger and trade_currency != self.base_currency:
                        trade_amount = price * close_quantity
                        try:
                            self.fx_ledger.record_trade_close(
                                trade_id=trade_id or f"{position_id}_partial",
                                symbol=symbol,
                                trade_currency=trade_currency,
                                trade_amount=trade_amount,
                                fx_rate=fx_rate,
                                entry_fx_rate=entry_fx,
                                position_id=position_id,
                            )
                        except Exception as e:
                            logger.warning("Failed to record partial trade close in FX ledger", error=str(e))

                    pos["quantity"] -= quantity
                    pos["current_price"] = price
                    pos["current_fx_rate"] = fx_rate
                    pos["realized_pnl"] += pnl_trade
                    pos["realized_pnl_base"] += pnl_base
                    pos["fx_impact"] += fx_impact

        return realized

    def submit_order(
        self,
        symbol: str,
        market: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        signal_id: Optional[str] = None,
        risk_check_id: Optional[str] = None,
        reason: str = "",
        data_snapshot_hash: str = "",
        rule_version_id: str = "",
    ) -> Dict[str, Any]:
        """
        Submit an order.

        For MARKET orders, executes immediately with slippage.
        For LIMIT orders, simulates immediate fill if price is favorable.
        """
        order_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Get trade currency and FX rate
        trade_currency = self._get_market_currency(market)
        fx_rate = self._get_fx_rate_sync(trade_currency)

        # Determine execution price
        execution_price = price or 100.0  # Default for testing
        if order_type == "MARKET":
            execution_price = self._apply_slippage(execution_price, side)

        # Calculate order cost in trade currency and base currency
        order_cost_trade = execution_price * quantity
        order_cost_base = order_cost_trade / fx_rate if fx_rate > 0 else order_cost_trade

        # Get available cash in base currency
        total_cash_base = self._get_total_cash_base()

        # Check if we can afford the order (in base currency)
        if side == "BUY" and order_cost_base > total_cash_base:
            # Reject order - insufficient funds
            order = {
                "id": order_id,
                "symbol": symbol,
                "market": market,
                "side": side,
                "order_type": order_type,
                "quantity": quantity,
                "price": price,
                "stop_price": stop_price,
                "status": "REJECTED",
                "filled_quantity": 0,
                "average_fill_price": None,
                "commission": 0,
                "signal_id": signal_id,
                "risk_check_id": risk_check_id,
                "reason": reason,
                "data_snapshot_hash": data_snapshot_hash,
                "rule_version_id": rule_version_id,
                "created_at": now,
                "submitted_at": now,
                "filled_at": None,
                # FX fields
                "base_currency": self.base_currency,
                "trade_currency": trade_currency,
                "fx_rate_at_entry": fx_rate,
                "amount_base": order_cost_base,
                "amount_trade": order_cost_trade,
            }
            self.orders[order_id] = order
            logger.warning("Order rejected - insufficient funds", order_id=order_id)
            return order

        # Create order
        order = {
            "id": order_id,
            "symbol": symbol,
            "market": market,
            "side": side,
            "order_type": order_type,
            "quantity": quantity,
            "price": price,
            "stop_price": stop_price,
            "status": "PENDING",
            "filled_quantity": 0,
            "average_fill_price": None,
            "commission": 0,
            "signal_id": signal_id,
            "risk_check_id": risk_check_id,
            "reason": reason,
            "data_snapshot_hash": data_snapshot_hash,
            "rule_version_id": rule_version_id,
            "created_at": now,
            "submitted_at": now,
            "filled_at": None,
            # FX fields
            "base_currency": self.base_currency,
            "trade_currency": trade_currency,
            "fx_rate_at_entry": fx_rate,
            "amount_base": None,
            "amount_trade": None,
        }

        # For MARKET orders, execute immediately
        if order_type == "MARKET":
            order = self._fill_order(order, execution_price, trade_currency, fx_rate)
        else:
            # For limit orders, check if we can fill immediately
            if order_type == "LIMIT" and price:
                if (side == "BUY" and price >= execution_price) or \
                   (side == "SELL" and price <= execution_price):
                    order = self._fill_order(order, price, trade_currency, fx_rate)
                else:
                    order["status"] = "SUBMITTED"

        self.orders[order_id] = order
        return order

    def _fill_order(
        self,
        order: Dict,
        fill_price: float,
        trade_currency: str,
        fx_rate: float,
    ) -> Dict:
        """Fill an order at the given price."""
        now = datetime.utcnow()

        # Calculate commission
        commission = self.commission_per_trade

        # Update position
        realized = self._update_position(
            symbol=order["symbol"],
            market=order["market"],
            side=order["side"],
            quantity=order["quantity"],
            price=fill_price,
            trade_currency=trade_currency,
            fx_rate=fx_rate,
            trade_id=order["id"],
        )

        # Calculate trade value
        trade_value_trade = fill_price * order["quantity"]
        trade_value_base = trade_value_trade / fx_rate if fx_rate > 0 else trade_value_trade

        # Update cash (in base currency)
        if order["side"] == "BUY":
            self._deduct_cash(trade_value_base + commission)
        else:
            self._add_cash(trade_value_base - commission)

        # Update realized P&L
        if realized:
            self.realized_pnl_base += realized["pnl_base"]
            self.total_fx_impact += realized["fx_impact"]

        # Update order
        order["status"] = "FILLED"
        order["filled_quantity"] = order["quantity"]
        order["average_fill_price"] = fill_price
        order["commission"] = commission
        order["filled_at"] = now
        order["amount_trade"] = trade_value_trade
        order["amount_base"] = trade_value_base

        # Create trade record
        trade = {
            "id": str(uuid.uuid4()),
            "order_id": order["id"],
            "symbol": order["symbol"],
            "market": order["market"],
            "side": order["side"],
            "quantity": order["quantity"],
            "price": fill_price,
            "commission": commission,
            "gross_pnl": realized["pnl_trade"] if realized else None,
            "net_pnl": (realized["pnl_trade"] - commission) if realized else None,
            "signal_id": order.get("signal_id"),
            "risk_check_id": order.get("risk_check_id"),
            "reason": order["reason"],
            "data_snapshot_hash": order["data_snapshot_hash"],
            "rule_version_id": order["rule_version_id"],
            "timestamp": now,
            # FX fields
            "base_currency": self.base_currency,
            "trade_currency": trade_currency,
            "fx_rate_at_execution": fx_rate,
            "gross_pnl_base": realized["pnl_base"] if realized else None,
            "net_pnl_base": (realized["pnl_base"] - commission) if realized else None,
            "fx_impact": realized["fx_impact"] if realized else None,
        }
        self.trades.append(trade)

        logger.info(
            "Order filled",
            order_id=order["id"],
            symbol=order["symbol"],
            side=order["side"],
            quantity=order["quantity"],
            price=fill_price,
            trade_currency=trade_currency,
            fx_rate=fx_rate,
            pnl_trade=realized["pnl_trade"] if realized else None,
            pnl_base=realized["pnl_base"] if realized else None,
        )

        return order

    def _get_total_cash_base(self) -> float:
        """Get total cash balance in base currency."""
        total = 0.0
        for currency, amount in self.cash_by_currency.items():
            if currency == self.base_currency:
                total += amount
            else:
                fx_rate = self._get_fx_rate_sync(currency)
                total += amount / fx_rate if fx_rate > 0 else amount
        return total

    def _deduct_cash(self, amount_base: float) -> None:
        """Deduct cash from base currency balance."""
        if self.base_currency in self.cash_by_currency:
            self.cash_by_currency[self.base_currency] -= amount_base
        else:
            self.cash_by_currency[self.base_currency] = -amount_base

    def _add_cash(self, amount_base: float) -> None:
        """Add cash to base currency balance."""
        if self.base_currency in self.cash_by_currency:
            self.cash_by_currency[self.base_currency] += amount_base
        else:
            self.cash_by_currency[self.base_currency] = amount_base

    @property
    def cash(self) -> float:
        """Get cash in base currency (backward compatible)."""
        return self._get_total_cash_base()

    def cancel_order(self, order_id: str) -> bool:
        """Cancel an order."""
        if order_id not in self.orders:
            return False

        order = self.orders[order_id]
        if order["status"] in ["PENDING", "SUBMITTED"]:
            order["status"] = "CANCELLED"
            logger.info("Order cancelled", order_id=order_id)
            return True

        return False

    def get_order(self, order_id: str) -> Optional[Dict]:
        """Get order by ID."""
        return self.orders.get(order_id)

    def get_orders(
        self,
        status: Optional[str] = None,
        symbol: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict]:
        """Get orders with optional filtering."""
        orders = list(self.orders.values())

        if status:
            orders = [o for o in orders if o["status"] == status]

        if symbol:
            orders = [o for o in orders if o["symbol"] == symbol]

        # Sort by created_at descending
        orders.sort(key=lambda x: x["created_at"], reverse=True)

        return orders[:limit]

    def get_positions(self) -> List[Dict]:
        """Get all current positions."""
        return list(self.positions.values())

    def get_trades(
        self,
        symbol: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict]:
        """Get trade history."""
        trades = self.trades.copy()

        if symbol:
            trades = [t for t in trades if t["symbol"] == symbol]

        # Sort by timestamp descending
        trades.sort(key=lambda x: x["timestamp"], reverse=True)

        return trades[:limit]

    def get_account(self) -> Dict:
        """Get account information (values in base currency)."""
        positions_value = self._calculate_position_value()
        cash_base = self._get_total_cash_base()
        equity = cash_base + positions_value

        # Calculate unrealized P&L in base currency
        unrealized_pnl_base = 0.0
        for pos in self.positions.values():
            current_price = pos.get("current_price", pos["average_entry_price"])
            fx_rate = pos.get("current_fx_rate", 1.0)

            if pos["side"] == "LONG":
                pnl_trade = (current_price - pos["average_entry_price"]) * pos["quantity"]
            else:
                pnl_trade = (pos["average_entry_price"] - current_price) * pos["quantity"]

            pnl_base = pnl_trade / fx_rate if fx_rate > 0 else pnl_trade
            unrealized_pnl_base += pnl_base

        # Update peak equity
        if equity > self.peak_equity:
            self.peak_equity = equity

        return {
            "cash": cash_base,
            "equity": equity,
            "buying_power": cash_base,  # Simplified - no margin
            "positions_value": positions_value,
            "unrealized_pnl": unrealized_pnl_base,
            "realized_pnl": self.realized_pnl_base,
        }

    def get_account_extended(self) -> Dict:
        """Get extended account info with FX breakdown."""
        basic = self.get_account()

        # Get FX rates used
        fx_rates = {}
        for pos in self.positions.values():
            trade_ccy = pos.get("trade_currency", "USD")
            if trade_ccy != self.base_currency and trade_ccy not in fx_rates:
                fx_rates[f"{self.base_currency}{trade_ccy}"] = pos.get("current_fx_rate", 1.0)

        # Group positions by currency
        positions_by_currency = {}
        for pos in self.positions.values():
            trade_ccy = pos.get("trade_currency", "USD")
            current_price = pos.get("current_price", pos["average_entry_price"])
            value = pos["quantity"] * current_price

            if trade_ccy not in positions_by_currency:
                positions_by_currency[trade_ccy] = 0.0
            positions_by_currency[trade_ccy] += value

        return {
            **basic,
            "base_currency": self.base_currency,
            "cash_by_currency": self.cash_by_currency.copy(),
            "positions_by_currency": positions_by_currency,
            "total_fx_impact": self.total_fx_impact,
            "fx_rates_used": fx_rates,
        }

    def update_prices(self, prices: Dict[str, float]) -> None:
        """Update current prices for positions."""
        for symbol, price in prices.items():
            if symbol in self.positions:
                pos = self.positions[symbol]
                pos["current_price"] = price

                if pos["side"] == "LONG":
                    pos["unrealized_pnl"] = (price - pos["average_entry_price"]) * pos["quantity"]
                else:
                    pos["unrealized_pnl"] = (pos["average_entry_price"] - price) * pos["quantity"]

    async def update_fx_rates(self) -> None:
        """Update FX rates for all positions."""
        if not self.fx_service:
            return

        for symbol, pos in self.positions.items():
            trade_ccy = pos.get("trade_currency", "USD")
            if trade_ccy != self.base_currency:
                try:
                    rate = await self.fx_service.get_rate(self.base_currency, trade_ccy)
                    entry_rate = pos.get("fx_rate_at_entry", rate)
                    pos["current_fx_rate"] = rate

                    # Recalculate unrealized P&L in base currency
                    pnl_trade = pos.get("unrealized_pnl", 0.0)
                    pos["unrealized_pnl_base"] = pnl_trade / rate if rate > 0 else pnl_trade

                    # Calculate FX impact
                    pnl_at_entry_fx = pnl_trade / entry_rate if entry_rate > 0 else pnl_trade
                    pos["fx_impact"] = pos["unrealized_pnl_base"] - pnl_at_entry_fx

                except Exception as e:
                    logger.warning(
                        "Could not update FX rate for position",
                        symbol=symbol,
                        error=str(e),
                    )

    # =========================================================================
    # Reconciliation Support Methods
    # =========================================================================

    def get_positions_by_symbol(self) -> Dict[str, Dict]:
        """
        Get positions keyed by symbol for reconciliation.

        Returns:
            Dictionary mapping symbol to position data
        """
        return self.positions.copy()

    def get_open_orders(self) -> List[Dict]:
        """
        Get all open (unfilled) orders.

        Returns:
            List of orders with status PENDING, SUBMITTED, or PARTIAL
        """
        open_statuses = {"PENDING", "SUBMITTED", "PARTIAL"}
        return [o for o in self.orders.values() if o.get("status") in open_statuses]

    def get_position_snapshot(self) -> Dict:
        """
        Get a snapshot of all positions for audit/reconciliation.

        Returns:
            Dictionary with positions and metadata
        """
        return {
            "snapshot_time": datetime.utcnow().isoformat(),
            "positions": self.get_positions(),
            "position_count": len(self.positions),
            "total_value": self._calculate_position_value(),
        }

    def get_order_snapshot(self) -> Dict:
        """
        Get a snapshot of all orders for audit/reconciliation.

        Returns:
            Dictionary with orders and metadata
        """
        open_orders = self.get_open_orders()
        return {
            "snapshot_time": datetime.utcnow().isoformat(),
            "open_orders": open_orders,
            "open_order_count": len(open_orders),
            "total_order_count": len(self.orders),
        }

    def get_reconciliation_data(self) -> Dict:
        """
        Get all data needed for reconciliation in one call.

        Returns:
            Dictionary with positions, orders, and account state
        """
        return {
            "snapshot_time": datetime.utcnow().isoformat(),
            "positions": self.get_position_snapshot(),
            "orders": self.get_order_snapshot(),
            "account": self.get_account(),
        }
