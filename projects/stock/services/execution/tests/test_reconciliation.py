"""
Tests for Position and Order Reconciliation

Tests the reconciliation module to ensure proper detection of
discrepancies between broker and local positions/orders.

CRITICAL: These tests validate the safety system that detects
position mismatches that could indicate execution issues.
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from reconciliation.reconciler import (
    PositionReconciler,
    ReconciliationResult,
    PositionMismatch,
)
from reconciliation.order_reconciler import (
    OrderReconciler,
    OrderReconciliationResult,
    OrderMismatch,
)


class MockBroker:
    """Mock broker for testing."""

    def __init__(self, positions=None, orders=None):
        self._positions = positions or []
        self._orders = orders or []

    def get_positions(self):
        return self._positions

    def get_orders(self, status=None, limit=1000):
        return self._orders


class MockPool:
    """Mock PostgreSQL connection pool."""

    def __init__(self, local_positions=None, local_orders=None):
        self._local_positions = local_positions or []
        self._local_orders = local_orders or []

    def acquire(self):
        return MockConnection(self._local_positions, self._local_orders)


class MockConnection:
    """Mock database connection."""

    def __init__(self, positions, orders):
        self._positions = positions
        self._orders = orders

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def fetch(self, query, *args):
        if "positions" in query.lower():
            return self._positions
        elif "orders" in query.lower():
            return self._orders
        return []

    async def fetchrow(self, query, *args):
        return {"id": 1}

    async def fetchval(self, query, *args):
        return 0

    async def execute(self, query, *args):
        return "1"


# =============================================================================
# Position Reconciliation Tests
# =============================================================================

class TestPositionReconciler:
    """Tests for PositionReconciler."""

    @pytest.fixture
    def reconciler(self):
        """Create a reconciler with mocked dependencies."""
        broker = MockBroker()
        pool = MockPool()
        return PositionReconciler(broker, pool)

    @pytest.mark.asyncio
    async def test_positions_match_exactly(self):
        """Test when broker and local positions match exactly."""
        positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
                "current_price": 155.0,
            }
        ]

        broker = MockBroker(positions=positions)

        # Local positions from DB (same data)
        local_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
                "current_price": 155.0,
            }
        ]
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "matched"
        assert len(result.mismatches) == 0
        assert result.requires_intervention is False

    @pytest.mark.asyncio
    async def test_quantity_mismatch_detected(self):
        """Test detection of quantity mismatch."""
        broker_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        local_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 50,  # Different quantity!
                "average_entry_price": 150.0,
            }
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert len(result.mismatches) == 1
        assert result.mismatches[0].mismatch_type == "quantity"
        assert result.mismatches[0].severity == "critical"
        assert result.requires_intervention is True

    @pytest.mark.asyncio
    async def test_missing_local_position_detected(self):
        """Test detection of position missing from local database."""
        broker_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        local_positions = []  # Empty - position missing!

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert len(result.mismatches) == 1
        assert result.mismatches[0].mismatch_type == "missing_local"
        assert result.mismatches[0].severity == "critical"
        assert result.requires_intervention is True

    @pytest.mark.asyncio
    async def test_missing_broker_position_detected(self):
        """Test detection of position missing from broker."""
        broker_positions = []  # Empty - position missing from broker!

        local_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert len(result.mismatches) == 1
        assert result.mismatches[0].mismatch_type == "missing_broker"
        assert result.mismatches[0].severity == "critical"

    @pytest.mark.asyncio
    async def test_side_mismatch_detected(self):
        """Test detection of position side mismatch (LONG vs SHORT)."""
        broker_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        local_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "SHORT",  # Wrong side!
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert any(m.mismatch_type == "side" for m in result.mismatches)

    @pytest.mark.asyncio
    async def test_price_mismatch_is_warning(self):
        """Test that price mismatch is a warning, not critical."""
        broker_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 150.0,
            }
        ]

        local_positions = [
            {
                "symbol": "AAPL",
                "market": "US",
                "side": "LONG",
                "quantity": 100,
                "average_entry_price": 145.0,  # Different price
            }
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        price_mismatch = next((m for m in result.mismatches if m.mismatch_type == "price"), None)
        assert price_mismatch is not None
        assert price_mismatch.severity == "warning"
        # Price mismatch alone should not require intervention
        assert result.requires_intervention is False

    @pytest.mark.asyncio
    async def test_multiple_positions_reconciled(self):
        """Test reconciliation with multiple positions."""
        broker_positions = [
            {"symbol": "AAPL", "market": "US", "side": "LONG", "quantity": 100, "average_entry_price": 150.0},
            {"symbol": "GOOG", "market": "US", "side": "LONG", "quantity": 50, "average_entry_price": 2000.0},
            {"symbol": "MSFT", "market": "US", "side": "SHORT", "quantity": 75, "average_entry_price": 300.0},
        ]

        local_positions = [
            {"symbol": "AAPL", "market": "US", "side": "LONG", "quantity": 100, "average_entry_price": 150.0},
            {"symbol": "GOOG", "market": "US", "side": "LONG", "quantity": 50, "average_entry_price": 2000.0},
            {"symbol": "MSFT", "market": "US", "side": "SHORT", "quantity": 75, "average_entry_price": 300.0},
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "matched"
        assert len(result.mismatches) == 0

    @pytest.mark.asyncio
    async def test_empty_positions_match(self):
        """Test that empty positions on both sides is a match."""
        broker = MockBroker(positions=[])
        pool = MockPool(local_positions=[])

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "matched"
        assert len(result.mismatches) == 0


# =============================================================================
# Order Reconciliation Tests
# =============================================================================

class TestOrderReconciler:
    """Tests for OrderReconciler."""

    @pytest.mark.asyncio
    async def test_orders_match(self):
        """Test when broker and local orders match."""
        broker_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PENDING",
                "quantity": 100,
                "filled_quantity": 0,
            }
        ]

        local_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PENDING",
                "quantity": 100,
                "filled_quantity": 0,
            }
        ]

        broker = MockBroker(orders=broker_orders)
        pool = MockPool(local_orders=local_orders)

        reconciler = OrderReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "matched"
        assert len(result.mismatches) == 0

    @pytest.mark.asyncio
    async def test_orphaned_broker_order_detected(self):
        """Test detection of order in broker but not local (orphaned)."""
        broker_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PENDING",
                "quantity": 100,
            }
        ]

        local_orders = []  # No local order!

        broker = MockBroker(orders=broker_orders)
        pool = MockPool(local_orders=local_orders)

        reconciler = OrderReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert result.orphaned_broker_count == 1
        assert any(m.mismatch_type == "orphaned_broker" for m in result.mismatches)

    @pytest.mark.asyncio
    async def test_missing_local_order_detected(self):
        """Test detection of order in local but not broker (missing)."""
        broker_orders = []  # No broker order!

        local_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PENDING",
                "quantity": 100,
            }
        ]

        broker = MockBroker(orders=broker_orders)
        pool = MockPool(local_orders=local_orders)

        reconciler = OrderReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert result.missing_local_count == 1
        assert any(m.mismatch_type == "missing_local" for m in result.mismatches)

    @pytest.mark.asyncio
    async def test_fill_quantity_mismatch_detected(self):
        """Test detection of fill quantity mismatch."""
        broker_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PARTIAL",
                "quantity": 100,
                "filled_quantity": 50,
            }
        ]

        local_orders = [
            {
                "id": "order-1",
                "symbol": "AAPL",
                "status": "PARTIAL",
                "quantity": 100,
                "filled_quantity": 25,  # Different fill!
            }
        ]

        broker = MockBroker(orders=broker_orders)
        pool = MockPool(local_orders=local_orders)

        reconciler = OrderReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.status == "mismatch"
        assert any(m.mismatch_type == "fill_quantity" for m in result.mismatches)


# =============================================================================
# PositionMismatch Model Tests
# =============================================================================

class TestPositionMismatch:
    """Tests for PositionMismatch dataclass."""

    def test_to_dict(self):
        """Test serialization to dictionary."""
        mismatch = PositionMismatch(
            symbol="AAPL",
            mismatch_type="quantity",
            broker_value=100,
            local_value=50,
            severity="critical",
            details="Quantity mismatch",
        )

        d = mismatch.to_dict()

        assert d["symbol"] == "AAPL"
        assert d["mismatch_type"] == "quantity"
        assert d["broker_value"] == 100
        assert d["local_value"] == 50
        assert d["severity"] == "critical"


# =============================================================================
# ReconciliationResult Model Tests
# =============================================================================

class TestReconciliationResult:
    """Tests for ReconciliationResult dataclass."""

    def test_to_dict(self):
        """Test serialization to dictionary."""
        result = ReconciliationResult(
            timestamp=datetime(2024, 1, 15, 12, 0, 0),
            broker_positions={"AAPL": {"quantity": 100}},
            local_positions={"AAPL": {"quantity": 100}},
            mismatches=[],
            status="matched",
            requires_intervention=False,
            execution_time_ms=50,
        )

        d = result.to_dict()

        assert d["status"] == "matched"
        assert d["requires_intervention"] is False
        assert d["execution_time_ms"] == 50
        assert "AAPL" in d["broker_positions"]


# =============================================================================
# Integration-style Tests
# =============================================================================

class TestReconciliationIntegration:
    """Integration-style tests for reconciliation workflow."""

    @pytest.mark.asyncio
    async def test_mismatch_handling_triggers_kill_switch(self):
        """Test that critical mismatch triggers kill switch."""
        broker_positions = [
            {"symbol": "AAPL", "market": "US", "side": "LONG", "quantity": 100, "average_entry_price": 150.0}
        ]
        local_positions = []  # Missing position - critical!

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        assert result.requires_intervention is True

        # Mock the handle_mismatch method to verify kill switch would be triggered
        with patch.object(reconciler, '_trigger_kill_switch', new_callable=AsyncMock) as mock_kill:
            with patch.object(reconciler, '_send_alert', new_callable=AsyncMock):
                with patch.object(reconciler, '_store_report', new_callable=AsyncMock) as mock_store:
                    mock_store.return_value = 1
                    actions = await reconciler.handle_mismatch(result)

                    mock_kill.assert_called_once()
                    assert actions["kill_switch_triggered"] is True

    @pytest.mark.asyncio
    async def test_warning_mismatch_does_not_trigger_kill_switch(self):
        """Test that warning-only mismatch does not trigger kill switch."""
        broker_positions = [
            {"symbol": "AAPL", "market": "US", "side": "LONG", "quantity": 100, "average_entry_price": 150.0}
        ]
        local_positions = [
            {"symbol": "AAPL", "market": "US", "side": "LONG", "quantity": 100, "average_entry_price": 145.0}  # Price differs
        ]

        broker = MockBroker(positions=broker_positions)
        pool = MockPool(local_positions=local_positions)

        reconciler = PositionReconciler(broker, pool)
        result = await reconciler.reconcile()

        # Only price mismatch = warning, should not require intervention
        assert result.requires_intervention is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
