# Rollback Procedures

> Emergency rollback procedures for Coolify MCP Server and managed services

## Table of Contents

- [Quick Reference](#quick-reference)
- [Application Rollback](#application-rollback)
- [Database Rollback](#database-rollback)
- [MCP Server Rollback](#mcp-server-rollback)
- [Service Rollback](#service-rollback)
- [Emergency Contacts](#emergency-contacts)

---

## Quick Reference

| Scenario | Command | Time |
|----------|---------|------|
| Rollback app deployment | `get_application_deployment_history` → `rollback_deployment` | 2 min |
| Restore database | Download from S3 → `psql` restore | 10-30 min |
| Rollback MCP server | `git checkout` → `npm run build` → restart | 5 min |
| Rollback Docker image | `update_application` with previous tag | 2 min |

---

## Application Rollback

### Via MCP Tools (Recommended)

#### Step 1: Get Deployment History

```bash
# Using MCP tool
node -e "
const tool = require('./build/tools/deployments/get-deployment-history');
// Execute: get_application_deployment_history with app UUID
"

# Or via health check script
cd /home/avi/projects/coolify/coolify-mcp
node health-check-coolify.js
```

#### Step 2: Identify Last Working Deployment

Look for:
- Status: `success` or `finished`
- Recent timestamp
- Note the `deployment_uuid`

#### Step 3: Rollback to Specific Deployment

```bash
# Using MCP tool: rollback_deployment
# Parameters:
#   - deployment_uuid: The deployment to rollback to
#   - application_uuid: The application UUID
```

### Via Coolify Dashboard

1. **Navigate to Application**
   - URL: `https://coolify.theprofitplatform.com.au`
   - Go to: Projects → [Project] → [Application]

2. **View Deployments**
   - Click "Deployments" tab
   - Find last successful deployment

3. **Trigger Rollback**
   - Click the "..." menu on the deployment
   - Select "Rollback to this version"
   - Confirm rollback

4. **Verify**
   - Monitor deployment logs
   - Check application health
   - Verify functionality

### Via Docker (Direct)

```bash
# SSH to server
ssh root@31.97.222.218

# List available images
docker images | grep <app-name>

# Find previous working tag
docker image history <image>:<tag>

# Update container to previous version
docker stop <container>
docker run -d --name <container> <image>:<previous-tag>
```

---

## Database Rollback

### Prerequisites

- AWS CLI configured
- Access to backup S3 bucket
- Database credentials

### From S3 Backup

#### Step 1: List Available Backups

```bash
# List database backups
aws s3 ls s3://${BACKUP_BUCKET}/backups/databases/ --recursive | sort -k1,2 | tail -20

# Example output:
# 2024-11-29 02:00:00 52428800 backups/databases/postgres-main-2024-11-29.sql.gz
```

#### Step 2: Download Backup

```bash
# Download specific backup
aws s3 cp s3://${BACKUP_BUCKET}/backups/databases/postgres-main-2024-11-29.sql.gz ./

# Verify download
ls -la postgres-main-2024-11-29.sql.gz
```

#### Step 3: Prepare for Restore

```bash
# Decompress backup
gunzip postgres-main-2024-11-29.sql.gz

# Verify file
head -50 postgres-main-2024-11-29.sql
```

#### Step 4: Restore Database

##### PostgreSQL

```bash
# Stop applications using the database first!
# Via MCP: batch_stop_applications

# Connect and restore
psql -h localhost -U postgres -d dbname < postgres-main-2024-11-29.sql

# Or for fresh database
dropdb -h localhost -U postgres dbname
createdb -h localhost -U postgres dbname
psql -h localhost -U postgres -d dbname < postgres-main-2024-11-29.sql
```

##### MySQL/MariaDB

```bash
# Restore MySQL database
mysql -h localhost -u root -p dbname < mysql-backup-2024-11-29.sql
```

##### MongoDB

```bash
# Restore MongoDB
mongorestore --host localhost --db dbname ./mongo-backup-2024-11-29/
```

#### Step 5: Verify Restore

```bash
# PostgreSQL - check tables
psql -h localhost -U postgres -d dbname -c "\dt"

# Check row counts
psql -h localhost -U postgres -d dbname -c "SELECT count(*) FROM important_table;"
```

#### Step 6: Restart Applications

```bash
# Via MCP: batch_start_applications
# Or via Coolify dashboard
```

---

## MCP Server Rollback

### Git-Based Rollback

#### Step 1: Check Current Version

```bash
cd /home/avi/projects/coolify/coolify-mcp
git log --oneline -10
```

#### Step 2: Identify Working Commit

```bash
# View commit history with details
git log --oneline --decorate -20

# Check specific commit
git show <commit-hash> --stat
```

#### Step 3: Rollback

```bash
# Option A: Checkout specific commit
git checkout <commit-hash>

# Option B: Revert to previous commit
git revert HEAD

# Option C: Hard reset (CAUTION: loses uncommitted changes)
git reset --hard <commit-hash>
```

#### Step 4: Rebuild and Restart

```bash
# Rebuild
npm run build

# Restart service
sudo systemctl restart coolify-mcp

# Verify
sudo systemctl status coolify-mcp
```

### Package Version Rollback

```bash
# If issue is with dependencies
rm -rf node_modules package-lock.json
git checkout package-lock.json
npm ci
npm run build
sudo systemctl restart coolify-mcp
```

---

## Service Rollback

### Docker Image Rollback

#### Step 1: List Image Tags

```bash
# Via Docker Hub API or registry
curl -s "https://hub.docker.com/v2/repositories/<namespace>/<repo>/tags" | jq '.results[].name'

# Or locally
docker images <image-name> --format "{{.Tag}}"
```

#### Step 2: Update Application

```bash
# Via MCP tool: update_application
# Set docker_image to previous version tag

# Example: update from v2.0.0 to v1.9.0
# Parameters:
#   uuid: <app-uuid>
#   docker_image: myapp:v1.9.0
```

#### Step 3: Redeploy

```bash
# Via MCP: deploy_application with force=true
```

### Docker Compose Rollback

```bash
# SSH to server
ssh root@31.97.222.218

# Navigate to compose directory
cd /path/to/compose

# Restore previous compose file
git checkout HEAD~1 docker-compose.yml

# Recreate containers
docker-compose up -d --force-recreate
```

---

## Verification Checklist

After any rollback:

- [ ] Service is running (`systemctl status` or container check)
- [ ] Health endpoint responds
- [ ] Application accessible via browser
- [ ] Database connections working
- [ ] No errors in logs (check last 100 lines)
- [ ] Key functionality verified
- [ ] Monitoring shows healthy status

### Quick Health Check

```bash
# MCP Server
cd /home/avi/projects/coolify/coolify-mcp
node health-check-coolify.js

# Service logs
sudo journalctl -u coolify-mcp -n 50 --no-pager

# Application health
curl -s https://your-app.theprofitplatform.com.au/health
```

---

## Emergency Contacts

| Role | Contact | When to Use |
|------|---------|-------------|
| Primary Admin | [Your contact] | Any production issue |
| VPS Provider | [Provider support] | Infrastructure issues |
| Coolify Support | [Coolify Discord/GitHub] | Platform bugs |

### Important URLs

- **Coolify Dashboard**: https://coolify.theprofitplatform.com.au
- **VPS IP**: 31.97.222.218
- **Uptime Kuma**: [Your monitoring URL]
- **S3 Console**: [Your S3 console URL]

---

## Post-Rollback Actions

1. **Document the incident**
   - What failed
   - What was rolled back
   - Root cause (if known)

2. **Create fix branch**
   ```bash
   git checkout main
   git pull
   git checkout -b fix/issue-description
   ```

3. **Test fix thoroughly**
   - Local testing
   - Staging environment
   - Integration tests

4. **Deploy fix**
   - Only after verification
   - During low-traffic period
   - With monitoring enabled

---

## Prevention Tips

1. **Always backup before deployments**
2. **Use staging environment for testing**
3. **Enable deployment notifications**
4. **Monitor logs during deployments**
5. **Have rollback plan before deploying**
6. **Document all custom configurations**
