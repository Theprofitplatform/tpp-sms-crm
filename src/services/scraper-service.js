/**
 * Scraper Service
 * 
 * Multi-scraper system with automatic failover
 * Adapted from SerpBear with 10 scraper providers
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Scraper Providers
 * Each scraper implements: scrape(keyword, settings, country, device)
 */

// 1. Proxy Scraper (uses custom proxies)
const proxyScraper = {
  name: 'proxy',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.proxy_url) {
      throw new Error('Proxy URL not configured');
    }

    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&num=100`;
    
    const response = await axios.get(url, {
      proxy: settings.proxy_url,
      headers: {
        'User-Agent': device === 'mobile' 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    return parseGoogleHTML(response.data);
  },
};

// 2. ScrapingAnt
const scrapingAntScraper = {
  name: 'scrapingant',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('ScrapingAnt API key not configured');
    }

    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&num=100`;
    
    const response = await axios.get('https://api.scrapingant.com/v2/general', {
      params: {
        url,
        'x-api-key': settings.api_key,
        browser: device === 'mobile',
      },
      timeout: 45000,
    });

    return parseGoogleHTML(response.data);
  },
};

// 3. SerpAPI
const serpapiScraper = {
  name: 'serpapi',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('SerpAPI key not configured');
    }

    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: keyword,
        gl: country.toLowerCase(),
        device: device === 'mobile' ? 'mobile' : 'desktop',
        api_key: settings.api_key,
        num: 100,
      },
      timeout: 30000,
    });

    const results = response.data.organic_results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.snippet,
    }));
  },
};

// 4. Serper.dev
const serperScraper = {
  name: 'serper',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('Serper API key not configured');
    }

    const response = await axios.post(
      'https://google.serper.dev/search',
      {
        q: keyword,
        gl: country.toLowerCase(),
        num: 100,
      },
      {
        headers: {
          'X-API-KEY': settings.api_key,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const results = response.data.organic || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.snippet,
    }));
  },
};

// 5. ValueSERP
const valueSerpScraper = {
  name: 'valueserp',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('ValueSERP API key not configured');
    }

    const response = await axios.get('https://api.valueserp.com/search', {
      params: {
        api_key: settings.api_key,
        q: keyword,
        gl: country.toLowerCase(),
        device: device === 'mobile' ? 'mobile' : 'desktop',
        num: 100,
      },
      timeout: 30000,
    });

    const results = response.data.organic_results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.snippet,
    }));
  },
};

// 6. SearchAPI
const searchApiScraper = {
  name: 'searchapi',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('SearchAPI key not configured');
    }

    const response = await axios.get('https://www.searchapi.io/api/v1/search', {
      params: {
        api_key: settings.api_key,
        q: keyword,
        gl: country.toLowerCase(),
        device: device === 'mobile' ? 'mobile' : 'desktop',
        num: 100,
      },
      timeout: 30000,
    });

    const results = response.data.organic_results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.snippet,
    }));
  },
};

// 7. Serply
const serplyScraper = {
  name: 'serply',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('Serply API key not configured');
    }

    const response = await axios.get('https://api.serply.io/v1/search', {
      params: {
        q: keyword,
        gl: country.toLowerCase(),
        num: 100,
      },
      headers: {
        'X-API-KEY': settings.api_key,
      },
      timeout: 30000,
    });

    const results = response.data.results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.description,
    }));
  },
};

// 8. ScrapingRobot
const scrapingRobotScraper = {
  name: 'scrawingrobot',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('ScrapingRobot API key not configured');
    }

    // Build Google search URL with parameters
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&gl=${country}&num=100`;

    const response = await axios.post(
      `https://api.scrapingrobot.com?token=${settings.api_key}`,
      {
        url: searchUrl,
        renderJs: false
      },
      { 
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // ScrapingRobot returns HTML in the result field
    if (response.data && response.data.result) {
      return parseGoogleHTML(response.data.result);
    }

    throw new Error('Invalid response from ScrapingRobot');
  },
};

// 9. SpaceSERP
const spaceSerpScraper = {
  name: 'spaceserp',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('SpaceSERP API key not configured');
    }

    const response = await axios.get('https://api.spaceserp.com/google/search', {
      params: {
        apiKey: settings.api_key,
        q: keyword,
        gl: country.toLowerCase(),
        device: device === 'mobile' ? 'mobile' : 'desktop',
      },
      timeout: 30000,
    });

    const results = response.data.organic_results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      description: result.snippet,
    }));
  },
};

// 10. HasData
const hasDataScraper = {
  name: 'hasdata',
  async scrape(keyword, settings = {}, country = 'US', device = 'desktop') {
    if (!settings.api_key) {
      throw new Error('HasData API key not configured');
    }

    const response = await axios.get('https://api.hasdata.com/scrape/google', {
      params: {
        key: settings.api_key,
        q: keyword,
        gl: country.toLowerCase(),
        device: device === 'mobile' ? 'mobile' : 'desktop',
        num: 100,
      },
      timeout: 30000,
    });

    const results = response.data.results || [];
    return results.map((result, index) => ({
      position: index + 1,
      url: result.url,
      title: result.title,
      description: result.description,
    }));
  },
};

// All scrapers in priority order
const SCRAPERS = [
  serperScraper,      // Usually fastest and most reliable
  serpapiScraper,     // Most comprehensive
  valueSerpScraper,   // Good balance
  searchApiScraper,
  scrapingAntScraper,
  serplyScraper,
  spaceSerpScraper,
  hasDataScraper,
  scrapingRobotScraper,
  proxyScraper,       // Fallback
];

/**
 * Parse raw Google HTML to extract results using cheerio
 */
function parseGoogleHTML(html) {
  const results = [];
  const $ = cheerio.load(html);
  
  // Extract all links that are actual results (not Google's own links)
  const linkPattern = /href="(https:\/\/[^"]+)"/g;
  const matches = [...html.matchAll(linkPattern)];
  
  const seenUrls = new Set();
  let position = 1;
  
  for (const match of matches) {
    if (position > 100) break;
    
    let url = match[1];
    
    // Skip Google's own URLs and duplicates
    if (url.includes('google.com') || 
        url.includes('gstatic.com') ||
        url.includes('googleapis.com') ||
        seenUrls.has(url)) {
      continue;
    }
    
    // Try to find title near this URL in the HTML
    const urlIndex = match.index;
    const contextStart = Math.max(0, urlIndex - 1000);
    const contextEnd = Math.min(html.length, urlIndex + 2000);
    const context = html.substring(contextStart, contextEnd);
    
    // Extract title using h3 or other heading tags
    const $context = cheerio.load(context);
    let title = $context('h3').first().text() ||
               $context('h2').first().text() ||
               $context('cite').first().text() ||
               '';
    
    // If still no title, try to extract from text near the URL
    if (!title) {
      const textMatch = context.match(/>([^<]{20,200})</);
      title = textMatch ? textMatch[1].trim() : new URL(url).hostname;
    }
    
    // Extract description
    let description = '';
    const descSelectors = ['div.VwiC3b', 'span.aCOpRe', 'div[data-snf]', 'div.IsZvec'];
    for (const selector of descSelectors) {
      description = $context(selector).first().text();
      if (description) break;
    }
    
    if (title && url.length < 500) {
      seenUrls.add(url);
      results.push({
        position,
        url: url.trim(),
        title: title.trim().substring(0, 200),
        description: description.trim().substring(0, 300),
      });
      position++;
    }
  }
  
  return results;
}

/**
 * Main scraper service with failover
 */
export class ScraperService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get scraper settings from database
   */
  getScraperSettings() {
    const settings = {};
    
    try {
      const stmt = this.db.prepare('SELECT scraper_name, enabled, api_key, priority, config FROM scraper_settings WHERE enabled = 1 ORDER BY priority');
      const rows = stmt.all();
      
      for (const row of rows) {
        settings[row.scraper_name] = {
          api_key: row.api_key,
          enabled: row.enabled === 1,
          priority: row.priority,
          ...(row.config ? JSON.parse(row.config) : {}),
        };
      }
    } catch (error) {
      console.warn('No scraper settings found, using defaults');
    }
    
    return settings;
  }

  /**
   * Scrape with automatic failover
   */
  async scrape(keyword, country = 'US', device = 'desktop', targetDomain = null) {
    const settings = this.getScraperSettings();
    const errors = [];

    // Try each scraper in order
    for (const scraper of SCRAPERS) {
      const scraperSettings = settings[scraper.name];
      
      // Skip if disabled or no API key
      if (!scraperSettings || !scraperSettings.enabled) {
        continue;
      }

      try {
        console.log(`🔍 Trying ${scraper.name} for "${keyword}"...`);
        
        const results = await scraper.scrape(keyword, scraperSettings, country, device);
        
        // Find target domain position
        let position = 0;
        let url = null;
        
        if (targetDomain) {
          const found = results.find(r => r.url.includes(targetDomain));
          if (found) {
            position = found.position;
            url = found.url;
          }
        }

        // Update scraper success
        this.updateScraperStats(scraper.name, true);

        return {
          position,
          url,
          results: results.slice(0, 10), // Top 10 results
          scraper: scraper.name,
          timestamp: new Date().toISOString(),
        };
        
      } catch (error) {
        console.error(`❌ ${scraper.name} failed:`, error.message);
        errors.push({ scraper: scraper.name, error: error.message });
        
        // Update scraper failure
        this.updateScraperStats(scraper.name, false, error.message);
      }
    }

    // All scrapers failed
    throw new Error(`All scrapers failed. Errors: ${JSON.stringify(errors)}`);
  }

  /**
   * Update scraper statistics
   */
  updateScraperStats(scraperName, success, errorMessage = null) {
    try {
      if (success) {
        const stmt = this.db.prepare(`
          UPDATE scraper_settings 
          SET last_used_at = CURRENT_TIMESTAMP,
              success_rate = (success_rate * 0.9) + 0.1,
              error_count = 0,
              last_error = NULL
          WHERE scraper_name = ?
        `);
        stmt.run(scraperName);
      } else {
        const stmt = this.db.prepare(`
          UPDATE scraper_settings 
          SET success_rate = success_rate * 0.9,
              error_count = error_count + 1,
              last_error = ?
          WHERE scraper_name = ?
        `);
        stmt.run(errorMessage, scraperName);
      }
    } catch (error) {
      console.error('Error updating scraper stats:', error);
    }
  }

  /**
   * Initialize default scraper settings
   */
  initializeDefaults() {
    const defaultScrapers = [
      { name: 'serper', priority: 1 },
      { name: 'serpapi', priority: 2 },
      { name: 'valueserp', priority: 3 },
      { name: 'searchapi', priority: 4 },
      { name: 'scrapingant', priority: 5 },
      { name: 'serply', priority: 6 },
      { name: 'spaceserp', priority: 7 },
      { name: 'hasdata', priority: 8 },
      { name: 'scrawingrobot', priority: 9 },
      { name: 'proxy', priority: 10 },
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO scraper_settings (scraper_name, enabled, priority, success_rate)
      VALUES (?, 0, ?, 1.0)
    `);

    for (const scraper of defaultScrapers) {
      stmt.run(scraper.name, scraper.priority);
    }

    console.log('✅ Scraper defaults initialized');
  }
}

export default ScraperService;
