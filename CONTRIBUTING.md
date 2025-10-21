# Contributing to WordPress SEO Automation Tool

Thank you for considering contributing! This document will help you get started.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Project Architecture](#project-architecture)
5. [Adding Features](#adding-features)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Submitting Changes](#submitting-changes)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Access to a WordPress site (for testing)
- Basic understanding of SEO concepts
- Familiarity with WordPress REST API

### Development Dependencies

```bash
npm install --save-dev
```

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/seo-automation.git
cd seo-automation
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Development Config

```bash
cp env/.env.example env/.env.dev
```

Edit `env/.env.dev`:
```env
WORDPRESS_URL=http://localhost:8080
WORDPRESS_USER=admin
WORDPRESS_APP_PASSWORD=test-test-test-test
DRY_RUN=true
LOG_LEVEL=debug
```

### 4. Run Tests

```bash
npm test
```

### 5. Start Development

```bash
# Watch mode (if implemented)
npm run dev

# Or run directly
node index.js --mode=audit --max-posts=1
```

## Project Architecture

```
seo-automation/
├── index.js              # Main orchestrator
├── env/
│   └── config.js         # Configuration management
├── tasks/                # Core modules
│   ├── fetch-posts.js    # WordPress API client
│   ├── seo-audit.js      # Content SEO auditor
│   ├── technical-audit.js # Technical SEO checks
│   ├── fix-meta.js       # Auto-fix engine
│   ├── report.js         # Report generator
│   └── logger.js         # Logging system
└── tests/                # Test suites
    ├── api-connect.test.js
    └── audit.test.js
```

### Key Principles

1. **Modularity**: Each task is a separate module
2. **Safety First**: Always log, never destroy
3. **Configuration**: Everything configurable via .env
4. **Testing**: All features must have tests
5. **Documentation**: Code should be self-documenting

## Adding Features

### Adding a New SEO Check

**Example: Check for duplicate content**

1. **Open `tasks/seo-audit.js`**

```javascript
/**
 * Check for duplicate content
 */
checkDuplicateContent($, results, allPosts) {
  const content = $.text();
  const contentHash = this.hashContent(content);

  // Check against other posts
  const duplicate = allPosts.find(post =>
    post.contentHash === contentHash && post.id !== results.postId
  );

  if (duplicate) {
    results.issues.push({
      type: 'duplicate_content',
      severity: 'high',
      message: `Duplicate content detected with post ${duplicate.id}`,
      fix: 'Rewrite content to be unique'
    });
  }
}

hashContent(content) {
  // Simple hash implementation
  return content.trim().substring(0, 100);
}
```

2. **Call it in `auditPost()` method**

```javascript
async auditPost(post, allPosts = []) {
  // ... existing code ...

  this.checkDuplicateContent($, results, allPosts);

  return results;
}
```

3. **Add tests in `tests/audit.test.js`**

```javascript
it('should detect duplicate content', async () => {
  const post1 = {
    id: 1,
    content: { rendered: '<p>Same content</p>' }
  };
  const post2 = {
    id: 2,
    content: { rendered: '<p>Same content</p>' }
  };

  const result = await auditor.auditPost(post1, [post2]);
  const issue = result.issues.find(i => i.type === 'duplicate_content');

  assert.ok(issue, 'Should detect duplicate content');
});
```

4. **Update documentation**

Add to README.md under "Content SEO Audit" section:
```markdown
- Duplicate content detection
```

### Adding a New Fix

**Example: Fix broken internal links**

1. **Open `tasks/fix-meta.js`**

```javascript
/**
 * Check if internal links need fixing
 */
shouldFixInternalLinks(auditResults) {
  return auditResults.issues.some(issue =>
    issue.type === 'links' && issue.message.includes('broken')
  );
}

/**
 * Fix broken internal links
 */
async fixInternalLinks(post) {
  const $ = cheerio.load(post.content.rendered);
  let fixed = 0;

  $('a[href^="http"]').each((i, elem) => {
    const $link = $(elem);
    const href = $link.attr('href');

    if (this.isBrokenLink(href)) {
      // Fix or remove
      $link.remove();
      fixed++;
    }
  });

  if (fixed > 0) {
    return {
      content: $.html(),
      fixCount: fixed
    };
  }

  return null;
}
```

2. **Integrate in `applyFixes()` method**

```javascript
async applyFixes(post, auditResults) {
  // ... existing code ...

  if (this.shouldFixInternalLinks(auditResults)) {
    const linkFix = await this.fixInternalLinks(post);
    if (linkFix) {
      updateData.content = linkFix.content;
      fixes.changes.push({
        type: 'links',
        fixCount: linkFix.fixCount
      });
    }
  }

  // ... rest of code ...
}
```

### Adding a New Integration

**Example: Discord webhook**

1. **Create `tasks/discord-integration.js`**

```javascript
import axios from 'axios';
import { config } from '../env/config.js';
import { logger } from './logger.js';

export async function sendToDiscord(report) {
  if (!config.integrations?.discordWebhook) {
    return;
  }

  const { summary } = report;
  const color = summary.avgScore >= 70 ? 0x10b981 :
                summary.avgScore >= 50 ? 0xf59e0b : 0xef4444;

  const embed = {
    title: '🔍 SEO Audit Complete',
    color: color,
    fields: [
      {
        name: 'Posts Audited',
        value: summary.totalPosts.toString(),
        inline: true
      },
      {
        name: 'Average Score',
        value: `${summary.avgScore}/100`,
        inline: true
      },
      {
        name: 'Total Issues',
        value: summary.totalIssues.toString(),
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(config.integrations.discordWebhook, {
      embeds: [embed]
    });
    logger.info('Sent report to Discord');
  } catch (error) {
    logger.error('Failed to send to Discord', error.message);
  }
}
```

2. **Update `env/config.js`**

```javascript
integrations: {
  discordWebhook: process.env.DISCORD_WEBHOOK_URL || ''
}
```

3. **Use in `index.js`**

```javascript
import { sendToDiscord } from './tasks/discord-integration.js';

// After report generation
if (config.integrations.discordWebhook) {
  await sendToDiscord(report.report);
}
```

4. **Document in INTEGRATIONS.md**

## Testing

### Running Tests

```bash
# All tests
npm test

# Specific test file
node --test tests/audit.test.js

# Watch mode (if implemented)
npm run test:watch
```

### Writing Tests

We use Node.js built-in test runner. Example:

```javascript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { MyModule } from '../tasks/my-module.js';

describe('MyModule Tests', () => {
  let module;

  before(() => {
    module = new MyModule();
  });

  it('should do something', () => {
    const result = module.doSomething();
    assert.ok(result, 'Result should be truthy');
  });

  it('should handle errors', async () => {
    await assert.rejects(
      async () => await module.throwError(),
      { name: 'Error' }
    );
  });
});
```

### Test Coverage Goals

- Core functionality: 90%+
- Edge cases: 70%+
- Integration tests: Key workflows covered

## Documentation

### Code Comments

Use JSDoc format:

```javascript
/**
 * Analyze post for SEO issues
 * @param {Object} post - WordPress post object
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Audit results
 */
async function analyzePost(post, options = {}) {
  // Implementation
}
```

### README Updates

When adding features, update:

1. **README.md** - Main feature list
2. **QUICKSTART.md** - If it affects setup
3. **INTEGRATIONS.md** - For new integrations
4. **TROUBLESHOOTING.md** - Known issues
5. **CHANGELOG.md** - Version changes

### Documentation Style

- Clear and concise
- Include examples
- Explain the "why", not just the "how"
- Use markdown formatting
- Add code snippets

## Submitting Changes

### Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test thoroughly**
   ```bash
   npm test
   npm run audit  # Test real usage
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "Add duplicate content detection

   - Implement content hashing
   - Add comparison logic
   - Add tests for duplicate detection
   - Update documentation"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/my-new-feature
   ```

6. **Create Pull Request**
   - Clear title and description
   - Reference any related issues
   - Include test results
   - Add screenshots if relevant

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, missing semicolons
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

**Example:**
```
feat: Add broken link detection

- Implement link validation
- Add HTTP status checking
- Fix broken links automatically
- Add comprehensive tests

Closes #42
```

### Pull Request Checklist

Before submitting:

- [ ] Code follows project style
- [ ] Tests pass (`npm test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console.log() statements
- [ ] No commented-out code
- [ ] .env.example updated if needed

## Code Style

### JavaScript

- Use ES6+ features
- Async/await over promises
- Meaningful variable names
- Keep functions small and focused
- Avoid deep nesting

**Good:**
```javascript
async function fetchPosts(limit = 10) {
  try {
    const response = await wpClient.fetchPosts({ perPage: limit });
    return response.posts;
  } catch (error) {
    logger.error('Failed to fetch posts', error);
    throw error;
  }
}
```

**Avoid:**
```javascript
function fp(l) {
  return new Promise((res, rej) => {
    wpClient.fetchPosts({ perPage: l }).then(r => {
      res(r.posts);
    }).catch(e => {
      console.log(e);
      rej(e);
    });
  });
}
```

### Error Handling

Always handle errors gracefully:

```javascript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error.message);
  // Recover or re-throw
  throw new Error(`Failed to complete: ${error.message}`);
}
```

### Configuration

Never hardcode values:

```javascript
// Bad
const maxPosts = 100;

// Good
const maxPosts = config.automation.maxPostsPerRun;
```

## Community

### Getting Help

- GitHub Issues - Bug reports and feature requests
- Discussions - Questions and ideas
- Discord (coming soon) - Real-time chat

### Recognition

Contributors will be:
- Listed in README.md
- Mentioned in CHANGELOG.md
- Credited in release notes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏

Questions? Open an issue or discussion on GitHub.
