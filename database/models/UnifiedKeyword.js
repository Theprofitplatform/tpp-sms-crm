/**
 * Unified Keyword Model
 *
 * Combines position tracking (SerpBear) and research data (Keyword Service)
 * into a single unified model for SEO monitoring and content planning.
 *
 * Features:
 * - Position tracking with history
 * - Search metrics (volume, CPC, trends)
 * - SERP features and difficulty scoring
 * - Intent classification and entity extraction
 * - Clustering (topics and page groups)
 * - Opportunity scoring for prioritization
 *
 * Compatible with TypeScript when using sequelize-typescript
 */

const { Model, DataTypes } = require('sequelize');

class UnifiedKeyword extends Model {
  /**
   * Initialize the model
   * @param {import('sequelize').Sequelize} sequelize
   */
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },

        // ===================================================================
        // Core Keyword Data
        // ===================================================================
        keyword: {
          type: DataTypes.STRING(500),
          allowNull: false,
          comment: 'The keyword text/phrase'
        },

        lemma: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment: 'Normalized/lemmatized form for deduplication'
        },

        language: {
          type: DataTypes.STRING(10),
          defaultValue: 'en',
          comment: 'Language code (ISO 639-1)'
        },

        source: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'Origin: seed, autosuggest, paa, competitor, manual, etc.'
        },

        // ===================================================================
        // Associations
        // ===================================================================
        domainId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'domain_id',
          comment: 'Domain being tracked (for position monitoring)'
        },

        researchProjectId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'research_project_id',
          comment: 'Research project (for keyword discovery)'
        },

        topicId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'topic_id',
          comment: 'Topic cluster (broader thematic grouping)'
        },

        pageGroupId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'page_group_id',
          comment: 'Page group (single-page targeting cluster)'
        },

        // ===================================================================
        // Position Tracking (SerpBear functionality)
        // ===================================================================
        device: {
          type: DataTypes.STRING(20),
          defaultValue: 'desktop',
          comment: 'Device type: desktop, mobile, tablet'
        },

        country: {
          type: DataTypes.STRING(10),
          defaultValue: 'US',
          comment: 'Country code for SERP location'
        },

        city: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: 'City for local SERP tracking'
        },

        latLong: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: 'lat_long',
          comment: 'Lat/long coordinates for precise location'
        },

        position: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          comment: 'Current SERP position (0 = not ranking)'
        },

        positionHistory: {
          type: DataTypes.JSON,
          defaultValue: [],
          field: 'position_history',
          comment: 'Historical positions: [{date, position, url}]'
        },

        url: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'URL currently ranking for this keyword'
        },

        lastResult: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'last_result',
          comment: 'Last SERP result data from position check'
        },

        // Tracking settings
        sticky: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          comment: 'Pin to top of lists in UI'
        },

        updating: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          comment: 'Currently being refreshed'
        },

        lastUpdateError: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'last_update_error',
          comment: 'Last error encountered during tracking'
        },

        // ===================================================================
        // SEO Metrics
        // ===================================================================
        searchVolume: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'search_volume',
          comment: 'Monthly search volume'
        },

        cpc: {
          type: DataTypes.FLOAT,
          defaultValue: 0.0,
          comment: 'Cost per click (Google Ads)'
        },

        trendData: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'trend_data',
          comment: 'Google Trends time series data'
        },

        trendDirection: {
          type: DataTypes.STRING(20),
          allowNull: true,
          field: 'trend_direction',
          comment: 'Trend direction: rising, stable, declining'
        },

        // ===================================================================
        // SERP Features
        // ===================================================================
        serpFeatures: {
          type: DataTypes.JSON,
          defaultValue: [],
          field: 'serp_features',
          comment: 'SERP features: featured_snippet, paa, video, image_pack, etc.'
        },

        adsDensity: {
          type: DataTypes.FLOAT,
          defaultValue: 0.0,
          field: 'ads_density',
          comment: 'Ad density on SERP (0-1 scale)'
        },

        adsCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          field: 'ads_count',
          comment: 'Number of ads on SERP'
        },

        mapPackPresent: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'map_pack_present',
          comment: 'Whether local map pack is present'
        },

        // ===================================================================
        // Classification
        // ===================================================================
        intent: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'Search intent: informational, commercial, transactional, navigational, local'
        },

        entities: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Extracted entities: people, places, products, concepts'
        },

        // ===================================================================
        // Difficulty Scoring
        // ===================================================================
        difficulty: {
          type: DataTypes.FLOAT,
          defaultValue: 0.0,
          comment: 'Overall difficulty score (0-100)'
        },

        difficultySerpStrength: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'difficulty_serp_strength',
          comment: 'SERP strength component: homepage ratio, brands (0-1)'
        },

        difficultyCompetition: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'difficulty_competition',
          comment: 'Competition component: exact-match titles (0-1)'
        },

        difficultySerpCrowding: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'difficulty_serp_crowding',
          comment: 'Crowding component: ads + SERP features (0-1)'
        },

        difficultyContentDepth: {
          type: DataTypes.FLOAT,
          allowNull: true,
          field: 'difficulty_content_depth',
          comment: 'Content depth component: word count proxy (0-1)'
        },

        // ===================================================================
        // Opportunity Scoring
        // ===================================================================
        trafficPotential: {
          type: DataTypes.FLOAT,
          defaultValue: 0.0,
          field: 'traffic_potential',
          comment: 'Estimated monthly traffic if ranked #1'
        },

        opportunityScore: {
          type: DataTypes.FLOAT,
          defaultValue: 0.0,
          field: 'opportunity_score',
          comment: 'Opportunity score balancing traffic vs difficulty (0-100)'
        },

        // ===================================================================
        // Clustering
        // ===================================================================
        isPillar: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          field: 'is_pillar',
          comment: 'Whether this is a pillar/hub keyword'
        },

        // ===================================================================
        // Organization
        // ===================================================================
        tags: {
          type: DataTypes.JSON,
          defaultValue: [],
          comment: 'User-defined tags for organization'
        },

        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'User notes about this keyword'
        },

        settings: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Custom keyword-specific settings'
        },

        // ===================================================================
        // Timestamps
        // ===================================================================
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          field: 'created_at'
        },

        updatedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          field: 'updated_at'
        },

        lastTrackedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_tracked_at',
          comment: 'Last time position was checked'
        }
      },
      {
        sequelize,
        modelName: 'UnifiedKeyword',
        tableName: 'unified_keywords',
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ['domain_id'] },
          { fields: ['research_project_id'] },
          { fields: ['topic_id'] },
          { fields: ['page_group_id'] },
          { fields: ['domain_id', 'position'] },
          { fields: ['research_project_id', 'opportunity_score'] },
          { fields: ['research_project_id', 'intent'] },
          { fields: ['lemma'] },
          { fields: ['updated_at'] },
          { fields: ['last_tracked_at'] },
          { fields: ['domain_id', 'device', 'country'] }
        ]
      }
    );
  }

  /**
   * Define associations
   * @param {Object} models - All models
   */
  static associate(models) {
    // Belongs to Domain
    this.belongsTo(models.Domain, {
      foreignKey: 'domainId',
      as: 'domain'
    });

    // Belongs to Research Project
    this.belongsTo(models.ResearchProject, {
      foreignKey: 'researchProjectId',
      as: 'researchProject'
    });

    // Belongs to Topic
    this.belongsTo(models.Topic, {
      foreignKey: 'topicId',
      as: 'topic'
    });

    // Belongs to Page Group
    this.belongsTo(models.PageGroup, {
      foreignKey: 'pageGroupId',
      as: 'pageGroup'
    });

    // Has many SERP Snapshots
    this.hasMany(models.SerpSnapshot, {
      foreignKey: 'keywordId',
      as: 'serpSnapshots'
    });
  }

  // ===================================================================
  // Instance Methods
  // ===================================================================

  /**
   * Get the latest position from history
   * @returns {number|null}
   */
  getLatestPosition() {
    if (!this.positionHistory || this.positionHistory.length === 0) {
      return this.position;
    }
    return this.positionHistory[this.positionHistory.length - 1]?.position || this.position;
  }

  /**
   * Add a position to history
   * @param {number} position
   * @param {string} url
   */
  addPositionToHistory(position, url = null) {
    const history = this.positionHistory || [];
    history.push({
      date: new Date().toISOString(),
      position,
      url
    });

    // Keep only last 365 days
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    this.positionHistory = history.filter(
      entry => new Date(entry.date) > oneYearAgo
    );

    this.position = position;
    this.url = url;
    this.lastTrackedAt = new Date();
  }

  /**
   * Get position change over period
   * @param {number} days - Number of days to look back
   * @returns {number|null} - Positive = improved, negative = declined
   */
  getPositionChange(days = 7) {
    if (!this.positionHistory || this.positionHistory.length < 2) {
      return null;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);

    const history = [...this.positionHistory].reverse();
    const oldPosition = history.find(
      entry => new Date(entry.date) <= targetDate
    );

    if (!oldPosition) return null;

    // Negative change = improvement (lower position number)
    return oldPosition.position - this.position;
  }

  /**
   * Check if keyword is ranking (top 100)
   * @returns {boolean}
   */
  isRanking() {
    return this.position > 0 && this.position <= 100;
  }

  /**
   * Check if keyword is in top 10
   * @returns {boolean}
   */
  isTopTen() {
    return this.position > 0 && this.position <= 10;
  }

  /**
   * Check if keyword is in top 3
   * @returns {boolean}
   */
  isTopThree() {
    return this.position > 0 && this.position <= 3;
  }

  /**
   * Get estimated monthly traffic based on position
   * @returns {number}
   */
  getEstimatedTraffic() {
    if (!this.isRanking()) return 0;

    // CTR curve approximation
    const ctrCurve = {
      1: 0.3155, 2: 0.1574, 3: 0.1089, 4: 0.0766, 5: 0.0568,
      6: 0.0442, 7: 0.0358, 8: 0.0297, 9: 0.0251, 10: 0.0216
    };

    const ctr = ctrCurve[this.position] || (this.position <= 20 ? 0.01 : 0.005);
    return Math.round(this.searchVolume * ctr);
  }

  /**
   * Get difficulty category
   * @returns {string}
   */
  getDifficultyCategory() {
    if (this.difficulty < 20) return 'very_easy';
    if (this.difficulty < 40) return 'easy';
    if (this.difficulty < 60) return 'medium';
    if (this.difficulty < 80) return 'hard';
    return 'very_hard';
  }

  /**
   * Get opportunity category
   * @returns {string}
   */
  getOpportunityCategory() {
    if (this.opportunityScore >= 80) return 'excellent';
    if (this.opportunityScore >= 60) return 'good';
    if (this.opportunityScore >= 40) return 'moderate';
    if (this.opportunityScore >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Check if keyword needs refresh
   * @param {number} maxAgeHours - Maximum age before refresh needed
   * @returns {boolean}
   */
  needsRefresh(maxAgeHours = 24) {
    if (!this.lastTrackedAt) return true;

    const ageMs = Date.now() - new Date(this.lastTrackedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    return ageHours >= maxAgeHours;
  }

  // ===================================================================
  // Static Helper Methods
  // ===================================================================

  /**
   * Find high-opportunity keywords
   * @param {Object} options - Query options
   * @returns {Promise<UnifiedKeyword[]>}
   */
  static async findHighOpportunities(options = {}) {
    const {
      minOpportunity = 60,
      maxDifficulty = 70,
      domainId = null,
      researchProjectId = null,
      limit = 20
    } = options;

    const where = {
      opportunityScore: { [this.sequelize.Sequelize.Op.gte]: minOpportunity },
      difficulty: { [this.sequelize.Sequelize.Op.lte]: maxDifficulty }
    };

    if (domainId) where.domainId = domainId;
    if (researchProjectId) where.researchProjectId = researchProjectId;

    return this.findAll({
      where,
      order: [['opportunityScore', 'DESC']],
      limit
    });
  }

  /**
   * Find keywords needing position refresh
   * @param {number} maxAgeHours
   * @returns {Promise<UnifiedKeyword[]>}
   */
  static async findNeedingRefresh(maxAgeHours = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);

    return this.findAll({
      where: {
        domainId: { [this.sequelize.Sequelize.Op.not]: null },
        [this.sequelize.Sequelize.Op.or]: [
          { lastTrackedAt: null },
          { lastTrackedAt: { [this.sequelize.Sequelize.Op.lt]: cutoffDate } }
        ],
        updating: false
      },
      order: [['sticky', 'DESC'], ['lastTrackedAt', 'ASC']]
    });
  }
}

module.exports = UnifiedKeyword;
