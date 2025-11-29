# Coolify MCP Server - Master Improvement Plan

> Generated: 2025-11-29
> Priority: Critical → High → Medium → Low
> Estimated Total Time: 4-6 hours

---

## Executive Summary

This plan addresses all identified issues and improvements for the Coolify MCP Server project, organized by priority and dependency order.

---

## Phase 1: Critical Security Fixes (30 minutes)

### 1.1 Fix Exposed API Token in SystemD Service

**Issue**: API token is hardcoded in `coolify-mcp.service` file
**Risk**: HIGH - Credentials exposed in version control and service file
**Time**: 10 minutes

**Steps**:
```bash
# 1. Create secure environment file
sudo touch /etc/default/coolify-mcp
sudo chmod 600 /etc/default/coolify-mcp
sudo chown root:root /etc/default/coolify-mcp

# 2. Add secrets to environment file
sudo tee /etc/default/coolify-mcp << 'EOF'
COOLIFY_BASE_URL=https://coolify.theprofitplatform.com.au
COOLIFY_TOKEN=your-token-here
COOLIFY_API_TIMEOUT=60000
COOLIFY_API_MAX_RETRIES=5
NODE_ENV=production
EOF

# 3. Update service file to reference environment file
# Remove hardcoded Environment lines, add EnvironmentFile
```

**Updated Service File**:
```ini
[Unit]
Description=Coolify MCP Server
After=network.target

[Service]
Type=simple
User=avi
Group=avi
WorkingDirectory=/home/avi/projects/coolify/coolify-mcp
EnvironmentFile=/etc/default/coolify-mcp
ExecStart=/usr/bin/node /home/avi/projects/coolify/coolify-mcp/build/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=coolify-mcp
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/avi/projects/coolify/coolify-mcp

[Install]
WantedBy=multi-user.target
```

### 1.2 Rotate API Token

**Time**: 5 minutes

**Steps**:
1. Log into Coolify dashboard: https://coolify.theprofitplatform.com.au
2. Navigate to Settings → Security → API Tokens
3. Generate new API token
4. Update `/etc/default/coolify-mcp` with new token
5. Delete old token from Coolify
6. Restart service: `sudo systemctl restart coolify-mcp`

### 1.3 Verify Security Fix

**Time**: 5 minutes

```bash
# Check service is running with new config
sudo systemctl status coolify-mcp

# Verify no secrets in service file
grep -i token /etc/systemd/system/coolify-mcp.service
# Should return nothing

# Test API connectivity
cd /home/avi/projects/coolify/coolify-mcp
node health-check-coolify.js
```

---

## Phase 2: Development Environment (1 hour)

### 2.1 Create Docker Compose for Local Development

**Time**: 30 minutes

**File**: `/home/avi/projects/coolify/coolify-mcp/docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  coolify-mcp:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: coolify-mcp-dev
    volumes:
      - ./src:/app/src:ro
      - ./tests:/app/tests:ro
      - ./package.json:/app/package.json:ro
      - ./tsconfig.json:/app/tsconfig.json:ro
    env_file:
      - .env.dev
    ports:
      - "3000:3000"
    networks:
      - coolify-dev
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('ok')"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Local Qdrant for vector search testing
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant-dev
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - coolify-dev

networks:
  coolify-dev:
    driver: bridge

volumes:
  qdrant-data:
```

### 2.2 Create Development Dockerfile

**File**: `/home/avi/projects/coolify/coolify-mcp/Dockerfile.dev`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source (mounted as volume in dev)
COPY . .

# Build TypeScript
RUN npm run build

# Development mode with watch
CMD ["npm", "run", "dev"]
```

### 2.3 Create Development Environment Template

**File**: `/home/avi/projects/coolify/coolify-mcp/.env.dev`

```env
# Development Environment Configuration
NODE_ENV=development
DEBUG=true

# Coolify API (use test instance or mock)
COOLIFY_BASE_URL=http://localhost:8080
COOLIFY_TOKEN=dev-token-for-testing

# API Settings
COOLIFY_API_TIMEOUT=30000
COOLIFY_API_MAX_RETRIES=3
COOLIFY_API_RETRY_DELAY=1000

# Optional: Qdrant (local instance)
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Logging
LOG_LEVEL=debug
```

---

## Phase 3: Testing Improvements (1 hour)

### 3.1 Add Mock-Based Integration Tests

**Time**: 45 minutes

**File**: `/home/avi/projects/coolify/coolify-mcp/tests/mocks/coolify-api.mock.ts`

```typescript
import { jest } from '@jest/globals';

export const mockCoolifyResponses = {
  servers: {
    list: [
      { uuid: 'server-1', name: 'Production Server', status: 'running' },
      { uuid: 'server-2', name: 'Staging Server', status: 'running' }
    ],
    get: { uuid: 'server-1', name: 'Production Server', ip: '10.0.0.1' }
  },
  applications: {
    list: [
      { uuid: 'app-1', name: 'web-app', status: 'running' },
      { uuid: 'app-2', name: 'api-server', status: 'running' }
    ]
  },
  databases: {
    list: [
      { uuid: 'db-1', name: 'postgres-main', type: 'postgresql' }
    ]
  }
};

export const createMockAxios = () => ({
  get: jest.fn().mockImplementation((url: string) => {
    if (url.includes('/servers')) {
      return Promise.resolve({ data: mockCoolifyResponses.servers.list });
    }
    if (url.includes('/applications')) {
      return Promise.resolve({ data: mockCoolifyResponses.applications.list });
    }
    return Promise.resolve({ data: {} });
  }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } })
});
```

### 3.2 Update Jest Configuration for Mocks

**Update**: `/home/avi/projects/coolify/coolify-mcp/jest.config.js`

Add mock configuration:
```javascript
moduleNameMapper: {
  '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1'
}
```

### 3.3 Create Mock-Based Test Suite

**File**: `/home/avi/projects/coolify/coolify-mcp/tests/integration/mock-api.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createMockAxios, mockCoolifyResponses } from '../mocks/coolify-api.mock';

describe('Coolify MCP Server (Mocked)', () => {
  let mockAxios: ReturnType<typeof createMockAxios>;

  beforeEach(() => {
    mockAxios = createMockAxios();
    jest.clearAllMocks();
  });

  describe('Server Tools', () => {
    it('should list servers', async () => {
      const result = await mockAxios.get('/servers');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Production Server');
    });
  });

  describe('Application Tools', () => {
    it('should list applications', async () => {
      const result = await mockAxios.get('/applications');
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Batch Operations', () => {
    it('should handle parallel operations', async () => {
      const operations = [
        mockAxios.post('/applications/app-1/restart'),
        mockAxios.post('/applications/app-2/restart')
      ];
      const results = await Promise.all(operations);
      expect(results).toHaveLength(2);
      results.forEach(r => expect(r.data.success).toBe(true));
    });
  });
});
```

---

## Phase 4: Monitoring & Observability (1.5 hours)

### 4.1 Add Prometheus Metrics Endpoint

**Time**: 45 minutes

**File**: `/home/avi/projects/coolify/coolify-mcp/src/metrics/prometheus.ts`

```typescript
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsCollector {
  private registry: Registry;

  public toolExecutions: Counter;
  public toolDuration: Histogram;
  public activeConnections: Gauge;
  public apiErrors: Counter;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.toolExecutions = new Counter({
      name: 'coolify_mcp_tool_executions_total',
      help: 'Total number of tool executions',
      labelNames: ['tool_name', 'status'],
      registers: [this.registry]
    });

    this.toolDuration = new Histogram({
      name: 'coolify_mcp_tool_duration_seconds',
      help: 'Tool execution duration in seconds',
      labelNames: ['tool_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });

    this.activeConnections = new Gauge({
      name: 'coolify_mcp_active_connections',
      help: 'Number of active MCP connections',
      registers: [this.registry]
    });

    this.apiErrors = new Counter({
      name: 'coolify_api_errors_total',
      help: 'Total API errors by type',
      labelNames: ['error_type', 'endpoint'],
      registers: [this.registry]
    });
  }

  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }
}

export const metrics = new MetricsCollector();
```

### 4.2 Create Grafana Dashboard

**Time**: 30 minutes

**File**: `/home/avi/projects/coolify/coolify-mcp/monitoring/grafana-dashboard.json`

```json
{
  "dashboard": {
    "title": "Coolify MCP Server",
    "uid": "coolify-mcp",
    "panels": [
      {
        "title": "Tool Executions per Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(coolify_mcp_tool_executions_total[1m])",
            "legendFormat": "{{tool_name}}"
          }
        ]
      },
      {
        "title": "Tool Execution Duration (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(coolify_mcp_tool_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "API Errors",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(increase(coolify_api_errors_total[1h]))"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "gauge",
        "targets": [
          {
            "expr": "coolify_mcp_active_connections"
          }
        ]
      }
    ]
  }
}
```

### 4.3 Deploy Monitoring Stack via Coolify

**Script**: `/home/avi/projects/coolify/scripts/deploy-monitoring.sh`

```bash
#!/bin/bash
# Deploy Prometheus + Grafana via Coolify

echo "Deploying monitoring stack..."

# This would use the MCP tools to deploy:
# 1. Prometheus (scrapes /metrics endpoint)
# 2. Grafana (visualizes metrics)
# 3. AlertManager (optional - for alerts)

cd /home/avi/projects/coolify/coolify-mcp

# Use MCP to create the monitoring services
node -e "
const { spawn } = require('child_process');
// Deploy via Coolify API
console.log('Monitoring stack deployment triggered');
"
```

---

## Phase 5: Backup & Recovery (45 minutes)

### 5.1 Automated Backup Verification

**File**: `/home/avi/projects/coolify/scripts/verify-backups.sh`

```bash
#!/bin/bash
# Backup Verification Script
# Run daily after backups complete

set -euo pipefail

LOG_FILE="/var/log/coolify-backup-verify.log"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_URL:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_alert() {
    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"🔴 Backup Verification Failed: $1\"}"
    fi
}

log "Starting backup verification..."

# 1. Check S3 bucket connectivity
if ! aws s3 ls s3://your-backup-bucket/ > /dev/null 2>&1; then
    send_alert "Cannot connect to S3 bucket"
    exit 1
fi

# 2. Verify latest backup exists and is recent (within 24 hours)
LATEST_BACKUP=$(aws s3 ls s3://your-backup-bucket/databases/ --recursive | sort | tail -n 1)
if [[ -z "$LATEST_BACKUP" ]]; then
    send_alert "No backups found in S3"
    exit 1
fi

# 3. Check backup file size (should be > 1MB for valid backup)
BACKUP_SIZE=$(echo "$LATEST_BACKUP" | awk '{print $3}')
if [[ "$BACKUP_SIZE" -lt 1048576 ]]; then
    send_alert "Backup file too small: ${BACKUP_SIZE} bytes"
    exit 1
fi

log "✅ Backup verification passed"
log "Latest backup: $LATEST_BACKUP"
```

### 5.2 Rollback Procedures Documentation

**File**: `/home/avi/projects/coolify/docs/ROLLBACK-PROCEDURES.md`

```markdown
# Rollback Procedures

## Application Rollback

### Via MCP Tools
```bash
# List recent deployments
node -e "// use get_application_deployment_history tool"

# Rollback to specific deployment
node -e "// use rollback_deployment tool with deployment_id"
```

### Via Coolify Dashboard
1. Navigate to Application → Deployments
2. Find the last working deployment
3. Click "Rollback" button
4. Confirm rollback

## Database Rollback

### From S3 Backup
```bash
# 1. List available backups
aws s3 ls s3://backup-bucket/databases/

# 2. Download backup
aws s3 cp s3://backup-bucket/databases/backup-2024-xx-xx.sql.gz ./

# 3. Restore (PostgreSQL example)
gunzip backup-2024-xx-xx.sql.gz
psql -h localhost -U postgres -d dbname < backup-2024-xx-xx.sql
```

## Service Rollback

### Docker Image Rollback
```bash
# Via Coolify MCP - update application to previous image tag
node -e "// use update_application with previous image:tag"
```

## Emergency Contacts
- Primary: [Your contact]
- Coolify Instance: https://coolify.theprofitplatform.com.au
- VPS IP: 31.97.222.218
```

---

## Phase 6: Documentation & Guidelines (30 minutes)

### 6.1 Create CONTRIBUTING.md

**File**: `/home/avi/projects/coolify/coolify-mcp/CONTRIBUTING.md`

```markdown
# Contributing to Coolify MCP Server

## Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Run tests: `npm test`

## Adding New Tools

1. Create tool file in appropriate `src/tools/<category>/` directory
2. Extend `BaseTool` class
3. Define Zod schema in `src/schemas/`
4. Register in `src/tools/registry.ts`
5. Add tests in `tests/unit/`
6. Update documentation

## Code Standards

- TypeScript strict mode
- All inputs validated with Zod
- Comprehensive error handling
- Winston logging for all operations
- 70% minimum test coverage

## Pull Request Process

1. Create feature branch: `feat/description`
2. Make changes with tests
3. Run `npm run lint && npm test`
4. Submit PR with description
5. Address review feedback

## Security

- Never commit secrets
- Use environment variables
- Report vulnerabilities privately
```

### 6.2 Create Deployment Checklist

**File**: `/home/avi/projects/coolify/docs/DEPLOYMENT-CHECKLIST.md`

```markdown
# Deployment Checklist

## Pre-Deployment
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured
- [ ] Backup verified

## Deployment
- [ ] Pull latest code
- [ ] Install dependencies (`npm ci`)
- [ ] Build project
- [ ] Restart service
- [ ] Verify health check

## Post-Deployment
- [ ] Check service logs
- [ ] Verify API connectivity
- [ ] Run smoke tests
- [ ] Monitor for errors (15 min)
- [ ] Update documentation if needed
```

---

## Implementation Schedule

| Phase | Priority | Duration | Dependencies |
|-------|----------|----------|--------------|
| Phase 1: Security Fixes | 🔴 Critical | 30 min | None |
| Phase 2: Dev Environment | 🟠 High | 1 hr | Phase 1 |
| Phase 3: Testing | 🟠 High | 1 hr | Phase 2 |
| Phase 4: Monitoring | 🟡 Medium | 1.5 hrs | Phase 1 |
| Phase 5: Backup/Recovery | 🟡 Medium | 45 min | Phase 1 |
| Phase 6: Documentation | 🟢 Low | 30 min | None |

**Total Estimated Time**: 5-6 hours

---

## Quick Start Commands

```bash
# Phase 1 - Fix Security (DO THIS FIRST!)
cd /home/avi/projects/coolify/coolify-mcp
sudo ./scripts/fix-security.sh

# Phase 2 - Setup Dev Environment
docker-compose -f docker-compose.dev.yml up -d

# Phase 3 - Run Tests
npm run test:unit
npm run test:integration

# Phase 4 - Deploy Monitoring
./scripts/deploy-monitoring.sh

# Phase 5 - Verify Backups
./scripts/verify-backups.sh

# Phase 6 - Generate Docs
npm run docs
```

---

## Success Criteria

- [ ] No secrets in version control or service files
- [ ] Local development environment works with Docker
- [ ] Tests run without real API credentials
- [ ] Metrics visible in Grafana dashboard
- [ ] Backup verification automated
- [ ] Documentation complete and current

---

## Notes

- Phase 1 is **CRITICAL** - do not skip
- Phases 2-3 can run in parallel
- Phases 4-6 can be done incrementally
- All scripts should be tested in staging first
