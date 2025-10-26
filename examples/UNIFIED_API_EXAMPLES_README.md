# Unified Keyword Tracking API - Examples

Practical examples and utilities for working with the unified keyword tracking system API.

---

## 📁 Files in This Directory

### 🔌 API Examples

#### **`api-examples.sh`**
Comprehensive curl-based examples demonstrating all API endpoints.

**What it covers:**
- Keywords API (8 endpoints)
- Research API (7 endpoints)
- Sync API (4 endpoints)
- Advanced filtering and queries
- Batch operations
- Monitoring examples

**Usage:**
```bash
./examples/api-examples.sh
```

**Features:**
- ✅ Auto-checks if server is running
- ✅ Pretty-prints JSON responses (with jq)
- ✅ Shows both request and response
- ✅ Includes real-world examples
- ✅ Demonstrates best practices

---

#### **`postman-collection.json`**
Complete Postman collection for API testing.

**What's included:**
- All 19 API endpoints
- Request examples with sample data
- Environment variables for easy testing
- Automatic ID extraction from responses
- Organized by functionality

**How to use:**
1. Open Postman
2. Import collection: `File > Import > examples/postman-collection.json`
3. Set environment variable `baseUrl` to `http://localhost:9000/api/v2`
4. Start testing!

**Environment Variables:**
- `baseUrl`: http://localhost:9000/api/v2
- `keywordId`: Auto-set from responses
- `projectId`: Auto-set from responses

---

### 🎲 Data Generators

#### **`generate-sample-data.js`**
Creates realistic test data for development and testing.

**What it generates:**
- 5 domains (example.com, myblog.com, etc.)
- 3 research projects
- 90 keywords with full metadata
- Realistic metrics (volume, difficulty, position)
- Position history (30 days)
- SERP features
- Topic clustering

**Usage:**
```bash
# Install dependencies (if not already)
npm install sqlite3

# Generate data
node examples/generate-sample-data.js
```

**Output:**
```
🚀 Generating sample data...

Clearing existing data...
✓ Cleared

Generating 5 domains...
  ✓ example.com
  ✓ myblog.com
  ✓ techstartup.io
  ...

Generating 90 keywords...
..........

✅ Sample data generation complete!

Statistics:
  • Domains: 5
  • Research Projects: 3
  • Topics: 4
  • Keywords: 90
  • Tracking: 36 (40%)
  • High Opportunity (≥70): 28 (31%)
```

**Use cases:**
- Initial development setup
- Demo presentations
- Testing filters and queries
- Performance benchmarking
- Integration testing

---

### ⚡ Performance Testing

#### **`performance-benchmark.js`**
Comprehensive API performance testing tool.

**What it tests:**
- Response times (min, max, avg, median, P95, P99)
- Throughput (requests per second)
- Success rates
- Concurrent request handling
- Response sizes

**Usage:**
```bash
node examples/performance-benchmark.js
```

**Sample Output:**
```
════════════════════════════════════════════════
  API Performance Benchmark
════════════════════════════════════════════════

Base URL: http://localhost:9000/api/v2
Iterations per test: 100
Concurrent requests: 10

═══ Sequential Tests ═══

Running: List Keywords (paginated)
  Endpoint: GET /api/v2/keywords?page=1&per_page=50
  Iterations: 100
.................................................. Done!

  Success Rate: 100.00%
  Requests: 100/100

  Duration (ms):
    Min:     124.52ms
    Avg:     156.34ms
    Median:  148.21ms
    Max:     289.41ms
    P95:     198.73ms
    P99:     234.12ms

  Throughput: 6.40 req/s
  Avg Response Size: 12.45 KB

...
```

**Performance Targets:**
- Average response: <500ms
- P95 response: <1000ms
- Success rate: 100%
- Throughput: >5 req/s

**Recommendations:**
```
════════════════════════════════════════════════
  Recommendations
════════════════════════════════════════════════

  ✓ All tests passed performance targets!

  Your API is performing well:
  • All endpoints respond under 500ms
  • 100% success rate
  • Good concurrent request handling

  General tips:
  • Add database indexes for filtered columns
  • Implement Redis caching for frequent queries
  • Use pagination for large result sets
  • Consider CDN for static assets
  • Monitor with PM2 or similar tools
```

---

## 🚀 Quick Start Examples

### Example 1: List All Keywords

```bash
curl http://localhost:9000/api/v2/keywords?page=1&per_page=50
```

### Example 2: Find High-Opportunity Keywords

```bash
curl "http://localhost:9000/api/v2/keywords?opportunity_score_min=70&sort_by=search_volume&sort_order=desc&per_page=20"
```

### Example 3: Create Research Project

```bash
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2025 Content",
    "seeds": ["seo tools", "keyword research"],
    "geo": "US",
    "language": "en",
    "focus": "informational"
  }'
```

### Example 4: Track Top Keywords

```bash
# Get project ID from above response
PROJECT_ID=1

# Track top 20 opportunities
curl -X POST http://localhost:9000/api/v2/research/projects/$PROJECT_ID/track-opportunities \
  -H "Content-Type: application/json" \
  -d '{"limit": 20}'
```

### Example 5: Check Sync Status

```bash
curl http://localhost:9000/api/v2/sync/status | jq
```

### Example 6: Manual Sync Trigger

```bash
curl -X POST http://localhost:9000/api/v2/sync/trigger
```

---

## 🔧 Advanced Examples

### Complex Filtering

Get commercial intent keywords with high opportunity:

```bash
curl "http://localhost:9000/api/v2/keywords?intent=commercial&opportunity_score_min=70&search_volume_min=1000&difficulty_max=40&per_page=50"
```

### Batch Create Keywords

```bash
for keyword in "seo software" "rank tracker" "keyword tool"; do
  curl -X POST http://localhost:9000/api/v2/keywords \
    -H "Content-Type: application/json" \
    -d "{\"keyword\":\"$keyword\",\"domain\":\"example.com\"}"
done
```

### Export to CSV

```bash
curl -s http://localhost:9000/api/v2/keywords?per_page=1000 | \
  jq -r '.keywords[] | [.keyword, .search_volume, .position, .opportunity_score] | @csv' > keywords.csv
```

### Monitor Sync Loop

```bash
watch -n 10 'curl -s http://localhost:9000/api/v2/sync/status | jq "{isSyncing, lastSyncTime, errors: .stats.totalErrors}"'
```

---

## 📊 Testing Workflows

### Workflow 1: Complete Setup Test

```bash
# 1. Generate sample data
node examples/generate-sample-data.js

# 2. Verify data
curl http://localhost:9000/api/v2/keywords/stats | jq

# 3. Run performance benchmark
node examples/performance-benchmark.js

# 4. Test all endpoints
./examples/api-examples.sh
```

### Workflow 2: Integration Testing

```bash
# 1. Create project
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","seeds":["test"],"geo":"US","language":"en","focus":"informational"}' \
  > project.json

# 2. Get project ID
PROJECT_ID=$(jq -r '.project.id' project.json)

# 3. Check keywords generated
curl "http://localhost:9000/api/v2/keywords?research_project_id=$PROJECT_ID" | jq '.keywords | length'

# 4. Track top opportunities
curl -X POST http://localhost:9000/api/v2/research/projects/$PROJECT_ID/track-opportunities \
  -H "Content-Type: application/json" \
  -d '{"limit":10}'

# 5. Verify tracking
curl "http://localhost:9000/api/v2/keywords?is_tracking=true" | jq '.keywords | length'
```

### Workflow 3: Performance Validation

```bash
# 1. Generate large dataset
node examples/generate-sample-data.js

# 2. Test different page sizes
for size in 10 50 100 200; do
  echo "Testing per_page=$size"
  time curl -s "http://localhost:9000/api/v2/keywords?per_page=$size" > /dev/null
done

# 3. Test concurrent load
ab -n 100 -c 10 http://localhost:9000/api/v2/keywords/stats

# 4. Run full benchmark
node examples/performance-benchmark.js > perf-report.txt
```

---

## 🛠️ Development Tools

### Using with HTTPie

```bash
# Install HTTPie
brew install httpie
# or
pip install httpie

# List keywords
http GET localhost:9000/api/v2/keywords page==1 per_page==50

# Create keyword
http POST localhost:9000/api/v2/keywords keyword="test keyword" domain="example.com"

# Pretty output
http GET localhost:9000/api/v2/keywords/stats --print=b | jq
```

### Using with Insomnia

1. Import Postman collection (Insomnia supports it)
2. Or manually create requests
3. Set base URL: `http://localhost:9000/api/v2`
4. Start testing!

### Using with curl + jq

```bash
# Get high-opportunity keywords with formatting
curl -s "http://localhost:9000/api/v2/keywords?opportunity_score_min=70" | \
  jq -r '.keywords[] | "\(.keyword) - Volume: \(.search_volume) - Score: \(.opportunity_score)"'

# Get sync statistics
curl -s http://localhost:9000/api/v2/sync/status | \
  jq '{
    syncing: .status.isSyncing,
    lastSync: .status.lastSyncTime,
    records: .status.stats.totalRecords,
    errors: .status.stats.totalErrors
  }'
```

---

## 📈 Monitoring Examples

### Health Check Loop

```bash
# Check health every 30 seconds
while true; do
  curl -s http://localhost:9000/api/v2/health | jq '{status: .status, timestamp: now}'
  sleep 30
done
```

### Sync Monitor

```bash
# Monitor sync with desktop notifications (macOS)
watch -n 60 'curl -s http://localhost:9000/api/v2/sync/status | jq -r ".status.stats.totalErrors" | grep -v "^0$" && osascript -e "display notification \"Sync errors detected!\" with title \"Keyword Tracker\""'
```

### Performance Logger

```bash
# Log API performance
while true; do
  START=$(date +%s%N)
  curl -s http://localhost:9000/api/v2/keywords?per_page=10 > /dev/null
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  echo "$(date) - Response time: ${DURATION}ms" >> api-performance.log
  sleep 300  # Every 5 minutes
done
```

---

## 🎓 Learning Examples

### Understanding Opportunity Score

```bash
# Get keywords sorted by opportunity score
curl -s "http://localhost:9000/api/v2/keywords?sort_by=opportunity_score&sort_order=desc&per_page=10" | \
  jq -r '.keywords[] | "Score: \(.opportunity_score) | \(.keyword) | Vol: \(.search_volume) | Diff: \(.difficulty)"'
```

### Analyzing Intent Distribution

```bash
# Get count by intent
curl -s http://localhost:9000/api/v2/keywords/stats | \
  jq '.stats.by_intent'
```

### Finding Gaps

```bash
# High volume, not tracking yet
curl -s "http://localhost:9000/api/v2/keywords?search_volume_min=5000&is_tracking=false&per_page=20" | \
  jq -r '.keywords[] | "\(.keyword) - \(.search_volume) searches/mo"'
```

---

## 💡 Tips & Best Practices

### 1. Use Query Parameters Effectively

```bash
# Good: Specific query
curl "http://localhost:9000/api/v2/keywords?domain=example.com&intent=commercial&opportunity_score_min=70"

# Bad: Fetch all then filter client-side
curl "http://localhost:9000/api/v2/keywords?per_page=10000" | grep "commercial"
```

### 2. Handle Pagination

```bash
# Fetch all pages
page=1
while true; do
  response=$(curl -s "http://localhost:9000/api/v2/keywords?page=$page&per_page=100")
  keywords=$(echo $response | jq -r '.keywords[]')

  if [ -z "$keywords" ]; then
    break
  fi

  echo "$keywords" >> all-keywords.json
  ((page++))
done
```

### 3. Error Handling

```bash
# Check response code
response=$(curl -s -w "\n%{http_code}" http://localhost:9000/api/v2/keywords)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
  echo "Success:"
  echo "$body" | jq
else
  echo "Error $http_code:"
  echo "$body" | jq '.error'
fi
```

### 4. Rate Limiting Awareness

```bash
# Add delay between requests
for id in {1..100}; do
  curl -s http://localhost:9000/api/v2/keywords/$id
  sleep 0.1  # 100ms delay
done
```

---

## 📚 Additional Resources

- **API Documentation**: See `/API_V2_DOCUMENTATION.md`
- **Quick Start Guide**: See `/QUICK_START_INTEGRATED_SYSTEM.md`
- **Integration Guide**: See `/KEYWORD_INTEGRATION_COMPLETE.md`
- **Deployment Guide**: See `/deployment/production/DEPLOYMENT_GUIDE.md`

---

## 🆘 Troubleshooting

### Issue: Server Not Responding

```bash
# Check if server is running
curl -s http://localhost:9000/api/v2/health

# If not, start it
./start-dev.sh
```

### Issue: Empty Responses

```bash
# Check if data exists
curl -s http://localhost:9000/api/v2/keywords/stats

# If no keywords, generate sample data
node examples/generate-sample-data.js
```

### Issue: Slow Responses

```bash
# Run performance benchmark
node examples/performance-benchmark.js

# Check database size
sqlite3 database/unified.db "SELECT COUNT(*) FROM unified_keywords;"

# Consider adding indexes or caching
```

---

**Examples Version**: 2.0
**Last Updated**: 2025-10-26
**Status**: Production Ready

Happy coding! 🚀
