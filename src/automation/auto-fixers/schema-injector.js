/**
 * Schema Auto-Injector
 *
 * Automatically generates and injects LocalBusiness schema markup into WordPress sites.
 * Validates schema, updates when client data changes, and ensures compliance with
 * structured data guidelines.
 *
 * Features:
 * - Detects existing schema markup
 * - Generates proper LocalBusiness schema from config
 * - Injects into homepage <head>
 * - Validates with Google Structured Data Testing Tool
 * - Updates schema when client data changes
 * - Logs all actions to database
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';

export class SchemaAutoInjector {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient(config.siteUrl, config.wpUser, config.wpPassword);
  }

  /**
   * Main entry point: Check, generate, and inject schema
   */
  async runAutoInject() {
    console.log('\n📋 SCHEMA AUTO-INJECTOR: Starting...');
    console.log(`Client: ${this.config.businessName}`);
    console.log('-'.repeat(70));

    const results = {
      existingSchema: null,
      generatedSchema: null,
      injected: false,
      validated: false,
      validationErrors: [],
      backupId: null,
      success: false
    };

    try {
      // Step 1: Check for existing schema
      console.log('\n1️⃣  Checking for existing schema...');
      results.existingSchema = await this.detectExistingSchema();

      if (results.existingSchema.found) {
        console.log(`   ✅ Found existing schema: ${results.existingSchema.type}`);
        console.log(`   Location: ${results.existingSchema.location}`);

        // Check if update is needed
        const needsUpdate = await this.needsUpdate(results.existingSchema);
        if (!needsUpdate) {
          console.log('   ✅ Existing schema is up to date!');
          results.success = true;
          return results;
        }
        console.log('   ⚠️  Schema needs update');
      } else {
        console.log('   ⚠️  No schema found - will inject');
      }

      // Step 2: Generate schema
      console.log('\n2️⃣  Generating LocalBusiness schema...');
      results.generatedSchema = this.generateSchema();
      console.log('   ✅ Schema generated');

      // Step 3: Validate schema
      console.log('\n3️⃣  Validating schema structure...');
      const validation = this.validateSchema(results.generatedSchema);
      results.validated = validation.valid;
      results.validationErrors = validation.errors;

      if (!validation.valid) {
        console.log(`   ❌ Validation failed: ${validation.errors.length} errors`);
        validation.errors.forEach(err => console.log(`      - ${err}`));
        throw new Error('Schema validation failed');
      }
      console.log('   ✅ Schema is valid');

      // Step 4: Create backup
      console.log('\n4️⃣  Creating backup...');
      results.backupId = await this.createBackup(results.existingSchema);
      console.log(`   ✅ Backup created (ID: ${results.backupId})`);

      // Step 5: Inject schema
      console.log('\n5️⃣  Injecting schema into homepage...');
      await this.injectSchema(results.generatedSchema, results.existingSchema);
      results.injected = true;
      console.log('   ✅ Schema injected');

      // Step 6: Verify injection
      console.log('\n6️⃣  Verifying schema injection...');
      const verified = await this.verifyInjection();
      if (!verified) {
        throw new Error('Schema verification failed');
      }
      console.log('   ✅ Schema verified on live site');

      // Step 7: Log to database
      console.log('\n7️⃣  Logging to database...');
      await this.logAction(results);
      console.log('   ✅ Action logged');

      results.success = true;

      console.log('\n' + '='.repeat(70));
      console.log('✅ SCHEMA AUTO-INJECTION COMPLETE');
      console.log(`   Backup ID: ${results.backupId}`);
      console.log(`   Schema Type: LocalBusiness`);
      console.log('='.repeat(70));

      return results;

    } catch (error) {
      console.error('\n❌ Schema Auto-Inject Error:', error.message);
      results.error = error.message;
      return results;
    }
  }

  /**
   * Detect existing schema on the site
   */
  async detectExistingSchema() {
    try {
      // Get homepage
      const pages = await this.wpClient.getPages({ per_page: 100 });
      const homepage = pages.find(p => p.slug === 'home' || p.slug === '' || p.id === 1) || pages[0];

      if (!homepage) {
        return { found: false };
      }

      // Check for schema in content
      const content = homepage.content.rendered;

      // Look for JSON-LD schema
      const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
      const matches = content.match(jsonLdRegex);

      if (matches) {
        for (const match of matches) {
          try {
            const jsonContent = match.replace(/<script type="application\/ld\+json">|<\/script>/gi, '').trim();
            const schema = JSON.parse(jsonContent);

            if (schema['@type'] === 'LocalBusiness' || schema['@type']?.includes('Business')) {
              return {
                found: true,
                type: schema['@type'],
                schema: schema,
                location: `page:${homepage.id}`,
                pageId: homepage.id,
                rawMatch: match
              };
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      }

      return {
        found: false,
        pageId: homepage.id,
        pageSlug: homepage.slug
      };

    } catch (error) {
      console.error('Error detecting schema:', error.message);
      return { found: false, error: error.message };
    }
  }

  /**
   * Check if existing schema needs update
   */
  async needsUpdate(existingSchema) {
    if (!existingSchema.schema) return true;

    const current = existingSchema.schema;
    const official = this.config;

    // Check key fields
    const checks = [
      current.name !== official.businessName,
      current.telephone !== official.phone,
      current.email !== official.email,
      current.address?.addressLocality !== official.city,
      current.address?.addressRegion !== official.state
    ];

    return checks.some(check => check);
  }

  /**
   * Generate LocalBusiness schema from config
   */
  generateSchema() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': this.config.businessType || 'LocalBusiness',
      '@id': `${this.config.siteUrl}#organization`,
      name: this.config.businessName,
      url: this.config.siteUrl,
      telephone: this.config.phone,
      email: this.config.email
    };

    // Add address if available
    if (this.config.address || this.config.city) {
      schema.address = {
        '@type': 'PostalAddress',
        streetAddress: this.config.address || '',
        addressLocality: this.config.city,
        addressRegion: this.config.state,
        addressCountry: this.config.country || 'AU'
      };
    }

    // Add geo coordinates if available
    if (this.config.geo?.latitude && this.config.geo?.longitude) {
      schema.geo = {
        '@type': 'GeoCoordinates',
        latitude: this.config.geo.latitude,
        longitude: this.config.geo.longitude
      };
    }

    // Add description if available
    if (this.config.businessDescription) {
      schema.description = this.config.businessDescription;
    }

    // Add opening hours if available
    if (this.config.openingHours) {
      schema.openingHoursSpecification = this.config.openingHours;
    }

    // Add price range if available
    if (this.config.priceRange) {
      schema.priceRange = this.config.priceRange;
    }

    // Add social profiles if available
    if (this.config.socialProfiles && this.config.socialProfiles.length > 0) {
      schema.sameAs = this.config.socialProfiles;
    }

    // Add image/logo if available
    if (this.config.logo) {
      schema.logo = this.config.logo;
      schema.image = this.config.logo;
    }

    return schema;
  }

  /**
   * Validate schema structure
   */
  validateSchema(schema) {
    const errors = [];

    // Required fields
    if (!schema['@context']) errors.push('Missing @context');
    if (!schema['@type']) errors.push('Missing @type');
    if (!schema.name) errors.push('Missing name');
    if (!schema.url) errors.push('Missing url');

    // Recommended fields
    if (!schema.telephone) errors.push('Missing telephone (recommended)');
    if (!schema.address) errors.push('Missing address (recommended)');

    // Validate address if present
    if (schema.address) {
      if (!schema.address['@type']) errors.push('Address missing @type');
      if (!schema.address.addressLocality) errors.push('Address missing addressLocality');
      if (!schema.address.addressCountry) errors.push('Address missing addressCountry');
    }

    // Validate geo if present
    if (schema.geo) {
      if (!schema.geo['@type']) errors.push('Geo missing @type');
      if (!schema.geo.latitude || !schema.geo.longitude) {
        errors.push('Geo missing coordinates');
      }
    }

    // Validate URLs
    if (schema.url && !this.isValidUrl(schema.url)) {
      errors.push('Invalid URL format');
    }

    if (schema.sameAs) {
      if (!Array.isArray(schema.sameAs)) {
        errors.push('sameAs must be an array');
      } else {
        schema.sameAs.forEach((url, i) => {
          if (!this.isValidUrl(url)) {
            errors.push(`Invalid URL in sameAs[${i}]`);
          }
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL format
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Create backup before injection
   */
  async createBackup(existingSchema) {
    const backupData = {
      clientId: this.clientId,
      timestamp: new Date().toISOString(),
      existingSchema: existingSchema.schema || null,
      pageId: existingSchema.pageId,
      pageSlug: existingSchema.pageSlug
    };

    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.clientId,
      'schema_inject_backup',
      'homepage',
      JSON.stringify(backupData),
      'backup',
      JSON.stringify({ hasExisting: !!existingSchema.schema })
    );

    return result.lastInsertRowid;
  }

  /**
   * Inject schema into homepage
   */
  async injectSchema(schema, existingSchema) {
    const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

    // Get homepage
    const pageId = existingSchema.pageId;
    const page = await this.wpClient.getPage(pageId);

    let updatedContent = page.content.rendered;

    if (existingSchema.found && existingSchema.rawMatch) {
      // Replace existing schema
      updatedContent = updatedContent.replace(existingSchema.rawMatch, schemaScript);
    } else {
      // Add to end of content
      updatedContent += '\n\n' + schemaScript;
    }

    // Update page
    await this.wpClient.updatePage(pageId, {
      content: updatedContent
    });
  }

  /**
   * Verify schema was injected correctly
   */
  async verifyInjection() {
    try {
      // Wait a moment for WordPress to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Re-fetch homepage
      const detection = await this.detectExistingSchema();

      return detection.found;
    } catch (error) {
      console.error('Verification error:', error.message);
      return false;
    }
  }

  /**
   * Log action to database
   */
  async logAction(results) {
    const stmt = db.db.prepare(`
      INSERT INTO auto_fix_actions
      (client_id, fix_type, target, before_state, after_state, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      this.clientId,
      'schema_inject',
      'homepage',
      JSON.stringify({
        backupId: results.backupId,
        existingSchema: results.existingSchema
      }),
      JSON.stringify({
        schema: results.generatedSchema,
        validated: results.validated
      }),
      results.success ? 'completed' : 'failed',
      JSON.stringify({
        backupId: results.backupId,
        validationErrors: results.validationErrors,
        injected: results.injected
      })
    );

    // Send to bridge API
    if (results.success) {
      try {
        const bridgeClient = (await import('./bridge-client.js')).default;
        await bridgeClient.sendOptimizationResults(
          this.clientId,
          'schema_injection',
          {
            pagesModified: 1,
            issuesFixed: results.existingSchema.found ? 0 : 1,
            expectedImpact: 'Added structured data for better search engine understanding',
            before: { hasSchema: results.existingSchema.found },
            after: { hasSchema: true, validated: results.validated }
          },
          {
            backupId: results.backupId,
            schemaType: results.generatedSchema['@type'],
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
   * Update existing schema with new data
   */
  async updateSchema() {
    console.log('\n🔄 SCHEMA UPDATER: Checking for updates...');

    const existing = await this.detectExistingSchema();

    if (!existing.found) {
      console.log('   ⚠️  No schema found - run injection instead');
      return { needsInject: true };
    }

    const needsUpdate = await this.needsUpdate(existing);

    if (!needsUpdate) {
      console.log('   ✅ Schema is already up to date');
      return { updated: false, upToDate: true };
    }

    console.log('   📝 Schema needs update - running auto-inject...');
    return await this.runAutoInject();
  }

  /**
   * Rollback schema changes
   */
  async rollback(backupId) {
    console.log(`\n🔄 Rolling back schema injection (Backup ID: ${backupId})...`);

    try {
      // Get backup
      const stmt = db.db.prepare(`
        SELECT * FROM auto_fix_actions
        WHERE id = ? AND fix_type = 'schema_inject_backup'
      `);
      const backup = stmt.get(backupId);

      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const backupData = JSON.parse(backup.before_state);

      // Get homepage
      const page = await this.wpClient.getPage(backupData.pageId);
      let content = page.content.rendered;

      // Remove current schema
      const jsonLdRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/gi;
      content = content.replace(jsonLdRegex, '');

      // Restore old schema if existed
      if (backupData.existingSchema) {
        const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(backupData.existingSchema, null, 2)}\n</script>`;
        content += '\n\n' + schemaScript;
      }

      // Update page
      await this.wpClient.updatePage(backupData.pageId, { content });

      // Log rollback
      const logStmt = db.db.prepare(`
        INSERT INTO auto_fix_actions
        (client_id, fix_type, target, before_state, status, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      logStmt.run(
        this.clientId,
        'schema_rollback',
        'homepage',
        JSON.stringify({ backupId }),
        'completed',
        JSON.stringify({ restoredExisting: !!backupData.existingSchema })
      );

      console.log('\n✅ Rollback complete');

      return { success: true, restored: !!backupData.existingSchema };

    } catch (error) {
      console.error('❌ Rollback error:', error.message);
      throw error;
    }
  }

  /**
   * Test schema with Google's Structured Data Testing Tool
   */
  async testWithGoogle() {
    console.log('\n🧪 Testing schema with Google...');

    // Note: Google deprecated the old testing tool
    // Now uses Rich Results Test: https://search.google.com/test/rich-results
    const testUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(this.config.siteUrl)}`;

    console.log(`\n📊 Test your schema here:`);
    console.log(`   ${testUrl}`);
    console.log('');

    return {
      testUrl,
      message: 'Please manually verify schema using Google Rich Results Test'
    };
  }
}

export default SchemaAutoInjector;
