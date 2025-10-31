# 📋 NPM Scripts Guide - Auto-Fix Engine

## Quick Reference

All the new auto-fix npm scripts for easy usage.

---

## 🧪 Testing

### **Test Suite**
```bash
npm run autofix:test
```
Runs comprehensive test suite for all engines and services.

**When to use:**
- After installation
- After updates
- Before production deployment
- When troubleshooting issues

**Expected output:**
```
✅ 8 tests passed
⏭️  0-2 tests skipped (Redis/AI if not configured)
```

---

## 🔍 Preview (Dry Run)

### **Preview All Changes**
```bash
npm run autofix:dry-run
```
Shows what changes would be made without actually applying them.

**When to use:**
- First time running
- Testing configuration
- Reviewing changes before applying
- Debugging issues

**What it does:**
- Analyzes all pages
- Identifies issues
- Suggests fixes
- Generates reports
- **No actual changes to WordPress**

---

## 🚀 Execution

### **Sequential Execution**
```bash
npm run autofix:run
```
Runs all 11 engines one after another.

**When to use:**
- First time on a client
- Small sites (<50 pages)
- When you want to monitor each step
- Debugging specific engines

**Time:** ~12 minutes

### **Parallel Execution (3x Faster)**
```bash
npm run autofix:parallel
```
Runs 3 engines simultaneously.

**When to use:**
- Regular maintenance
- Medium+ sites
- Production deployments
- Scheduled runs

**Time:** ~4 minutes

### **AI-Powered (Best Results)**
```bash
npm run autofix:ai
```
Runs with AI suggestions and parallel execution.

**When to use:**
- New clients
- Major updates
- Monthly deep analysis
- When you want best results

**Requirements:**
- `OPENAI_API_KEY` environment variable set

**Cost:** ~$0.15-$1.50 per run

**Time:** ~4-5 minutes

### **Queue-Based (Background)**
```bash
npm run autofix:queue
```
Queues jobs for background processing.

**When to use:**
- Large sites (100+ pages)
- Multiple clients
- Scheduled automated runs
- Production environments

**Requirements:**
- Redis server running

**Time:** Immediate (jobs run in background)

---

## 🔧 Legacy Support

### **Old Auto-Fix System**
```bash
npm run autofix:legacy
```
Runs the original 3-engine system.

**When to use:**
- Comparing old vs new
- Rollback scenarios
- Testing compatibility

**Note:** Old system still works alongside new system

---

## 📊 Monitoring

### **Cache Statistics**
```bash
npm run cache:stats
```
Shows Redis cache statistics.

**Output:**
```json
{
  "enabled": true,
  "hits": 1234,
  "misses": 56,
  "hitRate": "95.7%",
  "keys": 45,
  "memory": "2.4MB"
}
```

### **Flush Cache**
```bash
npm run cache:flush
```
Clears all cached data.

**When to use:**
- After WordPress updates
- When data seems stale
- Troubleshooting issues
- Manual cache invalidation

**Warning:** Will temporarily slow down next run

### **Queue Statistics**
```bash
npm run queue:stats
```
Shows job queue statistics.

**Output:**
```json
{
  "waiting": 2,
  "active": 1,
  "completed": 45,
  "failed": 0,
  "delayed": 0
}
```

### **Clean Old Jobs**
```bash
npm run queue:clean
```
Removes completed jobs older than 24 hours.

**When to use:**
- Regular maintenance
- Free up Redis memory
- Keep queue clean

---

## 🎯 Common Workflows

### **Daily Automated Run**

```bash
# In cron: 0 2 * * *
npm run autofix:parallel
```

**Setup:**
```bash
crontab -e
# Add:
0 2 * * * cd /path/to/project && npm run autofix:parallel >> /var/log/autofix.log 2>&1
```

### **Weekly Deep Analysis**

```bash
# In cron: 0 3 * * 0
npm run autofix:ai
```

**Setup:**
```bash
crontab -e
# Add:
0 3 * * 0 cd /path/to/project && npm run autofix:ai >> /var/log/autofix-weekly.log 2>&1
```

### **First Time Setup**

```bash
# 1. Test
npm run autofix:test

# 2. Preview
npm run autofix:dry-run

# 3. Review output

# 4. Run live
npm run autofix:run
```

### **Production Deployment**

```bash
# 1. Test everything
npm run autofix:test

# 2. Start Redis
redis-server &

# 3. Queue jobs
npm run autofix:queue

# 4. Monitor
npm run queue:stats
```

### **Troubleshooting**

```bash
# 1. Check cache
npm run cache:stats

# 2. Flush if needed
npm run cache:flush

# 3. Check queue
npm run queue:stats

# 4. Clean old jobs
npm run queue:clean

# 5. Test again
npm run autofix:test
```

---

## 🔄 Custom Scripts

### **Run on Specific Client**

```bash
# Method 1: Override default
CLIENT=freedomactivewear npm run autofix:parallel

# Method 2: Direct command
node auto-fix-all-upgraded.js --parallel --client=freedomactivewear
```

### **Run with Custom Options**

```bash
# Dry run with AI
node auto-fix-all-upgraded.js --dry-run --ai --client=instantautotraders

# Queue with AI
node auto-fix-all-upgraded.js --queue --ai --client=instantautotraders

# Sequential with AI
node auto-fix-all-upgraded.js --ai --client=instantautotraders
```

### **Multiple Clients**

```bash
# Sequential
for client in client1 client2 client3; do
  node auto-fix-all-upgraded.js --parallel --client=$client
  sleep 60
done

# Parallel (queue-based)
for client in client1 client2 client3; do
  npm run autofix:queue --client=$client
done
```

---

## 📝 Script Details

### **autofix:test**
- **Command:** `node test-autofix-upgrade.js`
- **Time:** ~30 seconds
- **Output:** Test results
- **Exit code:** 0 = success, 1 = failure

### **autofix:dry-run**
- **Command:** `node auto-fix-all-upgraded.js --dry-run --client=instantautotraders`
- **Time:** ~10-12 minutes
- **Output:** Detailed analysis, no changes
- **Exit code:** 0 = success

### **autofix:run**
- **Command:** `node auto-fix-all-upgraded.js --client=instantautotraders`
- **Time:** ~12 minutes
- **Output:** Detailed results + WordPress changes
- **Exit code:** 0 = success

### **autofix:parallel**
- **Command:** `node auto-fix-all-upgraded.js --parallel --client=instantautotraders`
- **Time:** ~4 minutes
- **Output:** Detailed results + WordPress changes
- **Exit code:** 0 = success

### **autofix:ai**
- **Command:** `node auto-fix-all-upgraded.js --ai --parallel --client=instantautotraders`
- **Time:** ~4-5 minutes
- **Output:** AI suggestions + detailed results + WordPress changes
- **Exit code:** 0 = success
- **Requires:** `OPENAI_API_KEY`

### **autofix:queue**
- **Command:** `node auto-fix-all-upgraded.js --queue --client=instantautotraders`
- **Time:** Immediate (jobs run in background)
- **Output:** Job IDs
- **Exit code:** 0 = queued successfully
- **Requires:** Redis

### **autofix:legacy**
- **Command:** `node auto-fix-all.js`
- **Time:** ~10 minutes
- **Output:** Old system results
- **Exit code:** 0 = success

---

## 🎓 Pro Tips

### **1. Always Test First**
```bash
npm run autofix:test
```

### **2. Use Dry Run for New Clients**
```bash
npm run autofix:dry-run
```

### **3. Parallel for Regular Use**
```bash
npm run autofix:parallel
```

### **4. AI for Monthly Deep Dives**
```bash
npm run autofix:ai
```

### **5. Queue for Production**
```bash
npm run autofix:queue
```

### **6. Monitor Cache Performance**
```bash
npm run cache:stats
```

### **7. Clean Queue Regularly**
```bash
npm run queue:clean
```

---

## 🆘 Troubleshooting

### **Script Fails**

```bash
# Check test results
npm run autofix:test

# Check logs
tail -f logs/consolidated-report-*.json

# Try dry run
npm run autofix:dry-run
```

### **Redis Errors**

```bash
# Check if Redis running
redis-cli ping

# Start Redis
redis-server &

# Check cache stats
npm run cache:stats
```

### **OpenAI Errors**

```bash
# Check API key
echo $OPENAI_API_KEY

# Set API key
export OPENAI_API_KEY=sk-...

# Run without AI
npm run autofix:parallel
```

---

## ✅ Quick Reference

| Script | Speed | AI | Queue | Best For |
|--------|-------|----|----|----------|
| `autofix:test` | Fast | - | - | Testing |
| `autofix:dry-run` | Normal | ❌ | ❌ | Preview |
| `autofix:run` | Normal | ❌ | ❌ | First time |
| `autofix:parallel` | **Fast** | ❌ | ❌ | **Regular use** |
| `autofix:ai` | **Fast** | ✅ | ❌ | **Monthly** |
| `autofix:queue` | **Instant** | ❌ | ✅ | **Production** |
| `autofix:legacy` | Normal | ❌ | ❌ | Comparison |

---

**Guide Version:** 1.0  
**Last Updated:** October 29, 2025

**Start with:** `npm run autofix:test`
