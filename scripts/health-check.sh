#!/bin/bash

# Health check script for all services

API_URL=${API_URL:-http://localhost:3000}
WORKER_URL=${WORKER_URL:-http://localhost:3002}
SHORTENER_URL=${SHORTENER_URL:-http://localhost:3003}
WEB_URL=${WEB_URL:-http://localhost:3001}

echo "Checking service health..."

# Check API
if curl -sf "$API_URL/health" > /dev/null; then
  echo "✓ API is healthy"
else
  echo "✗ API is down"
fi

# Check Worker
if curl -sf "$WORKER_URL/health" > /dev/null; then
  echo "✓ Worker is healthy"
else
  echo "✗ Worker is down"
fi

# Check Shortener
if curl -sf "$SHORTENER_URL/health" > /dev/null; then
  echo "✓ Shortener is healthy"
else
  echo "✗ Shortener is down"
fi

# Check Web
if curl -sf "$WEB_URL" > /dev/null; then
  echo "✓ Web is healthy"
else
  echo "✗ Web is down"
fi

# Check Database
if pg_isready -h ${POSTGRES_HOST:-localhost} -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
  echo "✓ Database is healthy"
else
  echo "✗ Database is down"
fi

# Check Redis
if redis-cli -h ${REDIS_HOST:-localhost} ping > /dev/null 2>&1; then
  echo "✓ Redis is healthy"
else
  echo "✗ Redis is down"
fi
