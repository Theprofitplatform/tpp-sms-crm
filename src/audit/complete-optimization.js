#!/usr/bin/env node

/**
 * Complete SEO Optimization Script
 * Finishes remaining meta descriptions and title optimization
 */

import axios from 'axios';
import fs from 'fs';

// Configuration
const WP_URL = 'https://instantautotraders.com.au';
const WP_USER = 'Claude';
const WP_APP_PASSWORD = 'evnTOjRy2jh8GdSyFLunlDsd';
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const headers = {
  'Authorization': `Basic ${BASE_AUTH}`,
  'Content-Type': 'application/json'
};

class SEOOptimizer {
  constructor() {
    this.results = {
      meta: { optimized: 0, skipped: 0, errors: 0 },
      titles: { optimized: 0, skipped: 0, errors: 0 }
    };
  }

  async fetchPosts(limit = 100) {
    try {
      console.log('📡 Fetching posts from WordPress...');
      const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
        headers,
        params: {
          per_page: limit,
          status: 'publish',
          orderby: 'date',
          order: 'desc'
        }
      });

      const totalPosts = parseInt(response.headers['x-wp-total']) || 0;
      console.log(`✅ Found ${response.data.length} posts (total: ${totalPosts})`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch posts:', error.message);
      throw error;
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  extractKeyword(title) {
    const t = title.toLowerCase();
    if (t.includes('sell') && t.includes('car')) return 'sell car sydney';
    if (t.includes('cash') && t.includes('car')) return 'cash for cars sydney';
    if (t.includes('cash') && t.includes('ute')) return 'cash for utes sydney';
    if (t.includes('instant') && t.includes('car')) return 'instant car purchase sydney';
    if (t.includes('buyer') || t.includes('buyers')) return 'car buyers sydney';
    if (t.includes('ute')) return 'utes sydney';
    if (t.includes('online')) return 'sell car online sydney';
    return 'car buyers sydney';
  }

  generateOptimizedMeta(post, keyword) {
    const title = this.stripHtml(post.title.rendered);
    const content = this.stripHtml(post.content.rendered).substring(0, 300);
    
    // Remove navigation/common patterns
    const cleanContent = content
      .replace(/Table of Contents/g, '')
      .replace(/Key Takeaways/g, '')
      .replace(/click here/g, '')
      .replace(/learn more/g, '');

    // Extract key phrases from content
    const sentences = cleanContent.split('.').filter(s => s.trim().length > 20);
    const bestSentence = sentences.find(s => 
      s.toLowerCase().includes(keyword.toLowerCase().split(' ')[0]) &&
      s.length > 50 && s.length < 150
    ) || sentences[0];

    if (bestSentence) {
      let meta = bestSentence.trim();
      if (meta.length > 160) {
        meta = meta.substring(0, 157) + '...';
      }
      return meta;
    }

    // Fallback: title-based description
    return `${title.replace(/\s*-\s*.*$/, '')} in Sydney. Instant quotes, competitive prices, same-day service. Get started today!`;
  }

  generateOptimizedTitle(title, keyword) {
    const clean = title.replace(/\s*-\s*.*$/, '').replace(/\s*\|\s*.*$/, '');
    
    // Remove generic suffixes
    const base = clean
      .replace(/\s*\-\s*Business\s*Guide$/i, '')
      .replace(/\s*\-\s*Tips$/i, '')
      .replace(/\s*\-\s*Complete\s*Guide$/i, '')
      .replace(/\s*\-\s*Ultimate\s*Guide$/i, '');

    // Add branding
    const branded = `${base} | Instant Auto Traders`;
    
    if (branded.length <= 60) {
      return branded;
    }
    
    if (base.length <= 60) {
      return base;
    }

    return branded.substring(0, 57) + '...';
  }

  async optimizeMetaDescription(post) {
    const currentExcerpt = this.stripHtml(post.excerpt.rendered);
    const length = currentExcerpt.length;

    // Skip if already optimal
    if (length >= 140 && length <= 160) {
      return { optimized: false, reason: 'Already optimal length' };
    }

    // Skip if contains navigation elements
    if (currentExcerpt.includes('Table of Contents') || 
        currentExcerpt.includes('Key Takeaways') ||
        currentExcerpt.length < 100) {
      const keyword = this.extractKeyword(post.title.rendered);
      const newMeta = this.generateOptimizedMeta(post, keyword);
      return { optimized: true, oldMeta: currentExcerpt, newMeta };
    }

    this.results.meta.skipped++;
    return { optimized: false, reason: 'No issues found' };
  }

  async optimizeTitle(post) {
    const currentTitle = post.title.rendered;
    const length = currentTitle.length;

    // Skip if already good length and has branding
    if (length >= 45 && length <= 65 && currentTitle.includes('Instant Auto Traders')) {
      return { optimized: false, reason: 'Already optimal' };
    }

    // Skip if doesn't have generic suffixes
    if (!currentTitle.match(/\-\s*(Business\s*Guide|Tips|Complete\s*Guide|Ultimate\s*Guide)$/i)) {
      this.results.titles.skipped++;
      return { optimized: false, reason: 'No generic suffixes to fix' };
    }

    const keyword = this.extractKeyword(currentTitle);
    const newTitle = this.generateOptimizedTitle(currentTitle, keyword);
    return { optimized: true, oldTitle: currentTitle, newTitle };
  }

  async updatePost(postId, data) {
    try {
      const response = await axios.put(
        `${WP_URL}/wp-json/wp/v2/posts/${postId}`,
        data,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update post ${postId}: ${error.message}`);
    }
  }

  /* istanbul ignore next */
  async optimizeAllPosts() {
    console.log('\n🚀 Complete SEO Optimization for InstantAutoTraders\n');
    console.log('=' .repeat(60));

    try {
      const posts = await this.fetchPosts(50);
      console.log('\n📝 Processing posts...\n');

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`\n[${i + 1}/${posts.length}] ${post.title.rendered}`);
        console.log('-'.repeat(50));

        try {
          // Check meta description
          const metaResult = await this.optimizeMetaDescription(post);
          let updates = {};

          if (metaResult.optimized) {
            updates.excerpt = metaResult.newMeta;
            console.log(`📄 Meta: ${metaResult.oldMeta.substring(0, 50)}... → ${metaResult.newMeta.substring(0, 50)}...`);
          } else {
            console.log(`📄 Meta: ${metaResult.reason}`);
          }

          // Check title
          const titleResult = await this.optimizeTitle(post);
          if (titleResult.optimized) {
            updates.title = titleResult.newTitle;
            console.log(`📝 Title: ${titleResult.oldTitle.substring(0, 50)}... → ${titleResult.newTitle.substring(0, 50)}...`);
          } else {
            console.log(`📝 Title: ${titleResult.reason}`);
          }

          // Apply updates
          if (Object.keys(updates).length > 0) {
            await this.updatePost(post.id, updates);
            console.log('✅ Updated successfully!');
            
            if (updates.excerpt) this.results.meta.optimized++;
            if (updates.title) this.results.titles.optimized++;
          }

        } catch (error) {
          console.log(`❌ Error: ${error.message}`);
          this.results.meta.errors++;
          this.results.titles.errors++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.printSummary();
      this.saveReport();

    } catch (error) {
      console.error('\n❌ Optimization failed:', error.message);
    }
  }

  /* istanbul ignore next */
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 OPTIMIZATION SUMMARY\n');
    
    console.log('📄 Meta Descriptions:');
    console.log(`   Optimized: ${this.results.meta.optimized}`);
    console.log(`   Skipped: ${this.results.meta.skipped}`);
    console.log(`   Errors: ${this.results.meta.errors}`);
    
    console.log('\n📝 Titles:');
    console.log(`   Optimized: ${this.results.titles.optimized}`);
    console.log(`   Skipped: ${this.results.titles.skipped}`);
    console.log(`   Errors: ${this.results.titles.errors}`);
    
    const totalOptimized = this.results.meta.optimized + this.results.titles.optimized;
    console.log(`\n✅ Total optimizations: ${totalOptimized}`);
    
    if (totalOptimized > 0) {
      console.log('\n🎉 SEO optimization will improve CTR and rankings!');
    } else {
      console.log('\n💡 Most content appears already optimized!');
    }
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalOptimized: this.results.meta.optimized + this.results.titles.optimized,
        totalSkipped: this.results.meta.skipped + this.results.titles.skipped,
        totalErrors: this.results.meta.errors + this.results.titles.errors
      }
    };

    fs.writeFileSync('logs/complete-optimization-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to: logs/complete-optimization-report.json');
  }
}

// Run optimization
/* istanbul ignore next */
console.log('');
/* istanbul ignore next */
console.log('COMMAND: node complete-optimization.js');
/* istanbul ignore next */
console.log('Will optimize meta descriptions and titles for up to 50 posts');
/* istanbul ignore next */
console.log('');

/* istanbul ignore next */
const optimizer = new SEOOptimizer();
/* istanbul ignore next */
optimizer.optimizeAllPosts().catch(console.error);
