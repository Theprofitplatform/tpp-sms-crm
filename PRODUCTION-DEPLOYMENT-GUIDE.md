# 🚀 Production Deployment Guide

**Get your SEO automation running in production in 30 minutes.**

---

## ✅ Prerequisites

- GitHub account (for automation)
- Cloudflare account (for Functions deployment)
- WordPress sites with admin access
- Google Cloud project with GSC enabled

---

## 🎯 STEP 1: Set Up GitHub Secrets (15 min)

Your automation needs credentials to run. Add these as GitHub repository secrets:

### Go to: Repository → Settings → Secrets and variables → Actions → New repository secret

### 1. **Google Service Account**
```
Name: GSC_SERVICE_ACCOUNT
Value: <paste entire contents of config/google/service-account.json>
```

### 2. **AI API Keys**
```
Name: ANTHROPIC_API_KEY
Value: <your Anthropic/Claude API key>

Name: OPENAI_API_KEY  
Value: <your OpenAI API key>
```

### 3. **WordPress Credentials**

For each WordPress site, create application passwords:
1. Go to: WordPress Admin → Users → Your Profile → Application Passwords
2. Create new application password
3. Copy the generated password

Then add to GitHub secrets:

```
Name: IAT_WP_USER
Value: admin

Name: IAT_WP_PASSWORD
Value: <application password for instantautotraders>

Name: HOTTYRES_WP_USER
Value: admin

Name: HOTTYRES_WP_PASSWORD
Value: <application password for hottyres>

Name: SADC_WP_USER
Value: admin

Name: SADC_WP_PASSWORD
Value: <application password for SADC>
```

### Verify All Secrets Are Set

You should have 8 secrets total:
- ✅ GSC_SERVICE_ACCOUNT
- ✅ ANTHROPIC_API_KEY
- ✅ OPENAI_API_KEY
- ✅ IAT_WP_USER
- ✅ IAT_WP_PASSWORD
- ✅ HOTTYRES_WP_USER
- ✅ HOTTYRES_WP_PASSWORD
- ✅ SADC_WP_USER
- ✅ SADC_WP_PASSWORD

---

## 📊 STEP 2: Deploy Cloudflare Functions (10 min)

Your dashboard needs real GSC data.

### 1. Log into Cloudflare Dashboard

Go to: Pages → seo-reports (or your project name)

### 2. Add Environment Variable

Settings → Environment variables → Production → Add variable

```
Name: GSC_SERVICE_ACCOUNT
Value: <paste entire contents of config/google/service-account.json>
```

Click "Save"

### 3. Redeploy Functions

```bash
# In your local project:
npm install -g wrangler
wrangler login
wrangler deploy
```

Or trigger a redeploy from Cloudflare dashboard:
- Go to Deployments
- Click "Retry deployment" on the latest deployment

### 4. Verify It Works

Test the API:
```bash
curl -X POST https://seo-reports-4d9.pages.dev/api/gsc-metrics \
  -H "Content-Type: application/json" \
  -d '{"siteUrl":"https://instantautotraders.com.au"}'
```

Expected: Real data (not mock) with actual clicks/impressions.

---

## 🤖 STEP 3: Test Automation Locally (5 min)

Before running in production, test locally:

### 1. Create Local .env File

```bash
# Create .env in project root
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
IAT_WP_USER=admin
IAT_WP_PASSWORD=your_app_password
HOTTYRES_WP_USER=admin
HOTTYRES_WP_PASSWORD=your_app_password
SADC_WP_USER=admin
SADC_WP_PASSWORD=your_app_password
```

### 2. Run Test Automation

```bash
# Test for one client
node run-automation.js instantautotraders
```

**Expected output:**
- ✅ GSC data fetched
- ✅ Keywords analyzed
- ✅ Quick wins identified
- ✅ Backup created
- ✅ Posts optimized (or errors if WP credentials wrong)
- ✅ Report generated in logs/clients/instantautotraders/reports/

### 3. Check the Report

```bash
open logs/clients/instantautotraders/reports/seo-report-*.html
```

You should see a beautiful HTML report with:
- Metrics (clicks, impressions, CTR, position)
- Quick win opportunities
- Optimizations completed
- Recommendations

---

## ⚡ STEP 4: Enable GitHub Actions (Immediate)

Your automation will now run every Monday at 9am UTC.

### 1. Verify Workflow File Exists

Check: `.github/workflows/weekly-seo-automation.yml`

### 2. Enable Actions

Go to: Repository → Actions → Enable workflows

### 3. Test Manual Trigger

Actions → Weekly SEO Automation → Run workflow

Select:
- Client: "all"
- Dry run: false

Click "Run workflow"

### 4. Monitor Execution

Watch the workflow run. Each client runs in parallel.

Expected:
- ✅ All 3 clients complete successfully
- ✅ Reports uploaded as artifacts
- ✅ Summary shows in GitHub Actions

### 5. Download Reports

Actions → Completed workflow → Artifacts → Download

You'll get:
- `seo-reports-instantautotraders-X.zip`
- `seo-reports-hottyres-X.zip`
- `seo-reports-sadcdisabilityservices-X.zip`

Each contains:
- HTML report
- Automation log
- Backup files

---

## 📧 STEP 5: Set Up Email Delivery (Optional - Next Phase)

For now, reports are generated and stored. To email them:

### Option A: Manual (Current)
1. Download report from GitHub Actions artifacts
2. Email to client manually

### Option B: Automated (Future)
We'll add Resend API integration to automatically email reports.

---

## 🎯 You're Live!

### What Happens Now:

**Every Monday at 9:00 AM UTC:**
1. GitHub Actions triggers
2. Automation runs for all 3 clients
3. GSC data fetched
4. Quick wins identified  
5. Posts optimized
6. Reports generated
7. Results saved as artifacts (90 days retention)

**Manual Trigger:**
- Run anytime from GitHub Actions UI
- Or locally: `node run-automation.js <client>`

---

## 🔍 Monitoring & Troubleshooting

### Check Automation Status

**GitHub:** Repository → Actions → Latest workflow run

**Logs:** Each job shows detailed logs

**Artifacts:** Download full reports and logs

### Common Issues

**401 Unauthorized Errors:**
- WordPress credentials wrong
- Application password expired
- Check GitHub secrets

**GSC API Errors:**
- Service account not set in Cloudflare
- Service account not granted access in GSC console

**No Data Returned:**
- GSC property URL wrong in clients config
- Not enough time has passed (GSC has 2-3 day delay)

### Fix Issues

1. Update GitHub secrets
2. Re-run workflow
3. Check artifacts for detailed logs

---

## 📈 Next Steps

Now that automation is running:

### Week 1-2: Monitor & Validate
- ✅ Verify reports are accurate
- ✅ Check optimizations are working
- ✅ Get client feedback

### Week 3-4: Scale
- ✅ Add email delivery
- ✅ Build client dashboard login
- ✅ Onboard new clients

### Month 2: Improve
- ✅ Add ranking trend charts
- ✅ Implement A/B testing
- ✅ Add competitor tracking

---

## 🆘 Need Help?

**Check logs:**
```bash
# Local
cat logs/clients/*/automation-*.log

# GitHub Actions
Actions → Download artifacts
```

**Test individual components:**
```bash
# Test GSC connection
node test-gsc-direct.cjs

# Test WordPress connection
node test-instantautotraders.js

# Run in dry-run mode
node run-automation.js instantautotraders --dry-run
```

**Verify configuration:**
```bash
# Check clients config
cat clients/clients-config.json

# Check environment
node -e "require('dotenv').config(); console.log(Object.keys(process.env).filter(k => k.includes('WP') || k.includes('API')))"
```

---

## ✅ Checklist

Before going to clients:

- [ ] GitHub secrets all set (8 total)
- [ ] Cloudflare GSC_SERVICE_ACCOUNT set
- [ ] Local test successful for all clients
- [ ] GitHub Actions enabled
- [ ] Manual workflow run successful
- [ ] Reports look good
- [ ] All 3 clients showing data

**Once all checked:** You're production-ready! 🚀

---

## 📊 What Your Clients Get

Every week they receive:
- ✅ SEO performance report
- ✅ Current rankings and traffic
- ✅ Quick win opportunities identified
- ✅ Pages optimized automatically
- ✅ Clear recommendations

**Your Time Investment:** 0 hours (fully automated)

**Their Value:** $500-1500/month service

---

*Last Updated: 2025-10-24*
