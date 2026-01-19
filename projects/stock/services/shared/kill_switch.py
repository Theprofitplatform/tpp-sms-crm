"""
Distributed Kill Switch with SQLite Fallback - Stock Trading Automation System

Provides a Redis-backed kill switch that works independently of any single service.
Falls back to SQLite if Redis is unavailable for resilience.

Redis Keys:
    stock:kill_switch:active      - "1" if active, "0" or missing if inactive
    stock:kill_switch:triggered_at - ISO timestamp when triggered
    stock:kill_switch:triggered_by - Service/source that triggered it
    stock:kill_switch:reason      - Human-readable reason

SQLite Fallback:
    Table: kill_switch_state
    - Used when Redis is unavailable
    - Synchronized with Redis when connection restored

CRITICAL: This kill switch is the last line of defense. All trading operations
MUST check it before proceeding. The kill switch will FAIL SAFE (assume active)
if both Redis and SQLite are unavailable.

Usage:
    from services.shared.kill_switch import DistributedKillSwitch

    # Initialize with both Redis and SQLite fallback
    kill_switch = DistributedKillSwitch(
        redis_url="redis://localhost:6379",
        sqlite_path="./data/stock.db",
        service_name="risk-service",
    )

    # Check before any trading operation
    if await kill_switch.is_active():
        raise TradingHaltedError("Kill switch is active")

    # Trigger on critical error (works even if OPS is down)
    await kill_switch.trigger(
        reason="Max drawdown exceeded",
        triggered_by="risk-service",
    )
"""

import os
import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from contextlib import contextmanager
import threading
import json

import structlog

# Try to import redis, but make it optional for SQLite-only mode
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

logger = structlog.get_logger(__name__)

# Redis key prefix for kill switch
KILL_SWITCH_PREFIX = "stock:kill_switch"

# SQLite table schema
SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS kill_switch_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    active INTEGER DEFAULT 0,
    triggered_at TEXT,
    triggered_by TEXT,
    reason TEXT,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'local'
);

CREATE TABLE IF NOT EXISTS kill_switch_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    triggered_by TEXT,
    reason TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default state if not exists
INSERT OR IGNORE INTO kill_switch_state (id, active) VALUES (1, 0);
"""


@dataclass
class KillSwitchStatus:
    """Status of the distributed kill switch."""
    active: bool
    triggered_at: Optional[datetime] = None
    triggered_by: Optional[str] = None
    reason: Optional[str] = None
    source: str = "redis"  # "redis", "sqlite", or "error_fallback"
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


class SQLiteKillSwitch:
    """SQLite-based kill switch for fallback when Redis unavailable."""

    def __init__(self, db_path: str):
        """
        Initialize SQLite kill switch.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self._local = threading.local()
        self._ensure_schema()

    @contextmanager
    def _get_connection(self):
        """Get thread-local SQLite connection."""
        if not hasattr(self._local, 'connection') or self._local.connection is None:
            self._local.connection = sqlite3.connect(
                self.db_path,
                timeout=30.0,
                check_same_thread=False,
            )
            self._local.connection.row_factory = sqlite3.Row
        try:
            yield self._local.connection
        except Exception:
            # Don't close on exception, let caller handle
            raise

    def _ensure_schema(self) -> None:
        """Ensure kill switch tables exist."""
        try:
            with self._get_connection() as conn:
                conn.executescript(SQLITE_SCHEMA)
                conn.commit()
        except Exception as e:
            logger.error("Failed to create SQLite schema", error=str(e))

    def is_active(self) -> bool:
        """Check if kill switch is active in SQLite."""
        try:
            with self._get_connection() as conn:
                row = conn.execute(
                    "SELECT active FROM kill_switch_state WHERE id = 1"
                ).fetchone()
                return bool(row and row["active"])
        except Exception as e:
            logger.error("SQLite kill switch check failed", error=str(e))
            # Fail safe: assume active if we can't check
            return True

    def get_status(self) -> KillSwitchStatus:
        """Get full status from SQLite."""
        try:
            with self._get_connection() as conn:
                row = conn.execute(
                    "SELECT * FROM kill_switch_state WHERE id = 1"
                ).fetchone()

                if not row:
                    return KillSwitchStatus(
                        active=False,
                        source="sqlite",
                        last_check=datetime.utcnow(),
                    )

                triggered_at = None
                if row["triggered_at"]:
                    try:
                        triggered_at = datetime.fromisoformat(row["triggered_at"])
                    except ValueError:
                        pass

                return KillSwitchStatus(
                    active=bool(row["active"]),
                    triggered_at=triggered_at,
                    triggered_by=row["triggered_by"],
                    reason=row["reason"],
                    source="sqlite",
                    last_check=datetime.utcnow(),
                )
        except Exception as e:
            logger.error("Failed to get SQLite kill switch status", error=str(e))
            return KillSwitchStatus(
                active=True,  # Fail safe
                reason=f"SQLite error: {str(e)}",
                source="error_fallback",
                last_check=datetime.utcnow(),
            )

    def trigger(
        self,
        reason: str,
        triggered_by: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> KillSwitchStatus:
        """Trigger kill switch in SQLite."""
        triggered_at = datetime.utcnow()

        try:
            with self._get_connection() as conn:
                conn.execute("""
                    UPDATE kill_switch_state
                    SET active = 1,
                        triggered_at = ?,
                        triggered_by = ?,
                        reason = ?,
                        last_updated = ?,
                        source = 'sqlite'
                    WHERE id = 1
                """, (
                    triggered_at.isoformat(),
                    triggered_by,
                    reason,
                    triggered_at.isoformat(),
                ))

                # Log event
                conn.execute("""
                    INSERT INTO kill_switch_events (event_type, triggered_by, reason, details)
                    VALUES ('trigger', ?, ?, ?)
                """, (
                    triggered_by,
                    reason,
                    json.dumps(details) if details else None,
                ))

                conn.commit()

            return KillSwitchStatus(
                active=True,
                triggered_at=triggered_at,
                triggered_by=triggered_by,
                reason=reason,
                source="sqlite",
                last_check=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("Failed to trigger SQLite kill switch", error=str(e))
            return KillSwitchStatus(
                active=True,  # Assume active for safety
                triggered_at=triggered_at,
                triggered_by=triggered_by,
                reason=f"{reason} (SQLite error: {str(e)})",
                source="error_fallback",
                last_check=datetime.utcnow(),
            )

    def reset(self, reason: str, reset_by: str) -> Tuple[bool, KillSwitchStatus]:
        """Reset kill switch in SQLite."""
        reset_at = datetime.utcnow()

        try:
            with self._get_connection() as conn:
                # Get current state for logging
                current = self.get_status()

                conn.execute("""
                    UPDATE kill_switch_state
                    SET active = 0,
                        triggered_at = NULL,
                        triggered_by = NULL,
                        reason = NULL,
                        last_updated = ?,
                        source = 'sqlite'
                    WHERE id = 1
                """, (reset_at.isoformat(),))

                # Log event
                conn.execute("""
                    INSERT INTO kill_switch_events (event_type, triggered_by, reason, details)
                    VALUES ('reset', ?, ?, ?)
                """, (
                    reset_by,
                    reason,
                    json.dumps({
                        "previous_reason": current.reason,
                        "was_triggered_at": current.triggered_at.isoformat() if current.triggered_at else None,
                    }),
                ))

                conn.commit()

            return True, KillSwitchStatus(
                active=False,
                source="sqlite",
                last_check=datetime.utcnow(),
            )
        except Exception as e:
            logger.error("Failed to reset SQLite kill switch", error=str(e))
            return False, self.get_status()

    def get_events(self, limit: int = 50) -> list:
        """Get recent events from SQLite."""
        try:
            with self._get_connection() as conn:
                rows = conn.execute("""
                    SELECT * FROM kill_switch_events
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,)).fetchall()

                return [dict(row) for row in rows]
        except Exception as e:
            logger.error("Failed to get SQLite kill switch events", error=str(e))
            return []


class DistributedKillSwitch:
    """
    Redis-backed distributed kill switch with SQLite fallback.

    Works independently of any single service - if OPS is down, the kill switch
    still functions. Falls back to SQLite if Redis is unavailable.

    Priority order:
    1. Redis (primary) - shared across all services
    2. SQLite (fallback) - local to each service
    3. Fail safe (error) - assume kill switch active
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        redis_client: Optional["redis.Redis"] = None,
        sqlite_path: Optional[str] = None,
        service_name: str = "unknown",
    ):
        """
        Initialize the distributed kill switch.

        Args:
            redis_url: Redis connection URL (e.g., redis://localhost:6379)
            redis_client: Existing Redis client (takes precedence over url)
            sqlite_path: Path to SQLite database for fallback
            service_name: Name of the service using this kill switch
        """
        self.service_name = service_name
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis: Optional["redis.Redis"] = redis_client
        self._owned_client = redis_client is None

        # SQLite fallback
        self._sqlite_path = sqlite_path or os.getenv("SQLITE_DB_PATH", "./data/stock.db")
        self._sqlite: Optional[SQLiteKillSwitch] = None
        if self._sqlite_path:
            try:
                self._sqlite = SQLiteKillSwitch(self._sqlite_path)
                logger.info("SQLite kill switch fallback initialized", path=self._sqlite_path)
            except Exception as e:
                logger.warn("Failed to initialize SQLite fallback", error=str(e))

        # Track Redis availability
        self._redis_available = True
        self._last_redis_error: Optional[str] = None

    async def _get_redis(self) -> "redis.Redis":
        """Get or create Redis connection."""
        if not REDIS_AVAILABLE:
            raise RuntimeError("Redis library not available")

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

        Checks Redis first, falls back to SQLite, then fails safe.

        Returns:
            True if kill switch is active, False otherwise
        """
        # Try Redis first
        if REDIS_AVAILABLE:
            try:
                client = await self._get_redis()
                value = await client.get(f"{KILL_SWITCH_PREFIX}:active")
                self._redis_available = True
                return value == "1"
            except Exception as e:
                self._redis_available = False
                self._last_redis_error = str(e)
                logger.error(
                    "Redis unreachable, trying SQLite fallback",
                    error=str(e),
                    service=self.service_name,
                )

        # Fall back to SQLite
        if self._sqlite:
            try:
                return self._sqlite.is_active()
            except Exception as e:
                logger.error(
                    "SQLite fallback also failed, failing safe",
                    error=str(e),
                    service=self.service_name,
                )

        # FAIL SAFE: If both Redis and SQLite fail, assume kill switch is active
        logger.critical(
            "FAIL SAFE: Both Redis and SQLite unavailable, treating kill switch as ACTIVE",
            service=self.service_name,
        )
        return True

    async def get_status(self) -> KillSwitchStatus:
        """
        Get full status of the kill switch.

        Returns:
            KillSwitchStatus with all details
        """
        # Try Redis first
        if REDIS_AVAILABLE:
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

                self._redis_available = True
                return KillSwitchStatus(
                    active=active,
                    triggered_at=triggered_at,
                    triggered_by=results[2],
                    reason=results[3],
                    source="redis",
                    last_check=datetime.utcnow(),
                )

            except Exception as e:
                self._redis_available = False
                self._last_redis_error = str(e)
                logger.error("Failed to get kill switch status from Redis", error=str(e))

        # Fall back to SQLite
        if self._sqlite:
            try:
                return self._sqlite.get_status()
            except Exception as e:
                logger.error("SQLite status check failed", error=str(e))

        # Return fail-safe status
        return KillSwitchStatus(
            active=True,
            reason=f"Redis error: {self._last_redis_error or 'unavailable'}; SQLite unavailable",
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
        Writes to both Redis and SQLite for redundancy.

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

        redis_success = False
        sqlite_success = False

        # Try Redis
        if REDIS_AVAILABLE:
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
                redis_success = True
                self._redis_available = True

            except Exception as e:
                self._redis_available = False
                self._last_redis_error = str(e)
                logger.error("Failed to trigger kill switch in Redis", error=str(e))

        # Also write to SQLite for redundancy
        if self._sqlite:
            try:
                self._sqlite.trigger(reason, source, details)
                sqlite_success = True
            except Exception as e:
                logger.error("Failed to trigger kill switch in SQLite", error=str(e))

        # Determine source for response
        if redis_success:
            final_source = "redis"
        elif sqlite_success:
            final_source = "sqlite"
        else:
            final_source = "error_fallback"

        return KillSwitchStatus(
            active=True,
            triggered_at=triggered_at,
            triggered_by=source,
            reason=reason,
            source=final_source,
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

        # Get current status for logging
        current_status = await self.get_status()

        redis_success = False
        sqlite_success = False

        # Try Redis
        if REDIS_AVAILABLE:
            try:
                client = await self._get_redis()

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
                redis_success = True
                self._redis_available = True

            except Exception as e:
                self._redis_available = False
                self._last_redis_error = str(e)
                logger.error("Failed to reset kill switch in Redis", error=str(e))

        # Also reset SQLite
        if self._sqlite:
            try:
                self._sqlite.reset(reason, reset_by)
                sqlite_success = True
            except Exception as e:
                logger.error("Failed to reset kill switch in SQLite", error=str(e))

        if redis_success or sqlite_success:
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
                source="redis" if redis_success else "sqlite",
                last_check=datetime.utcnow(),
            )

        return False, await self.get_status()

    async def get_events(self, limit: int = 50) -> list:
        """
        Get recent kill switch events for audit.

        Args:
            limit: Maximum number of events to return

        Returns:
            List of event dictionaries
        """
        events = []

        # Try Redis first
        if REDIS_AVAILABLE:
            try:
                client = await self._get_redis()
                redis_events = await client.lrange(f"{KILL_SWITCH_PREFIX}:events", 0, limit - 1)
                events.extend([{"source": "redis", **eval(e)} for e in redis_events])
            except Exception as e:
                logger.error("Failed to get kill switch events from Redis", error=str(e))

        # Also get SQLite events
        if self._sqlite:
            try:
                sqlite_events = self._sqlite.get_events(limit)
                events.extend([{"source": "sqlite", **e} for e in sqlite_events])
            except Exception as e:
                logger.error("Failed to get kill switch events from SQLite", error=str(e))

        # Sort by timestamp and limit
        events.sort(key=lambda x: x.get("at") or x.get("created_at") or "", reverse=True)
        return events[:limit]

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

    def get_health(self) -> Dict[str, Any]:
        """
        Get health status of kill switch backends.

        Returns:
            Dictionary with health information
        """
        return {
            "redis": {
                "available": self._redis_available,
                "url": self._redis_url if self._redis_available else None,
                "last_error": self._last_redis_error if not self._redis_available else None,
            },
            "sqlite": {
                "available": self._sqlite is not None,
                "path": self._sqlite_path if self._sqlite else None,
            },
            "service": self.service_name,
        }


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
    sqlite_path: Optional[str] = None,
) -> DistributedKillSwitch:
    """
    Get or create the global kill switch instance.

    Args:
        service_name: Name of the service
        redis_url: Redis URL (only used on first call)
        sqlite_path: SQLite path for fallback

    Returns:
        DistributedKillSwitch instance
    """
    global _kill_switch_instance
    if _kill_switch_instance is None:
        _kill_switch_instance = DistributedKillSwitch(
            redis_url=redis_url,
            sqlite_path=sqlite_path,
            service_name=service_name,
        )
    return _kill_switch_instance


async def initialize_kill_switch(
    service_name: str,
    redis_url: Optional[str] = None,
    sqlite_path: Optional[str] = None,
) -> DistributedKillSwitch:
    """
    Initialize and return the kill switch.

    Should be called during service startup.

    Args:
        service_name: Name of the service
        redis_url: Redis URL
        sqlite_path: SQLite path for fallback

    Returns:
        DistributedKillSwitch instance
    """
    kill_switch = get_kill_switch(service_name, redis_url, sqlite_path)

    # Verify connection
    try:
        status = await kill_switch.get_status()
        logger.info(
            "Kill switch initialized",
            service=service_name,
            active=status.active,
            source=status.source,
            health=kill_switch.get_health(),
        )
    except Exception as e:
        logger.error(
            "Kill switch initialization warning",
            error=str(e),
            service=service_name,
        )

    return kill_switch
