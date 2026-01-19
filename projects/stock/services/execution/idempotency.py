"""
Idempotency handling for Execution Service.

Provides helpers to check and store idempotency keys to prevent
duplicate order submissions. Uses PostgreSQL/TimescaleDB for storage.

This is critical for order execution to prevent:
- Duplicate orders on network retries
- Double-spending on connection timeouts
- Race conditions in concurrent requests

Usage:
    from idempotency import IdempotencyHandler

    idempotency = IdempotencyHandler()

    # Check for existing order
    cached = await idempotency.get_cached_response(key, request_hash)
    if cached:
        return cached  # Return original order result

    # Execute order...
    order = broker.submit_order(...)

    # Store order result for future retries
    await idempotency.store_response(key, request_hash, endpoint, status, order)
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


class DuplicateOrderError(IdempotencyError):
    """Raised when attempting to submit a duplicate order."""
    pass


class IdempotencyHandler:
    """
    Handles idempotency key checking and storage for order execution.

    For order submissions, the idempotency key ensures that retrying
    the same order request returns the original order result instead
    of creating a new order.

    CRITICAL: This prevents duplicate order submissions which could
    result in unintended position sizes and losses.
    """

    def __init__(self, service_name: str = "execution"):
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

        For orders, this includes symbol, side, quantity, and price
        to detect if the same idempotency key is being reused for
        a different order.

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

        For orders, this returns the original order result, preventing
        duplicate order submissions.

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
                logger.error(
                    "SECURITY: Idempotency key reused for different order!",
                    key=idempotency_key[:8] + "...",
                    stored_hash=row['request_hash'][:8] + "...",
                    new_hash=request_hash[:8] + "..."
                )
                raise IdempotencyKeyMismatch(
                    f"Idempotency key already used for a different order. "
                    f"Use a new key for different orders to prevent duplicates."
                )

            logger.info(
                "Returning cached order result for idempotency key",
                key=idempotency_key[:8] + "...",
                endpoint=endpoint,
                order_id=json.loads(row['response_body']).get('id')
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
        Store order response for idempotency key.

        Args:
            idempotency_key: The idempotency key from request header
            request_hash: Hash of request body
            endpoint: API endpoint path
            status_code: HTTP status code of response
            response_body: Order response body as dictionary
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

        order_id = response_body.get('id', 'unknown')
        logger.info(
            "Stored order idempotency",
            key=idempotency_key[:8] + "...",
            order_id=order_id,
            endpoint=endpoint,
            status=status_code
        )

    async def get_order_by_idempotency_key(
        self,
        idempotency_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get order details by idempotency key.

        Useful for checking if an order was already placed with this key.

        Args:
            idempotency_key: The idempotency key

        Returns:
            Order response body if found, None otherwise
        """
        pool = await self.get_pool()

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT response_body, expires_at
                FROM idempotency_keys
                WHERE idempotency_key = $1
                  AND service = $2
                  AND endpoint = '/api/v1/orders'
                """,
                idempotency_key,
                self.service_name
            )

            if row is None:
                return None

            if row['expires_at'] < datetime.utcnow():
                return None

            return json.loads(row['response_body'])

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
                "Cleaned up expired order idempotency keys",
                count=count
            )

        return count


# Singleton instance for the Execution service
_handler: Optional[IdempotencyHandler] = None


def get_idempotency_handler() -> IdempotencyHandler:
    """Get or create the global idempotency handler."""
    global _handler
    if _handler is None:
        _handler = IdempotencyHandler(service_name="execution")
    return _handler


async def check_idempotency(
    idempotency_key: Optional[str],
    request_data: Dict[str, Any],
    endpoint: str
) -> Optional[Tuple[int, Dict[str, Any]]]:
    """
    Convenience function to check idempotency for orders.

    CRITICAL: Always check this before submitting an order to
    prevent duplicate submissions.

    Args:
        idempotency_key: Key from X-Idempotency-Key header (None to skip)
        request_data: Order request body as dictionary
        endpoint: API endpoint path

    Returns:
        Cached (status, order) tuple if found, None otherwise
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
    Convenience function to store order idempotency.

    Args:
        idempotency_key: Key from X-Idempotency-Key header (None to skip)
        request_data: Order request body as dictionary
        endpoint: API endpoint path
        status_code: HTTP status code
        response_body: Order response as dictionary
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
