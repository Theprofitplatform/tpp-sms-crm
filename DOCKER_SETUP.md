# Docker Setup Guide - SEO Automation Platform

## Quick Start

### Option 1: Build and Run (Recommended for first time)

```bash
# Build the Docker image
docker build -f Dockerfile.dashboard -t seo-automation-dashboard:latest .

# Run the container
docker run -d \
  --name seo-dashboard \
  -p 3001:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  seo-automation-dashboard:latest

# Check logs
docker logs -f seo-dashboard

# Access at: http://localhost:3001
```

### Option 2: Docker Compose (Recommended for production)

```bash
# Start the platform
docker-compose -f docker-compose.dashboard.yml up -d

# View logs
docker-compose -f docker-compose.dashboard.yml logs -f

# Stop the platform
docker-compose -f docker-compose.dashboard.yml down

# Rebuild after code changes
docker-compose -f docker-compose.dashboard.yml up -d --build
```

## Environment Variables

Create a `.env` file with:

```env
PORT=3000
NODE_ENV=production
DASHBOARD_URL=http://localhost:3001

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Company Info
FROM_EMAIL=hello@yourcompany.com
FROM_NAME=Your Company
COMPANY_NAME=Your Company

# Security
JWT_SECRET=your-random-secret-key-here

# Database
DATABASE_PATH=./data/seo-automation.db

# Automation (optional)
RANK_TRACKING_ENABLED=false
LOCAL_SEO_ENABLED=false
DISCORD_NOTIFICATIONS_ENABLED=false
```

## Useful Commands

### Container Management

```bash
# Start container
docker start seo-dashboard

# Stop container
docker stop seo-dashboard

# Restart container
docker restart seo-dashboard

# Remove container
docker rm -f seo-dashboard
```

### Logs and Debugging

```bash
# View logs (last 100 lines)
docker logs --tail 100 seo-dashboard

# Follow logs in real-time
docker logs -f seo-dashboard

# Execute command inside container
docker exec -it seo-dashboard sh

# Check container status
docker ps -a | grep seo-dashboard

# Check resource usage
docker stats seo-dashboard
```

### Database Management

```bash
# Backup database
docker cp seo-dashboard:/app/data/seo-automation.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup.db seo-dashboard:/app/data/seo-automation.db
docker restart seo-dashboard
```

## Port Configuration

By default:
- **Container** listens on port `3000`
- **Host** maps to port `3001`

To change host port, edit `docker-compose.dashboard.yml`:

```yaml
ports:
  - "8080:3000"  # Now accessible at http://localhost:8080
```

## Data Persistence

Data is persisted in volumes:
- `./data` - SQLite database
- `./logs` - Application logs

These directories are automatically created and mapped.

## Production Deployment

### SSL/HTTPS with Nginx

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://dashboard:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then add to `docker-compose.dashboard.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - dashboard
    networks:
      - seo-network
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001
# or
netstat -tulpn | grep 3001

# Kill the process
kill -9 <PID>
```

### Container Won't Start

```bash
# Check logs
docker logs seo-dashboard

# Check if port is available
docker port seo-dashboard

# Rebuild from scratch
docker-compose -f docker-compose.dashboard.yml down
docker-compose -f docker-compose.dashboard.yml build --no-cache
docker-compose -f docker-compose.dashboard.yml up -d
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
rm -f data/seo-automation.db
docker restart seo-dashboard
```

### Permission Issues

```bash
# Fix permissions
sudo chown -R $USER:$USER data logs
chmod -R 755 data logs
```

## Health Checks

The container includes automatic health checks:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' seo-dashboard

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' seo-dashboard
```

## Resource Limits

Current limits (configurable in docker-compose.dashboard.yml):
- **CPU**: 2 cores max, 1 core reserved
- **Memory**: 2GB max, 512MB reserved

Adjust based on your needs:

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'
      memory: 4G
```

## Monitoring

### Prometheus Metrics (Optional)

Add to your docker-compose file:

```yaml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
```

### Uptime Monitoring

Use external services:
- UptimeRobot
- Pingdom
- StatusCake

Monitor URL: `http://yourdomain.com/`

## Backup Strategy

Automated daily backups:

```bash
# Add to crontab
0 2 * * * docker exec seo-dashboard cp /app/data/seo-automation.db /app/data/backup-$(date +\%Y\%m\%d).db
```

Or use Docker volume backups:

```bash
docker run --rm \
  -v seo-dashboard_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz /data
```

## Performance Tips

1. **Use volumes for data** (not bind mounts on Windows)
2. **Enable BuildKit** for faster builds:
   ```bash
   export DOCKER_BUILDKIT=1
   ```
3. **Multi-stage builds** already configured for smaller images
4. **Health checks** ensure automatic restart on failures

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong passwords
- [ ] Enable HTTPS in production
- [ ] Limit container resources
- [ ] Run as non-root user (already configured)
- [ ] Keep Docker images updated
- [ ] Use secrets for sensitive data
- [ ] Enable Docker content trust

## Next Steps

After deploying with Docker:

1. Access dashboard at http://localhost:3001
2. Login with admin credentials
3. Configure email SMTP settings
4. Add your first client
5. Set up monitoring
6. Configure backups
7. Plan production deployment

---

**Need help?** Check the main documentation in `docs/` folder.
