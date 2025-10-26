# 🎯 VPS Commands - Quick Reference

**All the commands you need in one place!**

---

## 🚀 Deployment Commands

### Using NPM Scripts (Easiest)
```bash
npm run vps:deploy     # Full deployment
npm run vps:update     # Quick update
npm run vps:health     # Health check
npm run vps:logs       # View logs
npm run vps:status     # Container status
npm run vps:restart    # Restart service
npm run vps:connect    # SSH to VPS
```

### Using Deployment Script
```bash
./deploy-to-tpp-vps.sh              # Automated deployment
```

### Using Helper Commands
```bash
source vps-helpers.sh               # Load helpers

vps-deploy                          # Full deployment
vps-update                          # Quick update
vps-health                          # Health check
vps-status                          # System status
vps-logs expert                     # View logs
vps-restart expert                  # Restart service
```

---

## 🏥 Health & Monitoring

### Check All Services
```bash
# NPM
npm run vps:health

# Helper
source vps-helpers.sh && vps-health

# Manual
ssh tpp-vps << 'EOF'
  curl -sf http://localhost:3006/api/domains > /dev/null && echo "✓ SerpBear" || echo "✗ SerpBear"
  curl -sf http://localhost:5002/health > /dev/null && echo "✓ SEO Analyst" || echo "✗ SEO Analyst"
  curl -sf http://localhost:3007/health > /dev/null && echo "✓ SEO Expert" || echo "✗ SEO Expert"
EOF
```

### System Status
```bash
# Helper
source vps-helpers.sh && vps-status

# Manual
ssh tpp-vps 'uptime && free -h && df -h / && docker ps'
```

### Real-time Monitoring
```bash
source vps-helpers.sh && vps-monitor
```

---

## 📋 View Logs

### NPM Scripts
```bash
npm run vps:logs                    # SEO Expert logs (last 50 lines)
```

### Helper Commands
```bash
source vps-helpers.sh

vps-logs expert                     # SEO Expert logs
vps-logs serpbear                   # SerpBear logs
vps-logs analyst                    # SEO Analyst logs
vps-logs all                        # All service logs
```

### Manual Commands
```bash
# SEO Expert
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose logs -f'

# SerpBear
ssh tpp-vps 'docker logs serpbear-production -f'

# SEO Analyst
ssh tpp-vps 'journalctl -u seo-analyst.service -f'

# Nginx
ssh tpp-vps 'sudo tail -f /var/log/nginx/error.log'
```

---

## 🔄 Restart Services

### NPM Scripts
```bash
npm run vps:restart                 # Restart SEO Expert
```

### Helper Commands
```bash
source vps-helpers.sh

vps-restart expert                  # Restart SEO Expert
vps-restart serpbear                # Restart SerpBear
vps-restart analyst                 # Restart SEO Analyst
vps-restart all                     # Restart all services
```

### Manual Commands
```bash
# SEO Expert
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose restart'

# SerpBear
ssh tpp-vps 'docker restart serpbear-production'

# SEO Analyst
ssh tpp-vps 'sudo systemctl restart seo-analyst.service'

# Nginx
ssh tpp-vps 'sudo systemctl restart nginx'
```

---

## 📊 Container Management

### Check Status
```bash
npm run vps:status

# Or manual
ssh tpp-vps 'docker ps -a'
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose ps'
```

### View Stats
```bash
ssh tpp-vps 'docker stats --no-stream'
```

### Stop/Start
```bash
# Stop
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose down'

# Start
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose up -d'

# Restart
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose restart'
```

---

## 💾 Database Operations

### Backup
```bash
source vps-helpers.sh && vps-db-backup

# Or manual
ssh tpp-vps 'pg_dump -U seo_user seo_expert > ~/backups/backup-$(date +%Y%m%d).sql'
```

### Connect
```bash
source vps-helpers.sh && vps-db-connect

# Or manual
ssh tpp-vps 'psql -U seo_user -d seo_expert'
```

### Check Size
```bash
ssh tpp-vps 'sudo -u postgres psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"'
```

### Test Connection
```bash
ssh tpp-vps 'pg_isready && psql -U seo_user -d seo_expert -c "SELECT 1;"'
```

---

## 🔍 Debugging

### Check Errors in Logs
```bash
npm run vps:logs | grep -i error
```

### Check Port Usage
```bash
ssh tpp-vps 'ss -tuln | grep -E "3006|3007|5002"'
```

### Check Resource Usage
```bash
ssh tpp-vps 'free -h && df -h && ps aux --sort=-%mem | head -10'
```

### Check Service Status
```bash
ssh tpp-vps 'systemctl status nginx seo-analyst postgresql@16-main redis-server'
```

---

## 📤 File Transfer

### Upload to VPS
```bash
# Single file
scp file.txt tpp-vps:~/projects/seo-expert/

# Directory
rsync -avz --exclude node_modules ./ tpp-vps:~/projects/seo-expert/

# Environment file
scp .env tpp-vps:~/projects/seo-expert/.env
```

### Download from VPS
```bash
# Logs
scp tpp-vps:~/projects/seo-expert/logs/*.log ./local-logs/

# Database backup
scp tpp-vps:~/backups/backup-*.sql ./backups/

# Config
scp tpp-vps:~/projects/seo-expert/.env ./.env.vps
```

---

## 🧪 Testing

### Run Integration Tests
```bash
./test-vps-integration.sh           # Full test suite
```

### Test Connection
```bash
ssh tpp-vps 'echo "✓ Connected"'
```

### Test Health Endpoints
```bash
ssh tpp-vps << 'EOF'
  curl -sf http://localhost:3006/api/domains && echo "✓ SerpBear"
  curl -sf http://localhost:5002/health && echo "✓ SEO Analyst"
  curl -sf http://localhost:3007/health && echo "✓ SEO Expert"
EOF
```

---

## 🔧 Maintenance

### Update Code
```bash
npm run vps:update

# Or manual
ssh tpp-vps 'cd ~/projects/seo-expert && git pull && npm ci && docker-compose restart'
```

### Clean Docker
```bash
ssh tpp-vps 'docker system prune -af'
```

### Clean Logs
```bash
ssh tpp-vps 'sudo journalctl --vacuum-time=7d'
```

### Check Disk Space
```bash
ssh tpp-vps 'df -h && du -sh /var/log/* /var/lib/docker/* | sort -h'
```

---

## 🌐 Nginx

### Test Config
```bash
ssh tpp-vps 'sudo nginx -t'
```

### Reload Config
```bash
ssh tpp-vps 'sudo nginx -t && sudo systemctl reload nginx'
```

### View Error Log
```bash
ssh tpp-vps 'sudo tail -f /var/log/nginx/error.log'
```

### Check SSL
```bash
ssh tpp-vps 'sudo certbot certificates'
```

---

## 📈 Performance

### Monitor Resources
```bash
source vps-helpers.sh && vps-monitor
```

### Check Load
```bash
ssh tpp-vps 'uptime && top -bn1 | head -20'
```

### Memory Usage
```bash
ssh tpp-vps 'free -h && ps aux --sort=-%mem | head -10'
```

### Docker Stats
```bash
ssh tpp-vps 'docker stats --no-stream'
```

---

## 🔑 SSH & Access

### Connect
```bash
npm run vps:connect

# Or
ssh tpp-vps

# Or
source vps-helpers.sh && vps-connect
```

### Shell in Container
```bash
source vps-helpers.sh && vps-shell

# Or manual
ssh tpp-vps 'cd ~/projects/seo-expert && docker-compose exec seo-expert sh'
```

### Run Command
```bash
ssh tpp-vps 'command-here'
```

---

## 📚 Documentation

### View Guides
```bash
cat README-VPS-INTEGRATION.md       # Overview
cat START-VPS-DEPLOYMENT.md         # Quick start
cat VPS-REFERENCE-CARD.md           # Daily operations
cat VPS-STATUS-REPORT.md            # Infrastructure details
cat DEPLOYMENT-CHECKLIST.md         # Deployment checklist
```

### Get Help
```bash
source vps-helpers.sh && vps-help
```

---

## 🎯 Common Workflows

### Deploy New Version
```bash
git add . && git commit -m "Update" && git push
npm run vps:deploy
```

### Quick Update
```bash
npm run vps:update
npm run vps:health
```

### Check Everything
```bash
source vps-helpers.sh
vps-health
vps-status
vps-logs all | tail -50
```

### Emergency Restart
```bash
npm run vps:restart
sleep 5
npm run vps:health
```

### Full Status Check
```bash
./test-vps-integration.sh
```

---

## 💡 Pro Tips

### Add to Shell Profile
```bash
# Add to ~/.bashrc or ~/.zshrc
alias vps='source ~/projects/seo-expert/vps-helpers.sh'
alias vps-deploy='~/projects/seo-expert/deploy-to-tpp-vps.sh'

# Then use:
vps-health
vps-logs expert
vps-update
```

### Quick Aliases
```bash
alias vh='npm run vps:health'
alias vl='npm run vps:logs'
alias vr='npm run vps:restart'
alias vu='npm run vps:update'
```

---

## 🚨 Emergency Commands

### Service Down
```bash
npm run vps:logs | grep -i error
npm run vps:restart
npm run vps:health
```

### Out of Memory
```bash
ssh tpp-vps 'docker system prune -af && sudo systemctl restart docker'
npm run vps:restart
```

### Database Issues
```bash
ssh tpp-vps 'pg_isready && sudo systemctl restart postgresql@16-main'
```

### Port Conflicts
```bash
ssh tpp-vps 'ss -tuln | grep 3007 && docker ps -a'
```

---

**🔖 Bookmark this page for quick command reference!**

**Most Common:**
- Deploy: `npm run vps:deploy`
- Update: `npm run vps:update`
- Health: `npm run vps:health`
- Logs: `npm run vps:logs`
- Restart: `npm run vps:restart`
