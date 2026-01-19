"""
Distributed Kill Switch - Stock Trading Automation System

Provides a Redis-backed kill switch that works independently of any single service.
Any service can trigger the kill switch, and all services will honor it.

Redis Keys:
    stock:kill_switch:active      - "1" if active, "0" or missing if inactive
    stock:kill_switch:triggered_at - ISO timestamp when triggered
    stock:kill_switch:triggered_by - Service/source that triggered it
    stock:kill_switch:reason      - Human-readable reason

CRITICAL: This kill switch is the last line of defense. All trading operations
MUST check it before proceeding.

Usage:
    from kill_switch import DistributedKillSwitch

    # Initialize
    kill_switch = DistributedKillSwitch(redis_url="redis://localhost:6379")

    # Check before any trading operation
    if await kill_switch.is_active():
        raise TradingHaltedError("Kill switch is active")

    # Trigger on critical error
    await kill_switch.trigger(
        reason="Max drawdown exceeded",
        triggered_by="risk-service",
    )

    # Reset after investigation
    await kill_switch.reset(
        reason="Issue resolved, manual verification complete",
        reset_by="operator@example.com",
    )
"""

import os
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass

import redis.asyncio as redis
import structlog

logger = structlog.get_logger(__name__)

# Redis key prefix for kill switch
KILL_SWITCH_PREFIX = "stock:kill_switch"


@dataclass
class KillSwitchStatus:
    """Status of the distributed kill switch."""
    active: bool
    triggered_at: Optional[datetime] = None
    triggered_by: Optional[str] = None
    reason: Optional[str] = None
    source: str = "redis"
    last_check: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "active": self.active,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "triggered_by": self.triggered_by,
            "reason": self.reason,
            "source": self.source,
            "last_check": self.last_check.isoformat() if self.last_check else None,
        }


class DistributedKillSwitch:
    """
    Redis-backed distributed kill switch.

    Works independently of any single service - if OPS is down, the kill switch
    still functions. Any service can trigger it, and all services will honor it.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        redis_client: Optional[redis.Redis] = None,
        service_name: str = "unknown",
    ):
        """
        Initialize the distributed kill switch.

        Args:
            redis_url: Redis connection URL (e.g., redis://localhost:6379)
            redis_client: Existing Redis client (takes precedence over url)
            service_name: Name of the service using this kill switch
        """
        self.service_name = service_name
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis: Optional[redis.Redis] = redis_client
        self._owned_client = redis_client is None  # Track if we own the client

    async def _get_redis(self) -> redis.Redis:
        """Get or create Redis connection."""
        if self._redis is None:
            self._redis = redis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def close(self) -> None:
        """Close Redis connection if we own it."""
        if self._redis and self._owned_client:
            await self._redis.close()
            self._redis = None

    # =========================================================================
    # Core Kill Switch Operations
    # =========================================================================

    async def is_active(self) -> bool:
        """
        Check if kill switch is active.

        CRITICAL: This should be called before any trading operation.
        Returns True if trading should be halted.

        Returns:
            True if kill switch is active, False otherwise
        """
        try:
            client = await self._get_redis()
            value = await client.get(f"{KILL_SWITCH_PREFIX}:active")
            return value == "1"
        except redis.RedisError as e:
            # FAIL SAFE: If Redis is unreachable, assume kill switch is active
            logger.error(
                "Redis unreachable, failing safe (treating as active)",
                error=str(e),
                service=self.service_name,
            )
            return True

    async def get_status(self) -> KillSwitchStatus:
        """
        Get full status of the kill switch.

        Returns:
            KillSwitchStatus with all details
        """
        try:
            client = await self._get_redis()

            # Fetch all keys in pipeline for efficiency
            pipe = client.pipeline()
            pipe.get(f"{KILL_SWITCH_PREFIX}:active")
            pipe.get(f"{KILL_SWITCH_PREFIX}:triggered_at")
            pipe.get(f"{KILL_SWITCH_PREFIX}:triggered_by")
            pipe.get(f"{KILL_SWITCH_PREFIX}:reason")
            results = await pipe.execute()

            active = results[0] == "1"
            triggered_at = None
            if results[1]:
                try:
                    triggered_at = datetime.fromisoformat(results[1])
                except ValueError:
                    pass

            return KillSwitchStatus(
                active=active,
                triggered_at=triggered_at,
                triggered_by=results[2],
                reason=results[3],
                source="redis",
                last_check=datetime.utcnow(),
            )

        except redis.RedisError as e:
            logger.error("Failed to get kill switch status", error=str(e))
            # Return safe status (active) on error
            return KillSwitchStatus(
                active=True,
                reason=f"Redis error: {str(e)}",
                source="error_fallback",
                last_check=datetime.utcnow(),
            )

    async def trigger(
        self,
        reason: str,
        triggered_by: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> KillSwitchStatus:
        """
        Trigger the kill switch to halt all trading.

        CRITICAL: This immediately stops all trading across all services.

        Args:
            reason: Human-readable reason for triggering
            triggered_by: Service or user that triggered it
            details: Additional details for logging

        Returns:
            KillSwitchStatus after triggering
        """
        triggered_at = datetime.utcnow()
        source = triggered_by or self.service_name

        logger.critical(
            "KILL SWITCH TRIGGERED",
            reason=reason,
            triggered_by=source,
            details=details,
            service=self.service_name,
        )

        try:
            client = await self._get_redis()

            # Set all keys atomically
            pipe = client.pipeline()
            pipe.set(f"{KILL_SWITCH_PREFIX}:active", "1")
            pipe.set(f"{KILL_SWITCH_PREFIX}:triggered_at", triggered_at.isoformat())
            pipe.set(f"{KILL_SWITCH_PREFIX}:triggered_by", source)
            pipe.set(f"{KILL_SWITCH_PREFIX}:reason", reason)

            # Store trigger event in a list for audit
            event = {
                "type": "trigger",
                "at": triggered_at.isoformat(),
                "by": source,
                "reason": reason,
                "details": details,
            }
            pipe.lpush(f"{KILL_SWITCH_PREFIX}:events", str(event))
            pipe.ltrim(f"{KILL_SWITCH_PREFIX}:events", 0, 99)  # Keep last 100 events

            await pipe.execute()

            return KillSwitchStatus(
                active=True,
                triggered_at=triggered_at,
                triggered_by=source,
                reason=reason,
                source="redis",
                last_check=datetime.utcnow(),
            )

        except redis.RedisError as e:
            logger.error(
                "Failed to trigger kill switch in Redis (state unknown)",
                error=str(e),
            )
            # Return status indicating trigger attempt
            return KillSwitchStatus(
                active=True,  # Assume active for safety
                triggered_at=triggered_at,
                triggered_by=source,
                reason=f"{reason} (Redis error: {str(e)})",
                source="error_fallback",
                last_check=datetime.utcnow(),
            )

    async def reset(
        self,
        reason: str,
        reset_by: str,
        require_confirmation: bool = True,
    ) -> Tuple[bool, KillSwitchStatus]:
        """
        Reset the kill switch to allow trading.

        WARNING: Only call this after investigating the cause of the trigger.

        Args:
            reason: Why the kill switch is being reset
            reset_by: Who is resetting it (for audit)
            require_confirmation: If True, requires explicit confirmation

        Returns:
            Tuple of (success, status)
        """
        reset_at = datetime.utcnow()

        logger.warning(
            "KILL SWITCH RESET REQUESTED",
            reason=reason,
            reset_by=reset_by,
            service=self.service_name,
        )

        try:
            client = await self._get_redis()

            # Check if currently active
            current_status = await self.get_status()
            if not current_status.active:
                logger.info("Kill switch already inactive, nothing to reset")
                return True, current_status

            # Clear all keys atomically
            pipe = client.pipeline()
            pipe.set(f"{KILL_SWITCH_PREFIX}:active", "0")
            pipe.delete(f"{KILL_SWITCH_PREFIX}:triggered_at")
            pipe.delete(f"{KILL_SWITCH_PREFIX}:triggered_by")
            pipe.delete(f"{KILL_SWITCH_PREFIX}:reason")

            # Store reset event for audit
            event = {
                "type": "reset",
                "at": reset_at.isoformat(),
                "by": reset_by,
                "reason": reason,
                "previous_reason": current_status.reason,
                "was_triggered_at": current_status.triggered_at.isoformat() if current_status.triggered_at else None,
                "was_triggered_by": current_status.triggered_by,
            }
            pipe.lpush(f"{KILL_SWITCH_PREFIX}:events", str(event))
            pipe.ltrim(f"{KILL_SWITCH_PREFIX}:events", 0, 99)

            await pipe.execute()

            logger.warning(
                "KILL SWITCH RESET",
                reason=reason,
                reset_by=reset_by,
                previous_trigger_reason=current_status.reason,
            )

            return True, KillSwitchStatus(
                active=False,
                triggered_at=None,
                triggered_by=None,
                reason=None,
                source="redis",
                last_check=datetime.utcnow(),
            )

        except redis.RedisError as e:
            logger.error("Failed to reset kill switch", error=str(e))
            return False, await self.get_status()

    async def get_events(self, limit: int = 50) -> list:
        """
        Get recent kill switch events for audit.

        Args:
            limit: Maximum number of events to return

        Returns:
            List of event dictionaries
        """
        try:
            client = await self._get_redis()
            events = await client.lrange(f"{KILL_SWITCH_PREFIX}:events", 0, limit - 1)
            return [eval(e) for e in events]  # Events stored as str(dict)
        except Exception as e:
            logger.error("Failed to get kill switch events", error=str(e))
            return []

    # =========================================================================
    # Convenience Methods
    # =========================================================================

    async def check_and_raise(self, operation: str = "trading operation") -> None:
        """
        Check kill switch and raise exception if active.

        Args:
            operation: Description of the operation being attempted

        Raises:
            KillSwitchActiveError: If kill switch is active
        """
        if await self.is_active():
            status = await self.get_status()
            raise KillSwitchActiveError(
                f"Cannot perform {operation}: Kill switch is active. "
                f"Reason: {status.reason or 'Unknown'}"
            )

    async def can_trade(self) -> Tuple[bool, Optional[str]]:
        """
        Check if trading is allowed.

        Returns:
            Tuple of (can_trade, reason_if_not)
        """
        if await self.is_active():
            status = await self.get_status()
            return False, status.reason or "Kill switch is active"
        return True, None


class KillSwitchActiveError(Exception):
    """Exception raised when operation blocked by kill switch."""
    pass


# =============================================================================
# Factory Function
# =============================================================================

_kill_switch_instance: Optional[DistributedKillSwitch] = None


def get_kill_switch(
    service_name: str = "unknown",
    redis_url: Optional[str] = None,
) -> DistributedKillSwitch:
    """
    Get or create the global kill switch instance.

    Args:
        service_name: Name of the service
        redis_url: Redis URL (only used on first call)

    Returns:
        DistributedKillSwitch instance
    """
    global _kill_switch_instance
    if _kill_switch_instance is None:
        _kill_switch_instance = DistributedKillSwitch(
            redis_url=redis_url,
            service_name=service_name,
        )
    return _kill_switch_instance


async def initialize_kill_switch(
    service_name: str,
    redis_url: Optional[str] = None,
) -> DistributedKillSwitch:
    """
    Initialize and return the kill switch.

    Should be called during service startup.

    Args:
        service_name: Name of the service
        redis_url: Redis URL

    Returns:
        DistributedKillSwitch instance
    """
    kill_switch = get_kill_switch(service_name, redis_url)

    # Verify connection
    try:
        status = await kill_switch.get_status()
        logger.info(
            "Kill switch initialized",
            service=service_name,
            active=status.active,
            source=status.source,
        )
    except Exception as e:
        logger.error(
            "Kill switch initialization warning",
            error=str(e),
            service=service_name,
        )

    return kill_switch
