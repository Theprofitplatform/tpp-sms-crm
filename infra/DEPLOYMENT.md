# Deployment Guide

This document explains how to set up automated deployment for the SMS CRM application using GitHub Actions.

## Overview

The deployment system consists of two workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on every push and PR
   - Installs dependencies
   - Runs linters
   - Builds all packages
   - Runs tests
   - Verifies database migrations

2. **Deployment Workflow** (`.github/workflows/deploy.yml`) - Runs on push to `main` branch
   - Connects to production server via SSH
   - Pulls latest code
   - Runs deployment script
   - Verifies deployment health

## Setup Instructions

### 1. Prepare Your Production Server

Ensure your production server has:

- Git installed
- Docker and Docker Compose installed
- Your repository cloned to a specific path (e.g., `/var/www/smscrm`)
- A `.env.production` file with all required environment variables

### 2. Generate SSH Key for Deployment

On your local machine or CI server:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
```

This creates two files:
- `deploy_key` (private key) - will be added to GitHub Secrets
- `deploy_key.pub` (public key) - will be added to your server

### 3. Add Public Key to Production Server

On your production server:

```bash
# Add the public key to authorized_keys
cat deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key content | Contents of `deploy_key` file |
| `SSH_HOST` | Production server IP or hostname | `192.168.1.100` or `example.com` |
| `SSH_USER` | SSH user on production server | `ubuntu` or `root` |
| `DEPLOY_PATH` | Absolute path to project on server | `/var/www/smscrm` |
| `HEALTH_CHECK_URL` | URL to check after deployment | `https://api.example.com` |

#### How to Add SSH_PRIVATE_KEY:

```bash
# On your local machine, copy the private key
cat deploy_key

# Copy the ENTIRE output including:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...content...
# -----END OPENSSH PRIVATE KEY-----
```

Paste this into the `SSH_PRIVATE_KEY` secret in GitHub.

### 5. Create Production Environment Variables

On your production server, create `.env.production` in your project root:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=smscrm

# Redis
REDIS_PASSWORD=your_redis_password_here

# API
API_BASE_URL=https://api.yourdomain.com
WEB_URL=https://app.yourdomain.com
COOKIE_SECRET=your_cookie_secret_32_chars_min
SHORT_DOMAIN=yourdomain.com
SHORT_LINK_SECRET=your_link_secret_32_chars_min

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890
```

### 6. Initial Deployment

First deployment should be done manually to ensure everything works:

```bash
# On production server
cd /var/www/smscrm
git pull origin main
bash infra/deploy.sh
```

### 7. Verify Automated Deployment

After initial setup:

1. Make a change and push to `main` branch
2. Go to GitHub → Actions tab
3. Watch the "Deploy to Production" workflow
4. Verify the deployment succeeded

## Deployment Flow

When you push to `main`:

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Workflow   │ ← Runs tests, linting, builds
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy Workflow │ ← Connects via SSH
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Production      │
│ Server          │
│                 │
│ 1. Pull code    │
│ 2. Run deploy.sh│
│ 3. Build images │
│ 4. Stop old     │
│ 5. Start new    │
│ 6. Migrate DB   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Health Check    │ ← Verify services
└─────────────────┘
```

## Manual Deployment

You can also trigger deployment manually:

1. Go to GitHub → Actions
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Select branch and click "Run"

Or on the server:

```bash
cd /var/www/smscrm
git pull origin main
bash infra/deploy.sh
```

## Rollback

If a deployment fails, rollback to the previous version:

```bash
# On production server
cd /var/www/smscrm

# Find the previous commit
git log --oneline -n 5

# Rollback to a specific commit
git checkout <previous-commit-hash>

# Re-deploy
bash infra/deploy.sh
```

## Monitoring

After deployment, monitor the services:

```bash
# Check service status
cd /var/www/smscrm/infra
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f web
```

## Troubleshooting

### Deployment fails at SSH connection

- Verify SSH_PRIVATE_KEY is correct (includes BEGIN/END lines)
- Verify SSH_HOST and SSH_USER are correct
- Test SSH connection manually: `ssh -i deploy_key user@host`
- Check server firewall allows SSH from GitHub Actions IPs

### Deployment fails at build step

- Check if server has enough disk space: `df -h`
- Check Docker is running: `docker info`
- Check Docker logs: `docker compose logs`

### Services fail health check

- Check container logs: `docker compose -f docker-compose.prod.yml logs`
- Verify environment variables in `.env.production`
- Check if database migrations ran successfully
- Verify database and Redis are accessible

### Database migration fails

- Connect to the database and check migration status
- Run migrations manually: `docker compose exec api pnpm run migrate`
- Check migration files for syntax errors

## Security Best Practices

1. **Never commit secrets** - Use `.env.production` and GitHub Secrets
2. **Restrict SSH access** - Use SSH keys only, disable password auth
3. **Use firewall** - Only allow necessary ports (80, 443, SSH)
4. **Regular backups** - The deploy script creates automatic DB backups in `infra/backups/`
5. **Monitor logs** - Set up log monitoring and alerts
6. **HTTPS only** - Configure SSL certificates in nginx
7. **Rotate secrets** - Periodically update passwords and keys

## Backup and Restore

### Automatic Backups

The deployment script automatically creates a database backup before each deployment:

```bash
# Backups are stored in:
/var/www/smscrm/infra/backups/backup-YYYYMMDD-HHMMSS.sql
```

### Manual Backup

```bash
cd /var/www/smscrm/infra
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres smscrm > backup.sql
```

### Restore from Backup

```bash
cd /var/www/smscrm/infra
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres smscrm < backup.sql
```

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [SSH Key Authentication](https://www.ssh.com/academy/ssh/key)
