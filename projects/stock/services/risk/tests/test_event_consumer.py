"""
Tests for Risk Service event consumer with deduplication.

Tests cover:
- Duplicate event detection for risk validation
- Consistent validation results on retry
- New event processing
- Statistics and cleanup
- Risk-specific edge cases
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


class TestRiskEventConsumer:
    """Tests for Risk Service EventConsumer."""

    def test_service_name_is_risk(self):
        """Test that consumer is initialized with 'risk' service name."""
        consumer = EventConsumer()
        assert consumer.service_name == "risk"

    @pytest.mark.asyncio
    async def test_validation_result_cached_correctly(self):
        """Test that validation results are cached and returned correctly."""
        consumer = EventConsumer(service_name="risk")

        # Cached validation result - order was APPROVED
        cached_result = {
            "passed": True,
            "checks": [
                {"check_name": "kill_switch", "passed": True},
                {"check_name": "position_size", "passed": True},
            ],
            "rejection_reason": None,
            "approved_quantity": 100,
        }
        mock_row = {
            "result_status": "success",
            "result_data": json.dumps(cached_result),
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"order-idem-123": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        result = await consumer.is_already_processed("evt-123", "order-idem-123")

        assert result is not None
        assert result["result_status"] == "success"
        assert result["is_cached"] is True

    @pytest.mark.asyncio
    async def test_rejected_order_cached_correctly(self):
        """Test that rejection results are also cached."""
        consumer = EventConsumer(service_name="risk")

        # Cached validation result - order was REJECTED
        cached_result = {
            "passed": False,
            "checks": [
                {"check_name": "kill_switch", "passed": True},
                {"check_name": "position_size", "passed": False},
            ],
            "rejection_reason": "Position size limit exceeded",
            "approved_quantity": None,
        }
        mock_row = {
            "result_status": "success",  # Processing succeeded, validation rejected
            "result_data": cached_result,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"order-idem-456": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock()
        event = {
            "event_id": "evt-456",
            "idempotency_key": "order-idem-456",
            "event_type": "order_proposed",
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 1000,
        }

        result = await consumer.process_event(event, handler)

        # Handler should NOT be called
        handler.assert_not_called()

        # Should return cached REJECTION result
        assert result["passed"] is False
        assert "Position size" in result["rejection_reason"]

    @pytest.mark.asyncio
    async def test_same_order_always_gets_same_result(self):
        """Test that the same order always gets the same validation result."""
        consumer = EventConsumer(service_name="risk")

        # First call - order gets approved
        approval_result = {
            "passed": True,
            "checks": [],
            "approved_quantity": 100,
        }

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock(return_value=approval_result)

        event = {
            "event_id": "evt-consistent",
            "idempotency_key": "consistent-idem",
            "event_type": "order_proposed",
        }

        result1 = await consumer.process_event(event, handler)

        # Handler called for first request
        assert handler.call_count == 1
        assert result1["passed"] is True

        # Now simulate cached result for second call
        mock_row = {
            "result_status": "success",
            "result_data": approval_result,
            "processed_at": datetime.utcnow(),
        }
        mock_conn.rows["consistent-idem"] = mock_row

        # Reset handler
        handler.reset_mock()

        result2 = await consumer.process_event(event, handler)

        # Handler NOT called for second request
        handler.assert_not_called()

        # Same result returned
        assert result2["passed"] is True
        assert result2 == result1

    @pytest.mark.asyncio
    async def test_process_new_order_proposal(self):
        """Test processing a new order_proposed event."""
        consumer = EventConsumer(service_name="risk")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        validation_result = {
            "passed": True,
            "checks": [
                {"check_name": "kill_switch", "passed": True},
                {"check_name": "daily_order_count", "passed": True, "value": 5, "limit": 20},
            ],
            "approved_quantity": 50,
        }
        handler = AsyncMock(return_value=validation_result)

        event = {
            "event_id": "new-order-evt",
            "idempotency_key": "new-order-idem",
            "event_type": "order_proposed",
            "symbol": "MSFT",
            "side": "BUY",
            "quantity": 50,
        }

        result = await consumer.process_event(event, handler)

        # Handler should be called
        handler.assert_called_once()

        # Result should match handler return
        assert result["passed"] is True
        assert result["approved_quantity"] == 50

        # Should be stored
        assert len(mock_conn.executed) > 0

    @pytest.mark.asyncio
    async def test_risk_check_failure_is_stored(self):
        """Test that risk check failures (processing errors) are stored."""
        consumer = EventConsumer(service_name="risk")

        mock_conn = MockAsyncpgConnection(rows={})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        handler = AsyncMock(side_effect=RuntimeError("Database connection failed"))

        event = {
            "event_id": "error-evt",
            "idempotency_key": "error-idem",
            "event_type": "order_proposed",
        }

        with pytest.raises(RuntimeError):
            await consumer.process_event(event, handler)

        # Should be marked as failed
        assert len(mock_conn.executed) > 0
        query, args = mock_conn.executed[0]
        assert "failed" in args


class TestRiskEventConsumerConsistency:
    """Tests focused on risk validation consistency."""

    @pytest.mark.asyncio
    async def test_approval_remains_approval_on_retry(self):
        """Test that an approved order stays approved on retry."""
        consumer = EventConsumer(service_name="risk")

        # Original approval
        approval = {
            "passed": True,
            "checks": [{"check_name": "all_checks", "passed": True}],
            "approved_quantity": 100,
        }
        mock_row = {
            "result_status": "success",
            "result_data": approval,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"approval-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        # Handler that would now REJECT (conditions changed)
        handler = AsyncMock(return_value={
            "passed": False,
            "rejection_reason": "Daily limit exceeded",
        })

        event = {
            "event_id": "evt-consistency",
            "idempotency_key": "approval-key",
            "event_type": "order_proposed",
        }

        result = await consumer.process_event(event, handler)

        # CRITICAL: Should return original APPROVAL, not new rejection
        handler.assert_not_called()
        assert result["passed"] is True

    @pytest.mark.asyncio
    async def test_rejection_remains_rejection_on_retry(self):
        """Test that a rejected order stays rejected on retry."""
        consumer = EventConsumer(service_name="risk")

        # Original rejection
        rejection = {
            "passed": False,
            "rejection_reason": "Kill switch active",
            "checks": [{"check_name": "kill_switch", "passed": False}],
        }
        mock_row = {
            "result_status": "success",
            "result_data": rejection,
            "processed_at": datetime.utcnow(),
        }

        mock_conn = MockAsyncpgConnection(rows={"rejection-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        # Handler that would now APPROVE (kill switch disabled)
        handler = AsyncMock(return_value={
            "passed": True,
            "approved_quantity": 100,
        })

        event = {
            "event_id": "evt-rejection",
            "idempotency_key": "rejection-key",
            "event_type": "order_proposed",
        }

        result = await consumer.process_event(event, handler)

        # CRITICAL: Should return original REJECTION, not new approval
        handler.assert_not_called()
        assert result["passed"] is False


class TestRiskEventStatistics:
    """Tests for risk event statistics."""

    @pytest.mark.asyncio
    async def test_stats_track_approvals_and_rejections(self):
        """Test that stats differentiate between approvals and rejections."""
        consumer = EventConsumer(service_name="risk")

        mock_rows = [
            {"event_type": "order_proposed", "result_status": "success", "count": 50},
            {"event_type": "order_proposed", "result_status": "failed", "count": 3},
            {"event_type": "signal_generated", "result_status": "success", "count": 25},
        ]

        mock_conn = MockAsyncpgConnection()

        async def mock_fetch(*args, **kwargs):
            return mock_rows

        mock_conn.fetch = mock_fetch
        mock_pool = MockAsyncpgPool(mock_conn)
        consumer._pool = mock_pool

        stats = await consumer.get_processing_stats(hours=24)

        assert stats["service"] == "risk"
        assert stats["total"] == 78
        assert "order_proposed" in stats["by_event_type"]


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
        """Test that consumer is created with 'risk' service name."""
        import events.consumer as consumer_module
        consumer_module._consumer = None

        consumer = get_event_consumer()

        assert consumer.service_name == "risk"
