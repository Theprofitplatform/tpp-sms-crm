# SEO Expert Platform - Deployment Infrastructure Summary

## Project Overview
A comprehensive SEO automation platform with email marketing, lead generation, and client management capabilities. Multi-client system with real-time monitoring, analytics, and AI-powered optimizations.

### Tech Stack
- **Frontend**: React with shadcn/ui and Tailwind CSS
- **Backend**: Node.js with Express
- **Databases**: PostgreSQL (production), SQLite (legacy components)
- **Containerization**: Docker & Docker Compose
- **Runtime**: Node.js 20+ 
- **Process Manager**: PM2 (VPS deployments)

---

## DEPLOYMENT ARCHITECTURE

### 1. MULTIPLE DEPLOYMENT TARGETS

#### VPS Deployments (Primary)
- **TPP VPS** (The Profit Platform): Main production server
  - Hostname: `tpp-vps`
  - Deployment Directory: `~/projects/seo-expert`
  - Service Port: 3000-3007 (various services)
  - Process Manager: PM2
  - Domain: `seodashboard.theprofitplatform.com.au`

- **Generic VPS** (31.97.222.218): Docker-based deployment
  - Deployment Directory: `/home/avi/seo-automation`
  - Service Port: 9000 (dashboard)
  - Process Manager: Docker Compose
  - Database: PostgreSQL in Docker

#### Cloudflare Pages
- **Reports Website**: https://baa93e95.seo-reports-4d9.pages.dev
- **Tunnel Configuration**: Cloudflare Tunnel for secure access
- **DNS Management**: Cloudflare for domain routing

---

## DEPLOYMENT INFRASTRUCTURE

### Docker Configuration Files
```
ROOT LEVEL:
├── Dockerfile              - Multi-stage production image (Node 20 Alpine)
├── Dockerfile.dashboard    - Dashboard-specific build
├── docker-compose.yml      - Base service definitions
├── docker-compose.dev.yml  - Development overrides
├── docker-compose.prod.yml - Production orchestration (Primary)
├── docker-compose.dashboard.yml - Dashboard-only setup
├── docker-compose.react-dashboard.yml - React frontend setup

SUBDIRECTORIES:
├── serpbear/
│   └── docker-compose.prod.yml - Rank tracking service
├── keyword-service/
│   ├── Dockerfile - Python service for keyword tracking
│   └── docker-compose.yml
└── dashboard/
    └── Dockerfile - React app production build
```

### Docker Production Orchestration (docker-compose.prod.yml)
Containers managed:
1. **postgres** - PostgreSQL 15 Alpine (5432)
   - Volume: `postgres_data:/var/lib/postgresql/data`
   - Health: pg_isready checks
   - Resources: 1.0 CPU limit, 1GB memory

2. **dashboard** - Main Node.js/Express app (9000)
   - Built from Dockerfile.dashboard
   - Database: PostgreSQL connection
   - Health: HTTP endpoint checks at `/api/v2/health`
   - Resources: 2.0 CPU, 1GB memory

3. **keyword-service** - Python CLI tool (5000)
   - Flask-based keyword tracking
   - Resources: 1.0 CPU, 512MB memory

4. **sync-service** - Bidirectional data sync
   - Status: Currently disabled (SQLite issues)
   - Profile: `with-sync` (enable when fixed)

5. **cloudflared** - Cloudflare Tunnel container
   - Replaces traditional Nginx reverse proxy
   - Token-based authentication
   - Profile: `with-cloudflare`
   - Resources: 0.5 CPU, 128MB memory

6. **watchdog** - Health monitoring & auto-recovery
   - Alpine Linux with Docker socket access
   - Checks dashboard health every 5 minutes
   - Auto-restarts on failure
   - Profile: `with-watchdog`

### Dockerfile Structure (Multi-Stage)
```dockerfile
Stage 1: base          - Node 20 Alpine + basic deps
Stage 2: dependencies  - Production npm install
Stage 3: development   - Dev dependencies
Stage 4: production    - Final optimized image
- Non-root user (seouser:1001)
- Healthcheck: /bin/sh -c based
- Health interval: 30s, timeout: 10s
- Image size optimized: ~500MB
```

---

## CI/CD PIPELINE (GitHub Actions)

### Workflow Files Location
`.github/workflows/` - 27 workflow files

#### Primary Deployment Workflows

1. **deploy-production.yml** - Main VPS Deployment
   - Trigger: Push to main branch or manual dispatch
   - Jobs:
     - test: Unit tests (npm test)
     - deploy: SSH deployment with Docker Compose
     - rollback: Manual database rollback support
   - Features:
     - Creates tar.gz archive (excludes: git, node_modules, _archive)
     - Backup system (keeps 7 database snapshots)
     - Health checks before/after deployment
     - Discord notifications on success/failure
   - Deployment Flow:
     1. Create backup of current deployment
     2. Extract new code to `current` directory
     3. Copy/update `.env` file
     4. Update Cloudflare tunnel token
     5. Stop existing containers
     6. Build React dashboard
     7. Start PostgreSQL
     8. Backup database
     9. Run migrations
     10. Start all services with Cloudflare profile
     11. Health check API endpoint

2. **deploy-tpp-vps.yml** - TPP VPS (PM2-based)
   - Trigger: Push to main or manual dispatch
   - VPS Connection: SSH with key auth
   - Deployment Strategy:
     - Create full backup (tar.gz, keeps last 5)
     - Git fetch and hard reset to origin/main
     - npm ci with --omit=dev
     - Database backup if SQLite exists
     - PM2 restart or start new process
     - Health checks via HTTP endpoints
   - Features:
     - Service integration status display
     - SerpBear (3006), SEO Analyst (5002) integration checks
     - Discord rich embed notifications

3. **docker-build.yml** - Docker Image Registry
   - Registry: GitHub Container Registry (ghcr.io)
   - Platforms: linux/amd64, linux/arm64
   - Tags: branch, PR, SHA, latest
   - Trivy scanning: Commented out (needs fixing)
   - Cache: GitHub Actions cache

#### Automation & Monitoring Workflows

4. **enhanced-seo-automation.yml** - Scheduled SEO tasks
   - Schedule: Multiple times per day
   - Tasks: Rank tracking, local SEO, auto-fix operations

5. **weekly-seo-automation.yml** - Weekly comprehensive automation
   - Competitor analysis
   - Historical data tracking

6. **daily-health-summary.yml** - Daily reporting
   - Schedule: 8:00 AM UTC daily
   - Sends email summary of system status

7. **health-monitor.yml** - Continuous health checks
   - Periodic API health checks
   - Database connectivity tests
   - Container status monitoring

8. **check-service-status.yml** - Service availability
9. **diagnose-containers.yml** - Container diagnostics
10. **restart-services.yml** - Service restart triggers
11. **restart-cloudflared.yml** - Cloudflare tunnel restart
12. **full-restart.yml** - Complete system restart
13. **enable-watchdog.yml** - Activate health watchdog
14. **restart-with-watchdog.yml** - Restart with monitoring

#### Infrastructure Management

15. **update-cloudflare-tunnel.yml** - Tunnel token updates
16. **sync-docs-to-vps.yml** - Documentation deployment
17. **setup-deploy-script.yml** - Deploy script installation
18. **stop-sync-service.yml** - Disable sync service

#### Testing & Quality

19. **test.yml** - Unit & integration tests
20. **lint.yml** - Code linting (ESLint)
21. **code-quality.yml** - Code quality analysis
22. **coverage.yml** - Test coverage reporting

#### Other

23. **deploy-latest.yml** - Deploy latest built images
24. **release.yml** - GitHub release automation
25. **check-dashboard-files.yml** - Dashboard asset verification
26. **dependabot.yml** - Dependency updates

---

## ENVIRONMENT CONFIGURATION

### Environment Variables Structure

#### Main .env File
Located: Root directory
Managed by: Git (tracked file with secrets masked)

**Key Variables** (from .env.example):
```
# Core
NODE_ENV=production
PORT=3000

# WordPress Integration (Multi-client)
IAT_WP_USER, IAT_WP_PASSWORD      # Instant Auto Traders
HOTTYRES_WP_USER, HOTTYRES_WP_PASSWORD  # Hot Tyres
SADC_WP_USER, SADC_WP_PASSWORD    # SADC Disability Services
TPP_WP_USER, TPP_WP_PASSWORD      # The Profit Platform (optional)

# AI APIs
ANTHROPIC_API_KEY                  # Claude API
OPENAI_API_KEY                     # OpenAI API

# Rank Tracking
SERPBEAR_URL=https://serpbear.theprofitplatform.com.au
SERPBEAR_TOKEN                     # Auth token

# Google Search Console
GSC_SERVICE_ACCOUNT                # JSON path (config/google/service-account.json)

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER, SMTP_PASS              # App password
FROM_EMAIL, REPLY_TO_EMAIL
COMPANY_ADDRESS, COMPANY_CITY, COMPANY_STATE, COMPANY_ZIP

# Dashboard
DASHBOARD_URL=http://localhost:3000
JWT_SECRET                         # Security token
DATABASE_PATH=./data/seo-automation.db

# Production (PostgreSQL)
POSTGRES_DB=seo_unified_prod
POSTGRES_USER=seo_user
POSTGRES_PASSWORD                  # Change in production

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN           # Secure tunnel access

# Automation Schedules (cron format)
RANK_TRACKING_SCHEDULE=0 6 * * *
LOCAL_SEO_SCHEDULE=0 7 * * *
EMAIL_QUEUE_SCHEDULE=*/15 * * * *

# Feature Flags
RANK_TRACKING_ENABLED=true
LOCAL_SEO_ENABLED=true
LOCAL_SEO_AUTO_FIX=true
ENABLE_AUTO_SYNC=true

# Discord Notifications
DISCORD_WEBHOOK_URL
DISCORD_NOTIFICATIONS_ENABLED=true
```

#### Production .env.production.example
```
DATABASE_URL=postgresql://seo_user:PASSWORD@postgres:5432/seo_unified_prod
SYNC_INTERVAL=*/5 * * * *
ENABLE_AUTO_SYNC=true
LOG_LEVEL=info
RATE_LIMIT=60
MAX_SYNC_BATCH_SIZE=1000
```

### GitHub Secrets (for CI/CD)
```
# VPS Access
VPS_HOST=31.97.222.218
VPS_USER=avi
VPS_SSH_KEY                        # Private key for SSH auth

TPP_VPS_HOST                       # Alternative VPS host
TPP_VPS_USER                       # SSH user
TPP_VPS_SSH_KEY                    # SSH authentication

# API Keys
ANTHROPIC_API_KEY
OPENAI_API_KEY
CLOUDFLARE_API_TOKEN
CLOUDFLARE_TUNNEL_TOKEN            # Deployed to VPS
NPM_TOKEN                          # Registry access

# WordPress Credentials
IAT_WP_USER, IAT_WP_PASSWORD
HOTTYRES_WP_USER, HOTTYRES_WP_PASSWORD
SADC_WP_USER, SADC_WP_PASSWORD

# Google Service Account
GSC_SERVICE_ACCOUNT                # JSON credentials

# Notifications
DISCORD_WEBHOOK_URL                # Deployment alerts
RESEND_API_KEY                     # Email service

# Tokens
GITHUB_TOKEN                       # Auto-provided by GitHub
```

---

## VPS DEPLOYMENT SCRIPTS

### Script Files
```
Root Level:
├── deploy-to-tpp-vps.sh           - Primary TPP VPS deployment
├── deploy-serpbear-vps.sh         - SerpBear rank tracker deployment
├── deploy-with-functions.sh       - Alternative deployment method
├── deploy-to-cloudflare.sh        - Cloudflare Pages deployment
├── vps-setup-guide.sh             - VPS initialization
├── vps-manage.sh                  - VPS management commands

Subdirectories:
└── scripts/deploy-production.sh    - Production deployment helper
```

### Key Deployment Scripts

#### deploy-to-tpp-vps.sh (Primary)
- SSH connection via `tpp-vps` alias
- Workflow:
  1. Pre-flight checks (SSH, git, directories)
  2. Create full backup (tar.gz format)
  3. Git operations (fetch, reset hard)
  4. npm ci with production flags
  5. Database backup (SQLite)
  6. PM2 restart/start
  7. Health checks
  8. Service verification
- Features:
  - Backup retention (last 5)
  - Color-coded output
  - Rollback support

#### deploy-serpbear-vps.sh (Rank Tracker)
- Dedicated SerpBear deployment
- Workflow:
  1. Pre-flight checks
  2. rsync files to VPS
  3. Docker build on VPS
  4. Docker Compose up
  5. Health verification

---

## DEPLOYMENT DATABASE STRATEGY

### Database Architectures

#### Production (Docker)
- **Primary**: PostgreSQL 15 in Docker
- **Volume**: `postgres_data` (local driver)
- **Backup**: Automated SQL dumps before migrations
- **Migrations**: SQL schema initialization from file

#### Legacy (VPS)
- **SerpBear**: SQLite at `serpbear/data/serpbear.db`
- **Keyword Service**: SQLite at `keyword-service/keywords.db`
- **Backup**: Full tar.gz archives on VPS

### Database Schema Files
```
database/
├── postgresql-schema.sql          - PostgreSQL DDL
├── unified-schema.sql             - Schema definition
└── migration files                - Version-controlled migrations
```

### Backup Strategy
- **Frequency**: Pre-deployment (automatic)
- **Location**: `/home/avi/seo-automation/backups/`
- **Retention**: Last 7 PostgreSQL backups, Last 10 SQLite DB backups
- **Format**: SQL dumps, tar.gz archives
- **Naming**: `db_backup_YYYYMMDD_HHMMSS.sql`

---

## DEPLOYMENT PROFILES & FEATURES

### Docker Compose Profiles
```
Default (no profile):
- postgres (database)
- dashboard (main app)
- keyword-service (keyword tracking)

Optional Profiles:
--profile with-sync         - Enable sync service (disabled: SQLite issues)
--profile with-cloudflare   - Enable Cloudflare tunnel
--profile with-watchdog     - Enable health monitoring
--profile with-nginx        - Legacy Nginx reverse proxy (deprecated)
--profile test-env          - Test WordPress + MySQL
```

### Service Ports & Endpoints
```
Internal Ports:
- 9000: Main dashboard API
- 5000: Keyword service
- 5432: PostgreSQL
- 3006: SerpBear integration
- 5002: SEO Analyst service

External:
- Cloudflare Tunnel: Replaces port mapping
- Domain: seodashboard.theprofitplatform.com.au
- Reports: baa93e95.seo-reports-4d9.pages.dev
```

---

## DEPLOYMENT UTILITIES & TOOLS

### npm Scripts (package.json)
```
# VPS Operations
npm run vps:deploy      - Deploy to TPP VPS
npm run vps:update      - Pull latest, restart
npm run vps:health      - Health check
npm run vps:logs        - View PM2 logs (last 50 lines)
npm run vps:status      - PM2 process status
npm run vps:restart     - Restart service
npm run vps:connect     - SSH to VPS
npm run vps:monitor     - PM2 monitoring
npm run vps:backup      - Manual backup

# GitHub Actions
npm run actions:status  - View action runs
npm run actions:logs    - Get recent action logs
```

### Testing & Verification Scripts
```
├── test-docker.sh              - Docker build & compose verification
├── test-integrations.sh        - Integration test suite
├── test-vps-workflow.sh        - VPS deployment test
├── quick-health.sh             - Quick health check
├── comprehensive-status-check.sh - Full system status
├── verify-integration.sh        - Integration verification
```

---

## CLOUDFLARE INTEGRATION

### Tunnel Configuration
- **Service**: Cloudflare Tunnel (replaces Nginx)
- **Token**: Environment variable `CLOUDFLARE_TUNNEL_TOKEN`
- **Image**: cloudflare/cloudflared:latest
- **Command**: `tunnel --no-autoupdate run`
- **Configuration**: Tunnel token-based authentication

### DNS & Domain Management
- **Primary Domain**: seodashboard.theprofitplatform.com.au
- **Reports Site**: baa93e95.seo-reports-4d9.pages.dev
- **SSL**: Automatic via Cloudflare

### Workflow Management
- **Update Workflow**: `update-cloudflare-tunnel.yml`
- **Restart Workflow**: `restart-cloudflared.yml`
- **GitHub Secrets**: CLOUDFLARE_API_TOKEN, CLOUDFLARE_TUNNEL_TOKEN

---

## MONITORING & HEALTH CHECKS

### Built-in Health Checks
```
Container-level (Docker):
- postgres: pg_isready check (10s interval, 5 retries)
- dashboard: HTTP GET /api/v2/health (30s interval, 3 retries)
- watchdog: Custom shell script checks (5 min interval)

Application-level (Node.js):
- /health endpoint (TPP VPS)
- /api/v2/health endpoint (Docker)
```

### Monitoring Workflows
- **daily-health-summary.yml**: Daily email reports
- **health-monitor.yml**: Continuous health monitoring
- **check-service-status.yml**: Service availability checks
- **diagnose-containers.yml**: Container diagnostics

### Watchdog Service
- **Purpose**: Automatic recovery on failures
- **Check Interval**: 5 minutes
- **Action**: Restart dashboard container on health failure
- **Profile**: `with-watchdog`

---

## DEPLOYMENT SECURITY

### Security Measures
1. **SSH-based VPS access**: Key authentication, no passwords
2. **Secrets management**: GitHub Secrets for sensitive data
3. **Non-root Docker**: seouser (1001) container user
4. **Environment isolation**: Separate .env per environment
5. **Backup strategy**: Pre-deployment database backups
6. **Cloudflare tunnel**: No exposed ports, secure tunneling
7. **Health checks**: Automatic failure detection & recovery
8. **Rollback capability**: Previous deployments preserved

### Sensitive Files
- `.env` (git-tracked but with placeholders)
- `config/google/service-account.json` (excluded from git)
- SSH keys (GitHub Secrets only)
- API credentials (environment variables)

---

## PROJECT STRUCTURE (DEPLOYMENT-RELEVANT)

```
/mnt/c/Users/abhis/projects/seo\ expert/
├── .github/workflows/              # 27 CI/CD workflows
├── deployment/
│   └── production/
│       └── DEPLOYMENT_GUIDE.md    # Comprehensive guide
├── database/                        # Schema files
│   ├── postgresql-schema.sql
│   └── migration files
├── dashboard/                       # React frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── dashboard-server.js             # Main entry point (9000)
├── serpbear/                        # Rank tracking
│   ├── Dockerfile
│   └── docker-compose.prod.yml
├── keyword-service/                # Keyword tracking
│   ├── Dockerfile
│   └── docker-compose.yml
├── src/                            # Backend services
│   ├── api/                        # API routes
│   ├── services/                   # Business logic
│   ├── automation/                 # SEO automation
│   └── database/                   # Database utilities
├── clients/
│   └── clients-config.json        # Multi-client config
├── Dockerfile                      # Main app container
├── Dockerfile.dashboard            # Dashboard container
├── docker-compose.yml              # Dev orchestration
├── docker-compose.dev.yml          # Dev overrides
├── docker-compose.prod.yml         # Prod orchestration
├── docker-compose.*.yml            # Service-specific
├── .env                           # Environment config
├── .env.example                   # Template
├── .env.production.example        # Production template
├── package.json                   # Dependencies & scripts
└── tests/                         # Test files
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and merged to main
- [ ] Environment variables configured in GitHub Secrets
- [ ] Database backups enabled
- [ ] SSH access to VPS verified
- [ ] Cloudflare tunnel token valid

### Deployment
- [ ] Push changes to main branch (triggers CI/CD)
  OR
- [ ] Manually trigger workflow in GitHub Actions
- [ ] Monitor deployment via GitHub Actions console
- [ ] Verify health checks passing
- [ ] Check Discord notifications

### Post-Deployment
- [ ] Verify app accessibility at domain
- [ ] Check health endpoints responding
- [ ] Verify database migrations applied
- [ ] Test main features (login, data sync, etc.)
- [ ] Monitor logs for errors
- [ ] Confirm backup created successfully

### Rollback (if needed)
- [ ] Workflow has rollback job (manual trigger)
- [ ] Database backup from pre-deployment available
- [ ] Previous code backup accessible

---

## KNOWN ISSUES & WORKAROUNDS

1. **Sync Service Disabled**
   - Issue: SQLite database connectivity
   - Workaround: Enabled via profile, data synced via API
   - Profile: `with-sync`

2. **Trivy Scanning Commented Out**
   - Issue: Image reference issues in docker-build.yml
   - Status: Disabled pending fix
   - Re-enable: Update docker-build.yml workflows

3. **Nginx Deprecated**
   - Replaced by: Cloudflare Tunnel
   - Old config: docker-compose.prod.yml (commented)

4. **Database Migration Issues**
   - Check: Schema file path in compose
   - Ensure: PostgreSQL healthy before migration

---

## DEPLOYMENT QUICK REFERENCE

### Automatic Deployment
```bash
git push origin main  # Triggers deploy-production.yml or deploy-tpp-vps.yml
```

### Manual Deployment
```bash
npm run vps:deploy          # Deploy to TPP VPS
./deploy-serpbear-vps.sh   # Deploy SerpBear rank tracker
```

### Health Checks
```bash
npm run vps:health          # HTTP endpoint check
npm run vps:status          # PM2 process status
npm run vps:logs            # View recent logs
```

### Emergency Rollback
```bash
# Via GitHub Actions: Manually trigger rollback workflow
# Or manually restore from backup on VPS
```

---

## ADDITIONAL RESOURCES

- **Deployment Guide**: `/deployment/production/DEPLOYMENT_GUIDE.md`
- **CI/CD Workflows**: `.github/workflows/*.yml`
- **Docker Compose**: `docker-compose.prod.yml`
- **Configuration**: `.env.example`, `.env.production.example`
- **Scripts**: Root-level `*.sh` files and `scripts/` directory
