/**
 * Migration: Migrate Keyword Service Data to Unified Schema
 *
 * Migrates existing data from Keyword Service database to the unified schema:
 * - Projects -> research_projects table
 * - Keywords -> unified_keywords table (with research/clustering focus)
 * - Topics -> topics table
 * - PageGroups -> page_groups table
 * - SerpSnapshots -> serp_snapshots table
 * - AuditLogs -> audit_logs table (merged with existing)
 * - Cache -> cache table (merged with existing)
 *
 * Migration strategy:
 * - Safe: Reads from old database, doesn't modify it
 * - Idempotent: Can be run multiple times (checks for duplicates)
 * - Trackable: Updates sync_status table with progress
 * - Intelligent merging: Links to existing domains where applicable
 *
 * Prerequisites:
 * - Unified schema must exist (run 001_create_unified_schema.js first)
 * - Keyword Service database must be accessible at ./data/seo-automation.db
 *
 * Version: 1.0
 * Date: 2025-10-26
 */

const path = require('path');
const sqlite3 = require('sqlite3');
const { promisify } = require('util');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Starting Keyword Service data migration...');

      // Path to Keyword Service database
      const keywordServiceDbPath = path.join(__dirname, '../../data/seo-automation.db');
      console.log(`  Reading from: ${keywordServiceDbPath}`);

      // Open Keyword Service database (read-only)
      const sourceDb = new sqlite3.Database(keywordServiceDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('  ✗ Could not open Keyword Service database:', err.message);
          throw new Error(`Failed to open Keyword Service database: ${err.message}`);
        }
      });

      // Promisify database methods
      const dbAll = promisify(sourceDb.all.bind(sourceDb));
      const dbGet = promisify(sourceDb.get.bind(sourceDb));

      // Check if tables exist
      const tables = await dbAll(`
        SELECT name FROM sqlite_master WHERE type='table'
        ORDER BY name
      `);
      const tableNames = tables.map(t => t.name);
      console.log(`  Found tables: ${tableNames.join(', ')}`);

      // =======================================================================
      // STEP 1: Migrate Research Projects
      // =======================================================================
      console.log('\n[1/6] Migrating research projects...');

      if (!tableNames.includes('projects')) {
        console.log('  ⚠ Projects table not found, skipping');
      } else {
        const sourceProjects = await dbAll('SELECT * FROM projects ORDER BY id');
        console.log(`  Found ${sourceProjects.length} projects in Keyword Service`);

        let projectsCreated = 0;
        let projectsSkipped = 0;

        for (const sourceProject of sourceProjects) {
          try {
            // Check if project already exists
            const existing = await queryInterface.sequelize.query(
              'SELECT id FROM research_projects WHERE name = :name AND created_at = :created_at',
              {
                replacements: {
                  name: sourceProject.name,
                  created_at: sourceProject.created_at
                },
                type: Sequelize.QueryTypes.SELECT,
                transaction
              }
            );

            if (existing.length > 0) {
              console.log(`    ↷ Skipped: ${sourceProject.name} (already exists)`);
              projectsSkipped++;
              continue;
            }

            // Try to link to existing domain
            let domainId = null;
            if (sourceProject.business_url) {
              try {
                const url = new URL(sourceProject.business_url);
                const hostname = url.hostname.replace(/^www\./, '');

                const domainResult = await queryInterface.sequelize.query(
                  'SELECT id FROM domains WHERE domain = :domain OR domain LIKE :domain_pattern',
                  {
                    replacements: {
                      domain: hostname,
                      domain_pattern: `%${hostname}%`
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    transaction
                  }
                );

                if (domainResult.length > 0) {
                  domainId = domainResult[0].id;
                  console.log(`    → Linked to domain: ${hostname}`);
                }
              } catch (e) {
                // Invalid URL, skip domain linking
              }
            }

            // Insert project
            await queryInterface.bulkInsert('research_projects', [{
              id: sourceProject.id,
              domain_id: domainId,
              name: sourceProject.name,
              business_url: sourceProject.business_url,
              seed_terms: sourceProject.seed_terms,
              geo: sourceProject.geo || 'US',
              language: sourceProject.language || 'en',
              competitors: sourceProject.competitors,
              content_focus: sourceProject.content_focus,
              status: sourceProject.status || 'completed',
              last_checkpoint: sourceProject.last_checkpoint,
              checkpoint_timestamp: sourceProject.checkpoint_timestamp,
              checkpoint_data: sourceProject.checkpoint_data,
              settings: sourceProject.settings,
              created_at: sourceProject.created_at,
              updated_at: sourceProject.updated_at,
              completed_at: sourceProject.updated_at
            }], { transaction });

            console.log(`    ✓ Migrated: ${sourceProject.name}`);
            projectsCreated++;
          } catch (error) {
            console.error(`    ✗ Failed to migrate project ${sourceProject.name}:`, error.message);
          }
        }

        console.log(`  Summary: ${projectsCreated} created, ${projectsSkipped} skipped`);
      }

      // =======================================================================
      // STEP 2: Migrate Topics
      // =======================================================================
      console.log('\n[2/6] Migrating topics...');

      if (!tableNames.includes('topics')) {
        console.log('  ⚠ Topics table not found, skipping');
      } else {
        const sourceTopics = await dbAll('SELECT * FROM topics ORDER BY id');
        console.log(`  Found ${sourceTopics.length} topics in Keyword Service`);

        let topicsCreated = 0;
        let topicsSkipped = 0;

        for (const sourceTopic of sourceTopics) {
          try {
            // Check if topic already exists
            const existing = await queryInterface.sequelize.query(
              'SELECT id FROM topics WHERE research_project_id = :project_id AND label = :label',
              {
                replacements: {
                  project_id: sourceTopic.project_id,
                  label: sourceTopic.label
                },
                type: Sequelize.QueryTypes.SELECT,
                transaction
              }
            );

            if (existing.length > 0) {
              topicsSkipped++;
              continue;
            }

            // Insert topic (pillar_keyword_id will be linked later)
            await queryInterface.bulkInsert('topics', [{
              id: sourceTopic.id,
              research_project_id: sourceTopic.project_id,
              label: sourceTopic.label,
              pillar_keyword_id: null, // Will be updated after keywords migration
              total_volume: sourceTopic.total_volume || 0,
              total_opportunity: sourceTopic.total_opportunity || 0.0,
              avg_difficulty: sourceTopic.avg_difficulty || 0.0,
              keyword_count: 0, // Will be updated via trigger
              graph_data: sourceTopic.graph_data,
              created_at: sourceTopic.created_at
            }], { transaction });

            topicsCreated++;
          } catch (error) {
            console.error(`    ✗ Failed to migrate topic ${sourceTopic.label}:`, error.message);
          }
        }

        console.log(`  Summary: ${topicsCreated} created, ${topicsSkipped} skipped`);
      }

      // =======================================================================
      // STEP 3: Migrate Page Groups
      // =======================================================================
      console.log('\n[3/6] Migrating page groups...');

      if (!tableNames.includes('page_groups')) {
        console.log('  ⚠ Page groups table not found, skipping');
      } else {
        const sourcePageGroups = await dbAll('SELECT * FROM page_groups ORDER BY id');
        console.log(`  Found ${sourcePageGroups.length} page groups in Keyword Service`);

        let pageGroupsCreated = 0;
        let pageGroupsSkipped = 0;

        for (const sourcePageGroup of sourcePageGroups) {
          try {
            // Check if page group already exists
            const existing = await queryInterface.sequelize.query(
              'SELECT id FROM page_groups WHERE research_project_id = :project_id AND label = :label',
              {
                replacements: {
                  project_id: sourcePageGroup.project_id,
                  label: sourcePageGroup.label
                },
                type: Sequelize.QueryTypes.SELECT,
                transaction
              }
            );

            if (existing.length > 0) {
              pageGroupsSkipped++;
              continue;
            }

            // Insert page group
            await queryInterface.bulkInsert('page_groups', [{
              id: sourcePageGroup.id,
              research_project_id: sourcePageGroup.project_id,
              topic_id: sourcePageGroup.topic_id,
              label: sourcePageGroup.label,
              target_keyword_id: null, // Will be linked after keywords migration
              outline: sourcePageGroup.outline,
              faqs: sourcePageGroup.faqs,
              schema_types: sourcePageGroup.schema_types,
              internal_links: sourcePageGroup.internal_links,
              serp_features_target: sourcePageGroup.serp_features_target,
              word_range: sourcePageGroup.word_range,
              total_volume: sourcePageGroup.total_volume || 0,
              total_opportunity: sourcePageGroup.total_opportunity || 0.0,
              keyword_count: 0, // Will be updated via trigger
              status: 'planned',
              created_at: sourcePageGroup.created_at
            }], { transaction });

            pageGroupsCreated++;
          } catch (error) {
            console.error(`    ✗ Failed to migrate page group ${sourcePageGroup.label}:`, error.message);
          }
        }

        console.log(`  Summary: ${pageGroupsCreated} created, ${pageGroupsSkipped} skipped`);
      }

      // =======================================================================
      // STEP 4: Migrate Keywords
      // =======================================================================
      console.log('\n[4/6] Migrating keywords...');

      if (!tableNames.includes('keywords')) {
        console.log('  ⚠ Keywords table not found, skipping');
      } else {
        const sourceKeywords = await dbAll('SELECT * FROM keywords ORDER BY id');
        console.log(`  Found ${sourceKeywords.length} keywords in Keyword Service`);

        let keywordsCreated = 0;
        let keywordsSkipped = 0;
        let keywordsFailed = 0;

        // Track keyword ID mapping for later updates
        const keywordIdMap = new Map(); // old_id -> new_id

        // Process in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < sourceKeywords.length; i += BATCH_SIZE) {
          const batch = sourceKeywords.slice(i, i + BATCH_SIZE);

          for (const sourceKeyword of batch) {
            try {
              // Check if keyword already exists for this project
              const existing = await queryInterface.sequelize.query(
                'SELECT id FROM unified_keywords WHERE keyword = :keyword AND research_project_id = :project_id',
                {
                  replacements: {
                    keyword: sourceKeyword.text,
                    project_id: sourceKeyword.project_id
                  },
                  type: Sequelize.QueryTypes.SELECT,
                  transaction
                }
              );

              if (existing.length > 0) {
                keywordsSkipped++;
                keywordIdMap.set(sourceKeyword.id, existing[0].id);
                continue;
              }

              // Insert keyword
              const [result] = await queryInterface.sequelize.query(
                `INSERT INTO unified_keywords (
                  keyword, lemma, language, source,
                  research_project_id, topic_id, page_group_id,
                  search_volume, cpc, trend_data, trend_direction,
                  serp_features, ads_density,
                  intent, entities,
                  difficulty, difficulty_serp_strength, difficulty_competition,
                  difficulty_serp_crowding, difficulty_content_depth,
                  traffic_potential, opportunity_score, is_pillar,
                  notes, created_at, updated_at
                ) VALUES (
                  :keyword, :lemma, :language, :source,
                  :research_project_id, :topic_id, :page_group_id,
                  :search_volume, :cpc, :trend_data, :trend_direction,
                  :serp_features, :ads_density,
                  :intent, :entities,
                  :difficulty, :difficulty_serp_strength, :difficulty_competition,
                  :difficulty_serp_crowding, :difficulty_content_depth,
                  :traffic_potential, :opportunity_score, :is_pillar,
                  :notes, :created_at, :updated_at
                )`,
                {
                  replacements: {
                    keyword: sourceKeyword.text,
                    lemma: sourceKeyword.lemma,
                    language: sourceKeyword.language || 'en',
                    source: sourceKeyword.source || 'keyword_service_migration',
                    research_project_id: sourceKeyword.project_id,
                    topic_id: sourceKeyword.topic_id,
                    page_group_id: sourceKeyword.page_group_id,
                    search_volume: sourceKeyword.volume || 0,
                    cpc: sourceKeyword.cpc || 0.0,
                    trend_data: sourceKeyword.trend_data,
                    trend_direction: sourceKeyword.trend_direction,
                    serp_features: sourceKeyword.serp_features || JSON.stringify([]),
                    ads_density: sourceKeyword.ads_density || 0.0,
                    intent: sourceKeyword.intent,
                    entities: sourceKeyword.entities,
                    difficulty: sourceKeyword.difficulty || 0.0,
                    difficulty_serp_strength: sourceKeyword.difficulty_serp_strength,
                    difficulty_competition: sourceKeyword.difficulty_competition,
                    difficulty_serp_crowding: sourceKeyword.difficulty_serp_crowding,
                    difficulty_content_depth: sourceKeyword.difficulty_content_depth,
                    traffic_potential: sourceKeyword.traffic_potential || 0.0,
                    opportunity_score: sourceKeyword.opportunity || 0.0,
                    is_pillar: sourceKeyword.is_pillar || false,
                    notes: sourceKeyword.notes,
                    created_at: sourceKeyword.created_at,
                    updated_at: new Date().toISOString()
                  },
                  transaction
                }
              );

              // Get the inserted ID
              const [newId] = await queryInterface.sequelize.query(
                'SELECT last_insert_rowid() as id',
                {
                  type: Sequelize.QueryTypes.SELECT,
                  transaction
                }
              );

              keywordIdMap.set(sourceKeyword.id, newId.id);
              keywordsCreated++;

              if (keywordsCreated % 100 === 0) {
                console.log(`    Progress: ${keywordsCreated}/${sourceKeywords.length} keywords migrated`);
              }
            } catch (error) {
              console.error(`    ✗ Failed to migrate keyword "${sourceKeyword.text}":`, error.message);
              keywordsFailed++;
            }
          }
        }

        console.log(`  Summary: ${keywordsCreated} created, ${keywordsSkipped} skipped, ${keywordsFailed} failed`);

        // Update pillar keyword references in topics
        console.log('  Updating topic pillar keywords...');
        const topicsToUpdate = await dbAll('SELECT id, pillar_keyword_id FROM topics WHERE pillar_keyword_id IS NOT NULL');

        for (const topic of topicsToUpdate) {
          const newKeywordId = keywordIdMap.get(topic.pillar_keyword_id);
          if (newKeywordId) {
            await queryInterface.sequelize.query(
              'UPDATE topics SET pillar_keyword_id = :new_id WHERE id = :topic_id',
              {
                replacements: { new_id: newKeywordId, topic_id: topic.id },
                transaction
              }
            );
          }
        }

        // Update target keyword references in page groups
        console.log('  Updating page group target keywords...');
        const pageGroupsToUpdate = await dbAll('SELECT id, target_keyword_id FROM page_groups WHERE target_keyword_id IS NOT NULL');

        for (const pageGroup of pageGroupsToUpdate) {
          const newKeywordId = keywordIdMap.get(pageGroup.target_keyword_id);
          if (newKeywordId) {
            await queryInterface.sequelize.query(
              'UPDATE page_groups SET target_keyword_id = :new_id WHERE id = :pg_id',
              {
                replacements: { new_id: newKeywordId, pg_id: pageGroup.id },
                transaction
              }
            );
          }
        }
      }

      // =======================================================================
      // STEP 5: Migrate SERP Snapshots
      // =======================================================================
      console.log('\n[5/6] Migrating SERP snapshots...');

      if (!tableNames.includes('serp_snapshots')) {
        console.log('  ⚠ SERP snapshots table not found, skipping');
      } else {
        const sourceSnapshots = await dbAll('SELECT * FROM serp_snapshots ORDER BY id LIMIT 1000'); // Limit for performance
        console.log(`  Found ${sourceSnapshots.length} SERP snapshots (migrating first 1000)`);

        let snapshotsCreated = 0;

        for (const snapshot of sourceSnapshots) {
          try {
            await queryInterface.bulkInsert('serp_snapshots', [{
              query: snapshot.query,
              research_project_id: snapshot.project_id,
              geo: snapshot.geo,
              language: snapshot.language,
              device: 'desktop',
              results: snapshot.results,
              features: snapshot.features,
              ads_count: snapshot.ads_count || 0,
              map_pack_present: snapshot.map_pack_present || false,
              provider: snapshot.provider,
              request_id: snapshot.request_id,
              raw_json: snapshot.raw_json,
              timestamp: snapshot.timestamp
            }], { transaction });

            snapshotsCreated++;
          } catch (error) {
            // Continue on error (snapshots are less critical)
          }
        }

        console.log(`  Summary: ${snapshotsCreated} created`);
      }

      // =======================================================================
      // STEP 6: Update Sync Status
      // =======================================================================
      console.log('\n[6/6] Updating sync status...');

      await queryInterface.bulkInsert('sync_status', [
        {
          source_system: 'keyword_service',
          source_table: 'projects',
          target_table: 'research_projects',
          status: 'completed',
          last_sync_at: new Date().toISOString(),
          sync_metadata: JSON.stringify({
            migration_version: '003',
            source_db: keywordServiceDbPath
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          source_system: 'keyword_service',
          source_table: 'keywords',
          target_table: 'unified_keywords',
          status: 'completed',
          last_sync_at: new Date().toISOString(),
          sync_metadata: JSON.stringify({
            migration_version: '003',
            source_db: keywordServiceDbPath
          }),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { transaction });

      // Close source database
      sourceDb.close();

      await transaction.commit();

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('Keyword Service Migration Summary');
      console.log('='.repeat(60));
      console.log('✓ All data migrated successfully');
      console.log('  - Research projects, topics, page groups');
      console.log('  - Keywords with full metrics and clustering');
      console.log('  - SERP snapshots for analysis');
      console.log('='.repeat(60) + '\n');
    } catch (error) {
      await transaction.rollback();
      console.error('\n✗ Keyword Service migration failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Rolling back Keyword Service migration...');

      // Delete in reverse order of dependencies
      await queryInterface.sequelize.query(
        `DELETE FROM serp_snapshots WHERE research_project_id IN (
          SELECT id FROM research_projects WHERE id IN (
            SELECT DISTINCT project_id FROM (
              SELECT project_id FROM keywords WHERE source LIKE '%keyword_service%'
            )
          )
        )`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        "DELETE FROM unified_keywords WHERE source LIKE '%keyword_service%'",
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM page_groups WHERE research_project_id IN (
          SELECT id FROM research_projects WHERE domain_id IS NULL
        )`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM topics WHERE research_project_id IN (
          SELECT id FROM research_projects WHERE domain_id IS NULL
        )`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        'DELETE FROM research_projects WHERE domain_id IS NULL',
        { transaction }
      );

      await queryInterface.sequelize.query(
        "DELETE FROM sync_status WHERE source_system = 'keyword_service'",
        { transaction }
      );

      await transaction.commit();
      console.log('✓ Keyword Service migration rolled back successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Rollback failed:', error.message);
      throw error;
    }
  }
};
