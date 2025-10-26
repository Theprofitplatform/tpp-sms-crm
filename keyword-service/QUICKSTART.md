# Keyword Research Tool - Quick Start Guide

## 🚀 Your First Project (30 Seconds)

```bash
# Make sure venv is activated
source venv/bin/activate

# Create your first project
python3 cli.py create \
  --name "My First Research Project" \
  --seeds "seo tools,keyword research" \
  --geo US \
  --focus informational

# View results
python3 cli.py report <project_id>

# Export to CSV
python3 cli.py export <project_id>
```

---

## 📋 Common Use Cases

### Informational Content (Blogs, Guides, How-Tos)
```bash
python3 cli.py create \
  --name "Blog Strategy - Q1 2025" \
  --seeds "project management tips,agile methodology" \
  --geo US \
  --focus informational
```

**Best for:** Educational content, tutorials, thought leadership

---

### Commercial Content (Product Reviews, Comparisons)
```bash
python3 cli.py create \
  --name "Best Software Reviews" \
  --seeds "best crm software,top project tools" \
  --geo US \
  --focus commercial
```

**Best for:** Review articles, comparison pages, buyer guides

---

### Transactional Content (Product Pages, Pricing)
```bash
python3 cli.py create \
  --name "E-commerce Product Research" \
  --seeds "buy wireless headphones,bluetooth speaker deals" \
  --geo US \
  --focus transactional
```

**Best for:** Product pages, pricing pages, checkout flows

---

## 📊 Understanding Your Results

### After Running a Project

**You get 3 CSV files:**

1. **keywords.csv** (92+ keywords)
   - All discovered keywords
   - Search volume, CPC, difficulty
   - Intent classification
   - Opportunity scores

2. **briefs.csv** (50+ content briefs)
   - Target keyword for each page
   - Recommended word count
   - Schema markup suggestions
   - SERP features to target

3. **calendar.csv** (20+ items)
   - Publishing schedule
   - Seasonal opportunities
   - Topic distribution

---

## ⚡ Quick Reference

### All CLI Commands
```bash
# List projects
python3 cli.py list

# View project report
python3 cli.py report 3

# Export project
python3 cli.py export 3

# Generate calendar
python3 cli.py calendar 3

# Initialize database (first time only)
python3 cli.py init
```

---

### Resume Interrupted Projects
```bash
# If a project crashes or is interrupted
python3 cli.py create \
  --name "Same Project Name" \
  --seeds "same keywords" \
  --resume  # ← Picks up where it left off
```

**8 Checkpoint Stages:**
- created → expansion → metrics → processing → scoring → clustering → briefs → completed

---

## 🎯 What Makes a Good Seed Keyword?

### ✅ Good Seeds
- `project management software` - Specific but not too narrow
- `social media marketing` - Clear topic with volume
- `best crm tools` - Commercial intent clear

### ❌ Avoid
- `the` - Too broad, no direction
- `ultra-specific-brand-model-xyz` - Too narrow, no expansion
- `a,b,c,d,e` - Single letters, meaningless

---

## 💡 Pro Tips

### Get More Keywords
```bash
# Use 3-5 related seeds for broader coverage
--seeds "keyword research,seo tools,rank tracking,serp analysis,content optimization"
```

### Control Scope
```bash
# Fewer seeds = faster, more focused
--seeds "project management"  # 5-8 min, 80-150 keywords

# More seeds = slower, comprehensive
--seeds "project management,team collaboration,productivity tools,workflow automation"  # 12-20 min, 200-400 keywords
```

### Monitor Progress
- Checkpoints saved at each stage
- See quota usage in final summary
- Track API calls in real-time

---

## 🔧 Typical Workflow

1. **Create Project**
   ```bash
   python3 cli.py create --name "Project" --seeds "keywords" --geo US
   ```

2. **Review Summary**
   ```bash
   python3 cli.py report <id>
   # Shows: keywords count, intent distribution, top opportunities
   ```

3. **Export & Analyze**
   ```bash
   python3 cli.py export <id>
   # Opens CSVs in Excel/Sheets
   # Filter by difficulty < 30
   # Sort by opportunity score
   ```

4. **Create Content Plan**
   - Use briefs.csv for content team
   - Use calendar.csv for scheduling
   - Track in Notion/Asana/Trello

---

## 📈 Expected Results

| Project Type | Keywords | Briefs | Duration |
|-------------|----------|---------|----------|
| Small (1-2 seeds) | 50-100 | 20-40 | 4-8 min |
| Medium (3-4 seeds) | 100-200 | 40-80 | 8-15 min |
| Large (5+ seeds) | 200-400 | 80-150 | 15-25 min |

---

## ⚠️ Common Issues & Solutions

**"Google Trends rate limiting"**
- **Normal behavior** - Tool continues with available data
- **Impact:** Minimal (only affects trend_score)
- **Fix:** Not needed

**"No search volume data"**
- **Cause:** Keywords too specific/local
- **Fix:** Use broader seed keywords

**"Too many/few keywords"**
- **Too many:** Seeds too broad → use more specific seeds
- **Too few:** Seeds too narrow → add related terms

---

## 📚 Full Documentation

- **Export Schemas:** `EXPORTS.md` - Complete CSV field definitions
- **Troubleshooting:** `OPERATIONS.md` - Common issues, solutions
- **AI Integration:** `CLAUDE.md` - Working with Claude Code
- **Full Setup:** `setup_local_deployment.sh` - Automated installation

---

## 🎉 You're Ready!

```bash
# Start your first real project now:
python3 cli.py create \
  --name "Client: [Name] - [Project Type]" \
  --seeds "your,primary,keywords" \
  --geo US \
  --focus informational
```

**Last Updated:** 2025-10-25 | **Version:** 1.0 Production
