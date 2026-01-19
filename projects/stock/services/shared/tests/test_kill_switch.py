"""
Tests for the Distributed Kill Switch module.

These tests verify that the kill switch:
1. Can be triggered and reset
2. Works across multiple service instances
3. Fails safe when Redis is unavailable
4. Properly stores and retrieves status

Usage:
    pytest services/shared/tests/test_kill_switch.py -v
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kill_switch import (
    DistributedKillSwitch,
    KillSwitchStatus,
    KillSwitchActiveError,
    KILL_SWITCH_PREFIX,
)


class MockRedis:
    """Mock Redis client for testing."""

    def __init__(self):
        self.data = {}
        self.lists = {}

    async def get(self, key):
        return self.data.get(key)

    async def set(self, key, value):
        self.data[key] = value

    async def delete(self, key):
        if key in self.data:
            del self.data[key]

    async def lpush(self, key, value):
        if key not in self.lists:
            self.lists[key] = []
        self.lists[key].insert(0, value)

    async def ltrim(self, key, start, end):
        if key in self.lists:
            self.lists[key] = self.lists[key][start:end + 1]

    async def lrange(self, key, start, end):
        if key in self.lists:
            return self.lists[key][start:end + 1]
        return []

    def pipeline(self):
        return MockPipeline(self)

    async def close(self):
        pass


class MockPipeline:
    """Mock Redis pipeline for testing."""

    def __init__(self, redis):
        self.redis = redis
        self.commands = []

    def get(self, key):
        self.commands.append(("get", key))
        return self

    def set(self, key, value):
        self.commands.append(("set", key, value))
        return self

    def delete(self, key):
        self.commands.append(("delete", key))
        return self

    def lpush(self, key, value):
        self.commands.append(("lpush", key, value))
        return self

    def ltrim(self, key, start, end):
        self.commands.append(("ltrim", key, start, end))
        return self

    async def execute(self):
        results = []
        for cmd in self.commands:
            if cmd[0] == "get":
                results.append(self.redis.data.get(cmd[1]))
            elif cmd[0] == "set":
                self.redis.data[cmd[1]] = cmd[2]
                results.append(True)
            elif cmd[0] == "delete":
                if cmd[1] in self.redis.data:
                    del self.redis.data[cmd[1]]
                results.append(True)
            elif cmd[0] == "lpush":
                if cmd[1] not in self.redis.lists:
                    self.redis.lists[cmd[1]] = []
                self.redis.lists[cmd[1]].insert(0, cmd[2])
                results.append(len(self.redis.lists[cmd[1]]))
            elif cmd[0] == "ltrim":
                if cmd[1] in self.redis.lists:
                    self.redis.lists[cmd[1]] = self.redis.lists[cmd[1]][cmd[2]:cmd[3] + 1]
                results.append(True)
        return results


@pytest.fixture
def mock_redis():
    """Create a mock Redis instance."""
    return MockRedis()


@pytest.fixture
def kill_switch(mock_redis):
    """Create a DistributedKillSwitch with mock Redis."""
    ks = DistributedKillSwitch(
        redis_url="redis://localhost:6379",
        service_name="test-service",
    )
    ks._redis = mock_redis
    ks._owned_client = True
    return ks


class TestKillSwitchBasics:
    """Test basic kill switch operations."""

    @pytest.mark.asyncio
    async def test_is_active_when_not_set(self, kill_switch):
        """Kill switch should be inactive when key is not set."""
        active = await kill_switch.is_active()
        assert active is False

    @pytest.mark.asyncio
    async def test_is_active_when_set_to_0(self, kill_switch, mock_redis):
        """Kill switch should be inactive when set to '0'."""
        mock_redis.data[f"{KILL_SWITCH_PREFIX}:active"] = "0"
        active = await kill_switch.is_active()
        assert active is False

    @pytest.mark.asyncio
    async def test_is_active_when_set_to_1(self, kill_switch, mock_redis):
        """Kill switch should be active when set to '1'."""
        mock_redis.data[f"{KILL_SWITCH_PREFIX}:active"] = "1"
        active = await kill_switch.is_active()
        assert active is True


class TestKillSwitchTrigger:
    """Test kill switch trigger functionality."""

    @pytest.mark.asyncio
    async def test_trigger_sets_all_keys(self, kill_switch, mock_redis):
        """Triggering should set all required Redis keys."""
        status = await kill_switch.trigger(
            reason="Test trigger",
            triggered_by="unit-test",
        )

        assert status.active is True
        assert mock_redis.data[f"{KILL_SWITCH_PREFIX}:active"] == "1"
        assert mock_redis.data[f"{KILL_SWITCH_PREFIX}:reason"] == "Test trigger"
        assert mock_redis.data[f"{KILL_SWITCH_PREFIX}:triggered_by"] == "unit-test"
        assert f"{KILL_SWITCH_PREFIX}:triggered_at" in mock_redis.data

    @pytest.mark.asyncio
    async def test_trigger_returns_correct_status(self, kill_switch):
        """Trigger should return correct status object."""
        status = await kill_switch.trigger(
            reason="Max drawdown exceeded",
            triggered_by="risk-service",
        )

        assert status.active is True
        assert status.reason == "Max drawdown exceeded"
        assert status.triggered_by == "risk-service"
        assert status.triggered_at is not None
        assert isinstance(status.triggered_at, datetime)

    @pytest.mark.asyncio
    async def test_trigger_logs_event(self, kill_switch, mock_redis):
        """Trigger should log the event to Redis list."""
        await kill_switch.trigger(
            reason="Test event logging",
            triggered_by="test",
        )

        events_key = f"{KILL_SWITCH_PREFIX}:events"
        assert events_key in mock_redis.lists
        assert len(mock_redis.lists[events_key]) == 1


class TestKillSwitchReset:
    """Test kill switch reset functionality."""

    @pytest.mark.asyncio
    async def test_reset_when_not_active(self, kill_switch):
        """Reset when not active should succeed without error."""
        success, status = await kill_switch.reset(
            reason="Test reset",
            reset_by="operator",
        )

        assert success is True
        assert status.active is False

    @pytest.mark.asyncio
    async def test_reset_clears_all_keys(self, kill_switch, mock_redis):
        """Reset should clear all kill switch keys."""
        # First trigger
        await kill_switch.trigger(reason="Trigger first", triggered_by="test")

        # Then reset
        success, status = await kill_switch.reset(
            reason="Issue resolved",
            reset_by="operator",
        )

        assert success is True
        assert status.active is False
        assert mock_redis.data[f"{KILL_SWITCH_PREFIX}:active"] == "0"

    @pytest.mark.asyncio
    async def test_reset_logs_event(self, kill_switch, mock_redis):
        """Reset should log the event to Redis list."""
        await kill_switch.trigger(reason="Trigger", triggered_by="test")
        await kill_switch.reset(reason="Reset", reset_by="operator")

        events_key = f"{KILL_SWITCH_PREFIX}:events"
        assert events_key in mock_redis.lists
        assert len(mock_redis.lists[events_key]) == 2  # trigger + reset


class TestKillSwitchStatus:
    """Test kill switch status retrieval."""

    @pytest.mark.asyncio
    async def test_get_status_when_inactive(self, kill_switch):
        """Get status should return inactive when not triggered."""
        status = await kill_switch.get_status()

        assert status.active is False
        assert status.triggered_at is None
        assert status.reason is None
        assert status.source == "redis"

    @pytest.mark.asyncio
    async def test_get_status_when_active(self, kill_switch):
        """Get status should return full details when active."""
        await kill_switch.trigger(
            reason="Testing status",
            triggered_by="test-service",
        )

        status = await kill_switch.get_status()

        assert status.active is True
        assert status.reason == "Testing status"
        assert status.triggered_by == "test-service"
        assert status.triggered_at is not None

    @pytest.mark.asyncio
    async def test_status_to_dict(self, kill_switch):
        """Status should be serializable to dict."""
        await kill_switch.trigger(reason="Test", triggered_by="test")
        status = await kill_switch.get_status()

        status_dict = status.to_dict()

        assert isinstance(status_dict, dict)
        assert "active" in status_dict
        assert "triggered_at" in status_dict
        assert "reason" in status_dict
        assert status_dict["active"] is True


class TestKillSwitchFailSafe:
    """Test fail-safe behavior when Redis is unavailable."""

    @pytest.mark.asyncio
    async def test_is_active_fails_safe_on_redis_error(self):
        """is_active should return True when Redis fails (fail safe)."""
        # Create kill switch without Redis
        ks = DistributedKillSwitch(
            redis_url="redis://nonexistent:6379",
            service_name="test",
        )

        # Mock Redis to raise error
        mock_redis = AsyncMock()
        mock_redis.get.side_effect = Exception("Connection refused")
        ks._redis = mock_redis

        active = await ks.is_active()
        assert active is True  # Fail safe

    @pytest.mark.asyncio
    async def test_get_status_fails_safe_on_redis_error(self):
        """get_status should return active status when Redis fails."""
        ks = DistributedKillSwitch(
            redis_url="redis://nonexistent:6379",
            service_name="test",
        )

        mock_redis = AsyncMock()
        mock_redis.pipeline.side_effect = Exception("Connection refused")
        ks._redis = mock_redis

        status = await ks.get_status()

        assert status.active is True
        assert status.source == "error_fallback"
        assert "error" in status.reason.lower() if status.reason else True


class TestKillSwitchConvenienceMethods:
    """Test convenience methods."""

    @pytest.mark.asyncio
    async def test_check_and_raise_when_inactive(self, kill_switch):
        """check_and_raise should not raise when inactive."""
        # Should not raise
        await kill_switch.check_and_raise("test operation")

    @pytest.mark.asyncio
    async def test_check_and_raise_when_active(self, kill_switch):
        """check_and_raise should raise when active."""
        await kill_switch.trigger(reason="Testing raise", triggered_by="test")

        with pytest.raises(KillSwitchActiveError) as exc_info:
            await kill_switch.check_and_raise("order submission")

        assert "order submission" in str(exc_info.value)
        assert "Testing raise" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_can_trade_when_inactive(self, kill_switch):
        """can_trade should return (True, None) when inactive."""
        can_trade, reason = await kill_switch.can_trade()

        assert can_trade is True
        assert reason is None

    @pytest.mark.asyncio
    async def test_can_trade_when_active(self, kill_switch):
        """can_trade should return (False, reason) when active."""
        await kill_switch.trigger(reason="Max loss exceeded", triggered_by="test")

        can_trade, reason = await kill_switch.can_trade()

        assert can_trade is False
        assert reason is not None
        assert "Max loss exceeded" in reason or "active" in reason.lower()


class TestKillSwitchCrossService:
    """Test kill switch works across service boundaries."""

    @pytest.mark.asyncio
    async def test_trigger_in_one_visible_in_another(self, mock_redis):
        """Kill switch triggered by one service should be visible to another."""
        # Service 1 triggers
        ks1 = DistributedKillSwitch(service_name="risk-service")
        ks1._redis = mock_redis
        ks1._owned_client = True

        await ks1.trigger(
            reason="Risk breach",
            triggered_by="risk-service",
        )

        # Service 2 checks
        ks2 = DistributedKillSwitch(service_name="execution-service")
        ks2._redis = mock_redis
        ks2._owned_client = True

        active = await ks2.is_active()
        assert active is True

        status = await ks2.get_status()
        assert status.reason == "Risk breach"
        assert status.triggered_by == "risk-service"

    @pytest.mark.asyncio
    async def test_reset_by_one_clears_for_all(self, mock_redis):
        """Kill switch reset by one service should clear for all."""
        ks1 = DistributedKillSwitch(service_name="risk-service")
        ks1._redis = mock_redis
        ks1._owned_client = True

        ks2 = DistributedKillSwitch(service_name="ops-service")
        ks2._redis = mock_redis
        ks2._owned_client = True

        # Risk service triggers
        await ks1.trigger(reason="Emergency", triggered_by="risk-service")

        # Both see it as active
        assert await ks1.is_active() is True
        assert await ks2.is_active() is True

        # Ops service resets
        await ks2.reset(reason="Issue resolved", reset_by="operator")

        # Both see it as inactive
        assert await ks1.is_active() is False
        assert await ks2.is_active() is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
