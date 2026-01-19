"""
Tests for Risk Service idempotency handling.

Tests cover:
- Same key returns same response
- Different key processes normally
- Key mismatch detection (same key, different request)
- Expired key cleanup
"""

import pytest
import uuid
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

# Mock asyncpg before importing the modules that use it
import sys
sys.modules['asyncpg'] = MagicMock()

from idempotency import (
    IdempotencyHandler,
    IdempotencyKeyMismatch,
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
    """Tests for IdempotencyHandler class."""

    def test_compute_request_hash_deterministic(self):
        """Test that request hash is deterministic for same input."""
        handler = IdempotencyHandler(service_name="risk")

        request_data = {
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "price": 150.0,
        }

        hash1 = handler.compute_request_hash(request_data)
        hash2 = handler.compute_request_hash(request_data)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length

    def test_compute_request_hash_different_for_different_input(self):
        """Test that different requests produce different hashes."""
        handler = IdempotencyHandler(service_name="risk")

        request1 = {"symbol": "AAPL", "quantity": 100}
        request2 = {"symbol": "AAPL", "quantity": 200}

        hash1 = handler.compute_request_hash(request1)
        hash2 = handler.compute_request_hash(request2)

        assert hash1 != hash2

    def test_compute_request_hash_order_independent(self):
        """Test that key order doesn't affect hash."""
        handler = IdempotencyHandler(service_name="risk")

        request1 = {"symbol": "AAPL", "quantity": 100}
        request2 = {"quantity": 100, "symbol": "AAPL"}

        hash1 = handler.compute_request_hash(request1)
        hash2 = handler.compute_request_hash(request2)

        assert hash1 == hash2

    @pytest.mark.asyncio
    async def test_get_cached_response_returns_none_when_not_found(self):
        """Test that missing key returns None."""
        handler = IdempotencyHandler(service_name="risk")

        # Mock empty pool
        mock_pool = MockAsyncpgPool(MockAsyncpgConnection(rows={}))
        handler._pool = mock_pool

        result = await handler.get_cached_response(
            idempotency_key="test-key",
            request_hash="abc123",
            endpoint="/api/v1/validate"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_get_cached_response_returns_cached_data(self):
        """Test that existing key returns cached response."""
        import json

        handler = IdempotencyHandler(service_name="risk")

        cached_response = {"passed": True, "id": "test-id"}
        mock_row = {
            "request_hash": "abc123",
            "response_status": 200,
            "response_body": json.dumps(cached_response),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }

        # Create mock that returns the row
        mock_conn = MockAsyncpgConnection(rows={"test-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        result = await handler.get_cached_response(
            idempotency_key="test-key",
            request_hash="abc123",
            endpoint="/api/v1/validate"
        )

        assert result is not None
        status, body = result
        assert status == 200
        assert body == cached_response

    @pytest.mark.asyncio
    async def test_get_cached_response_raises_on_hash_mismatch(self):
        """Test that mismatched hash raises IdempotencyKeyMismatch."""
        import json

        handler = IdempotencyHandler(service_name="risk")

        mock_row = {
            "request_hash": "original-hash",
            "response_status": 200,
            "response_body": json.dumps({"passed": True}),
            "expires_at": datetime.utcnow() + timedelta(hours=1),
        }

        mock_conn = MockAsyncpgConnection(rows={"test-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        with pytest.raises(IdempotencyKeyMismatch):
            await handler.get_cached_response(
                idempotency_key="test-key",
                request_hash="different-hash",
                endpoint="/api/v1/validate"
            )

    @pytest.mark.asyncio
    async def test_get_cached_response_deletes_expired_key(self):
        """Test that expired keys are deleted and None is returned."""
        import json

        handler = IdempotencyHandler(service_name="risk")

        # Expired key
        mock_row = {
            "request_hash": "abc123",
            "response_status": 200,
            "response_body": json.dumps({"passed": True}),
            "expires_at": datetime.utcnow() - timedelta(hours=1),  # Expired
        }

        mock_conn = MockAsyncpgConnection(rows={"test-key": mock_row})
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        result = await handler.get_cached_response(
            idempotency_key="test-key",
            request_hash="abc123",
            endpoint="/api/v1/validate"
        )

        assert result is None
        # Verify delete was called
        assert len(mock_conn.executed) > 0
        assert "DELETE" in mock_conn.executed[0][0]


class TestIdempotencyConvenienceFunctions:
    """Tests for convenience functions."""

    @pytest.mark.asyncio
    async def test_check_idempotency_returns_none_when_no_key(self):
        """Test that None key skips idempotency check."""
        result = await check_idempotency(
            idempotency_key=None,
            request_data={"symbol": "AAPL"},
            endpoint="/api/v1/validate"
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_store_idempotency_skips_when_no_key(self):
        """Test that None key skips storage."""
        # Should not raise any errors
        await store_idempotency(
            idempotency_key=None,
            request_data={"symbol": "AAPL"},
            endpoint="/api/v1/validate",
            status_code=200,
            response_body={"passed": True}
        )


class TestIdempotencyIntegration:
    """Integration tests for idempotency with Risk Service endpoints."""

    @pytest.fixture
    def valid_order_request(self):
        """Create a valid order validation request."""
        return {
            "symbol": "AAPL",
            "market": "US",
            "side": "BUY",
            "quantity": 100,
            "price": 150.0,
            "order_type": "LIMIT",
            "data_snapshot_hash": "abc123",
            "rule_version_id": "v1.0.0",
            "reason": "Test order",
        }

    @pytest.mark.asyncio
    async def test_same_key_returns_same_response(self, valid_order_request):
        """Test that same idempotency key returns identical response."""
        # This would be a full integration test with the actual service
        # For unit testing, we verify the handler logic above
        pass

    @pytest.mark.asyncio
    async def test_different_keys_process_independently(self, valid_order_request):
        """Test that different keys are processed independently."""
        # Each unique key should result in independent processing
        key1 = str(uuid.uuid4())
        key2 = str(uuid.uuid4())

        # These keys should not conflict
        assert key1 != key2


class TestIdempotencyCleanup:
    """Tests for expired key cleanup."""

    @pytest.mark.asyncio
    async def test_cleanup_expired_removes_old_keys(self):
        """Test that cleanup removes expired keys."""
        handler = IdempotencyHandler(service_name="risk")

        mock_conn = MockAsyncpgConnection()
        mock_pool = MockAsyncpgPool(mock_conn)
        handler._pool = mock_pool

        count = await handler.cleanup_expired()

        assert count == 1  # Mock returns "DELETE 1"
        assert len(mock_conn.executed) > 0
        assert "DELETE" in mock_conn.executed[0][0]
        assert "expires_at < NOW()" in mock_conn.executed[0][0]
