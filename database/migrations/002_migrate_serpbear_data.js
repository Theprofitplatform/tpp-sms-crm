/**
 * Migration: Migrate SerpBear Data to Unified Schema
 *
 * Migrates existing data from SerpBear database to the unified schema:
 * - Domains -> domains table
 * - Keywords -> unified_keywords table (with position tracking focus)
 *
 * Migration strategy:
 * - Safe: Reads from old database, doesn't modify it
 * - Idempotent: Can be run multiple times (checks for duplicates)
 * - Trackable: Updates sync_status table with progress
 * - Transactional: All-or-nothing within each batch
 *
 * Prerequisites:
 * - Unified schema must exist (run 001_create_unified_schema.js first)
 * - SerpBear database must be accessible at ./serpbear/data/database.sqlite
 *
 * Version: 1.0
 * Date: 2025-10-26
 */

const path = require('path');
const sqlite3 = require('sqlite3');
const { promisify } = require('util');

// Helper to slugify domain names
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Starting SerpBear data migration...');

      // Path to SerpBear database
      const serpbearDbPath = path.join(__dirname, '../../serpbear/data/database.sqlite');
      console.log(`  Reading from: ${serpbearDbPath}`);

      // Open SerpBear database (read-only)
      const sourceDb = new sqlite3.Database(serpbearDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('  ✗ Could not open SerpBear database:', err.message);
          throw new Error(`Failed to open SerpBear database: ${err.message}`);
        }
      });

      // Promisify database methods
      const dbAll = promisify(sourceDb.all.bind(sourceDb));
      const dbGet = promisify(sourceDb.get.bind(sourceDb));

      // =======================================================================
      // STEP 1: Migrate Domains
      // =======================================================================
      console.log('\n[1/2] Migrating domains...');

      const sourceDomains = await dbAll('SELECT * FROM domain ORDER BY ID');
      console.log(`  Found ${sourceDomains.length} domains in SerpBear`);

      let domainsCreated = 0;
      let domainsSkipped = 0;

      for (const sourceDomain of sourceDomains) {
        try {
          // Check if domain already exists
          const existing = await queryInterface.sequelize.query(
            'SELECT id FROM domains WHERE domain = :domain',
            {
              replacements: { domain: sourceDomain.domain },
              type: Sequelize.QueryTypes.SELECT,
              transaction
            }
          );

          if (existing.length > 0) {
            console.log(`    ↷ Skipped: ${sourceDomain.domain} (already exists)`);
            domainsSkipped++;
            continue;
          }

          // Parse tags (stored as JSON string in SerpBear)
          let tags = [];
          try {
            if (sourceDomain.tags) {
              tags = JSON.parse(sourceDomain.tags);
            }
          } catch (e) {
            tags = [];
          }

          // Parse search console settings
          let searchConsole = null;
          try {
            if (sourceDomain.search_console) {
              searchConsole = JSON.parse(sourceDomain.search_console);
            }
          } catch (e) {
            searchConsole = sourceDomain.search_console ? { config: sourceDomain.search_console } : null;
          }

          // Insert domain
          await queryInterface.bulkInsert('domains', [{
            id: sourceDomain.ID,
            domain: sourceDomain.domain,
            slug: sourceDomain.slug,
            display_name: sourceDomain.domain, // Use domain as display name
            tags: JSON.stringify(tags),
            keyword_count: sourceDomain.keywordCount || 0,
            active: true,
            notification: sourceDomain.notification !== false,
            notification_interval: sourceDomain.notification_interval || 'daily',
            notification_emails: sourceDomain.notification_emails || '',
            search_console: searchConsole ? JSON.stringify(searchConsole) : null,
            created_at: sourceDomain.added || new Date().toISOString(),
            updated_at: sourceDomain.lastUpdated || new Date().toISOString(),
            last_scrape_at: sourceDomain.lastUpdated || null
          }], { transaction });

          console.log(`    ✓ Migrated: ${sourceDomain.domain}`);
          domainsCreated++;
        } catch (error) {
          console.error(`    ✗ Failed to migrate domain ${sourceDomain.domain}:`, error.message);
          // Continue with next domain
        }
      }

      // =======================================================================
      // STEP 2: Migrate Keywords
      // =======================================================================
      console.log(`\n[2/2] Migrating keywords...`);

      const sourceKeywords = await dbAll('SELECT * FROM keyword ORDER BY ID');
      console.log(`  Found ${sourceKeywords.length} keywords in SerpBear`);

      let keywordsCreated = 0;
      let keywordsSkipped = 0;
      let keywordsFailed = 0;

      // Process in batches for better performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < sourceKeywords.length; i += BATCH_SIZE) {
        const batch = sourceKeywords.slice(i, i + BATCH_SIZE);

        for (const sourceKeyword of batch) {
          try {
            // Parse domain (stored as JSON string in SerpBear)
            let domainSlug = null;
            let domainId = null;

            try {
              const domainData = JSON.parse(sourceKeyword.domain);
              domainSlug = domainData.slug || domainData.domain;
            } catch (e) {
              domainSlug = sourceKeyword.domain;
            }

            // Look up domain ID
            const domainResult = await queryInterface.sequelize.query(
              'SELECT id FROM domains WHERE slug = :slug OR domain = :domain',
              {
                replacements: { slug: domainSlug, domain: domainSlug },
                type: Sequelize.QueryTypes.SELECT,
                transaction
              }
            );

            if (domainResult.length > 0) {
              domainId = domainResult[0].id;
            } else {
              console.log(`    ⚠ Warning: Domain not found for keyword "${sourceKeyword.keyword}", skipping`);
              keywordsSkipped++;
              continue;
            }

            // Check if keyword already exists for this domain
            const existing = await queryInterface.sequelize.query(
              'SELECT id FROM unified_keywords WHERE keyword = :keyword AND domain_id = :domain_id AND device = :device AND country = :country',
              {
                replacements: {
                  keyword: sourceKeyword.keyword,
                  domain_id: domainId,
                  device: sourceKeyword.device || 'desktop',
                  country: sourceKeyword.country || 'US'
                },
                type: Sequelize.QueryTypes.SELECT,
                transaction
              }
            );

            if (existing.length > 0) {
              keywordsSkipped++;
              continue;
            }

            // Parse JSON fields
            let positionHistory = [];
            let tags = [];
            let lastResult = null;
            let url = null;
            let settings = null;

            try {
              positionHistory = sourceKeyword.history ? JSON.parse(sourceKeyword.history) : [];
            } catch (e) {
              positionHistory = [];
            }

            try {
              tags = sourceKeyword.tags ? JSON.parse(sourceKeyword.tags) : [];
            } catch (e) {
              tags = [];
            }

            try {
              lastResult = sourceKeyword.lastResult ? JSON.parse(sourceKeyword.lastResult) : null;
            } catch (e) {
              lastResult = null;
            }

            try {
              url = sourceKeyword.url ? JSON.parse(sourceKeyword.url) : null;
            } catch (e) {
              url = sourceKeyword.url;
            }

            try {
              settings = sourceKeyword.settings ? JSON.parse(sourceKeyword.settings) : null;
            } catch (e) {
              settings = null;
            }

            // Insert keyword
            await queryInterface.bulkInsert('unified_keywords', [{
              keyword: sourceKeyword.keyword,
              source: 'serpbear_migration',
              domain_id: domainId,
              device: sourceKeyword.device || 'desktop',
              country: sourceKeyword.country || 'US',
              city: sourceKeyword.city || '',
              lat_long: sourceKeyword.latlong || '',
              position: sourceKeyword.position || 0,
              position_history: JSON.stringify(positionHistory),
              url: url,
              last_result: lastResult ? JSON.stringify(lastResult) : null,
              sticky: sourceKeyword.sticky !== false,
              updating: sourceKeyword.updating === true,
              last_update_error: sourceKeyword.lastUpdateError === 'false' ? null : sourceKeyword.lastUpdateError,
              search_volume: sourceKeyword.volume || 0,
              tags: JSON.stringify(tags),
              settings: settings ? JSON.stringify(settings) : null,
              created_at: sourceKeyword.added || new Date().toISOString(),
              updated_at: sourceKeyword.lastUpdated || new Date().toISOString(),
              last_tracked_at: sourceKeyword.lastUpdated || null
            }], { transaction });

            keywordsCreated++;

            if (keywordsCreated % 100 === 0) {
              console.log(`    Progress: ${keywordsCreated}/${sourceKeywords.length} keywords migrated`);
            }
          } catch (error) {
            console.error(`    ✗ Failed to migrate keyword "${sourceKeyword.keyword}":`, error.message);
            keywordsFailed++;
          }
        }
      }

      // =======================================================================
      // STEP 3: Update Sync Status
      // =======================================================================
      console.log('\n[3/3] Updating sync status...');

      await queryInterface.bulkInsert('sync_status', [
        {
          source_system: 'serpbear',
          source_table: 'domain',
          target_table: 'domains',
          status: 'completed',
          last_sync_at: new Date().toISOString(),
          records_total: sourceDomains.length,
          records_synced: domainsCreated,
          records_skipped: domainsSkipped,
          records_failed: 0,
          sync_metadata: JSON.stringify({
            migration_version: '002',
            source_db: serpbearDbPath
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          source_system: 'serpbear',
          source_table: 'keyword',
          target_table: 'unified_keywords',
          status: keywordsFailed > 0 ? 'completed_with_errors' : 'completed',
          last_sync_at: new Date().toISOString(),
          records_total: sourceKeywords.length,
          records_synced: keywordsCreated,
          records_skipped: keywordsSkipped,
          records_failed: keywordsFailed,
          last_error: keywordsFailed > 0 ? `${keywordsFailed} keywords failed to migrate` : null,
          sync_metadata: JSON.stringify({
            migration_version: '002',
            source_db: serpbearDbPath
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { transaction });

      // Close source database
      sourceDb.close();

      await transaction.commit();

      // =======================================================================
      // Summary
      // =======================================================================
      console.log('\n' + '='.repeat(60));
      console.log('SerpBear Migration Summary');
      console.log('='.repeat(60));
      console.log(`Domains:`);
      console.log(`  ✓ Created: ${domainsCreated}`);
      console.log(`  ↷ Skipped: ${domainsSkipped} (already exist)`);
      console.log(`\nKeywords:`);
      console.log(`  ✓ Created: ${keywordsCreated}`);
      console.log(`  ↷ Skipped: ${keywordsSkipped} (already exist or invalid)`);
      console.log(`  ✗ Failed: ${keywordsFailed}`);
      console.log('='.repeat(60));
      console.log('✓ SerpBear migration completed successfully\n');
    } catch (error) {
      await transaction.rollback();
      console.error('\n✗ SerpBear migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Rolling back SerpBear migration...');

      // Delete migrated keywords
      const keywordsDeleted = await queryInterface.sequelize.query(
        'DELETE FROM unified_keywords WHERE source = :source',
        {
          replacements: { source: 'serpbear_migration' },
          type: Sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      console.log(`  ✓ Deleted ${keywordsDeleted} migrated keywords`);

      // Delete migrated domains (only if they have no other keywords)
      const domainsDeleted = await queryInterface.sequelize.query(
        `DELETE FROM domains WHERE id IN (
          SELECT d.id FROM domains d
          LEFT JOIN unified_keywords k ON d.id = k.domain_id AND k.source != 'serpbear_migration'
          GROUP BY d.id
          HAVING COUNT(k.id) = 0
        )`,
        {
          type: Sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      console.log(`  ✓ Deleted ${domainsDeleted} migrated domains`);

      // Delete sync status records
      await queryInterface.sequelize.query(
        'DELETE FROM sync_status WHERE source_system = :system',
        {
          replacements: { system: 'serpbear' },
          type: Sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      await transaction.commit();
      console.log('✓ SerpBear migration rolled back successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Rollback failed:', error.message);
      throw error;
    }
  }
};
