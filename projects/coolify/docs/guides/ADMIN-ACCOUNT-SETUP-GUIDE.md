# 👤 Admin Account Setup Guide

**Time Required**: 10 minutes
**Prerequisite**: Domains configured in Coolify with SSL

---

## 📋 What You'll Create

Admin accounts for all 3 services:
1. ✅ Plausible Analytics
2. ✅ Ghost CMS
3. ✅ SerpBear (already has credentials)

---

## 🎯 STEP 1: Plausible Analytics Admin

### Access
**URL**: https://analytics.theprofitplatform.com.au

### Setup Instructions

1. **Open Plausible**:
   - Visit: https://analytics.theprofitplatform.com.au
   - Click "Register" button

2. **Create Admin Account**:
   ```
   Full Name:     Your Name
   Email:         admin@theprofitplatform.com.au
   Password:      [Create a strong password - save it!]
   ```

3. **Activate Account** (if email verification required):
   - Check email for verification link
   - Click link to activate

4. **Add Your First Site**:
   - After login, click "Add a website"
   - Enter:
     ```
     Domain:    theprofitplatform.com.au
     Timezone:  Australia/Sydney
     ```
   - Click "Add snippet"

5. **Copy Tracking Script**:
   ```html
   <script defer data-domain="theprofitplatform.com.au"
     src="https://analytics.theprofitplatform.com.au/js/script.js">
   </script>
   ```

6. **Add to Your Website**:
   - Paste script in `<head>` section of your website
   - For WordPress: Use "Insert Headers and Footers" plugin
   - For custom sites: Add directly to HTML template

7. **Test Tracking**:
   - Visit your website
   - Go back to Plausible dashboard
   - Within 30 seconds, you should see your visit

### Plausible Tips

✅ **Add Multiple Sites**: Click "+" to track multiple domains
✅ **Invite Team**: Settings → People → Invite team members
✅ **Goals**: Settings → Goals → Track conversions
✅ **Email Reports**: Settings → Email Reports → Daily/weekly summaries

---

## 🎯 STEP 2: Ghost CMS Admin

### Access
**URL**: https://blog.theprofitplatform.com.au/ghost

### Setup Instructions

1. **Open Ghost Admin**:
   - Visit: https://blog.theprofitplatform.com.au/ghost
   - Click "Create your account"

2. **Create Admin Account**:
   ```
   Site Title:    The Profit Platform Blog
   Full Name:     Your Name
   Email:         admin@theprofitplatform.com.au
   Password:      [Create a strong password - save it!]
   ```

3. **Skip Team Invitation** (for now):
   - Click "I'll do this later"

4. **Configure General Settings**:
   - Go to: Settings → General
   - Set:
     ```
     Publication Name:   The Profit Platform Blog
     Description:        [Your blog description]
     Site Language:      en
     Time Zone:          Australia/Sydney
     Publication Logo:   [Upload your logo]
     Publication Cover:  [Upload cover image]
     ```

5. **Configure SEO Settings**:
   - Still in Settings → General
   - Meta Data section:
     ```
     Meta Title:        [Your blog title]
     Meta Description:  [Compelling description for search engines]
     Twitter Card:      [Your Twitter handle]
     Facebook Card:     [Your Facebook URL]
     ```

6. **Add Plausible Tracking**:
   - Go to: Settings → Code Injection
   - In "Site Header" field, paste:
     ```html
     <script defer data-domain="theprofitplatform.com.au"
       src="https://analytics.theprofitplatform.com.au/js/script.js">
     </script>
     ```
   - Click "Save"

7. **Configure Advanced Settings**:
   - Go to: Settings → Advanced
   - Verify:
     ```
     Make site private:  OFF (public blog)
     Enable Members:     ON (if you want memberships)
     Enable Subscriptions: ON (if you want newsletters)
     ```

8. **Test Your Blog**:
   - Visit: https://blog.theprofitplatform.com.au
   - Should see your blog (may be empty for now)

### Ghost Tips

✅ **Write First Post**: Click "New Post" → Write → Publish
✅ **Customize Theme**: Settings → Design → Install new theme
✅ **Newsletter**: Settings → Email → Configure Mailgun
✅ **Memberships**: Settings → Members → Set up tiers
✅ **API Access**: Settings → Integrations → Create custom integration

---

## 🎯 STEP 3: SerpBear Configuration

### Access
**URL**: https://ranks.theprofitplatform.com.au

### Credentials (Already Exists)
```
Username: admin
Password: 0123456789
API Key:  c2b7240d-27e2-4b39-916e-aa7513495d2c
```

### Setup Instructions

1. **Login**:
   - Visit: https://ranks.theprofitplatform.com.au
   - Enter username: `admin`
   - Enter password: `0123456789`

2. **Add Your Domains**:
   - Click "Add Domain"
   - Enter:
     ```
     Domain:   theprofitplatform.com.au
     Country:  Australia
     Device:   Desktop
     ```
   - Click "Add"
   - Repeat for other domains you want to track

3. **Add Keywords** (10-20 per domain):
   - Click on your domain
   - Click "Add Keyword"
   - Examples for SEO business:
     ```
     - "SEO tools Australia"
     - "digital marketing automation"
     - "content marketing platform"
     - "Google Analytics alternative"
     - "privacy-friendly analytics"
     - "headless CMS"
     - "keyword rank tracker"
     - "SEO monitoring"
     - "website analytics"
     - "blog platform"
     ```

4. **Configure Tracking Settings**:
   - Go to Settings (gear icon)
   - Set:
     ```
     Tracking Frequency:  Daily
     Tracking Time:       06:00 AM
     Email Notifications: [Your email]
     Alert on Change:     ±3 positions
     ```

5. **Generate API Key** (for N8N):
   - Go to Settings → API
   - Copy your API key: `c2b7240d-27e2-4b39-916e-aa7513495d2c`
   - Save for N8N workflow configuration

6. **Test Tracking**:
   - Click "Refresh All" to manually trigger tracking
   - Wait 30-60 seconds
   - Results should appear

### SerpBear Tips

✅ **Tag Keywords**: Organize by campaign, product, etc.
✅ **Compare Competitors**: Track competitor rankings
✅ **Export Data**: Download CSV reports
✅ **API Integration**: Use API key for N8N automation

---

## 🔐 IMPORTANT: Save Your Credentials!

Create a secure password manager entry for:

```
Service: Plausible Analytics
URL:     https://analytics.theprofitplatform.com.au
Email:   admin@theprofitplatform.com.au
Password: [Your password]

Service: Ghost CMS
URL:     https://blog.theprofitplatform.com.au/ghost
Email:   admin@theprofitplatform.com.au
Password: [Your password]

Service: SerpBear
URL:     https://ranks.theprofitplatform.com.au
Username: admin
Password: 0123456789
API Key:  c2b7240d-27e2-4b39-916e-aa7513495d2c
```

---

## ✅ Verification Checklist

After setup, verify each service:

### Plausible
- [ ] Can login to analytics dashboard
- [ ] Website added and tracking script obtained
- [ ] Tracking script added to website
- [ ] Test visit appears in dashboard (within 30s)

### Ghost
- [ ] Can login to /ghost admin panel
- [ ] General settings configured
- [ ] Plausible tracking script added
- [ ] Blog homepage is accessible
- [ ] Can create and publish a test post

### SerpBear
- [ ] Can login successfully
- [ ] Domain(s) added
- [ ] 10-20 keywords added per domain
- [ ] Manual refresh works
- [ ] Daily tracking scheduled

---

## ⏭️ Next Steps

Once admin accounts are set up:

1. **Import N8N Workflow**:
   - File: `/home/avi/projects/coolify/deployments/n8n-workflows/01-daily-rank-tracking.json`
   - Configure with SerpBear API key
   - Activate for automated tracking

2. **Write First Blog Post**:
   - Topic idea: "How We Built Our SEO Platform"
   - Include keywords you're tracking
   - Add internal links

3. **Monitor Analytics**:
   - Check Plausible daily
   - Review SerpBear rankings weekly
   - Analyze Ghost subscriber growth

4. **Set Up Automation**:
   - Run: `/home/avi/projects/coolify/scripts/setup-cron.sh`
   - Enable automated backups
   - Configure health monitoring

---

## 🆘 Troubleshooting

### Can't Access Plausible
- Verify domain is configured in Coolify
- Check SSL certificate is valid
- Try clearing browser cache

### Ghost Admin Not Loading
- Verify Ghost container is running: `docker ps | grep ghost`
- Check Ghost logs: `docker logs ghost`
- Restart Ghost: `cd /home/avi/ghost-cms && docker-compose restart`

### SerpBear Not Tracking
- Verify keywords are added correctly
- Check tracking is enabled
- Try manual refresh first
- Review SerpBear logs in /data folder

---

**Next**: Import N8N workflow for automated rank tracking!
See: `N8N-WORKFLOW-SETUP-GUIDE.md`
