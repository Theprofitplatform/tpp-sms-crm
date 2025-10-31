# SEO Expert Platform - Deployment Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT TARGETS                            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Docker VPS    │    │   TPP VPS        │    │  Cloudflare Pages   │
│ 31.97.222.218   │    │  (PM2 Process)   │    │    (Reports)        │
│                 │    │  tpp-vps host    │    │                     │
│ docker-compose  │    │                  │    │ baa93e95.seo-...    │
│ PostgreSQL      │    │ npm/Node.js PM2  │    │ pages.dev           │
│ Dashboard       │    │ SQLite/Postgres  │    │                     │
└────────┬────────┘    └────────┬─────────┘    └──────────┬──────────┘
         │                      │                         │
         └──────────────────────┼─────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │  GitHub Actions Workflows     │
                │  (deploy-production.yml)      │
                │  (deploy-tpp-vps.yml)        │
                │  (docker-build.yml)          │
                └───────────────┬───────────────┘
                                │
                    ┌───────────┴────────────┐
                    │  On: Push to main or   │
                    │  Manual workflow_      │
                    │  dispatch              │
                    └────────────────────────┘
```

---

## Docker VPS Deployment (Main - 31.97.222.218)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Environment                           │
│                  /home/avi/seo-automation                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ docker-compose.prod.yml Orchestration                                │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │  External Access                                                │  │
│ │  Port 9000 → Cloudflare Tunnel                                 │  │
│ └────────┬───────────────────────────────────────────────────────┘  │
│          │                                                            │
│ ┌────────┴────────────────────────────────────────────────────────┐  │
│ │ cloudflared (Cloudflare Tunnel Container)                       │  │
│ │ ├─ Token: $CLOUDFLARE_TUNNEL_TOKEN                             │  │
│ │ ├─ Command: tunnel --no-autoupdate run                         │  │
│ │ ├─ Resources: 0.5 CPU, 128MB RAM                               │  │
│ │ └─ Health: Keeps connection to Cloudflare                      │  │
│ └────────┬────────────────────────────────────────────────────────┘  │
│          │                                                            │
│ ┌────────┴──────────────────────────────────────────────────────┐   │
│ │ dashboard (Main Application Container)                        │   │
│ ├─ Image: Built from Dockerfile.dashboard                       │   │
│ ├─ Port: 9000 (internal)                                        │   │
│ ├─ Entry: npm start → dashboard-server.js                       │   │
│ ├─ Env:                                                         │   │
│ │  • NODE_ENV=production                                        │   │
│ │  • DATABASE_URL=postgresql://...                              │   │
│ │  • PORT=9000                                                  │   │
│ ├─ Volumes:                                                     │   │
│ │  • ./logs:/app/logs                                          │   │
│ │  • ./database:/app/database                                  │   │
│ │  • serpbear_data:/app/serpbear/data                          │   │
│ │  • keyword_service_data:/app/keyword-service                 │   │
│ ├─ Health: HTTP GET /api/v2/health (30s interval)              │   │
│ │          timeout 10s, retries 3                              │   │
│ ├─ Resources: 2.0 CPU limit, 1GB memory                         │   │
│ └─ Depends: postgres (healthy), keyword-service (started)       │   │
│                                                                  │   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ postgres (Database Container)                                 │   │
│ ├─ Image: postgres:15-alpine                                    │   │
│ ├─ Port: 5432 (internal)                                        │   │
│ ├─ Env:                                                         │   │
│ │  • POSTGRES_DB=seo_unified_prod                               │   │
│ │  • POSTGRES_USER=seo_user                                     │   │
│ │  • POSTGRES_PASSWORD=(from .env)                              │   │
│ ├─ Volume: postgres_data:/var/lib/postgresql/data               │   │
│ ├─ Init: ./database/postgresql-schema.sql                       │   │
│ ├─ Health: pg_isready (10s interval, 5 retries)                 │   │
│ └─ Resources: 1.0 CPU limit, 1GB memory                         │   │
│                                                                  │   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ keyword-service (Keyword Tracking Container)                  │   │
│ ├─ Image: Built from keyword-service/Dockerfile (Python)        │   │
│ ├─ Port: 5000 (internal)                                        │   │
│ ├─ Type: Flask-based microservice                               │   │
│ ├─ Command: tail -f /dev/null (runs as CLI tool)                │   │
│ ├─ Volume: keyword_service_data:/app/data                       │   │
│ └─ Resources: 1.0 CPU limit, 512MB memory                       │   │
│                                                                  │   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ sync-service (DISABLED - SQLite Issues)                       │   │
│ ├─ Purpose: Bidirectional data sync                             │   │
│ ├─ Profile: with-sync                                           │   │
│ ├─ Status: Disabled in production, enable when fixed            │   │
│ └─ Alternative: API-based sync via dashboard                    │   │
│                                                                  │   │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ watchdog (Health Monitoring - Optional Profile)               │   │
│ ├─ Image: alpine:latest with docker-cli                         │   │
│ ├─ Purpose: Automatic container recovery                        │   │
│ ├─ Check: Health endpoint every 5 minutes                       │   │
│ ├─ Action: Auto-restart dashboard on failure                    │   │
│ ├─ Volume: /var/run/docker.sock:/var/run/docker.sock            │   │
│ ├─ Profile: with-watchdog                                       │   │
│ └─ Resources: 0.1 CPU limit, 64MB memory                        │   │
└──────────────────────────────────────────────────────────────────────┘

Storage & Persistence:
┌────────────────────────────────────────────────────────────────────┐
│ Named Volumes (Docker Managed)                                      │
├─ postgres_data        → /var/lib/docker/volumes/.../data            │
├─ serpbear_data        → SerpBear rank tracking database             │
└─ keyword_service_data → Keyword tracking database                   │
├─ Backups: /home/avi/seo-automation/backups/
│           ├─ db_backup_YYYYMMDD_HHMMSS.sql (7 kept)
│           └─ Retention: Last 7 PostgreSQL backups
└────────────────────────────────────────────────────────────────────┘
```

---

## TPP VPS Deployment (PM2-based)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TPP VPS Environment (tpp-vps)                    │
│                  ~/projects/seo-expert (PM2)                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Process Management via PM2                                           │
│                                                                      │
│ PM2 Process: seo-expert                                             │
│ ├─ Script: dashboard-server.js                                      │
│ ├─ Port: 3000 (HTTP)                                               │
│ ├─ Mode: Single instance or cluster                                 │
│ ├─ Env:                                                             │
│ │  • NODE_ENV=production                                            │
│ │  • PORT=3000                                                      │
│ │  • WordPress credentials (IAT, HotTyres, SADC)                   │
│ │  • API keys (Anthropic, OpenAI)                                   │
│ │  • SerpBear integration                                           │
│ ├─ Logs:                                                            │
│ │  • Stdout: ~/.pm2/logs/seo-expert-out.log                       │
│ │  • Stderr: ~/.pm2/logs/seo-expert-error.log                     │
│ ├─ Auto-restart: On crash (PM2 restart daemon)                     │
│ └─ Monitoring: pm2 monit, pm2 status, pm2 logs                     │
│                                                                      │
│ Integrated Services:                                                │
│ ├─ SerpBear (Port 3006) - Rank tracking                            │
│ ├─ SEO Analyst (Port 5002) - Analysis engine                       │
│ └─ Keyword Service (Port 5000) - Tracking                          │
│                                                                      │
│ Network:                                                            │
│ └─ Cloudflare Tunnel: seodashboard.theprofitplatform.com.au          │
│                                                                      │
│ File Structure:                                                     │
│ ├─ Current deployment: ~/projects/seo-expert                       │
│ ├─ Backup on deploy: ~/projects/seo-expert-backup                 │
│ ├─ Database: SQLite (legacy) or PostgreSQL                         │
│ │  └─ Location: ./database/seo-expert.db or pg connection          │
│ └─ Backups: ~/backups/seo-expert/                                 │
│    ├─ Full backups: backup-YYYYMMDD-HHMMSS.tar.gz (5 kept)        │
│    └─ DB backups: seo-expert-YYYYMMDD-HHMMSS.db (10 kept)         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow Pipeline                        │
│             (Triggered: Push to main or manual)                     │
└─────────────────────────────────────────────────────────────────────┘

Event: git push origin main
   │
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Job 1: TEST (runs-on: ubuntu-latest)                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Step 1: Checkout code (actions/checkout@v4)                         │
│ Step 2: Setup Node.js 20 (actions/setup-node@v4)                    │
│ Step 3: npm ci (Clean install, respect package-lock)                │
│ Step 4: npm test (Run unit/integration tests)                       │
│ Step 5: Upload test coverage (artifacts)                            │
│                                                                       │
│ Outcome: Success → Continue to DEPLOY                               │
│          Failure → Stop pipeline, notify via Discord                │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Job 2: DEPLOY (runs-on: ubuntu-latest) [needs: test]                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Step 1: Setup SSH (webfactory/ssh-agent@v0.9.0)                     │
│         └─ Use: secrets.VPS_SSH_KEY or TPP_VPS_SSH_KEY              │
│                                                                       │
│ Step 2: Add VPS to known_hosts (ssh-keyscan)                        │
│         └─ Host: secrets.VPS_HOST or TPP_VPS_HOST                   │
│                                                                       │
│ Step 3: Create deployment archive (tar.gz)                          │
│         Excludes: .git, node_modules, _archive, logs, etc.          │
│                                                                       │
│ Step 4: Upload to VPS via SCP                                       │
│         └─ Destination: /tmp/deploy.tar.gz                          │
│                                                                       │
│ Step 5: SSH Deploy Script (Main Logic)                              │
│         ├─ Create backups                                            │
│         ├─ Extract new code                                          │
│         ├─ Copy/update .env                                          │
│         ├─ Configure Cloudflare token                                │
│         ├─ Stop containers (docker compose down)                     │
│         ├─ Build React dashboard (npm run build)                     │
│         ├─ Start postgres first (database)                           │
│         ├─ Wait for database ready (sleep 10)                        │
│         ├─ Backup current DB (pg_dump)                               │
│         ├─ Run migrations (SQL schema)                               │
│         ├─ Start all services with --profile with-cloudflare         │
│         ├─ Wait for services (sleep 10)                              │
│         ├─ Health check: curl /api/v2/health                         │
│         ├─ Cleanup old images (docker image prune)                   │
│         └─ Return status to GitHub                                   │
│                                                                       │
│ Step 6: Verify deployment (Health check)                            │
│         ├─ docker compose ps                                         │
│         └─ curl /api/v2/health | jq                                  │
│                                                                       │
│ Step 7: Discord Notification                                        │
│         ├─ On Success: Green embed with commit info                 │
│         └─ On Failure: Red embed with logs link                     │
│                                                                       │
│ Outcome: Success → Deployment complete                              │
│          Failure → Trigger manual rollback                          │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Job 3: ROLLBACK (Manual trigger only)                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ if: github.event_name == 'workflow_dispatch'                        │
│                                                                       │
│ Prerequisite: Must have previous backup available                   │
│                                                                       │
│ Steps:                                                               │
│ 1. Setup SSH connection                                              │
│ 2. Check backup exists                                               │
│ 3. Stop current containers                                           │
│ 4. Restore from backup directory                                     │
│ 5. Restart containers                                                │
│ 6. Health verification                                               │
│                                                                       │
│ Outcome: Revert to previous known-good state                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## CI/CD Environment & Secrets

```
┌─────────────────────────────────────────────────────────────────────┐
│ GitHub Secrets Configuration                                         │
│ (Settings → Secrets and variables → Actions)                        │
└─────────────────────────────────────────────────────────────────────┘

DEPLOYMENT SECRETS:
├─ VPS_HOST               = 31.97.222.218
├─ VPS_USER               = avi
├─ VPS_SSH_KEY            = -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----
├─ TPP_VPS_HOST           = (TPP server hostname)
├─ TPP_VPS_USER           = (SSH user)
└─ TPP_VPS_SSH_KEY        = (Private SSH key)

API & SERVICE SECRETS:
├─ ANTHROPIC_API_KEY      = sk-ant-...
├─ OPENAI_API_KEY         = sk-...
├─ CLOUDFLARE_API_TOKEN   = (API token from Cloudflare dashboard)
├─ CLOUDFLARE_TUNNEL_TOKEN = eyJhIjoiY2xvdWRmbGFyZSI...
└─ NPM_TOKEN              = npm_... (if using private npm registry)

CREDENTIALS:
├─ IAT_WP_USER            = (WordPress user)
├─ IAT_WP_PASSWORD        = (App password)
├─ HOTTYRES_WP_USER       = (WordPress user)
├─ HOTTYRES_WP_PASSWORD   = (App password)
├─ SADC_WP_USER           = (WordPress user)
└─ SADC_WP_PASSWORD       = (App password)

INTEGRATIONS:
├─ GSC_SERVICE_ACCOUNT    = (JSON service account - base64 or literal)
├─ DISCORD_WEBHOOK_URL    = https://discord.com/api/webhooks/...
├─ RESEND_API_KEY         = re_... (Email service)
└─ GITHUB_TOKEN           = (Auto-provided by GitHub)
```

---

## Data Flow & Communication

```
User Request:
  │
  ▼
┌──────────────────────────────┐
│ External Domain             │
│ seo-expert.                 │
│ theprofitplatform.com.au    │
│ (HTTPS)                     │
└────────────┬────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Cloudflare DNS + Security         │
│ (Zero Trust Access)               │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Cloudflare Tunnel (cloudflared)   │
│ Secure tunnel connection          │
│ No open ports exposed             │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ VPS Internal Port 9000            │
│ dashboard-server.js               │
│ (Express HTTP server)             │
└────────────┬─────────────────────┘
             │
     ┌───────┼───────┐
     │       │       │
     ▼       ▼       ▼
┌────────┐ ┌────┐ ┌──────┐
│PostgreSQL│ │Files │ │Ext APIs│
│Database  │ │Logs  │ │Services│
└──────────┘ └────┘ └──────┘
```

---

## Deployment Timeline

```
0s   ├─ Push to main / Manual trigger
     │
5s   ├─ GitHub Actions starts TEST job
     ├─ Checkout code
     ├─ Setup Node.js
     │
15s  ├─ npm ci
     ├─ npm test (30-60s depending on test suite)
     │
80s  ├─ Tests complete (success/failure)
     ├─ If failed: Stop here, notify Discord
     ├─ If success: Start DEPLOY job
     │
90s  ├─ DEPLOY job starts
     ├─ SSH setup, archive creation
     │
120s ├─ SCP file to VPS (~10-30s depending on size)
     │
150s ├─ SSH deployment script begins
     ├─ Backup current deployment
     ├─ Extract new code
     ├─ Build React dashboard (npm run build: 30-60s)
     │
240s ├─ Docker: Stop old containers
     ├─ Docker: Start postgres
     ├─ Wait for database (10s)
     │
260s ├─ Database backup + migrations
     ├─ Docker: Start all services
     ├─ Wait for services (10s)
     │
280s ├─ Health checks
     ├─ Discord notification
     │
300s ├─ DEPLOY job complete
     │
Total: ~5 minutes from push to live
```

---

## Monitoring & Observability

```
Health Checks:
├─ Endpoint: GET /api/v2/health
├─ Interval: 30 seconds (Docker), 5 minutes (Watchdog)
├─ Timeout: 10 seconds
├─ Retries: 3 failures before restart
└─ Expected: { status: "healthy", ... }

Logs:
├─ Docker: docker logs <container_name>
├─ VPS PM2: pm2 logs seo-expert
├─ File: ~/.pm2/logs/seo-expert-*.log
├─ GitHub: Actions → Workflow run → Logs
└─ Cloudflare: Dashboard → Logs

Alerts & Notifications:
├─ Discord: Deployment success/failure
├─ Daily Summary: 8 AM UTC (daily-health-summary.yml)
├─ Health Monitor: Continuous checks (health-monitor.yml)
└─ Email: Critical issues via notification service

Metrics & Monitoring:
├─ CPU/Memory: docker stats, PM2 monitoring
├─ Database: pg_stat_activity, query logs
├─ API Response: dashboard metrics endpoint
└─ Uptime: 24/7 watchdog service (with-watchdog profile)
```

---

## Backup & Disaster Recovery

```
Backup Strategy:
┌──────────────────────────────────┐
│ Pre-Deployment Backups           │
├──────────────────────────────────┤
│ 1. Current code (tar.gz)         │
│    Location: /deployments/backup │
│    Retention: 1 per deployment   │
│                                  │
│ 2. Database (pg_dump)            │
│    Location: /backups/           │
│    Retention: Last 7 backups     │
│    Frequency: Before each deploy │
│                                  │
│ 3. Full archive (tar.gz)         │
│    Location: ~/backups/          │
│    Retention: Last 5 backups     │
│    Size: ~100-500MB              │
└──────────────────────────────────┘

Recovery Procedure:
1. Identify issue & confirm need for rollback
2. GitHub Actions → Workflows → Select deployment workflow
3. "Run workflow" → Choose "Rollback" job (manual)
4. Approve and wait for completion (~2 minutes)
5. Verify health endpoints responding
6. Check logs for any errors
7. Notify team of rollback

Manual Recovery (Emergency):
$ ssh tpp-vps
$ cd ~/projects/seo-expert
$ git log --oneline (identify good commit)
$ git reset --hard <commit-sha>
$ pm2 restart seo-expert
$ pm2 logs seo-expert (verify startup)
```

---

## Scaling & Performance

```
Current Configuration:
├─ Vertical Scaling:
│  ├─ Dashboard: 2.0 CPU, 1GB RAM
│  ├─ PostgreSQL: 1.0 CPU, 1GB RAM
│  ├─ Keyword Service: 1.0 CPU, 512MB RAM
│  └─ Total: 4.0 CPU, 2.5GB RAM
│
├─ Database:
│  ├─ Type: PostgreSQL 15
│  ├─ Connections: Pooled via app
│  ├─ Max size: Configurable
│  └─ Backup: Automated pre-deploy
│
└─ Future Improvements:
   ├─ Multi-instance dashboard (PM2 cluster mode)
   ├─ Database read replicas
   ├─ Redis caching layer
   ├─ CDN for static assets (Cloudflare)
   └─ Load balancer (if multi-server)
```

---

## See Also
- DEPLOYMENT_INFRASTRUCTURE_SUMMARY.md (Comprehensive guide)
- DEPLOYMENT_QUICK_START.md (Quick reference)
- deployment/production/DEPLOYMENT_GUIDE.md (Setup instructions)
