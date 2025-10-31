# 🚀 Auto-Fix Engine - Quick Start Guide

## TL;DR - Get Started in 5 Minutes

### **Step 1: Install Dependencies (if Redis not installed)**

```bash
# Install Redis (optional but recommended)
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### **Step 2: Set OpenAI API Key (for AI features)**

```bash
# Add to your .env file
echo "OPENAI_API_KEY=sk-your-key-here" >> config/env/.env
```

### **Step 3: Test Run (Dry Run)**

```bash
# Preview what changes would be made (no actual changes)
node auto-fix-all-upgraded.js --client=instantautotraders --dry-run
```

### **Step 4: Run Live**

```bash
# Apply changes to your site
node auto-fix-all-upgraded.js --client=instantautotraders
```

### **Step 5: Run with AI & Parallel (Fastest & Smartest)**

```bash
# Best performance with AI-powered suggestions
node auto-fix-all-upgraded.js --client=instantautotraders --ai --parallel
```

Done! 🎉

---

## 📋 Command Cheat Sheet

### **Basic Commands**

```bash
# Dry run (preview only)
node auto-fix-all-upgraded.js --dry-run --client=YOUR_CLIENT

# Live run (apply changes)
node auto-fix-all-upgraded.js --client=YOUR_CLIENT

# With AI suggestions
node auto-fix-all-upgraded.js --ai --client=YOUR_CLIENT

# Parallel execution (3x faster)
node auto-fix-all-upgraded.js --parallel --client=YOUR_CLIENT

# Queue-based (background processing)
node auto-fix-all-upgraded.js --queue --client=YOUR_CLIENT

# Best: AI + Parallel
node auto-fix-all-upgraded.js --ai --parallel --client=YOUR_CLIENT
```

### **Individual Engines**

```bash
# Run single engine
node src/automation/auto-fixers/meta-description-optimizer.js

# Run legacy engines
node auto-fix-titles.js
node auto-fix-h1-tags.js
node auto-fix-image-alt.js
```

---

## 🎯 What Each Engine Does

| Engine | What It Fixes | Time | Impact |
|--------|---------------|------|--------|
| **Title & Meta** | Page titles, meta tags | 2 min | ⭐⭐⭐⭐⭐ |
| **Meta Descriptions** | Missing/bad meta descriptions | 2 min | ⭐⭐⭐⭐⭐ |
| **Content** | Content quality, keywords | 3 min | ⭐⭐⭐⭐ |
| **H1 Tags** | Multiple H1s → single H1 | 1 min | ⭐⭐⭐ |
| **Image Alt** | Missing alt text | 2 min | ⭐⭐⭐⭐ |
| **NAP** | Business name/address/phone | 2 min | ⭐⭐⭐⭐ |
| **Schema** | Structured data markup | 3 min | ⭐⭐⭐⭐ |
| **Broken Links** | 404s, redirects | 3 min | ⭐⭐⭐ |
| **Duplicate Content** | Duplicate pages, canonicals | 3 min | ⭐⭐⭐⭐ |
| **Core Web Vitals** | Page speed, UX | 2 min | ⭐⭐⭐⭐⭐ |
| **Accessibility** | WCAG compliance | 3 min | ⭐⭐⭐⭐ |

**Total Time (Sequential):** ~12 min  
**Total Time (Parallel):** ~4 min  
**Total Time (Queue):** Background (non-blocking)

---

## 🎨 Execution Modes Explained

### **1. Sequential (Default)**

Runs engines one after another.

**Pros:**
- Simple and predictable
- Easy to monitor
- Safe for small sites

**Cons:**
- Slower (12 min for all engines)

**Best For:** First-time use, small sites

```bash
node auto-fix-all-upgraded.js --client=instantautotraders
```

### **2. Parallel**

Runs 3 engines simultaneously.

**Pros:**
- **67% faster** (4 min vs 12 min)
- More efficient
- Great for multiple engines

**Cons:**
- Higher resource usage
- Harder to debug failures

**Best For:** Regular use, medium+ sites

```bash
node auto-fix-all-upgraded.js --parallel --client=instantautotraders
```

### **3. Queue-Based**

Queues jobs for background processing with Redis.

**Pros:**
- **Non-blocking** (returns immediately)
- Distributed processing
- Retry on failure
- Scheduled jobs
- Priority-based

**Cons:**
- Requires Redis
- More complex setup
- Harder to monitor

**Best For:** Large sites, scheduled runs, production

```bash
node auto-fix-all-upgraded.js --queue --client=instantautotraders
```

---

## 🤖 AI Features

### **What AI Does**

- **Content Analysis:** Analyzes content quality and provides suggestions
- **Meta Descriptions:** Generates compelling, SEO-optimized descriptions
- **Heading Suggestions:** Recommends better headings
- **Keyword Opportunities:** Identifies keyword gaps
- **Impact Prediction:** Estimates SEO impact of changes

### **How to Enable**

```bash
# 1. Set API key
export OPENAI_API_KEY=sk-your-key-here

# 2. Run with --ai flag
node auto-fix-all-upgraded.js --ai --client=instantautotraders
```

### **Cost Estimate**

- GPT-4o-mini: ~$0.15 per run (meta descriptions for 50 pages)
- GPT-4o: ~$1.50 per run (full content analysis)

**Tip:** Start with GPT-4o-mini (used by default)

---

## 📊 Expected Results

### **Immediate (< 1 hour)**

- ✅ All pages have proper meta descriptions
- ✅ All images have alt text
- ✅ Single H1 per page
- ✅ Broken links fixed
- ✅ WCAG 2.1 AA compliant
- ✅ Core Web Vitals optimized

### **Short-term (1-4 weeks)**

- 📈 SEO score: +25-40 points
- 📈 Core Web Vitals: Pass thresholds
- 📈 PageSpeed score: +15-30 points
- 📈 Accessibility score: +40-50 points

### **Long-term (3-6 months)**

- 🚀 Search rankings: +20-45%
- 🚀 Organic traffic: +30-60%
- 🚀 Click-through rate: +10-25%
- 🚀 User engagement: +15-30%

---

## 🔧 Troubleshooting

### **Redis Connection Failed**

```bash
# Check if Redis is running
redis-cli ping

# If not, start it
redis-server

# Or disable Redis features (caching will be disabled)
# Run without --queue flag
```

### **OpenAI API Error**

```bash
# Check API key is set
echo $OPENAI_API_KEY

# Or set it
export OPENAI_API_KEY=sk-your-key-here

# Run without AI if you don't have a key
node auto-fix-all-upgraded.js --client=instantautotraders
```

### **WordPress Connection Failed**

```bash
# Check client config
cat clients/instantautotraders.env

# Test connection
curl https://instantautotraders.com.au/wp-json/wp/v2/posts?per_page=1
```

### **Out of Memory**

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" node auto-fix-all-upgraded.js
```

---

## 📅 Scheduled Runs

### **Cron Job Setup**

```bash
# Edit crontab
crontab -e

# Add daily run at 2am
0 2 * * * cd /path/to/project && node auto-fix-all-upgraded.js --client=instantautotraders --parallel >> /var/log/autofix.log 2>&1

# Add weekly deep scan on Sunday at 3am
0 3 * * 0 cd /path/to/project && node auto-fix-all-upgraded.js --client=instantautotraders --ai --parallel >> /var/log/autofix-weekly.log 2>&1
```

### **PM2 (Recommended)**

```bash
# Install PM2
npm install -g pm2

# Start as cron job
pm2 start auto-fix-all-upgraded.js \
  --name "autofix-daily" \
  --cron "0 2 * * *" \
  -- --client=instantautotraders --parallel

# Monitor
pm2 logs autofix-daily
```

---

## 📈 Monitoring

### **View Logs**

```bash
# All logs
ls -lh logs/

# Latest consolidated report
cat logs/consolidated-report-$(date +%Y-%m-%d).json | jq

# Specific engine
cat logs/meta-description-instantautotraders-$(date +%Y-%m-%d).json | jq
```

### **Queue Status**

```javascript
import autofixQueue from './src/services/autofix-queue.js';

const stats = await autofixQueue.getQueueStats();
console.log(stats);
// {
//   waiting: 2,
//   active: 1,
//   completed: 45,
//   failed: 0
// }
```

### **Cache Stats**

```javascript
import cache from './src/services/redis-cache.js';

const stats = await cache.getStats();
console.log(stats);
```

---

## 💡 Pro Tips

### **1. Always Test First**

```bash
# ALWAYS dry-run first
node auto-fix-all-upgraded.js --dry-run --client=instantautotraders
```

### **2. Use AI Wisely**

```bash
# Use AI for new clients or major updates
node auto-fix-all-upgraded.js --ai --client=NEW_CLIENT

# Skip AI for regular maintenance
node auto-fix-all-upgraded.js --parallel --client=instantautotraders
```

### **3. Parallel for Speed**

```bash
# 3x faster than sequential
node auto-fix-all-upgraded.js --parallel --client=instantautotraders
```

### **4. Queue for Large Sites**

```bash
# Non-blocking, great for multiple clients
for client in client1 client2 client3; do
  node auto-fix-all-upgraded.js --queue --client=$client
done
```

### **5. Monitor Everything**

```bash
# Watch logs in real-time
tail -f logs/consolidated-report-*.json
```

---

## 🎯 Recommended Workflow

### **First Time Setup**

1. Install dependencies
2. Set up Redis (optional)
3. Set OpenAI key (optional)
4. Dry run to preview
5. Review dry run output
6. Run live
7. Verify changes
8. Set up scheduled runs

### **Regular Maintenance**

1. Weekly: `--parallel` (no AI)
2. Monthly: `--ai --parallel` (with AI)
3. Monitor logs
4. Review reports
5. Adjust as needed

### **Production**

1. Use `--queue` for all runs
2. Set up monitoring
3. Alert on failures
4. Regular backups
5. Performance tracking

---

## 🆘 Getting Help

### **Check Documentation**

- `AUTOFIX_ENGINE_COMPLETE_UPGRADE.md` - Full documentation
- `AUTOFIX_QUICK_START.md` - This file
- Engine-specific: Check each file's header comments

### **Check Logs**

```bash
ls logs/
cat logs/consolidated-report-*.json
```

### **Test Individual Engines**

```bash
# Test one engine at a time
node src/automation/auto-fixers/meta-description-optimizer.js
```

### **Community**

- GitHub Issues
- Stack Overflow
- Project documentation

---

## ✅ Success Checklist

Before considering the upgrade successful, verify:

- [ ] All 11 engines run without errors
- [ ] Reports generated in `logs/` directory
- [ ] WordPress changes visible on site
- [ ] PageSpeed Insights shows improvements
- [ ] Search Console shows no new errors
- [ ] Accessibility audit passes
- [ ] Core Web Vitals in green
- [ ] No broken links remaining
- [ ] Duplicate content resolved
- [ ] Scheduled runs working

---

**Quick Start Version:** 1.0  
**Last Updated:** October 29, 2025

**Happy Optimizing! 🚀**
