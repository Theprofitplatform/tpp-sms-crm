#!/usr/bin/env node

/**
 * Automated Image Alt Text Fixer
 * Identifies images without alt text and adds descriptive alt attributes
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

class ImageAltFixer {
  constructor() {
    this.results = {
      analyzed: 0,
      fixed: 0,
      skipped: 0,
      errors: 0,
      totalImages: 0,
      imagesFixed: 0,
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

  generateAltText(imgSrc, postTitle, context = '') {
    // Extract filename from src
    const filename = imgSrc.split('/').pop().split('?')[0];
    const filenameClean = filename
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .replace(/\d{4}x\d{4}/g, '') // Remove dimensions like 1920x1080
      .replace(/\d+/g, '') // Remove numbers
      .trim();

    // Use post title as context
    const titleWords = postTitle.toLowerCase().split(' ');
    const mainKeyword = titleWords.slice(0, 3).join(' ');

    // If filename has meaningful words, use it
    if (filenameClean.length > 5) {
      return `${filenameClean} - ${mainKeyword}`;
    }

    // Fallback to post title based alt text
    return `Image related to ${mainKeyword}`;
  }

  analyzeImages(content, postTitle) {
    const $ = cheerio.load(content, { decodeEntities: false });
    const images = $('img');
    const imageInfo = [];

    images.each((index, element) => {
      const $img = $(element);
      const alt = $img.attr('alt');
      const src = $img.attr('src');

      if (!alt || alt.trim() === '') {
        imageInfo.push({
          index,
          src: src || 'unknown',
          hasAlt: false,
          suggestedAlt: this.generateAltText(src || '', postTitle)
        });
      }
    });

    return {
      total: images.length,
      missingAlt: imageInfo
    };
  }

  fixImageAlt(content, imageInfo, postTitle) {
    if (imageInfo.missingAlt.length === 0) {
      return null;
    }

    const $ = cheerio.load(content, { decodeEntities: false });
    const images = $('img');
    let fixedCount = 0;

    images.each((index, element) => {
      const $img = $(element);
      const alt = $img.attr('alt');

      if (!alt || alt.trim() === '') {
        const src = $img.attr('src') || '';
        const suggestedAlt = this.generateAltText(src, postTitle);
        $img.attr('alt', suggestedAlt);
        fixedCount++;
      }
    });

    return fixedCount > 0 ? $.html() : null;
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
      const imageInfo = this.analyzeImages(content, post.title.rendered);

      this.results.totalImages += imageInfo.total;

      if (imageInfo.missingAlt.length === 0) {
        console.log(`✓ OK   [${imageInfo.total} images, all have alt] ${post.title.rendered.substring(0, 50)}`);
        this.results.skipped++;
        return;
      }

      console.log(`\n🔧 FIX  [${imageInfo.missingAlt.length}/${imageInfo.total} missing alt] ${post.title.rendered}`);

      imageInfo.missingAlt.slice(0, 3).forEach((img, i) => {
        const srcShort = img.src.split('/').pop().substring(0, 40);
        console.log(`   → Image ${i + 1}: ${srcShort}`);
        console.log(`     Alt: "${img.suggestedAlt}"`);
      });

      if (imageInfo.missingAlt.length > 3) {
        console.log(`   ... and ${imageInfo.missingAlt.length - 3} more`);
      }

      const fixedContent = this.fixImageAlt(content, imageInfo, post.title.rendered);

      if (!fixedContent) {
        console.log(`   ⚠️  No changes needed`);
        this.results.skipped++;
        return;
      }

      this.results.changes.push({
        postId: post.id,
        title: post.title.rendered,
        url: post.link,
        totalImages: imageInfo.total,
        fixedImages: imageInfo.missingAlt.length,
        images: imageInfo.missingAlt
      });

      if (!DRY_RUN) {
        await this.updatePost(post.id, fixedContent);
        console.log(`   ✅ Fixed ${imageInfo.missingAlt.length} images`);
        this.results.fixed++;
        this.results.imagesFixed += imageInfo.missingAlt.length;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`   🔍 DRY RUN - Would fix ${imageInfo.missingAlt.length} images`);
        this.results.fixed++;
        this.results.imagesFixed += imageInfo.missingAlt.length;
      }

    } catch (error) {
      console.log(`❌ ERROR [${post.title.rendered}]: ${error.message}`);
      this.results.errors++;
    }
  }

  async run() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('        🤖 AUTOMATED IMAGE ALT TEXT FIXER');
    console.log('═══════════════════════════════════════════════════════\n');

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    console.log('Strategy: Auto-generate descriptive alt text from filename + post context\n');

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
    console.log('\n📊 IMAGE ALT TEXT FIX SUMMARY\n');
    console.log(`Posts Analyzed:         ${this.results.analyzed}`);
    console.log(`Posts Fixed:            ${this.results.fixed}`);
    console.log(`Already OK:             ${this.results.skipped}`);
    console.log(`Total Images Scanned:   ${this.results.totalImages}`);
    console.log(`Images Alt Text Added:  ${this.results.imagesFixed}`);
    console.log(`Errors:                 ${this.results.errors}`);

    if (this.results.imagesFixed > 0) {
      const avgPerPost = (this.results.imagesFixed / this.results.fixed).toFixed(1);
      console.log(`\n🎯 Average images fixed per post: ${avgPerPost}`);
    }

    if (DRY_RUN) {
      console.log(`\n💡 Run without --dry-run to apply changes\n`);
    } else {
      console.log(`\n✅ All image alt text fixes applied successfully!\n`);
    }

    console.log('═'.repeat(60) + '\n');
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      results: this.results
    };

    const filename = `logs/image-alt-fix-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${filename}\n`);
  }
}

// Run fixer
const fixer = new ImageAltFixer();
fixer.run().catch(console.error);
