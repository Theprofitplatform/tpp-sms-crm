# 🚀 VPS Quick Deploy Guide

**Time to Deploy:** 5-10 minutes
**Difficulty:** Easy (automated script provided)
**Status:** Ready to go! ✅

---

## 🎯 Before You Start

Your TPP VPS already has:
- ✅ SerpBear running (rank tracking)
- ✅ SEO Analyst running (technical analysis)
- ✅ PostgreSQL + Redis ready
- ✅ Nginx with SSL configured
- ✅ Your project code at `~/projects/seo-expert`

**All you need to do:** Deploy SEO Expert on port 3007!

---

## 🚀 Option 1: One-Command Deploy (Fastest)

```bash
./deploy-to-tpp-vps.sh
```

This script will:
1. ✅ Check SSH connection to tpp-vps
2. ✅ Update code on VPS
3. ✅ Setup environment variables
4. ✅ Configure database
5. ✅ Deploy with Docker or PM2
6. ✅ Configure Nginx + SSL
7. ✅ Verify everything works

**That's it!** The script guides you through everything.

---

## 🎛️ Option 2: Manual Deploy (5 Commands)

If you prefer manual control:

### Step 1: Update Code on VPS
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && git pull && npm ci --production'
```

### Step 2: Setup Environment
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && cp .env.example .env'
# Then edit .env with your values
```

### Step 3: Deploy with Docker
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose up -d'
```

**OR** Deploy with PM2:
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && pm2 start ecosystem.config.cjs'
```

### Step 4: Check Health
```bash
ssh tpp-vps 'curl http://localhost:3007/health'
```

### Step 5: Configure Domain (Optional)
```bash
# See VPS_INTEGRATION_GUIDE.md for Nginx setup
# Or use the automated script!
```

---

## ✅ Verify Deployment

After deployment, check all services:

```bash
ssh tpp-vps << 'EOF'
  echo "=== SEO Services Status ==="
  curl -sf http://localhost:3006/api/domains > /dev/null && echo "✓ SerpBear (3006)" || echo "✗ SerpBear"
  curl -sf http://localhost:5002/health > /dev/null && echo "✓ SEO Analyst (5002)" || echo "✗ SEO Analyst"
  curl -sf http://localhost:3007/health > /dev/null && echo "✓ SEO Expert (3007)" || echo "✗ SEO Expert"
EOF
```

Expected output:
```
=== SEO Services Status ===
✓ SerpBear (3006)
✓ SEO Analyst (5002)
✓ SEO Expert (3007)
```

---

## 🌐 Access Your Services

After deployment:

### Internal (VPS only)
- SerpBear: `http://localhost:3006`
- SEO Analyst: `http://localhost:5002`
- SEO Expert: `http://localhost:3007`

### Public (with SSL)
- SEO Analyst: `https://seo.theprofitplatform.com.au`
- SEO Expert: `https://seodashboard.theprofitplatform.com.au` (after domain setup)

---

## 🔧 Common Operations

### View Logs
```bash
# All services
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose logs -f'

# Specific service
ssh tpp-vps 'docker logs serpbear-production -f'
```

### Restart Service
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose restart'
```

### Update Code
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && git pull && docker-compose restart'
```

### Check Status
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose ps'
```

---

## 🆘 Troubleshooting

### Service not starting?
```bash
# Check logs
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose logs'

# Check ports
ssh tpp-vps 'ss -tuln | grep 3007'
```

### Database connection issues?
```bash
# Test PostgreSQL
ssh tpp-vps 'psql -U seo_user -d seo_expert -c "SELECT 1;"'

# Test Redis
ssh tpp-vps 'redis-cli ping'
```

### Need to restart everything?
```bash
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose down && docker-compose up -d'
```

---

## 📚 More Help

- **Complete Guide:** `VPS_INTEGRATION_GUIDE.md`
- **Infrastructure Status:** `VPS-STATUS-REPORT.md`
- **Integration Info:** `TPP-VPS-INTEGRATION-SUMMARY.md`
- **VPS Commands:** `.claude/skills/vps/SKILL.md`

---

## 🎉 You're Done!

Once deployed, you'll have a **unified SEO platform** with:
- 📊 Rank tracking (SerpBear)
- 🔍 Technical analysis (SEO Analyst)
- 🎯 Integrated dashboard (SEO Expert)
- 🔗 All sharing the same database
- 📈 Real-time monitoring

**Deploy now:** `./deploy-to-tpp-vps.sh` 🚀
