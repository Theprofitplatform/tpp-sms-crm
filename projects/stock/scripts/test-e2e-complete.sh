#!/bin/bash
# Complete E2E test for position exit flow
set -euo pipefail

echo "=== Complete E2E Position Exit Test ==="
echo ""

# 1. Stop reconciliation to prevent interference
echo "1. Stopping reconciliation job..."
curl -s -X POST http://localhost:5100/api/v1/reconciliation/stop | jq .
echo ""

# 2. Reset kill switch
echo "2. Resetting kill switch..."
curl -s -X POST http://localhost:5103/api/v1/killswitch/reset \
  -H "Content-Type: application/json" \
  -d '{"reason": "E2E test setup"}' | jq .
echo ""

# 3. Create a fresh test position via direct insert
echo "3. Creating fresh test position in DB..."
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c "
DELETE FROM positions WHERE symbol = 'TEST';
INSERT INTO positions (symbol, market, side, quantity, average_entry_price, current_price, status, opened_at)
VALUES ('AAPL', 'US', 'LONG', 10, 100.00, 100.00, 'OPEN', NOW())
ON CONFLICT DO NOTHING;
"
echo ""

# 4. Check current positions
echo "4. Current positions:"
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, side, quantity, status, stop_loss, take_profit FROM positions WHERE status = 'OPEN';"
echo ""

# 5. Update stop-loss to trigger (set below current price)
echo "5. Setting stop-loss to 105.00 (above current price 100.00)..."
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "UPDATE positions SET stop_loss = 105.00, current_price = 100.00 WHERE symbol = 'AAPL' AND status = 'OPEN' RETURNING symbol, stop_loss, current_price;"
echo ""

# 6. Check API positions endpoint
echo "6. Positions via API:"
curl -s http://localhost:5104/api/v1/positions | jq .
echo ""

# 7. Wait for position monitor (every 30s)
echo "7. Waiting 35 seconds for position monitor to trigger..."
sleep 35

# 8. Check ops logs for exit
echo "8. Ops service logs (last 10 lines with exit/position):"
docker logs stock-ops-service --tail 20 2>&1 | grep -i "exit\|position" | tail -10
echo ""

# 9. Check execution logs for order processing
echo "9. Execution service logs (last 20 lines):"
docker logs stock-execution-service --tail 20 2>&1
echo ""

# 10. Final position status
echo "10. Final position status:"
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, side, quantity, status, closed_at FROM positions WHERE symbol = 'AAPL' ORDER BY opened_at DESC LIMIT 2;"
echo ""

# 11. Restart reconciliation
echo "11. Restarting reconciliation job..."
curl -s -X POST http://localhost:5100/api/v1/reconciliation/start | jq .
echo ""

echo "=== Test Complete ==="
