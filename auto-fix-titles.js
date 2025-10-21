#!/usr/bin/env node

/**
 * Automated Title Optimizer
 * Fixes short titles by adding branding and optimizing length
 */

import axios from 'axios';
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

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const MIN_TITLE_LENGTH = 30;
const MAX_TITLE_LENGTH = 60;
const BRAND = 'Instant Auto Traders';
const LOCATION = 'Sydney';

class TitleOptimizer {
  constructor() {
    this.results = {
      analyzed: 0,
      optimized: 0,
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

  needsOptimization(title) {
    const length = title.length;
    return length < MIN_TITLE_LENGTH || length > MAX_TITLE_LENGTH;
  }

  optimizeTitle(currentTitle) {
    const clean = currentTitle.trim();
    const length = clean.length;

    // Already has brand
    if (clean.includes(BRAND)) {
      // Check if still too long
      if (length > MAX_TITLE_LENGTH) {
        // Try to shorten by removing location if present
        const withoutLocation = clean.replace(/\s*-?\s*Sydney\s*-?\s*/gi, '').trim();
        if (withoutLocation.length <= MAX_TITLE_LENGTH) {
          return withoutLocation;
        }
        // Truncate and add ellipsis
        return clean.substring(0, MAX_TITLE_LENGTH - 3) + '...';
      }
      return null; // Already good
    }

    // Title is too short - add branding
    if (length < MIN_TITLE_LENGTH) {
      let newTitle = clean;

      // Add location if not present
      if (!clean.toLowerCase().includes('sydney') && !clean.toLowerCase().includes('nsw')) {
        newTitle = `${clean} Sydney`;
      }

      // Add brand separator
      const withBrand = `${newTitle} | ${BRAND}`;

      // Check if it fits
      if (withBrand.length <= MAX_TITLE_LENGTH) {
        return withBrand;
      }

      // Try without location
      const withoutLocation = `${clean} | ${BRAND}`;
      if (withoutLocation.length <= MAX_TITLE_LENGTH) {
        return withoutLocation;
      }

      // Try with just brand suffix
      const simplified = `${clean} - ${BRAND}`;
      if (simplified.length <= MAX_TITLE_LENGTH) {
        return simplified;
      }

      // Last resort: truncate original and add brand
      const maxBase = MAX_TITLE_LENGTH - BRAND.length - 3; // "3" for " | "
      return `${clean.substring(0, maxBase)} | ${BRAND}`;
    }

    // Title is too long - shorten it
    if (length > MAX_TITLE_LENGTH) {
      // Remove common filler words from the end
      let shortened = clean
        .replace(/\s*-\s*Complete\s*Guide\s*$/i, '')
        .replace(/\s*-\s*Ultimate\s*Guide\s*$/i, '')
        .replace(/\s*-\s*Everything\s*You\s*Need\s*to\s*Know\s*$/i, '')
        .replace(/\s*-\s*Tips\s*and\s*Tricks\s*$/i, '')
        .replace(/\s*in\s*Sydney\s*NSW\s*Australia\s*$/i, ' Sydney')
        .trim();

      if (shortened.length <= MAX_TITLE_LENGTH) {
        return shortened;
      }

      // Hard truncate
      return shortened.substring(0, MAX_TITLE_LENGTH - 3) + '...';
    }

    return null; // No optimization needed
  }

  async updatePost(postId, newTitle) {
    const response = await axios.put(
      `${WP_URL}/wp-json/wp/v2/posts/${postId}`,
      { title: newTitle },
      { headers }
    );
    return response.data;
  }

  async processPost(post) {
    this.results.analyzed++;
    const currentTitle = post.title.rendered;
    const currentLength = currentTitle.length;

    // Check if needs optimization
    if (!this.needsOptimization(currentTitle)) {
      console.log(`✓ SKIP [${currentLength}ch] ${currentTitle}`);
      this.results.skipped++;
      return;
    }

    // Optimize
    const newTitle = this.optimizeTitle(currentTitle);

    if (!newTitle || newTitle === currentTitle) {
      console.log(`✓ SKIP [${currentLength}ch] ${currentTitle}`);
      this.results.skipped++;
      return;
    }

    const newLength = newTitle.length;
    const change = {
      postId: post.id,
      url: post.link,
      oldTitle: currentTitle,
      newTitle: newTitle,
      oldLength: currentLength,
      newLength: newLength
    };

    this.results.changes.push(change);

    console.log(`\n🔧 OPTIMIZE [${currentLength}→${newLength}ch]`);
    console.log(`   OLD: ${currentTitle}`);
    console.log(`   NEW: ${newTitle}`);

    if (!DRY_RUN) {
      try {
        await this.updatePost(post.id, newTitle);
        console.log(`   ✅ Updated successfully!`);
        this.results.optimized++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        this.results.errors++;
      }
    } else {
      console.log(`   🔍 DRY RUN - No changes made`);
      this.results.optimized++;
    }
  }

  async run() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('        🤖 AUTOMATED TITLE OPTIMIZER');
    console.log('═══════════════════════════════════════════════════════\n');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    console.log(`Settings:`);
    console.log(`  Min Length: ${MIN_TITLE_LENGTH} chars`);
    console.log(`  Max Length: ${MAX_TITLE_LENGTH} chars`);
    console.log(`  Brand: ${BRAND}`);
    console.log(`  Location: ${LOCATION}\n`);

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
    console.log('\n📊 OPTIMIZATION SUMMARY\n');
    console.log(`Posts Analyzed:    ${this.results.analyzed}`);
    console.log(`Titles Optimized:  ${this.results.optimized}`);
    console.log(`Skipped (OK):      ${this.results.skipped}`);
    console.log(`Errors:            ${this.results.errors}`);

    if (this.results.optimized > 0) {
      console.log(`\n🎯 Changes Made:`);
      const avgOldLength = this.results.changes.reduce((sum, c) => sum + c.oldLength, 0) / this.results.changes.length;
      const avgNewLength = this.results.changes.reduce((sum, c) => sum + c.newLength, 0) / this.results.changes.length;
      console.log(`   Avg old length: ${Math.round(avgOldLength)} chars`);
      console.log(`   Avg new length: ${Math.round(avgNewLength)} chars`);
      console.log(`   Improvement: +${Math.round(avgNewLength - avgOldLength)} chars`);
    }

    if (DRY_RUN) {
      console.log(`\n💡 Run without --dry-run to apply changes\n`);
    } else {
      console.log(`\n✅ All changes applied successfully!\n`);
    }

    console.log('═'.repeat(60) + '\n');
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      results: this.results
    };

    const filename = `logs/title-optimization-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${filename}\n`);
  }
}

// Run optimizer
const optimizer = new TitleOptimizer();
optimizer.run().catch(console.error);
