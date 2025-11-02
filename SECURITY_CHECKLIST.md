# SEO Automation Platform - Security Checklist

## Pre-Deployment Security Requirements

### 1. Environment Variables (.env)

**CRITICAL** - The following variables MUST be changed before production deployment:

```bash
# Generate secure secrets:
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For API_KEY_SALT
```

#### Required Changes:

1. **JWT_SECRET**
   - Current: Uses predictable or example value
   - Required: 32-byte random string
   - Generate: `openssl rand -base64 32`
   - Used for: Authentication tokens

2. **POSTGRES_PASSWORD**
   - Current: `CHANGE_THIS_PASSWORD_IN_PRODUCTION`
   - Required: Strong random password
   - Generate: `openssl rand -base64 32`
   - Used for: PostgreSQL database access

3. **API_KEY_SALT**
   - Current: Not set or example value
   - Required: 32-byte random string
   - Generate: `openssl rand -base64 32`
   - Used for: API key generation

4. **SMTP Credentials**
   - Update with real SMTP provider (SendGrid, AWS SES, etc.)
   - Never use test/placeholder credentials in production

5. **Cloudflare Tunnel Token**
   - Verify token is valid and active
   - Get from: https://one.dash.cloudflare.com/

### 2. Database Security

- [ ] Change default PostgreSQL password
- [ ] Enable SSL/TLS for database connections
- [ ] Restrict database access to application IP only
- [ ] Set up regular automated backups
- [ ] Enable query logging for security auditing

### 3. API Security

- [ ] Rate limiting enabled (configured in dashboard-server.js)
- [ ] Helmet.js security headers active
- [ ] CORS properly configured for production domains
- [ ] API keys rotated regularly
- [ ] No debug/verbose logging in production

### 4. Server Security

- [ ] NODE_ENV set to 'production'
- [ ] Server running as non-root user
- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key authentication only (no password auth)
- [ ] Regular security updates applied
- [ ] PM2 process limits configured

### 5. Monitoring & Alerts

- [ ] Health check endpoints monitored
- [ ] Error tracking configured (Sentry or similar)
- [ ] Log aggregation set up
- [ ] Uptime monitoring active
- [ ] Security alerts configured

### 6. Backup & Recovery

- [ ] Database backup schedule active
- [ ] Backup encryption enabled
- [ ] Recovery procedure documented and tested
- [ ] Offsite backup storage configured

### 7. Access Control

- [ ] Change default admin passwords
- [ ] Enable 2FA for admin accounts
- [ ] Regular access audit
- [ ] Principle of least privilege applied
- [ ] API keys properly scoped

## Post-Deployment Verification

Run these commands to verify security:

```bash
# Check if secrets were changed
npm run prod:health

# Verify JWT secret is not default
ssh tpp-vps 'grep JWT_SECRET ~/projects/seo-expert/.env | grep -v CHANGE_THIS'

# Check PostgreSQL password
ssh tpp-vps 'grep POSTGRES_PASSWORD ~/projects/seo-expert/.env | grep -v CHANGE_THIS'

# Verify rate limiting is active
curl -I https://seodashboard.theprofitplatform.com.au/api/v2/health | grep -i "x-ratelimit"

# Check security headers
curl -I https://seodashboard.theprofitplatform.com.au | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security"
```

## Emergency Contacts

- **System Administrator**: [Contact Info]
- **Security Team**: [Contact Info]
- **On-Call Rotation**: [Schedule/Contact]

## Incident Response

1. Immediate actions for security breach:
   - Rotate all secrets (JWT, API keys, DB passwords)
   - Review access logs
   - Notify stakeholders
   - Document incident

2. Recovery steps:
   - Restore from known-good backup
   - Apply security patches
   - Update monitoring
   - Post-mortem analysis

## Regular Security Tasks

- **Daily**: Review error logs and failed auth attempts
- **Weekly**: Check for dependency updates and security advisories
- **Monthly**: Full security audit and penetration testing
- **Quarterly**: Rotate API keys and review access permissions

## Compliance

- [ ] GDPR compliance verified
- [ ] CAN-SPAM compliance (email unsubscribe links)
- [ ] Data retention policies documented
- [ ] Privacy policy updated
- [ ] Terms of service reviewed

---

**Last Updated**: November 2, 2025
**Next Review**: December 2, 2025
