# 📇 TPP VPS Quick Reference Card

**Keep this handy for daily VPS management!**

---

## 🔌 Quick Connect

```bash
ssh tpp-vps
```

---

## 🚀 Deploy/Update

| Command | Purpose |
|---------|---------|
| `./deploy-to-tpp-vps.sh` | Full guided deployment |
| `source vps-helpers.sh && vps-update` | Quick code update |
| `source vps-helpers.sh && vps-deploy` | Same as deploy script |

---

## 🏥 Health Checks

```bash
# Load helper commands
source vps-helpers.sh

# Check all services
vps-health

# Expected output:
#   SerpBear (3006): ✓
#   SEO Analyst (5002): ✓
#   SEO Expert (3007): ✓
#   PostgreSQL: ✓
#   Redis: ✓
```

---

## 📊 Service Status

```bash
# Complete status
vps-status

# Monitor in real-time
vps-monitor

# Docker containers
ssh tpp-vps 'docker ps'
```

---

## 📋 View Logs

```bash
source vps-helpers.sh

# Individual services
vps-logs serpbear       # Rank tracking
vps-logs analyst        # Technical analysis
vps-logs expert         # SEO Expert dashboard

# All logs
vps-logs all
```

**Manual commands:**
```bash
# SerpBear
ssh tpp-vps 'docker logs serpbear-production -f'

# SEO Analyst
ssh tpp-vps 'journalctl -u seo-analyst.service -f'

# SEO Expert
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose logs -f'
```

---

## 🔄 Restart Services

```bash
source vps-helpers.sh

# Specific service
vps-restart serpbear
vps-restart analyst
vps-restart expert

# All SEO services
vps-restart all
```

**Manual commands:**
```bash
# SerpBear
ssh tpp-vps 'docker restart serpbear-production'

# SEO Analyst
ssh tpp-vps 'sudo systemctl restart seo-analyst.service'

# SEO Expert
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose restart'
```

---

## 💾 Database Operations

```bash
source vps-helpers.sh

# Backup database
vps-db-backup

# Connect to database
vps-db-connect
```

**Manual commands:**
```bash
# Backup
ssh tpp-vps 'pg_dump -U seo_user seo_expert > ~/backups/backup-$(date +%Y%m%d).sql'

# Connect
ssh tpp-vps 'psql -U seo_user -d seo_expert'

# Check size
ssh tpp-vps 'sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"'
```

---

## 🌐 Service URLs

### Internal (VPS only)
```
http://localhost:3006    # SerpBear (rank tracking)
http://localhost:5002    # SEO Analyst (analysis)
http://localhost:3007    # SEO Expert (dashboard)
http://localhost:5432    # PostgreSQL
http://localhost:6379    # Redis
http://localhost:9090    # Prometheus
http://localhost:3005    # Grafana
```

### Public (HTTPS)
```
https://seo.theprofitplatform.com.au              # SEO Analyst
https://seodashboard.theprofitplatform.com.au       # SEO Expert (after setup)
```

---

## 📤 File Transfer

### Upload to VPS
```bash
# Single file
scp file.txt tpp-vps:~/projects/seo-expert/

# Directory (with sync)
rsync -avz --exclude node_modules ./ tpp-vps:~/projects/seo-expert/

# Environment file
scp .env tpp-vps:~/projects/seo-expert/.env
```

### Download from VPS
```bash
# Logs
scp tpp-vps:~/projects/seo-expert/logs/*.log ./local-logs/

# Database backup
scp tpp-vps:~/backups/seo-expert-latest.sql ./backups/

# Config
scp tpp-vps:~/projects/seo-expert/.env ./.env.vps
```

---

## 🔍 Troubleshooting

### Service not responding?
```bash
# Check if running
ssh tpp-vps 'docker ps | grep seo-expert'

# Check logs for errors
vps-logs expert

# Check port
ssh tpp-vps 'ss -tuln | grep 3007'

# Restart
vps-restart expert
```

### Database connection issues?
```bash
# Test PostgreSQL
ssh tpp-vps 'pg_isready'
ssh tpp-vps 'psql -U seo_user -d seo_expert -c "SELECT 1;"'

# Test Redis
ssh tpp-vps 'redis-cli ping'

# Check connections
ssh tpp-vps 'sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"'
```

### Out of memory?
```bash
# Check memory
ssh tpp-vps 'free -h'

# Check what's using memory
ssh tpp-vps 'ps aux --sort=-%mem | head -10'

# Check Docker
ssh tpp-vps 'docker stats --no-stream'

# Restart heavy services
vps-restart all
```

### Disk space issues?
```bash
# Check disk usage
ssh tpp-vps 'df -h'

# Find large directories
ssh tpp-vps 'du -sh /* 2>/dev/null | sort -h'

# Clean Docker
ssh tpp-vps 'docker system prune -af'

# Clean logs
ssh tpp-vps 'sudo journalctl --vacuum-time=7d'
```

---

## 📈 Performance Monitoring

### Quick checks
```bash
# System load
ssh tpp-vps 'uptime'

# Memory usage
ssh tpp-vps 'free -h'

# Disk usage
ssh tpp-vps 'df -h /'

# Top processes
ssh tpp-vps 'ps aux --sort=-%mem | head -10'
```

### Advanced monitoring
```bash
# Real-time monitor
vps-monitor

# Docker stats
ssh tpp-vps 'docker stats'

# Prometheus metrics
curl http://localhost:9090/metrics

# Grafana dashboard
open http://tpp-vps:3005
```

---

## 🔐 Security

### Check SSH config
```bash
# View tpp-vps config
cat ~/.ssh/config | grep -A 10 "Host tpp-vps"

# Test connection
ssh -v tpp-vps 'echo Connected'
```

### Firewall status
```bash
# Check UFW
ssh tpp-vps 'sudo ufw status'

# Check open ports
ssh tpp-vps 'sudo ss -tuln | grep LISTEN'
```

### SSL certificates
```bash
# Check expiry
ssh tpp-vps 'sudo certbot certificates'

# Renew
ssh tpp-vps 'sudo certbot renew'
```

---

## 🎯 Common Workflows

### Deploy new version
```bash
# 1. Commit local changes
git add .
git commit -m "Update feature"
git push

# 2. Deploy to VPS
./deploy-to-tpp-vps.sh
```

### Check if everything is healthy
```bash
source vps-helpers.sh
vps-health
vps-status
```

### Update just the code
```bash
source vps-helpers.sh
vps-update
```

### View what's happening
```bash
source vps-helpers.sh
vps-logs all
vps-monitor
```

### Emergency restart
```bash
source vps-helpers.sh
vps-restart all
vps-health
```

---

## 📞 Quick Help

```bash
# Load all helper commands
source vps-helpers.sh

# Show available commands
vps-help

# Connect to VPS
vps-connect

# Shell in container
vps-shell
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `VPS-QUICK-DEPLOY.md` | 5-minute deployment guide |
| `VPS-STATUS-REPORT.md` | Complete infrastructure audit |
| `VPS_INTEGRATION_GUIDE.md` | Detailed integration guide |
| `TPP-VPS-INTEGRATION-SUMMARY.md` | Architecture overview |
| `deploy-to-tpp-vps.sh` | Automated deployment script |
| `vps-helpers.sh` | Helper command functions |
| `.claude/skills/vps/SKILL.md` | VPS skill documentation |

---

## 🆘 Emergency Contacts

**VPS Issues:**
1. Check status: `vps-status`
2. Check logs: `vps-logs all`
3. Restart services: `vps-restart all`
4. If still issues, check system resources: `vps-monitor`

**Can't SSH:**
- Check if VPS is up: `ping tpp-vps`
- Check SSH config: `cat ~/.ssh/config | grep tpp-vps`
- Try verbose SSH: `ssh -v tpp-vps`

**Service Down:**
- View logs: `vps-logs <service-name>`
- Restart: `vps-restart <service-name>`
- Check health: `vps-health`

---

**Last Updated:** October 26, 2025
**VPS:** TPP VPS (srv982719)
**Services:** SerpBear, SEO Analyst, SEO Expert
**Status:** 🟢 Production Ready

---

**💡 Pro Tip:** Add this to your shell profile for quick access:
```bash
alias vps='source ~/projects/seo-expert/vps-helpers.sh'
```

Then just type `vps-health`, `vps-logs expert`, etc. from anywhere!
