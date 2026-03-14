# Monitoring & Alerting Guide 📊

Complete guide for monitoring the Manual Review System in production.

---

## 📋 Table of Contents

1. [What to Monitor](#what-to-monitor)
2. [Health Check Setup](#health-check-setup)
3. [Performance Metrics](#performance-metrics)
4. [Log Monitoring](#log-monitoring)
5. [Alerting Strategies](#alerting-strategies)
6. [Dashboard Setup](#dashboard-setup)
7. [Troubleshooting Alerts](#troubleshooting-alerts)
8. [Monitoring Tools](#monitoring-tools)

---

## 🎯 What to Monitor

### Critical Metrics (Must Monitor)

| Metric | Target | Alert Threshold | Priority |
|--------|--------|----------------|----------|
| API Uptime | 99.9% | < 99% | Critical |
| Database Connectivity | Always up | Down | Critical |
| WordPress API Response | < 2s | > 5s | High |
| Disk Space | > 20% free | < 10% free | Critical |
| Memory Usage | < 80% | > 90% | High |
| CPU Usage | < 70% | > 85% | Medium |

### Important Metrics (Should Monitor)

| Metric | Target | Alert Threshold | Priority |
|--------|--------|----------------|----------|
| Proposal Success Rate | > 95% | < 90% | High |
| Detection Time | < 30s | > 60s | Medium |
| Apply Time | < 15s | > 30s | Medium |
| Database Size | Monitored | > 1GB | Medium |
| Proposal Count | Monitored | > 10,000 | Low |
| Session Duration | < 5 min | > 15 min | Low |

### Business Metrics (Nice to Monitor)

- Total proposals created (per day/week/month)
- Approval rate (approved / total)
- Rejection rate (rejected / total)
- Engine usage distribution
- Most common fix types
- Client activity

---

## 🏥 Health Check Setup

### Automated Health Checks

**Option 1: Cron Job (Linux/Mac)**

```bash
# Add to crontab: crontab -e

# Check every 5 minutes
*/5 * * * * cd /path/to/project && node scripts/health-check.js >> logs/health.log 2>&1

# Full check every hour
0 * * * * cd /path/to/project && node scripts/troubleshoot.js >> logs/troubleshoot.log 2>&1

# Daily stats at midnight
0 0 * * * cd /path/to/project && node scripts/db-maintenance.js stats >> logs/daily-stats.log 2>&1
```

**Option 2: PM2 Monitoring**

```bash
# Install PM2
npm install -g pm2

# Start with monitoring
pm2 start npm --name "autofix-api" -- start

# Monitor in real-time
pm2 monit

# View logs
pm2 logs autofix-api

# Setup auto-restart on failure
pm2 startup
pm2 save
```

**Option 3: Custom Monitoring Script**

```javascript
// scripts/monitor.js
import http from 'http';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function checkHealth() {
  try {
    const response = await fetch('http://localhost:4000/api/autofix/statistics');
    const data = await response.json();

    console.log(`[${new Date().toISOString()}] Health check OK`);

    // Check specific metrics
    if (data.result.database_size > 1000000000) { // 1GB
      console.warn('WARNING: Database size exceeds 1GB');
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check FAILED:`, error.message);
    // Send alert here
  }
}

setInterval(checkHealth, CHECK_INTERVAL);
checkHealth(); // Run immediately
```

### Health Check Endpoints

**1. API Statistics**
```bash
curl http://localhost:4000/api/autofix/statistics

# Expected response:
{
  "success": true,
  "result": {
    "total_proposals": 1234,
    "total_sessions": 56,
    "by_status": { "pending": 10, "approved": 800, "applied": 400 },
    "database_size": 524288
  }
}
```

**2. Custom Health Endpoint**

Add to `src/api/autofix-review-routes.js`:

```javascript
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {}
  };

  // Database check
  try {
    const stats = proposalService.getStatistics();
    health.checks.database = { status: 'ok', proposals: stats.total_proposals };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = { status: 'error', error: error.message };
  }

  // WordPress check (optional, can be slow)
  // health.checks.wordpress = await checkWordPress();

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

Usage:
```bash
curl http://localhost:4000/api/autofix/health
```

---

## 📈 Performance Metrics

### Response Time Monitoring

**Using Morgan Logger**

```javascript
// In your API server (app.js or server.js)
import morgan from 'morgan';

// Log all requests
app.use(morgan('combined', {
  stream: fs.createWriteStream('./logs/access.log', { flags: 'a' })
}));

// Custom format for analysis
morgan.token('response-time', (req, res) => {
  return res.get('X-Response-Time');
});

app.use(morgan(':method :url :status :response-time ms'));
```

**Analyzing Response Times**

```bash
# Find slow requests (> 1000ms)
grep -E '\s[0-9]{4,}\sms' logs/access.log

# Average response time
awk '{sum+=$NF; count++} END {print sum/count}' logs/access.log
```

### Database Performance

```bash
# Check database size growth
node scripts/db-maintenance.js stats

# Monitor table sizes
sqlite3 database.db "SELECT name, COUNT(*) FROM sqlite_master WHERE type='table' GROUP BY name"

# Check indexes
sqlite3 database.db "SELECT * FROM sqlite_master WHERE type='index'"
```

### Memory Monitoring

```javascript
// Add to your API server
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Memory Usage: ${JSON.stringify({
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
  })}`);
}, 60000); // Every minute
```

---

## 📝 Log Monitoring

### Log Locations

```
logs/
├── access.log          # HTTP access logs
├── error.log           # Application errors
├── health.log          # Health check results
├── troubleshoot.log    # Diagnostic output
├── daily-stats.log     # Daily statistics
└── pm2/               # PM2 logs (if using PM2)
```

### Setting Up Logging

**1. Create Logs Directory**

```bash
mkdir -p logs
chmod 755 logs
```

**2. Configure Application Logging**

```javascript
// utils/logger.js
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'logs', 'app.log');

export function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const entry = JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  });

  console.log(entry);

  fs.appendFileSync(logFile, entry + '\n');
}
```

**3. Log Important Events**

```javascript
// In your engines and services
import { log } from '../utils/logger.js';

// Success
log('info', 'Proposals created', { groupId, count: proposals.length });

// Errors
log('error', 'Failed to apply fix', { proposalId, error: error.message });

// Performance
log('perf', 'Detection completed', { duration: Date.now() - startTime });
```

### Log Rotation

**Using Logrotate (Linux)**

```bash
# /etc/logrotate.d/autofix-api

/path/to/project/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 user user
}
```

**Manual Rotation Script**

```bash
# scripts/rotate-logs.sh
#!/bin/bash

cd /path/to/project/logs
for log in *.log; do
    if [ -f "$log" ]; then
        mv "$log" "$log.$(date +%Y%m%d)"
        gzip "$log.$(date +%Y%m%d)"
        touch "$log"
    fi
done

# Delete logs older than 30 days
find . -name "*.log.*.gz" -mtime +30 -delete
```

### Monitoring Logs

```bash
# Watch logs in real-time
tail -f logs/app.log

# Watch multiple logs
tail -f logs/*.log

# Search for errors
grep -i error logs/app.log

# Count errors by type
grep -i error logs/app.log | cut -d'"' -f8 | sort | uniq -c | sort -rn

# Monitor specific proposals
grep "proposalId\":123" logs/app.log
```

---

## 🚨 Alerting Strategies

### Alert Levels

**Critical (Page immediately)**
- API server down
- Database unreachable
- Disk space < 5%
- All proposals failing

**High (Alert within 15 minutes)**
- Success rate < 90%
- Response time > 5s
- Memory usage > 90%
- Disk space < 10%

**Medium (Alert within 1 hour)**
- Success rate < 95%
- Response time > 3s
- Database size growing rapidly
- CPU usage > 85%

**Low (Daily summary)**
- Proposal count trends
- Usage statistics
- Performance trends

### Email Alerts

**Using Nodemailer**

```javascript
// utils/alerts.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendAlert(level, subject, message) {
  const mailOptions = {
    from: 'alerts@yourcompany.com',
    to: 'team@yourcompany.com',
    subject: `[${level.toUpperCase()}] ${subject}`,
    text: message,
    html: `
      <h2 style="color: ${level === 'critical' ? 'red' : 'orange'}">${subject}</h2>
      <p>${message}</p>
      <hr>
      <small>Timestamp: ${new Date().toISOString()}</small>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Usage
sendAlert('critical', 'API Server Down', 'The API server is not responding');
```

### Slack Alerts

```javascript
// utils/slack.js
async function sendSlackAlert(message, level = 'warning') {
  const webhook = process.env.SLACK_WEBHOOK_URL;

  const payload = {
    text: message,
    attachments: [{
      color: level === 'critical' ? 'danger' : 'warning',
      fields: [{
        title: 'Timestamp',
        value: new Date().toISOString(),
        short: true
      }]
    }]
  };

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### SMS Alerts (Twilio)

```javascript
// utils/sms.js
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(message) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ALERT_PHONE_NUMBER
  });
}
```

### Alert Script

```javascript
// scripts/check-and-alert.js
import { sendAlert } from '../utils/alerts.js';
import http from 'http';

async function checkHealth() {
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:4000/api/autofix/health', resolve);
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });

    if (response.statusCode !== 200) {
      await sendAlert('critical', 'API Health Check Failed',
        `API returned status ${response.statusCode}`);
    }

  } catch (error) {
    await sendAlert('critical', 'API Server Unreachable', error.message);
  }
}

checkHealth();
```

Run via cron:
```bash
*/5 * * * * cd /path/to/project && node scripts/check-and-alert.js
```

---

## 📊 Dashboard Setup

### PM2 Dashboard (Simple)

```bash
# Install PM2 Plus for web dashboard
pm2 install pm2-server-monit

# Or use PM2 Plus (cloud service)
pm2 link <secret> <public>

# Access at: https://app.pm2.io
```

### Custom Dashboard (HTML)

```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Auto-Fix System Dashboard</title>
  <style>
    .metric { padding: 20px; margin: 10px; background: #f0f0f0; border-radius: 5px; }
    .healthy { background: #d4edda; }
    .warning { background: #fff3cd; }
    .critical { background: #f8d7da; }
  </style>
</head>
<body>
  <h1>Auto-Fix System Dashboard</h1>
  <div id="metrics"></div>

  <script>
    async function updateDashboard() {
      const response = await fetch('/api/autofix/statistics');
      const data = await response.json();

      document.getElementById('metrics').innerHTML = `
        <div class="metric healthy">
          <h2>Total Proposals</h2>
          <p>${data.result.total_proposals}</p>
        </div>
        <div class="metric ${data.result.by_status.pending > 100 ? 'warning' : 'healthy'}">
          <h2>Pending Review</h2>
          <p>${data.result.by_status.pending || 0}</p>
        </div>
        <div class="metric healthy">
          <h2>Database Size</h2>
          <p>${(data.result.database_size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      `;
    }

    updateDashboard();
    setInterval(updateDashboard, 30000); // Update every 30s
  </script>
</body>
</html>
```

### Grafana Integration

**1. Install Prometheus + Grafana**

```bash
# Using Docker
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana
```

**2. Add Metrics Endpoint**

```javascript
// Using prom-client
import client from 'prom-client';

const register = new client.Registry();

const proposalCounter = new client.Counter({
  name: 'proposals_total',
  help: 'Total number of proposals',
  labelNames: ['status']
});

const responseTime = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(proposalCounter);
register.registerMetric(responseTime);

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 🔧 Troubleshooting Alerts

### Common Alert Scenarios

**1. High Memory Usage**

```bash
# Identify memory leak
node --inspect scripts/troubleshoot.js

# Check for large objects
node --max-old-space-size=512 your-app.js

# Solution: Restart API server
pm2 restart autofix-api
```

**2. Database Growing Too Large**

```bash
# Check size
du -h database.db

# Clean up old data
node scripts/db-maintenance.js cleanup --days=7

# Optimize
node scripts/db-maintenance.js optimize
```

**3. Slow Response Times**

```bash
# Check slow queries
sqlite3 database.db "EXPLAIN QUERY PLAN SELECT * FROM autofix_proposals WHERE status='pending'"

# Add indexes
sqlite3 database.db "CREATE INDEX idx_status ON autofix_proposals(status)"

# Check WordPress API
curl -w "@curl-format.txt" -o /dev/null -s https://your-site.com/wp-json/
```

**4. High Error Rate**

```bash
# Check recent errors
grep -i error logs/app.log | tail -20

# Check WordPress connectivity
curl -I https://your-site.com/wp-json/

# Verify client configs
node scripts/troubleshoot.js --verbose
```

---

## 🛠️ Monitoring Tools

### Recommended Tools

**1. Uptime Monitoring**
- [UptimeRobot](https://uptimerobot.com/) - Free, easy setup
- [Pingdom](https://www.pingdom.com/) - Advanced monitoring
- [StatusCake](https://www.statuscake.com/) - Uptime + performance

**2. Log Management**
- [Papertrail](https://www.papertrail.com/) - Cloud log management
- [Loggly](https://www.loggly.com/) - Log analysis
- ELK Stack (Elasticsearch, Logstash, Kibana) - Self-hosted

**3. Application Monitoring**
- [PM2 Plus](https://pm2.io/) - Node.js monitoring
- [New Relic](https://newrelic.com/) - APM
- [Datadog](https://www.datadoghq.com/) - Full-stack monitoring

**4. Error Tracking**
- [Sentry](https://sentry.io/) - Error tracking
- [Rollbar](https://rollbar.com/) - Real-time errors
- [Bugsnag](https://www.bugsnag.com/) - Error monitoring

### Quick Setup with UptimeRobot

1. Sign up at https://uptimerobot.com/
2. Add monitor: HTTP(s)
3. URL: `http://your-server:4000/api/autofix/health`
4. Interval: 5 minutes
5. Add alert contacts (email, SMS, Slack)

Done! You'll get alerts if API goes down.

---

## 📋 Monitoring Checklist

### Daily
- [ ] Check API uptime (should be 100%)
- [ ] Review error logs
- [ ] Check pending proposal count
- [ ] Verify disk space

### Weekly
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Analyze success rates
- [ ] Review slow queries

### Monthly
- [ ] Database optimization
- [ ] Review alert patterns
- [ ] Update monitoring thresholds
- [ ] Performance trend analysis

### Quarterly
- [ ] Capacity planning
- [ ] Alert effectiveness review
- [ ] Update monitoring strategy
- [ ] Team training on monitoring tools

---

## 🎯 Success Metrics

Your monitoring is working well when:

- ✅ You know about issues before users report them
- ✅ Alerts are actionable (not noise)
- ✅ MTTR (Mean Time To Recovery) is < 15 minutes
- ✅ False positive rate is < 5%
- ✅ Team responds to critical alerts within 5 minutes
- ✅ Performance trends are visible
- ✅ You can predict capacity needs

---

## 📚 Additional Resources

- **Health Check Script**: `scripts/health-check.js`
- **Troubleshooting**: `scripts/troubleshoot.js`
- **Database Maintenance**: `scripts/db-maintenance.js`
- **Production Deployment**: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **API Reference**: `API_QUICK_REFERENCE.md`

---

**Remember**: The best monitoring system is one that alerts you to problems before they impact users!
