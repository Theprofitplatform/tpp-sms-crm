# Scheduler Testing Guide

## Quick Start Testing

### 1. Start the Server

```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js
```

**Expected Output:**
```
📅 Initializing scheduler database...
✅ Scheduler database initialized
[Scheduler] Initializing scheduler manager...
📅 Initializing Scheduler Manager...
   Found 0 jobs (0 enabled)
✅ Scheduler Manager initialized
[Scheduler] API routes mounted at /api/scheduler/*
...
✅ Server running at: http://localhost:9000
✅ Scheduler: Job scheduling at /api/scheduler/*
```

---

## 2. Test API Endpoints

### Get Scheduler Stats (Empty State)

```bash
curl http://localhost:9000/api/scheduler/stats
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalJobs": 0,
    "activeJobs": 0,
    "inactiveJobs": 0,
    "totalRuns": 0,
    "successfulRuns": 0,
    "failedRuns": 0,
    "successRate": 100,
    "lastRun": null,
    "runningJobs": 0,
    "activeSchedules": 0,
    "currentlyRunning": 0
  }
}
```

### Get All Jobs (Empty State)

```bash
curl http://localhost:9000/api/scheduler/jobs
```

**Expected Response:**
```json
{
  "success": true,
  "jobs": [],
  "stats": {
    "totalJobs": 0,
    "activeJobs": 0,
    ...
  }
}
```

---

## 3. Create Test Jobs

### Create a Test Rank Tracking Job (Every 5 minutes)

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Rank Tracking",
    "type": "rank-tracking",
    "schedule": "*/5 * * * *",
    "enabled": true,
    "config": {
      "sendNotifications": true
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "job": {
    "id": "job-1234567890-abc123",
    "name": "Test Rank Tracking",
    "type": "rank-tracking",
    "schedule": "*/5 * * * *",
    "enabled": true,
    "clientId": null,
    "config": {
      "sendNotifications": true
    },
    "nextRun": "2025-10-28T...",
    "lastRun": null,
    "totalRuns": 0,
    ...
  }
}
```

### Create a Local SEO Job (Daily at 7 AM)

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Local SEO Audit",
    "type": "local-seo",
    "schedule": "0 7 * * *",
    "enabled": true,
    "config": {
      "autoFix": true,
      "checkNAP": true
    }
  }'
```

### Create a Disabled Job

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Report",
    "type": "email-campaign",
    "schedule": "0 9 * * 1",
    "enabled": false,
    "config": {
      "campaignType": "weekly-report"
    }
  }'
```

---

## 4. Test Job Operations

### Get All Jobs (After Creation)

```bash
curl http://localhost:9000/api/scheduler/jobs
```

**Expected:** Should see 3 jobs (2 enabled, 1 disabled)

### Get Specific Job

```bash
curl http://localhost:9000/api/scheduler/jobs/[JOB_ID]
```

Replace `[JOB_ID]` with the actual job ID from creation response.

### Update Job

```bash
curl -X PUT http://localhost:9000/api/scheduler/jobs/[JOB_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Job Name",
    "schedule": "0 8 * * *"
  }'
```

### Toggle Job (Enable/Disable)

```bash
# Disable job
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Enable job
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Run Job Manually

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/run
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Job execution started"
}
```

**Check Server Console:**
You should see:
```
[Scheduler] Manual execution requested for job: job-...
🔄 Executing job: Test Rank Tracking
✅ Job completed: Test Rank Tracking (1234ms)
```

### Get Execution History

```bash
curl http://localhost:9000/api/scheduler/executions
```

**Expected:** List of recent executions with status, duration, etc.

### Get Execution History for Specific Job

```bash
curl "http://localhost:9000/api/scheduler/executions?jobId=[JOB_ID]&limit=10"
```

### Get Running Jobs

```bash
curl http://localhost:9000/api/scheduler/running
```

### Delete Job

```bash
curl -X DELETE http://localhost:9000/api/scheduler/jobs/[JOB_ID]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Job deleted"
}
```

---

## 5. Test Frontend UI

### Open Dashboard

```
http://localhost:9000/scheduler
```

**Expected:**
- Stats cards showing job counts and success rate
- Jobs table with all created jobs
- Enable/disable toggles working
- "Run Now" buttons working
- Execution history timeline

### Test Real-Time Updates

1. Open dashboard in browser
2. In terminal, run a job manually:
   ```bash
   curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/run
   ```
3. Watch dashboard update in real-time:
   - Job status changes to "Running"
   - Stats cards update
   - Execution history updates when complete

---

## 6. Test Error Handling

### Create Job with Invalid Cron

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Job",
    "type": "rank-tracking",
    "schedule": "invalid cron",
    "enabled": true
  }'
```

**Expected:** Error response with validation message

### Create Job with Missing Fields

```bash
curl -X POST http://localhost:9000/api/scheduler/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete Job"
  }'
```

**Expected:**
```json
{
  "success": false,
  "error": "Missing required fields: name, type, schedule"
}
```

### Get Non-Existent Job

```bash
curl http://localhost:9000/api/scheduler/jobs/nonexistent-id
```

**Expected:** Returns null or 404

### Delete Non-Existent Job

```bash
curl -X DELETE http://localhost:9000/api/scheduler/jobs/nonexistent-id
```

**Expected:**
```json
{
  "success": false,
  "error": "Job not found"
}
```

---

## 7. Test Persistence

### Server Restart Test

1. Create several jobs
2. Stop server (Ctrl+C)
3. Restart server
4. Get all jobs: `curl http://localhost:9000/api/scheduler/jobs`

**Expected:** All jobs still exist and enabled jobs are running

### Database Check

```bash
# Check database file exists
ls -la data/scheduler.db

# Query database directly (if sqlite3 installed)
sqlite3 data/scheduler.db "SELECT * FROM scheduler_jobs;"
sqlite3 data/scheduler.db "SELECT * FROM scheduler_executions;"
```

---

## 8. Test Job Execution

### Wait for Scheduled Execution

If you created a job with `*/5 * * * *` (every 5 minutes):

1. Wait 5 minutes
2. Check server console for execution log
3. Query execution history:
   ```bash
   curl http://localhost:9000/api/scheduler/executions
   ```

**Expected:** New execution record with success/failure status

### Monitor Active Execution

```bash
# In one terminal, run a long-running job
curl -X POST http://localhost:9000/api/scheduler/jobs/[JOB_ID]/run

# In another terminal, immediately check running jobs
curl http://localhost:9000/api/scheduler/running
```

**Expected:** Job appears in running list until completed

---

## 9. Performance Testing

### Create Multiple Jobs

```bash
# Create 10 jobs in a loop
for i in {1..10}; do
  curl -X POST http://localhost:9000/api/scheduler/jobs \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Job $i\",
      \"type\": \"rank-tracking\",
      \"schedule\": \"0 $i * * *\",
      \"enabled\": true
    }"
done
```

### Check Performance

```bash
# Check stats
curl http://localhost:9000/api/scheduler/stats

# Time the response
time curl http://localhost:9000/api/scheduler/jobs
```

**Expected:** Response time < 100ms

---

## 10. WebSocket Testing

### Browser Console Test

1. Open browser console on dashboard
2. Connect to WebSocket:
   ```javascript
   const socket = io();
   socket.on('job-started', (data) => console.log('Job started:', data));
   socket.on('job-completed', (data) => console.log('Job completed:', data));
   socket.on('job-failed', (data) => console.log('Job failed:', data));
   ```
3. Run a job via curl
4. Watch console for real-time events

---

## Common Issues & Solutions

### Issue: "Module not found: cron-parser"
**Solution:** 
```bash
npm install cron-parser
```

### Issue: "Database is locked"
**Solution:** 
- Ensure only one server instance is running
- Check for stuck processes: `ps aux | grep node`

### Issue: Jobs not executing
**Solution:**
- Check job is enabled
- Verify cron expression is valid
- Check server logs for errors

### Issue: WebSocket not working
**Solution:**
- Check browser console for connection errors
- Verify Socket.io is initialized
- Check firewall/proxy settings

### Issue: "Job already running"
**Solution:**
- Wait for current execution to complete
- Or restart server to clear stuck jobs

---

## Success Criteria Checklist

- [ ] Server starts without errors
- [ ] Database tables created successfully
- [ ] Can create jobs via API
- [ ] Jobs are persisted to database
- [ ] Can enable/disable jobs
- [ ] Can run jobs manually
- [ ] Jobs execute on schedule
- [ ] Execution history is tracked
- [ ] WebSocket events work
- [ ] Jobs survive server restart
- [ ] Frontend UI displays jobs correctly
- [ ] Real-time updates work in UI
- [ ] Error handling works properly
- [ ] Graceful shutdown works (Ctrl+C)

---

## Monitoring Commands

### Watch Server Logs
```bash
node dashboard-server.js | grep Scheduler
```

### Monitor Database
```bash
watch -n 1 'sqlite3 data/scheduler.db "SELECT COUNT(*) FROM scheduler_jobs;"'
```

### Monitor Executions
```bash
watch -n 2 'curl -s http://localhost:9000/api/scheduler/executions | jq ".history | length"'
```

---

## Clean Up

### Delete All Jobs

```bash
# Get all job IDs
curl http://localhost:9000/api/scheduler/jobs | jq -r '.jobs[].id' | while read id; do
  curl -X DELETE http://localhost:9000/api/scheduler/jobs/$id
done
```

### Reset Database

```bash
rm data/scheduler.db
# Restart server to recreate
```

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Enhance SchedulerPage.jsx with create job modal
2. ✅ Add cron expression builder/validator
3. ✅ Add job cloning feature
4. ✅ Add bulk operations
5. ✅ Add job templates
6. ✅ Add email notifications for failures
7. ✅ Add job dependencies

---

**Status:** 🧪 Ready for Testing
**Last Updated:** 2025-10-28
