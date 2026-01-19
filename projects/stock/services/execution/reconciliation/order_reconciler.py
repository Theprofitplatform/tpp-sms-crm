"""
Order Reconciler - Stock Trading Automation System

Compares broker open orders vs local open orders and detects:
    - Orphaned broker orders (exist in broker but not locally)
    - Missing local orders (exist locally but not in broker)
    - Status mismatches (different fill status)
    - Missing fills (order filled in broker but not recorded locally)

CRITICAL: Order mismatches can indicate:
    - Network failures during order submission
    - Fills not properly recorded
    - Order cancellation issues
    - Broker API inconsistencies

Usage:
    reconciler = OrderReconciler(broker, db_pool)
    result = await reconciler.reconcile()

    if result.requires_intervention:
        await reconciler.handle_mismatch(result)
"""

import os
import time
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Any, Optional, Literal

import httpx
import structlog

logger = structlog.get_logger(__name__)


@dataclass
class OrderMismatch:
    """Details of an order mismatch between broker and local."""

    order_id: str
    symbol: str
    mismatch_type: Literal["orphaned_broker", "missing_local", "status", "fill_quantity", "fill_price"]
    broker_value: Any
    local_value: Any
    severity: Literal["warning", "critical"]
    details: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class OrderReconciliationResult:
    """Result of order reconciliation."""

    timestamp: datetime
    broker_orders: Dict[str, dict]
    local_orders: Dict[str, dict]
    mismatches: List[OrderMismatch]
    status: Literal["matched", "mismatch", "error"]
    requires_intervention: bool
    orphaned_broker_count: int = 0
    missing_local_count: int = 0
    execution_time_ms: int = 0
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "broker_orders": self.broker_orders,
            "local_orders": self.local_orders,
            "mismatches": [m.to_dict() for m in self.mismatches],
            "status": self.status,
            "requires_intervention": self.requires_intervention,
            "orphaned_broker_count": self.orphaned_broker_count,
            "missing_local_count": self.missing_local_count,
            "execution_time_ms": self.execution_time_ms,
            "error_message": self.error_message,
        }


class OrderReconciler:
    """
    Reconciles broker open orders vs local open orders.

    Compares orders from the broker (paper or live) with orders
    tracked locally in the database, identifying any discrepancies.
    """

    # Price tolerance for floating point comparison (0.1%)
    PRICE_TOLERANCE_PCT = 0.001

    # Quantity tolerance
    QUANTITY_TOLERANCE = 0.00001

    def __init__(
        self,
        broker,
        db_pool,
        risk_service_url: str = None,
        discord_webhook_url: str = None,
    ):
        """
        Initialize order reconciler.

        Args:
            broker: Broker instance (PaperBroker or live broker)
            db_pool: PostgreSQL connection pool for storing reports
            risk_service_url: URL of risk service for kill switch
            discord_webhook_url: URL for Discord alerts
        """
        self.broker = broker
        self.db_pool = db_pool
        self.risk_service_url = risk_service_url or os.getenv(
            "RISK_SERVICE_URL", "http://localhost:5103"
        )
        self.discord_webhook_url = discord_webhook_url or os.getenv("DISCORD_WEBHOOK_URL")

    async def fetch_broker_orders(self) -> Dict[str, dict]:
        """
        Fetch open orders from broker (paper or live).

        Returns:
            Dictionary of orders keyed by order ID
        """
        try:
            # Get orders with status PENDING or SUBMITTED (open orders)
            orders = self.broker.get_orders(status=None, limit=1000)

            # Filter to open orders only
            open_statuses = {"PENDING", "SUBMITTED", "PARTIAL"}
            order_dict = {}

            for order in orders:
                if order.get("status") in open_statuses:
                    order_id = order.get("id")
                    if order_id:
                        order_dict[order_id] = {
                            "id": order_id,
                            "symbol": order.get("symbol"),
                            "market": order.get("market", "US"),
                            "side": order.get("side"),
                            "order_type": order.get("order_type"),
                            "quantity": float(order.get("quantity", 0)),
                            "price": float(order.get("price", 0)) if order.get("price") else None,
                            "status": order.get("status"),
                            "filled_quantity": float(order.get("filled_quantity", 0)),
                            "average_fill_price": float(order.get("average_fill_price", 0)) if order.get("average_fill_price") else None,
                            "created_at": order.get("created_at"),
                        }

            logger.info(
                "Fetched broker open orders",
                count=len(order_dict),
            )

            return order_dict

        except Exception as e:
            logger.error("Failed to fetch broker orders", error=str(e))
            raise

    async def fetch_local_orders(self) -> Dict[str, dict]:
        """
        Fetch open orders from local database.

        Returns:
            Dictionary of orders keyed by order ID
        """
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        id,
                        symbol,
                        market,
                        side,
                        order_type,
                        quantity,
                        price,
                        status,
                        filled_quantity,
                        average_fill_price,
                        created_at
                    FROM orders
                    WHERE status IN ('PENDING', 'SUBMITTED', 'PARTIAL')
                    ORDER BY created_at DESC
                    """
                )

                order_dict = {}
                for row in rows:
                    order_id = str(row["id"])
                    order_dict[order_id] = {
                        "id": order_id,
                        "symbol": row["symbol"],
                        "market": row["market"],
                        "side": row["side"],
                        "order_type": row["order_type"],
                        "quantity": float(row["quantity"]),
                        "price": float(row["price"]) if row["price"] else None,
                        "status": row["status"],
                        "filled_quantity": float(row["filled_quantity"]) if row["filled_quantity"] else 0,
                        "average_fill_price": float(row["average_fill_price"]) if row["average_fill_price"] else None,
                        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    }

                logger.info(
                    "Fetched local open orders",
                    count=len(order_dict),
                )

                return order_dict

        except Exception as e:
            # If orders table doesn't exist yet, return empty
            if "does not exist" in str(e).lower():
                logger.warning("Orders table does not exist, returning empty")
                return {}
            logger.error("Failed to fetch local orders", error=str(e))
            raise

    async def reconcile(self) -> OrderReconciliationResult:
        """
        Compare broker vs local open orders and return discrepancies.

        Returns:
            OrderReconciliationResult with status and any mismatches
        """
        start_time = time.time()
        timestamp = datetime.utcnow()

        try:
            # Fetch orders from both sources
            broker_orders = await self.fetch_broker_orders()
            local_orders = await self.fetch_local_orders()

            # Compare orders
            mismatches = self._compare_orders(broker_orders, local_orders)

            # Count specific types
            orphaned_broker = len([m for m in mismatches if m.mismatch_type == "orphaned_broker"])
            missing_local = len([m for m in mismatches if m.mismatch_type == "missing_local"])

            # Determine status
            if mismatches:
                status = "mismatch"
                # Require intervention for orphaned or missing orders
                requires_intervention = orphaned_broker > 0 or missing_local > 0
            else:
                status = "matched"
                requires_intervention = False

            execution_time_ms = int((time.time() - start_time) * 1000)

            result = OrderReconciliationResult(
                timestamp=timestamp,
                broker_orders=broker_orders,
                local_orders=local_orders,
                mismatches=mismatches,
                status=status,
                requires_intervention=requires_intervention,
                orphaned_broker_count=orphaned_broker,
                missing_local_count=missing_local,
                execution_time_ms=execution_time_ms,
            )

            logger.info(
                "Order reconciliation completed",
                status=status,
                broker_count=len(broker_orders),
                local_count=len(local_orders),
                mismatch_count=len(mismatches),
                orphaned_broker=orphaned_broker,
                missing_local=missing_local,
                requires_intervention=requires_intervention,
                execution_time_ms=execution_time_ms,
            )

            return result

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            logger.error("Order reconciliation failed", error=str(e))

            return OrderReconciliationResult(
                timestamp=timestamp,
                broker_orders={},
                local_orders={},
                mismatches=[],
                status="error",
                requires_intervention=True,
                execution_time_ms=execution_time_ms,
                error_message=str(e),
            )

    def _compare_orders(
        self,
        broker_orders: Dict[str, dict],
        local_orders: Dict[str, dict],
    ) -> List[OrderMismatch]:
        """
        Compare broker and local orders to find discrepancies.

        Args:
            broker_orders: Orders from broker
            local_orders: Orders from local database

        Returns:
            List of OrderMismatch objects
        """
        mismatches = []

        all_order_ids = set(broker_orders.keys()) | set(local_orders.keys())

        for order_id in all_order_ids:
            broker_order = broker_orders.get(order_id)
            local_order = local_orders.get(order_id)

            if broker_order and not local_order:
                # Order exists in broker but not locally (orphaned)
                mismatches.append(
                    OrderMismatch(
                        order_id=order_id,
                        symbol=broker_order.get("symbol", "UNKNOWN"),
                        mismatch_type="orphaned_broker",
                        broker_value=broker_order,
                        local_value=None,
                        severity="critical",
                        details=f"Order exists in broker ({broker_order['status']}) but not in local database",
                    )
                )

            elif local_order and not broker_order:
                # Order exists locally but not in broker (missing)
                mismatches.append(
                    OrderMismatch(
                        order_id=order_id,
                        symbol=local_order.get("symbol", "UNKNOWN"),
                        mismatch_type="missing_local",
                        broker_value=None,
                        local_value=local_order,
                        severity="critical",
                        details=f"Order exists locally ({local_order['status']}) but not in broker",
                    )
                )

            elif broker_order and local_order:
                # Both exist - compare details

                # Check status
                broker_status = broker_order.get("status")
                local_status = local_order.get("status")

                if broker_status != local_status:
                    mismatches.append(
                        OrderMismatch(
                            order_id=order_id,
                            symbol=broker_order.get("symbol", "UNKNOWN"),
                            mismatch_type="status",
                            broker_value=broker_status,
                            local_value=local_status,
                            severity="warning",
                            details=f"Status mismatch: broker={broker_status}, local={local_status}",
                        )
                    )

                # Check filled quantity
                broker_filled = broker_order.get("filled_quantity", 0)
                local_filled = local_order.get("filled_quantity", 0)

                if abs(broker_filled - local_filled) > self.QUANTITY_TOLERANCE:
                    mismatches.append(
                        OrderMismatch(
                            order_id=order_id,
                            symbol=broker_order.get("symbol", "UNKNOWN"),
                            mismatch_type="fill_quantity",
                            broker_value=broker_filled,
                            local_value=local_filled,
                            severity="critical",
                            details=f"Fill quantity mismatch: broker={broker_filled}, local={local_filled}",
                        )
                    )

                # Check fill price (if filled)
                broker_fill_price = broker_order.get("average_fill_price") or 0
                local_fill_price = local_order.get("average_fill_price") or 0

                if broker_fill_price > 0 and local_fill_price > 0:
                    price_diff_pct = abs(broker_fill_price - local_fill_price) / broker_fill_price
                    if price_diff_pct > self.PRICE_TOLERANCE_PCT:
                        mismatches.append(
                            OrderMismatch(
                                order_id=order_id,
                                symbol=broker_order.get("symbol", "UNKNOWN"),
                                mismatch_type="fill_price",
                                broker_value=broker_fill_price,
                                local_value=local_fill_price,
                                severity="warning",
                                details=f"Fill price differs by {price_diff_pct*100:.2f}%",
                            )
                        )

        return mismatches

    async def handle_mismatch(self, result: OrderReconciliationResult) -> dict:
        """
        Handle order mismatches: send alerts, log to database.

        Note: Unlike position mismatches, order mismatches don't automatically
        trigger the kill switch, but they do send alerts for investigation.

        Args:
            result: OrderReconciliationResult with mismatches

        Returns:
            Dictionary with actions taken
        """
        actions_taken = {
            "kill_switch_triggered": False,
            "alert_sent": False,
            "report_stored": False,
            "errors": [],
        }

        # 1. Trigger kill switch only for many orphaned orders (might indicate system failure)
        if result.orphaned_broker_count >= 3:
            try:
                await self._trigger_kill_switch(result)
                actions_taken["kill_switch_triggered"] = True
                logger.warning("Kill switch triggered due to multiple orphaned orders")
            except Exception as e:
                actions_taken["errors"].append(f"Kill switch failed: {str(e)}")
                logger.error("Failed to trigger kill switch", error=str(e))

        # 2. Send alert
        try:
            await self._send_alert(result)
            actions_taken["alert_sent"] = True
        except Exception as e:
            actions_taken["errors"].append(f"Alert failed: {str(e)}")
            logger.error("Failed to send alert", error=str(e))

        # 3. Store report in database
        try:
            report_id = await self._store_report(result, actions_taken)
            actions_taken["report_stored"] = True
            actions_taken["report_id"] = report_id
        except Exception as e:
            actions_taken["errors"].append(f"Store report failed: {str(e)}")
            logger.error("Failed to store order reconciliation report", error=str(e))

        return actions_taken

    async def _trigger_kill_switch(self, result: OrderReconciliationResult) -> None:
        """Trigger kill switch via risk service."""
        reason = f"Order reconciliation: {result.orphaned_broker_count} orphaned broker orders detected"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.risk_service_url}/api/v1/killswitch/trigger",
                json={
                    "reason": reason,
                    "source": "order_reconciliation",
                    "details": {
                        "orphaned_broker_count": result.orphaned_broker_count,
                        "missing_local_count": result.missing_local_count,
                        "mismatch_count": len(result.mismatches),
                    },
                },
                timeout=10.0,
            )

            if response.status_code != 200:
                raise Exception(f"Kill switch request failed: {response.status_code}")

    async def _send_alert(self, result: OrderReconciliationResult) -> None:
        """Send alert to Discord webhook."""
        if not self.discord_webhook_url:
            logger.info("Discord webhook not configured, skipping alert")
            return

        severity_emoji = ":rotating_light:" if result.requires_intervention else ":warning:"
        status_color = 0xDC3545 if result.requires_intervention else 0xFFC107

        mismatch_details = []
        for m in result.mismatches[:10]:
            mismatch_details.append(
                f"- **{m.symbol}** ({m.order_id[:8]}...): {m.mismatch_type} ({m.severity})"
            )

        embed = {
            "title": f"{severity_emoji} Order Reconciliation Mismatch",
            "color": status_color,
            "timestamp": result.timestamp.isoformat(),
            "fields": [
                {
                    "name": "Status",
                    "value": result.status.upper(),
                    "inline": True,
                },
                {
                    "name": "Orphaned Broker Orders",
                    "value": str(result.orphaned_broker_count),
                    "inline": True,
                },
                {
                    "name": "Missing Local Orders",
                    "value": str(result.missing_local_count),
                    "inline": True,
                },
                {
                    "name": "Details",
                    "value": "\n".join(mismatch_details) if mismatch_details else "None",
                    "inline": False,
                },
            ],
            "footer": {
                "text": f"Execution time: {result.execution_time_ms}ms",
            },
        }

        async with httpx.AsyncClient() as client:
            await client.post(
                self.discord_webhook_url,
                json={"embeds": [embed]},
                timeout=10.0,
            )

    async def _store_report(self, result: OrderReconciliationResult, actions_taken: dict) -> int:
        """Store order reconciliation report in database."""
        action_str = None
        if actions_taken.get("kill_switch_triggered"):
            action_str = "kill_switch_triggered"
        elif actions_taken.get("alert_sent"):
            action_str = "alert_sent"

        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO order_reconciliation_reports (
                    run_at,
                    status,
                    broker_open_order_count,
                    local_open_order_count,
                    orphaned_broker_orders,
                    missing_local_orders,
                    mismatches,
                    action_taken,
                    broker_snapshot,
                    local_snapshot,
                    execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
                """,
                result.timestamp,
                result.status,
                len(result.broker_orders),
                len(result.local_orders),
                result.orphaned_broker_count,
                result.missing_local_count,
                json.dumps([m.to_dict() for m in result.mismatches]),
                action_str,
                json.dumps(result.broker_orders),
                json.dumps(result.local_orders),
                result.execution_time_ms,
            )

            return row["id"]
