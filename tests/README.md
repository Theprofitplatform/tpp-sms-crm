# Test Suite

Comprehensive test suite for the SEO Automation & Monitoring Tool.

## Structure

```
tests/
├── unit/              # Unit tests for individual modules
├── integration/       # Integration tests with external services
└── fixtures/          # Mock data and test fixtures
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage report
npm run test:coverage
```

## Test Files

- **logger.test.js** - Logging functionality
- **seo-audit.test.js** - SEO audit engine (comprehensive)
- **report.test.js** - Report generation (JSON, HTML, Markdown)
- **fetch-posts.test.js** - WordPress API client
- **wordpress-api.test.js** - Integration tests (requires credentials)

## Coverage Target

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

See jest.config.js for full configuration.
