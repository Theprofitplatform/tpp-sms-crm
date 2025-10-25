/**
 * NAP Auto-Fixer
 *
 * Automatically detects and fixes NAP (Name, Address, Phone) inconsistencies
 * across WordPress content.
 *
 * Features:
 * - Detects all variations of NAP data
 * - Bulk find-and-replace across posts, pages, widgets
 * - Creates automatic backups before changes
 * - Logs all changes to database
 * - Supports one-click rollback
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';

export class NAPAutoFixer {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
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
   * Main entry point: Detect and fix all NAP inconsistencies
   */
  async runAutoFix() {
    console.log('\n🔧 NAP AUTO-FIXER: Starting...');
    console.log(`Client: ${this.config.businessName}`);
    console.log('-'.repeat(70));

    const results = {
      detectionResults: null,
      backupId: null,
      fixesApplied: [],
      errors: [],
      success: false
    };

    try {
      // Step 1: Detect inconsistencies
      console.log('\n1️⃣  Detecting NAP inconsistencies...');
      results.detectionResults = await this.detectInconsistencies();

      if (results.detectionResults.issues.length === 0) {
        console.log('   ✅ No inconsistencies found!');
        results.success = true;
        return results;
      }

      console.log(`   Found ${results.detectionResults.issues.length} inconsistencies`);

      // Step 2: Create backup
      console.log('\n2️⃣  Creating backup...');
      results.backupId = await this.createBackup(results.detectionResults);
      console.log(`   ✅ Backup created (ID: ${results.backupId})`);

      // Step 3: Apply fixes
      console.log('\n3️⃣  Applying fixes...');
      for (const issue of results.detectionResults.issues) {
        try {
          const fix = await this.applyFix(issue);
          results.fixesApplied.push(fix);
          console.log(`   ✅ Fixed: ${issue.field} in ${issue.location}`);
        } catch (error) {
          console.error(`   ❌ Failed: ${issue.field} in ${issue.location} - ${error.message}`);
          results.errors.push({
            issue,
            error: error.message
          });
        }
      }

      // Step 4: Log to database
      console.log('\n4️⃣  Logging changes to database...');
      await this.logChanges(results);
      console.log('   ✅ Changes logged');

      // Step 5: Verify fixes
      console.log('\n5️⃣  Verifying fixes...');
      const verification = await this.verifyFixes(results.fixesApplied);
      console.log(`   ✅ Verification: ${verification.verified}/${verification.total} fixes confirmed`);

      results.success = results.errors.length === 0;

      console.log('\n' + '='.repeat(70));
      console.log(`✅ NAP AUTO-FIX COMPLETE`);
      console.log(`   Fixes Applied: ${results.fixesApplied.length}`);
      console.log(`   Errors: ${results.errors.length}`);
      console.log(`   Backup ID: ${results.backupId}`);
      console.log('='.repeat(70));

      return results;

    } catch (error) {
      console.error('\n❌ NAP Auto-Fix Error:', error.message);
      results.errors.push({ error: error.message });
      return results;
    }
  }

  /**
   * Detect all NAP inconsistencies across the site
   */
  async detectInconsistencies() {
    const issues = [];
    const scannedLocations = [];

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

      scannedLocations.push({
        type: content.type,
        id: content.id,
        title: content.title.rendered,
        url: content.link
      });
    }

    return {
      issues,
      scannedLocations,
      summary: {
        totalScanned: allContent.length,
        totalIssues: issues.length,
        byField: this.groupIssuesByField(issues)
      }
    };
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
   * Apply a single fix
   */
  async applyFix(issue) {
    const { contentId, contentType, contentField, found, correct } = issue;

    // Get current content
    const content = await this.wpClient.getPost(contentId);

    // Prepare update based on field
    let updatedContent = {};

    if (contentField === 'title') {
      updatedContent.title = content.title.rendered.replace(found, correct);
    } else if (contentField === 'content') {
      updatedContent.content = content.content.rendered.replace(new RegExp(this.escapeRegex(found), 'g'), correct);
    } else if (contentField === 'excerpt') {
      updatedContent.excerpt = (content.excerpt?.rendered || '').replace(new RegExp(this.escapeRegex(found), 'g'), correct);
    }

    // Apply update via WordPress API
    const updated = await this.wpClient.updatePost(contentId, updatedContent);

    return {
      issue,
      applied: true,
      contentId,
      field: contentField,
      before: found,
      after: correct,
      timestamp: new Date().toISOString()
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
