# React Dashboard - Deployment Guide

## 🚀 Quick Deploy to Development

### Option 1: Automated Deployment (Recommended)

```bash
# Run the deployment script
./deploy-dev.sh
```

This script will:
1. ✅ Check prerequisites (Docker, Docker Compose)
2. ✅ Stop existing containers
3. ✅ Build React dashboard
4. ✅ Build Docker images
5. ✅ Start containers
6. ✅ Run health checks
7. ✅ Show status

**Dashboard will be available at:** http://localhost:8080

---

### Option 2: Manual Deployment

#### Step 1: Build the React Dashboard
```bash
cd dashboard
npm install
npm run build
cd ..
```

#### Step 2: Build Docker Images
```bash
docker-compose -f docker-compose.react-dashboard.yml build
```

#### Step 3: Start Containers
```bash
docker-compose -f docker-compose.react-dashboard.yml up -d
```

#### Step 4: Check Status
```bash
docker-compose -f docker-compose.react-dashboard.yml ps
```

---

## 📋 What Gets Deployed

### Services

1. **react-dashboard** (Frontend)
   - Port: 8080
   - Technology: React 18 + Vite
   - Web server: Nginx
   - Container: `seo-react-dashboard`

2. **backend** (API - Optional)
   - Port: 9000
   - Technology: Node.js
   - Container: `seo-backend`

---

## 🔧 Configuration

### Ports

| Service | Container Port | Host Port | URL |
|---------|---------------|-----------|-----|
| React Dashboard | 80 | 8080 | http://localhost:8080 |
| Backend API | 3000 | 9000 | http://localhost:9000 |

### Environment Variables

Dashboard environment variables are set in `dashboard/.env` (create if needed):

```bash
# API Backend URL
VITE_API_URL=http://localhost:9000

# App Configuration
VITE_APP_NAME=SEO Dashboard
VITE_APP_VERSION=1.0.0
```

---

## 📊 Managing Deployment

### View Logs
```bash
# All services
docker-compose -f docker-compose.react-dashboard.yml logs -f

# Specific service
docker-compose -f docker-compose.react-dashboard.yml logs -f react-dashboard
```

### Stop Deployment
```bash
docker-compose -f docker-compose.react-dashboard.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.react-dashboard.yml restart
```

### Rebuild and Redeploy
```bash
# Stop containers
docker-compose -f docker-compose.react-dashboard.yml down

# Rebuild
cd dashboard && npm run build && cd ..
docker-compose -f docker-compose.react-dashboard.yml build --no-cache

# Start
docker-compose -f docker-compose.react-dashboard.yml up -d
```

---

## 🏥 Health Checks

### Dashboard Health
```bash
curl http://localhost:8080
```

### Backend Health (if running)
```bash
curl http://localhost:9000/api/health
```

### Container Status
```bash
docker-compose -f docker-compose.react-dashboard.yml ps
```

---

## 🐛 Troubleshooting

### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solution:**
```bash
# Option 1: Stop the service using the port
lsof -ti:8080 | xargs kill -9

# Option 2: Change port in docker-compose.react-dashboard.yml
# Change "8080:80" to "8081:80" (or any free port)
```

### Issue: Build Fails

**Solution:**
```bash
# Clean build
cd dashboard
rm -rf node_modules dist
npm install
npm run build
cd ..

# Rebuild Docker images
docker-compose -f docker-compose.react-dashboard.yml build --no-cache
```

### Issue: Container Won't Start

**Solution:**
```bash
# Check logs
docker-compose -f docker-compose.react-dashboard.yml logs

# Remove and recreate
docker-compose -f docker-compose.react-dashboard.yml down -v
docker-compose -f docker-compose.react-dashboard.yml up -d
```

### Issue: Dashboard Shows White Screen

**Solution:**
1. Check browser console for errors
2. Verify build completed: `ls dashboard/dist/`
3. Check nginx logs: `docker logs seo-react-dashboard`
4. Rebuild: `cd dashboard && npm run build && cd ..`

---

## 🔒 Security Considerations

### For Development
- ✅ Running on localhost only
- ✅ No SSL/HTTPS needed
- ✅ CORS configured for local development

### For Production (Future)
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure proper CORS origins
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Use secrets management

---

## 📈 Performance Optimization

### Production Build Features
- ✅ Minified JavaScript
- ✅ CSS bundling
- ✅ Tree-shaking
- ✅ Code splitting
- ✅ Gzip compression
- ✅ Static asset caching
- ✅ Optimized images

### Nginx Optimizations
- ✅ Gzip compression enabled
- ✅ Static asset caching (1 year)
- ✅ Security headers
- ✅ API proxy configuration

---

## 🔄 Update Deployment

### Update Dashboard Code
```bash
# Pull latest code
git pull

# Redeploy
./deploy-dev.sh
```

### Update Dependencies
```bash
cd dashboard
npm install
npm run build
cd ..

# Rebuild and restart
docker-compose -f docker-compose.react-dashboard.yml down
docker-compose -f docker-compose.react-dashboard.yml up -d --build
```

---

## 📦 Deployment Checklist

Before deploying to dev:

- [ ] All tests passing (35/35)
- [ ] Build completes successfully
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Docker and Docker Compose installed
- [ ] Ports 8080 and 9000 available

After deployment:

- [ ] Dashboard loads at http://localhost:8080
- [ ] No nginx errors in logs
- [ ] All pages navigate correctly
- [ ] API calls work (if backend running)
- [ ] Theme toggle works
- [ ] Responsive design verified

---

## 🎯 Quick Commands Reference

```bash
# Deploy
./deploy-dev.sh

# View logs
docker-compose -f docker-compose.react-dashboard.yml logs -f

# Stop
docker-compose -f docker-compose.react-dashboard.yml down

# Restart
docker-compose -f docker-compose.react-dashboard.yml restart

# Rebuild
docker-compose -f docker-compose.react-dashboard.yml build --no-cache

# Check status
docker-compose -f docker-compose.react-dashboard.yml ps

# Access container shell
docker exec -it seo-react-dashboard sh

# View resource usage
docker stats seo-react-dashboard
```

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose -f docker-compose.react-dashboard.yml logs`
2. Verify build: `ls -la dashboard/dist/`
3. Check container health: `docker ps`
4. Review nginx config: `dashboard/nginx.conf`
5. Rebuild from scratch: `./deploy-dev.sh`

---

## 🚀 Next Steps

After successful dev deployment:

1. **Test All Features**
   - Navigate all pages
   - Test CRUD operations
   - Verify API connectivity
   - Check responsive design

2. **Monitor Performance**
   - Check load times
   - Monitor memory usage
   - Review nginx logs
   - Test concurrent users

3. **Production Deployment** (Future)
   - Set up SSL/HTTPS
   - Configure domain
   - Set up CI/CD pipeline
   - Enable monitoring/alerts

---

**Deployment Status:** ✅ Ready for Dev Deployment
**Docker Images:** seo-react-dashboard:latest
**Deployment URL:** http://localhost:8080
