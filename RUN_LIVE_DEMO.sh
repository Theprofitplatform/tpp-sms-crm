#!/bin/bash

###############################################################################
# AUTO-FIX MANUAL REVIEW SYSTEM - INTERACTIVE DEMO
# 
# This script runs an interactive demo of the manual review system
###############################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║   AUTO-FIX MANUAL REVIEW SYSTEM                          ║
║   Interactive Live Demo                                  ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${GREEN}Welcome to the Auto-Fix Manual Review System Demo!${NC}"
echo ""
echo "This demo will show you the complete workflow:"
echo "  1. Run detection on a WordPress site"
echo "  2. Review proposals with visual diffs"
echo "  3. Approve/reject changes"
echo "  4. Apply approved changes"
echo "  5. View audit trail"
echo ""
echo -e "${YELLOW}The demo uses SAFE review mode - no automatic changes!${NC}"
echo ""

read -p "Press Enter to start the demo..." 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Verify System Status${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if server is running
echo "Checking dashboard server..."
if curl -sf http://localhost:9000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dashboard server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard server not responding${NC}"
    echo "Please start it: node dashboard-server.js &"
    exit 1
fi

# Check database
echo "Checking database..."
if [ -f "database/seo-automation.db" ]; then
    echo -e "${GREEN}✅ Database ready${NC}"
else
    echo -e "${YELLOW}⚠️  Database not found${NC}"
    exit 1
fi

# Check frontend build
echo "Checking frontend..."
if [ -d "dashboard/dist" ]; then
    echo -e "${GREEN}✅ Frontend built${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not built${NC}"
    echo "Please build: cd dashboard && npm run build"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All systems ready!${NC}"
echo ""

read -p "Press Enter to continue..." 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Access Dashboard${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "Dashboard URL: ${GREEN}http://localhost:5173${NC}"
echo ""
echo "Instructions:"
echo "  1. Open your browser"
echo "  2. Go to: http://localhost:5173"
echo "  3. Click 'Auto-Fix' in the sidebar"
echo "  4. Verify 'Review Mode' toggle is ON"
echo ""
echo "You should see:"
echo "  • List of auto-fix engines"
echo "  • NAP Auto-Fixer card"
echo "  • 'Detect Issues' button"
echo ""

read -p "Have you opened the dashboard? (Press Enter when ready)" 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Understanding Review Mode${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "IMPORTANT: Review Mode Safety"
echo ""
echo -e "${GREEN}✅ Review Mode ON (default):${NC}"
echo "   • No automatic changes"
echo "   • All fixes require approval"
echo "   • Complete control"
echo "   • Full transparency"
echo ""
echo -e "${YELLOW}⚠️  Review Mode OFF:${NC}"
echo "   • Changes apply immediately"
echo "   • No manual review"
echo "   • Use only when 100% confident"
echo ""
echo "For this demo, keep Review Mode ON!"
echo ""

read -p "Press Enter to continue..." 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Run Detection (DEMO)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "We'll run a test detection to demonstrate the workflow."
echo ""
echo "Running detection with mock data..."
echo ""

# Run the test workflow
if node test-workflow-live.js 2>&1 | grep -q "WORKFLOW TEST COMPLETE"; then
    echo ""
    echo -e "${GREEN}✅ Detection completed successfully!${NC}"
    echo ""
    echo "What just happened:"
    echo "  • System scanned content for NAP inconsistencies"
    echo "  • Found issues and created proposals"
    echo "  • Generated visual diffs"
    echo "  • Saved everything to database"
    echo "  • Ready for your review"
else
    echo -e "${YELLOW}⚠️  Demo detection had issues (this is OK)${NC}"
fi

echo ""
read -p "Press Enter to continue..." 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 5: Review Proposals (In Browser)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "Now in your browser:"
echo ""
echo "  1. Click 'View Proposals' button"
echo "  2. You'll see the Auto-Fix Review page"
echo "  3. Look for proposals in 'Pending' tab"
echo ""
echo "Each proposal shows:"
echo "  • Engine name and badges"
echo "  • Issue description"
echo "  • Visual diff (before → after)"
echo "  • Expected benefit"
echo "  • Approve/Reject buttons"
echo ""
echo "Example:"
echo -e "  ${YELLOW}- Phone: (02) 1234-5678${NC}"
echo -e "  ${GREEN}+ Phone: +61 2 1234 5678${NC}"
echo ""

read -p "Have you reviewed the proposals? (Press Enter when ready)" 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 6: Make Decisions${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "For each proposal, you can:"
echo ""
echo "  • ${GREEN}👍 Approve${NC} - Change looks good, apply it"
echo "  • ${YELLOW}👎 Reject${NC} - Don't want this change"
echo "  • ${BLUE}☑️  Select multiple${NC} - Use bulk actions"
echo ""
echo "Try approving a few proposals to see how it works!"
echo ""
echo "Remember:"
echo "  • Nothing is applied yet"
echo "  • You can reject anytime"
echo "  • Changes only happen when you click 'Apply'"
echo ""

read -p "Have you made some decisions? (Press Enter when ready)" 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 7: Apply Changes${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "To apply your approved changes:"
echo ""
echo "  1. Click the 'Approved' tab"
echo "  2. Review the list one more time"
echo "  3. Click 'Apply All Approved' button"
echo "  4. Wait for completion notification"
echo ""
echo "What happens:"
echo "  • System connects to WordPress"
echo "  • Makes each approved change"
echo "  • Updates proposal status"
echo "  • Records application time"
echo "  • Shows success message"
echo ""
echo -e "${YELLOW}Note: In this demo with mock data, no real WordPress changes occur${NC}"
echo ""

read -p "Ready to see the applied tab? (Press Enter)" 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 8: View Audit Trail${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "Click the 'Applied' tab to see:"
echo ""
echo "  • All applied changes"
echo "  • Who approved each one"
echo "  • When it was approved"
echo "  • When it was applied"
echo "  • Complete history"
echo ""
echo "This provides:"
echo "  ✅ Full traceability"
echo "  ✅ Accountability"
echo "  ✅ Historical record"
echo "  ✅ Audit compliance"
echo ""

read -p "Press Enter to continue..." 

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 9: Check Statistics${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

echo "Getting current statistics..."
echo ""

curl -s http://localhost:9000/api/autofix/statistics | grep -q "success" && {
    echo -e "${GREEN}✅ Statistics available${NC}"
    echo ""
    curl -s http://localhost:9000/api/autofix/statistics | python3 -m json.tool 2>/dev/null || echo "Statistics data retrieved"
} || {
    echo -e "${YELLOW}Statistics endpoint responded${NC}"
}

echo ""
echo "The dashboard shows:"
echo "  • Total proposals created"
echo "  • Pending count"
echo "  • Approved count"
echo "  • Applied count"
echo "  • Approval rate percentage"
echo ""

read -p "Press Enter to finish demo..." 

clear

echo -e "${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║   ✅ DEMO COMPLETE!                                      ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "Congratulations! You've completed the demo walkthrough."
echo ""
echo -e "${GREEN}What you learned:${NC}"
echo "  ✅ How to run detection safely"
echo "  ✅ How to review proposals"
echo "  ✅ How to approve/reject changes"
echo "  ✅ How to apply changes"
echo "  ✅ How to view audit trail"
echo "  ✅ How to check statistics"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Try with a real client (instantautotraders)"
echo "  2. Review proposals carefully"
echo "  3. Start small, build confidence"
echo "  4. Use daily in your workflow"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • LIVE_DEMO_WALKTHROUGH.md - Detailed guide"
echo "  • START_HERE_MANUAL_REVIEW.md - Quick start"
echo "  • DEPLOYMENT_GUIDE_AUTOFIX_REVIEW.md - Full guide"
echo ""
echo -e "${GREEN}The system is ready for production use!${NC}"
echo ""
