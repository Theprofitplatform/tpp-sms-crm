# 🚀 Position Tracking - Quick Start

## Start Dashboard
```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
node dashboard-server.js
```
Open: **http://localhost:9000**

---

## 3-Minute Setup

### 1️⃣ Add Scraper API Key (REQUIRED)
```bash
# Option 1: Use Serper.dev (Recommended - $5 for 5000 searches)
# Sign up at https://serper.dev and get API key

# Add to database:
sqlite3 data/seo-automation.db <<EOF
UPDATE scraper_settings 
SET enabled = 1, api_key = 'YOUR_SERPER_API_KEY_HERE' 
WHERE scraper_name = 'serper';
EOF
```

### 2️⃣ Add Domain
Dashboard → **Domains** → **Add Domain**
- Domain: `yoursite.com`
- Display Name: `My Website`
- Notifications: ✅ ON

### 3️⃣ Add Keywords
Dashboard → **Keywords Tracking** → **Add Keywords**
- Select domain
- Paste keywords (one per line):
```
your main keyword
your product name
your brand name
```

### 4️⃣ Refresh Positions
Click **"Refresh All"** button

---

## 📊 What You Get

✅ **Live Position Tracking**
- See rankings in real-time
- Desktop & mobile tracking
- Multi-country support

✅ **Automated Daily Updates**
- Runs at 2:00 AM automatically
- No manual intervention needed

✅ **Position Change Alerts**
- Email notifications
- ±5 position changes trigger alerts

✅ **90-Day History**
- Track trends over time
- See improvements

---

## 🎯 Navigation

| Page | URL | Purpose |
|------|-----|---------|
| Domains | `#domains` | Manage tracking domains |
| Keywords | `#keywords` | View & refresh positions |
| Position Analysis | `#position-tracking` | CSV analysis (existing) |

---

## 🔑 Get Free API Keys

**Serper.dev** (Recommended)
- 🔗 https://serper.dev
- 💰 $5 = 5,000 searches
- ⚡ Fast & reliable

**SerpAPI** (Alternative)
- 🔗 https://serpapi.com
- 💰 100 free searches/month
- 🔄 Most comprehensive

**ValueSERP** (Budget Option)
- 🔗 https://www.valueserp.com
- 💰 $5 = 10,000 searches
- 📊 Good for bulk tracking

---

## 🤖 Automation Schedule

| Job | Schedule | Action |
|-----|----------|--------|
| Position Refresh | Daily 2:00 AM | Updates all keyword positions |
| Notification Sender | Every hour | Sends queued email alerts |

---

## 📱 Mobile Access

Dashboard is fully responsive!
- Access from phone/tablet
- Check rankings on-the-go
- Refresh positions remotely

---

## 🆘 Quick Troubleshooting

**"All scrapers failed"**
→ Add scraper API key (see step 1)

**Keywords not updating**
→ Click refresh button manually first

**No email notifications**
→ Add email addresses in domain settings

**Port 9000 in use**
→ `pkill -f dashboard-server` then restart

---

## 📈 Success Example

After setup, you'll see:
```
Total Keywords: 50
Top 3:          12  ✅
Top 10:         28  ✅
Top 20:         8   📈
Unranked:       2   🔧
```

---

## 💡 Pro Tips

1. **Start small**: Add 10-20 keywords first
2. **Test manually**: Click refresh to verify scraper works
3. **Monitor closely**: Check daily for first week
4. **Scale gradually**: Add more keywords after testing
5. **Review history**: Track trends over 30+ days

---

## 🎉 You're All Set!

Position tracking is **ready to use** right now. Just add a scraper API key and start tracking!

**Questions?** Check `SERPBEAR_INTEGRATION_COMPLETE.md` for full documentation.
