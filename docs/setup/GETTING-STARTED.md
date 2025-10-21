# Getting Started Guide

**Version:** 2.0.0  
**Last Updated:** October 18, 2025

Complete setup guide for the SEO Automation & Monitoring Tool.

---

## Prerequisites

- **Node.js:** 18.x or 20.x
- **npm:** 9.0.0 or higher
- **Git:** For version control
- **WordPress site** with REST API enabled
- **WordPress Application Password** for API authentication

---

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/seo-expert.git
cd seo-expert

# 2. Install dependencies
npm install

# 3. Configure environment
cp config/env/.env.example config/env/.env
nano config/env/.env  # Edit with your credentials

# 4. Test the setup
NODE_OPTIONS=--experimental-vm-modules npm test

# 5. Run your first audit
npm start
```

---

## Detailed Setup

### 1. Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/seo-expert.git
cd seo-expert

# Install all dependencies
npm install

# Verify installation
node --version  # Should be 18.x or 20.x
npm --version   # Should be 9.x or higher
```

### 2. WordPress Configuration

#### Create Application Password

1. Log into WordPress admin
2. Go to **Users → Profile**
3. Scroll to **Application Passwords**
4. Enter name: "SEO Automation Tool"
5. Click **Add New Application Password**
6. **Copy the password** (you won't see it again!)

#### Enable REST API

WordPress REST API is enabled by default. Test it:

```bash
curl https://your-site.com/wp-json/wp/v2/posts
```

If you get JSON response, you're good!

### 3. Environment Configuration

Create your environment file:

```bash
cp config/env/.env.example config/env/.env
```

Edit `config/env/.env`:

```env
# WordPress Configuration
WORDPRESS_URL=https://your-site.com
WORDPRESS_USER=your-username
WORDPRESS_APP_PASSWORD=your-app-password-here

# Optional: API Keys
PAGESPEED_API_KEY=your-api-key
SERPAPI_KEY=your-serpapi-key

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

**Security:** Never commit `.env` to git! It's in `.gitignore`.

### 4. Verify Setup

Run the test suite:

```bash
# Run all tests
NODE_OPTIONS=--experimental-vm-modules npm test

# Run only unit tests
NODE_OPTIONS=--experimental-vm-modules npm run test:unit

# Check WordPress connection
node src/audit/fetch-posts.js
```

If tests pass, you're ready!

---

## Project Structure

```
seo-expert/
├── src/                    # Source code
│   ├── api/               # API clients
│   ├── audit/             # SEO audit engines
│   ├── monitoring/        # Ranking monitors
│   ├── deployment/        # WordPress deployment scripts
│   └── utils/             # Utility functions
├── tests/                 # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Mock data
├── config/               # Configuration
│   └── env/             # Environment variables
├── docs/                # Documentation
├── .github/             # CI/CD workflows
└── logs/                # Application logs
```

---

## Common Tasks

### Run SEO Audit

```bash
npm start
# or
node src/audit/seo-audit.js
```

### Monitor Rankings

```bash
npm run monitor
# or
node src/monitoring/monitor-rankings.js
```

### Generate Reports

```bash
node src/audit/report.js
```

### Deploy Schema Fix

```bash
node src/deployment/deploy-schema-fixer-v1.1.0.js
```

---

## Testing

```bash
# All tests
NODE_OPTIONS=--experimental-vm-modules npm test

# With coverage
NODE_OPTIONS=--experimental-vm-modules npm run test:coverage

# Unit tests only
NODE_OPTIONS=--experimental-vm-modules npm run test:unit

# Integration tests only
NODE_OPTIONS=--experimental-vm-modules npm run test:integration
```

**Note:** ES module support requires `NODE_OPTIONS=--experimental-vm-modules` flag.

---

## Docker Setup

### Build Image

```bash
# Development
docker build --target development -t seo-automation:dev .

# Production
docker build --target production -t seo-automation:prod .
```

### Run Container

```bash
docker run -v $(pwd)/config/env/.env:/app/config/env/.env seo-automation:prod
```

See [DOCKER-SETUP.md](DOCKER-SETUP.md) for details.

---

## Troubleshooting

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### WordPress API authentication fails

1. Verify credentials in `.env`
2. Test API manually: `curl https://site.com/wp-json/wp/v2/posts`
3. Check application password is correct
4. Ensure REST API is not disabled by security plugin

### Jest "Cannot use import statement" error

Always use the NODE_OPTIONS flag:

```bash
NODE_OPTIONS=--experimental-vm-modules npm test
```

### Missing .env file

```bash
cp config/env/.env.example config/env/.env
# Then edit with your credentials
```

---

## Next Steps

1. ✅ Setup complete → [Run SEO Audit](../guides/SEO-AUDIT-GUIDE.md)
2. Configure automation → [Automation Guide](../guides/AUTOMATION-GUIDE.md)
3. Fix schema errors → [Schema Fix Guide](../guides/SCHEMA-FIX-GUIDE.md)
4. Set up monitoring → [Monitoring Guide](../guides/MONITORING-GUIDE.md)

---

## Support

- **Documentation:** [docs/INDEX.md](../INDEX.md)
- **Troubleshooting:** [guides/TROUBLESHOOTING.md](../guides/TROUBLESHOOTING.md)
- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/seo-expert/issues)
- **Tests:** [tests/README.md](../../tests/README.md)

---

**Ready to go!** Start with: `npm start`
