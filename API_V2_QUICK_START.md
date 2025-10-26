# API v2 Quick Start Guide

## Installation & Setup

### 1. Start the Services

**Terminal 1 - Main Dashboard Server:**
```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js
```

**Terminal 2 - Keyword Research Service:**
```bash
cd keyword-service
source venv/bin/activate  # or venv\Scripts\activate on Windows
python api_server.py
```

The API will be available at: `http://localhost:9000/api/v2`

### 2. Verify Installation

```bash
# Check API health
curl http://localhost:9000/api/v2/health

# Check sync status
curl http://localhost:9000/api/v2/sync/status
```

---

## Common Tasks

### Task 1: Create a Keyword Research Project

```bash
curl -X POST http://localhost:9000/api/v2/research/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Research Project",
    "client_id": "client123",
    "seeds": "seo tools, keyword research, content planning",
    "geo": "US",
    "language": "en",
    "focus": "informational"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "project_id": 1,
    "name": "My First Research Project",
    "status": "processing",
    "estimated_completion": "2025-10-26T12:05:00Z"
  }
}
```

---

### Task 2: Get Project Results

Wait ~5 minutes for processing, then:

```bash
# Get project details
curl http://localhost:9000/api/v2/research/projects/1

# Get keywords with pagination
curl "http://localhost:9000/api/v2/research/projects/1/keywords?page=1&per_page=50"

# Get top opportunities
curl "http://localhost:9000/api/v2/research/projects/1/keywords?sort=opportunity&min_opportunity=70"
```

---

### Task 3: Track Top Keywords

```bash
curl -X POST http://localhost:9000/api/v2/research/projects/1/track-opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 20,
    "min_opportunity": 75,
    "intent_filter": ["informational", "commercial"],
    "domain": "example.com"
  }'
```

---

### Task 4: Monitor Tracked Keywords

```bash
# List all tracked keywords
curl "http://localhost:9000/api/v2/keywords?source=tracking&client_id=client123"

# Get specific keyword details
curl http://localhost:9000/api/v2/keywords/1

# Get keyword statistics
curl "http://localhost:9000/api/v2/keywords/stats?client_id=client123"
```

---

### Task 5: Add Individual Keyword

```bash
curl -X POST http://localhost:9000/api/v2/keywords \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "best seo tools 2025",
    "client_id": "client123",
    "track": true
  }'
```

---

### Task 6: Enrich Keyword with Research Data

```bash
curl -X POST http://localhost:9000/api/v2/keywords/1/enrich \
  -H "Content-Type: application/json"
```

---

### Task 7: Export Keywords to CSV

```bash
curl -X POST http://localhost:9000/api/v2/research/projects/1/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "min_volume": 1000,
      "max_difficulty": 50
    }
  }' \
  --output keywords.csv
```

---

## Filtering & Sorting

### Filter Keywords by Criteria

```bash
# High volume, low difficulty keywords
curl "http://localhost:9000/api/v2/keywords?min_volume=5000&max_difficulty=40"

# Informational intent only
curl "http://localhost:9000/api/v2/keywords?intent=informational"

# Sort by search volume
curl "http://localhost:9000/api/v2/keywords?sort=volume&order=desc"
```

---

## Synchronization

### Check Sync Status

```bash
curl http://localhost:9000/api/v2/sync/status
```

### Trigger Manual Sync

```bash
# Sync keywords
curl -X POST http://localhost:9000/api/v2/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "keywords"}'

# Full sync
curl -X POST http://localhost:9000/api/v2/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "full", "force": true}'
```

### Bulk Sync Keywords

```bash
curl -X POST http://localhost:9000/api/v2/sync/keywords/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "keyword_ids": [1, 2, 3, 4, 5],
    "client_id": "client123",
    "domain": "example.com"
  }'
```

---

## Error Handling

### Common Errors

**503 Service Unavailable:**
```json
{
  "success": false,
  "error": "Keyword research service unavailable"
}
```
**Solution:** Ensure Python keyword service is running on port 5000

**404 Not Found:**
```json
{
  "success": false,
  "error": "Project not found"
}
```
**Solution:** Verify the project ID exists

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Invalid keyword ID"
}
```
**Solution:** Check parameter format and requirements

---

## Testing with cURL

### Save Common Variables

```bash
# Set base URL
export API_URL="http://localhost:9000/api/v2"

# Set client ID
export CLIENT_ID="client123"

# Now use variables
curl "$API_URL/keywords?client_id=$CLIENT_ID"
```

### POST with JSON File

```bash
# Create request.json
cat > request.json <<EOF
{
  "name": "Test Project",
  "client_id": "client123",
  "seeds": "test keyword, example term"
}
EOF

# Send request
curl -X POST $API_URL/research/projects \
  -H "Content-Type: application/json" \
  -d @request.json
```

---

## Integration Examples

### Node.js / JavaScript

```javascript
// Using fetch
const createProject = async () => {
  const response = await fetch('http://localhost:9000/api/v2/research/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Q4 Strategy',
      client_id: 'client123',
      seeds: 'seo, marketing, analytics'
    })
  });

  const data = await response.json();
  console.log('Project ID:', data.data.project_id);
};

// Using axios
const axios = require('axios');

const getKeywords = async (projectId) => {
  const response = await axios.get(
    `http://localhost:9000/api/v2/research/projects/${projectId}/keywords`,
    { params: { per_page: 50, sort: 'opportunity' } }
  );

  return response.data.data;
};
```

### Python

```python
import requests

# Create research project
response = requests.post(
    'http://localhost:9000/api/v2/research/projects',
    json={
        'name': 'Python Test Project',
        'client_id': 'client123',
        'seeds': 'python, data science, machine learning'
    }
)

project_id = response.json()['data']['project_id']
print(f'Created project: {project_id}')

# Get keywords
keywords = requests.get(
    f'http://localhost:9000/api/v2/research/projects/{project_id}/keywords',
    params={'per_page': 50, 'sort': 'opportunity'}
)

for kw in keywords.json()['data']:
    print(f"{kw['keyword']}: {kw['opportunity_score']}")
```

### PHP

```php
<?php

// Create research project
$data = [
    'name' => 'PHP Test Project',
    'client_id' => 'client123',
    'seeds' => 'php, web development, laravel'
];

$ch = curl_init('http://localhost:9000/api/v2/research/projects');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = json_decode(curl_exec($ch), true);
$projectId = $response['data']['project_id'];

echo "Created project: $projectId\n";
curl_close($ch);
?>
```

---

## Postman Collection

Import this collection to Postman:

```json
{
  "info": {
    "name": "SEO Automation API v2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:9000/api/v2"
    },
    {
      "key": "client_id",
      "value": "client123"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Create Research Project",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/research/projects",
        "body": {
          "mode": "raw",
          "raw": "{\"name\":\"Test Project\",\"client_id\":\"{{client_id}}\",\"seeds\":\"seo,marketing\"}"
        }
      }
    },
    {
      "name": "List Keywords",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/keywords?client_id={{client_id}}&per_page=50"
      }
    }
  ]
}
```

---

## Best Practices

### 1. Pagination

Always use pagination for large datasets:
```bash
curl "http://localhost:9000/api/v2/keywords?page=1&per_page=50"
```

### 2. Filtering

Filter data server-side instead of client-side:
```bash
# Good: Server-side filtering
curl "http://localhost:9000/api/v2/keywords?min_volume=1000"

# Bad: Fetching all and filtering client-side
curl "http://localhost:9000/api/v2/keywords?per_page=1000"
```

### 3. Error Handling

Always check the `success` field:
```javascript
const response = await fetch(url);
const data = await response.json();

if (!data.success) {
  console.error('Error:', data.error, data.message);
  return;
}

// Process data.data
```

### 4. Rate Limiting

Respect rate limits and implement exponential backoff:
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status !== 429) {
      return response;
    }

    // Wait before retrying
    const delay = Math.pow(2, i) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Max retries exceeded');
}
```

### 5. Batch Operations

Use bulk endpoints for multiple operations:
```bash
# Good: Bulk sync
curl -X POST http://localhost:9000/api/v2/sync/keywords/bulk \
  -d '{"keyword_ids": [1,2,3,4,5]}'

# Bad: Individual requests
# for id in 1 2 3 4 5; do curl ...; done
```

---

## Troubleshooting

### Service Not Responding

```bash
# Check if services are running
curl http://localhost:9000/api/v2/health
curl http://localhost:5000/health

# Check sync status for detailed service info
curl http://localhost:9000/api/v2/sync/status
```

### No Data Returned

```bash
# Check if client exists
curl "http://localhost:9000/api/dashboard" | jq '.clients[] | select(.id=="client123")'

# Verify project completed
curl http://localhost:9000/api/v2/research/projects/1 | jq '.data.status'
```

### Slow Performance

```bash
# Use smaller page sizes
curl "http://localhost:9000/api/v2/keywords?per_page=25"

# Add specific filters
curl "http://localhost:9000/api/v2/keywords?client_id=client123&source=tracking"
```

---

## Next Steps

1. Review [API_V2_DOCUMENTATION.md](./API_V2_DOCUMENTATION.md) for complete endpoint details
2. Set up authentication for production use
3. Implement error handling in your application
4. Configure rate limiting for your use case
5. Monitor sync status regularly

---

## Support

- API Documentation: http://localhost:9000/api/v2
- Health Check: http://localhost:9000/api/v2/health
- Sync Status: http://localhost:9000/api/v2/sync/status
