/**
 * Content Optimizer - Day 9
 *
 * Comprehensive content optimization engine that improves:
 * - Keyword density and placement
 * - Internal linking structure
 * - Image alt text and optimization
 * - Content readability
 * - Heading hierarchy and structure
 *
 * Features:
 * - Analyzes existing content quality
 * - Suggests improvements
 * - Auto-fixes common issues
 * - Tracks changes in database
 * - Supports rollback
 * - Sends results to Bridge API
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';

export class ContentOptimizer {
  constructor(config) {
    this.config = config;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });
  }

  /**
   * Main orchestrator - Run complete content optimization
   */
  async runOptimization(options = {}) {
    const { dryRun = false, limit = 10 } = options;

    console.log('🎯 Content Optimizer - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN (analysis only)' : 'LIVE (will apply fixes)'}`);
    console.log(`   Limit: ${limit} pages\n`);

    try {
      // Step 1: Get all posts and pages
      console.log('📄 Fetching WordPress content...');
      const posts = await this.wpClient.getPosts({ per_page: limit });
      const pages = await this.wpClient.getPages({ per_page: limit });
      const allContent = [...posts, ...pages];

      console.log(`   Found ${allContent.length} items to analyze\n`);

      if (allContent.length === 0) {
        return {
          success: true,
          message: 'No content found to optimize',
          analyzed: 0,
          issues: [],
          fixes: []
        };
      }

      // Step 2: Analyze each piece of content
      console.log('🔍 Analyzing content quality...');
      const analysisResults = [];

      for (const item of allContent) {
        const analysis = await this.analyzeContent(item);
        analysisResults.push(analysis);

        console.log(`   ✓ ${item.title.rendered} - ${analysis.issues.length} issues found`);
      }

      console.log('');

      // Step 3: Prioritize issues
      const prioritizedIssues = this.prioritizeIssues(analysisResults);

      console.log('📊 Issue Summary:');
      console.log(`   🔴 Critical: ${prioritizedIssues.filter(i => i.severity === 'critical').length}`);
      console.log(`   🟡 Medium: ${prioritizedIssues.filter(i => i.severity === 'medium').length}`);
      console.log(`   🟢 Low: ${prioritizedIssues.filter(i => i.severity === 'low').length}`);
      console.log('');

      // Step 4: Create backup (if not dry run)
      let backupId = null;
      if (!dryRun) {
        console.log('💾 Creating backup...');
        backupId = await this.createBackup(analysisResults);
        console.log(`   Backup ID: ${backupId}\n`);
      }

      // Step 5: Apply fixes (if not dry run)
      const fixesApplied = [];
      if (!dryRun) {
        console.log('🔧 Applying fixes...');

        for (const issue of prioritizedIssues) {
          try {
            const fix = await this.applyFix(issue);
            if (fix.success) {
              fixesApplied.push(fix);
              console.log(`   ✓ Fixed: ${issue.type} on "${issue.title}"`);
            }
          } catch (error) {
            console.error(`   ✗ Failed to fix ${issue.type}:`, error.message);
          }
        }

        console.log('');
      }

      // Step 6: Log to database
      if (!dryRun && fixesApplied.length > 0) {
        console.log('📝 Logging to database...');
        await this.logOptimization({
          clientId: this.config.id,
          backupId,
          fixesApplied,
          issuesFound: prioritizedIssues.length
        });
        console.log('');
      }

      // Step 7: Send to Bridge API
      if (!dryRun && fixesApplied.length > 0) {
        console.log('🌉 Sending results to Bridge API...');
        await this.sendToBridgeAPI({
          clientId: this.config.id,
          optimizationType: 'content_optimization',
          results: {
            pagesModified: fixesApplied.length,
            issuesFixed: fixesApplied.reduce((sum, f) => sum + (f.fixCount || 1), 0),
            expectedImpact: this.calculateExpectedImpact(fixesApplied),
            before: { totalIssues: prioritizedIssues.length },
            after: { fixesApplied: fixesApplied.length }
          }
        });
        console.log('');
      }

      // Summary
      console.log('✅ Content Optimization Complete!');
      console.log(`   Pages analyzed: ${allContent.length}`);
      console.log(`   Issues found: ${prioritizedIssues.length}`);
      console.log(`   Fixes applied: ${fixesApplied.length}`);
      if (backupId) {
        console.log(`   Backup ID: ${backupId} (use for rollback)`);
      }
      console.log('');

      return {
        success: true,
        analyzed: allContent.length,
        issues: prioritizedIssues,
        fixes: fixesApplied,
        backupId,
        dryRun
      };

    } catch (error) {
      console.error('❌ Content optimization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze a single piece of content
   */
  async analyzeContent(item) {
    const content = item.content.rendered;
    const title = item.title.rendered;

    const issues = [];

    // 1. Check keyword density
    const keywordIssues = this.analyzeKeywordDensity(content, title);
    issues.push(...keywordIssues);

    // 2. Check internal linking
    const linkingIssues = this.analyzeInternalLinking(content);
    issues.push(...linkingIssues);

    // 3. Check image alt text
    const imageIssues = this.analyzeImages(content);
    issues.push(...imageIssues);

    // 4. Check readability
    const readabilityIssues = this.analyzeReadability(content);
    issues.push(...readabilityIssues);

    // 5. Check heading structure
    const headingIssues = this.analyzeHeadings(content);
    issues.push(...headingIssues);

    return {
      id: item.id,
      title: title,
      type: item.type,
      url: item.link,
      issues,
      content
    };
  }

  /**
   * Analyze keyword density
   */
  analyzeKeywordDensity(content, title) {
    const issues = [];
    const text = this.stripHTML(content);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const totalWords = words.length;

    if (totalWords === 0) {
      return [{
        type: 'keyword_density',
        severity: 'critical',
        message: 'Content is empty or too short',
        suggestion: 'Add at least 300 words of quality content'
      }];
    }

    // Check if content is too short
    if (totalWords < 300) {
      issues.push({
        type: 'keyword_density',
        severity: 'medium',
        message: `Content is too short (${totalWords} words)`,
        suggestion: 'Aim for at least 300 words for better SEO'
      });
    }

    // Extract potential focus keyword from title
    const titleWords = title.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4 && !this.isStopWord(w));

    if (titleWords.length > 0) {
      const focusKeyword = titleWords[0];
      const keywordCount = words.filter(w => w.includes(focusKeyword)).length;
      const density = (keywordCount / totalWords) * 100;

      if (density < 0.5) {
        issues.push({
          type: 'keyword_density',
          severity: 'medium',
          message: `Low keyword density for "${focusKeyword}" (${density.toFixed(2)}%)`,
          suggestion: `Mention "${focusKeyword}" more naturally throughout the content (target: 1-2%)`
        });
      } else if (density > 3) {
        issues.push({
          type: 'keyword_density',
          severity: 'medium',
          message: `Keyword stuffing detected for "${focusKeyword}" (${density.toFixed(2)}%)`,
          suggestion: 'Reduce keyword usage to avoid penalties (target: 1-2%)'
        });
      }
    }

    return issues;
  }

  /**
   * Analyze internal linking
   */
  analyzeInternalLinking(content) {
    const issues = [];
    const links = content.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];

    const internalLinks = links.filter(link => {
      const href = link.match(/href="([^"]+)"/)[1];
      return !href.startsWith('http') || href.includes(this.config.siteUrl);
    });

    const externalLinks = links.filter(link => {
      const href = link.match(/href="([^"]+)"/)[1];
      return href.startsWith('http') && !href.includes(this.config.siteUrl);
    });

    const wordCount = this.stripHTML(content).split(/\s+/).length;

    // Check if there are enough internal links
    if (wordCount > 500 && internalLinks.length === 0) {
      issues.push({
        type: 'internal_linking',
        severity: 'medium',
        message: 'No internal links found',
        suggestion: 'Add 2-3 internal links to related content',
        fixData: { needsLinks: 3 }
      });
    } else if (wordCount > 500 && internalLinks.length < 2) {
      issues.push({
        type: 'internal_linking',
        severity: 'low',
        message: `Only ${internalLinks.length} internal link(s) found`,
        suggestion: 'Add 1-2 more internal links to related content',
        fixData: { needsLinks: 2 - internalLinks.length }
      });
    }

    // Check external links have proper attributes
    externalLinks.forEach(link => {
      if (!link.includes('nofollow') && !link.includes('noopener')) {
        issues.push({
          type: 'external_link',
          severity: 'low',
          message: 'External link missing security attributes',
          suggestion: 'Add rel="noopener" to external links',
          fixData: { link }
        });
      }
    });

    return issues;
  }

  /**
   * Analyze images
   */
  analyzeImages(content) {
    const issues = [];
    const images = content.match(/<img[^>]+>/gi) || [];

    images.forEach(img => {
      // Check for alt text
      if (!img.includes('alt=')) {
        issues.push({
          type: 'image_alt_text',
          severity: 'medium',
          message: 'Image missing alt text',
          suggestion: 'Add descriptive alt text for accessibility and SEO',
          fixData: { img }
        });
      } else {
        // Check if alt text is empty or generic
        const altMatch = img.match(/alt="([^"]*)"/);
        if (altMatch && (altMatch[1] === '' || altMatch[1].length < 3)) {
          issues.push({
            type: 'image_alt_text',
            severity: 'medium',
            message: 'Image has empty or very short alt text',
            suggestion: 'Add meaningful alt text (5-15 words)',
            fixData: { img }
          });
        }
      }

      // Check for title attribute (optional but good)
      if (!img.includes('title=')) {
        issues.push({
          type: 'image_optimization',
          severity: 'low',
          message: 'Image missing title attribute',
          suggestion: 'Add title attribute for better UX',
          fixData: { img }
        });
      }
    });

    return issues;
  }

  /**
   * Analyze readability
   */
  analyzeReadability(content) {
    const issues = [];
    const text = this.stripHTML(content);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length === 0) {
      return issues;
    }

    // Average sentence length
    const avgSentenceLength = words.length / sentences.length;

    if (avgSentenceLength > 25) {
      issues.push({
        type: 'readability',
        severity: 'low',
        message: `Long sentences detected (avg ${avgSentenceLength.toFixed(1)} words)`,
        suggestion: 'Break up long sentences for better readability (target: 15-20 words)'
      });
    }

    // Check for paragraphs
    const paragraphs = content.split(/<\/p>/).filter(p => p.trim().length > 0);
    const avgParagraphLength = words.length / paragraphs.length;

    if (avgParagraphLength > 150) {
      issues.push({
        type: 'readability',
        severity: 'low',
        message: `Long paragraphs detected (avg ${avgParagraphLength.toFixed(0)} words)`,
        suggestion: 'Break up long paragraphs (target: 50-100 words per paragraph)'
      });
    }

    // Check for transition words
    const transitionWords = ['however', 'therefore', 'moreover', 'furthermore',
                            'additionally', 'consequently', 'meanwhile', 'nevertheless'];
    const hasTransitions = transitionWords.some(word =>
      text.toLowerCase().includes(word)
    );

    if (words.length > 300 && !hasTransitions) {
      issues.push({
        type: 'readability',
        severity: 'low',
        message: 'Few transition words found',
        suggestion: 'Add transition words to improve flow (however, therefore, etc.)'
      });
    }

    return issues;
  }

  /**
   * Analyze heading structure
   */
  analyzeHeadings(content) {
    const issues = [];

    const h1s = content.match(/<h1[^>]*>.*?<\/h1>/gi) || [];
    const h2s = content.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
    const h3s = content.match(/<h3[^>]*>.*?<\/h3>/gi) || [];
    const h4s = content.match(/<h4[^>]*>.*?<\/h4>/gi) || [];

    const wordCount = this.stripHTML(content).split(/\s+/).length;

    // Check for H1 (should not be in content, WordPress handles this)
    if (h1s.length > 0) {
      issues.push({
        type: 'heading_structure',
        severity: 'critical',
        message: 'H1 tag found in content',
        suggestion: 'Remove H1 from content (WordPress adds it automatically from title)',
        fixData: { removeH1s: true }
      });
    }

    // Check for H2s
    if (wordCount > 500 && h2s.length === 0) {
      issues.push({
        type: 'heading_structure',
        severity: 'medium',
        message: 'No H2 headings found',
        suggestion: 'Add H2 headings to break up content (1 H2 per 300 words)'
      });
    } else if (wordCount > 1000 && h2s.length < 3) {
      issues.push({
        type: 'heading_structure',
        severity: 'low',
        message: 'Few H2 headings for content length',
        suggestion: 'Add more H2 headings to improve structure'
      });
    }

    // Check heading hierarchy (H3 without H2)
    if (h3s.length > 0 && h2s.length === 0) {
      issues.push({
        type: 'heading_structure',
        severity: 'medium',
        message: 'H3 headings used without H2',
        suggestion: 'Fix heading hierarchy (use H2 before H3)'
      });
    }

    // Check heading hierarchy (H4 without H3)
    if (h4s.length > 0 && h3s.length === 0) {
      issues.push({
        type: 'heading_structure',
        severity: 'low',
        message: 'H4 headings used without H3',
        suggestion: 'Fix heading hierarchy (use H3 before H4)'
      });
    }

    return issues;
  }

  /**
   * Prioritize issues by severity
   */
  prioritizeIssues(analysisResults) {
    const allIssues = [];

    analysisResults.forEach(result => {
      result.issues.forEach(issue => {
        allIssues.push({
          ...issue,
          pageId: result.id,
          title: result.title,
          type: result.type,
          url: result.url,
          content: result.content
        });
      });
    });

    // Sort by severity: critical > medium > low
    const severityOrder = { critical: 0, medium: 1, low: 2 };
    return allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Apply a fix for an issue
   */
  async applyFix(issue) {
    switch (issue.type) {
      case 'image_alt_text':
        return await this.fixImageAltText(issue);

      case 'external_link':
        return await this.fixExternalLink(issue);

      case 'heading_structure':
        return await this.fixHeadingStructure(issue);

      default:
        // For other issues, we can't auto-fix (require manual review)
        return {
          success: false,
          reason: 'Manual review required',
          issue
        };
    }
  }

  /**
   * Fix missing or poor image alt text
   */
  async fixImageAltText(issue) {
    const { pageId, title, content, fixData } = issue;
    const { img } = fixData;

    // Generate meaningful alt text from page title
    const altText = title.replace(/[^\w\s]/g, '').trim();

    let updatedContent = content;

    if (!img.includes('alt=')) {
      // Add alt attribute
      updatedContent = updatedContent.replace(img, img.replace('<img', `<img alt="${altText}"`));
    } else {
      // Update existing alt
      updatedContent = updatedContent.replace(img, img.replace(/alt="[^"]*"/, `alt="${altText}"`));
    }

    // Update WordPress
    const endpoint = issue.type === 'post' ? 'updatePost' : 'updatePage';
    await this.wpClient[endpoint](pageId, {
      content: updatedContent
    });

    return {
      success: true,
      pageId,
      fixCount: 1,
      change: `Added alt text: "${altText}"`
    };
  }

  /**
   * Fix external link security attributes
   */
  async fixExternalLink(issue) {
    const { pageId, content, fixData } = issue;
    const { link } = fixData;

    let updatedLink = link;

    // Add rel attribute
    if (updatedLink.includes('rel="')) {
      updatedLink = updatedLink.replace(/rel="([^"]*)"/, 'rel="$1 noopener noreferrer"');
    } else {
      updatedLink = updatedLink.replace('<a', '<a rel="noopener noreferrer"');
    }

    const updatedContent = content.replace(link, updatedLink);

    // Update WordPress
    const endpoint = issue.type === 'post' ? 'updatePost' : 'updatePage';
    await this.wpClient[endpoint](pageId, {
      content: updatedContent
    });

    return {
      success: true,
      pageId,
      fixCount: 1,
      change: 'Added security attributes to external link'
    };
  }

  /**
   * Fix heading structure issues
   */
  async fixHeadingStructure(issue) {
    const { pageId, content, fixData } = issue;

    let updatedContent = content;

    // Remove H1s if present
    if (fixData?.removeH1s) {
      updatedContent = updatedContent.replace(/<h1([^>]*)>(.*?)<\/h1>/gi, '<h2$1>$2</h2>');
    }

    // Update WordPress
    const endpoint = issue.type === 'post' ? 'updatePost' : 'updatePage';
    await this.wpClient[endpoint](pageId, {
      content: updatedContent
    });

    return {
      success: true,
      pageId,
      fixCount: 1,
      change: 'Fixed heading hierarchy'
    };
  }

  /**
   * Create backup before applying fixes
   */
  async createBackup(analysisResults) {
    const backupData = analysisResults.map(result => ({
      id: result.id,
      title: result.title,
      content: result.content,
      type: result.type
    }));

    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_backups (client_id, fix_type, backup_data, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(
      this.config.id,
      'content_optimization',
      JSON.stringify(backupData)
    );

    return result.lastInsertRowid;
  }

  /**
   * Log optimization to database
   */
  async logOptimization(data) {
    const { clientId, backupId, fixesApplied, issuesFound } = data;

    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions (
        client_id, fix_type, action, status, issues_found,
        fixes_applied, backup_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      clientId,
      'content_optimization',
      'optimize_content',
      'completed',
      issuesFound,
      fixesApplied.length,
      backupId
    );
  }

  /**
   * Rollback changes using backup
   */
  async rollback(backupId) {
    console.log(`🔄 Rolling back content optimization (Backup ID: ${backupId})...`);

    try {
      // Get backup data
      const stmt = db.db.prepare(`
        SELECT backup_data FROM auto_fix_backups
        WHERE id = ?
      `);

      const backup = stmt.get(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      const backupData = JSON.parse(backup.backup_data);

      // Restore each item
      for (const item of backupData) {
        const endpoint = item.type === 'post' ? 'updatePost' : 'updatePage';
        await this.wpClient[endpoint](item.id, {
          content: item.content
        });

        console.log(`   ✓ Restored: ${item.title}`);
      }

      console.log('\n✅ Rollback complete!');

      return {
        success: true,
        restoredCount: backupData.length
      };

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send results to Bridge API
   */
  async sendToBridgeAPI(data) {
    try {
      const response = await fetch('http://localhost:3000/api/bridge/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        console.log('   ✓ Results sent to Bridge API');
      }
    } catch (error) {
      console.warn('   ⚠ Failed to send to Bridge API:', error.message);
    }
  }

  /**
   * Calculate expected impact
   */
  calculateExpectedImpact(fixes) {
    const criticalCount = fixes.filter(f => f.severity === 'critical').length;
    const mediumCount = fixes.filter(f => f.severity === 'medium').length;
    const lowCount = fixes.filter(f => f.severity === 'low').length;

    if (criticalCount > 3) return 'High';
    if (mediumCount > 5) return 'Medium-High';
    if (mediumCount > 2 || lowCount > 5) return 'Medium';
    return 'Low';
  }

  /**
   * Helper: Strip HTML tags
   */
  stripHTML(html) {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper: Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have',
                       'will', 'your', 'more', 'what', 'when', 'where', 'which'];
    return stopWords.includes(word.toLowerCase());
  }
}
