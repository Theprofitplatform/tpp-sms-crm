# Operations Guide

Troubleshooting, monitoring, and operational procedures for the Keyword Research Tool.

## Table of Contents

- [Common Errors](#common-errors)
- [Quota Management](#quota-management)
- [Performance Optimization](#performance-optimization)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Debugging](#debugging)

## Common Errors

### API Key Errors

**Error**: `Authentication failed: Invalid API key`

**Solutions**:
1. Verify `.env` file exists in project root
2. Check key has no extra spaces: `SERPAPI_API_KEY=abc123` (no quotes)
3. Verify key is active at provider dashboard
4. Test key directly:
   ```bash
   curl "https://serpapi.com/search?q=test&api_key=YOUR_KEY"
   ```

**Error**: `401 Unauthorized`

**Solutions**:
- Check if API key has expired
- Verify correct endpoint for provider
- Ensure key has required permissions/scopes

### Rate Limit Errors

**Error**: `429 Too Many Requests`

**Cause**: Exceeded provider rate limits

**Solutions**:
1. Reduce RPM in `.env`:
   ```env
   SERP_API_RPM=10  # Lower from default 20
   ```

2. Check quota consumption:
   ```bash
   python cli.py audit --last 1h
   ```

3. Wait for rate limit window to reset (usually 1 minute)

4. Upgrade API plan for higher limits

### Database Errors

**Error**: `database is locked`

**Cause**: Multiple processes accessing SQLite simultaneously

**Solutions**:
1. Close other instances of the tool
2. Check for hung processes:
   ```bash
   ps aux | grep "python cli.py"
   kill -9 <PID>
   ```
3. For production, switch to PostgreSQL:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost/keyword_research
   ```

**Error**: `no such table: keywords`

**Cause**: Database not initialized

**Solution**:
```bash
python cli.py init
```

### Network Errors

**Error**: `Connection timeout` or `Network unreachable`

**Solutions**:
1. Check internet connection
2. Verify provider URLs are accessible
3. Check firewall/proxy settings
4. Increase timeout in `.env`:
   ```env
   REQUEST_TIMEOUT=60  # Increase from 30
   ```

### Processing Errors

**Error**: `Failed to download spaCy model`

**Solution**:
```bash
python -m spacy download en_core_web_sm
# Or manually:
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl
```

**Error**: `AttributeError: module 'pandas' has no attribute 'DataFrame'`

**Cause**: Corrupted or incompatible package version

**Solution**:
```bash
pip install --upgrade --force-reinstall pandas
# Or reinstall all:
pip install -r requirements.txt --force-reinstall
```

## Quota Management

### Check Current Usage

```bash
# View audit logs for last 7 days
python cli.py audit --last 7d

# View by provider
python cli.py audit --provider serpapi

# View by project
python cli.py audit --project 1
```

### SQL Queries

```sql
-- Total quota by provider (last 30 days)
SELECT
    data_source,
    COUNT(*) as total_calls,
    SUM(quota_used) as total_quota
FROM audit_logs
WHERE timestamp > datetime('now', '-30 days')
GROUP BY data_source;

-- Daily usage trend
SELECT
    DATE(timestamp) as date,
    data_source,
    COUNT(*) as calls
FROM audit_logs
WHERE timestamp > datetime('now', '-30 days')
GROUP BY date, data_source
ORDER BY date DESC;

-- Failed requests
SELECT
    data_source,
    COUNT(*) as failures
FROM audit_logs
WHERE status = 'error'
AND timestamp > datetime('now', '-7 days')
GROUP BY data_source;
```

### Quota Alerts

Set up monitoring for quota thresholds:

```bash
# Check if approaching limit (90%)
python -c "
from database import get_db
from models import AuditLog
from datetime import datetime, timedelta

with get_db() as db:
    month_ago = datetime.utcnow() - timedelta(days=30)
    serp_calls = db.query(AuditLog).filter(
        AuditLog.data_source == 'serpapi',
        AuditLog.timestamp > month_ago
    ).count()

    limit = 5000  # Your plan limit
    percent = (serp_calls / limit) * 100

    if percent > 90:
        print(f'⚠️  WARNING: {percent:.1f}% quota used ({serp_calls}/{limit})')
    else:
        print(f'✓ Quota: {percent:.1f}% used ({serp_calls}/{limit})')
"
```

### Quota Optimization

**Reduce API calls:**
1. Use cached data: Set longer TTL in `.env`
   ```env
   SERP_CACHE_TTL=604800  # 7 days
   ```

2. Limit expansion per seed:
   ```env
   MAX_KEYWORDS_PER_SEED=50  # Reduce from 100
   ```

3. Skip low-volume keywords:
   ```env
   MIN_SEARCH_VOLUME=100  # Skip keywords <100 volume
   ```

4. Use offline mode for testing:
   ```env
   OFFLINE_MODE=true
   ```

## Performance Optimization

### Benchmark Current Performance

```bash
# Run with timing
time python cli.py create --name "Benchmark" --seeds "test" --geo US

# Profile with cProfile
python -m cProfile -o profile.stats cli.py create --name "Test" --seeds "test"

# Analyze profile
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative')
p.print_stats(20)
"
```

### Speed Improvements

**1. Enable Parallel Processing**

Currently sequential. To parallelize (requires code changes):
```python
# In orchestrator.py
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(fetch_serp, kw) for kw in keywords]
    results = [f.result() for f in futures]
```

**2. Use PostgreSQL**

SQLite becomes bottleneck at scale:
```bash
# Install PostgreSQL
sudo apt-get install postgresql

# Create database
createdb keyword_research

# Update .env
DATABASE_URL=postgresql://user:pass@localhost/keyword_research

# Migrate
alembic upgrade head
```

**3. Redis Caching**

Enable Redis for faster caching:
```bash
# Install Redis
sudo apt-get install redis-server

# Update .env
REDIS_URL=redis://localhost:6379/0

# Restart tool
```

**4. Batch API Calls**

Group requests where supported:
```env
API_BATCH_SIZE=25  # Fetch 25 keywords per batch
```

### Performance Targets

| Scenario | Target | Optimization |
|----------|--------|--------------|
| 100 keywords | <2 min | Use cached data |
| 1,000 keywords | <10 min | Default settings |
| 10,000 keywords | <45 min | PostgreSQL + Redis + parallel |

## Monitoring

### Log Locations

```
logs/
  keyword_research.log     # Main application log
  providers.log            # Provider API calls
  errors.log               # Errors only
```

### Log Levels

Set in `.env`:
```env
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### Real-time Monitoring

**Watch logs:**
```bash
tail -f logs/keyword_research.log

# Filter errors only
tail -f logs/keyword_research.log | grep ERROR

# Watch API calls
tail -f logs/providers.log | grep serpapi
```

**Monitor progress:**
```bash
# In separate terminal, watch database
watch -n 5 "sqlite3 keyword_research.db 'SELECT COUNT(*) FROM keywords WHERE project_id = 1'"
```

### Health Checks

```bash
# Test database connection
python -c "from database import get_db; get_db(); print('✓ DB OK')"

# Test API connectivity
python -c "
from providers.serpapi_client import SerpApiClient
client = SerpApiClient()
print('✓ SerpAPI OK')
"

# Test all providers
python cli.py test-providers
```

### Alerts

Set up email/Slack alerts for:
- Quota >90%
- Error rate >5%
- Pipeline failures
- Disk space <10%

Example cron job:
```bash
# Check quota every 6 hours
0 */6 * * * /path/to/venv/bin/python /path/to/check_quota.py
```

## Maintenance

### Database Maintenance

**Vacuum SQLite** (reclaim space):
```bash
sqlite3 keyword_research.db "VACUUM;"
```

**Cleanup old data**:
```bash
# Remove snapshots older than 90 days
python cli.py purge --older-than 90

# Remove old audit logs
sqlite3 keyword_research.db "
DELETE FROM audit_logs
WHERE timestamp < datetime('now', '-365 days');
"
```

**Backup database**:
```bash
# SQLite
cp keyword_research.db backup_$(date +%Y%m%d).db

# PostgreSQL
pg_dump keyword_research > backup_$(date +%Y%m%d).sql

# Automated daily backups
echo "0 2 * * * /path/to/backup_script.sh" | crontab -
```

### Update Dependencies

```bash
# Check for outdated packages
pip list --outdated

# Update all
pip install --upgrade -r requirements.txt

# Regenerate constraints
pip freeze > constraints.txt

# Test after update
pytest tests/
```

### Rotate API Keys

**Every 90 days:**
1. Generate new key at provider dashboard
2. Update `.env` with new key
3. Test: `python cli.py test-providers`
4. Revoke old key after 24 hours

### Clear Caches

```bash
# Clear all caches
python cli.py clear-cache --all

# Clear specific provider
python cli.py clear-cache --provider serpapi

# Clear expired only
python cli.py clear-cache --expired
```

## Debugging

### Enable Debug Mode

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

### Verbose Output

```bash
python cli.py create --name "Test" --seeds "test" --verbose
```

### Inspect Database

```bash
# Open SQLite
sqlite3 keyword_research.db

# Useful queries
.tables
.schema keywords

SELECT * FROM keywords WHERE project_id = 1 LIMIT 5;
SELECT COUNT(*) FROM keywords;
```

### Debug Provider Calls

```python
# Add to provider code
import logging
logging.basicConfig(level=logging.DEBUG)

# Or set in .env
PROVIDER_DEBUG=true
```

### Common Debug Scenarios

**"Why is clustering poor?"**
```sql
-- Check keyword similarity
SELECT
    k1.text,
    k2.text,
    -- Manual similarity check needed
FROM keywords k1, keywords k2
WHERE k1.topic_id = k2.topic_id
AND k1.id < k2.id
LIMIT 10;
```

**"Why is difficulty score high?"**
```sql
-- Check difficulty components
SELECT
    keyword,
    difficulty,
    difficulty_serp_strength,
    difficulty_competition,
    difficulty_serp_crowding,
    difficulty_content_depth
FROM keywords
WHERE difficulty > 80;
```

**"Why no results?"**
```sql
-- Check audit logs for failures
SELECT
    operation,
    status,
    error_message,
    COUNT(*) as count
FROM audit_logs
WHERE project_id = 1
GROUP BY operation, status;
```

### Performance Profiling

**Identify slow operations:**
```bash
python -m cProfile -o profile.stats cli.py create --name "Test" --seeds "test"

python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative')
p.print_stats(30)
"
```

**Memory profiling:**
```bash
pip install memory_profiler

python -m memory_profiler cli.py create --name "Test" --seeds "test"
```

## Emergency Procedures

### Stop Running Process

```bash
# Find process
ps aux | grep "python cli.py"

# Graceful stop (allows cleanup)
kill <PID>

# Force stop (use if hung)
kill -9 <PID>
```

### Recover from Crash

```bash
# Check last checkpoint
python cli.py status 1

# Resume from checkpoint
python cli.py resume 1
```

### Rollback Database

```bash
# Restore from backup
cp backup_20241024.db keyword_research.db

# Or use alembic for schema rollback
alembic downgrade -1
```

### Reset Project

```bash
# Delete and restart
python cli.py delete 1 --confirm
python cli.py create --name "Restart" --seeds "..." --geo US
```

## Support Escalation

### Before Opening Issue

1. Check [Common Errors](#common-errors)
2. Review logs for specific error messages
3. Test with minimal example
4. Document steps to reproduce

### Information to Include

```bash
# System info
python --version
pip list | grep -E "requests|sqlalchemy|pandas"
uname -a

# Error logs
tail -50 logs/errors.log

# Database state
sqlite3 keyword_research.db ".tables"
```

### Contact

- GitHub Issues: https://github.com/Theprofitplatform/cursorkeyword/issues
- Security: security@theprofitplatform.com
- Support: support@theprofitplatform.com

---

**Last Updated**: 2024-10-24
**Version**: 0.1.0
