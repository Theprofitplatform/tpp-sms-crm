"""
Idempotency handling for Risk Service.

Provides helpers to check and store idempotency keys to prevent
duplicate request processing. Uses PostgreSQL/TimescaleDB for storage.

Usage:
    from idempotency import IdempotencyHandler

    idempotency = IdempotencyHandler(db_url)

    # Check for existing response
    cached = await idempotency.get_cached_response(key, request_hash)
    if cached:
        return cached

    # Process request...
    response = process_request()

    # Store response for future duplicate requests
    await idempotency.store_response(key, request_hash, endpoint, status, response)
"""

import os
import hashlib
import json
from typing import Optional, Any, Dict, Tuple
from datetime import datetime, timedelta

import asyncpg
import structlog

logger = structlog.get_logger(__name__)

# Database URL
DATABASE_URL = os.getenv(
    'TIMESCALEDB_URL',
    'postgresql://stock_user:stock_pass@localhost:5432/stock_db'
)

# Idempotency key TTL (24 hours)
IDEMPOTENCY_TTL_HOURS = int(os.getenv('IDEMPOTENCY_TTL_HOURS', '24'))


class IdempotencyError(Exception):
    """Base exception for idempotency errors."""
    pass


class IdempotencyKeyMismatch(IdempotencyError):
    """Raised when request hash doesn't match stored hash for same key."""
    pass


class IdempotencyHandler:
    """
    Handles idempotency key checking and storage.

    Idempotency keys allow clients to safely retry requests without
    causing duplicate processing. The key should be a unique identifier
    (UUID recommended) sent in the X-Idempotency-Key header.
    """

    def __init__(self, service_name: str = "risk"):
        """
        Initialize idempotency handler.

        Args:
            service_name: Name of the service (for logging and filtering)
        """
        self.service_name = service_name
        self._pool: Optional[asyncpg.Pool] = None

    async def get_pool(self) -> asyncpg.Pool:
        """Get or create database connection pool."""
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                DATABASE_URL,
                min_size=1,
                max_size=5,
                command_timeout=30,
            )
        return self._pool

    async def close(self):
        """Close the database connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None

    @staticmethod
    def compute_request_hash(request_data: Dict[str, Any]) -> str:
        """
        Compute SHA256 hash of request data.

        Args:
            request_data: Request body as dictionary

        Returns:
            Hex-encoded SHA256 hash
        """
        # Sort keys for consistent hashing
        canonical = json.dumps(request_data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()

    async def get_cached_response(
        self,
        idempotency_key: str,
        request_hash: str,
        endpoint: str
    ) -> Optional[Tuple[int, Dict[str, Any]]]:
        """
        Check if idempotency key exists and return cached response.

        Args:
            idempotency_key: The idempotency key from request header
            request_hash: Hash of current request body
            endpoint: API endpoint path

        Returns:
            Tuple of (status_code, response_body) if found, None otherwise

        Raises:
            IdempotencyKeyMismatch: If key exists but request hash differs
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT request_hash, response_status, response_body, expires_at
                FROM idempotency_keys
                WHERE idempotency_key = $1
                  AND service = $2
                """,
                idempotency_key,
                self.service_name
            )

            if row is None:
                return None

            # Check if expired
            if row['expires_at'] < datetime.utcnow():
                # Key expired, delete it and return None
                await conn.execute(
                    "DELETE FROM idempotency_keys WHERE idempotency_key = $1",
                    idempotency_key
                )
                logger.debug(
                    "Expired idempotency key deleted",
                    key=idempotency_key[:8] + "..."
                )
                return None

            # Check request hash matches
            if row['request_hash'] != request_hash:
                logger.warning(
                    "Idempotency key reused with different request",
                    key=idempotency_key[:8] + "...",
                    stored_hash=row['request_hash'][:8] + "...",
                    new_hash=request_hash[:8] + "..."
                )
                raise IdempotencyKeyMismatch(
                    f"Idempotency key already used with different request body. "
                    f"Use a new key for different requests."
                )

            logger.info(
                "Returning cached response for idempotency key",
                key=idempotency_key[:8] + "...",
                endpoint=endpoint
            )

            return (row['response_status'], json.loads(row['response_body']))

    async def store_response(
        self,
        idempotency_key: str,
        request_hash: str,
        endpoint: str,
        status_code: int,
        response_body: Dict[str, Any],
        ttl_hours: Optional[int] = None
    ) -> None:
        """
        Store response for idempotency key.

        Args:
            idempotency_key: The idempotency key from request header
            request_hash: Hash of request body
            endpoint: API endpoint path
            status_code: HTTP status code of response
            response_body: Response body as dictionary
            ttl_hours: Optional TTL override (default: 24 hours)
        """
        ttl = ttl_hours or IDEMPOTENCY_TTL_HOURS
        expires_at = datetime.utcnow() + timedelta(hours=ttl)

        pool = await self.get_pool()

        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO idempotency_keys
                    (idempotency_key, service, endpoint, request_hash,
                     response_status, response_body, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (idempotency_key) DO UPDATE SET
                    response_status = EXCLUDED.response_status,
                    response_body = EXCLUDED.response_body,
                    expires_at = EXCLUDED.expires_at
                """,
                idempotency_key,
                self.service_name,
                endpoint,
                request_hash,
                status_code,
                json.dumps(response_body, default=str),
                expires_at
            )

        logger.debug(
            "Stored idempotency response",
            key=idempotency_key[:8] + "...",
            endpoint=endpoint,
            status=status_code,
            expires_at=expires_at.isoformat()
        )

    async def cleanup_expired(self) -> int:
        """
        Remove expired idempotency keys.

        Returns:
            Number of keys deleted
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM idempotency_keys
                WHERE expires_at < NOW()
                  AND service = $1
                """,
                self.service_name
            )
            # Extract count from result string like "DELETE 5"
            count = int(result.split()[-1]) if result else 0

        if count > 0:
            logger.info(
                "Cleaned up expired idempotency keys",
                count=count,
                service=self.service_name
            )

        return count


# Singleton instance for the Risk service
_handler: Optional[IdempotencyHandler] = None


def get_idempotency_handler() -> IdempotencyHandler:
    """Get or create the global idempotency handler."""
    global _handler
    if _handler is None:
        _handler = IdempotencyHandler(service_name="risk")
    return _handler


async def check_idempotency(
    idempotency_key: Optional[str],
    request_data: Dict[str, Any],
    endpoint: str
) -> Optional[Tuple[int, Dict[str, Any]]]:
    """
    Convenience function to check idempotency.

    Args:
        idempotency_key: Key from X-Idempotency-Key header (None to skip)
        request_data: Request body as dictionary
        endpoint: API endpoint path

    Returns:
        Cached (status, response) tuple if found, None otherwise
    """
    if not idempotency_key:
        return None

    handler = get_idempotency_handler()
    request_hash = handler.compute_request_hash(request_data)

    return await handler.get_cached_response(idempotency_key, request_hash, endpoint)


async def store_idempotency(
    idempotency_key: Optional[str],
    request_data: Dict[str, Any],
    endpoint: str,
    status_code: int,
    response_body: Dict[str, Any]
) -> None:
    """
    Convenience function to store idempotency response.

    Args:
        idempotency_key: Key from X-Idempotency-Key header (None to skip)
        request_data: Request body as dictionary
        endpoint: API endpoint path
        status_code: HTTP status code
        response_body: Response as dictionary
    """
    if not idempotency_key:
        return

    handler = get_idempotency_handler()
    request_hash = handler.compute_request_hash(request_data)

    await handler.store_response(
        idempotency_key,
        request_hash,
        endpoint,
        status_code,
        response_body
    )
