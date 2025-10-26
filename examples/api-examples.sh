#!/bin/bash

# API Examples - Unified Keyword Tracking System
# Collection of curl commands demonstrating all API endpoints

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:9000/api/v2"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  API v2 Examples - Unified Keyword Tracking   ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# Function to pretty print JSON
pretty_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        cat
    fi
}

# Function to execute and display
run_example() {
    local name=$1
    local description=$2
    local command=$3

    echo -e "${YELLOW}Example: ${name}${NC}"
    echo "Description: ${description}"
    echo ""
    echo "Command:"
    echo -e "${GREEN}${command}${NC}"
    echo ""
    echo "Response:"
    eval "$command" | pretty_json
    echo ""
    echo "─────────────────────────────────────────────────"
    echo ""
}

# Check if server is running
echo "Checking if server is running..."
if ! curl -s -f ${BASE_URL}/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Server not running. Please start with: ./start-dev.sh${NC}"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# ═══════════════════════════════════════════════════════════
# KEYWORDS API
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Keywords API Examples${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_example \
    "List Keywords" \
    "Get all keywords with pagination" \
    "curl -s ${BASE_URL}/keywords?page=1&per_page=10"

run_example \
    "Filter by Domain" \
    "Get keywords for specific domain" \
    "curl -s '${BASE_URL}/keywords?domain=example.com'"

run_example \
    "Filter by Intent" \
    "Get all commercial intent keywords" \
    "curl -s '${BASE_URL}/keywords?intent=commercial'"

run_example \
    "Filter by Opportunity Score" \
    "Get high-opportunity keywords (score > 70)" \
    "curl -s '${BASE_URL}/keywords?opportunity_score_min=70'"

run_example \
    "Sort Keywords" \
    "Sort by opportunity score descending" \
    "curl -s '${BASE_URL}/keywords?sort_by=opportunity_score&sort_order=desc&per_page=5'"

run_example \
    "Get Tracking Keywords Only" \
    "Filter to show only tracked keywords" \
    "curl -s '${BASE_URL}/keywords?is_tracking=true'"

run_example \
    "Create New Keyword" \
    "Add a new keyword to the system" \
    "curl -s -X POST ${BASE_URL}/keywords \
      -H 'Content-Type: application/json' \
      -d '{
        \"keyword\": \"best seo tools 2025\",
        \"domain\": \"example.com\",
        \"device\": \"desktop\",
        \"country\": \"US\"
      }'"

# Save keyword ID for later examples
KEYWORD_ID=$(curl -s ${BASE_URL}/keywords?per_page=1 | jq -r '.keywords[0].id // 1')

run_example \
    "Get Keyword Details" \
    "Get full details for a specific keyword" \
    "curl -s ${BASE_URL}/keywords/${KEYWORD_ID}"

run_example \
    "Update Keyword" \
    "Update keyword fields (sticky, tags, notes)" \
    "curl -s -X PUT ${BASE_URL}/keywords/${KEYWORD_ID} \
      -H 'Content-Type: application/json' \
      -d '{
        \"sticky\": true,
        \"tags\": [\"important\", \"priority\"],
        \"notes\": \"Target for Q1 2025\"
      }'"

run_example \
    "Track Keyword" \
    "Add keyword to position tracking" \
    "curl -s -X POST ${BASE_URL}/keywords/${KEYWORD_ID}/track \
      -H 'Content-Type: application/json' \
      -d '{
        \"domain\": \"example.com\"
      }'"

run_example \
    "Enrich Keyword" \
    "Fetch research data for keyword" \
    "curl -s -X POST ${BASE_URL}/keywords/${KEYWORD_ID}/enrich"

run_example \
    "Get Keyword Statistics" \
    "Get aggregate statistics for all keywords" \
    "curl -s ${BASE_URL}/keywords/stats"

# ═══════════════════════════════════════════════════════════
# RESEARCH API
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Research API Examples${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_example \
    "List Research Projects" \
    "Get all research projects" \
    "curl -s ${BASE_URL}/research/projects"

run_example \
    "Create Research Project" \
    "Create new keyword research project" \
    "curl -s -X POST ${BASE_URL}/research/projects \
      -H 'Content-Type: application/json' \
      -d '{
        \"name\": \"Q1 2025 Blog Content\",
        \"seeds\": [\"seo tools\", \"keyword tracking\"],
        \"geo\": \"US\",
        \"language\": \"en\",
        \"focus\": \"informational\"
      }'"

# Get project ID for later examples
PROJECT_ID=$(curl -s ${BASE_URL}/research/projects | jq -r '.projects[0].id // 1')

run_example \
    "Get Project Details" \
    "Get full project details with keywords" \
    "curl -s ${BASE_URL}/research/projects/${PROJECT_ID}"

run_example \
    "Track Top Opportunities" \
    "Automatically track top 20 keywords from project" \
    "curl -s -X POST ${BASE_URL}/research/projects/${PROJECT_ID}/track-opportunities \
      -H 'Content-Type: application/json' \
      -d '{
        \"limit\": 20
      }'"

run_example \
    "List Topics" \
    "Get all topics for a project" \
    "curl -s '${BASE_URL}/research/topics?project_id=${PROJECT_ID}'"

run_example \
    "Create Topic" \
    "Create a new topic/cluster" \
    "curl -s -X POST ${BASE_URL}/research/topics \
      -H 'Content-Type: application/json' \
      -d '{
        \"name\": \"SEO Tools Comparison\",
        \"project_id\": ${PROJECT_ID},
        \"keywords\": [\"best seo tools\", \"seo tools comparison\"]
      }'"

run_example \
    "List Page Groups" \
    "Get page groups (single-page targets)" \
    "curl -s ${BASE_URL}/research/page-groups"

# ═══════════════════════════════════════════════════════════
# SYNC API
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Sync API Examples${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_example \
    "Get Sync Status" \
    "Check current sync status and statistics" \
    "curl -s ${BASE_URL}/sync/status"

run_example \
    "Trigger Manual Sync" \
    "Manually trigger a sync operation" \
    "curl -s -X POST ${BASE_URL}/sync/trigger"

run_example \
    "Get Sync History" \
    "View sync history with pagination" \
    "curl -s '${BASE_URL}/sync/history?page=1&per_page=10'"

run_example \
    "Bulk Sync Keywords" \
    "Sync specific keywords in bulk" \
    "curl -s -X POST ${BASE_URL}/sync/keywords/bulk \
      -H 'Content-Type: application/json' \
      -d '{
        \"source\": \"serpbear\",
        \"keyword_ids\": [1, 2, 3]
      }'"

# ═══════════════════════════════════════════════════════════
# ADVANCED EXAMPLES
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Advanced Examples${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_example \
    "Complex Filter Query" \
    "Combine multiple filters for precise results" \
    "curl -s '${BASE_URL}/keywords?domain=example.com&intent=commercial&opportunity_score_min=70&sort_by=search_volume&sort_order=desc&per_page=5'"

run_example \
    "Batch Create Keywords" \
    "Create multiple keywords (requires iteration)" \
    "for kw in 'seo software' 'rank tracker' 'keyword tool'; do \
      curl -s -X POST ${BASE_URL}/keywords \
        -H 'Content-Type: application/json' \
        -d '{\"keyword\":\"'\$kw'\",\"domain\":\"example.com\"}'; \
    done | jq -s '.'"

run_example \
    "Get High-Value Opportunities" \
    "Find untapped opportunities (high volume, low difficulty)" \
    "curl -s '${BASE_URL}/keywords?search_volume_min=1000&difficulty_max=40&is_tracking=false&sort_by=opportunity_score&sort_order=desc&per_page=10'"

run_example \
    "Export Keywords as CSV" \
    "Get keywords in CSV format (requires jq)" \
    "curl -s ${BASE_URL}/keywords?per_page=100 | jq -r '.keywords[] | [.keyword, .search_volume, .position, .opportunity_score] | @csv'"

# ═══════════════════════════════════════════════════════════
# MONITORING EXAMPLES
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Monitoring Examples${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

run_example \
    "Health Check" \
    "Check API health status" \
    "curl -s ${BASE_URL}/health"

run_example \
    "Get System Statistics" \
    "Get comprehensive system statistics" \
    "curl -s ${BASE_URL}/keywords/stats"

run_example \
    "Monitor Sync Status" \
    "Watch sync status (useful in monitoring scripts)" \
    "curl -s ${BASE_URL}/sync/status | jq '{isSyncing, lastSyncTime, errors: .stats.totalErrors}'"

# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Examples Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

echo "Next steps:"
echo ""
echo "1. Try modifying these examples for your use case"
echo "2. Use Postman collection (see examples/postman-collection.json)"
echo "3. Review API documentation (API_V2_DOCUMENTATION.md)"
echo "4. Build your integration using these patterns"
echo ""

echo "Useful tools:"
echo "  • jq: Install with 'brew install jq' or 'apt-get install jq'"
echo "  • Postman: Download from https://www.postman.com/"
echo "  • HTTPie: Install with 'brew install httpie' or 'pip install httpie'"
echo ""

echo "For more examples, see:"
echo "  • API_V2_DOCUMENTATION.md"
echo "  • QUICK_START_INTEGRATED_SYSTEM.md"
echo ""
