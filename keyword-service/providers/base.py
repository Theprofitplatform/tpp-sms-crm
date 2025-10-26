"""Base provider with rate limiting and caching."""
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Any
from functools import wraps
from database import get_db
from models import Cache, AuditLog


class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, rpm: int):
        self.rpm = rpm
        self.tokens = rpm
        self.last_update = time.time()
        self.lock = False
    
    def acquire(self):
        """Acquire a token, blocking if necessary."""
        while True:
            now = time.time()
            elapsed = now - self.last_update
            self.tokens = min(self.rpm, self.tokens + elapsed * (self.rpm / 60.0))
            self.last_update = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return
            
            # Wait for next token
            wait_time = (1 - self.tokens) * (60.0 / self.rpm)
            time.sleep(wait_time)


class BaseProvider:
    """Base provider with common functionality."""
    
    def __init__(self, name: str, rpm: int = 60):
        self.name = name
        self.rate_limiter = RateLimiter(rpm)
    
    def _make_cache_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments."""
        key_data = f"{self.name}:{args}:{sorted(kwargs.items())}"
        return hashlib.sha256(key_data.encode()).hexdigest()
    
    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """Get cached value if not expired."""
        with get_db() as db:
            cache_entry = db.query(Cache).filter(
                Cache.cache_key == cache_key,
                Cache.expires_at > datetime.utcnow()
            ).first()
            
            if cache_entry:
                return json.loads(cache_entry.value)
        return None
    
    def _set_cache(self, cache_key: str, value: Any, ttl_hours: int = 168):
        """Set cache value with TTL."""
        with get_db() as db:
            expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
            cache_entry = Cache(
                cache_key=cache_key,
                value=json.dumps(value),
                expires_at=expires_at
            )
            db.merge(cache_entry)
            db.commit()
    
    def _log_request(self, project_id: Optional[int], operation: str, 
                     status: str, **metadata):
        """Log API request to audit trail."""
        with get_db() as db:
            log = AuditLog(
                project_id=project_id,
                operation=operation,
                data_source=self.name,
                status=status,
                metadata=metadata
            )
            db.add(log)
            db.commit()

    @staticmethod
    def with_retry(max_retries: int = 3, backoff_factor: float = 2.0):
        """Decorator for retry with exponential backoff."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                for attempt in range(max_retries):
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise
                        wait_time = backoff_factor ** attempt
                        # Add jitter
                        import random
                        wait_time *= (0.5 + random.random())
                        print(f"Retry {attempt + 1}/{max_retries} after {wait_time:.2f}s: {e}")
                        time.sleep(wait_time)
            return wrapper
        return decorator
