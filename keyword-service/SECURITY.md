# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of our keyword research tool seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email security@theprofitplatform.com with:

1. **Type of issue** (e.g., API key exposure, SQL injection, XSS, etc.)
2. **Full paths** of source file(s) related to the vulnerability
3. **Location** of the affected source code (tag/branch/commit or direct URL)
4. **Step-by-step instructions** to reproduce the issue
5. **Proof-of-concept or exploit code** (if possible)
6. **Impact** of the issue, including how an attacker might exploit it

### What to Expect

- **Initial Response**: Within 48 hours
- **Progress Update**: Within 7 days with our evaluation and next steps
- **Resolution Timeline**: We aim to release patches within 30 days
- **Credit**: We will acknowledge your contribution in release notes (unless you prefer to remain anonymous)

## Security Best Practices

### API Key Management

- **NEVER** commit API keys to version control
- Use `.env` files (excluded via `.gitignore`)
- Rotate API keys quarterly
- Use separate keys for development and production
- Revoke unused keys immediately

### Environment Variables

Required security settings in `.env`:

```env
# API Keys (REQUIRED - keep secret)
SERPAPI_API_KEY=secret_key_here

# Optional API Keys
GOOGLE_ADS_DEVELOPER_TOKEN=secret
GOOGLE_OAUTH_CLIENT_ID=secret
GOOGLE_OAUTH_CLIENT_SECRET=secret
NOTION_API_KEY=secret

# Database (use strong passwords in production)
DATABASE_URL=sqlite:///keyword_research.db

# Rate Limiting (prevent abuse)
SERP_API_RPM=20
AUTOSUGGEST_RPM=10
TRENDS_RPM=60

# Telemetry (opt-out if needed)
ENABLE_TELEMETRY=false
TELEMETRY_ENDPOINT=none
```

### File Permissions

Ensure sensitive files have restricted permissions:

```bash
chmod 600 .env
chmod 600 *.db
chmod 700 data/raw/
```

### Data Privacy

This tool:

- **Does NOT collect PII** unless you explicitly include it in seed keywords
- **Logs API requests** for debugging (can be disabled with `ENABLE_AUDIT_LOG=false`)
- **Caches SERP data** locally (can be cleared with `python cli.py clear-cache`)
- **Supports data deletion** via `python cli.py delete <project_id>`

### Compliance

#### Terms of Service

We use the following third-party services:

1. **SerpAPI**: [TOS](https://serpapi.com/terms) - Commercial use allowed
2. **Google Trends**: [TOS](https://policies.google.com/terms) - Free tier limits apply
3. **Google Ads API**: [TOS](https://developers.google.com/google-ads/api/docs/terms-of-service) - Developer token required
4. **Notion API**: [TOS](https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac)

**Your Responsibility**: Ensure your usage complies with each provider's TOS.

#### Rate Limiting

We implement token-bucket rate limiting to prevent:
- Exceeding provider quotas
- Unintentional denial-of-service
- Quota exhaustion

Default limits (configurable in `.env`):
- SerpAPI: 20 requests/minute
- Autosuggest: 10 requests/minute  
- Google Trends: 60 requests/minute

#### Data Source Ledger

All API calls are logged to audit trail:
- Timestamp
- Provider
- Query parameters
- Response status
- Quota consumed

Access logs: `SELECT * FROM audit_logs ORDER BY timestamp DESC`

### Offline Mode

Run without internet access:

```bash
# Use only cached SERP data and skip metrics
python cli.py create --name "Offline Project" \
  --seeds "keyword1,keyword2" \
  --offline-mode \
  --skip-metrics
```

This mode:
- Uses cached SERP data (if available)
- Skips trend analysis
- Performs clustering and brief generation locally
- No API calls made

### Secrets Rotation

#### Monthly (High Risk)
- SerpAPI keys
- Google OAuth tokens
- Notion API keys

#### Quarterly (Medium Risk)
- Database passwords
- Service account credentials

#### Procedure
1. Generate new credentials in provider dashboard
2. Update `.env` file
3. Test with dry run: `python cli.py test-connection`
4. Revoke old credentials after 24 hours

### Network Security

#### Firewall Rules (Production)

Allow outbound HTTPS only to:
- `serpapi.com`
- `googleapis.com`
- `api.notion.com`
- `trends.google.com`

#### TLS/SSL

All API communications use TLS 1.2+:
- Certificate validation enabled
- No self-signed certificates accepted
- HTTPS enforced for all external calls

### Database Security

#### SQLite (Development)
- File-based (keyword_research.db)
- OS-level file permissions
- No network exposure

#### PostgreSQL (Production - Future)
- Encrypted connections (SSL/TLS)
- Strong passwords (16+ characters)
- Principle of least privilege
- Regular backups encrypted at rest

### Dependency Security

We monitor dependencies for vulnerabilities:

```bash
# Check for known vulnerabilities
pip install safety
safety check -r requirements.txt

# Update dependencies
pip install --upgrade -r requirements.txt

# Generate new constraints
pip freeze > constraints.txt
```

### Audit Logging

All operations are logged:

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    operation TEXT,  -- create, export, delete, api_call
    user TEXT,
    project_id INTEGER,
    provider TEXT,
    query_params TEXT,
    status TEXT,  -- success, failure, partial
    quota_consumed INTEGER,
    error_message TEXT
);
```

Query logs:
```bash
python cli.py audit --operation api_call --last 24h
```

### Incident Response

If you suspect a security incident:

1. **Isolate**: Stop running processes
2. **Rotate**: Change all API keys immediately
3. **Analyze**: Review audit logs for suspicious activity
4. **Report**: Email security@theprofitplatform.com
5. **Document**: Record timeline and actions taken

### Known Limitations

#### Current Version (0.1.x)

- **No encryption at rest** for SQLite database
- **No multi-user authentication** (single-tenant CLI)
- **API keys in environment** (not using secrets manager)
- **No request signing** (relies on HTTPS)

These will be addressed in future releases.

### Security Checklist

Before deployment:

- [ ] All API keys in `.env` (not in code)
- [ ] `.env` file has 600 permissions
- [ ] `.env` excluded in `.gitignore`
- [ ] Strong database password (if using Postgres)
- [ ] Rate limits configured appropriately
- [ ] Audit logging enabled
- [ ] Dependencies updated (`pip list --outdated`)
- [ ] Vulnerability scan passed (`safety check`)
- [ ] Test with dry run first
- [ ] Backup database before major operations
- [ ] Document any deviations from best practices

### Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security.html)
- [SQLAlchemy Security](https://docs.sqlalchemy.org/en/20/faq/security.html)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

### Contact

For security inquiries: security@theprofitplatform.com

For general support: support@theprofitplatform.com

---

**Last Updated**: 2025-10-24  
**Next Review**: 2026-01-24
