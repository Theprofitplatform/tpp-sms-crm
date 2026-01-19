#!/bin/bash
# E2E test with real market price
set -euo pipefail

echo "=== E2E Position Exit Test (Real Price) ==="
echo ""

# 1. Stop reconciliation
echo "1. Stopping reconciliation..."
curl -s -X POST http://localhost:5100/api/v1/reconciliation/stop | jq -r '.message'
echo ""

# 2. Reset kill switch
echo "2. Resetting kill switch..."
curl -s -X POST http://localhost:5103/api/v1/killswitch/reset \
  -H "Content-Type: application/json" \
  -d '{"reason": "E2E test"}' | jq -r '.can_trade'
echo ""

# 3. Get real AAPL price
echo "3. Fetching real AAPL price..."
QUOTE=$(curl -s http://localhost:5101/api/v1/quote/AAPL)
CURRENT_PRICE=$(echo "$QUOTE" | jq -r '.price // .close')
echo "Current AAPL price: $CURRENT_PRICE"

# Calculate stop-loss ABOVE current price (to trigger for LONG)
STOP_LOSS=$(echo "$CURRENT_PRICE + 5" | bc -l | xargs printf "%.2f")
echo "Stop-loss will be: $STOP_LOSS (above current = will trigger)"
echo ""

# 4. Update existing AAPL position with realistic values
echo "4. Updating position with stop-loss above market price..."
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c "
UPDATE positions
SET average_entry_price = $CURRENT_PRICE,
    current_price = $CURRENT_PRICE,
    stop_loss = $STOP_LOSS
WHERE symbol = 'AAPL' AND status = 'OPEN';
"
echo ""

# 5. Verify position
echo "5. Current position:"
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, quantity, average_entry_price, current_price, stop_loss FROM positions WHERE symbol = 'AAPL' AND status = 'OPEN';"
echo ""

# 6. Check API shows position
echo "6. Position via API:"
curl -s http://localhost:5104/api/v1/positions | jq '.[] | {symbol, quantity, stop_loss, average_entry_price}'
echo ""

# 7. Wait for position monitor
echo "7. Waiting 35s for position monitor..."
sleep 35

# 8. Check logs
echo "8. Exit trigger logs:"
docker logs stock-ops-service --tail 5 2>&1 | grep -i "exit\|position"
echo ""

# 9. Check if order was processed
echo "9. Execution logs:"
docker logs stock-execution-service --tail 10 2>&1 | grep -i "order\|fill\|close\|position" || echo "No order logs found"
echo ""

# 10. Final status
echo "10. Final position:"
docker exec stock-timescaledb psql -U stock_user -d stock_trading -c \
  "SELECT symbol, quantity, status, closed_at FROM positions WHERE symbol = 'AAPL' ORDER BY opened_at DESC LIMIT 1;"
echo ""

# 11. Restart reconciliation
curl -s -X POST http://localhost:5100/api/v1/reconciliation/start | jq -r '.message'

echo ""
echo "=== Test Complete ==="
