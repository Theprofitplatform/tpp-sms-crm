# Local SEO Automation Guide

**Version:** 3.1 with Scheduler & Notifications  
**Date:** October 29, 2025

---

## 🎯 Overview

The Local SEO platform now includes **automated scheduling** and **notification services** to run audits automatically and alert you when they complete.

---

## 🔧 New Features

### 1. Automated Audit Scheduling

Schedule audits to run automatically at specified intervals:
- **Daily** - Run every day at a specified time
- **Weekly** - Run once per week on a specified day
- **Monthly** - Run once per month on a specified day

### 2. Notification Service

Get notified when audits complete:
- **Email notifications** (placeholder - ready for integration)
- **Webhook notifications** (placeholder - ready for integration)
- **File logging** (active - logs all notifications)

### 3. Progress Tracking

Monitor scheduled audit execution:
- Real-time event emissions
- Run history tracking
- Success/failure statistics
- Audit completion details

---

## 📚 API Endpoints

### Schedule an Audit

**POST** `/api/local-seo/schedule/:clientId`

Schedule automated audits for a client.

**Request Body:**
```json
{
  "frequency": "daily|weekly|monthly",
  "hour": 2,
  "minute": 0,
  "dayOfWeek": 1,     // For weekly (0=Sunday, 1=Monday, etc.)
  "dayOfMonth": 1     // For monthly (1-31)
}
```

**Examples:**

```bash
# Daily audit at 2:00 AM
curl -X POST http://localhost:9000/api/local-seo/schedule/instantautotraders \
  -H "Content-Type: application/json" \
  -d '{"frequency": "daily", "hour": 2, "minute": 0}'

# Weekly audit on Monday at 3:00 AM
curl -X POST http://localhost:9000/api/local-seo/schedule/hottyres \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly", "hour": 3, "minute": 0, "dayOfWeek": 1}'

# Monthly audit on 1st at 4:00 AM
curl -X POST http://localhost:9000/api/local-seo/schedule/clientname \
  -H "Content-Type: application/json" \
  -d '{"frequency": "monthly", "hour": 4, "minute": 0, "dayOfMonth": 1}'
```

**Response:**
```json
{
  "success": true,
  "message": "daily audit scheduled for instantautotraders",
  "schedule": {
    "frequency": "daily",
    "hour": 2,
    "minute": 0
  }
}
```

---

### Unschedule Audits

**DELETE** `/api/local-seo/schedule/:clientId?frequency=daily`

Remove scheduled audits for a client.

**Query Parameters:**
- `frequency` (optional) - Specific frequency to unschedule (`daily`, `weekly`, `monthly`)
- If omitted, unschedules ALL audits for the client

**Examples:**

```bash
# Unschedule daily audit only
curl -X DELETE "http://localhost:9000/api/local-seo/schedule/instantautotraders?frequency=daily"

# Unschedule all audits for client
curl -X DELETE "http://localhost:9000/api/local-seo/schedule/instantautotraders"
```

**Response:**
```json
{
  "success": true,
  "message": "Unscheduled 1 audit(s) for instantautotraders",
  "unscheduled": 1
}
```

---

### Get Scheduled Audits

**GET** `/api/local-seo/schedule?clientId=instantautotraders`

List all scheduled audits.

**Query Parameters:**
- `clientId` (optional) - Filter by specific client

**Examples:**

```bash
# Get all scheduled audits
curl http://localhost:9000/api/local-seo/schedule

# Get schedules for specific client
curl "http://localhost:9000/api/local-seo/schedule?clientId=instantautotraders"
```

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "daily_instantautotraders",
      "clientId": "instantautotraders",
      "schedule": "daily",
      "cronExpression": "0 2 * * *",
      "createdAt": "2025-10-29T03:00:00.000Z",
      "nextRun": "2025-10-30T02:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### Get Scheduler Statistics

**GET** `/api/local-seo/schedule/stats`

Get statistics about scheduled audits and their execution history.

**Example:**

```bash
curl http://localhost:9000/api/local-seo/schedule/stats
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalJobs": 3,
    "totalRuns": 15,
    "successfulRuns": 14,
    "failedRuns": 1,
    "successRate": 93,
    "lastRun": {
      "clientId": "instantautotraders",
      "schedule": "daily",
      "status": "success",
      "timestamp": "2025-10-29T02:00:00.000Z"
    }
  },
  "recentRuns": [
    {
      "clientId": "instantautotraders",
      "schedule": "daily",
      "status": "success",
      "timestamp": "2025-10-29T02:00:00.000Z"
    }
  ]
}
```

---

## 🔔 Notifications

### How Notifications Work

When a scheduled audit completes, the notification service:

1. **Logs to file** - Always enabled by default
2. **Sends email** - If configured (placeholder)
3. **Calls webhook** - If configured (placeholder)

### Configure Notifications

**Environment Variables:**

```bash
# Email notification recipient
export NOTIFICATION_EMAIL="your-email@example.com"

# Webhook URL for notifications
export NOTIFICATION_WEBHOOK="https://your-webhook-url.com/local-seo"
```

### Notification Data Structure

```json
{
  "type": "audit_completed",
  "clientId": "instantautotraders",
  "score": 95,
  "timestamp": "2025-10-29T02:15:00.000Z",
  "details": {
    "napScore": 100,
    "schemaScore": 100,
    "schedule": "daily"
  }
}
```

### Notification Files

Notifications are logged to:
```
logs/notifications/notifications-YYYY-MM-DD.json
```

Each file contains an array of all notifications for that day.

---

## 📊 Event Monitoring

The scheduler emits events that you can listen to:

### Available Events

```javascript
// Audit started
localSEOScheduler.on('auditStarted', (data) => {
  console.log(`Audit started for ${data.clientId}`);
});

// Audit completed successfully
localSEOScheduler.on('auditCompleted', (data) => {
  console.log(`Audit completed: ${data.score}/100`);
  // data includes: clientId, score, napScore, schemaScore, results
});

// Audit failed
localSEOScheduler.on('auditFailed', (data) => {
  console.error(`Audit failed: ${data.error}`);
  // data includes: clientId, schedule, error
});
```

---

## 💡 Usage Examples

### Example 1: Daily Audits for All Clients

```bash
#!/bin/bash

CLIENTS=("instantautotraders" "hottyres" "client3")

for client in "${CLIENTS[@]}"; do
  curl -X POST http://localhost:9000/api/local-seo/schedule/$client \
    -H "Content-Type: application/json" \
    -d "{\"frequency\": \"daily\", \"hour\": 2, \"minute\": 0}"
  
  echo "Scheduled daily audit for $client"
done
```

### Example 2: Weekly Audits on Different Days

```bash
# Monday audits
curl -X POST http://localhost:9000/api/local-seo/schedule/client1 \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly", "hour": 2, "minute": 0, "dayOfWeek": 1}'

# Wednesday audits
curl -X POST http://localhost:9000/api/local-seo/schedule/client2 \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly", "hour": 2, "minute": 0, "dayOfWeek": 3}'

# Friday audits
curl -X POST http://localhost:9000/api/local-seo/schedule/client3 \
  -H "Content-Type: application/json" \
  -d '{"frequency": "weekly", "hour": 2, "minute": 0, "dayOfWeek": 5}'
```

### Example 3: Monthly Audits

```bash
# First of month
curl -X POST http://localhost:9000/api/local-seo/schedule/client1 \
  -H "Content-Type: application/json" \
  -d '{"frequency": "monthly", "hour": 2, "minute": 0, "dayOfMonth": 1}'

# 15th of month
curl -X POST http://localhost:9000/api/local-seo/schedule/client2 \
  -H "Content-Type: application/json" \
  -d '{"frequency": "monthly", "hour": 2, "minute": 0, "dayOfMonth": 15}'
```

### Example 4: Check Schedule Status

```bash
# View all schedules
curl http://localhost:9000/api/local-seo/schedule | jq '.jobs[] | {client: .clientId, schedule: .schedule, nextRun: .nextRun}'

# View schedules for specific client
curl "http://localhost:9000/api/local-seo/schedule?clientId=instantautotraders" | jq '.'

# Check statistics
curl http://localhost:9000/api/local-seo/schedule/stats | jq '.statistics'
```

---

## 🔧 Advanced Configuration

### Custom Notification Handler

To add custom notification handling, modify `src/services/notification-service.js`:

```javascript
// Add custom notification method
async sendCustomNotification(notification) {
  // Your custom logic here
  // Examples:
  // - Send to Slack
  // - Post to Discord
  // - Trigger IFTTT
  // - Update external dashboard
}
```

### Email Integration Example

To integrate real email notifications:

1. Install email package:
```bash
npm install nodemailer
```

2. Update `sendEmailNotification()` in `notification-service.js`:
```javascript
import nodemailer from 'nodemailer';

async sendEmailNotification(notification) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: this.config.email,
    subject: `Local SEO Audit Completed - ${notification.clientId}`,
    html: `
      <h1>Local SEO Audit Results</h1>
      <p><strong>Client:</strong> ${notification.clientId}</p>
      <p><strong>Score:</strong> ${notification.score}/100</p>
      <p><strong>NAP Score:</strong> ${notification.details.napScore}/100</p>
      <p><strong>Schema Score:</strong> ${notification.details.schemaScore}/100</p>
      <p><strong>Timestamp:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
    `
  };

  await transporter.sendMail(mailOptions);
}
```

### Webhook Integration Example

To integrate real webhook notifications:

```javascript
import fetch from 'node-fetch';

async sendWebhookNotification(notification) {
  const response = await fetch(this.config.webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`
    },
    body: JSON.stringify(notification)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`);
  }

  return {
    success: true,
    method: 'webhook',
    url: this.config.webhook,
    statusCode: response.status
  };
}
```

---

## 📈 Best Practices

### 1. Scheduling Strategy

**Recommended Schedule:**
- **Daily clients** (high priority): Daily at 2:00 AM
- **Regular clients** (medium priority): Weekly on Monday at 2:00 AM
- **Low priority clients**: Monthly on 1st at 2:00 AM

**Why 2:00 AM?**
- Low server load
- Doesn't interfere with user activity
- Results ready by morning

### 2. Stagger Large Deployments

If scheduling many clients, stagger the times:

```bash
# Instead of all at 2:00 AM:
2:00 AM - Clients 1-5
2:15 AM - Clients 6-10
2:30 AM - Clients 11-15
```

### 3. Monitor Statistics

Regularly check scheduler statistics:

```bash
# Daily check
curl http://localhost:9000/api/local-seo/schedule/stats | jq '.statistics'

# Alert if success rate drops below 90%
```

### 4. Notification Best Practices

- **File logging**: Always enabled for audit trail
- **Email**: Use for high-priority clients only
- **Webhooks**: Use for system integration (dashboards, monitoring)

---

## 🛠️ Troubleshooting

### Schedule Not Running

**Check:**
1. Server is running: `ps aux | grep dashboard-server`
2. Schedule exists: `curl http://localhost:9000/api/local-seo/schedule`
3. Check server logs: `tail -f dashboard-server.log`

### Audit Failures

**Check:**
1. Scheduler stats: `curl http://localhost:9000/api/local-seo/schedule/stats`
2. Recent runs: Look at `recentRuns` in stats response
3. Error logs: Check `dashboard-server.log`
4. Client exists: `curl http://localhost:9000/api/clients`

### Notifications Not Sending

**File Logging:**
- Check: `logs/notifications/notifications-YYYY-MM-DD.json`
- Should always work if directory is writable

**Email:**
- Verify `NOTIFICATION_EMAIL` environment variable
- Check email service configuration
- Look for errors in `dashboard-server.log`

**Webhook:**
- Verify `NOTIFICATION_WEBHOOK` environment variable
- Test webhook URL manually
- Check for network connectivity

---

## 📚 Related Documentation

- `LOCAL_SEO_V3_COMPLETE.md` - Complete feature guide
- `LOCAL_SEO_API_REFERENCE.md` - All API endpoints
- `FINAL_IMPLEMENTATION_STATUS.md` - Implementation summary

---

## ✅ Summary

**New Capabilities:**
- ✅ Automated daily/weekly/monthly audits
- ✅ Notification service (email/webhook/file)
- ✅ Scheduler management API (4 new endpoints)
- ✅ Event-based progress tracking
- ✅ Run history and statistics

**Total API Endpoints:** 15 (11 original + 4 scheduler)

**Status:** 🚀 PRODUCTION READY

---

**Version:** 3.1  
**Last Updated:** October 29, 2025  
**Status:** ✅ Complete with Automation
