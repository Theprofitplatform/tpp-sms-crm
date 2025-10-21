#!/usr/bin/env node

/**
 * Automated H1 Tag Fixer
 * Detects and fixes multiple H1 tags by converting extras to H2
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './config/env/.env' });

const WP_URL = process.env.WORDPRESS_URL || 'https://instantautotraders.com.au';
const WP_USER = process.env.WORDPRESS_USER || 'Claude';
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const headers = {
  'Authorization': `Basic ${BASE_AUTH}`,
  'Content-Type': 'application/json'
};

const DRY_RUN = process.argv.includes('--dry-run');

class H1Fixer {
  constructor() {
    this.results = {
      analyzed: 0,
      fixed: 0,
      skipped: 0,
      errors: 0,
      changes: []
    };
  }

  async fetchPosts() {
    console.log('📡 Fetching posts...\n');
    const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
      headers,
      params: {
        per_page: 100,
        status: 'publish',
        orderby: 'date',
        order: 'desc'
      }
    });
    return response.data;
  }

  async fetchPostContent(postId) {
    const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts/${postId}`, {
      headers,
      params: { context: 'edit' }
    });
    return response.data.content.raw || response.data.content.rendered;
  }

  analyzeH1Tags(content) {
    const $ = cheerio.load(content);
    const h1Tags = $('h1');
    const h1Info = [];

    h1Tags.each((index, element) => {
      h1Info.push({
        index,
        text: $(element).text().trim(),
        html: $.html(element)
      });
    });

    return h1Info;
  }

  fixMultipleH1s(content, h1Info) {
    const $ = cheerio.load(content, { decodeEntities: false });
    const h1Tags = $('h1');

    if (h1Tags.length <= 1) {
      return null; // No fix needed
    }

    // Strategy: Keep the first H1 (usually the title), convert others to H2
    h1Tags.each((index, element) => {
      if (index > 0) {
        // Convert to H2
        const $h1 = $(element);
        const h2 = $('<h2></h2>');

        // Copy attributes and content
        h2.attr($h1.attr());
        h2.html($h1.html());

        // Replace H1 with H2
        $h1.replaceWith(h2);
      }
    });

    return $.html();
  }

  async updatePost(postId, newContent) {
    const response = await axios.put(
      `${WP_URL}/wp-json/wp/v2/posts/${postId}`,
      { content: newContent },
      { headers }
    );
    return response.data;
  }

  async processPost(post) {
    this.results.analyzed++;

    try {
      const content = await this.fetchPostContent(post.id);
      const h1Info = this.analyzeH1Tags(content);

      if (h1Info.length <= 1) {
        console.log(`✓ OK   [${h1Info.length} H1] ${post.title.rendered}`);
        this.results.skipped++;
        return;
      }

      console.log(`\n🔧 FIX  [${h1Info.length} H1s found] ${post.title.rendered}`);
      h1Info.forEach((h1, i) => {
        console.log(`   ${i === 0 ? '✓' : '→'} H${i === 0 ? 1 : 2}: "${h1.text.substring(0, 60)}${h1.text.length > 60 ? '...' : ''}"`);
      });

      const fixedContent = this.fixMultipleH1s(content, h1Info);

      if (!fixedContent) {
        console.log(`   ⚠️  Could not fix automatically`);
        this.results.errors++;
        return;
      }

      this.results.changes.push({
        postId: post.id,
        title: post.title.rendered,
        url: post.link,
        h1Count: h1Info.length,
        h1Tags: h1Info.map(h => h.text)
      });

      if (!DRY_RUN) {
        await this.updatePost(post.id, fixedContent);
        console.log(`   ✅ Fixed: Converted ${h1Info.length - 1} H1(s) to H2`);
        this.results.fixed++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`   🔍 DRY RUN - Would convert ${h1Info.length - 1} H1(s) to H2`);
        this.results.fixed++;
      }

    } catch (error) {
      console.log(`❌ ERROR [${post.title.rendered}]: ${error.message}`);
      this.results.errors++;
    }
  }

  async run() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('          🤖 AUTOMATED H1 TAG FIXER');
    console.log('═══════════════════════════════════════════════════════\n');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    console.log('Strategy: Keep first H1, convert others to H2\n');

    try {
      const posts = await this.fetchPosts();
      console.log(`Found ${posts.length} posts\n`);
      console.log('─'.repeat(60) + '\n');

      for (const post of posts) {
        await this.processPost(post);
      }

      this.printSummary();
      this.saveReport();

    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      process.exit(1);
    }
  }

  printSummary() {
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 H1 FIX SUMMARY\n');
    console.log(`Posts Analyzed:    ${this.results.analyzed}`);
    console.log(`Posts Fixed:       ${this.results.fixed}`);
    console.log(`Already OK:        ${this.results.skipped}`);
    console.log(`Errors:            ${this.results.errors}`);

    if (this.results.fixed > 0) {
      const totalH1sConverted = this.results.changes.reduce((sum, c) => sum + (c.h1Count - 1), 0);
      console.log(`\n🎯 Total H1s converted to H2: ${totalH1sConverted}`);
    }

    if (DRY_RUN) {
      console.log(`\n💡 Run without --dry-run to apply changes\n`);
    } else {
      console.log(`\n✅ All H1 fixes applied successfully!\n`);
    }

    console.log('═'.repeat(60) + '\n');
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      results: this.results
    };

    const filename = `logs/h1-fix-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${filename}\n`);
  }
}

// Run fixer
const fixer = new H1Fixer();
fixer.run().catch(console.error);
