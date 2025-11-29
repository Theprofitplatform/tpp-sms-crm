# Local Coolify Setup Guide

**Purpose**: Test deployments locally before pushing to production VPS

## Why Run Coolify Locally?

**Benefits:**
- ✅ Test deployments without affecting production
- ✅ Debug Docker configs safely
- ✅ Experiment with new features
- ✅ Faster iteration (no network latency)
- ✅ Free (no VPS costs for testing)

**Use Cases:**
- Testing new applications before production
- Debugging deployment issues
- Learning Coolify without risk
- Validating Docker configurations

---

## Prerequisites

### 1. Check Your System

```bash
# Check OS (you're on Linux)
uname -a

# Check available resources
free -h    # Need at least 4GB RAM
df -h      # Need at least 20GB disk space
```

**Minimum Requirements:**
- **OS**: Linux, macOS, or Windows WSL2
- **RAM**: 4GB (8GB recommended)
- **CPU**: 2 cores (4 recommended)
- **Disk**: 20GB free space
- **Docker**: 20.10.0 or higher

### 2. Install Docker (if not already installed)

```bash
# Check if Docker is installed
docker --version

# If not installed:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Test Docker
docker run hello-world
```

---

## Installation Methods

### Method 1: Quick Install (Recommended)

```bash
# Create directory for local Coolify
mkdir -p ~/local-coolify
cd ~/local-coolify

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Wait for installation to complete (2-5 minutes)
```

**What this does:**
- Downloads Coolify
- Sets up Docker containers
- Configures networking
- Starts the service

### Method 2: Docker Compose (Manual Control)

```bash
# Create docker-compose.yml
mkdir -p ~/local-coolify
cd ~/local-coolify

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  coolify:
    image: ghcr.io/coollabs/coolify:latest
    container_name: coolify-local
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - coolify-db:/app/db
      - coolify-storage:/app/storage
    ports:
      - "8000:8000"
    environment:
      - APP_ID=local
      - APP_NAME="Coolify Local"
      - APP_ENV=local
      - APP_DEBUG=true
      - APP_URL=http://localhost:8000
      - DB_CONNECTION=sqlite
      - DB_DATABASE=/app/db/database.sqlite

volumes:
  coolify-db:
  coolify-storage:
EOF

# Start Coolify
docker-compose up -d

# View logs
docker-compose logs -f
```

### Method 3: Direct Docker Run

```bash
docker run -d \
  --name coolify-local \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v coolify-db:/app/db \
  -v coolify-storage:/app/storage \
  -p 8000:8000 \
  -e APP_ID=local \
  -e APP_NAME="Coolify Local" \
  -e APP_ENV=local \
  -e APP_URL=http://localhost:8000 \
  ghcr.io/coollabs/coolify:latest
```

---

## Access Your Local Coolify

### 1. Open Browser

```bash
# Linux
xdg-open http://localhost:8000

# macOS
open http://localhost:8000

# Or manually visit: http://localhost:8000
```

### 2. Initial Setup

1. **Create Admin Account**
   - Email: your-email@example.com
   - Password: (choose a strong password)
   - Team name: "Local Development"

2. **Configure Server**
   - Server Name: "local-server"
   - IP: localhost
   - Type: Local

3. **Skip External Server Setup**
   - We're only using this for local testing

---

## Testing Workflow

### Two-Environment Setup

**Local (Your Computer):**
```
http://localhost:8000
Purpose: Testing & Development
Branch: feature/* or develop
```

**Production (VPS - 31.97.222.218):**
```
https://coolify.theprofitplatform.com.au
Purpose: Live applications
Branch: main
```

### Recommended Workflow

```
1. Develop feature locally
   ↓
2. Test on local Coolify
   ├─ Deploy to http://localhost:8000
   ├─ Test application locally
   └─ Debug any issues
   ↓
3. Push to test.theprofitplatform.com.au (optional)
   ├─ Test in production-like environment
   └─ Final validation
   ↓
4. Deploy to production
   └─ Push to theprofitplatform.com.au
```

---

## Example: Testing a Node.js App Locally

### 1. Prepare Your Application

```bash
cd ~/projects/my-test-app

# Create a simple test app
cat > index.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end('<h1>Hello from Local Coolify Test!</h1>');
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "local-test-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {}
}
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Initialize git
git init
git add .
git commit -m "Initial commit"
```

### 2. Deploy to Local Coolify

1. **Open Local Coolify**: http://localhost:8000
2. **Create New Project**: "Local Tests"
3. **Add Application**:
   - Name: test-app-local
   - Source: Local Git Repository
   - Path: /home/avi/projects/my-test-app
   - Branch: main
   - Port: 3000

4. **Configure Build**:
   - Build Pack: Dockerfile
   - Dockerfile Location: ./Dockerfile

5. **Deploy**

6. **Access**: http://localhost:3000 (or whatever port Coolify assigns)

### 3. Test & Iterate

```bash
# Make changes to your app
vim index.js

# Commit changes
git add .
git commit -m "Update message"

# Redeploy in Coolify UI
# (Or set up auto-deploy on git push)
```

### 4. When Ready for Production

```bash
# Push to your GitHub/GitLab
git remote add origin https://github.com/yourusername/my-test-app.git
git push origin main

# Deploy to production Coolify (31.97.222.218)
# Use same config but point to GitHub repo
```

---

## Managing Local Coolify

### Useful Commands

```bash
# Check status
docker ps | grep coolify

# View logs
docker logs -f coolify-local

# Restart
docker restart coolify-local

# Stop
docker stop coolify-local

# Start
docker start coolify-local

# Remove (keeps data)
docker stop coolify-local
docker rm coolify-local

# Complete cleanup (WARNING: Deletes all data!)
docker stop coolify-local
docker rm coolify-local
docker volume rm coolify-db coolify-storage
```

### Resource Monitoring

```bash
# Check Docker resource usage
docker stats coolify-local

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

---

## Local vs Production Differences

| Aspect | Local | Production |
|--------|-------|------------|
| **URL** | localhost:8000 | coolify.theprofitplatform.com.au |
| **SSL** | None | Let's Encrypt |
| **DNS** | localhost | Real domain |
| **Data** | Temporary | Persistent |
| **Purpose** | Testing | Live apps |
| **Uptime** | When running | 24/7 |
| **Resources** | Your machine | VPS |

---

## Integration with Your MCP Server

### Connect Local Coolify to MCP

```bash
# Edit your .env (for local testing)
cd ~/projects/coolify/coolify-mcp

# Create .env.local
cat > .env.local << 'EOF'
# Local Coolify Configuration
COOLIFY_BASE_URL=http://localhost:8000
COOLIFY_TOKEN=<get-from-local-coolify-ui>

# Optional: Keep production config separate
# COOLIFY_BASE_URL_PRODUCTION=https://coolify.theprofitplatform.com.au
# COOLIFY_TOKEN_PRODUCTION=<your-production-token>
EOF
```

### Get Local Coolify API Token

1. Open http://localhost:8000
2. Go to **Settings** → **Security** → **API Tokens**
3. Click **Create Token**
4. Name: "MCP Local Testing"
5. Copy the token
6. Add to `.env.local`

### Test MCP with Local Coolify

```bash
# Use local config
export $(cat .env.local | xargs)

# Test connection
npm run test:api

# Or use the MCP tools with local Coolify
node build/index.js
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8000
sudo lsof -i :8000

# Use different port
docker run -p 9000:8000 ...
# Then access: http://localhost:9000
```

### Docker Socket Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo docker ...
```

### Coolify Won't Start

```bash
# Check logs
docker logs coolify-local

# Check Docker is running
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

### Applications Won't Deploy

```bash
# Check Docker has enough resources
docker stats

# Check disk space
df -h

# Clean up unused containers
docker system prune -a
```

---

## Best Practices

### 1. Separate Data

```bash
# Use different volumes for local vs production backups
Local: ~/local-coolify-backups/
Production: ~/production-coolify-backups/
```

### 2. Use Git Branches

```bash
Local Testing:    feature/*, develop
Staging:          staging
Production:       main
```

### 3. Environment Variables

```bash
# Keep separate .env files
.env.local          # Local Coolify
.env.staging        # Staging server
.env.production     # Production VPS
```

### 4. Regular Cleanup

```bash
# Weekly cleanup of local test deployments
docker system prune -a --volumes
```

---

## Quick Reference

### Start Local Coolify
```bash
cd ~/local-coolify
docker-compose up -d
```

### Access
```bash
http://localhost:8000
```

### Stop
```bash
docker-compose down
```

### Update
```bash
docker-compose pull
docker-compose up -d
```

### Backup
```bash
docker cp coolify-local:/app/db ./backup/
```

---

## Next Steps

1. **Install Coolify locally** (choose a method above)
2. **Test with a simple app** (Node.js example above)
3. **Document your workflow** (how you test before production)
4. **Automate** (scripts to deploy local → staging → production)

---

## Need Help?

- Coolify Docs: https://coolify.io/docs
- Discord: https://discord.gg/coolify
- GitHub: https://github.com/coollabs/coolify

---

**Ready to install?** Choose a method above and let me know if you hit any issues!
