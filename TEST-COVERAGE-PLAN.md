# Test Coverage Expansion Plan

**Current Coverage:** 1.18%
**Target Coverage:** 80%+
**Gap:** 78.82 percentage points
**Estimated Tests Needed:** 150-200 test cases
**Priority:** CRITICAL

---

## 📊 Current State Analysis

### Test Infrastructure
- ✅ Jest configured for ES modules
- ✅ 7 test files exist (7 unit, 1 integration)
- ⚠️ 16 tests failing, 8 passing (24 total)
- ❌ Only `logger.js` has meaningful coverage (90.9%)

### Coverage by Module Type

| Module Type | Files | Current Coverage | Priority |
|-------------|-------|------------------|----------|
| **Audit** | 16 files | ~0% | HIGH |
| **Monitoring** | 5 files | 0% | MEDIUM |
| **Deployment** | 11 files | 0% (excluded) | LOW |
| **Utils** | 7 files | 0% | LOW |

---

## 🎯 Testing Strategy

### Test Pyramid Distribution

```
        /\
       /E2E\        (10%) - 15-20 tests
      /------\
     /Integration\  (30%) - 50-60 tests
    /------------\
   /  Unit Tests  \ (60%) - 90-120 tests
  /----------------\
```

### Coverage Targets by Phase

| Phase | Duration | Target Coverage | Modules |
|-------|----------|----------------|---------|
| **Phase 1** | Week 1 | 30% | Critical path (logger, fetch-posts, seo-audit) |
| **Phase 2** | Week 2 | 50% | Core audit modules |
| **Phase 3** | Week 3 | 70% | Monitoring + remaining audit |
| **Phase 4** | Week 4 | 80%+ | Integration tests + edge cases |

---

## 📋 Module Priority Matrix

### Priority 1: Critical Path (Target: Week 1)

**Must test first - core functionality**

1. **✅ `logger.js`** - 90.9% coverage (DONE)
   - Already well-tested
   - Just needs minor fixes

2. **`fetch-posts.js`** - 0% coverage
   - Fetches WordPress posts via REST API
   - Critical for all audit operations
   - **Tests needed:** 15-20
   - **Priority:** CRITICAL

3. **`seo-audit.js`** - 0% coverage
   - Main SEO audit engine
   - Analyzes posts for SEO issues
   - **Tests needed:** 25-30
   - **Priority:** CRITICAL

4. **`report.js`** - 7.86% coverage
   - Generates audit reports
   - Already has some tests (failing)
   - **Tests needed:** 20-25
   - **Priority:** HIGH

---

### Priority 2: Core Audit Modules (Target: Week 2)

5. **`ai-content-optimizer.js`** - 0% coverage
   - Multi-AI integration (Claude, GPT-4, Gemini)
   - Content optimization suggestions
   - **Tests needed:** 30-35
   - **Priority:** HIGH

6. **`technical-audit.js`** - 0% coverage
   - Technical SEO checks
   - Page speed, meta tags, structured data
   - **Tests needed:** 20-25
   - **Priority:** HIGH

7. **`competitor-analysis.js`** - 0% coverage
   - SERP analysis via APIs
   - Competitor insights
   - **Tests needed:** 20-25
   - **Priority:** MEDIUM

8. **`discord-notifier.js`** - 0% coverage
   - Sends notifications to Discord
   - Error reporting
   - **Tests needed:** 10-15
   - **Priority:** MEDIUM

---

### Priority 3: Monitoring Modules (Target: Week 3)

9. **`health-check.js`** - 0% coverage
   - System health monitoring
   - WordPress connectivity
   - **Tests needed:** 15-20
   - **Priority:** MEDIUM

10. **`monitor-rankings.js`** - 0% coverage
    - Keyword ranking tracking
    - SERP position monitoring
    - **Tests needed:** 20-25
    - **Priority:** MEDIUM

11. **`performance-monitor.js`** - 0% coverage
    - Page speed tracking
    - Core Web Vitals
    - **Tests needed:** 15-20
    - **Priority:** LOW

12. **`error-tracker.js`** - 0% coverage
    - Error logging and tracking
    - **Tests needed:** 15-20
    - **Priority:** LOW

13. **`dashboard.js`** - 0% coverage
    - Monitoring dashboard
    - **Tests needed:** 20-25
    - **Priority:** LOW

---

## 🛠️ Test Implementation Plan

### Week 1: Critical Path (Target: 30% coverage)

#### Day 1-2: Fix Existing Tests
- [x] Fix logger test (logs directory path issue)
- [ ] Fix report.js tests (missing methods)
- [ ] Fix api-connect test (module resolution)
- [ ] Fix fetch-posts test
- [ ] Verify all 24 existing tests pass

#### Day 3-4: `fetch-posts.js` - WordPress API Client
```javascript
// Test scenarios:
- ✅ fetchPosts() returns array of posts
- ✅ Handles pagination correctly
- ✅ Filters by status (published, draft, etc.)
- ✅ Handles API authentication
- ✅ Error handling for network failures
- ✅ Error handling for invalid credentials
- ✅ Timeout handling
- ✅ Rate limiting
- ✅ Post count limits (max_posts_per_run)
- ✅ Post filtering by date
- ✅ Caching mechanism
- ✅ Retry logic on failures
```

#### Day 5-7: `seo-audit.js` - Core Audit Engine
```javascript
// Test scenarios:
- ✅ Audits post for SEO issues
- ✅ Checks title length (50-60 chars)
- ✅ Checks meta description (150-160 chars)
- ✅ Validates heading structure (H1, H2, H3)
- ✅ Keyword density analysis
- ✅ Internal link checking
- ✅ Image alt tag validation
- ✅ Content length validation
- ✅ Readability score calculation
- ✅ Schema.org markup validation
- ✅ Generates issue severity (critical, warning, info)
- ✅ Calculates SEO score (0-100)
- ✅ Handles posts with missing content
- ✅ Handles posts with malformed HTML
```

**Deliverable:** 30% overall coverage

---

### Week 2: Core Audit Modules (Target: 50% coverage)

#### Day 1-3: `ai-content-optimizer.js` - AI Integration
```javascript
// Test scenarios:
- ✅ Calls Claude API successfully
- ✅ Calls OpenAI API successfully
- ✅ Calls Gemini API successfully
- ✅ Handles API failures gracefully
- ✅ Falls back to alternative AI when primary fails
- ✅ Parses AI suggestions correctly
- ✅ Generates optimized titles (3 options)
- ✅ Generates meta descriptions (2 options)
- ✅ Extracts keywords from content
- ✅ Handles rate limiting
- ✅ Timeout handling
- ✅ Invalid API key error handling
- ✅ Cost tracking (token usage)
- ✅ Prompt engineering validation
```

**Note:** Use mocked API responses for testing (no real API calls in tests)

#### Day 4-5: `technical-audit.js` - Technical SEO
```javascript
// Test scenarios:
- ✅ Checks page speed (PageSpeed Insights API)
- ✅ Validates meta tags
- ✅ Checks robots.txt
- ✅ Validates sitemap.xml
- ✅ Checks canonical URLs
- ✅ Validates structured data (JSON-LD)
- ✅ Mobile-friendliness check
- ✅ HTTPS validation
- ✅ Core Web Vitals check
- ✅ Image optimization check
```

#### Day 6-7: `competitor-analysis.js` + Others
```javascript
// competitor-analysis.js tests:
- ✅ Fetches SERP data via API
- ✅ Analyzes competitor keywords
- ✅ Identifies content gaps
- ✅ Tracks competitor rankings

// discord-notifier.js tests:
- ✅ Sends Discord webhook notifications
- ✅ Handles webhook failures
- ✅ Formats messages correctly
```

**Deliverable:** 50% overall coverage

---

### Week 3: Monitoring + Remaining Audit (Target: 70% coverage)

#### Day 1-3: Monitoring Modules
```javascript
// health-check.js:
- ✅ Checks WordPress site availability
- ✅ Validates API connectivity
- ✅ Database connection check
- ✅ Plugin status verification

// monitor-rankings.js:
- ✅ Tracks keyword rankings
- ✅ Stores historical data
- ✅ Generates ranking reports
- ✅ Alerts on ranking drops

// performance-monitor.js:
- ✅ Tracks page load times
- ✅ Monitors Core Web Vitals
- ✅ Historical performance trends
```

#### Day 4-7: Remaining Audit Modules
- `complete-optimization.js`
- `check-and-fix-plugins.js`
- `fix-meta.js` / `fix-meta-v2.js`

**Deliverable:** 70% overall coverage

---

### Week 4: Integration Tests + Edge Cases (Target: 80%+)

#### Day 1-3: Integration Tests
```javascript
// WordPress API Integration:
- ✅ Full audit workflow (fetch → audit → report)
- ✅ Auto-fix application workflow
- ✅ Multi-post batch processing
- ✅ Error recovery and retries
- ✅ End-to-end AI optimization flow
```

#### Day 4-5: Edge Cases & Error Scenarios
```javascript
// Edge cases:
- ❌ Network failures
- ❌ Invalid WordPress credentials
- ❌ Malformed post content
- ❌ Rate limiting
- ❌ Timeout scenarios
- ❌ Concurrent request handling
- ❌ Large dataset handling (1000+ posts)
```

#### Day 6-7: Performance & Security Tests
```javascript
// Performance:
- ✅ Memory usage under load
- ✅ Response time benchmarks
- ✅ Concurrent request handling

// Security:
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS prevention
```

**Deliverable:** 80%+ overall coverage

---

## 🧪 Testing Best Practices

### 1. Test Structure (AAA Pattern)
```javascript
test('should do something', () => {
  // Arrange - Setup
  const input = { test: 'data' };

  // Act - Execute
  const result = functionUnderTest(input);

  // Assert - Verify
  expect(result).toEqual(expectedOutput);
});
```

### 2. Mocking External Dependencies
```javascript
import { jest } from '@jest/globals';
import axios from 'axios';

// Mock axios
jest.mock('axios');

test('should fetch data from API', async () => {
  // Mock API response
  axios.get.mockResolvedValue({ data: mockData });

  const result = await fetchData();

  expect(result).toEqual(mockData);
  expect(axios.get).toHaveBeenCalledWith(expectedUrl);
});
```

### 3. Test Isolation
- Each test should be independent
- Use `beforeEach` for setup
- Use `afterEach` for cleanup
- No shared state between tests

### 4. Descriptive Test Names
```javascript
// ❌ Bad
test('test1', () => { ... });

// ✅ Good
test('should return empty array when no posts exist', () => { ... });
```

### 5. Test Coverage Goals
- **Statements:** 80%+
- **Branches:** 80%+ (all if/else paths)
- **Functions:** 80%+ (all public functions)
- **Lines:** 80%+

---

## 📊 Progress Tracking

### Weekly Milestones

| Week | Target Coverage | Key Deliverables | Status |
|------|----------------|------------------|--------|
| Week 1 | 30% | Critical path tests | 🔄 In Progress |
| Week 2 | 50% | Core audit tests | ⏳ Pending |
| Week 3 | 70% | Monitoring tests | ⏳ Pending |
| Week 4 | 80%+ | Integration + edge cases | ⏳ Pending |

### Daily Checklist Template
```markdown
## Day X Progress

- [ ] Tests written: X/Y
- [ ] Tests passing: X/Y
- [ ] Coverage increase: +X%
- [ ] Blockers: [List any issues]
- [ ] Next day plan: [Brief description]
```

---

## 🚨 Risk Mitigation

### Risk 1: Tests Introduce Breaking Changes
**Mitigation:**
- Run full test suite after each module
- Keep tests in isolation (mocked dependencies)
- Use CI/CD to catch regressions early

### Risk 2: Mocking External APIs is Complex
**Mitigation:**
- Create reusable mock factories
- Document mock data structure
- Use recorded real API responses as test fixtures

### Risk 3: Time Overruns
**Mitigation:**
- Prioritize critical modules first
- Aim for 30% as minimum viable coverage
- 80% is target, not requirement for release

### Risk 4: False Positives
**Mitigation:**
- Test real-world scenarios
- Include integration tests
- Manual testing of critical paths

---

## 📁 Test File Organization

```
tests/
├── unit/                          # Unit tests (isolated)
│   ├── audit/
│   │   ├── ai-content-optimizer.test.js
│   │   ├── fetch-posts.test.js
│   │   ├── logger.test.js        ✅
│   │   ├── report.test.js        ⚠️
│   │   ├── seo-audit.test.js
│   │   └── technical-audit.test.js
│   ├── monitoring/
│   │   ├── health-check.test.js
│   │   ├── monitor-rankings.test.js
│   │   └── performance-monitor.test.js
│   └── utils/
│       └── helpers.test.js
├── integration/                   # Integration tests
│   ├── wordpress-api.test.js     ⚠️
│   ├── audit-workflow.test.js
│   └── ai-optimization-flow.test.js
├── e2e/                          # End-to-end tests
│   └── complete-audit.test.js
├── fixtures/                     # Test data
│   ├── mock-posts.json
│   ├── mock-api-responses.json
│   └── sample-audit-results.json
└── helpers/                      # Test utilities
    ├── mock-factories.js
    └── test-helpers.js
```

---

## 🎯 Success Criteria

**Phase 2 (Testing) is COMPLETE when:**

1. ✅ All existing tests passing (24/24)
2. ✅ Overall coverage ≥ 80%
3. ✅ All critical modules tested
4. ✅ CI/CD pipeline green
5. ✅ Zero high-priority bugs from testing
6. ✅ Test documentation complete

---

## 📚 Resources & References

### Testing Tools
- **Jest:** https://jestjs.io/docs/getting-started
- **Jest ES Modules:** https://jestjs.io/docs/ecmascript-modules
- **Testing Best Practices:** https://testingjavascript.com/

### Mocking Libraries
- **jest.mock():** Built-in Jest mocking
- **axios-mock-adapter:** For HTTP mocking
- **nock:** HTTP server mocking

### Coverage Tools
- **Istanbul/nyc:** Coverage reporting
- **Codecov:** Coverage tracking service

---

**Plan Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** ACTIVE - Week 1 in progress
**Owner:** SEO Automation Team
