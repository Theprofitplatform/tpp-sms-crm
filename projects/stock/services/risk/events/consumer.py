"""
Event Consumer for Risk Service with Deduplication Support.

Provides consumer-side event deduplication to prevent duplicate processing.
Events are checked against the processed_events table before processing,
and results are cached to return identical responses for duplicate events.

CRITICAL: Risk validation must be idempotent - the same order_proposed event
should always return the same validation result. This consumer ensures that
duplicate deliveries don't cause confusion in the order flow.

Use Cases:
    - order_proposed event retried: Return same validation result
    - signal_generated event retried: Return same risk assessment
    - fill_received event retried: Return same position update confirmation

Usage:
    from events import EventConsumer

    consumer = EventConsumer()
    await consumer.initialize()

    @app.post("/api/v1/events/order_proposed")
    async def handle_order_proposed(event: dict):
        return await consumer.process_event(
            event=event,
            handler=validate_order_from_event,
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
SERVICE_NAME = "risk"


class EventConsumerError(Exception):
    """Base exception for event consumer errors."""
    pass


class DuplicateEventError(EventConsumerError):
    """Raised when a duplicate event is detected."""

    def __init__(self, event_id: str, cached_result: Dict[str, Any]):
        self.event_id = event_id
        self.cached_result = cached_result
        super().__init__(f"Event {event_id} was already processed")


class EventConsumer:
    """
    Event consumer with deduplication support for Risk Service.

    Checks processed_events table before processing events to prevent
    duplicate processing. Stores results for replay on retries.

    CRITICAL: For risk validation, consistency is paramount. The same
    order must always receive the same validation result, even on retries.
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
                "Event consumer initialized",
                service=self.service_name,
            )

    async def close(self) -> None:
        """Close database connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info(
                "Event consumer closed",
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

        # Idempotency key is critical for deduplication
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

        IMPORTANT: For risk validation, we must return the SAME result
        for duplicate events to maintain consistency.

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

            logger.info(
                "Event already processed, returning cached validation result",
                event_id=event_id[:16] + "..." if len(event_id) > 16 else event_id,
                idempotency_key=idempotency_key[:16] + "..." if len(idempotency_key) > 16 else idempotency_key,
                service=self.service_name,
                processed_at=row["processed_at"].isoformat(),
                result_status=row["result_status"],
            )

            return {
                "result_status": row["result_status"],
                "result_data": row["result_data"],
                "processed_at": row["processed_at"].isoformat(),
                "is_cached": True,
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
        Mark event as processed to prevent reprocessing.

        Args:
            event_id: Unique event identifier
            idempotency_key: Idempotency key for deduplication
            event_type: Type of event (for analytics)
            result_status: Processing result - 'success', 'failed', or 'skipped'
            result_data: Optional result data to cache (e.g., validation result)
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

        logger.debug(
            "Risk event marked as processed",
            event_id=event_id[:16] + "..." if len(event_id) > 16 else event_id,
            service=self.service_name,
            result_status=result_status,
        )

    async def process_event(
        self,
        event: Dict[str, Any],
        handler: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
        skip_if_processed: bool = True
    ) -> Dict[str, Any]:
        """
        Process event with dedupe check.

        This is the main entry point for processing events. It:
        1. Extracts event identifiers
        2. Checks if event was already processed
        3. If processed: returns cached result
        4. If new: processes event and stores result

        IMPORTANT: For risk validation events, the cached result must be
        returned to maintain consistency - an order that was approved
        must always be approved on retries.

        Args:
            event: Event payload from outbox dispatcher
            handler: Async function to process the event
            skip_if_processed: If True, return cached result for duplicates.
                              If False, raise DuplicateEventError.

        Returns:
            Processing result (either fresh or cached)

        Raises:
            DuplicateEventError: If skip_if_processed is False and event was already processed
        """
        event_id, idempotency_key, event_type = self._extract_event_identifiers(event)

        if not event_id or not idempotency_key:
            logger.warning(
                "Risk event missing identifiers, processing without deduplication",
                event=event,
            )
            # Process without deduplication
            return await handler(event)

        # Check if already processed
        cached = await self.is_already_processed(event_id, idempotency_key)

        if cached is not None:
            if not skip_if_processed:
                raise DuplicateEventError(event_id, cached)

            # Return cached result - CRITICAL for risk consistency
            result_data = cached.get("result_data")
            if isinstance(result_data, str):
                try:
                    result_data = json.loads(result_data)
                except json.JSONDecodeError:
                    pass

            return result_data or {"status": "already_processed", **cached}

        # Process the event
        try:
            result = await handler(event)
            result_status = "success"

            # Check if validation passed/failed
            if isinstance(result, dict):
                if result.get("skipped"):
                    result_status = "skipped"
                elif not result.get("passed", True):
                    # Validation rejected - still success from processing perspective
                    result_status = "success"

        except Exception as e:
            logger.error(
                "Risk event processing failed",
                event_id=event_id,
                event_type=event_type,
                error=str(e),
            )
            # Mark as failed - allows retry with same idempotency key
            await self.mark_processed(
                event_id=event_id,
                idempotency_key=idempotency_key,
                event_type=event_type,
                result_status="failed",
                result_data={"error": str(e)},
            )
            raise

        # Mark as processed with result
        await self.mark_processed(
            event_id=event_id,
            idempotency_key=idempotency_key,
            event_type=event_type,
            result_status=result_status,
            result_data=result,
        )

        return result

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

            return stats

    async def cleanup_old_events(self, retention_days: int = 7) -> int:
        """
        Remove old processed events.

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
                    "Cleaned up old risk processed events",
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

    Usage:
        @with_deduplication()
        async def handle_order_proposed(event: dict) -> dict:
            # Validate order
            return {"passed": True, "checks": [...]}

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
