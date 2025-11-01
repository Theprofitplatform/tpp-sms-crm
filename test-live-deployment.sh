#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "  🧪 Live Deployment Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "1️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s http://localhost:4000/health)
if echo "$HEALTH" | grep -q "success.*true"; then
  echo "   ✅ Health check passed"
  echo "   Response: $(echo $HEALTH | python3 -m json.tool | grep status)"
else
  echo "   ❌ Health check failed"
  exit 1
fi

echo ""
echo "2️⃣  Testing API Documentation Endpoint..."
API_DOCS=$(curl -s http://localhost:4000/api)
if echo "$API_DOCS" | grep -q "Manual Review System API"; then
  echo "   ✅ API docs accessible"
else
  echo "   ❌ API docs failed"
  exit 1
fi

echo ""
echo "3️⃣  Testing Statistics Endpoint..."
STATS=$(curl -s http://localhost:4000/api/autofix/statistics)
if echo "$STATS" | grep -q "success.*true"; then
  echo "   ✅ Statistics endpoint working"
else
  echo "   ❌ Statistics endpoint failed"
  exit 1
fi

echo ""
echo "4️⃣  Testing Proposals Endpoint..."
PROPOSALS=$(curl -s http://localhost:4000/api/autofix/proposals?status=pending)
if echo "$PROPOSALS" | grep -q "success"; then
  echo "   ✅ Proposals endpoint working"
  echo "   Current proposals: $(echo $PROPOSALS | grep -o '"count":[0-9]*' | cut -d: -f2)"
else
  echo "   ❌ Proposals endpoint failed"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ All Tests Passed!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🎯 Server Status:"
echo "   • Running: Yes"
echo "   • Port: 4000"
echo "   • Health: Healthy"
echo "   • Endpoints: All responsive"
echo ""
echo "🚀 Ready for production use!"
echo ""
