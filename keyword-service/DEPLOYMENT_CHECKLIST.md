# Production Deployment Checklist

**Branch**: `feature/production-ready-enhancements`
**Commit**: `0a2112d`
**Date**: 2024-10-24
**Status**: ✅ Ready for Deployment

---

## Pre-Deployment Checklist

### Environment Setup

- [ ] **Python 3.10+** installed and verified
  ```bash
  python3 --version
  ```

- [ ] **Virtual environment** created and activated
  ```bash
  python3 -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  ```

- [ ] **Dependencies** installed
  ```bash
  pip install -r requirements.txt
  pip install -r constraints.txt
  ```

- [ ] **spaCy model** downloaded
  ```bash
  python -m spacy download en_core_web_sm
  ```

### Configuration

- [ ] **Environment file** configured
  ```bash
  cp .env.example .env
  # Edit .env and add SERPAPI_API_KEY
  ```

- [ ] **API keys** verified and working
  ```bash
  curl "https://serpapi.com/search?q=test&api_key=YOUR_KEY"
  ```

- [ ] **Rate limits** configured appropriately
  ```
  SERP_API_RPM=20  # Adjust based on your plan
  ```

### Database

- [ ] **Backup existing database** (if applicable)
  ```bash
  cp keyword_research.db keyword_research.db.backup.$(date +%Y%m%d)
  ```

- [ ] **Apply migration**
  ```bash
  # For existing database
  python migrations/apply_migration.py keyword_research.db

  # OR start fresh
  rm keyword_research.db
  python cli.py init
  ```

- [ ] **Verify migration applied**
  ```bash
  sqlite3 keyword_research.db "PRAGMA table_info(keywords)" | grep difficulty_serp_strength
  sqlite3 keyword_research.db "PRAGMA table_info(projects)" | grep checkpoint
  ```

### Testing

- [ ] **Schema validation** passes
  ```bash
  pytest tests/test_exports_schema.py -v
  ```

- [ ] **Rate limiting tests** pass
  ```bash
  pytest tests/test_rate_limiting.py -v
  ```

- [ ] **Checkpoint tests** pass
  ```bash
  pytest tests/test_checkpoint.py -v
  ```

- [ ] **Integration test** completes successfully
  ```bash
  python cli.py create \
    --name "Pre-Deploy Test" \
    --seeds "test keyword" \
    --geo US \
    --focus informational
  ```

  **Expected**:
  - ✓ Checkpoint saved logs appear
  - 📊 Stats summary prints at end
  - 💰 Quota usage displayed
  - ⚡ Stage timing shown
  - No errors

- [ ] **Verify difficulty components saved**
  ```bash
  sqlite3 keyword_research.db "
  SELECT
    keyword,
    difficulty,
    difficulty_serp_strength,
    difficulty_competition
  FROM keywords
  LIMIT 3;
  "
  ```

  **Expected**: All columns have values (not NULL)

---

## Deployment Steps

### Step 1: Merge to Main (if applicable)

```bash
# Push feature branch
git push origin feature/production-ready-enhancements

# Create pull request on GitHub
# OR merge locally if no PR needed
git checkout main
git merge feature/production-ready-enhancements
git push origin main
```

### Step 2: Production Environment Setup

```bash
# On production server
cd /path/to/production
git pull origin main

# Activate production venv
source venv/bin/activate

# Install any new dependencies
pip install -r requirements.txt

# Apply migration
python migrations/apply_migration.py keyword_research.db

# Verify
python cli.py --help
```

### Step 3: First Production Run

```bash
# Small test project first
python cli.py create \
  --name "Production Validation" \
  --seeds "client keyword 1,client keyword 2" \
  --geo US \
  --focus informational
```

**Monitor for**:
- Checkpoint logs
- Stats summary
- No errors in logs/
- Database size reasonable

### Step 4: Client Dogfooding

```bash
# Real client project (start small)
python cli.py create \
  --name "Client: [Name]" \
  --seeds "[10-20 real keywords]" \
  --geo [TARGET_GEO] \
  --focus [informational|commercial]
```

**Watch for**:
- Pipeline completes without errors
- Quota consumption within limits
- Output quality meets expectations
- Performance acceptable (check stage timings)

---

## Post-Deployment Monitoring

### Day 1: Immediate Monitoring

- [ ] **Check logs** for any errors
  ```bash
  tail -f logs/keyword_research.log
  grep ERROR logs/keyword_research.log
  ```

- [ ] **Monitor quota usage**
  ```bash
  python cli.py audit --last 24h
  ```

- [ ] **Verify database integrity**
  ```bash
  sqlite3 keyword_research.db "PRAGMA integrity_check;"
  ```

- [ ] **Review first project outputs**
  ```bash
  python cli.py report [project_id]
  python cli.py export [project_id] --format csv
  ```

### Week 1: Daily Checks

- [ ] Quota consumption trend (staying under limits?)
- [ ] Error rate (should be <5%)
- [ ] Pipeline duration (meeting performance targets?)
- [ ] Client feedback on output quality

### Week 2: Optimization

- [ ] Adjust rate limits if needed
- [ ] Fine-tune clustering thresholds based on results
- [ ] Optimize slow stages (check stats summary)
- [ ] Document any client-specific config needs

---

## Rollback Plan

If critical issues arise:

### Quick Rollback

```bash
# Restore database backup
cp keyword_research.db.backup.YYYYMMDD keyword_research.db

# Checkout previous commit
git checkout [previous-commit-hash]

# Restart with old version
python cli.py create --name "Rollback Test" ...
```

### Report Issues

1. **Capture state**:
   ```bash
   git log -1 > issue_commit.txt
   python --version > issue_env.txt
   pip freeze > issue_packages.txt
   tail -100 logs/keyword_research.log > issue_logs.txt
   ```

2. **Open GitHub issue** with captured files

3. **Document workaround** for clients if needed

---

## Success Criteria

### Functional
✅ All pipeline stages complete without errors
✅ Stats summary displays correctly
✅ Difficulty components saved to database
✅ Quota tracking shows accurate usage
✅ Exports generate with correct schema

### Performance
✅ 100 keywords: <2 minutes
✅ 1000 keywords: <10 minutes
✅ No memory leaks or crashes

### Quality
✅ Client accepts output quality
✅ Difficulty scores reasonable (manual spot-check)
✅ Clustering makes semantic sense
✅ Briefs are actionable

---

## Emergency Contacts

- **Technical Issues**: [Your email/Slack]
- **API Issues**: Check provider status pages
  - SerpAPI: https://serpapi.com/status
- **GitHub Issues**: https://github.com/Theprofitplatform/cursorkeyword/issues

---

## Additional Resources

- **Integration Guide**: See INTEGRATION_COMPLETE.md
- **Troubleshooting**: See OPERATIONS.md
- **Schema Reference**: See EXPORTS.md
- **Quick Start**: See QUICKSTART.md

---

## Sign-Off

Deployment completed by: ___________________
Date: ___________________
Tested by: ___________________
Approved by: ___________________

**Notes**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

**Last Updated**: 2024-10-24
**Version**: 0.1.0 Production-Ready
**Status**: ✅ Ready for Client Dogfooding
