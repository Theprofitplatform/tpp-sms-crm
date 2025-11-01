/**
 * NAP Auto-Fixer
 *
 * Automatically detects and fixes NAP (Name, Address, Phone) inconsistencies
 * across WordPress content using the review workflow.
 *
 * Features:
 * - Detects all variations of NAP data
 * - Creates proposals for manual review
 * - Rich descriptions with verification instructions
 * - Risk assessment for each fix
 * - Two-phase workflow: Detect → Review → Apply
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';

export class NAPAutoFixer extends AutoFixEngineBase {
  constructor(config) {
    super(config);
    this.wpClient = new WordPressClient(config.siteUrl, config.wpUser, config.wpPassword);

    // Official NAP data (source of truth)
    this.officialNAP = {
      name: config.businessName,
      address: config.address || null,
      city: config.city,
      state: config.state,
      country: config.country,
      phone: config.phone,
      email: config.email
    };
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'local-seo';
  }

  /**
   * REQUIRED: Detect NAP issues and return as proposal-compatible format
   * This is called by AutoFixEngineBase.runDetection()
   */
  async detectIssues(options = {}) {
    const issues = [];

    // Get all posts and pages
    const [posts, pages] = await Promise.all([
      this.wpClient.getPosts({ per_page: 100 }),
      this.wpClient.getPages({ per_page: 100 })
    ]);

    const allContent = [...posts, ...pages];

    for (const content of allContent) {
      // Check title
      const titleIssues = this.findNAPVariations(content.title.rendered, 'title', content);
      issues.push(...titleIssues);

      // Check content
      const contentIssues = this.findNAPVariations(content.content.rendered, 'content', content);
      issues.push(...contentIssues);

      // Check excerpt if exists
      if (content.excerpt?.rendered) {
        const excerptIssues = this.findNAPVariations(content.excerpt.rendered, 'excerpt', content);
        issues.push(...excerptIssues);
      }
    }

    // Convert to proposal format with rich descriptions
    return issues.map(issue => this.createProposalFromIssue(issue));
  }

  /**
   * Convert NAP issue to proposal format with rich descriptions
   */
  createProposalFromIssue(issue) {
    const fieldNames = {
      phone: 'Phone Number',
      businessName: 'Business Name',
      email: 'Email Address',
      address: 'Street Address'
    };

    const fieldName = fieldNames[issue.field] || issue.field;
    const location = `${issue.contentField} on ${issue.contentType}`;

    // Create detailed descriptions based on field type
    let issueDescription, fixDescription, expectedBenefit, verificationSteps;

    switch (issue.field) {
      case 'phone':
        issueDescription = `Inconsistent phone number format: "${issue.found}" does not match official format "${issue.correct}"`;
        fixDescription = `Standardize phone number from "${issue.found}" to "${issue.correct}"`;
        expectedBenefit = 'Consistent phone formatting improves local SEO and user trust. Google prefers uniform NAP data.';
        verificationSteps = [
          'Check the updated page to see the new phone format',
          'Verify the number still dials correctly',
          'Confirm it matches your Google Business Profile',
          `Location: ${issue.contentField} field`
        ];
        break;

      case 'businessName':
        issueDescription = `Business name variation: Found "${issue.found}" instead of official "${issue.correct}"`;
        fixDescription = `Standardize business name from "${issue.found}" to "${issue.correct}"`;
        expectedBenefit = 'Consistent business name across all pages helps search engines and builds brand recognition.';
        verificationSteps = [
          'Read the updated content to verify natural flow',
          'Check that capitalization is consistent',
          'Confirm it matches your official branding',
          'Verify on footer, contact page, and about page'
        ];
        break;

      case 'email':
        issueDescription = `Email address variation: Found "${issue.found}" instead of official "${issue.correct}"`;
        fixDescription = `Standardize email from "${issue.found}" to "${issue.correct}"`;
        expectedBenefit = 'Consistent email address prevents confusion and ensures customers contact the right address.';
        verificationSteps = [
          'Verify email address is correct and monitored',
          'Check that links still work (mailto:)',
          'Confirm it matches your preferred contact email'
        ];
        break;

      case 'address':
        issueDescription = `Address variation: Found "${issue.found}" instead of official "${issue.correct}"`;
        fixDescription = `Standardize address from "${issue.found}" to "${issue.correct}"`;
        expectedBenefit = 'Consistent address improves local SEO rankings and helps customers find your location.';
        verificationSteps = [
          'Verify address matches Google Business Profile',
          'Check that it includes city, state, and zip',
          'Confirm formatting is consistent'
        ];
        break;

      default:
        issueDescription = `Found "${issue.found}" instead of official "${issue.correct}"`;
        fixDescription = `Update from "${issue.found}" to "${issue.correct}"`;
        expectedBenefit = 'Maintaining consistent NAP data improves local SEO rankings.';
        verificationSteps = ['Verify the change looks correct on the page'];
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(issue);
    const priority = this.calculatePriority(issue);

    return {
      target_type: issue.contentType,
      target_id: issue.contentId,
      target_title: issue.contentTitle || `${issue.contentType} #${issue.contentId}`,
      target_url: issue.contentUrl || null,
      field_name: issue.contentField,

      before_value: issue.found,
      after_value: issue.correct,

      issue_description: issueDescription,
      fix_description: fixDescription,
      expected_benefit: expectedBenefit,

      severity: issue.severity,
      risk_level: riskLevel,
      category: 'nap-consistency',
      impact_score: priority,
      priority,

      reversible: true,

      metadata: {
        napField: issue.field,
        fieldLabel: fieldName,
        location,
        verificationSteps,
        affectedElement: issue.location,
        changeType: 'text-replacement'
      }
    };
  }

  /**
   * Calculate risk level for NAP changes
   */
  calculateRiskLevel(issue) {
    // Phone and email are low risk (non-visible text changes)
    if (issue.field === 'phone' || issue.field === 'email') {
      return 'low';
    }

    // Business name in content could affect readability
    if (issue.field === 'businessName' && issue.contentField === 'content') {
      return 'medium';
    }

    // Everything else is low risk
    return 'low';
  }

  /**
   * Calculate priority score
   */
  calculatePriority(issue) {
    let score = 50; // Base score

    // High priority for phone numbers (most important for local SEO)
    if (issue.field === 'phone') score += 30;

    // Higher priority for contact pages
    if (issue.contentField === 'title' || issue.contentField === 'excerpt') {
      score += 10;
    }

    // Higher priority for high severity
    if (issue.severity === 'high') score += 20;
    if (issue.severity === 'medium') score += 10;

    return Math.min(score, 100);
  }

  /**
   * Find NAP variations in text
   */
  findNAPVariations(text, field, content) {
    const issues = [];

    // Phone number variations
    if (this.officialNAP.phone) {
      const phonePatterns = this.generatePhonePatterns(this.officialNAP.phone);
      const foundPhones = this.extractPhoneNumbers(text);

      for (const foundPhone of foundPhones) {
        if (!phonePatterns.includes(foundPhone) && foundPhone !== this.officialNAP.phone) {
          issues.push({
            field: 'phone',
            location: `${content.type}:${content.id}:${field}`,
            contentId: content.id,
            contentType: content.type,
            contentField: field,
            contentTitle: content.title?.rendered || content.title,
            contentUrl: content.link,
            found: foundPhone,
            correct: this.officialNAP.phone,
            severity: 'high'
          });
        }
      }
    }

    // Business name variations (case-insensitive but not exact match)
    if (this.officialNAP.name) {
      const nameRegex = new RegExp(this.officialNAP.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = text.match(nameRegex);

      if (matches) {
        matches.forEach(match => {
          if (match !== this.officialNAP.name) {
            issues.push({
              field: 'businessName',
              location: `${content.type}:${content.id}:${field}`,
              contentId: content.id,
              contentType: content.type,
              contentField: field,
              contentTitle: content.title?.rendered || content.title,
              contentUrl: content.link,
              found: match,
              correct: this.officialNAP.name,
              severity: 'medium'
            });
          }
        });
      }
    }

    // Email variations
    if (this.officialNAP.email) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const foundEmails = text.match(emailRegex) || [];

      for (const foundEmail of foundEmails) {
        if (foundEmail.toLowerCase() !== this.officialNAP.email.toLowerCase()) {
          // Only flag if it's the same domain
          const foundDomain = foundEmail.split('@')[1];
          const correctDomain = this.officialNAP.email.split('@')[1];

          if (foundDomain === correctDomain) {
            issues.push({
              field: 'email',
              location: `${content.type}:${content.id}:${field}`,
              contentId: content.id,
              contentType: content.type,
              contentField: field,
              contentTitle: content.title?.rendered || content.title,
              contentUrl: content.link,
              found: foundEmail,
              correct: this.officialNAP.email,
              severity: 'medium'
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Extract phone numbers from text
   */
  extractPhoneNumbers(text) {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const matches = text.match(phoneRegex) || [];

    // Filter to only likely phone numbers (10+ digits)
    return matches.filter(match => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 10;
    });
  }

  /**
   * Generate acceptable phone number patterns
   */
  generatePhonePatterns(phone) {
    const digits = phone.replace(/\D/g, '');

    return [
      phone, // Original format
      digits, // Just digits
      `+${digits}`, // With +
      `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`, // (123) 456-7890
      `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`, // 123-456-7890
      `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}` // 123.456.7890
    ];
  }

  /**
   * Group issues by field
   */
  groupIssuesByField(issues) {
    const grouped = {};
    issues.forEach(issue => {
      if (!grouped[issue.field]) {
        grouped[issue.field] = 0;
      }
      grouped[issue.field]++;
    });
    return grouped;
  }

  /**
   * Create backup before making changes
   */
  async createBackup(detectionResults) {
    const backupData = {
      clientId: this.clientId,
      timestamp: new Date().toISOString(),
      affectedContent: [],
      officialNAP: this.officialNAP,
      detectionResults
    };

    // Get current content for all affected items
    const contentIds = [...new Set(detectionResults.issues.map(i => i.contentId))];

    for (const contentId of contentIds) {
      try {
        const content = await this.wpClient.getPost(contentId);
        backupData.affectedContent.push({
          id: content.id,
          type: content.type,
          title: content.title.rendered,
          content: content.content.rendered,
          excerpt: content.excerpt?.rendered || null
        });
      } catch (error) {
        console.error(`Warning: Could not backup content ${contentId}:`, error.message);
      }
    }

    // Store backup in database
    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.clientId,
      'nap_fix_backup',
      'site-wide',
      JSON.stringify(backupData),
      'backup',
      JSON.stringify({
        issuesCount: detectionResults.issues.length,
        affectedContentCount: contentIds.length
      })
    );

    return result.lastInsertRowid;
  }

  /**
   * REQUIRED: Apply a single fix from an approved proposal
   * This is called by AutoFixEngineBase.runApplication()
   */
  async applyFix(proposal, options = {}) {
    const { target_id, field_name, before_value, after_value, metadata } = proposal;

    // Get current content from WordPress
    const content = await this.wpClient.getPost(target_id);

    // Prepare update based on field
    let updatedContent = {};

    if (field_name === 'title') {
      updatedContent.title = content.title.rendered.replace(
        before_value,
        after_value
      );
    } else if (field_name === 'content') {
      // Use global replace for content field
      updatedContent.content = content.content.rendered.replace(
        new RegExp(this.escapeRegex(before_value), 'g'),
        after_value
      );
    } else if (field_name === 'excerpt') {
      updatedContent.excerpt = (content.excerpt?.rendered || '').replace(
        new RegExp(this.escapeRegex(before_value), 'g'),
        after_value
      );
    }

    // Apply update via WordPress REST API
    const updated = await this.wpClient.updatePost(target_id, updatedContent);

    return {
      success: true,
      contentId: target_id,
      field: field_name,
      before: before_value,
      after: after_value,
      timestamp: new Date().toISOString(),
      url: updated.link
    };
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Log all changes to database
   */
  async logChanges(results) {
    const { backupId, fixesApplied, errors } = results;

    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, after_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.clientId,
      'nap_fix',
      'site-wide',
      JSON.stringify({ backupId, issues: results.detectionResults.issues }),
      JSON.stringify({ fixes: fixesApplied }),
      errors.length === 0 ? 'completed' : 'partial',
      JSON.stringify({
        backupId,
        fixesCount: fixesApplied.length,
        errorsCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      })
    );

    // Also send to bridge API
    if (fixesApplied.length > 0) {
      try {
        const bridgeClient = (await import('./bridge-client.js')).default;
        await bridgeClient.sendOptimizationResults(
          this.clientId,
          'nap_auto_fix',
          {
            pagesModified: fixesApplied.length,
            issuesFixed: fixesApplied.length,
            expectedImpact: 'Improved NAP consistency for Local SEO',
            before: { issues: results.detectionResults.issues.length },
            after: { issues: errors.length }
          },
          {
            backupId,
            autoFixId: result.lastInsertRowid
          }
        );
      } catch (bridgeError) {
        console.warn('Could not send to bridge API:', bridgeError.message);
      }
    }

    return result.lastInsertRowid;
  }

  /**
   * Verify that fixes were applied correctly
   */
  async verifyFixes(fixes) {
    let verified = 0;

    for (const fix of fixes) {
      try {
        const content = await this.wpClient.getPost(fix.contentId);
        const fieldContent = fix.field === 'title'
          ? content.title.rendered
          : fix.field === 'content'
          ? content.content.rendered
          : content.excerpt?.rendered || '';

        if (fieldContent.includes(fix.after)) {
          verified++;
        }
      } catch (error) {
        console.error(`Verification failed for content ${fix.contentId}:`, error.message);
      }
    }

    return { verified, total: fixes.length };
  }

  /**
   * Rollback changes using backup
   */
  async rollback(backupId) {
    console.log(`\n🔄 Rolling back NAP fixes (Backup ID: ${backupId})...`);

    try {
      // Get backup data from database
      const stmt = db.db.prepare(`
        SELECT * FROM auto_fix_actions
        WHERE id = ? AND fix_type = 'nap_fix_backup'
      `);
      const backup = stmt.get(backupId);

      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backupData = JSON.parse(backup.before_state);
      let restored = 0;

      // Restore each piece of content
      for (const content of backupData.affectedContent) {
        try {
          await this.wpClient.updatePost(content.id, {
            title: content.title,
            content: content.content,
            excerpt: content.excerpt
          });
          restored++;
          console.log(`   ✅ Restored: ${content.title}`);
        } catch (error) {
          console.error(`   ❌ Failed to restore ${content.id}:`, error.message);
        }
      }

      // Log rollback to database
      const logStmt = db.db.prepare(`
        INSERT INTO auto_fix_actions
        (client_id, fix_type, target, before_state, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      logStmt.run(
        this.clientId,
        'nap_fix_rollback',
        'site-wide',
        JSON.stringify({ backupId }),
        'completed',
        JSON.stringify({ restoredCount: restored })
      );

      console.log(`\n✅ Rollback complete: ${restored}/${backupData.affectedContent.length} items restored`);

      return { success: true, restored, total: backupData.affectedContent.length };

    } catch (error) {
      console.error('❌ Rollback error:', error.message);
      throw error;
    }
  }
}

export default NAPAutoFixer;
