"""
Position Reconciler - Stock Trading Automation System

Compares broker positions vs local positions and handles mismatches.

CRITICAL: Any mismatch between broker and local positions is a serious
issue that could indicate:
    - Bug in execution tracking
    - Network failure during order processing
    - Broker API issues
    - Data corruption

Safety Protocol:
    1. On critical mismatch (quantity differs) -> Trigger kill switch
    2. On any mismatch -> Send alert to Discord/email
    3. Log full details to decision_log
    4. Store reconciliation report for audit

Usage:
    reconciler = PositionReconciler(broker, db_pool, risk_service_url)
    result = await reconciler.reconcile()

    if result.requires_intervention:
        await reconciler.handle_mismatch(result)
"""

import os
import time
import json
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Any, Optional, Literal

import httpx
import structlog

# Import distributed kill switch (optional - may not be available in all contexts)
try:
    from kill_switch import get_kill_switch, DistributedKillSwitch
    HAS_KILL_SWITCH = True
except ImportError:
    HAS_KILL_SWITCH = False

logger = structlog.get_logger(__name__)


@dataclass
class PositionMismatch:
    """Details of a position mismatch between broker and local."""

    symbol: str
    mismatch_type: Literal["quantity", "missing_local", "missing_broker", "price", "side"]
    broker_value: Any
    local_value: Any
    severity: Literal["warning", "critical"]
    details: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class ReconciliationResult:
    """Result of position reconciliation."""

    timestamp: datetime
    broker_positions: Dict[str, dict]
    local_positions: Dict[str, dict]
    mismatches: List[PositionMismatch]
    status: Literal["matched", "mismatch", "error"]
    requires_intervention: bool
    execution_time_ms: int = 0
    error_message: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "broker_positions": self.broker_positions,
            "local_positions": self.local_positions,
            "mismatches": [m.to_dict() for m in self.mismatches],
            "status": self.status,
            "requires_intervention": self.requires_intervention,
            "execution_time_ms": self.execution_time_ms,
            "error_message": self.error_message,
        }


class PositionReconciler:
    """
    Reconciles broker positions vs local positions.

    Compares positions from the broker (paper or live) with positions
    tracked locally in the database, identifying any discrepancies.
    """

    # Price tolerance for floating point comparison (0.1%)
    PRICE_TOLERANCE_PCT = 0.001

    # Quantity tolerance (should match exactly for stocks, small tolerance for crypto)
    QUANTITY_TOLERANCE = 0.00001

    def __init__(
        self,
        broker,
        db_pool,
        risk_service_url: str = None,
        discord_webhook_url: str = None,
    ):
        """
        Initialize position reconciler.

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

    async def fetch_broker_positions(self) -> Dict[str, dict]:
        """
        Fetch current positions from broker (paper or live).

        Returns:
            Dictionary of positions keyed by symbol
        """
        try:
            positions = self.broker.get_positions()

            # Convert to dict keyed by symbol
            position_dict = {}
            for pos in positions:
                symbol = pos.get("symbol")
                if symbol:
                    position_dict[symbol] = {
                        "symbol": symbol,
                        "market": pos.get("market", "US"),
                        "side": pos.get("side", "LONG"),
                        "quantity": float(pos.get("quantity", 0)),
                        "average_entry_price": float(pos.get("average_entry_price", 0)),
                        "current_price": float(pos.get("current_price", 0)) if pos.get("current_price") else None,
                        "unrealized_pnl": float(pos.get("unrealized_pnl", 0)) if pos.get("unrealized_pnl") else None,
                    }

            logger.info(
                "Fetched broker positions",
                count=len(position_dict),
                symbols=list(position_dict.keys()),
            )

            return position_dict

        except Exception as e:
            logger.error("Failed to fetch broker positions", error=str(e))
            raise

    async def fetch_local_positions(self) -> Dict[str, dict]:
        """
        Fetch positions from local database.

        Returns:
            Dictionary of positions keyed by symbol
        """
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT
                        symbol,
                        market,
                        side,
                        quantity,
                        average_entry_price,
                        current_price,
                        unrealized_pnl
                    FROM positions
                    WHERE quantity > 0
                    ORDER BY symbol
                    """
                )

                position_dict = {}
                for row in rows:
                    symbol = row["symbol"]
                    position_dict[symbol] = {
                        "symbol": symbol,
                        "market": row["market"],
                        "side": row["side"],
                        "quantity": float(row["quantity"]),
                        "average_entry_price": float(row["average_entry_price"]),
                        "current_price": float(row["current_price"]) if row["current_price"] else None,
                        "unrealized_pnl": float(row["unrealized_pnl"]) if row["unrealized_pnl"] else None,
                    }

                logger.info(
                    "Fetched local positions",
                    count=len(position_dict),
                    symbols=list(position_dict.keys()),
                )

                return position_dict

        except Exception as e:
            # If positions table doesn't exist yet, return empty
            if "does not exist" in str(e).lower():
                logger.warning("Positions table does not exist, returning empty")
                return {}
            logger.error("Failed to fetch local positions", error=str(e))
            raise

    async def reconcile(self) -> ReconciliationResult:
        """
        Compare broker vs local positions and return discrepancies.

        Returns:
            ReconciliationResult with status and any mismatches
        """
        start_time = time.time()
        timestamp = datetime.utcnow()

        try:
            # Fetch positions from both sources
            broker_positions = await self.fetch_broker_positions()
            local_positions = await self.fetch_local_positions()

            # Compare positions
            mismatches = self._compare_positions(broker_positions, local_positions)

            # Determine status
            if mismatches:
                status = "mismatch"
                requires_intervention = any(m.severity == "critical" for m in mismatches)
            else:
                status = "matched"
                requires_intervention = False

            execution_time_ms = int((time.time() - start_time) * 1000)

            result = ReconciliationResult(
                timestamp=timestamp,
                broker_positions=broker_positions,
                local_positions=local_positions,
                mismatches=mismatches,
                status=status,
                requires_intervention=requires_intervention,
                execution_time_ms=execution_time_ms,
            )

            logger.info(
                "Reconciliation completed",
                status=status,
                broker_count=len(broker_positions),
                local_count=len(local_positions),
                mismatch_count=len(mismatches),
                requires_intervention=requires_intervention,
                execution_time_ms=execution_time_ms,
            )

            return result

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            logger.error("Reconciliation failed", error=str(e))

            return ReconciliationResult(
                timestamp=timestamp,
                broker_positions={},
                local_positions={},
                mismatches=[],
                status="error",
                requires_intervention=True,
                execution_time_ms=execution_time_ms,
                error_message=str(e),
            )

    def _compare_positions(
        self,
        broker_positions: Dict[str, dict],
        local_positions: Dict[str, dict],
    ) -> List[PositionMismatch]:
        """
        Compare broker and local positions to find discrepancies.

        Args:
            broker_positions: Positions from broker
            local_positions: Positions from local database

        Returns:
            List of PositionMismatch objects
        """
        mismatches = []

        all_symbols = set(broker_positions.keys()) | set(local_positions.keys())

        for symbol in all_symbols:
            broker_pos = broker_positions.get(symbol)
            local_pos = local_positions.get(symbol)

            if broker_pos and not local_pos:
                # Position exists in broker but not locally
                mismatches.append(
                    PositionMismatch(
                        symbol=symbol,
                        mismatch_type="missing_local",
                        broker_value=broker_pos,
                        local_value=None,
                        severity="critical",
                        details=f"Position exists in broker ({broker_pos['quantity']} shares) but not in local database",
                    )
                )

            elif local_pos and not broker_pos:
                # Position exists locally but not in broker
                mismatches.append(
                    PositionMismatch(
                        symbol=symbol,
                        mismatch_type="missing_broker",
                        broker_value=None,
                        local_value=local_pos,
                        severity="critical",
                        details=f"Position exists locally ({local_pos['quantity']} shares) but not in broker",
                    )
                )

            elif broker_pos and local_pos:
                # Both exist - compare details
                # Check quantity
                broker_qty = broker_pos["quantity"]
                local_qty = local_pos["quantity"]

                if abs(broker_qty - local_qty) > self.QUANTITY_TOLERANCE:
                    mismatches.append(
                        PositionMismatch(
                            symbol=symbol,
                            mismatch_type="quantity",
                            broker_value=broker_qty,
                            local_value=local_qty,
                            severity="critical",
                            details=f"Quantity mismatch: broker={broker_qty}, local={local_qty}",
                        )
                    )

                # Check side
                broker_side = broker_pos.get("side", "LONG")
                local_side = local_pos.get("side", "LONG")

                if broker_side != local_side:
                    mismatches.append(
                        PositionMismatch(
                            symbol=symbol,
                            mismatch_type="side",
                            broker_value=broker_side,
                            local_value=local_side,
                            severity="critical",
                            details=f"Side mismatch: broker={broker_side}, local={local_side}",
                        )
                    )

                # Check entry price (warning only, may differ due to timing)
                broker_price = broker_pos.get("average_entry_price", 0)
                local_price = local_pos.get("average_entry_price", 0)

                if broker_price > 0 and local_price > 0:
                    price_diff_pct = abs(broker_price - local_price) / broker_price
                    if price_diff_pct > self.PRICE_TOLERANCE_PCT:
                        mismatches.append(
                            PositionMismatch(
                                symbol=symbol,
                                mismatch_type="price",
                                broker_value=broker_price,
                                local_value=local_price,
                                severity="warning",
                                details=f"Entry price differs by {price_diff_pct*100:.2f}%",
                            )
                        )

        return mismatches

    async def handle_mismatch(self, result: ReconciliationResult) -> dict:
        """
        Handle mismatches: trigger kill switch, send alerts, log to database.

        Args:
            result: ReconciliationResult with mismatches

        Returns:
            Dictionary with actions taken
        """
        actions_taken = {
            "kill_switch_triggered": False,
            "alert_sent": False,
            "report_stored": False,
            "errors": [],
        }

        # 1. Trigger kill switch if required
        if result.requires_intervention:
            try:
                await self._trigger_kill_switch(result)
                actions_taken["kill_switch_triggered"] = True
                logger.warning("Kill switch triggered due to reconciliation mismatch")
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
            logger.error("Failed to store reconciliation report", error=str(e))

        return actions_taken

    async def _trigger_kill_switch(self, result: ReconciliationResult) -> None:
        """Trigger kill switch via distributed Redis and/or risk service."""
        reason = f"Reconciliation mismatch detected: {len(result.mismatches)} discrepancies found"

        if result.mismatches:
            critical = [m for m in result.mismatches if m.severity == "critical"]
            reason += f" ({len(critical)} critical)"

        details = {
            "mismatch_count": len(result.mismatches),
            "critical_count": len([m for m in result.mismatches if m.severity == "critical"]),
            "symbols": [m.symbol for m in result.mismatches],
        }

        # Try distributed kill switch first (directly via Redis)
        if HAS_KILL_SWITCH:
            try:
                kill_switch = get_kill_switch(service_name="execution-service:reconciler")
                await kill_switch.trigger(
                    reason=reason,
                    triggered_by="reconciliation",
                    details=details,
                )
                logger.info("Kill switch triggered via Redis")
                return
            except Exception as e:
                logger.error("Failed to trigger kill switch via Redis", error=str(e))

        # Fallback: trigger via risk service API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.risk_service_url}/api/v1/killswitch/trigger",
                json={
                    "reason": reason,
                    "source": "reconciliation",
                    "details": details,
                },
                timeout=10.0,
            )

            if response.status_code != 200:
                raise Exception(f"Kill switch request failed: {response.status_code}")

    async def _send_alert(self, result: ReconciliationResult) -> None:
        """Send alert to Discord webhook."""
        if not self.discord_webhook_url:
            logger.info("Discord webhook not configured, skipping alert")
            return

        # Build alert message
        severity_emoji = ":rotating_light:" if result.requires_intervention else ":warning:"
        status_color = 0xDC3545 if result.requires_intervention else 0xFFC107

        mismatch_details = []
        for m in result.mismatches[:10]:  # Limit to 10
            mismatch_details.append(
                f"- **{m.symbol}**: {m.mismatch_type} ({m.severity})\n  "
                f"Broker: `{m.broker_value}` | Local: `{m.local_value}`"
            )

        embed = {
            "title": f"{severity_emoji} Reconciliation Mismatch Detected",
            "color": status_color,
            "timestamp": result.timestamp.isoformat(),
            "fields": [
                {
                    "name": "Status",
                    "value": result.status.upper(),
                    "inline": True,
                },
                {
                    "name": "Mismatches",
                    "value": str(len(result.mismatches)),
                    "inline": True,
                },
                {
                    "name": "Requires Intervention",
                    "value": "YES" if result.requires_intervention else "No",
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

    async def _store_report(self, result: ReconciliationResult, actions_taken: dict) -> int:
        """Store reconciliation report in database."""
        action_str = None
        if actions_taken.get("kill_switch_triggered"):
            action_str = "kill_switch_triggered"
        elif actions_taken.get("alert_sent"):
            action_str = "alert_sent"

        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO reconciliation_reports (
                    run_at,
                    status,
                    broker_position_count,
                    local_position_count,
                    mismatch_count,
                    mismatches,
                    action_taken,
                    broker_snapshot,
                    local_snapshot,
                    execution_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
                """,
                result.timestamp,
                result.status,
                len(result.broker_positions),
                len(result.local_positions),
                len(result.mismatches),
                json.dumps([m.to_dict() for m in result.mismatches]),
                action_str,
                json.dumps(result.broker_positions),
                json.dumps(result.local_positions),
                result.execution_time_ms,
            )

            return row["id"]

    async def get_last_result(self) -> Optional[dict]:
        """Get the most recent reconciliation result."""
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT * FROM reconciliation_reports
                ORDER BY run_at DESC
                LIMIT 1
                """
            )

            if row:
                return dict(row)
            return None

    async def get_history(self, limit: int = 50) -> List[dict]:
        """Get recent reconciliation history."""
        async with self.db_pool.acquire() as conn:
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

            return [dict(row) for row in rows]

    async def resolve_mismatch(
        self,
        report_id: int,
        resolved_by: str,
        notes: str = None,
    ) -> bool:
        """Mark a reconciliation mismatch as resolved."""
        async with self.db_pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE reconciliation_reports
                SET resolved_at = NOW(),
                    resolved_by = $1,
                    notes = $2
                WHERE id = $3 AND resolved_at IS NULL
                """,
                resolved_by,
                notes,
                report_id,
            )

            return result.endswith("1")
