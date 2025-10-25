/**
 * Bridge Client - Connects SEO Expert Automation to SEO Analyst Reporting
 *
 * This module provides a simple interface for automation scripts to send
 * optimization results to the Bridge API, which stores them in the database
 * and makes them available for unified reporting.
 *
 * Usage:
 *   import { BridgeClient } from './bridge-client.js';
 *   const bridge = new BridgeClient();
 *   await bridge.sendOptimizationResults(clientId, results);
 */

export class BridgeClient {
  constructor(options = {}) {
    this.bridgeUrl = options.bridgeUrl || 'http://localhost:3000/api/bridge';
    this.enabled = options.enabled !== false; // Enable by default
    this.verbose = options.verbose || false;
  }

  /**
   * Send optimization results to the bridge API
   *
   * @param {string} clientId - Client identifier
   * @param {string} optimizationType - Type of optimization (meta, content, local-seo, etc.)
   * @param {object} results - Optimization results
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Response from bridge API
   */
  async sendOptimizationResults(clientId, optimizationType, results, metadata = {}) {
    if (!this.enabled) {
      if (this.verbose) {
        console.log('🔗 Bridge API disabled, skipping result submission');
      }
      return { success: true, skipped: true };
    }

    try {
      const payload = {
        clientId,
        optimizationType,
        results: {
          pagesModified: results.pagesModified || 0,
          issuesFixed: results.issuesFixed || 0,
          expectedImpact: results.expectedImpact || 'Unknown',
          before: results.before || {},
          after: results.after || {},
          keywords: results.keywords || []
        },
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      if (this.verbose) {
        console.log(`🔗 Sending ${optimizationType} results to bridge for ${clientId}...`);
      }

      const response = await fetch(`${this.bridgeUrl}/send-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        if (this.verbose) {
          console.log(`✅ Bridge API: Results stored successfully (ID: ${data.optimizationId})`);
        }
      } else {
        console.error('❌ Bridge API: Failed to store results:', data.error);
      }

      return data;

    } catch (error) {
      console.error('❌ Bridge API: Connection error:', error.message);
      // Don't throw - we don't want bridge failures to stop automation
      return { success: false, error: error.message };
    }
  }

  /**
   * Send meta optimization results
   */
  async sendMetaOptimization(clientId, results) {
    return this.sendOptimizationResults(clientId, 'meta_optimization', {
      pagesModified: results.updated?.length || 0,
      issuesFixed: results.improvements || 0,
      expectedImpact: 'Improved meta titles and descriptions',
      before: { pages: results.before || [] },
      after: { pages: results.after || [] },
      keywords: this.extractKeywords(results)
    });
  }

  /**
   * Send content optimization results
   */
  async sendContentOptimization(clientId, results) {
    return this.sendOptimizationResults(clientId, 'content_optimization', {
      pagesModified: results.pagesUpdated || 0,
      issuesFixed: results.issuesFixed || 0,
      expectedImpact: 'Improved content quality and keyword usage',
      before: { content: results.before || [] },
      after: { content: results.after || [] },
      keywords: results.keywords || []
    });
  }

  /**
   * Send Local SEO optimization results
   */
  async sendLocalSEOResults(clientId, results) {
    return this.sendOptimizationResults(clientId, 'local_seo', {
      pagesModified: 0,
      issuesFixed: results.tasks?.napConsistency?.issues?.length || 0,
      expectedImpact: `NAP Score: ${results.tasks?.napConsistency?.score || 0}/100`,
      before: {},
      after: {
        napScore: results.tasks?.napConsistency?.score || 0,
        hasSchema: results.tasks?.schema?.hasSchema || false,
        directories: results.tasks?.directoryTracking?.directories || []
      }
    }, {
      localSeoData: results
    });
  }

  /**
   * Send Competitor Tracking results
   */
  async sendCompetitorResults(clientId, results) {
    const competitorCount = Object.keys(results.rankings || {}).length;

    return this.sendOptimizationResults(clientId, 'competitor_analysis', {
      pagesModified: 0,
      issuesFixed: 0,
      expectedImpact: `Tracking ${competitorCount} competitors`,
      before: {},
      after: {
        competitors: competitorCount,
        rankings: results.rankings || {},
        alerts: results.alerts || []
      }
    }, {
      competitorData: results
    });
  }

  /**
   * Extract keywords from various result formats
   */
  extractKeywords(results) {
    const keywords = [];

    // Extract from meta results
    if (results.updated) {
      results.updated.forEach(page => {
        if (page.keywords) {
          page.keywords.forEach(kw => {
            keywords.push({
              keyword: kw,
              url: page.url || page.slug,
              beforePosition: null,
              afterPosition: null
            });
          });
        }
      });
    }

    return keywords;
  }

  /**
   * Get optimization history for a client
   */
  async getHistory(clientId, days = 30) {
    try {
      const response = await fetch(`${this.bridgeUrl}/${clientId}/history?days=${days}`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('❌ Bridge API: Failed to fetch history:', error.message);
      return [];
    }
  }

  /**
   * Get ROI metrics for a client
   */
  async getROI(clientId, days = 90) {
    try {
      const response = await fetch(`${this.bridgeUrl}/${clientId}/roi?days=${days}`);
      const data = await response.json();
      return data.roi || null;
    } catch (error) {
      console.error('❌ Bridge API: Failed to fetch ROI:', error.message);
      return null;
    }
  }

  /**
   * Get unified dashboard data
   */
  async getUnifiedDashboard(clientId, days = 30) {
    try {
      const response = await fetch(`${this.bridgeUrl}/${clientId}/unified?days=${days}`);
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      console.error('❌ Bridge API: Failed to fetch unified dashboard:', error.message);
      return null;
    }
  }
}

// Export convenience function
export function createBridgeClient(options = {}) {
  return new BridgeClient(options);
}

// Export default instance
export default new BridgeClient({ verbose: true });
