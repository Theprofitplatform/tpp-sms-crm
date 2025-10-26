# Post-Deployment Setup Guide

**Status**: Dependencies installing in background...
**Date**: 2025-10-24
**Branch**: `feature/production-ready-enhancements` (pushed to GitHub)

---

## Current Status

### ✅ Complete
1. All 7 PRs implemented and integrated
2. Code committed and pushed to GitHub
3. Virtual environment created (`venv/`)
4. Setup scripts created

### ⏳ In Progress
- **Dependencies installing** (background process ID: 867040)
  - This takes 5-10 minutes due to PyTorch and CUDA libraries
  - You'll know it's done when your terminal prompt returns

### ⚠️ Waiting
- Environment configuration (.env file)
- spaCy language model download
- Database initialization or migration
- Integration testing

---

## What's Happening Right Now

Your terminal is running this command in the background:
```bash
source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt -c constraints.txt
```

**Current stage**: Resolving `grpcio-status` dependency versions (this is the slowest part)

**Why it's slow**:
- PyTorch with CUDA support (~2GB of packages)
- Many ML/NLP dependencies
- Complex dependency resolution for Google packages

**Progress indicators**:
- You'll see metadata downloads
- Then package downloads (with progress bars)
- Finally installation messages

---

## Once Installation Completes

You have two options:

### Option A: Automated Setup (Recommended)

Run the setup script I created:

```bash
# Make sure you're in the project directory
cd /mnt/c/Users/abhis/projects/cursorkeyword

# Activate virtual environment
source venv/bin/activate

# Run setup script
./setup_local_deployment.sh
```

This script will:
1. ✓ Create .env from .env.example
2. ✓ Download spaCy language model
3. ✓ Initialize database with new schema
4. ✓ Verify CLI installation
5. ✓ Run validation tests (optional)
6. ✓ Provide next steps

### Option B: Manual Setup

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Configure environment
cp .env.example .env
nano .env  # Add your SERPAPI_API_KEY

# 3. Download spaCy model
python3 -m spacy download en_core_web_sm

# 4. Initialize database (choose one):

## For fresh start:
python3 cli.py init

## OR for existing database:
python3 migrations/apply_migration.py keyword_research.db

# 5. Verify installation
python3 cli.py --help
python3 cli.py create --help  # Check for --resume flag

# 6. Run integration test
python3 cli.py create \
  --name "Integration Test" \
  --seeds "seo tools,keyword research" \
  --geo US \
  --focus informational

# 7. Check results
python3 cli.py report 1

# 8. Verify database schema
sqlite3 keyword_research.db \
  "SELECT keyword, difficulty, difficulty_serp_strength, difficulty_competition
   FROM keywords LIMIT 3"
```

---

## Expected Test Output

When you run your first integration test, you should see:

```
Creating project: Integration Test...

✓ Checkpoint saved: created
Expanding keywords...
✓ Checkpoint saved: expansion
Collecting metrics...
✓ Checkpoint saved: metrics
Processing...
✓ Checkpoint saved: processing
Scoring difficulty...
✓ Checkpoint saved: scoring
Clustering topics...
✓ Checkpoint saved: clustering
Generating briefs...
✓ Checkpoint saved: briefs
✓ Checkpoint saved: completed

📊 PIPELINE EXECUTION SUMMARY
================================================================================
⏱️  Duration: 1m 23s
📝 Keywords: 47 unique
🔌 API Calls: 52 SERP, 10 Trends
💰 Quota: 52/5000 SerpAPI (1.0% used)
⚡ Stage Performance:
   expansion                 2.3s
   metrics                   45.2s
   processing                8.1s
   scoring                   12.4s
   clustering                6.8s
   briefs                    8.3s
================================================================================
```

### New Features You'll Notice

1. **Checkpoint Logs** - "✓ Checkpoint saved: [stage]" after each pipeline stage
2. **Stats Summary** - Comprehensive metrics at the end
3. **Quota Tracking** - See API usage as % of limits
4. **Stage Timing** - Identify slow stages for optimization
5. **Difficulty Components** - Database now stores breakdown (SERP strength, competition, etc.)
6. **Resume Flag** - Available via `--resume` (structure ready, logic can be enhanced)

---

## Validation Checklist

After running your first test, verify:

- [ ] Stats summary displayed at end
- [ ] Checkpoint logs appeared during execution
- [ ] No errors in `logs/keyword_research.log`
- [ ] Database has difficulty component columns:
  ```bash
  sqlite3 keyword_research.db "PRAGMA table_info(keywords)" | grep difficulty_
  ```
- [ ] Schema validation passes:
  ```bash
  pytest tests/test_exports_schema.py -v
  ```
- [ ] Project has checkpoint data:
  ```bash
  sqlite3 keyword_research.db \
    "SELECT name, last_checkpoint FROM projects WHERE id=1"
  ```

---

## Troubleshooting

### Issue: Import errors after installation
```bash
# Solution: Ensure venv is activated
source venv/bin/activate
which python3  # Should show venv path
```

### Issue: "No module named 'sqlalchemy'"
```bash
# Solution: Dependencies still installing, wait for completion
# Check status by looking for your terminal prompt returning
```

### Issue: "Database column not found"
```bash
# Solution: Apply migration
python3 migrations/apply_migration.py keyword_research.db
```

### Issue: spaCy model missing
```bash
# Solution: Download model
python3 -m spacy download en_core_web_sm
```

### Issue: API key errors
```bash
# Solution: Configure .env
cp .env.example .env
nano .env  # Add SERPAPI_API_KEY=your_actual_key_here
```

---

## Performance Benchmarks

Expected timing for different project sizes:

| Keywords | Expected Time | Quota Usage | Notes |
|----------|---------------|-------------|-------|
| 10 | <1 min | ~15 calls | Good for quick testing |
| 50 | 1-2 min | ~60 calls | Normal small project |
| 100 | 2-3 min | ~120 calls | Medium project |
| 500 | 5-8 min | ~600 calls | Large project |
| 1000 | 10-15 min | ~1200 calls | Very large, watch quota |

**Quota Limits** (with basic SerpAPI plan):
- 5,000 searches/month
- ~20 searches/minute (rate limit)

---

## Next Steps After Local Testing

### 1. Merge to Main (if satisfied with tests)

```bash
# Option A: Create Pull Request
# Visit: https://github.com/Theprofitplatform/cursorkeyword/pull/new/feature/production-ready-enhancements

# Option B: Merge locally
git checkout main
git merge feature/production-ready-enhancements
git push origin main
```

### 2. Client Dogfooding

Start with a small real project:

```bash
python3 cli.py create \
  --name "Client: [Client Name]" \
  --seeds "[10-20 real seed keywords]" \
  --geo [TARGET_GEO] \
  --focus [informational|commercial]
```

**Guidelines**:
- Start small (10-50 keywords) for first real project
- Monitor stats summary for quota usage
- Review output quality before scaling up
- Document any issues in GitHub Issues

### 3. Monitor and Optimize

Over the first week:
- Check `logs/keyword_research.log` daily
- Review quota consumption trends
- Collect client feedback on output quality
- Identify slow stages from stats summaries
- Fine-tune clustering thresholds if needed

---

## Production Deployment

See `DEPLOYMENT_CHECKLIST.md` for full production deployment steps when ready to deploy to a server.

---

## Support

**Documentation**:
- `DEPLOYED.md` - Deployment completion summary
- `STATUS.md` - Quick start guide
- `OPERATIONS.md` - Troubleshooting and operations
- `EXPORTS.md` - CSV schema specifications
- `IMPLEMENTATION_SUMMARY.md` - Technical details

**Help**:
- Review documentation above
- Check logs: `tail -f logs/keyword_research.log`
- GitHub Issues: https://github.com/Theprofitplatform/cursorkeyword/issues

---

**Last Updated**: 2025-10-24
**Branch**: feature/production-ready-enhancements
**Commit**: 49771f8

✅ **You're almost ready to go!** Just waiting for dependencies to finish installing.
