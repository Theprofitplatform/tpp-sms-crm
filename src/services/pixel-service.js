/**
 * PIXEL DEPLOYMENT SERVICE
 *
 * Manages lightweight JavaScript pixel for SEO monitoring
 * Similar to Otto SEO's pixel-based deployment
 *
 * Features:
 * - Generate unique pixel code for each client
 * - Track page metadata and SEO metrics
 * - Real-time SEO issue detection
 * - Performance monitoring (Core Web Vitals)
 * - WebSocket support for live optimizations
 */

import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class PixelService {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Generate a new pixel deployment for a client
   */
  generatePixel(clientId, domain, options = {}) {
    const apiKey = this.generateApiKey();
    const pixelCode = this.createPixelCode(apiKey, domain, options);

    const stmt = this.db.prepare(`
      INSERT INTO pixel_deployments (
        client_id, domain, api_key, pixel_code, status,
        deployment_type, features_enabled, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      clientId,
      domain,
      apiKey,
      pixelCode,
      'active',
      options.deploymentType || 'header',
      JSON.stringify(options.features || ['meta-tracking', 'performance', 'schema']),
      JSON.stringify(options.metadata || {})
    );

    return {
      id: result.lastInsertRowid,
      apiKey,
      pixelCode,
      installationInstructions: this.getInstallationInstructions(pixelCode, options.deploymentType)
    };
  }

  /**
   * Generate secure API key
   */
  generateApiKey() {
    return `seo_pixel_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Create the actual pixel JavaScript code
   */
  createPixelCode(apiKey, domain, options = {}) {
    const apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:3000';
    const wsEndpoint = apiEndpoint.replace('http', 'ws');

    return `<!-- SEO Expert Pixel -->
<script>
(function() {
  'use strict';

  const SEO_PIXEL_CONFIG = {
    apiKey: '${apiKey}',
    domain: '${domain}',
    endpoint: '${apiEndpoint}',
    wsEndpoint: '${wsEndpoint}',
    version: '2.0.0',
    features: ${JSON.stringify(options.features || ['meta-tracking', 'performance', 'schema'])},
    debug: ${options.debug || false}
  };

  // Utility functions
  function log(msg, data) {
    if (SEO_PIXEL_CONFIG.debug) {
      console.log('[SEO Pixel]', msg, data || '');
    }
  }

  function sendBeacon(endpoint, data) {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(data));
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(e => log('Send error:', e));
    }
  }

  // Collect page metadata
  function collectMetadata() {
    const metadata = {
      url: window.location.href,
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.content || '',
      h1Tags: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
      h2Tags: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
      hasViewport: !!document.querySelector('meta[name="viewport"]'),
      wordCount: document.body ? document.body.innerText.split(/\\s+/).length : 0,
      timestamp: new Date().toISOString()
    };

    // Collect images
    metadata.images = Array.from(document.images).slice(0, 50).map(img => ({
      src: img.src,
      alt: img.alt || '',
      width: img.naturalWidth,
      height: img.naturalHeight,
      hasAlt: !!img.alt,
      loading: img.loading
    }));

    // Collect links
    metadata.links = Array.from(document.links).slice(0, 100).map(a => ({
      href: a.href,
      text: a.textContent.trim().substring(0, 100),
      rel: a.rel,
      isInternal: a.hostname === window.location.hostname,
      hasNofollow: a.rel.includes('nofollow')
    }));

    // Check for schema markup
    metadata.schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(script => {
        try {
          return JSON.parse(script.textContent);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    return metadata;
  }

  // Collect Core Web Vitals
  function collectWebVitals() {
    return new Promise((resolve) => {
      const vitals = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null
      };

      // Get navigation timing
      if (performance && performance.getEntriesByType) {
        const navTiming = performance.getEntriesByType('navigation')[0];
        if (navTiming) {
          vitals.ttfb = navTiming.responseStart - navTiming.requestStart;
        }
      }

      // Use Web Vitals API if available
      if ('PerformanceObserver' in window) {
        try {
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // First Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.fcp = entries[0].startTime;
            }
          }).observe({ entryTypes: ['paint'] });

          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                vitals.cls = clsValue;
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });

          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.fid = entries[0].processingStart - entries[0].startTime;
            }
          }).observe({ entryTypes: ['first-input'] });
        } catch (e) {
          log('Performance observer error:', e);
        }
      }

      // Resolve after a short delay to collect metrics
      setTimeout(() => resolve(vitals), 3000);
    });
  }

  // Detect SEO issues
  function detectIssues(metadata, vitals) {
    const issues = [];

    // Title issues
    if (!metadata.title) {
      issues.push({ type: 'error', category: 'title', message: 'Missing page title' });
    } else if (metadata.title.length < 30) {
      issues.push({ type: 'warning', category: 'title', message: 'Title is too short (< 30 chars)' });
    } else if (metadata.title.length > 60) {
      issues.push({ type: 'warning', category: 'title', message: 'Title is too long (> 60 chars)' });
    }

    // Meta description
    if (!metadata.metaDescription) {
      issues.push({ type: 'error', category: 'meta', message: 'Missing meta description' });
    } else if (metadata.metaDescription.length < 120) {
      issues.push({ type: 'warning', category: 'meta', message: 'Meta description is too short' });
    } else if (metadata.metaDescription.length > 160) {
      issues.push({ type: 'warning', category: 'meta', message: 'Meta description is too long' });
    }

    // H1 tags
    if (metadata.h1Tags.length === 0) {
      issues.push({ type: 'error', category: 'headings', message: 'Missing H1 tag' });
    } else if (metadata.h1Tags.length > 1) {
      issues.push({ type: 'warning', category: 'headings', message: 'Multiple H1 tags found' });
    }

    // Images
    const imagesWithoutAlt = metadata.images.filter(img => !img.hasAlt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        category: 'images',
        message: \`\${imagesWithoutAlt.length} images missing alt text\`
      });
    }

    // Viewport
    if (!metadata.hasViewport) {
      issues.push({ type: 'error', category: 'mobile', message: 'Missing viewport meta tag' });
    }

    // Schema
    if (metadata.schema.length === 0) {
      issues.push({ type: 'info', category: 'schema', message: 'No schema markup found' });
    }

    // Core Web Vitals
    if (vitals.lcp && vitals.lcp > 2500) {
      issues.push({ type: 'warning', category: 'performance', message: 'Poor LCP (> 2.5s)' });
    }
    if (vitals.cls && vitals.cls > 0.1) {
      issues.push({ type: 'warning', category: 'performance', message: 'Poor CLS (> 0.1)' });
    }
    if (vitals.fid && vitals.fid > 100) {
      issues.push({ type: 'warning', category: 'performance', message: 'Poor FID (> 100ms)' });
    }

    // Broken links (check for 404 indicators)
    const brokenLinks = metadata.links.filter(link =>
      link.href.includes('404') || link.href.includes('not-found')
    );
    if (brokenLinks.length > 0) {
      issues.push({ type: 'error', category: 'links', message: \`\${brokenLinks.length} potential broken links\` });
    }

    return issues;
  }

  // Calculate SEO score
  function calculateSEOScore(metadata, vitals, issues) {
    let score = 100;

    // Deduct points for errors
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    score -= errors.length * 10;
    score -= warnings.length * 5;

    // Bonus points for good practices
    if (metadata.schema.length > 0) score += 5;
    if (metadata.canonicalUrl) score += 3;
    if (metadata.ogTitle && metadata.ogDescription) score += 3;
    if (vitals.lcp && vitals.lcp < 2500) score += 5;
    if (vitals.cls && vitals.cls < 0.1) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Send data to server
  async function sendData() {
    log('Collecting data...');

    const metadata = collectMetadata();
    const vitals = await collectWebVitals();
    const issues = detectIssues(metadata, vitals);
    const seoScore = calculateSEOScore(metadata, vitals, issues);

    const payload = {
      apiKey: SEO_PIXEL_CONFIG.apiKey,
      domain: SEO_PIXEL_CONFIG.domain,
      metadata,
      vitals,
      issues,
      seoScore,
      pageSize: new Blob([document.documentElement.outerHTML]).size,
      timestamp: new Date().toISOString()
    };

    log('Sending data to server...', { seoScore, issuesCount: issues.length });

    sendBeacon(
      SEO_PIXEL_CONFIG.endpoint + '/api/v2/pixel/track',
      payload
    );
  }

  // Initialize WebSocket for live updates
  function initWebSocket() {
    if (!('WebSocket' in window)) {
      log('WebSocket not supported');
      return;
    }

    try {
      const ws = new WebSocket(
        \`\${SEO_PIXEL_CONFIG.wsEndpoint}/pixel-ws?apiKey=\${SEO_PIXEL_CONFIG.apiKey}\`
      );

      ws.onopen = () => log('WebSocket connected');

      ws.onmessage = (event) => {
        try {
          const cmd = JSON.parse(event.data);
          log('Received command:', cmd);

          switch (cmd.type) {
            case 'UPDATE_META':
              if (cmd.title) document.title = cmd.title;
              if (cmd.description) {
                let meta = document.querySelector('meta[name="description"]');
                if (!meta) {
                  meta = document.createElement('meta');
                  meta.name = 'description';
                  document.head.appendChild(meta);
                }
                meta.content = cmd.description;
              }
              log('Meta tags updated');
              break;

            case 'INJECT_SCHEMA':
              const script = document.createElement('script');
              script.type = 'application/ld+json';
              script.textContent = JSON.stringify(cmd.schema);
              document.head.appendChild(script);
              log('Schema injected');
              break;

            case 'PING':
              ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
              break;
          }
        } catch (e) {
          log('Message parse error:', e);
        }
      };

      ws.onerror = (error) => log('WebSocket error:', error);
      ws.onclose = () => log('WebSocket closed');

    } catch (e) {
      log('WebSocket init error:', e);
    }
  }

  // Initialize pixel
  function init() {
    log('Initializing SEO Pixel v' + SEO_PIXEL_CONFIG.version);

    // Send initial data after page load
    if (document.readyState === 'complete') {
      setTimeout(sendData, 100);
    } else {
      window.addEventListener('load', () => setTimeout(sendData, 100));
    }

    // Initialize WebSocket for live updates
    if (SEO_PIXEL_CONFIG.features.includes('live-updates')) {
      initWebSocket();
    }

    // Send periodic updates (every 5 minutes)
    setInterval(sendData, 5 * 60 * 1000);
  }

  // Start
  init();
})();
</script>`;
  }

  /**
   * Get installation instructions
   */
  getInstallationInstructions(pixelCode, deploymentType = 'header') {
    const instructions = {
      header: {
        title: 'Install in Website Header',
        steps: [
          'Copy the pixel code below',
          'Paste it in your website\'s <head> section',
          'For WordPress: Use a header/footer plugin or theme\'s header.php',
          'For Shopify: Go to Online Store > Themes > Edit Code > theme.liquid',
          'For Squarespace: Settings > Advanced > Code Injection > Header',
          'Save and refresh your website to activate tracking'
        ]
      },
      body: {
        title: 'Install in Website Body',
        steps: [
          'Copy the pixel code below',
          'Paste it right after the opening <body> tag',
          'Save and test your website'
        ]
      },
      footer: {
        title: 'Install in Website Footer',
        steps: [
          'Copy the pixel code below',
          'Paste it before the closing </body> tag',
          'This option has minimal performance impact'
        ]
      }
    };

    return instructions[deploymentType] || instructions.header;
  }

  /**
   * Track incoming pixel data
   */
  trackPixelData(apiKey, data) {
    // Get pixel deployment
    const pixel = this.db.prepare(`
      SELECT id, client_id FROM pixel_deployments WHERE api_key = ? AND status = 'active'
    `).get(apiKey);

    if (!pixel) {
      throw new Error('Invalid API key or inactive pixel');
    }

    // Store page data
    const stmt = this.db.prepare(`
      INSERT INTO pixel_page_data (
        pixel_id, client_id, url, page_title, meta_description,
        h1_tags, h2_tags, images_data, links_data, schema_found,
        performance_metrics, issues_detected, seo_score,
        word_count, has_mobile_viewport, load_time_ms, page_size_kb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pixel.id,
      pixel.client_id,
      data.metadata.url,
      data.metadata.title,
      data.metadata.metaDescription,
      JSON.stringify(data.metadata.h1Tags),
      JSON.stringify(data.metadata.h2Tags),
      JSON.stringify(data.metadata.images),
      JSON.stringify(data.metadata.links),
      JSON.stringify(data.metadata.schema),
      JSON.stringify(data.vitals),
      JSON.stringify(data.issues),
      data.seoScore,
      data.metadata.wordCount,
      data.metadata.hasViewport ? 1 : 0,
      data.vitals.ttfb || null,
      Math.round(data.pageSize / 1024)
    );

    // Update pixel last seen
    this.db.prepare(`
      UPDATE pixel_deployments
      SET last_ping_at = CURRENT_TIMESTAMP,
          last_seen_url = ?,
          pages_tracked = pages_tracked + 1
      WHERE id = ?
    `).run(data.metadata.url, pixel.id);

    return {
      success: true,
      pageDataId: result.lastInsertRowid,
      seoScore: data.seoScore,
      issuesCount: data.issues.length
    };
  }

  /**
   * Get pixel status and stats
   */
  getPixelStatus(clientId) {
    const pixels = this.db.prepare(`
      SELECT
        id, domain, api_key, status, deployment_type,
        pages_tracked, last_ping_at, last_seen_url,
        features_enabled, created_at
      FROM pixel_deployments
      WHERE client_id = ?
      ORDER BY created_at DESC
    `).all(clientId);

    return pixels.map(pixel => ({
      ...pixel,
      features_enabled: JSON.parse(pixel.features_enabled),
      isActive: pixel.last_ping_at &&
                (Date.now() - new Date(pixel.last_ping_at).getTime()) < 15 * 60 * 1000 // 15 minutes
    }));
  }

  /**
   * Get pixel page data
   */
  getPixelPageData(clientId, options = {}) {
    const { limit = 50, offset = 0, url = null } = options;

    let query = `
      SELECT
        p.id, p.url, p.page_title, p.meta_description,
        p.seo_score, p.issues_detected, p.created_at,
        pd.domain
      FROM pixel_page_data p
      JOIN pixel_deployments pd ON p.pixel_id = pd.id
      WHERE p.client_id = ?
    `;

    const params = [clientId];

    if (url) {
      query += ' AND p.url = ?';
      params.push(url);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const pages = this.db.prepare(query).all(...params);

    return pages.map(page => ({
      ...page,
      issues_detected: JSON.parse(page.issues_detected)
    }));
  }

  /**
   * Deactivate pixel
   */
  deactivatePixel(clientId, pixelId) {
    const result = this.db.prepare(`
      UPDATE pixel_deployments
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND client_id = ?
    `).run(pixelId, clientId);

    return result.changes > 0;
  }

  /**
   * Delete pixel and all its data
   */
  deletePixel(clientId, pixelId) {
    // Delete page data first
    this.db.prepare(`
      DELETE FROM pixel_page_data WHERE pixel_id = ?
    `).run(pixelId);

    // Delete pixel deployment
    const result = this.db.prepare(`
      DELETE FROM pixel_deployments WHERE id = ? AND client_id = ?
    `).run(pixelId, clientId);

    return result.changes > 0;
  }
}

export default new PixelService();
