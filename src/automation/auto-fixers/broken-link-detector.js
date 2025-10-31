/**
 * Broken Link Detector and Fixer
 * 
 * Automatically detects and fixes broken links:
 * - Scans all internal and external links
 * - Detects 404s, redirects, and timeouts
 * - Suggests fixes for common issues
 * - Auto-fixes simple cases (protocol, trailing slashes)
 * - Reports unfixable links
 */

import { WordPressClient } from '../wordpress-client.js';
import db from '../../database/index.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class BrokenLinkDetector {
  constructor(config) {
    this.config = config;
    this.clientId = config.id;
    this.wpClient = new WordPressClient({
      siteUrl: config.siteUrl,
      username: config.wpUser,
      password: config.wpPassword
    });

    this.siteUrl = config.siteUrl;
    this.checkedUrls = new Map(); // Cache to avoid re-checking
    this.results = {
      totalLinks: 0,
      brokenLinks: [],
      redirects: [],
      warnings: [],
      fixed: [],
      errors: 0
    };
  }

  /**
   * Main orchestrator - Detect and fix broken links
   */
  async runDetection(options = {}) {
    const { dryRun = false, limit = 50, checkExternal = true, timeout = 5000 } = options;

    console.log('\n🔗 Broken Link Detector - Starting...');
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   External: ${checkExternal ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Timeout: ${timeout}ms\n`);

    try {
      // Step 1: Fetch all content
      const posts = await this.wpClient.getPosts({ per_page: limit });
      const pages = await this.wpClient.getPages({ per_page: limit });
      const allContent = [...posts, ...pages];

      console.log(`📄 Scanning ${allContent.length} pages for links...\n`);

      // Step 2: Extract and check links from each page
      for (const item of allContent) {
        await this.scanContent(item, checkExternal, timeout);
      }

      // Step 3: Auto-fix simple issues
      if (!dryRun && this.results.brokenLinks.length > 0) {
        console.log('\n🔧 Attempting auto-fixes...\n');
        await this.autoFixLinks();
      }

      // Step 4: Generate report
      await this.generateReport(dryRun);

      // Step 5: Print summary
      this.printSummary(dryRun);

      return {
        success: true,
        ...this.results
      };

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      throw error;
    }
  }

  /**
   * Scan content for links
   */
  async scanContent(item, checkExternal, timeout) {
    const content = item.content?.rendered || '';
    
    if (!content) return;

    const $ = cheerio.load(content);
    const links = $('a[href]');

    console.log(`📝 ${item.title.rendered}`);
    console.log(`   Found ${links.length} links`);

    for (let i = 0; i < links.length; i++) {
      const link = $(links[i]);
      const href = link.attr('href');
      const text = link.text().trim();

      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        continue;
      }

      this.results.totalLinks++;

      // Normalize URL
      let url = href;
      if (url.startsWith('/')) {
        url = new URL(url, this.siteUrl).href;
      }

      // Skip external links if disabled
      const isExternal = !url.startsWith(this.siteUrl);
      if (isExternal && !checkExternal) {
        continue;
      }

      // Check if already tested
      if (this.checkedUrls.has(url)) {
        const status = this.checkedUrls.get(url);
        if (status !== 200) {
          this.results.brokenLinks.push({
            pageId: item.id,
            pageTitle: item.title.rendered,
            pageUrl: item.link,
            linkUrl: url,
            linkText: text,
            status,
            cached: true
          });
        }
        continue;
      }

      // Check the link
      const status = await this.checkLink(url, timeout);
      this.checkedUrls.set(url, status);

      if (status === 200) {
        process.stdout.write('.');
      } else if (status >= 300 && status < 400) {
        process.stdout.write('→');
        this.results.redirects.push({
          pageId: item.id,
          pageTitle: item.title.rendered,
          pageUrl: item.link,
          linkUrl: url,
          linkText: text,
          status
        });
      } else {
        process.stdout.write('✗');
        this.results.brokenLinks.push({
          pageId: item.id,
          pageTitle: item.title.rendered,
          pageUrl: item.link,
          linkUrl: url,
          linkText: text,
          status,
          cached: false
        });
      }
    }

    console.log(''); // New line after dots
  }

  /**
   * Check if a link is broken
   */
  async checkLink(url, timeout) {
    try {
      const response = await axios.head(url, {
        timeout,
        maxRedirects: 0,
        validateStatus: () => true, // Don't throw on any status
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0; +https://instantautotraders.com.au)'
        }
      });

      return response.status;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        return 'TIMEOUT';
      } else if (error.code === 'ENOTFOUND') {
        return 'DNS_ERROR';
      } else if (error.response) {
        return error.response.status;
      } else {
        return 'ERROR';
      }
    }
  }

  /**
   * Auto-fix common link issues
   */
  async autoFixLinks() {
    for (const broken of this.results.brokenLinks) {
      const fix = await this.attemptFix(broken);
      
      if (fix) {
        console.log(`✅ Fixed: ${broken.linkUrl} → ${fix.newUrl}`);
        this.results.fixed.push({
          ...broken,
          newUrl: fix.newUrl,
          fixType: fix.type
        });

        // Update the page content
        try {
          await this.replaceLinkInContent(broken.pageId, broken.linkUrl, fix.newUrl);
        } catch (error) {
          console.log(`   ❌ Failed to update page: ${error.message}`);
          this.results.errors++;
        }
      } else {
        console.log(`⚠️  Cannot auto-fix: ${broken.linkUrl} (status: ${broken.status})`);
      }
    }
  }

  /**
   * Attempt to fix a broken link
   */
  async attemptFix(broken) {
    const url = broken.linkUrl;

    // Try 1: HTTPS if HTTP failed
    if (url.startsWith('http://')) {
      const httpsUrl = url.replace('http://', 'https://');
      const status = await this.checkLink(httpsUrl, 5000);
      if (status === 200) {
        return { newUrl: httpsUrl, type: 'protocol_upgrade' };
      }
    }

    // Try 2: Add/remove trailing slash
    if (url.endsWith('/')) {
      const withoutSlash = url.slice(0, -1);
      const status = await this.checkLink(withoutSlash, 5000);
      if (status === 200) {
        return { newUrl: withoutSlash, type: 'remove_trailing_slash' };
      }
    } else {
      const withSlash = url + '/';
      const status = await this.checkLink(withSlash, 5000);
      if (status === 200) {
        return { newUrl: withSlash, type: 'add_trailing_slash' };
      }
    }

    // Try 3: For internal links, check if page exists with different slug
    if (url.startsWith(this.siteUrl)) {
      // Could implement fuzzy matching here
      // For now, just flag it
    }

    return null; // Cannot fix automatically
  }

  /**
   * Replace link in content
   */
  async replaceLinkInContent(pageId, oldUrl, newUrl) {
    const page = await this.wpClient.getPost(pageId);
    const content = page.content.raw || page.content.rendered;

    // Replace the link
    const updatedContent = content.replace(
      new RegExp(`href="${oldUrl}"`, 'g'),
      `href="${newUrl}"`
    ).replace(
      new RegExp(`href='${oldUrl}'`, 'g'),
      `href='${newUrl}'`
    );

    await this.wpClient.updatePost(pageId, {
      content: updatedContent
    });
  }

  /**
   * Generate report
   */
  async generateReport(dryRun) {
    const report = {
      timestamp: new Date().toISOString(),
      clientId: this.clientId,
      dryRun,
      summary: {
        totalLinks: this.results.totalLinks,
        brokenLinks: this.results.brokenLinks.length,
        redirects: this.results.redirects.length,
        fixed: this.results.fixed.length,
        errors: this.results.errors
      },
      brokenLinks: this.results.brokenLinks,
      redirects: this.results.redirects,
      fixed: this.results.fixed
    };

    const filename = `logs/broken-links-${this.clientId}-${new Date().toISOString().split('T')[0]}.json`;
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));

    // Log to database
    if (!dryRun && this.results.fixed.length > 0) {
      await db.logAutoFixChange({
        clientId: this.clientId,
        engine: 'broken-link-detector',
        changes: this.results.fixed,
        success: this.results.errors === 0
      });
    }

    console.log(`\n📄 Report saved: ${filename}`);
  }

  /**
   * Print summary
   */
  printSummary(dryRun) {
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 BROKEN LINK DETECTION SUMMARY\n');
    console.log(`Total Links Checked: ${this.results.totalLinks}`);
    console.log(`Broken Links:        ${this.results.brokenLinks.length}`);
    console.log(`Redirects:           ${this.results.redirects.length}`);
    console.log(`Auto-Fixed:          ${this.results.fixed.length}`);
    console.log(`Errors:              ${this.results.errors}`);

    if (this.results.brokenLinks.length > 0) {
      const unfixed = this.results.brokenLinks.length - this.results.fixed.length;
      console.log(`\n⚠️  Manual Review Needed: ${unfixed} links`);

      if (unfixed > 0 && unfixed <= 10) {
        console.log('\nBroken Links Requiring Manual Fix:');
        this.results.brokenLinks
          .filter(link => !this.results.fixed.some(f => f.linkUrl === link.linkUrl))
          .forEach(link => {
            console.log(`\n   Page: ${link.pageTitle}`);
            console.log(`   Link: ${link.linkUrl}`);
            console.log(`   Status: ${link.status}`);
          });
      }
    }

    if (this.results.fixed.length > 0) {
      console.log(`\n✅ Successfully Fixed ${this.results.fixed.length} links`);
    }

    console.log('\n' + '═'.repeat(70) + '\n');
  }
}
