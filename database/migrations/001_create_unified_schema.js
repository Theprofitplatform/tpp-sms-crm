/**
 * Migration: Create Unified Database Schema
 *
 * Creates all tables for the unified SEO monitoring platform,
 * combining SerpBear position tracking with Keyword Service research capabilities.
 *
 * Tables created:
 * - domains: Website/client registry
 * - research_projects: Keyword research projects
 * - unified_keywords: Central keyword storage
 * - topics: Thematic keyword clusters
 * - page_groups: Single-page keyword targets
 * - serp_snapshots: Historical SERP data
 * - sync_status: Migration tracking
 * - audit_logs: Operation audit trail
 * - cache: API response caching
 *
 * Compatible with: SQLite (development) and PostgreSQL (production)
 * Version: 1.0
 * Date: 2025-10-26
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // =======================================================================
      // DOMAINS TABLE
      // =======================================================================
      await queryInterface.createTable('domains', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        domain: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        slug: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true
        },
        display_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        tags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        keyword_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notification: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notification_interval: {
          type: Sequelize.STRING(20),
          defaultValue: 'daily'
        },
        notification_emails: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        search_console: {
          type: Sequelize.JSON,
          allowNull: true
        },
        ga_property: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        last_scrape_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('domains', ['active'], { transaction });
      await queryInterface.addIndex('domains', ['updated_at'], { transaction });

      // =======================================================================
      // RESEARCH PROJECTS TABLE
      // =======================================================================
      await queryInterface.createTable('research_projects', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        domain_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'domains',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        business_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        seed_terms: {
          type: Sequelize.JSON,
          allowNull: true
        },
        geo: {
          type: Sequelize.STRING(10),
          defaultValue: 'US'
        },
        language: {
          type: Sequelize.STRING(10),
          defaultValue: 'en'
        },
        competitors: {
          type: Sequelize.JSON,
          allowNull: true
        },
        content_focus: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'draft'
        },
        last_checkpoint: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        checkpoint_timestamp: {
          type: Sequelize.DATE,
          allowNull: true
        },
        checkpoint_data: {
          type: Sequelize.JSON,
          allowNull: true
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('research_projects', ['domain_id'], { transaction });
      await queryInterface.addIndex('research_projects', ['status'], { transaction });
      await queryInterface.addIndex('research_projects', ['created_at'], { transaction });

      // =======================================================================
      // TOPICS TABLE (needed before unified_keywords for foreign keys)
      // =======================================================================
      await queryInterface.createTable('topics', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        research_project_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'research_projects',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        label: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        pillar_keyword_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        total_volume: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        total_opportunity: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        avg_difficulty: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        keyword_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        graph_data: {
          type: Sequelize.JSON,
          allowNull: true
        },
        color: {
          type: Sequelize.STRING(7),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('topics', ['research_project_id'], { transaction });

      // =======================================================================
      // PAGE GROUPS TABLE (needed before unified_keywords for foreign keys)
      // =======================================================================
      await queryInterface.createTable('page_groups', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        research_project_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'research_projects',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        topic_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'topics',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        label: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        target_keyword_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        target_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        outline: {
          type: Sequelize.JSON,
          allowNull: true
        },
        faqs: {
          type: Sequelize.JSON,
          allowNull: true
        },
        schema_types: {
          type: Sequelize.JSON,
          allowNull: true
        },
        internal_links: {
          type: Sequelize.JSON,
          allowNull: true
        },
        serp_features_target: {
          type: Sequelize.JSON,
          allowNull: true
        },
        word_range: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        total_volume: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        total_opportunity: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        keyword_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'planned'
        },
        published_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        published_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('page_groups', ['research_project_id'], { transaction });
      await queryInterface.addIndex('page_groups', ['topic_id'], { transaction });
      await queryInterface.addIndex('page_groups', ['status'], { transaction });

      // =======================================================================
      // UNIFIED KEYWORDS TABLE
      // =======================================================================
      await queryInterface.createTable('unified_keywords', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        keyword: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        lemma: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        language: {
          type: Sequelize.STRING(10),
          defaultValue: 'en'
        },
        source: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        domain_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'domains',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        research_project_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'research_projects',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        topic_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'topics',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        page_group_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'page_groups',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        device: {
          type: Sequelize.STRING(20),
          defaultValue: 'desktop'
        },
        country: {
          type: Sequelize.STRING(10),
          defaultValue: 'US'
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        lat_long: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        position: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        position_history: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        url: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        last_result: {
          type: Sequelize.JSON,
          allowNull: true
        },
        sticky: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        updating: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        last_update_error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        search_volume: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        cpc: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        trend_data: {
          type: Sequelize.JSON,
          allowNull: true
        },
        trend_direction: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        serp_features: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        ads_density: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        ads_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        map_pack_present: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        intent: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        entities: {
          type: Sequelize.JSON,
          allowNull: true
        },
        difficulty: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        difficulty_serp_strength: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        difficulty_competition: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        difficulty_serp_crowding: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        difficulty_content_depth: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        traffic_potential: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        opportunity_score: {
          type: Sequelize.FLOAT,
          defaultValue: 0.0
        },
        is_pillar: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        tags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        last_tracked_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // Indexes for unified_keywords
      await queryInterface.addIndex('unified_keywords', ['domain_id'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['research_project_id'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['topic_id'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['page_group_id'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['domain_id', 'position'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['research_project_id', 'opportunity_score'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['research_project_id', 'intent'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['lemma'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['updated_at'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['last_tracked_at'], { transaction });
      await queryInterface.addIndex('unified_keywords', ['domain_id', 'device', 'country'], { transaction });

      // Add foreign key for topics.pillar_keyword_id (now that unified_keywords exists)
      await queryInterface.addConstraint('topics', {
        fields: ['pillar_keyword_id'],
        type: 'foreign key',
        name: 'topics_pillar_keyword_fk',
        references: {
          table: 'unified_keywords',
          field: 'id'
        },
        onDelete: 'SET NULL',
        transaction
      });

      await queryInterface.addIndex('topics', ['pillar_keyword_id'], { transaction });

      // Add foreign key for page_groups.target_keyword_id
      await queryInterface.addConstraint('page_groups', {
        fields: ['target_keyword_id'],
        type: 'foreign key',
        name: 'page_groups_target_keyword_fk',
        references: {
          table: 'unified_keywords',
          field: 'id'
        },
        onDelete: 'SET NULL',
        transaction
      });

      await queryInterface.addIndex('page_groups', ['target_keyword_id'], { transaction });

      // =======================================================================
      // SERP SNAPSHOTS TABLE
      // =======================================================================
      await queryInterface.createTable('serp_snapshots', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        query: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        keyword_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'unified_keywords',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        research_project_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'research_projects',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        geo: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        language: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        device: {
          type: Sequelize.STRING(20),
          defaultValue: 'desktop'
        },
        results: {
          type: Sequelize.JSON,
          allowNull: true
        },
        features: {
          type: Sequelize.JSON,
          allowNull: true
        },
        ads_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        map_pack_present: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        provider: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        request_id: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        raw_json: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        timestamp: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('serp_snapshots', ['keyword_id'], { transaction });
      await queryInterface.addIndex('serp_snapshots', ['research_project_id'], { transaction });
      await queryInterface.addIndex('serp_snapshots', ['query', 'geo', 'language'], { transaction });
      await queryInterface.addIndex('serp_snapshots', ['timestamp'], { transaction });

      // =======================================================================
      // SYNC STATUS TABLE
      // =======================================================================
      await queryInterface.createTable('sync_status', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        source_system: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        source_table: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        target_table: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        status: {
          type: Sequelize.STRING(50),
          defaultValue: 'pending'
        },
        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        next_sync_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        records_total: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        records_synced: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        records_failed: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        records_skipped: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        last_error: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        error_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        sync_metadata: {
          type: Sequelize.JSON,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('sync_status', ['source_system'], { transaction });
      await queryInterface.addIndex('sync_status', ['status'], { transaction });
      await queryInterface.addIndex('sync_status', ['next_sync_at'], { transaction });
      await queryInterface.addIndex('sync_status', ['source_system', 'source_table', 'target_table'], {
        unique: true,
        name: 'sync_status_unique_idx',
        transaction
      });

      // =======================================================================
      // AUDIT LOGS TABLE
      // =======================================================================
      await queryInterface.createTable('audit_logs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        research_project_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'research_projects',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        domain_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'domains',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        operation: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        data_source: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        provider: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        request_id: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        quota_consumed: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        audit_metadata: {
          type: Sequelize.JSON,
          allowNull: true
        },
        timestamp: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('audit_logs', ['research_project_id'], { transaction });
      await queryInterface.addIndex('audit_logs', ['domain_id'], { transaction });
      await queryInterface.addIndex('audit_logs', ['operation'], { transaction });
      await queryInterface.addIndex('audit_logs', ['status'], { transaction });
      await queryInterface.addIndex('audit_logs', ['timestamp'], { transaction });
      await queryInterface.addIndex('audit_logs', ['data_source'], { transaction });

      // =======================================================================
      // CACHE TABLE
      // =======================================================================
      await queryInterface.createTable('cache', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        cache_key: {
          type: Sequelize.STRING(500),
          allowNull: false,
          unique: true
        },
        value: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        hit_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        last_hit_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        cache_metadata: {
          type: Sequelize.JSON,
          allowNull: true
        }
      }, { transaction });

      await queryInterface.addIndex('cache', ['cache_key', 'expires_at'], { transaction });
      await queryInterface.addIndex('cache', ['expires_at'], { transaction });

      await transaction.commit();
      console.log('✓ Unified schema created successfully');
      console.log('  - 9 tables created');
      console.log('  - Foreign keys established');
      console.log('  - Indexes created for performance');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Migration failed:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop tables in reverse order to respect foreign keys
      await queryInterface.dropTable('cache', { transaction });
      await queryInterface.dropTable('audit_logs', { transaction });
      await queryInterface.dropTable('sync_status', { transaction });
      await queryInterface.dropTable('serp_snapshots', { transaction });
      await queryInterface.dropTable('unified_keywords', { transaction });
      await queryInterface.dropTable('page_groups', { transaction });
      await queryInterface.dropTable('topics', { transaction });
      await queryInterface.dropTable('research_projects', { transaction });
      await queryInterface.dropTable('domains', { transaction });

      await transaction.commit();
      console.log('✓ Unified schema rolled back successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Rollback failed:', error.message);
      throw error;
    }
  }
};
