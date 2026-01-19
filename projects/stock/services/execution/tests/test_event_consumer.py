"""
Tests for Execution Service event consumer with deduplication.

CRITICAL: These tests verify the safety layer that prevents duplicate orders.
The event consumer must:
1. Detect duplicate order_approved events
2. Return cached order details instead of creating new orders
3. Never allow the same event to create two orders

Tests cover:
- Duplicate order prevention
- Cached order return on retry
- New order processing
- Error handling
- Statistics and cleanup
"""

import pytest
import uuid
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Mock asyncpg before importing the module
import sys
sys.modules['asyncpg'] = MagicMock()

from events.consumer import (
    EventConsumer,
    DuplicateEventError,
    DuplicateOrderError,
    EventConsumerError,
    get_event_consumer,
    with_deduplication,
)


class MockAsyncpgConnection:
    """Mock asyncpg connection for testing."""

    def __init__(self, rows=None):
        self.rows = rows or {}
        self.executed = []
        self.fetched = []

    async def fetchrow(self, query, *args):
        key = args[0] if args else None
        idem_key = args[1] if len(args) > 1 else None

        self.fetched.append((query, args))

        # Check by event_id or idempotency_key
        result = self.rows.get(key) or self.rows.get(idem_key)
        return result

    async def fetch(self, query, *args):
        self.fetched.append((query, args))
        return list(self.rows.values()) if self.rows else []

    async def execute(self, query, *args):
        self.executed.append((query, args))
        return "DELETE 1"

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


class MockAsyncpgPool:
    """Mock asyncpg pool for testing."""

    def __init__(self, connection=None):
        self.connection = connection or MockAsyncpgConnection()

    def acquire(self):
        return self.connection

    async def close(self):
        pass


class TestExecutionEventConsumer:
    """Tests for Execution Service EventConsumer."""

    def test_service_name_is_execution(self):
        """Test that consumer is initialized with 'execution' service name."""
        consumer = EventConsumer()
        assert consumer.service_name == "execution"

    @pytest.mark.asyncio
    async def test_duplicate_order_event_returns_cached_order(self):
        """Test that duplicate order events return the original order."""
        consumer = EventConsumer(service_name="execution")

        # Original order that was created
        original_order = {
            "id": "order-123",
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "status": "FILLED",
            "average_fill_price": 150.25,
        }
        mock_row = {
            "result_status": "success",
            "result_data": original_order,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"order-idem-123": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        # Handler that would create a NEW order
        handler = AsyncMock(return_value={
            "id": "order-NEW",
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "status": "SUBMITTED",
        })

        event = {
            "event_id": "evt-123",
            "idempotency_key": "order-idem-123",
            "event_type": "order_approved",
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
        }

        result = await consumer.process_event(event, handler)

        # CRITICAL: Handler must NOT be called - no new order
        handler.assert_not_called()

        # CRITICAL: Must return ORIGINAL order
        assert result["id"] == "order-123"
        assert result["status"] == "FILLED"

    @pytest.mark.asyncio
    async def test_new_order_event_executes_order(self):
        """Test that new order events are executed."""
        consumer = EventConsumer(service_name="execution")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        new_order = {
            "id": "new-order-456",
            "symbol": "MSFT",
            "side": "BUY",
            "quantity": 50,
            "status": "SUBMITTED",
        }
        handler = AsyncMock(return_value=new_order)

        event = {
            "event_id": "new-evt",
            "idempotency_key": "new-idem",
            "event_type": "order_approved",
            "symbol": "MSFT",
            "side": "BUY",
            "quantity": 50,
        }

        result = await consumer.process_event(event, handler)

        # Handler should be called for new order
        handler.assert_called_once()

        # Should return the new order
        assert result["id"] == "new-order-456"

        # Should be stored
        assert len(mock_conn.executed) > 0

    @pytest.mark.asyncio
    async def test_missing_identifiers_raises_error(self):
        """Test that events without identifiers are rejected for safety."""
        consumer = EventConsumer(service_name="execution")

        handler = AsyncMock()

        # Event without identifiers
        event = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
        }

        with pytest.raises(EventConsumerError) as exc_info:
            await consumer.process_event(event, handler)

        assert "identifiers" in str(exc_info.value).lower()
        handler.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_order_by_event(self):
        """Test looking up order by event idempotency key."""
        consumer = EventConsumer(service_name="execution")

        order = {
            "id": "order-lookup",
            "symbol": "GOOGL",
            "status": "FILLED",
        }
        mock_row = {
            "result_status": "success",
            "result_data": order,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"lookup-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        result = await consumer.get_order_by_event("evt-lookup", "lookup-key")

        assert result is not None
        assert result["id"] == "order-lookup"

    @pytest.mark.asyncio
    async def test_get_order_by_event_returns_none_for_failed(self):
        """Test that failed events don't return order details."""
        consumer = EventConsumer(service_name="execution")

        mock_row = {
            "result_status": "failed",
            "result_data": {"error": "Connection timeout"},
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"failed-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        result = await consumer.get_order_by_event("evt-failed", "failed-key")

        assert result is None


class TestDuplicateOrderPrevention:
    """Tests focused on preventing duplicate orders."""

    @pytest.mark.asyncio
    async def test_three_retries_same_order(self):
        """Test that three retries of the same event produce one order."""
        consumer = EventConsumer(service_name="execution")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        order_count = 0
        order_ids = []

        async def execute_order(event):
            nonlocal order_count
            order_count += 1
            order_id = f"order-{order_count}"
            order_ids.append(order_id)
            return {
                "id": order_id,
                "symbol": event["symbol"],
                "status": "FILLED",
            }

        event = {
            "event_id": "retry-evt",
            "idempotency_key": "retry-idem",
            "event_type": "order_approved",
            "symbol": "NVDA",
            "side": "BUY",
            "quantity": 25,
        }

        # First call - creates order
        result1 = await consumer.process_event(event, execute_order)
        assert result1["id"] == "order-1"
        assert order_count == 1

        # Simulate cached result for subsequent calls
        mock_conn.rows["retry-idem"] = {
            "result_status": "success",
            "result_data": result1,
            "processed_at": datetime.utcnow(),
        }

        # Second call - should return cached
        result2 = await consumer.process_event(event, execute_order)
        assert result2["id"] == "order-1"  # Same order
        assert order_count == 1  # No new order

        # Third call - should return cached
        result3 = await consumer.process_event(event, execute_order)
        assert result3["id"] == "order-1"  # Same order
        assert order_count == 1  # Still no new order

        # CRITICAL: Only ONE order was created
        assert len(order_ids) == 1

    @pytest.mark.asyncio
    async def test_different_events_create_different_orders(self):
        """Test that different events create separate orders."""
        consumer = EventConsumer(service_name="execution")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        order_count = 0

        async def execute_order(event):
            nonlocal order_count
            order_count += 1
            return {
                "id": f"order-{order_count}",
                "symbol": event["symbol"],
                "status": "FILLED",
            }

        # First event
        event1 = {
            "event_id": "evt-1",
            "idempotency_key": "idem-1",
            "event_type": "order_approved",
            "symbol": "AAPL",
            "quantity": 100,
        }
        result1 = await consumer.process_event(event1, execute_order)

        # Second event - different idempotency key
        event2 = {
            "event_id": "evt-2",
            "idempotency_key": "idem-2",
            "event_type": "order_approved",
            "symbol": "MSFT",
            "quantity": 50,
        }
        result2 = await consumer.process_event(event2, execute_order)

        # Should create TWO different orders
        assert order_count == 2
        assert result1["id"] == "order-1"
        assert result2["id"] == "order-2"

    @pytest.mark.asyncio
    async def test_raise_duplicate_order_error_when_requested(self):
        """Test that DuplicateOrderError is raised when skip_if_processed=False."""
        consumer = EventConsumer(service_name="execution")

        cached_order = {
            "id": "existing-order",
            "symbol": "TSLA",
            "status": "FILLED",
        }
        mock_row = {
            "result_status": "success",
            "result_data": cached_order,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"dup-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock()

        event = {
            "event_id": "dup-evt",
            "idempotency_key": "dup-key",
            "event_type": "order_approved",
        }

        with pytest.raises(DuplicateOrderError) as exc_info:
            await consumer.process_event(event, handler, skip_if_processed=False)

        assert exc_info.value.order_id == "existing-order"
        handler.assert_not_called()


class TestExecutionErrorHandling:
    """Tests for error handling during order execution."""

    @pytest.mark.asyncio
    async def test_execution_failure_is_stored(self):
        """Test that execution failures are stored to prevent retry loops."""
        consumer = EventConsumer(service_name="execution")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock(side_effect=ConnectionError("Broker unreachable"))

        event = {
            "event_id": "fail-evt",
            "idempotency_key": "fail-idem",
            "event_type": "order_approved",
            "symbol": "AAPL",
        }

        with pytest.raises(ConnectionError):
            await consumer.process_event(event, handler)

        # Failure should be stored
        assert len(mock_conn.executed) > 0
        query, args = mock_conn.executed[0]
        assert "failed" in args

    @pytest.mark.asyncio
    async def test_stored_failure_prevents_immediate_retry(self):
        """Test that a stored failure can be detected."""
        consumer = EventConsumer(service_name="execution")

        # Simulate stored failure
        mock_row = {
            "result_status": "failed",
            "result_data": {"error": "Broker connection timeout"},
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"failed-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        cached = await consumer.is_already_processed("evt", "failed-key")

        assert cached is not None
        assert cached["result_status"] == "failed"


class TestExecutionStatistics:
    """Tests for execution event statistics."""

    @pytest.mark.asyncio
    async def test_stats_include_order_count(self):
        """Test that stats include order execution counts."""
        consumer = EventConsumer(service_name="execution")

        mock_rows = [
            {"event_type": "order_approved", "result_status": "success", "count": 45},
            {"event_type": "order_approved", "result_status": "failed", "count": 5},
            {"event_type": "fill_received", "result_status": "success", "count": 40},
        ]

        mock_conn = MockAsyncpgConnection()

        async def mock_fetch(*args, **kwargs):
            return mock_rows

        mock_conn.fetch = mock_fetch
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        stats = await consumer.get_processing_stats(hours=24)

        assert stats["service"] == "execution"
        assert stats["total"] == 90
        assert "order_approved" in stats["by_event_type"]
        assert stats["orders_executed"] == 45


class TestCleanup:
    """Tests for cleanup functionality."""

    @pytest.mark.asyncio
    async def test_cleanup_respects_retention(self):
        """Test that cleanup respects retention period."""
        consumer = EventConsumer(service_name="execution")

        mock_conn = MockAsyncpgConnection()
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        deleted = await consumer.cleanup_old_events(retention_days=14)

        assert deleted == 1
        assert len(mock_conn.executed) > 0

        # Check that retention is passed correctly
        query, args = mock_conn.executed[0]
        assert "14" in str(args)


class TestSingletonFactory:
    """Tests for singleton and factory functions."""

    def test_get_event_consumer_returns_singleton(self):
        """Test that get_event_consumer returns the same instance."""
        import events.consumer as consumer_module
        consumer_module._consumer = None

        consumer1 = get_event_consumer()
        consumer2 = get_event_consumer()

        assert consumer1 is consumer2

    def test_consumer_has_correct_service_name(self):
        """Test that consumer is created with 'execution' service name."""
        import events.consumer as consumer_module
        consumer_module._consumer = None

        consumer = get_event_consumer()

        assert consumer.service_name == "execution"


class TestDeduplicationDecorator:
    """Tests for the with_deduplication decorator."""

    @pytest.mark.asyncio
    async def test_decorator_prevents_duplicate_order_execution(self):
        """Test that decorator prevents duplicate order execution."""
        consumer = EventConsumer(service_name="execution")

        # First call - no cached result
        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        execution_count = 0

        @with_deduplication(consumer=consumer)
        async def execute_order(event):
            nonlocal execution_count
            execution_count += 1
            return {"id": f"order-{execution_count}", "status": "FILLED"}

        event = {
            "event_id": "deco-evt",
            "idempotency_key": "deco-idem",
            "event_type": "order_approved",
        }

        result1 = await execute_order(event)
        assert execution_count == 1
        assert result1["id"] == "order-1"

        # Now simulate cached result
        mock_conn.rows["deco-idem"] = {
            "result_status": "success",
            "result_data": result1,
            "processed_at": datetime.utcnow(),
        }

        result2 = await execute_order(event)

        # Execution count should NOT increase
        assert execution_count == 1
        # Should return cached order
        assert result2["id"] == "order-1"
