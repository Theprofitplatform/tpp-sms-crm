import axios from 'axios';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';

/**
 * Competitor Analysis Module
 * Integrates with SerpApi and Bing Webmaster Tools for competitor insights
 */

export class CompetitorAnalyzer {
  constructor() {
    this.serpApiKey = config.competitor.serpApiKey;
    this.bingApiKey = config.competitor.bingWebmasterApiKey;
    this.valueSerpApiKey = config.competitor.valueSerpApiKey;
  }

  /**
   * Analyze competitors for a specific keyword
   * @param {string} keyword - Target keyword
   * @param {object} options - Additional options
   * @returns {Promise<object>} Competitor analysis results
   */
  async analyzeKeyword(keyword, options = {}) {
    const {
      location = 'United States',
      device = 'desktop',
      limit = 10
    } = options;

    try {
      logger.info(`Analyzing keyword: "${keyword}"`);

      // Try SerpApi first (most reliable)
      if (this.serpApiKey) {
        return await this.analyzeBySerpApi(keyword, { location, device, limit });
      }

      // Fallback to ValueSerp
      if (this.valueSerpApiKey) {
        return await this.analyzeByValueSerp(keyword, { location, device, limit });
      }

      logger.warn('No competitor analysis API keys configured');
      return {
        keyword,
        competitors: [],
        message: 'No API keys configured. Add SERPAPI_KEY or VALUESERP_API_KEY to .env'
      };

    } catch (error) {
      logger.error('Competitor analysis failed', error.message);
      throw error;
    }
  }

  /**
   * Analyze using SerpApi
   */
  async analyzeBySerpApi(keyword, options) {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: keyword,
          api_key: this.serpApiKey,
          location: options.location,
          device: options.device,
          num: options.limit,
          gl: 'us',
          hl: 'en'
        }
      });

      const organicResults = response.data.organic_results || [];

      const competitors = organicResults.map((result, index) => ({
        position: result.position || index + 1,
        title: result.title,
        url: result.link,
        domain: this.extractDomain(result.link),
        snippet: result.snippet,
        richSnippet: result.rich_snippet || null,
        sitelinks: result.sitelinks || null
      }));

      const analysis = {
        keyword,
        searchedAt: new Date().toISOString(),
        source: 'SerpApi',
        totalResults: response.data.search_information?.total_results || 0,
        competitors,
        relatedSearches: response.data.related_searches || [],
        peopleAlsoAsk: response.data.related_questions || [],
        insights: this.generateInsights(competitors)
      };

      logger.success(`Found ${competitors.length} competitors for "${keyword}"`);
      return analysis;

    } catch (error) {
      logger.error('SerpApi request failed', error.message);
      throw error;
    }
  }

  /**
   * Analyze using ValueSerp API
   */
  async analyzeByValueSerp(keyword, options) {
    try {
      const response = await axios.get('https://api.valueserp.com/search', {
        params: {
          q: keyword,
          api_key: this.valueSerpApiKey,
          location: options.location,
          device: options.device,
          num: options.limit,
          gl: 'us',
          hl: 'en'
        }
      });

      const organicResults = response.data.organic_results || [];

      const competitors = organicResults.map((result, index) => ({
        position: result.position || index + 1,
        title: result.title,
        url: result.link,
        domain: this.extractDomain(result.link),
        snippet: result.snippet,
        richSnippet: result.rich_snippet || null,
        sitelinks: result.sitelinks || null
      }));

      const analysis = {
        keyword,
        searchedAt: new Date().toISOString(),
        source: 'ValueSerp',
        totalResults: response.data.search_information?.total_results || 0,
        competitors,
        relatedSearches: response.data.related_searches || [],
        peopleAlsoAsk: response.data.related_questions || [],
        insights: this.generateInsights(competitors)
      };

      logger.success(`Found ${competitors.length} competitors for "${keyword}"`);
      return analysis;

    } catch (error) {
      logger.error('ValueSerp request failed', error.message);
      throw error;
    }
  }

  /**
   * Get backlink data from Bing Webmaster Tools
   */
  async getBacklinks(siteUrl) {
    if (!this.bingApiKey) {
      logger.warn('Bing Webmaster API key not configured');
      return null;
    }

    try {
      logger.info(`Fetching backlinks for ${siteUrl}`);

      const response = await axios.get(
        `https://ssl.bing.com/webmaster/api.svc/json/GetInboundLinks`,
        {
          params: {
            apikey: this.bingApiKey,
            siteUrl: siteUrl,
            top: 100
          }
        }
      );

      const backlinks = response.data.d || [];

      return {
        siteUrl,
        totalBacklinks: backlinks.length,
        backlinks: backlinks.map(link => ({
          sourceUrl: link.SourceUrl,
          targetUrl: link.TargetUrl,
          anchorText: link.AnchorText,
          foundDate: link.FoundDate
        })),
        insights: {
          uniqueDomains: new Set(backlinks.map(l => this.extractDomain(l.SourceUrl))).size,
          totalLinks: backlinks.length
        }
      };

    } catch (error) {
      logger.error('Bing Webmaster API failed', error.message);
      return null;
    }
  }

  /**
   * Compare your site with competitors
   */
  async compareWithCompetitors(yourUrl, keyword, options = {}) {
    try {
      const analysis = await this.analyzeKeyword(keyword, options);

      const yourPosition = analysis.competitors.findIndex(
        c => this.extractDomain(c.url) === this.extractDomain(yourUrl)
      );

      const comparison = {
        keyword,
        yourSite: {
          url: yourUrl,
          domain: this.extractDomain(yourUrl),
          position: yourPosition >= 0 ? yourPosition + 1 : 'Not in top 10',
          ranking: yourPosition >= 0
        },
        topCompetitors: analysis.competitors.slice(0, 5),
        insights: {
          youRank: yourPosition >= 0,
          positionFromTop: yourPosition >= 0 ? yourPosition + 1 : null,
          competitorsAbove: yourPosition >= 0 ? yourPosition : analysis.competitors.length,
          opportunities: this.identifyOpportunities(analysis.competitors, yourPosition)
        }
      };

      return comparison;

    } catch (error) {
      logger.error('Competitor comparison failed', error.message);
      throw error;
    }
  }

  /**
   * Bulk keyword analysis
   */
  async analyzeMultipleKeywords(keywords, options = {}) {
    const results = [];

    for (const keyword of keywords) {
      try {
        const analysis = await this.analyzeKeyword(keyword, options);
        results.push(analysis);

        // Rate limiting
        await this.delay(1000);

      } catch (error) {
        logger.error(`Failed to analyze "${keyword}"`, error.message);
        results.push({
          keyword,
          error: error.message
        });
      }
    }

    return {
      totalKeywords: keywords.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results
    };
  }

  /**
   * Generate insights from competitor data
   */
  generateInsights(competitors) {
    const domains = competitors.map(c => c.domain);
    const uniqueDomains = new Set(domains);

    const hasRichSnippets = competitors.filter(c => c.richSnippet).length;
    const hasSitelinks = competitors.filter(c => c.sitelinks).length;

    return {
      totalCompetitors: competitors.length,
      uniqueDomains: uniqueDomains.size,
      domainDiversity: (uniqueDomains.size / competitors.length * 100).toFixed(1) + '%',
      richSnippetUsage: hasRichSnippets,
      sitelinkUsage: hasSitelinks,
      recommendations: [
        hasRichSnippets > 0 ? 'Competitors are using structured data (schema.org)' : null,
        hasSitelinks > 0 ? 'Top competitors have sitelinks' : null,
        uniqueDomains.size < competitors.length * 0.7 ? 'Some domains dominate multiple positions' : null
      ].filter(Boolean)
    };
  }

  /**
   * Identify SEO opportunities
   */
  identifyOpportunities(competitors, yourPosition) {
    const opportunities = [];

    if (yourPosition < 0) {
      opportunities.push('You are not ranking in top 10 - significant opportunity for improvement');
    } else if (yourPosition >= 5) {
      opportunities.push('You can improve from position ' + (yourPosition + 1) + ' to top 5');
    }

    const competitorsWithSnippets = competitors.filter(c => c.richSnippet).length;
    if (competitorsWithSnippets > 0) {
      opportunities.push('Add structured data to compete with rich snippets');
    }

    const competitorsWithSitelinks = competitors.filter(c => c.sitelinks).length;
    if (competitorsWithSitelinks > 0) {
      opportunities.push('Improve site structure to earn sitelinks');
    }

    return opportunities;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return url;
    }
  }

  /**
   * Delay helper for rate limiting
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const competitorAnalyzer = new CompetitorAnalyzer();
