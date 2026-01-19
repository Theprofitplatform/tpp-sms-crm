#!/bin/bash
# Quick stop-loss test - disables reconciliation, tests stop-loss trigger

echo "=== Quick Stop-Loss Test ==="
echo ""

# 1. Stop reconciliation job temporarily
echo "1. Stopping reconciliation job..."
curl -s -X POST http://localhost:5100/api/v1/reconciliation/stop | jq .
echo ""

# 2. Reset kill switch
echo "2. Resetting kill switch..."
curl -s -X POST http://localhost:5103/api/v1/killswitch/reset \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing stop-loss trigger"}' | jq .
echo ""

# 3. Check current position in DB
echo "3. Current AAPL position:"
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, side, quantity, status, average_entry_price, stop_loss FROM positions WHERE symbol = 'AAPL' AND status = 'OPEN';"
echo ""

# 4. Get current price
echo "4. Getting current AAPL price..."
QUOTE=$(curl -s http://localhost:5101/api/v1/quote/AAPL 2>/dev/null)
CURRENT_PRICE=$(echo "$QUOTE" | jq -r '.price // .close // 255')
echo "Current price: $CURRENT_PRICE"
echo ""

# 5. Set stop-loss above current price to trigger
TRIGGER_PRICE=$(echo "$CURRENT_PRICE + 5" | bc)
echo "5. Setting stop-loss to $TRIGGER_PRICE (above current price to trigger)..."
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "UPDATE positions SET stop_loss = $TRIGGER_PRICE WHERE symbol = 'AAPL' AND status = 'OPEN' RETURNING stop_loss;"
echo ""

# 6. Wait for position monitor to trigger (runs every 30s)
echo "6. Waiting 35 seconds for position monitor..."
sleep 35

# 7. Check logs for exit trigger
echo "7. Checking ops service logs for exit trigger..."
docker logs stock-ops-service --tail 10 2>&1 | grep -E "(exit|Exit|SELL|position)"
echo ""

# 8. Check position status
echo "8. Checking position status..."
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, side, quantity, status, closed_at FROM positions WHERE symbol = 'AAPL' ORDER BY opened_at DESC LIMIT 2;"
echo ""

# 9. Check execution logs
echo "9. Checking execution service logs..."
docker logs stock-execution-service --tail 10 2>&1 | grep -E "(Order|SELL|fill|position)"
echo ""

# 10. Restart reconciliation
echo "10. Restarting reconciliation job..."
curl -s -X POST http://localhost:5100/api/v1/reconciliation/start | jq .
echo ""

echo "=== Test Complete ==="
