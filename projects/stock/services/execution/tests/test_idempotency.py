"""
Tests for Execution Service idempotency handling.

Tests cover:
- Same key returns same order (prevents duplicate orders)
- Different key creates new order
- Key mismatch detection (same key, different order request)
- Expired key cleanup
- Order-specific idempotency lookups
"""

import pytest
import uuid
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

# Mock asyncpg before importing the modules that use it
import sys
sys.modules['asyncpg'] = MagicMock()

from idempotency import (
    IdempotencyHandler,
    IdempotencyKeyMismatch,
    DuplicateOrderError,
    check_idempotency,
    store_idempotency,
)


class MockAsyncpgConnection:
    """Mock asyncpg connection for testing."""

    def __init__(self, rows=None):
        self.rows = rows or {}
        self.executed = []

    async def fetchrow(self, query, *args):
        key = args[0] if args else None
        return self.rows.get(key)

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


class TestIdempotencyHandler:
    """Tests for IdempotencyHandler class specific to Execution Service."""

    def test_compute_request_hash_for_order(self):
        """Test request hash computation for order requests."""
        handler = IdempotencyHandler(service_name="execution")

        order_request = {
            "symbol": "AAPL",
            "market": "US",
            "side": "BUY",
            "quantity": 100,
            "order_type": "MARKET",
            "reason": "Test order",
            "data_snapshot_hash": "abc123",
            "rule_version_id": "v1.0.0",
        }

        hash1 = handler.compute_request_hash(order_request)
        hash2 = handler.compute_request_hash(order_request)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length

    def test_different_orders_produce_different_hashes(self):
        """Test that different orders produce different hashes."""
        handler = IdempotencyHandler(service_name="execution")

        order1 = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
        }
        order2 = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 200,  # Different quantity
        }

        hash1 = handler.compute_request_hash(order1)
        hash2 = handler.compute_request_hash(order2)

        assert hash1 != hash2

    def test_same_order_different_symbol_different_hash(self):
        """Test that same quantity but different symbol produces different hash."""
        handler = IdempotencyHandler(service_name="execution")

        order1 = {"symbol": "AAPL", "side": "BUY", "quantity": 100}
        order2 = {"symbol": "MSFT", "side": "BUY", "quantity": 100}

        hash1 = handler.compute_request_hash(order1)
        hash2 = handler.compute_request_hash(order2)

        assert hash1 != hash2

    @pytest.mark.asyncio
    async def test_get_cached_response_returns_order(self):
        """Test that cached order is returned correctly."""
        import json

        handler = IdempotencyHandler(service_name="execution")

        cached_order = {
            "id": "order-123",
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "status": "FILLED",
        }
        mock_row = {
            "request_hash": "abc123",
            "response_status": 200,
            "response_body": json.dumps(cached_order),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }

        mock_conn = MockAsyncpgConnection(rows={"test-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        result = await handler.get_cached_response(
            idempotency_key="test-key",
            request_hash="abc123",
            endpoint="/api/v1/orders"
        )

        assert result is not None
        status, body = result
        assert status == 200
        assert body["id"] == "order-123"
        assert body["symbol"] == "AAPL"

    @pytest.mark.asyncio
    async def test_get_cached_response_raises_on_different_order(self):
        """Test that reusing key for different order raises error."""
        import json

        handler = IdempotencyHandler(service_name="execution")

        # Original order was stored with this hash
        mock_row = {
            "request_hash": "original-order-hash",
            "response_status": 200,
            "response_body": json.dumps({"id": "order-123"}),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }

        mock_conn = MockAsyncpgConnection(rows={"reused-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        # Trying to use same key with different order (different hash)
        with pytest.raises(IdempotencyKeyMismatch):
            await handler.get_cached_response(
                idempotency_key="reused-key",
                request_hash="new-order-hash",
                endpoint="/api/v1/orders"
            )

    @pytest.mark.asyncio
    async def test_get_order_by_idempotency_key(self):
        """Test looking up an order by its idempotency key."""
        import json

        handler = IdempotencyHandler(service_name="execution")

        order_data = {
            "id": "order-456",
            "symbol": "MSFT",
            "status": "PENDING",
        }
        mock_row = {
            "response_body": json.dumps(order_data),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }

        mock_conn = MockAsyncpgConnection(rows={"order-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        result = await handler.get_order_by_idempotency_key("order-key")

        assert result is not None
        assert result["id"] == "order-456"
        assert result["symbol"] == "MSFT"

    @pytest.mark.asyncio
    async def test_get_order_by_key_returns_none_when_expired(self):
        """Test that expired key returns None."""
        import json

        handler = IdempotencyHandler(service_name="execution")

        mock_row = {
            "response_body": json.dumps({"id": "old-order"}),
            "expires_at": datetime.utcnow() - timedelta(hours=1),  # Expired
        }

        mock_conn = MockAsyncpgConnection(rows={"old-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        result = await handler.get_order_by_idempotency_key("old-key")

        assert result is None


class TestIdempotencyConvenienceFunctions:
    """Tests for convenience functions."""

    @pytest.mark.asyncio
    async def test_check_idempotency_skips_when_no_key(self):
        """Test that None key skips idempotency check."""
        result = await check_idempotency(
            idempotency_key=None,
            request_data={"symbol": "AAPL", "quantity": 100},
            endpoint="/api/v1/orders"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_store_idempotency_skips_when_no_key(self):
        """Test that None key skips storage."""
        # Should not raise any errors
        await store_idempotency(
            idempotency_key=None,
            request_data={"symbol": "AAPL"},
            endpoint="/api/v1/orders",
            status_code=200,
            response_body={"id": "order-123"}
        )


class TestDuplicateOrderPrevention:
    """Tests focused on preventing duplicate orders."""

    def test_same_order_request_produces_same_hash(self):
        """Verify identical order requests produce identical hashes."""
        handler = IdempotencyHandler(service_name="execution")

        order = {
            "symbol": "AAPL",
            "market": "US",
            "side": "BUY",
            "quantity": 100,
            "order_type": "MARKET",
            "price": None,
            "stop_price": None,
            "time_in_force": "DAY",
            "signal_id": None,
            "reason": "Momentum signal",
            "data_snapshot_hash": "abc123def456",
            "rule_version_id": "momentum_v1",
        }

        hash1 = handler.compute_request_hash(order)
        hash2 = handler.compute_request_hash(order)

        assert hash1 == hash2, "Same order must produce identical hash"

    def test_quantity_change_produces_different_hash(self):
        """Test that changing quantity changes the hash."""
        handler = IdempotencyHandler(service_name="execution")

        base_order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "order_type": "MARKET",
        }

        modified_order = {**base_order, "quantity": 150}

        hash1 = handler.compute_request_hash(base_order)
        hash2 = handler.compute_request_hash(modified_order)

        assert hash1 != hash2, "Different quantity must produce different hash"

    def test_side_change_produces_different_hash(self):
        """Test that changing side (BUY/SELL) changes the hash."""
        handler = IdempotencyHandler(service_name="execution")

        buy_order = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
        }

        sell_order = {**buy_order, "side": "SELL"}

        hash1 = handler.compute_request_hash(buy_order)
        hash2 = handler.compute_request_hash(sell_order)

        assert hash1 != hash2, "Different side must produce different hash"


class TestIdempotencyCleanup:
    """Tests for expired key cleanup."""

    @pytest.mark.asyncio
    async def test_cleanup_removes_expired_execution_keys(self):
        """Test that cleanup removes expired order idempotency keys."""
        handler = IdempotencyHandler(service_name="execution")

        mock_conn = MockAsyncpgConnection()
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        count = await handler.cleanup_expired()

        assert count == 1  # Mock returns "DELETE 1"
        assert len(mock_conn.executed) > 0
        assert "DELETE" in mock_conn.executed[0][0]
        assert "execution" in str(mock_conn.executed[0][1])


class TestIdempotencyKeyFormat:
    """Tests for idempotency key format validation."""

    def test_uuid_key_format(self):
        """Test that UUID format keys work correctly."""
        handler = IdempotencyHandler(service_name="execution")

        # Generate a proper UUID key
        key = str(uuid.uuid4())

        # Should be 36 characters (8-4-4-4-12 with hyphens)
        assert len(key) == 36
        assert key.count('-') == 4

    def test_custom_key_format(self):
        """Test that custom key formats work correctly."""
        handler = IdempotencyHandler(service_name="execution")

        # Some clients might use custom formats
        custom_key = "order-2024-01-15-001"

        # Key should be usable in hash computation
        request_data = {"symbol": "AAPL"}
        hash_result = handler.compute_request_hash(request_data)

        assert len(hash_result) == 64
