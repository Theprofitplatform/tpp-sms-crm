#!/bin/bash
echo "=== Current Positions ==="
curl -s http://localhost:5104/api/v1/positions | jq '.'

echo ""
echo "=== Recent Trades ==="
curl -s http://localhost:5104/api/v1/trades | jq '.[-5:]'

echo ""
echo "=== Position in DB ==="
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c "SELECT symbol, side, quantity, status, stop_loss, take_profit, closed_at FROM positions WHERE symbol = 'AAPL' ORDER BY opened_at DESC LIMIT 2;"
