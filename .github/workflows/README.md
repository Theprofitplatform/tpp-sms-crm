# CI/CD Workflows

Automated workflows for continuous integration, testing, and deployment.

## Workflows Overview

### 1. test.yml - Automated Testing
**Triggers:** Push to main/develop, Pull requests
**What it does:**
- Runs tests on Node 18.x and 20.x
- Executes unit and integration tests
- Runs linting (if configured)
- Performs security audit
- Builds Docker image for verification

**Status:** ✅ Active

### 2. coverage.yml - Test Coverage
**Triggers:** Push to main/develop/cleanup branches, Pull requests
**What it does:**
- Generates test coverage reports
- Uploads to Codecov
- Comments coverage on PRs
- Checks coverage thresholds (60%)
- Creates coverage artifacts

**Status:** ✅ Active

### 3. code-quality.yml - Code Quality Checks
**Triggers:** Push to main/develop/cleanup branches, Pull requests
**What it does:**
- Runs ESLint
- Checks for TODO/FIXME comments
- Performs security audit
- Generates code metrics
- Counts lines of code

**Status:** ✅ Active

### 4. lint.yml - Linting
**Triggers:** Push to main/cleanup branches, Pull requests
**What it does:**
- Runs ESLint on src/ and tests/
- Checks for FIXME/TODO comments

**Status:** ✅ Active

### 5. release.yml - Release Management
**Triggers:** Git tags (v*.*.*)
**What it does:**
- Creates GitHub releases
- Generates changelog
- Builds and pushes Docker images
- Optional npm publishing

**Status:** ✅ Ready (requires tag)

### 6. docker-build.yml - Docker Image Build
**Triggers:** Push to main, Pull requests
**What it does:**
- Builds Docker images
- Tests images
- Pushes to registry (on main)

**Status:** ✅ Active

## Running Tests Locally

```bash
# Run all tests
NODE_OPTIONS=--experimental-vm-modules npm test

# Run with coverage
NODE_OPTIONS=--experimental-vm-modules npm run test:coverage

# Run only unit tests
NODE_OPTIONS=--experimental-vm-modules npm run test:unit

# Run only integration tests
NODE_OPTIONS=--experimental-vm-modules npm run test:integration
```

## ES Module Support

All test workflows use `NODE_OPTIONS=--experimental-vm-modules` for Jest ES module support.

## Coverage Thresholds

Minimum coverage requirements (enforced in jest.config.js):
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

## Docker Build

Build locally:
```bash
# Development
docker build --target development -t seo-automation:dev .

# Production
docker build --target production -t seo-automation:prod .

# Run
docker run -v $(pwd)/config/env/.env:/app/config/env/.env seo-automation:prod
```

## Security

- npm audit runs on every push
- Vulnerabilities at "moderate" level or higher will be flagged
- Audit results uploaded as artifacts

## Artifacts

Workflows generate these artifacts:
- `coverage-report` - Test coverage HTML report (30 days)
- `npm-audit-results` - Security audit JSON
- `security-audit` - Detailed security scan

## Status Badges

Add these to README.md:

```markdown
![Tests](https://github.com/YOUR_USERNAME/seo-expert/workflows/Run%20Tests/badge.svg)
![Coverage](https://github.com/YOUR_USERNAME/seo-expert/workflows/Test%20Coverage/badge.svg)
![Code Quality](https://github.com/YOUR_USERNAME/seo-expert/workflows/Code%20Quality/badge.svg)
```

## Secrets Required

For full CI/CD functionality, configure these GitHub secrets:
- `GITHUB_TOKEN` - Automatically provided
- `NPM_TOKEN` - For npm publishing (optional)
- `CODECOV_TOKEN` - For Codecov uploads (optional)

## Workflow Permissions

Required permissions:
- `contents: write` - For creating releases
- `packages: write` - For pushing Docker images
- `pull-requests: write` - For PR comments

## Troubleshooting

### Tests failing with "Cannot use import statement"
- Ensure NODE_OPTIONS=--experimental-vm-modules is set
- Check jest.config.js is properly configured

### Docker build failing
- Verify Dockerfile syntax
- Check .dockerignore excludes development files
- Ensure all source files are copied correctly

### Coverage below threshold
- Run locally: `npm run test:coverage`
- Check coverage/index.html for gaps
- Add tests for uncovered code

## Future Enhancements

- [ ] Add deployment workflow for WordPress plugin
- [ ] Integrate with Sentry for error tracking
- [ ] Add performance benchmarking
- [ ] Implement automatic dependency updates (Dependabot)
- [ ] Add browser testing (Playwright/Puppeteer)
