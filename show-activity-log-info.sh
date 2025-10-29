#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Activity Log Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Current Activities:"
cat data/activity-log.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"  Total: {len(data['activities'])} activities\")
for act in data['activities']:
    status_icon = '✅' if act['status'] == 'success' else '❌'
    print(f\"  {status_icon} {act['action']} - {act['status']}\")
"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ℹ️  These are DEMO activities created to show you"
echo "   how the Activity Log works!"
echo ""
echo "To clear demo data and start fresh:"
echo "   node clear-demo-activities.js"
echo ""
echo "To add your own activities, use the logger:"
echo "   See: src/utils/activity-logger.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
