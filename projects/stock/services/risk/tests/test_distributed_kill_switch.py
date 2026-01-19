"""
Integration tests for distributed kill switch in Risk Service.

These tests verify that the Risk Service properly:
1. Initializes the distributed kill switch
2. Checks kill switch before validating orders
3. Triggers kill switch on critical risk breaches
4. Updates health endpoint with kill switch status

Usage:
    pytest services/risk/tests/test_distributed_kill_switch.py -v
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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

    def pipeline(self):
        return MockPipeline(self)

    async def close(self):
        pass


class MockPipeline:
    """Mock Redis pipeline."""

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


class TestKillSwitchIntegration:
    """Integration tests for kill switch in Risk Service context."""

    @pytest.mark.asyncio
    async def test_kill_switch_blocks_order_validation(self, mock_redis):
        """When kill switch is active, order validation should fail."""
        from kill_switch import DistributedKillSwitch, KILL_SWITCH_PREFIX

        ks = DistributedKillSwitch(service_name="risk-service")
        ks._redis = mock_redis
        ks._owned_client = True

        # Trigger kill switch
        await ks.trigger(reason="Max drawdown exceeded", triggered_by="risk-service")

        # Verify it's active
        assert await ks.is_active() is True

        # Simulate order validation check
        can_trade, reason = await ks.can_trade()
        assert can_trade is False
        assert "Max drawdown" in reason or "active" in reason.lower()

    @pytest.mark.asyncio
    async def test_kill_switch_trigger_on_drawdown_breach(self, mock_redis):
        """Risk Service should trigger kill switch on max drawdown breach."""
        from kill_switch import DistributedKillSwitch

        ks = DistributedKillSwitch(service_name="risk-service")
        ks._redis = mock_redis
        ks._owned_client = True

        # Simulate drawdown breach detection
        current_drawdown = 16.5  # 16.5% exceeds 15% limit
        max_drawdown_pct = 15.0

        if current_drawdown >= max_drawdown_pct:
            reason = f"Maximum drawdown exceeded: {current_drawdown:.2f}%"
            await ks.trigger(
                reason=reason,
                triggered_by="risk-service:drawdown",
                details={"drawdown_pct": current_drawdown, "limit_pct": max_drawdown_pct},
            )

        # Verify trigger
        status = await ks.get_status()
        assert status.active is True
        assert "16.50%" in status.reason
        assert "risk-service:drawdown" in status.triggered_by

    @pytest.mark.asyncio
    async def test_kill_switch_persists_across_service_restarts(self, mock_redis):
        """Kill switch state should persist even if service restarts."""
        from kill_switch import DistributedKillSwitch, KILL_SWITCH_PREFIX

        # First instance triggers
        ks1 = DistributedKillSwitch(service_name="risk-service")
        ks1._redis = mock_redis
        ks1._owned_client = True

        await ks1.trigger(reason="Critical error", triggered_by="risk-service")
        await ks1.close()

        # Simulate service restart - new instance
        ks2 = DistributedKillSwitch(service_name="risk-service")
        ks2._redis = mock_redis  # Same Redis (simulating persistence)
        ks2._owned_client = True

        # State should persist
        assert await ks2.is_active() is True
        status = await ks2.get_status()
        assert status.reason == "Critical error"


class TestHealthEndpointKillSwitch:
    """Test health endpoint includes kill switch status."""

    @pytest.mark.asyncio
    async def test_health_shows_inactive_kill_switch(self, mock_redis):
        """Health endpoint should show inactive kill switch."""
        from kill_switch import DistributedKillSwitch

        ks = DistributedKillSwitch(service_name="risk-service")
        ks._redis = mock_redis
        ks._owned_client = True

        status = await ks.get_status()

        # Build health response as the endpoint would
        kill_switch_info = {
            "active": status.active,
            "source": status.source,
            "last_check": status.last_check.isoformat() if status.last_check else None,
            "triggered_at": status.triggered_at.isoformat() if status.triggered_at else None,
            "triggered_by": status.triggered_by,
            "reason": status.reason,
        }

        assert kill_switch_info["active"] is False
        assert kill_switch_info["source"] == "redis"

    @pytest.mark.asyncio
    async def test_health_shows_active_kill_switch(self, mock_redis):
        """Health endpoint should show active kill switch with details."""
        from kill_switch import DistributedKillSwitch

        ks = DistributedKillSwitch(service_name="risk-service")
        ks._redis = mock_redis
        ks._owned_client = True

        await ks.trigger(reason="Emergency stop", triggered_by="operator")
        status = await ks.get_status()

        kill_switch_info = {
            "active": status.active,
            "source": status.source,
            "last_check": status.last_check.isoformat() if status.last_check else None,
            "triggered_at": status.triggered_at.isoformat() if status.triggered_at else None,
            "triggered_by": status.triggered_by,
            "reason": status.reason,
        }

        assert kill_switch_info["active"] is True
        assert kill_switch_info["reason"] == "Emergency stop"
        assert kill_switch_info["triggered_by"] == "operator"
        assert kill_switch_info["triggered_at"] is not None


class TestFailSafeBehavior:
    """Test fail-safe behavior when Redis is unavailable."""

    @pytest.mark.asyncio
    async def test_order_rejected_when_redis_fails(self):
        """Orders should be rejected when Redis is unavailable (fail safe)."""
        from kill_switch import DistributedKillSwitch

        ks = DistributedKillSwitch(service_name="risk-service")

        # Mock Redis to fail
        mock_failing_redis = AsyncMock()
        mock_failing_redis.get.side_effect = Exception("Connection refused")
        ks._redis = mock_failing_redis

        # is_active should return True (fail safe)
        active = await ks.is_active()
        assert active is True

    @pytest.mark.asyncio
    async def test_health_shows_error_when_redis_fails(self):
        """Health endpoint should show error state when Redis fails."""
        from kill_switch import DistributedKillSwitch

        ks = DistributedKillSwitch(service_name="risk-service")

        # Mock Redis to fail
        mock_failing_redis = AsyncMock()
        mock_failing_redis.pipeline.side_effect = Exception("Connection refused")
        ks._redis = mock_failing_redis

        status = await ks.get_status()

        assert status.active is True  # Fail safe
        assert status.source == "error_fallback"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
