#!/bin/bash
# End-to-end test for position exit flow with stop-loss/take-profit
set -euo pipefail

echo "=== End-to-End Position Exit Test ==="
echo ""

# 1. Reset kill switch
echo "1. Resetting kill switch..."
curl -s -X POST http://localhost:5103/api/v1/killswitch/reset \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing end-to-end position exit flow"}' | jq .
echo ""

# 2. Check current positions
echo "2. Current positions:"
curl -s http://localhost:5104/api/v1/positions | jq .
echo ""

# 3. Get current AAPL price
echo "3. Getting current AAPL price..."
QUOTE=$(curl -s http://localhost:5101/api/v1/quote/AAPL)
CURRENT_PRICE=$(echo "$QUOTE" | jq -r '.price // .close // 150')
echo "Current AAPL price: $CURRENT_PRICE"
echo ""

# Calculate stop-loss (2% below) and take-profit (5% above)
STOP_LOSS=$(echo "$CURRENT_PRICE * 0.98" | bc -l | xargs printf "%.2f")
TAKE_PROFIT=$(echo "$CURRENT_PRICE * 1.05" | bc -l | xargs printf "%.2f")

echo "Stop-loss: $STOP_LOSS (2% below)"
echo "Take-profit: $TAKE_PROFIT (5% above)"
echo ""

# 4. Create a test position via signal
echo "4. Creating test position via signal generation..."
SIGNAL_RESPONSE=$(curl -s -X POST http://localhost:5102/api/v1/signals/generate \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL"],
    "strategy_id": "momentum"
  }')
echo "$SIGNAL_RESPONSE" | jq .
echo ""

# 5. Check positions again
echo "5. Checking positions after signal..."
sleep 2
curl -s http://localhost:5104/api/v1/positions | jq .
echo ""

# 6. Check position monitor status
echo "6. Position monitor status:"
curl -s http://localhost:5100/api/v1/jobs | jq '.jobs[] | select(.name == "position-monitor")'
echo ""

# 7. Trigger position monitor manually
echo "7. Triggering position monitor..."
curl -s -X POST http://localhost:5100/api/v1/jobs/position-monitor/trigger | jq .
echo ""

echo "=== Test Complete ==="
echo "Monitor the dashboard for real-time updates via WebSocket"
