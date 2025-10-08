# Cloudflare Configuration Guide

## DNS Setup

### Domain Configuration
1. **Add Domain to Cloudflare**
   - Point your domain's nameservers to Cloudflare
   - Enable proxy (orange cloud) for all subdomains

2. **DNS Records**
```
Type    Name              Value                    Proxy
A       api.yourdomain.com  YOUR_VPS_IP             Yes
A       app.yourdomain.com  (Cloudflare Pages)      Yes
A       links.yourdomain.com (Cloudflare Worker)    Yes
CNAME   www.yourdomain.com  app.yourdomain.com      Yes
```

## Worker Routes

### Shortener Worker
- Route: `links.yourdomain.com/*`
- Worker: `sms-crm-shortener`

### API Proxy (Optional)
- Route: `api.yourdomain.com/*`
- Worker: `sms-crm-api-proxy` (if using Workers for API)

## Security Settings

### Firewall Rules
1. **Block Bots**
```
Rule: (cf.client.bot) or (http.user_agent contains "bot")
Action: Block
```

2. **Rate Limiting**
```
Rule: All requests to api.yourdomain.com
Threshold: 100 requests per minute per IP
Action: Block for 10 minutes
```

3. **Country Blocking**
```
Rule: (ip.geoip.country ne "US") and (ip.geoip.country ne "AU")
Action: Challenge (CAPTCHA)
```

### WAF Managed Rules
- Enable all OWASP rules
- Enable Cloudflare Managed Ruleset
- Enable Bot Fight Mode

## SSL/TLS Settings

### Edge Certificates
- Always Use HTTPS: **On**
- Minimum TLS Version: **TLS 1.2**
- Opportunistic Encryption: **On**
- TLS 1.3: **On**

### Origin Certificates
- Generate Cloudflare Origin Certificate
- Install on your VPS
- Update nginx to use origin certificate

## Performance Settings

### Caching
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 1 hour
- Always Online: **On**

### Optimization
- Auto Minify: **On** (JS, CSS, HTML)
- Brotli: **On**
- Rocket Loader: **Off** (breaks some JS)

## Page Rules

### API Rules
```
URL: api.yourdomain.com/*
Settings:
- Cache Level: Bypass
- Security Level: High
- Browser Integrity Check: On
```

### Web App Rules
```
URL: app.yourdomain.com/*
Settings:
- Cache Level: Standard
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 1 hour
```

## Worker Configuration

### Shortener Worker
- Bindings: D1 Database
- Environment Variables:
  - `API_BASE_URL`: https://api.yourdomain.com

### API Proxy Worker (Optional)
```javascript
// src/api-proxy.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Proxy to VPS API
    const targetUrl = `http://YOUR_VPS_IP:3000${url.pathname}${url.search}`

    return fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
}
```

## Monitoring & Analytics

### Cloudflare Analytics
- Enable Web Analytics
- Review Security Events
- Monitor Rate Limiting

### Health Checks
- Set up health checks for API endpoints
- Monitor worker errors
- Set up alerts for downtime

## Migration Steps

### Phase 1: DNS Migration
1. Point domain to Cloudflare
2. Set up DNS records
3. Enable SSL/TLS

### Phase 2: Worker Deployment
1. Deploy shortener worker
2. Test redirect functionality
3. Update API to use new shortener

### Phase 3: Security Hardening
1. Configure WAF rules
2. Set up rate limiting
3. Enable bot protection

### Phase 4: Performance Optimization
1. Configure caching
2. Set up page rules
3. Monitor performance

## Troubleshooting

### Common Issues

**SSL Errors**
- Verify origin certificate installed on VPS
- Check nginx SSL configuration

**Worker Errors**
- Check D1 database binding
- Verify environment variables

**DNS Issues**
- Ensure nameservers are properly configured
- Check DNS propagation