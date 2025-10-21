# Quick Reference Card

**Essential commands and common tasks**

---

## Installation

```bash
npm install
cp config/env/.env.example config/env/.env
# Edit .env with your credentials
```

---

## Running

```bash
# SEO Audit
npm start

# Monitor rankings
npm run monitor

# Run tests
NODE_OPTIONS=--experimental-vm-modules npm test

# Run tests with coverage
NODE_OPTIONS=--experimental-vm-modules npm run test:coverage
```

---

## Testing

```bash
# All tests
NODE_OPTIONS=--experimental-vm-modules npm test

# Unit tests only
NODE_OPTIONS=--experimental-vm-modules npm run test:unit

# Integration tests only
NODE_OPTIONS=--experimental-vm-modules npm run test:integration

# With coverage report
NODE_OPTIONS=--experimental-vm-modules npm run test:coverage
```

---

## Docker

```bash
# Build production image
docker build -t seo-automation:prod .

# Run container
docker run -v $(pwd)/config/env/.env:/app/config/env/.env seo-automation:prod

# Build and run development
docker build --target development -t seo-automation:dev .
docker run -it seo-automation:dev
```

---

## Git Workflow

```bash
# Check status
git status

# Create branch
git checkout -b feature/my-feature

# Stage and commit
git add .
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature/my-feature
```

---

## Common File Locations

```
config/env/.env              # Environment variables
src/audit/seo-audit.js       # Main audit engine
src/deployment/              # WordPress deployment scripts
tests/                       # Test suite
logs/                        # Application logs
docs/                        # Documentation
.github/workflows/           # CI/CD pipelines
```

---

## Environment Variables

```env
WORDPRESS_URL=https://your-site.com
WORDPRESS_USER=your-username
WORDPRESS_APP_PASSWORD=your-app-password

NODE_ENV=development
LOG_LEVEL=info
```

---

## Troubleshooting

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear logs
rm -rf logs/*

# Check WordPress connection
curl https://your-site.com/wp-json/wp/v2/posts
```

---

## Useful Links

- [Full Documentation](../INDEX.md)
- [Getting Started](../setup/GETTING-STARTED.md)
- [Troubleshooting](../guides/TROUBLESHOOTING.md)
- [API Reference](../api/WORDPRESS-REST-API.md)
