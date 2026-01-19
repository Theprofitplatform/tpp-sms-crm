"""
Event Consumer for Execution Service with Deduplication Support.

Provides consumer-side event deduplication to prevent duplicate order execution.
Events are checked against the processed_events table before processing,
and results are cached to return identical responses for duplicate events.

CRITICAL SAFETY: This is the most important deduplication layer in the system.
Duplicate order_approved events MUST NOT result in duplicate orders being placed.
This consumer ensures at-most-once order execution semantics.

Use Cases:
    - order_approved event retried: Return same order ID, don't create new order
    - fill_received event retried: Return same fill acknowledgment
    - position_update event retried: Return same position state

Usage:
    from events import EventConsumer

    consumer = EventConsumer()
    await consumer.initialize()

    @app.post("/api/v1/events/order_approved")
    async def handle_order_approved(event: dict):
        return await consumer.process_event(
            event=event,
            handler=execute_approved_order,
        )

Dependencies:
    - asyncpg
    - structlog
"""

import os
import json
from typing import Optional, Dict, Any, Callable, Awaitable
from datetime import datetime

import asyncpg
import structlog

logger = structlog.get_logger(__name__)

# Database URL
DATABASE_URL = os.getenv(
    'TIMESCALEDB_URL',
    'postgresql://stock_user:stock_pass@localhost:5432/stock_db'
)

# Service identifier
SERVICE_NAME = "execution"


class EventConsumerError(Exception):
    """Base exception for event consumer errors."""
    pass


class DuplicateEventError(EventConsumerError):
    """Raised when a duplicate event is detected."""

    def __init__(self, event_id: str, cached_result: Dict[str, Any]):
        self.event_id = event_id
        self.cached_result = cached_result
        super().__init__(f"Event {event_id} was already processed")


class DuplicateOrderError(EventConsumerError):
    """Raised when attempting to execute a duplicate order."""

    def __init__(self, event_id: str, order_id: str):
        self.event_id = event_id
        self.order_id = order_id
        super().__init__(f"Order already executed for event {event_id}: {order_id}")


class EventConsumer:
    """
    Event consumer with deduplication support for Execution Service.

    CRITICAL: This is the safety net that prevents duplicate orders.
    Even if the OPS dispatcher retries an order_approved event multiple
    times, only ONE order will be placed.

    The flow is:
    1. order_approved event arrives
    2. Check processed_events - if found, return cached order
    3. If new, execute order and store result
    4. On retry, step 2 returns cached order - NO DUPLICATE ORDER
    """

    def __init__(self, service_name: str = SERVICE_NAME):
        """
        Initialize event consumer.

        Args:
            service_name: Name of the consuming service (for logging and DB queries)
        """
        self.service_name = service_name
        self._pool: Optional[asyncpg.Pool] = None

    async def initialize(self) -> None:
        """Initialize database connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=5,
                command_timeout=30,
            )
            logger.info(
                "Execution event consumer initialized",
                service=self.service_name,
            )

    async def close(self) -> None:
        """Close database connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info(
                "Execution event consumer closed",
                service=self.service_name,
            )

    async def get_pool(self) -> asyncpg.Pool:
        """Get or create database connection pool."""
        if self._pool is None:
            await self.initialize()
        return self._pool

    def _extract_event_identifiers(self, event: Dict[str, Any]) -> tuple:
        """
        Extract event_id and idempotency_key from event payload.

        Args:
            event: Event payload from outbox dispatcher

        Returns:
            Tuple of (event_id, idempotency_key, event_type)
        """
        # Event ID can come from different fields depending on source
        event_id = (
            event.get("event_id") or
            event.get("id") or
            str(event.get("payload", {}).get("id", ""))
        )

        # Idempotency key is CRITICAL for preventing duplicate orders
        idempotency_key = (
            event.get("idempotency_key") or
            event.get("payload", {}).get("idempotency_key") or
            event_id
        )

        # Event type for logging and analytics
        event_type = (
            event.get("event_type") or
            event.get("type") or
            "unknown"
        )

        return event_id, idempotency_key, event_type

    async def is_already_processed(
        self,
        event_id: str,
        idempotency_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if event was already processed.

        CRITICAL: For order execution, this check MUST succeed to prevent
        duplicate orders. If an order was already placed, we MUST return
        the original order details.

        Args:
            event_id: Unique event identifier
            idempotency_key: Idempotency key for deduplication

        Returns:
            Cached result if already processed, None otherwise
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT result_status, result_data, processed_at
                FROM processed_events
                WHERE (event_id = $1 OR (idempotency_key = $2 AND service = $3))
                LIMIT 1
                """,
                event_id,
                idempotency_key,
                self.service_name,
            )

            if row is None:
                return None

            # Parse result_data if it's a string
            result_data = row["result_data"]
            if isinstance(result_data, str):
                try:
                    result_data = json.loads(result_data)
                except json.JSONDecodeError:
                    pass

            order_id = None
            if isinstance(result_data, dict):
                order_id = result_data.get("id") or result_data.get("order_id")

            logger.warning(
                "DUPLICATE ORDER EVENT DETECTED - returning cached order",
                event_id=event_id[:16] + "..." if len(event_id) > 16 else event_id,
                idempotency_key=idempotency_key[:16] + "..." if len(idempotency_key) > 16 else idempotency_key,
                cached_order_id=order_id,
                processed_at=row["processed_at"].isoformat(),
            )

            return {
                "result_status": row["result_status"],
                "result_data": result_data,
                "processed_at": row["processed_at"].isoformat(),
                "is_cached": True,
                "order_id": order_id,
            }

    async def mark_processed(
        self,
        event_id: str,
        idempotency_key: str,
        event_type: str,
        result_status: str,
        result_data: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Mark event as processed to prevent duplicate execution.

        CRITICAL: This must be called AFTER successful order placement
        but BEFORE returning to the caller. If this fails, we risk
        duplicate orders on retry.

        Args:
            event_id: Unique event identifier
            idempotency_key: Idempotency key for deduplication
            event_type: Type of event (for analytics)
            result_status: Processing result - 'success', 'failed', or 'skipped'
            result_data: Order result data to cache
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO processed_events
                    (event_id, idempotency_key, service, event_type, result_status, result_data)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (idempotency_key, service) DO UPDATE SET
                    result_status = EXCLUDED.result_status,
                    result_data = EXCLUDED.result_data,
                    processed_at = NOW()
                """,
                event_id,
                idempotency_key,
                self.service_name,
                event_type,
                result_status,
                json.dumps(result_data) if result_data else None,
            )

        order_id = result_data.get("id") if result_data else None
        logger.info(
            "Execution event marked as processed",
            event_id=event_id[:16] + "..." if len(event_id) > 16 else event_id,
            order_id=order_id,
            result_status=result_status,
        )

    async def process_event(
        self,
        event: Dict[str, Any],
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
        skip_if_processed: bool = True
    ) -> Dict[str, Any]:
        """
        Process event with dedupe check - CRITICAL for order safety.

        This is the main entry point for processing events. It:
        1. Extracts event identifiers
        2. Checks if event was already processed
        3. If processed: returns cached ORDER (not a new one!)
        4. If new: executes order and stores result

        CRITICAL SAFETY: For order_approved events, if we find a cached
        result, we MUST return it instead of creating a new order.
        This is the last line of defense against duplicate orders.

        Args:
            event: Event payload from outbox dispatcher
            handler: Async function to process the event (execute order)
            skip_if_processed: If True, return cached result for duplicates.
                              If False, raise DuplicateOrderError.

        Returns:
            Order execution result (either fresh or cached)

        Raises:
            DuplicateOrderError: If skip_if_processed is False and event was already processed
        """
        event_id, idempotency_key, event_type = self._extract_event_identifiers(event)

        if not event_id or not idempotency_key:
            logger.error(
                "CRITICAL: Execution event missing identifiers - cannot ensure safety",
                event=event,
            )
            # For execution, we should REFUSE to process without identifiers
            raise EventConsumerError(
                "Cannot process execution event without identifiers - safety risk"
            )

        # CRITICAL: Check if already processed
        cached = await self.is_already_processed(event_id, idempotency_key)

        if cached is not None:
            if not skip_if_processed:
                raise DuplicateOrderError(event_id, cached.get("order_id", "unknown"))

            # Return cached order - DO NOT CREATE NEW ORDER
            return cached.get("result_data") or {"status": "already_executed", **cached}

        # Process the event (execute order)
        try:
            result = await handler(event)
            result_status = "success"

            # Check if execution was skipped
            if isinstance(result, dict) and result.get("skipped"):
                result_status = "skipped"

        except Exception as e:
            logger.error(
                "Order execution failed",
                event_id=event_id,
                event_type=event_type,
                error=str(e),
            )
            # Mark as failed - allows investigation but prevents retry from causing issues
            await self.mark_processed(
                event_id=event_id,
                idempotency_key=idempotency_key,
                event_type=event_type,
                result_status="failed",
                result_data={"error": str(e)},
            )
            raise

        # CRITICAL: Mark as processed with order details
        await self.mark_processed(
            event_id=event_id,
            idempotency_key=idempotency_key,
            event_type=event_type,
            result_status=result_status,
            result_data=result,
        )

        return result

    async def get_order_by_event(
        self,
        event_id: str,
        idempotency_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get order details by event identifiers.

        Useful for checking if an order was already placed for this event.

        Args:
            event_id: Event identifier
            idempotency_key: Idempotency key

        Returns:
            Order details if found, None otherwise
        """
        cached = await self.is_already_processed(event_id, idempotency_key)
        if cached and cached.get("result_status") == "success":
            return cached.get("result_data")
        return None

    async def get_processing_stats(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get event processing statistics.

        Args:
            hours: Number of hours to look back (default 24)

        Returns:
            Statistics dictionary with counts by status and event type
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    event_type,
                    result_status,
                    COUNT(*) as count
                FROM processed_events
                WHERE service = $1
                  AND processed_at >= NOW() - ($2 || ' hours')::INTERVAL
                GROUP BY event_type, result_status
                ORDER BY event_type, result_status
                """,
                self.service_name,
                str(hours),
            )

            stats = {
                "service": self.service_name,
                "period_hours": hours,
                "total": 0,
                "by_status": {"success": 0, "failed": 0, "skipped": 0},
                "by_event_type": {},
                "orders_executed": 0,
                "duplicate_events_prevented": 0,
            }

            for row in rows:
                event_type = row["event_type"]
                status = row["result_status"]
                count = row["count"]

                stats["total"] += count
                stats["by_status"][status] = stats["by_status"].get(status, 0) + count

                if event_type not in stats["by_event_type"]:
                    stats["by_event_type"][event_type] = {"total": 0}

                stats["by_event_type"][event_type]["total"] += count
                stats["by_event_type"][event_type][status] = count

                # Track successful order executions
                if event_type == "order_approved" and status == "success":
                    stats["orders_executed"] = count

            return stats

    async def cleanup_old_events(self, retention_days: int = 7) -> int:
        """
        Remove old processed events.

        Note: For execution service, consider keeping records longer
        for audit trail purposes.

        Args:
            retention_days: Number of days to retain events (default 7)

        Returns:
            Number of deleted events
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM processed_events
                WHERE service = $1
                  AND processed_at < NOW() - ($2 || ' days')::INTERVAL
                """,
                self.service_name,
                str(retention_days),
            )

            # Extract count from result like "DELETE 5"
            count = int(result.split()[-1]) if result else 0

            if count > 0:
                logger.info(
                    "Cleaned up old execution processed events",
                    service=self.service_name,
                    deleted_count=count,
                    retention_days=retention_days,
                )

            return count


# =============================================================================
# Singleton and Factory
# =============================================================================

_consumer: Optional[EventConsumer] = None


def get_event_consumer() -> EventConsumer:
    """Get or create the global event consumer."""
    global _consumer
    if _consumer is None:
        _consumer = EventConsumer(service_name=SERVICE_NAME)
    return _consumer


async def initialize_event_consumer() -> EventConsumer:
    """Initialize and return the global event consumer."""
    consumer = get_event_consumer()
    await consumer.initialize()
    return consumer


# =============================================================================
# Decorator for Event Handlers
# =============================================================================

def with_deduplication(
    consumer: Optional[EventConsumer] = None,
    skip_if_processed: bool = True
):
    """
    Decorator to add deduplication to event handlers.

    CRITICAL: For order execution handlers, always use this decorator
    to prevent duplicate orders.

    Usage:
        @with_deduplication()
        async def handle_order_approved(event: dict) -> dict:
            # Execute order
            return {"id": "order-123", "status": "FILLED", ...}

    Args:
        consumer: EventConsumer instance (uses global if not provided)
        skip_if_processed: Return cached result if event was already processed
    """
    def decorator(func: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]]):
        async def wrapper(event: Dict[str, Any]) -> Dict[str, Any]:
            nonlocal consumer
            if consumer is None:
                consumer = get_event_consumer()
                if consumer._pool is None:
                    await consumer.initialize()

            return await consumer.process_event(
                event=event,
                handler=func,
                skip_if_processed=skip_if_processed,
            )

        return wrapper

    return decorator
