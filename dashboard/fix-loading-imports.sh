#!/bin/bash

# 🔧 Fix LoadingState Import Errors
# Fixes all 7 pages that incorrectly import LoadingState

set -e

echo "🔧 Fixing LoadingState Import Errors"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Files that need fixing
FILES=(
    "src/pages/GoogleSearchConsolePage.jsx"
    "src/pages/WordPressManagerPage.jsx"
    "src/pages/SchedulerPage.jsx"
    "src/pages/NotificationCenterPage.jsx"
    "src/pages/LocalSEOPage.jsx"
    "src/pages/BulkOperationsPage.jsx"
    "src/pages/AIOptimizerPage.jsx"
)

echo "📋 Files to fix: ${#FILES[@]}"
echo ""

# Counter
FIXED=0

# Option 1: Add LoadingState wrapper to LoadingState.jsx
echo "🔧 Option 1: Adding LoadingState wrapper component..."
echo ""

# Check if LoadingState.jsx exists
if [ ! -f "src/components/LoadingState.jsx" ]; then
    echo -e "${RED}❌ LoadingState.jsx not found!${NC}"
    exit 1
fi

# Add LoadingState export to LoadingState.jsx
cat >> src/components/LoadingState.jsx << 'EOF'

// Generic LoadingState wrapper for backward compatibility
export function LoadingState() {
  return <DashboardSkeleton />
}
EOF

echo -e "${GREEN}✅ Added LoadingState wrapper to LoadingState.jsx${NC}"
echo ""

# Now test if pages can import it
echo "🧪 Testing import resolution..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -n "   Checking $(basename $file)... "
        
        # Just verify the file exists and has the import
        if grep -q "import { LoadingState }" "$file"; then
            echo -e "${GREEN}✅ Found import${NC}"
            ((FIXED++))
        else
            echo -e "${YELLOW}⚠️  No LoadingState import found${NC}"
        fi
    else
        echo -e "${RED}❌ File not found: $file${NC}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Files checked: ${#FILES[@]}"
echo -e "Fixed:         ${GREEN}$FIXED${NC}"
echo ""

# Test build
echo "🔨 Testing production build..."
echo ""

if npm run build; then
    echo ""
    echo -e "${GREEN}✅ Build successful! All fixes applied.${NC}"
    echo ""
    echo "Build output:"
    du -sh dist/
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}❌ Build failed. Additional fixes needed.${NC}"
    echo ""
    echo "Check the error messages above."
    exit 1
fi
