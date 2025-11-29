# SEO Platform Master Plan

**Goal**: Build complete self-hosted SEO platform on Coolify
**Timeline**: 2-3 weeks (working part-time)
**Cost**: $0 (using existing VPS at 31.97.222.218)

---

## Current State Assessment ✅

### Already Installed
- ✅ N8N (n8n.theprofitplatform.com.au) - Automation engine
- ✅ Uptime Kuma - Site monitoring
- ✅ SerpBear - Rank tracking (needs configuration)
- ✅ Qdrant - Vector database for semantic search
- ✅ Coolify - Deployment platform

### VPS Resources
- **IP**: 31.97.222.218
- **Domain**: theprofitplatform.com.au
- **Available Subdomains**: Unlimited
- **Coolify**: Already configured and running

---

## Master Plan Overview

### Phase 1: Core Analytics (Week 1 - Days 1-3)
Deploy essential tracking and content tools

### Phase 2: Automation Infrastructure (Week 1 - Days 4-7)
Set up automated workflows for SEO tasks

### Phase 3: Performance & Monitoring (Week 2 - Days 1-4)
Add technical SEO and performance tracking

### Phase 4: Advanced Tools (Week 2 - Days 5-7)
Deploy specialized SEO tools

### Phase 5: Integration & Dashboards (Week 3)
Connect everything and create reporting

---

## PHASE 1: Core Analytics & Content
**Timeline**: Days 1-3
**Priority**: 🔥 CRITICAL

### Day 1 Morning: Deploy Plausible Analytics

**Task 1.1: Install Plausible**
```bash
# Time: 30 minutes
# Complexity: Easy

1. Open Coolify: https://coolify.theprofitplatform.com.au
2. Resources → New Service
3. Search: "Plausible"
4. Configure:
   - Name: plausible
   - Domain: analytics.theprofitplatform.com.au
   - Generate random SECRET_KEY_BASE (64 chars)
   - Set admin email/password
5. Deploy
6. Wait for SSL certificate
```

**Task 1.2: Configure Plausible**
```bash
# Time: 20 minutes

1. Visit https://analytics.theprofitplatform.com.au
2. Login with admin credentials
3. Add site: theprofitplatform.com.au
4. Get tracking script
5. Add to your websites
```

**Deliverable**: Working analytics tracking all sites

---

### Day 1 Afternoon: Deploy Ghost CMS

**Task 1.3: Install Ghost**
```bash
# Time: 45 minutes
# Complexity: Easy

1. Coolify → Resources → New Service
2. Search: "Ghost"
3. Configure:
   - Name: ghost
   - Domain: blog.theprofitplatform.com.au
   - Database: Create new MySQL
   - Email: Configure Mailgun/SMTP
5. Deploy
```

**Task 1.4: Configure Ghost**
```bash
# Time: 30 minutes

1. Visit https://blog.theprofitplatform.com.au/ghost
2. Create admin account
3. Configure theme
4. Set up custom domain (if different)
5. Enable public API
```

**Task 1.5: SEO Settings in Ghost**
```bash
# Time: 15 minutes

1. Settings → General
   - Meta title & description
   - Social media images
2. Settings → Code Injection
   - Add Plausible tracking
   - Add schema markup
3. Settings → Advanced
   - Enable XML sitemap
   - Configure robots.txt
```

**Deliverable**: SEO-optimized blog ready for content

---

### Day 2: Configure SerpBear & Rank Tracking

**Task 1.6: Verify SerpBear Installation**
```bash
# Time: 15 minutes

cd /home/avi/projects/serpbear
# Check if running in Coolify
# If not, deploy it
```

**Task 1.7: Set Up Rank Tracking**
```bash
# Time: 1 hour

1. Add your domains
2. Add keywords (20-50 per domain)
3. Configure tracking settings:
   - Daily tracking
   - Multiple locations (AU, US, UK)
   - Desktop + mobile
4. Set up API access for N8N integration
```

**Deliverable**: Daily automated rank tracking

---

### Day 3: Deploy Umami (Backup Analytics)

**Task 1.8: Install Umami**
```bash
# Time: 30 minutes
# Complexity: Easy

1. Coolify → Resources → New Application
2. Docker Image: ghcr.io/umami-software/umami:postgresql-latest
3. Configure:
   - Name: umami
   - Domain: umami.theprofitplatform.com.au
   - Database: Create PostgreSQL
   - APP_SECRET: Generate random
4. Deploy
```

**Task 1.9: Configure Umami**
```bash
# Time: 20 minutes

1. Login with default: admin / umami
2. Change password
3. Add websites
4. Get tracking codes
5. Add to sites as backup to Plausible
```

**Deliverable**: Redundant analytics system

---

### Phase 1 Checklist ✅
- [ ] Plausible Analytics deployed and tracking
- [ ] Ghost CMS deployed and configured
- [ ] SerpBear configured with keywords
- [ ] Umami analytics deployed as backup
- [ ] All tracking codes added to websites
- [ ] Test: Verify data coming into analytics

**Time Investment**: ~6 hours across 3 days
**Skills Required**: Basic (following UI prompts)

---

## PHASE 2: Automation Infrastructure
**Timeline**: Days 4-7
**Priority**: 🔥 HIGH

### Day 4: N8N Workflow - Daily Rank Tracking

**Task 2.1: Create Rank Tracking Workflow**
```bash
# Time: 2 hours
# Complexity: Medium

Workflow: Daily Rank Check & Report
1. Trigger: Schedule (6am daily)
2. SerpBear API: Get all rankings
3. PostgreSQL: Store historical data
4. Function: Calculate changes
5. Condition: If significant changes (±3 positions)
6. Send Email: Alert on changes
7. Update Spreadsheet: Google Sheets log
```

**Code Template**:
```javascript
// N8N Function Node - Calculate Changes
const today = $input.all()[0].json;
const yesterday = $input.all()[1].json;

const changes = today.map(t => {
  const y = yesterday.find(y => y.keyword === t.keyword);
  return {
    keyword: t.keyword,
    position_today: t.position,
    position_yesterday: y?.position || null,
    change: y ? y.position - t.position : null,
    url: t.url
  };
});

return changes.filter(c => Math.abs(c.change) >= 3);
```

**Deliverable**: Automated daily rank tracking with alerts

---

### Day 5: N8N Workflow - Content Publishing

**Task 2.2: Create Content Pipeline**
```bash
# Time: 2 hours
# Complexity: Medium

Workflow: Google Sheets → Ghost CMS
1. Trigger: New row in Google Sheets
2. Function: Parse content
3. Ghost API: Create draft post
4. Condition: Check if scheduled
5. Ghost API: Publish if ready
6. Google Search Console: Submit URL
7. Social Media: Post announcement
8. Slack/Email: Notify team
```

**Task 2.3: Set Up Content Calendar**
```bash
# Time: 30 minutes

1. Create Google Sheet: "Content Calendar"
2. Columns:
   - Title
   - Content
   - Meta Description
   - Keywords
   - Publish Date
   - Status
   - Featured Image URL
3. Share with N8N service account
```

**Deliverable**: Automated content publishing pipeline

---

### Day 6: N8N Workflow - Technical SEO Monitor

**Task 2.4: Create Site Health Monitor**
```bash
# Time: 2 hours
# Complexity: Medium

Workflow: 15-minute Health Check
1. Trigger: Every 15 minutes
2. HTTP Request: Check homepage (multiple sites)
3. Function: Check response time
4. Function: Check for errors in HTML
5. Function: Verify critical elements (h1, meta, canonical)
6. Condition: If issues found
7. Send Alert: Email/Slack
8. Log: Save to database
```

**Task 2.5: Create Broken Link Checker**
```bash
# Time: 1.5 hours

Workflow: Weekly Link Check
1. Trigger: Sunday 2am
2. HTTP Request: Get sitemap
3. Function: Extract all URLs
4. HTTP Request: Check each URL (batch)
5. Filter: Find 404s
6. Email: Report broken links
7. Create Issue: In project management tool
```

**Deliverable**: Automated technical SEO monitoring

---

### Day 7: N8N Workflow - Competitor Analysis

**Task 2.6: Create Competitor Tracker**
```bash
# Time: 2 hours
# Complexity: Advanced

Workflow: Daily Competitor Check
1. Trigger: Daily 7am
2. SerpBear API: Get competitor rankings
3. HTTP Request: Scrape competitor sites (respectfully)
4. Function: Extract new content
5. PostgreSQL: Store data
6. Function: Compare changes
7. Email: Weekly summary report
```

**Deliverable**: Automated competitor monitoring

---

### Phase 2 Checklist ✅
- [ ] Daily rank tracking workflow active
- [ ] Content publishing pipeline working
- [ ] Technical SEO monitor running
- [ ] Broken link checker scheduled
- [ ] Competitor tracking automated
- [ ] Test: Run each workflow manually
- [ ] Document: How to modify workflows

**Time Investment**: ~12 hours across 4 days
**Skills Required**: Medium (JavaScript, API integration)

---

## PHASE 3: Performance & Monitoring
**Timeline**: Days 8-11
**Priority**: 🟡 MEDIUM

### Day 8: Deploy Lighthouse CI

**Task 3.1: Install Lighthouse CI Server**
```bash
# Time: 45 minutes
# Complexity: Medium

1. Coolify → New Application
2. Docker Image: patrickhulce/lhci-server:latest
3. Configure:
   - Name: lighthouse-ci
   - Domain: lighthouse.theprofitplatform.com.au
   - Database: PostgreSQL
   - LHCI_STORAGE__SQL_DIALECT: postgres
4. Deploy
```

**Task 3.2: Configure Lighthouse CLI**
```bash
# Time: 30 minutes

# On your local machine or CI/CD
npm install -g @lhci/cli

# Create lighthouserc.json in each project
{
  "ci": {
    "collect": {
      "url": ["https://theprofitplatform.com.au"],
      "numberOfRuns": 3
    },
    "upload": {
      "target": "lhci",
      "serverBaseUrl": "https://lighthouse.theprofitplatform.com.au"
    }
  }
}

# Run tests
lhci autorun
```

**Task 3.3: Automate Lighthouse Tests**
```bash
# Time: 1 hour

N8N Workflow: Weekly Performance Audit
1. Trigger: Sunday 3am
2. HTTP Request: Trigger Lighthouse test
3. Wait: 5 minutes
4. HTTP Request: Get results
5. Function: Parse scores
6. Condition: If score < 80
7. Email: Alert + recommendations
8. Database: Store historical scores
```

**Deliverable**: Automated Core Web Vitals tracking

---

### Day 9: Deploy Redis Cache

**Task 3.4: Install Redis**
```bash
# Time: 20 minutes
# Complexity: Easy

1. Coolify → New Service
2. Search: "Redis"
3. Configure:
   - Name: redis-cache
   - No public port (internal only)
   - Password: Generate strong password
4. Deploy
```

**Task 3.5: Configure Site Caching**
```bash
# Time: 1 hour per site

For WordPress sites:
1. Install Redis Object Cache plugin
2. Configure wp-config.php:
   define('WP_REDIS_HOST', 'redis-cache');
   define('WP_REDIS_PASSWORD', 'your-password');
3. Enable cache

For Node.js apps:
1. Install redis npm package
2. Configure connection
3. Cache API responses
```

**Deliverable**: Faster page loads (better SEO)

---

### Day 10-11: Deploy Additional Performance Tools

**Task 3.6: Install Varnish Cache (Optional)**
```bash
# Time: 2 hours
# Complexity: Advanced

# Only if handling high traffic
1. Coolify → New Application
2. Docker Image: varnish:latest
3. Configure VCL rules
4. Set as reverse proxy
```

**Task 3.7: Set Up CDN Integration**
```bash
# Time: 1 hour

# If using Cloudflare
1. Configure Cloudflare for theprofitplatform.com.au
2. Set up page rules for caching
3. Configure APO (Automatic Platform Optimization)
4. Monitor via Cloudflare Analytics
```

**Deliverable**: Optimized site performance

---

### Phase 3 Checklist ✅
- [ ] Lighthouse CI running weekly audits
- [ ] Redis cache deployed and configured
- [ ] Sites loading faster (test with PageSpeed)
- [ ] Core Web Vitals being tracked
- [ ] CDN configured (if needed)
- [ ] Test: Run Lighthouse audit manually

**Time Investment**: ~8 hours across 4 days
**Skills Required**: Medium-Advanced

---

## PHASE 4: Advanced SEO Tools
**Timeline**: Days 12-14
**Priority**: 🟢 NICE-TO-HAVE

### Day 12: Deploy Strapi CMS (For Client Sites)

**Task 4.1: Install Strapi**
```bash
# Time: 1 hour
# Complexity: Medium

1. Coolify → New Application
2. Docker Image: strapi/strapi:latest
3. Configure:
   - Name: strapi
   - Domain: cms.theprofitplatform.com.au
   - Database: PostgreSQL
4. Deploy
```

**Task 4.2: Configure Strapi for SEO**
```bash
# Time: 1 hour

1. Install SEO plugin
2. Create content types:
   - Blog Posts (with SEO fields)
   - Landing Pages
   - Products
3. Configure API access
4. Set up webhooks to N8N
```

**Deliverable**: Headless CMS for multiple client sites

---

### Day 13: Deploy Monica CRM (For Outreach)

**Task 4.3: Install Monica**
```bash
# Time: 30 minutes
# Complexity: Easy

1. Coolify → New Service
2. Search: "Monica"
3. Configure:
   - Name: monica
   - Domain: crm.theprofitplatform.com.au
   - Database: MySQL
4. Deploy
```

**Task 4.4: Set Up Outreach Tracking**
```bash
# Time: 1 hour

1. Import contacts (link prospects)
2. Create tags: "Guest Post", "Link Exchange", etc.
3. Set up activities tracking
4. Configure reminders for follow-ups
```

**Deliverable**: CRM for link building campaigns

---

### Day 14: Deploy Metabase (Analytics Dashboard)

**Task 4.5: Install Metabase**
```bash
# Time: 45 minutes
# Complexity: Medium

1. Coolify → New Application
2. Docker Image: metabase/metabase:latest
3. Configure:
   - Name: metabase
   - Domain: data.theprofitplatform.com.au
   - Database: PostgreSQL (for Metabase data)
4. Deploy
```

**Task 4.6: Connect Data Sources**
```bash
# Time: 2 hours

1. Connect PostgreSQL (N8N data)
2. Connect MySQL (Ghost, Monica)
3. Create collections:
   - SEO Metrics
   - Content Performance
   - Rank Tracking
   - Site Health
```

**Task 4.7: Build Dashboards**
```bash
# Time: 2 hours

Dashboard 1: SEO Overview
- Current rankings (top keywords)
- Traffic trends (Plausible data)
- Core Web Vitals (Lighthouse)
- Top performing content

Dashboard 2: Content Performance
- Posts published this month
- Page views per post
- Engagement metrics
- Best time to post

Dashboard 3: Technical SEO
- Site uptime
- Response times
- Broken links found
- Page speed scores
```

**Deliverable**: Comprehensive SEO dashboard

---

### Phase 4 Checklist ✅
- [ ] Strapi deployed (if managing client sites)
- [ ] Monica CRM deployed (if doing outreach)
- [ ] Metabase installed and configured
- [ ] Data sources connected
- [ ] Dashboards created
- [ ] Test: View live dashboard

**Time Investment**: ~10 hours across 3 days
**Skills Required**: Medium-Advanced

---

## PHASE 5: Integration & Reporting
**Timeline**: Days 15-21
**Priority**: 🔥 CRITICAL

### Day 15-16: Build Master SEO Dashboard

**Task 5.1: Create Unified Dashboard in Metabase**
```bash
# Time: 4 hours

SEO Command Center Dashboard:

Row 1: Key Metrics (Today)
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Visitors    │ Avg Position│ Uptime      │ Page Speed  │
│ 1,234       │ 8.5         │ 99.9%       │ 92/100      │
└─────────────┴─────────────┴─────────────┴─────────────┘

Row 2: Trends (30 Days)
┌─────────────────────────────────────────────────────────┐
│ Traffic Chart (Plausible)                               │
│ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█                                │
└─────────────────────────────────────────────────────────┘

Row 3: Rankings
┌─────────────────────────────────────────────────────────┐
│ Top 10 Keywords with Position Changes                  │
│ ↑ SEO tools (+3)                                        │
│ ↓ marketing automation (-2)                            │
│ → content strategy (0)                                  │
└─────────────────────────────────────────────────────────┘

Row 4: Content Performance
┌──────────────────────┬──────────────────────────────────┐
│ Recent Posts         │ Top Performing Posts             │
│ 1. New Post (100 v)  │ 1. Old Post (10k views)         │
│ 2. Guide (50 v)      │ 2. Tutorial (5k views)          │
└──────────────────────┴──────────────────────────────────┘

Row 5: Alerts
┌─────────────────────────────────────────────────────────┐
│ ⚠️ 3 broken links found                                │
│ ⚠️ Page speed dropped below 80 on /page-x             │
│ ✅ All sites responding normally                       │
└─────────────────────────────────────────────────────────┘
```

**Deliverable**: Single dashboard for all SEO metrics

---

### Day 17-18: Automated Reporting

**Task 5.2: Create Weekly SEO Report**
```bash
# Time: 3 hours

N8N Workflow: Weekly SEO Report
1. Trigger: Friday 5pm
2. Query Metabase: Get week's data
3. Generate PDF:
   - Traffic summary
   - Ranking changes
   - Content published
   - Issues found
   - Recommendations
4. Email: Send to stakeholders
5. Archive: Store in Google Drive
```

**Task 5.3: Create Monthly Client Reports**
```bash
# Time: 3 hours

N8N Workflow: Monthly Client Report
1. Trigger: 1st of month, 9am
2. For each client:
   - Pull their site data
   - Generate custom report
   - Include: traffic, rankings, content, backlinks
3. Generate PDF with branding
4. Email to client
5. Log in CRM (Monica)
```

**Deliverable**: Automated weekly & monthly reports

---

### Day 19: API Integrations

**Task 5.4: Integrate Google Search Console**
```bash
# Time: 2 hours

N8N Workflow: GSC Data Import
1. Trigger: Daily 8am
2. GSC API: Get search analytics
3. Parse data:
   - Impressions
   - Clicks
   - CTR
   - Average position
   - Top queries
   - Top pages
4. Store in PostgreSQL
5. Update Metabase dashboard
```

**Task 5.5: Integrate Google Analytics 4 (Optional)**
```bash
# Time: 2 hours

# If you still use GA4 alongside Plausible
N8N Workflow: GA4 Data Import
1. Trigger: Daily 9am
2. GA4 API: Get data
3. Store in database
4. Compare with Plausible data
```

**Deliverable**: GSC data in your dashboard

---

### Day 20: Backup & Security

**Task 5.6: Set Up Automated Backups**
```bash
# Time: 2 hours

N8N Workflow: Daily Backup
1. Trigger: Daily 2am
2. For each database:
   - Create backup
   - Compress
   - Upload to S3/Backblaze
   - Delete old backups (>30 days)
3. Email: Backup confirmation
```

**Task 5.7: Security Hardening**
```bash
# Time: 2 hours

1. Enable 2FA on all tools
2. Set up fail2ban on VPS
3. Configure firewall rules
4. SSL certificates for all domains
5. Strong passwords everywhere
6. API keys in environment variables only
```

**Deliverable**: Secure, backed-up infrastructure

---

### Day 21: Documentation & Training

**Task 5.8: Create Documentation**
```bash
# Time: 3 hours

Create docs for:
1. Architecture overview
2. How to add new sites to tracking
3. How to modify N8N workflows
4. How to access dashboards
5. Troubleshooting guide
6. Backup/restore procedures
```

**Task 5.9: Create Video Tutorials**
```bash
# Time: 2 hours

Screen recordings:
1. Adding a new site (5 min)
2. Checking SEO metrics (3 min)
3. Publishing content via workflow (5 min)
4. Generating custom report (5 min)
```

**Deliverable**: Complete documentation

---

### Phase 5 Checklist ✅
- [ ] Master dashboard created
- [ ] Automated reports working
- [ ] GSC integration complete
- [ ] Backups running daily
- [ ] Security hardened
- [ ] Documentation complete
- [ ] Video tutorials recorded

**Time Investment**: ~25 hours across 7 days
**Skills Required**: All levels

---

## Complete Timeline Summary

| Week | Days | Phase | Hours | Key Deliverables |
|------|------|-------|-------|------------------|
| 1 | 1-3 | Core Analytics | 6h | Plausible, Ghost, SerpBear |
| 1 | 4-7 | Automation | 12h | N8N workflows (5 workflows) |
| 2 | 8-11 | Performance | 8h | Lighthouse, Redis, caching |
| 2 | 12-14 | Advanced Tools | 10h | Strapi, Monica, Metabase |
| 3 | 15-21 | Integration | 25h | Dashboard, reports, backups |
| **Total** | **21 days** | **5 phases** | **61h** | **Complete SEO platform** |

---

## Resource Requirements

### VPS Resources (Estimated)
```
Current: 31.97.222.218
Required:
- RAM: 8GB (16GB recommended)
- CPU: 4 cores
- Storage: 100GB+
- Bandwidth: Unlimited or high

All tools running:
- RAM usage: ~6GB
- CPU: ~40% average
- Storage: ~50GB
```

### Skills Required
- **Basic**: Coolify UI navigation, copy/paste configs
- **Medium**: N8N workflow creation, basic JavaScript
- **Advanced**: API integrations, database queries

### Costs
```
Software: $0 (all open source)
VPS: $20-40/month (already have)
Domain: Already own
SSL: Free (Let's Encrypt)

Total Monthly: $0 additional
Annual Savings: $3,000+ (vs SaaS tools)
```

---

## Quick Start (If Time Limited)

### Minimum Viable SEO Platform (1 Weekend)

**Saturday (6 hours)**
1. Deploy Plausible (30 min)
2. Configure SerpBear (1 hour)
3. Create rank tracking workflow (2 hours)
4. Create technical SEO monitor (2 hours)
5. Test everything (30 min)

**Sunday (6 hours)**
1. Deploy Ghost CMS (45 min)
2. Create content publishing workflow (2 hours)
3. Deploy Metabase (45 min)
4. Create basic dashboard (2 hours)
5. Set up automated backups (30 min)

**Result**: Core SEO platform in 12 hours!

---

## Success Metrics

### After Week 1
- [ ] Analytics tracking all sites
- [ ] Daily rank tracking automated
- [ ] Content pipeline functional

### After Week 2
- [ ] Performance monitoring active
- [ ] All tools integrated
- [ ] Dashboard showing data

### After Week 3
- [ ] Automated reports working
- [ ] Team trained
- [ ] Everything documented

---

## Maintenance Plan

### Daily (Automated)
- Rank tracking
- Site health checks
- Backup creation
- Data collection

### Weekly (15 min manual)
- Review automated reports
- Check for alerts
- Verify backups

### Monthly (1 hour)
- Review all metrics
- Optimize workflows
- Update documentation
- Plan improvements

---

## Emergency Contacts & Resources

### If Something Breaks
1. Check Coolify logs
2. Check N8N execution logs
3. Check database connections
4. Restart affected service
5. Restore from backup if needed

### Support Resources
- Coolify Discord: https://discord.gg/coolify
- N8N Community: https://community.n8n.io
- This documentation
- Backup everything before changes!

---

## Next Steps

**Ready to start?**

Choose your approach:

**Option A: Full Plan (3 weeks)**
- Complete platform
- All features
- Start Phase 1 Day 1

**Option B: Quick Start (1 weekend)**
- Core features only
- Fast deployment
- Minimum viable platform

**Option C: Guided Setup (I help you)**
- I deploy each tool step-by-step
- You learn as we go
- Ask questions anytime

**Which option do you want to take?**

I can start deploying the first tools right now if you're ready!
