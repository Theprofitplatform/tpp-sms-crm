# Deployment Setup Checklist

Quick start guide for setting up automated deployment.

## Prerequisites

- [ ] GitHub repository set up
- [ ] Production server with Docker & Docker Compose
- [ ] SSH access to production server

## Setup Steps

### 1. Generate SSH Keys

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
```

### 2. Configure Server

```bash
# Copy public key to server
ssh-copy-id -i deploy_key.pub user@your-server.com

# Or manually:
cat deploy_key.pub | ssh user@your-server.com "cat >> ~/.ssh/authorized_keys"
```

### 3. Add GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Value |
|--------|-------|
| `SSH_PRIVATE_KEY` | Contents of `deploy_key` file |
| `SSH_HOST` | Your server IP/hostname |
| `SSH_USER` | SSH username (e.g., `ubuntu`) |
| `DEPLOY_PATH` | Project path (e.g., `/var/www/smscrm`) |
| `HEALTH_CHECK_URL` | API URL (e.g., `https://api.example.com`) |

### 4. Create Production Environment File

On your server, create `.env.production`:

```bash
# On your production server
cd /var/www/smscrm
nano .env.production
```

Copy from `.env.example` and fill in production values.

### 5. Test Deployment

```bash
# Manual test on server
cd /var/www/smscrm
git pull origin main
bash infra/deploy.sh
```

### 6. Enable Automated Deployment

Push to `main` branch and watch GitHub Actions tab!

## Quick Reference

### View Deployment Status
- Go to GitHub → Actions tab
- Click on latest "Deploy to Production" workflow

### Manual Deploy from GitHub
1. Actions tab → "Deploy to Production"
2. Click "Run workflow"
3. Select branch → "Run workflow"

### View Production Logs
```bash
ssh user@server
cd /var/www/smscrm/infra
docker compose -f docker-compose.prod.yml logs -f
```

### Rollback
```bash
ssh user@server
cd /var/www/smscrm
git log --oneline -n 5
git checkout <previous-commit>
bash infra/deploy.sh
```

## Need Help?

See full documentation: `infra/DEPLOYMENT.md`
