#!/bin/bash

# View Latest Report Script
# Opens the most recent HTML report in your browser

cd "$(dirname "$0")/.." || exit 1

LATEST_REPORT=$(ls -t logs/audit-report-*.html 2>/dev/null | head -1)

if [ -z "$LATEST_REPORT" ]; then
    echo "No reports found in logs/"
    echo "Run an audit first: npm run audit"
    exit 1
fi

echo "Opening latest report: $LATEST_REPORT"

# Open based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$LATEST_REPORT"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open "$LATEST_REPORT"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start "$LATEST_REPORT"
else
    echo "Could not detect OS. Please open manually:"
    echo "$LATEST_REPORT"
fi
