"""
Tests for Signal Service event consumer with deduplication.

Tests cover:
- Duplicate event detection and cached result return
- New event processing and result storage
- Statistics collection
- Cleanup functionality
- Edge cases (missing identifiers, handler errors)
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
        self.fetched.append((query, args))
        return self.rows.get(key)

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


class TestEventConsumer:
    """Tests for EventConsumer class."""

    def test_extract_event_identifiers(self):
        """Test extracting identifiers from event payload."""
        consumer = EventConsumer(service_name="signal")

        # Standard event format
        event = {
            "event_id": "evt-123",
            "idempotency_key": "idem-456",
            "event_type": "market_data_ready",
        }
        event_id, idem_key, event_type = consumer._extract_event_identifiers(event)

        assert event_id == "evt-123"
        assert idem_key == "idem-456"
        assert event_type == "market_data_ready"

    def test_extract_identifiers_from_payload(self):
        """Test extracting identifiers from nested payload."""
        consumer = EventConsumer(service_name="signal")

        # Nested payload format
        event = {
            "payload": {
                "id": "payload-id",
                "idempotency_key": "payload-idem",
            },
            "type": "market_data_ready",
        }
        event_id, idem_key, event_type = consumer._extract_event_identifiers(event)

        assert event_id == "payload-id"
        assert idem_key == "payload-idem"
        assert event_type == "market_data_ready"

    def test_extract_identifiers_fallback(self):
        """Test fallback when identifiers are missing."""
        consumer = EventConsumer(service_name="signal")

        # Minimal event - uses id as fallback for idempotency_key
        event = {
            "id": "only-id",
        }
        event_id, idem_key, event_type = consumer._extract_event_identifiers(event)

        assert event_id == "only-id"
        assert idem_key == "only-id"  # Falls back to event_id
        assert event_type == "unknown"

    @pytest.mark.asyncio
    async def test_is_already_processed_returns_cached(self):
        """Test that is_already_processed returns cached result."""
        consumer = EventConsumer(service_name="signal")

        cached_result = {
            "signals_generated": 3,
            "signals": [{"id": "sig-1"}, {"id": "sig-2"}, {"id": "sig-3"}],
        }
        mock_row = {
            "result_status": "success",
            "result_data": cached_result,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"evt-123": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        result = await consumer.is_already_processed("evt-123", "idem-456")

        assert result is not None
        assert result["result_status"] == "success"
        assert result["is_cached"] is True

    @pytest.mark.asyncio
    async def test_is_already_processed_returns_none_for_new(self):
        """Test that is_already_processed returns None for new events."""
        consumer = EventConsumer(service_name="signal")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        result = await consumer.is_already_processed("new-event", "new-idem")

        assert result is None

    @pytest.mark.asyncio
    async def test_mark_processed_stores_result(self):
        """Test that mark_processed stores event result."""
        consumer = EventConsumer(service_name="signal")

        mock_conn = MockAsyncpgConnection()
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        await consumer.mark_processed(
            event_id="evt-123",
            idempotency_key="idem-456",
            event_type="market_data_ready",
            result_status="success",
            result_data={"signals_generated": 5},
        )

        # Verify execute was called with correct data
        assert len(mock_conn.executed) > 0
        query, args = mock_conn.executed[0]
        assert "INSERT INTO processed_events" in query
        assert "evt-123" in args
        assert "idem-456" in args
        assert "signal" in args

    @pytest.mark.asyncio
    async def test_process_event_returns_cached_for_duplicate(self):
        """Test that duplicate events return cached results."""
        consumer = EventConsumer(service_name="signal")

        cached_result = {"signals_generated": 3}
        mock_row = {
            "result_status": "success",
            "result_data": cached_result,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"idem-123": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock(return_value={"signals_generated": 10})

        event = {
            "event_id": "evt-123",
            "idempotency_key": "idem-123",
            "event_type": "market_data_ready",
            "symbols": ["AAPL"],
        }

        result = await consumer.process_event(event, handler)

        # Handler should NOT be called for duplicate
        handler.assert_not_called()

        # Should return cached result
        assert result == cached_result

    @pytest.mark.asyncio
    async def test_process_event_processes_new_event(self):
        """Test that new events are processed and stored."""
        consumer = EventConsumer(service_name="signal")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler_result = {"signals_generated": 5, "signals": []}
        handler = AsyncMock(return_value=handler_result)

        event = {
            "event_id": "new-evt",
            "idempotency_key": "new-idem",
            "event_type": "market_data_ready",
            "symbols": ["AAPL"],
        }

        result = await consumer.process_event(event, handler)

        # Handler should be called
        handler.assert_called_once()

        # Result should be from handler
        assert result == handler_result

        # Should store the result
        assert len(mock_conn.executed) > 0

    @pytest.mark.asyncio
    async def test_process_event_raises_on_duplicate_when_requested(self):
        """Test that DuplicateEventError is raised when skip_if_processed=False."""
        consumer = EventConsumer(service_name="signal")

        cached_result = {"signals_generated": 3}
        mock_row = {
            "result_status": "success",
            "result_data": cached_result,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"idem-123": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock()
        event = {
            "event_id": "evt-123",
            "idempotency_key": "idem-123",
            "event_type": "market_data_ready",
        }

        with pytest.raises(DuplicateEventError) as exc_info:
            await consumer.process_event(event, handler, skip_if_processed=False)

        assert exc_info.value.event_id == "evt-123"
        assert exc_info.value.cached_result is not None

    @pytest.mark.asyncio
    async def test_process_event_marks_failed_on_error(self):
        """Test that handler errors are marked as failed."""
        consumer = EventConsumer(service_name="signal")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock(side_effect=ValueError("Handler failed"))

        event = {
            "event_id": "evt-123",
            "idempotency_key": "idem-123",
            "event_type": "market_data_ready",
        }

        with pytest.raises(ValueError):
            await consumer.process_event(event, handler)

        # Should mark as failed
        assert len(mock_conn.executed) > 0
        query, args = mock_conn.executed[0]
        assert "failed" in args

    @pytest.mark.asyncio
    async def test_cleanup_old_events(self):
        """Test cleanup of old processed events."""
        consumer = EventConsumer(service_name="signal")

        mock_conn = MockAsyncpgConnection()
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        deleted = await consumer.cleanup_old_events(retention_days=7)

        assert deleted == 1  # Mock returns "DELETE 1"
        assert len(mock_conn.executed) > 0
        assert "DELETE FROM processed_events" in mock_conn.executed[0][0]


class TestEventConsumerDecorator:
    """Tests for the with_deduplication decorator."""

    @pytest.mark.asyncio
    async def test_decorator_adds_deduplication(self):
        """Test that decorator wraps handler with deduplication."""
        # Create a consumer with mock pool
        consumer = EventConsumer(service_name="signal")
        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        call_count = 0

        @with_deduplication(consumer=consumer)
        async def my_handler(event):
            nonlocal call_count
            call_count += 1
            return {"result": "processed"}

        event = {
            "event_id": "evt-1",
            "idempotency_key": "idem-1",
            "event_type": "test",
        }

        # First call should process
        result1 = await my_handler(event)
        assert call_count == 1
        assert result1["result"] == "processed"


class TestEventConsumerStats:
    """Tests for event processing statistics."""

    @pytest.mark.asyncio
    async def test_get_processing_stats(self):
        """Test getting processing statistics."""
        consumer = EventConsumer(service_name="signal")

        mock_rows = [
            {"event_type": "market_data_ready", "result_status": "success", "count": 10},
            {"event_type": "market_data_ready", "result_status": "failed", "count": 2},
            {"event_type": "signal_generated", "result_status": "success", "count": 8},
        ]

        mock_conn = MockAsyncpgConnection()
        mock_conn.rows = {i: row for i, row in enumerate(mock_rows)}

        # Override fetch to return mock rows
        async def mock_fetch(*args, **kwargs):
            return mock_rows

        mock_conn.fetch = mock_fetch
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        stats = await consumer.get_processing_stats(hours=24)

        assert stats["service"] == "signal"
        assert stats["period_hours"] == 24
        assert stats["total"] == 20  # 10 + 2 + 8
        assert stats["by_status"]["success"] == 18  # 10 + 8
        assert stats["by_status"]["failed"] == 2


class TestSingletonFactory:
    """Tests for singleton and factory functions."""

    def test_get_event_consumer_returns_singleton(self):
        """Test that get_event_consumer returns the same instance."""
        # Reset global consumer
        import events.consumer as consumer_module
        consumer_module._consumer = None

        consumer1 = get_event_consumer()
        consumer2 = get_event_consumer()

        assert consumer1 is consumer2

    def test_consumer_has_correct_service_name(self):
        """Test that consumer is created with correct service name."""
        import events.consumer as consumer_module
        consumer_module._consumer = None

        consumer = get_event_consumer()

        assert consumer.service_name == "signal"
