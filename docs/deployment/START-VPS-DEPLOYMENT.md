# 🎯 START HERE: VPS Deployment

**Everything is ready! Pick your path:**

---

## 🚀 Path 1: Automated (Recommended - 5 minutes)

### One Command Does Everything

```bash
./deploy-to-tpp-vps.sh
```

**What happens:**
1. ✅ Checks SSH connection
2. ✅ Updates code on VPS
3. ✅ Configures environment
4. ✅ Sets up database
5. ✅ Deploys service
6. ✅ Configures Nginx + SSL
7. ✅ Verifies everything works

**When to use:** First deployment, major updates, or when you want guidance

---

## ⚡ Path 2: Quick Update (30 seconds)

### For code updates after initial deployment

```bash
# Load helper commands
source vps-helpers.sh

# Update and restart
vps-update

# Check health
vps-health
```

**When to use:** Quick bug fixes, small changes, daily updates

---

## 🎮 Path 3: Manual Control (Advanced)

### Step-by-step deployment

```bash
# 1. Update code
ssh tpp-vps 'cd ~/projects/seo-expert && git pull && npm ci'

# 2. Deploy
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose up -d'

# 3. Verify
ssh tpp-vps 'curl http://localhost:3007/health'
```

**When to use:** Testing, debugging, custom configurations

---

## 📊 What You're Deploying

### Current VPS Status

```
✅ SerpBear           Port 3006 (Running 2 days)
✅ SEO Analyst        Port 5002 (Running 5 days)
⚪ SEO Expert         Port 3007 (Ready to deploy) ← This is what we're adding!
```

### After Deployment

```
┌─────────────────────────────────────┐
│    Unified SEO Platform (VPS)      │
├─────────────────────────────────────┤
│                                     │
│  🔍 SerpBear (3006)                │
│     └─ Rank tracking                │
│                                     │
│  📊 SEO Analyst (5002)             │
│     └─ Technical analysis           │
│                                     │
│  🎯 SEO Expert (3007) ← NEW!       │
│     ├─ Unified dashboard            │
│     ├─ Client management            │
│     ├─ Keyword tracking             │
│     ├─ API v2                       │
│     └─ Integrates with above        │
│                                     │
│  💾 PostgreSQL + Redis (Shared)    │
│                                     │
└─────────────────────────────────────┘
```

---

## 📋 Pre-Deployment Checklist

### ✅ Already Done (VPS is ready!)

- ✅ PostgreSQL 16 running
- ✅ Redis running
- ✅ Nginx configured with SSL
- ✅ Port 3007 available
- ✅ Node.js 22.19.0 installed
- ✅ Docker & Docker Compose ready
- ✅ Your project at `~/projects/seo-expert`
- ✅ SerpBear & SEO Analyst running
- ✅ 11GB RAM available
- ✅ 45GB disk space free
- ✅ 37 days uptime (stable!)

### 🎯 Your Part (Optional)

These are **optional** - the script will handle them:

- ⚪ Commit local changes (if any)
- ⚪ Database password (script will ask)
- ⚪ JWT secret (script will generate)
- ⚪ Choose Docker or PM2 (script will ask)
- ⚪ SSL certificate (script can set up)

**You can literally just run the script and follow prompts!**

---

## 🎬 Getting Started

### Step 1: Test Connection (5 seconds)

```bash
ssh tpp-vps 'echo "✓ Connected to TPP VPS!"'
```

**Expected:** `✓ Connected to TPP VPS!`

If this works, you're ready!

### Step 2: Deploy (5 minutes)

```bash
./deploy-to-tpp-vps.sh
```

Follow the prompts. The script guides you through everything.

### Step 3: Verify (10 seconds)

```bash
source vps-helpers.sh
vps-health
```

**Expected:**
```
  SerpBear (3006): ✓
  SEO Analyst (5002): ✓
  SEO Expert (3007): ✓
  PostgreSQL: ✓
  Redis: ✓
```

**🎉 Done! Your SEO platform is live!**

---

## 📚 Documentation at Your Fingertips

| File | When to Read |
|------|--------------|
| **This file** | Right now (you're doing it!) |
| `VPS-QUICK-DEPLOY.md` | Quick reference during deployment |
| `VPS-REFERENCE-CARD.md` | Daily operations cheat sheet |
| `VPS-STATUS-REPORT.md` | Complete infrastructure details |
| `VPS_INTEGRATION_GUIDE.md` | Deep dive on integration |
| `vps-helpers.sh` | Helper commands (source it!) |

---

## 🔧 Helper Commands Setup

Add these to your workflow:

```bash
# Load helper commands (do this once per session)
source vps-helpers.sh

# Now you have these commands:
vps-help          # Show all commands
vps-health        # Check services
vps-status        # System status
vps-logs expert   # View logs
vps-restart expert # Restart service
vps-update        # Quick update
vps-monitor       # Real-time monitoring
vps-connect       # SSH to VPS
```

**💡 Pro tip:** Add to `~/.bashrc` or `~/.zshrc`:
```bash
alias vps='source ~/path/to/seo-expert/vps-helpers.sh'
```

Then just type: `vps-health`, `vps-logs expert`, etc.

---

## 🎯 What Happens During Deployment?

### Phase 1: Preparation (Local)
- Checks your git status
- Offers to commit changes
- Pushes to remote if needed

### Phase 2: VPS Update
- Connects to tpp-vps via SSH
- Pulls latest code
- Installs dependencies

### Phase 3: Configuration
- Creates/updates .env file
- Sets up database credentials
- Generates security keys

### Phase 4: Database Setup
- Creates database if needed
- Sets up user permissions
- Runs migrations

### Phase 5: Service Deployment
- Starts with Docker Compose (or PM2)
- Waits for service to be ready
- Checks health endpoint

### Phase 6: Web Server (Optional)
- Configures Nginx
- Sets up SSL certificate
- Tests configuration

### Phase 7: Verification
- Tests all endpoints
- Checks service health
- Shows summary

**Total time: 5-10 minutes** (mostly waiting for installs)

---

## 🆘 If Something Goes Wrong

### Connection failed?
```bash
# Test SSH
ssh -v tpp-vps

# Check SSH config
cat ~/.ssh/config | grep -A 5 "tpp-vps"
```

### Service won't start?
```bash
# Check logs
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose logs'

# Check port
ssh tpp-vps 'ss -tuln | grep 3007'

# Try restart
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose restart'
```

### Database issues?
```bash
# Test PostgreSQL
ssh tpp-vps 'pg_isready'

# Test Redis
ssh tpp-vps 'redis-cli ping'
```

### Need human help?
1. Check `VPS_INTEGRATION_GUIDE.md` troubleshooting section
2. Run `vps-status` to see what's happening
3. Check logs with `vps-logs all`

---

## 📈 After Deployment

### Immediate Next Steps

1. **Test the service**
   ```bash
   curl https://seodashboard.theprofitplatform.com.au/health
   ```

2. **Check the dashboard**
   - Open in browser: `https://seodashboard.theprofitplatform.com.au`

3. **Verify integration**
   ```bash
   source vps-helpers.sh
   vps-health
   ```

### Integration Tasks

1. **Connect to SerpBear**
   - Configure SerpBear API access in SEO Expert
   - Test ranking data retrieval

2. **Link with SEO Analyst**
   - Setup report cross-referencing
   - Configure automated analysis

3. **Setup Monitoring**
   - Add to Prometheus metrics
   - Create Grafana dashboards

### Ongoing Operations

- **Daily:** `vps-health` to check services
- **Updates:** `vps-update` for code changes
- **Backups:** `vps-db-backup` for database
- **Monitoring:** `vps-monitor` for resources

---

## 🎉 Success Criteria

After deployment, you should have:

- ✅ SEO Expert responding on port 3007
- ✅ All health checks passing
- ✅ Dashboard accessible via HTTPS
- ✅ API v2 endpoints working
- ✅ Database connected
- ✅ Redis caching active
- ✅ Integration with SerpBear and SEO Analyst possible

---

## 🚀 Ready to Deploy?

**Quick test:**
```bash
ssh tpp-vps 'echo "Ready!" && uptime'
```

**If that works, deploy now:**
```bash
./deploy-to-tpp-vps.sh
```

**Questions?** Check the docs above or just run the script - it guides you!

---

## 🎊 Your SEO Platform Awaits!

You're deploying to a **production-ready VPS** with:
- 37 days uptime (stable!)
- 11GB RAM available
- 2 SEO services already running
- Complete monitoring setup
- SSL certificates configured

**Everything is ready. Just run the command!** 🚀

```bash
./deploy-to-tpp-vps.sh
```

---

**Last Updated:** October 26, 2025
**Status:** 🟢 Ready to Deploy
**Time Required:** 5-10 minutes
**Difficulty:** Easy (fully automated)
