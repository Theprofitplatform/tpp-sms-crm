# Monitoring Guide

**Complete guide to application monitoring, health checks, and performance tracking**

**Version:** 2.0.0
**Last Updated:** October 18, 2025

---

## Overview

The SEO Automation Tool includes comprehensive monitoring capabilities:

- **Health Checks** - System and dependency health
- **Performance Monitoring** - Operation timing and metrics
- **Error Tracking** - Automatic error capture and reporting
- **Monitoring Dashboard** - Unified view of all metrics

---

## Quick Start

```bash
# Run health check
npm run health

# View monitoring dashboard
npm run monitor:dashboard

# Continuous monitoring (60s intervals)
npm run monitor:continuous

# Generate monitoring report
npm run monitor:report
```

---

## Health Checks

### What It Checks

1. **WordPress API** - Connectivity and response time
2. **Filesystem** - Logs directory access and writability
3. **Configuration** - Required environment variables
4. **Node.js Version** - Compatibility check
5. **Disk Space** - Available storage

### Run Health Check

```bash
npm run health
```

### Output Example

```
====================================================================
HEALTH CHECK RESULTS
====================================================================
{
  "healthy": true,
  "timestamp": "2025-10-18T00:00:00.000Z",
  "checks": {
    "node_version": {
      "status": "healthy",
      "version": "v20.11.0",
      "supported": true
    },
    "wordpress_api": {
      "status": "healthy",
      "responseTime": "245ms",
      "statusCode": 200
    },
    ...
  },
  "summary": {
    "total": 5,
    "healthy": 5,
    "unhealthy": 0
  }
}
====================================================================
```

### Use in Scripts

```javascript
import HealthCheck from './src/monitoring/health-check.js';

const healthCheck = new HealthCheck();
const results = await healthCheck.runAll();

if (!results.healthy) {
  console.error('System is unhealthy!');
  process.exit(1);
}
```

---

## Performance Monitoring

### Track Operations

```javascript
import { performanceMonitor } from './src/monitoring/performance-monitor.js';

// Start timing
performanceMonitor.start('wordpress-api-call');

// Do work
await fetchWordPressPosts();

// End timing
performanceMonitor.end('wordpress-api-call', {
  posts: 10,
  endpoint: '/wp-json/wp/v2/posts'
});
```

### Using the Measure Helper

```javascript
const results = await performanceMonitor.measure(
  'seo-audit',
  async () => {
    return await runSEOAudit(post);
  },
  { postId: post.id }
);
```

### Get Statistics

```javascript
// Get stats for specific operation
const stats = performanceMonitor.getStats('wordpress-api-call');
console.log(stats);
// {
//   operation: 'wordpress-api-call',
//   count: 25,
//   average: 245,
//   min: 120,
//   max: 890,
//   median: 230,
//   p95: 450,
//   p99: 750
// }

// Get all statistics
const allStats = performanceMonitor.getAllStats();
```

### Performance Thresholds

- **Good:** < 1000ms
- **Slow:** 1000-5000ms ⚠️
- **Very Slow:** 5000-10000ms ⚠️
- **Critical:** > 10000ms 🔴

### Generate Report

```javascript
const report = performanceMonitor.generateReport();
performanceMonitor.saveReport(); // Saves to logs/performance/
```

---

## Error Tracking

### Automatic Error Capture

Error tracking automatically captures:
- Uncaught exceptions
- Unhandled promise rejections
- Manual error captures

### Manual Error Capture

```javascript
import { errorTracker } from './src/monitoring/error-tracker.js';

try {
  await riskyOperation();
} catch (error) {
  errorTracker.captureError(error, {
    component: 'wordpress-api',
    operation: 'fetchPosts',
    userId: user.id
  });
  throw error;
}
```

### Capture Messages

```javascript
errorTracker.captureMessage('Rate limit exceeded', 'warning', {
  endpoint: '/wp-json/wp/v2/posts',
  limit: 100
});
```

### Wrap Functions

```javascript
const safeFetch = errorTracker.wrap(fetchWordPressPosts, {
  component: 'wordpress-api'
});

await safeFetch(); // Errors automatically tracked
```

### Get Error Statistics

```javascript
const stats = errorTracker.getStats();
console.log(stats);
// {
//   total: 5,
//   byType: { 'Error': 3, 'TypeError': 2 },
//   mostCommon: [...],
//   recent: [...]
// }
```

### Generate Report

```javascript
const report = errorTracker.generateReport();
errorTracker.saveReport(); // Saves to logs/errors/
```

---

## Monitoring Dashboard

### View Dashboard

```bash
# One-time check
npm run monitor:dashboard

# Continuous monitoring (60s intervals)
npm run monitor:continuous

# Custom interval (30s)
node src/monitoring/dashboard.js continuous 30000

# Save report
npm run monitor:report
```

### Dashboard Output

```
================================================================================
SEO AUTOMATION - MONITORING DASHBOARD
================================================================================
Timestamp: 2025-10-18T00:00:00.000Z
================================================================================

📊 HEALTH CHECKS
--------------------------------------------------------------------------------
✅ NODE VERSION: healthy
✅ CONFIGURATION: healthy
✅ FILESYSTEM: healthy
✅ DISK SPACE: healthy
✅ WORDPRESS API: healthy

Overall Status: ✅ HEALTHY
Duration: 245ms

⚡ PERFORMANCE METRICS
--------------------------------------------------------------------------------

wordpress-api-call:
  Count: 15
  Average: 245ms
  Min: 120ms | Max: 890ms
  P95: 450ms | P99: 750ms

seo-audit:
  Count: 10
  Average: 1523ms
  Min: 987ms | Max: 3421ms
  P95: 2890ms | P99: 3200ms

🔴 ERROR TRACKING
--------------------------------------------------------------------------------
Total Errors: 2

By Type:
  Error: 2

Most Common:
  Error:Connection timeout (2 times, 100%)

💻 SYSTEM METRICS
--------------------------------------------------------------------------------
Node Version: v20.11.0
Platform: linux
Uptime: 1234s
Memory Usage:
  RSS: 145MB
  Heap Total: 84MB
  Heap Used: 52MB
  External: 3MB

================================================================================
```

---

## Integration with CI/CD

### GitHub Actions Health Check

```yaml
- name: Run health check
  run: npm run health
  env:
    NODE_ENV: test
```

### Pre-deployment Check

```bash
#!/bin/bash
npm run health
if [ $? -ne 0 ]; then
  echo "Health check failed, aborting deployment"
  exit 1
fi
```

---

## Log Files

All monitoring data is saved to structured logs:

```
logs/
├── performance/
│   └── performance-1697654321000.json
├── errors/
│   └── errors-1697654321000.json
└── monitoring/
    └── monitoring-1697654321000.json
```

---

## Best Practices

### 1. Regular Health Checks

Run health checks:
- On application startup
- Before critical operations
- In CI/CD pipelines
- Via cron jobs (production)

### 2. Performance Monitoring

Track:
- API calls
- Database queries
- File operations
- Heavy computations

### 3. Error Tracking

Always capture:
- All caught exceptions
- Failed API calls
- Validation errors
- User errors

### 4. Alerting

Set up alerts for:
- Failed health checks
- Slow operations (> 5s)
- Error spikes
- Memory issues

---

## Troubleshooting

### Health Check Fails

```bash
# Check WordPress API manually
curl https://your-site.com/wp-json/wp/v2/posts

# Verify environment variables
cat config/env/.env

# Check logs
tail -f logs/seo-*.log
```

### High Memory Usage

```bash
# View memory usage
npm run monitor:dashboard

# Check for memory leaks
node --inspect src/index.js
```

### Slow Performance

```bash
# Generate performance report
npm run monitor:report

# Review logs/performance/ for bottlenecks
```

---

## Production Monitoring

### Recommended Setup

1. **Health Check Cron**
   ```cron
   */5 * * * * cd /app && npm run health >> /var/log/health.log
   ```

2. **Continuous Dashboard**
   ```bash
   npm run monitor:continuous > /var/log/monitoring.log 2>&1 &
   ```

3. **Error Alerts**
   - Configure error threshold alerts
   - Email notifications for critical errors
   - Slack/Discord webhooks

### External Monitoring

Consider integrating:
- **Sentry** - Error tracking
- **New Relic** - APM
- **DataDog** - Infrastructure monitoring
- **Pingdom** - Uptime monitoring

---

## API Reference

### HealthCheck

```javascript
const healthCheck = new HealthCheck();
await healthCheck.runAll();
await healthCheck.checkWordPressAPI();
await healthCheck.checkFilesystem();
```

### PerformanceMonitor

```javascript
performanceMonitor.start(operationName);
performanceMonitor.end(operationName, metadata);
performanceMonitor.measure(name, fn, metadata);
performanceMonitor.getStats(operationName);
performanceMonitor.generateReport();
```

### ErrorTracker

```javascript
errorTracker.captureError(error, context);
errorTracker.captureMessage(message, level, context);
errorTracker.wrap(fn, context);
errorTracker.getStats();
errorTracker.generateReport();
```

### MonitoringDashboard

```javascript
const dashboard = new MonitoringDashboard();
await dashboard.runCheck();
dashboard.startContinuous(intervalMs);
await dashboard.generateReport();
```

---

## Related Documentation

- [Getting Started](../setup/GETTING-STARTED.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [CI/CD Workflows](../../.github/workflows/README.md)

---

**Status:** Comprehensive monitoring system ready for production use.
