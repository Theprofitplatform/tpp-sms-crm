/**
 * SerpBear API Integration
 * Wrapper for all SerpBear API interactions
 */

import fetch from 'node-fetch';

class SerpBearAPI {
  constructor() {
    this.baseUrl = process.env.SERPBEAR_URL || 'https://serpbear.theprofitplatform.com.au';
    this.token = process.env.SERPBEAR_TOKEN;
    
    if (!this.token) {
      console.warn('⚠️  SERPBEAR_TOKEN not set. SerpBear integration disabled.');
    }
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Cookie': `token=${this.token}`
    };
  }

  /**
   * Add a new domain to SerpBear
   */
  async addDomain(domain, country = 'au') {
    if (!this.token) return null;

    try {
      const response = await fetch(`${this.baseUrl}/api/domains`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
          country: country.toUpperCase()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add domain: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Domain added to SerpBear: ${domain}`);
      return data;
    } catch (error) {
      console.error(`❌ Error adding domain to SerpBear:`, error.message);
      return null;
    }
  }

  /**
   * Get all domains from SerpBear
   */
  async getDomains() {
    if (!this.token) return [];

    try {
      const response = await fetch(`${this.baseUrl}/api/domains`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get domains: ${response.statusText}`);
      }

      const data = await response.json();
      return data.domains || [];
    } catch (error) {
      console.error(`❌ Error getting domains:`, error.message);
      return [];
    }
  }

  /**
   * Add keywords to track for a domain
   * @param {string} domain - Domain to track keywords for
   * @param {Array} keywords - Array of keyword objects or strings
   * @param {object} defaults - Default values for device, country, tags
   */
  async addKeywords(domain, keywords, defaults = {}) {
    if (!this.token) return null;

    const {
      device = 'desktop',
      country = 'au',
      tags = 'auto-imported'
    } = defaults;

    // Normalize keywords to objects
    const keywordObjects = keywords.map(kw => {
      if (typeof kw === 'string') {
        return {
          keyword: kw,
          device,
          country: country.toLowerCase(),
          domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
          tags
        };
      }
      return {
        keyword: kw.keyword || kw.term,
        device: kw.device || device,
        country: (kw.country || country).toLowerCase(),
        domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        tags: kw.tags || tags,
        city: kw.city || ''
      };
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/keywords`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ keywords: keywordObjects })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add keywords: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Added ${keywordObjects.length} keywords to SerpBear for ${domain}`);
      return data;
    } catch (error) {
      console.error(`❌ Error adding keywords:`, error.message);
      return null;
    }
  }

  /**
   * Get all keywords for a domain
   */
  async getKeywords(domain) {
    if (!this.token) return [];

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    try {
      const response = await fetch(
        `${this.baseUrl}/api/keywords?domain=${encodeURIComponent(cleanDomain)}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`Failed to get keywords: ${response.statusText}`);
      }

      const data = await response.json();
      return data.keywords || [];
    } catch (error) {
      console.error(`❌ Error getting keywords for ${domain}:`, error.message);
      return [];
    }
  }

  /**
   * Refresh keyword rankings (trigger scrape)
   */
  async refreshKeywords(domain) {
    if (!this.token) return null;

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    try {
      const response = await fetch(`${this.baseUrl}/api/refresh`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ domain: cleanDomain })
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh keywords: ${response.statusText}`);
      }

      console.log(`✅ Triggered ranking refresh for ${domain}`);
      return await response.json();
    } catch (error) {
      console.error(`❌ Error refreshing keywords:`, error.message);
      return null;
    }
  }

  /**
   * Get ranking statistics for a domain
   */
  async getRankingStats(domain) {
    const keywords = await this.getKeywords(domain);
    
    if (!keywords || keywords.length === 0) {
      return {
        totalKeywords: 0,
        averagePosition: 0,
        top3: 0,
        top10: 0,
        top20: 0,
        top50: 0,
        unranked: 0
      };
    }

    const rankedKeywords = keywords.filter(k => k.position > 0);
    const totalPosition = rankedKeywords.reduce((sum, k) => sum + k.position, 0);

    return {
      totalKeywords: keywords.length,
      averagePosition: rankedKeywords.length > 0 
        ? (totalPosition / rankedKeywords.length).toFixed(1)
        : 0,
      top3: keywords.filter(k => k.position > 0 && k.position <= 3).length,
      top10: keywords.filter(k => k.position > 0 && k.position <= 10).length,
      top20: keywords.filter(k => k.position > 0 && k.position <= 20).length,
      top50: keywords.filter(k => k.position > 0 && k.position <= 50).length,
      unranked: keywords.filter(k => k.position === 0 || k.position > 100).length,
      keywords: keywords.slice(0, 10) // Top 10 for preview
    };
  }

  /**
   * Get position changes over time
   */
  async getPositionChanges(domain, days = 7) {
    const keywords = await this.getKeywords(domain);
    
    if (!keywords || keywords.length === 0) {
      return { improved: [], declined: [], stable: [] };
    }

    const changes = keywords.map(kw => {
      const history = kw.history || {};
      const dates = Object.keys(history).sort();
      
      if (dates.length < 2) {
        return { keyword: kw.keyword, change: 0, current: kw.position };
      }

      const latest = history[dates[dates.length - 1]];
      const previous = history[dates[dates.length - days] || dates[0]];
      const change = previous - latest; // Positive = improvement

      return {
        keyword: kw.keyword,
        current: latest,
        previous,
        change,
        changePercent: previous > 0 ? ((change / previous) * 100).toFixed(1) : 0
      };
    });

    return {
      improved: changes.filter(c => c.change > 0).sort((a, b) => b.change - a.change),
      declined: changes.filter(c => c.change < 0).sort((a, b) => a.change - b.change),
      stable: changes.filter(c => c.change === 0)
    };
  }

  /**
   * Import keywords from GSC data
   * Filters for high-opportunity keywords
   */
  async importFromGSC(domain, gscData, options = {}) {
    const {
      minImpressions = 50,
      maxPosition = 30,
      limit = 50,
      tags = 'gsc-import,opportunity'
    } = options;

    if (!gscData || !gscData.length) {
      console.log('No GSC data provided for import');
      return null;
    }

    // Filter for opportunity keywords
    const opportunities = gscData
      .filter(kw => 
        kw.impressions >= minImpressions && 
        kw.position > 0 && 
        kw.position <= maxPosition
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, limit);

    console.log(`📊 Found ${opportunities.length} opportunity keywords from GSC`);

    if (opportunities.length === 0) {
      return null;
    }

    // Get existing keywords to avoid duplicates
    const existingKeywords = await this.getKeywords(domain);
    const existingKeywordStrings = new Set(
      existingKeywords.map(k => k.keyword.toLowerCase())
    );

    // Filter out duplicates
    const newKeywords = opportunities.filter(
      kw => !existingKeywordStrings.has(kw.query.toLowerCase())
    );

    if (newKeywords.length === 0) {
      console.log('All opportunity keywords already tracked');
      return null;
    }

    console.log(`➕ Importing ${newKeywords.length} new keywords`);

    // Add to SerpBear
    return await this.addKeywords(
      domain,
      newKeywords.map(kw => ({
        keyword: kw.query,
        device: kw.device || 'desktop',
        tags
      })),
      { tags }
    );
  }
}

// Export singleton instance
export default new SerpBearAPI();
