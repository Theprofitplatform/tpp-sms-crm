"""
Idempotency handling for Signal Service.

Ensures signal generation requests are idempotent - same request
produces same signal without re-computation.
"""
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Any
import asyncpg

from dataclasses import dataclass


@dataclass
class IdempotencyRecord:
    """Record of a processed idempotent request."""
    idempotency_key: str
    request_hash: str
    response_data: dict
    created_at: datetime
    expires_at: datetime


class SignalIdempotencyHandler:
    """
    Handles idempotency for signal generation requests.

    Prevents duplicate signal generation when same request is retried.
    """

    def __init__(self, db_pool: asyncpg.Pool, ttl_hours: int = 24):
        self.db_pool = db_pool
        self.ttl_hours = ttl_hours

    def _hash_request(self, request_data: dict) -> str:
        """Generate hash of request for comparison."""
        # Normalize and hash
        normalized = json.dumps(request_data, sort_keys=True, default=str)
        return hashlib.sha256(normalized.encode()).hexdigest()[:32]

    async def check_idempotency(
        self,
        idempotency_key: str,
        request_data: dict
    ) -> Optional[dict]:
        """
        Check if request was already processed.

        Returns cached response if found, None otherwise.
        """
        if not idempotency_key:
            return None

        request_hash = self._hash_request(request_data)

        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT response_data, request_hash, expires_at
                FROM signal_idempotency
                WHERE idempotency_key = $1
                AND expires_at > NOW()
            """, idempotency_key)

            if row:
                # Verify request hash matches (detect different request with same key)
                if row['request_hash'] != request_hash:
                    raise ValueError(
                        f"Idempotency key {idempotency_key} already used with different request"
                    )
                return json.loads(row['response_data'])

            return None

    async def store_response(
        self,
        idempotency_key: str,
        request_data: dict,
        response_data: dict
    ) -> None:
        """Store response for future idempotency checks."""
        if not idempotency_key:
            return

        request_hash = self._hash_request(request_data)
        expires_at = datetime.utcnow() + timedelta(hours=self.ttl_hours)

        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO signal_idempotency
                    (idempotency_key, request_hash, response_data, expires_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (idempotency_key) DO UPDATE SET
                    response_data = $3,
                    expires_at = $4
            """, idempotency_key, request_hash, json.dumps(response_data), expires_at)

    async def cleanup_expired(self) -> int:
        """Remove expired idempotency records. Returns count deleted."""
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM signal_idempotency
                WHERE expires_at < NOW()
            """)
            # Parse "DELETE n" to get count
            return int(result.split()[-1]) if result else 0


async def with_idempotency(
    handler: SignalIdempotencyHandler,
    idempotency_key: str,
    request_data: dict,
    operation: callable
) -> dict:
    """
    Execute operation with idempotency guarantee.

    If same idempotency_key was used before, returns cached result.
    Otherwise executes operation and caches result.
    """
    # Check for cached response
    cached = await handler.check_idempotency(idempotency_key, request_data)
    if cached is not None:
        cached['_cached'] = True
        return cached

    # Execute operation
    result = await operation()

    # Store for future requests
    await handler.store_response(idempotency_key, request_data, result)

    result['_cached'] = False
    return result
