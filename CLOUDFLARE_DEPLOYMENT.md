# Cloudflare Deployment Guide

This guide explains how to deploy the SMS CRM application using Cloudflare for improved performance, security, and global distribution.

## Architecture Overview

### New Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │     VPS         │
│                 │    │                 │
│  ┌─────────────┐│    │  ┌─────────────┐│
│  │   Pages     ││    │  │    API      ││
│  │ (Web App)   ││◄───┼──│             ││
│  └─────────────┘│    │  └─────────────┘│
│                 │    │                 │
│  ┌─────────────┐│    │  ┌─────────────┐│
│  │  Workers    ││    │  │   Worker    ││
│  │(Shortener)  ││    │  │(SMS Queue)  ││
│  └─────────────┘│    │  └─────────────┘│
│                 │    │                 │
│  ┌─────────────┐│    │  ┌─────────────┐│
│  │     D1      ││    │  │  Postgres   ││
│  │  Database   ││    │  │             ││
│  └─────────────┘│    │  └─────────────┘│
└─────────────────┘    │                 │
                       │  ┌─────────────┐│
                       │  │   Redis     ││
                       │  │             ││
                       │  └─────────────┘│
                       └─────────────────┘
```

### Services Distribution
- **Cloudflare Pages**: Next.js web app (global CDN)
- **Cloudflare Workers**: Short link service (edge computing)
- **Cloudflare D1**: Short link database (edge database)
- **VPS**: API server, SMS worker, Postgres, Redis (backend services)

## Setup Instructions

### Prerequisites
1. Cloudflare account
2. Domain configured with Cloudflare
3. VPS with Docker (for API/Worker)
4. GitHub repository

### Step 1: Initial Cloudflare Setup

1. **Login to Cloudflare**
   ```bash
   cd infra
   bash setup-cloudflare.sh
   ```

2. **Configure DNS**
   - Point domain to Cloudflare nameservers
   - Add DNS records:
     - `A api.yourdomain.com` → Your VPS IP
     - `CNAME app.yourdomain.com` → Cloudflare Pages URL
     - `CNAME links.yourdomain.com` → Worker URL

### Step 2: GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages/Workers permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `SSH_PRIVATE_KEY` | SSH key for VPS deployment |
| `SSH_HOST` | VPS IP/hostname |
| `SSH_USER` | SSH username |
| `DEPLOY_PATH` | Project path on VPS |
| `WEB_URL` | Web app URL (e.g., https://app.yourdomain.com) |
| `API_URL` | API URL (e.g., https://api.yourdomain.com) |
| `SHORTENER_URL` | Shortener URL (e.g., https://links.yourdomain.com) |

### Step 3: Cloudflare Pages Setup

1. Go to Cloudflare Dashboard → Pages
2. Connect your GitHub repository
3. Configure build settings:
   - **Build directory**: `apps/web`
   - **Build command**: `pnpm run build`
   - **Build output directory**: `.next`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: https://api.yourdomain.com
   - `NODE_ENV`: production

### Step 4: Shortener Worker Setup

1. **Create D1 Database**
   ```bash
   cd worker/shortener-cloudflare
   wrangler d1 create sms-crm-shortener
   ```

2. **Update wrangler.toml** with the database ID

3. **Apply Schema**
   ```bash
   wrangler d1 execute sms-crm-shortener --file=./schema.sql
   ```

4. **Deploy Worker**
   ```bash
   wrangler deploy
   ```

### Step 5: Security Configuration

In Cloudflare Dashboard:

1. **SSL/TLS**
   - SSL/TLS encryption mode: **Full (strict)**
   - Always use HTTPS: **On**
   - Minimum TLS version: **TLS 1.2**

2. **Firewall**
   - Enable WAF Managed Rules
   - Enable Bot Fight Mode
   - Configure rate limiting

3. **Page Rules**
   - `api.yourdomain.com/*` → Cache Level: Bypass
   - `app.yourdomain.com/*` → Cache Level: Standard

## Deployment Workflow

### Automated Deployment

When you push to `main` branch:

1. **CI Tests** → Runs linting, tests, builds
2. **Cloudflare Pages** → Deploys web app
3. **Cloudflare Workers** → Deploys shortener
4. **VPS Deployment** → Deploys API and SMS worker
5. **Health Checks** → Verifies all services

### Manual Deployment

```bash
# Deploy web app to Cloudflare Pages
cd apps/web
# (Automated via GitHub Actions)

# Deploy shortener worker
cd worker/shortener-cloudflare
wrangler deploy

# Deploy API to VPS
cd infra
bash deploy.sh
```

## Environment Configuration

### Web App (Cloudflare Pages)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

### Shortener Worker
```toml
# wrangler.toml
[env.production]
API_BASE_URL = "https://api.yourdomain.com"
```

### API (VPS)
```env
# .env.production
DATABASE_URL=postgresql://user:pass@postgres:5432/smscrm
REDIS_URL=redis://:password@redis:6379
API_BASE_URL=https://api.yourdomain.com
WEB_URL=https://app.yourdomain.com
SHORT_DOMAIN=links.yourdomain.com
```

## Migration from VPS to Cloudflare

### Phase 1: Web App Migration
1. Deploy web app to Cloudflare Pages
2. Update DNS to point to Cloudflare
3. Test web app functionality

### Phase 2: Shortener Migration
1. Deploy shortener worker
2. Update API to use new shortener URLs
3. Migrate short link data to D1
4. Test redirect functionality

### Phase 3: Security Hardening
1. Configure Cloudflare WAF
2. Set up rate limiting
3. Enable bot protection
4. Configure SSL/TLS

## Performance Benefits

### Global Distribution
- **Web App**: Served from 300+ edge locations
- **Short Links**: Redirects processed at edge
- **API**: Protected by global CDN

### Security Features
- **DDoS Protection**: Enterprise-grade mitigation
- **WAF**: Web Application Firewall
- **Bot Management**: Advanced bot detection
- **Rate Limiting**: Global rate limiting

### Cost Optimization
- **Pay-per-request**: Only pay for what you use
- **No server maintenance**: Managed infrastructure
- **Free SSL**: Automatic certificate management

## Monitoring and Troubleshooting

### Cloudflare Analytics
- **Web Analytics**: Page views and performance
- **Security Events**: WAF and firewall events
- **Worker Metrics**: Shortener performance

### Health Checks
```bash
# Web app
curl https://app.yourdomain.com/health

# API
curl https://api.yourdomain.com/health

# Shortener
curl https://links.yourdomain.com/health
```

### Common Issues

**SSL Certificate Errors**
- Verify Cloudflare SSL/TLS settings
- Check origin certificate on VPS

**Worker Deployment Failures**
- Check D1 database binding
- Verify environment variables

**DNS Propagation**
- Wait 24-48 hours for full propagation
- Check Cloudflare DNS settings

## Rollback Procedures

### Web App Rollback
1. Go to Cloudflare Pages → Deployments
2. Select previous deployment
3. Click "Rollback to this deployment"

### Worker Rollback
```bash
cd worker/shortener-cloudflare
git checkout <previous-commit>
wrangler deploy
```

### API Rollback
```bash
cd infra
git checkout <previous-commit>
bash deploy.sh
```

## Cost Estimation

### Cloudflare Costs
- **Pages**: Free for personal use, $5/month for teams
- **Workers**: $5/month for 10M requests
- **D1**: $5/month for 5M rows
- **Security**: Included in all plans

### VPS Costs
- Same as before (API, Postgres, Redis)
- Reduced bandwidth costs (CDN handles static assets)

## Support and Resources

- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Pages Documentation](https://developers.cloudflare.com/pages/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)

## Migration Checklist

- [ ] Cloudflare account setup
- [ ] Domain transferred to Cloudflare
- [ ] DNS records configured
- [ ] GitHub secrets added
- [ ] Web app deployed to Pages
- [ ] Shortener worker deployed
- [ ] D1 database created
- [ ] Security settings configured
- [ ] Health checks passing
- [ ] End-to-end testing completed