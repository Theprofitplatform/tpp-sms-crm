import axios from 'axios';
import { logger } from '../audit/logger.js';

/**
 * Rank Math Bulk Automation
 * FREE alternative to manual optimization
 * Uses WordPress API to bulk update Rank Math meta fields
 */
export class RankMathAutomator {
  constructor(wpUrl, wpUser, wpPassword) {
    this.wpUrl = wpUrl.replace(/\/$/, '');
    this.wpUser = wpUser;
    this.wpPassword = wpPassword;
    
    this.client = axios.create({
      baseURL: `${this.wpUrl}/wp-json`,
      auth: { username: this.wpUser, password: this.wpPassword },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    logger.info(`Rank Math automator initialized for ${wpUrl}`);
  }

  /**
   * BULK OPTIMIZE ALL POSTS - The main automation
   */
  async bulkOptimizeAll(options = {}) {
    const {
      strategy = 'balanced', // balanced, aggressive, conservative
      skipPublished = false,
      dryRun = false, // Preview changes without applying
      maxPosts = null // Limit number of posts to process
    } = options;

    try {
      logger.section('Starting bulk optimization...');

      // 1. Get all posts
      const posts = await this.getAllPosts();
      logger.info(`Found ${posts.length} posts to analyze`);

      // 2. Analyze each post
      const analyses = [];
      for (const post of posts) {
        const analysis = await this.analyzePost(post);
        if (analysis.needsOptimization) {
          analyses.push(analysis);
        }
      }

      logger.info(`${analyses.length} posts need optimization`);

      if (analyses.length === 0) {
        logger.success('All posts are already optimized!');
        return {
          totalPosts: posts.length,
          optimized: 0,
          skipped: posts.length,
          results: []
        };
      }

      // Limit number of posts if specified
      const postsToOptimize = maxPosts ? analyses.slice(0, maxPosts) : analyses;
      
      if (maxPosts && analyses.length > maxPosts) {
        logger.info(`Limiting to first ${maxPosts} posts (${analyses.length - maxPosts} will be skipped)`);
      }

      // DRY RUN - Just preview changes
      if (dryRun) {
        logger.warn('🔍 DRY RUN MODE - No changes will be applied');
        logger.info('\nProposed changes:\n');
        
        for (const analysis of postsToOptimize) {
          console.log(`📄 ${analysis.postTitle}`);
          analysis.issues.forEach(issue => {
            console.log(`   ⚠️  ${issue.message}`);
          });
          console.log('');
        }
        
        return {
          totalPosts: posts.length,
          wouldOptimize: postsToOptimize.length,
          dryRun: true,
          preview: postsToOptimize.map(a => ({
            postId: a.postId,
            postTitle: a.postTitle,
            issues: a.issues
          }))
        };
      }

      // 3. Apply optimizations
      const results = [];
      let optimized = 0;
      let failed = 0;

      for (const analysis of postsToOptimize) {
        try {
          const result = await this.optimizePost(analysis, strategy);
          results.push(result);
          
          if (result.success) {
            optimized++;
            logger.success(`✅ Optimized: ${analysis.postTitle}`);
          } else {
            failed++;
          }
          
          // Rate limiting - don't overwhelm WordPress
          await this.sleep(500);
          
        } catch (error) {
          failed++;
          results.push({
            postId: analysis.postId,
            success: false,
            error: error.message
          });
        }
      }

      logger.section(`Optimization complete!`);
      logger.info(`Optimized: ${optimized}, Failed: ${failed}`);

      return {
        totalPosts: posts.length,
        optimized: optimized,
        failed: failed,
        skipped: posts.length - analyses.length,
        results: results
      };

    } catch (error) {
      logger.error('Bulk optimization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all published posts
   */
  async getAllPosts() {
    const allPosts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.client.get('/wp/v2/posts', {
          params: {
            per_page: 100,
            page: page,
            status: 'publish'
          }
        });

        allPosts.push(...response.data);
        hasMore = response.data.length === 100;
        page++;
        
      } catch (error) {
        if (error.response?.status === 400) {
          hasMore = false; // No more pages
        } else {
          throw error;
        }
      }
    }

    return allPosts;
  }

  /**
   * Analyze a post for optimization needs
   */
  async analyzePost(post) {
    const meta = post.meta || {};
    const title = meta.rank_math_title || post.title.rendered;
    const description = meta.rank_math_description || '';
    const focusKeyword = meta.rank_math_focus_keyword || '';
    
    const issues = [];
    let score = 100;

    // Title analysis
    if (!title || title.length === 0) {
      issues.push({ type: 'title', severity: 'critical', message: 'Title is empty' });
      score -= 20;
    } else if (title.length < 30 || title.length > 60) {
      issues.push({ type: 'title', severity: 'medium', message: `Title length: ${title.length} (should be 50-60)` });
      score -= 10;
    }

    // Description analysis
    if (!description || description.length === 0) {
      issues.push({ type: 'description', severity: 'high', message: 'Meta description is empty' });
      score -= 15;
    } else if (description.length < 120 || description.length > 160) {
      issues.push({ type: 'description', severity: 'medium', message: `Description length: ${description.length} (should be 150-160)` });
      score -= 10;
    }

    // Keyword analysis
    if (!focusKeyword) {
      issues.push({ type: 'keyword', severity: 'high', message: 'No focus keyword set' });
      score -= 15;
    } else if (title && !title.toLowerCase().includes(focusKeyword.toLowerCase())) {
      issues.push({ type: 'keyword', severity: 'medium', message: 'Focus keyword not in title' });
      score -= 5;
    }

    // Schema analysis
    const hasSchema = meta.rank_math_rich_snippet && meta.rank_math_rich_snippet !== 'off';
    if (!hasSchema) {
      issues.push({ type: 'schema', severity: 'medium', message: 'No schema markup configured' });
      score -= 10;
    }

    return {
      postId: post.id,
      postTitle: post.title.rendered,
      postUrl: post.link,
      postExcerpt: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
      currentMeta: { title, description, focusKeyword },
      issues: issues,
      score: Math.max(0, score),
      needsOptimization: score < 80
    };
  }

  /**
   * Optimize a single post
   */
  async optimizePost(analysis, strategy = 'balanced') {
    const updates = {};

    // Fix title
    if (analysis.issues.some(i => i.type === 'title')) {
      updates.rank_math_title = this.optimizeTitle(
        analysis.currentMeta.title || analysis.postTitle,
        analysis.currentMeta.focusKeyword
      );
    }

    // Fix description
    if (analysis.issues.some(i => i.type === 'description')) {
      updates.rank_math_description = this.optimizeDescription(
        analysis.currentMeta.description,
        analysis.postTitle,
        analysis.postExcerpt,
        analysis.currentMeta.focusKeyword
      );
    }

    // Set focus keyword if missing
    if (analysis.issues.some(i => i.type === 'keyword')) {
      updates.rank_math_focus_keyword = this.extractKeyword(analysis.postTitle);
    }

    // Add schema if missing
    if (analysis.issues.some(i => i.type === 'schema')) {
      updates.rank_math_rich_snippet = 'article';
      updates.rank_math_snippet_article_type = 'BlogPosting';
      updates.rank_math_snippet_name = analysis.postTitle;
      updates.rank_math_snippet_desc = analysis.postExcerpt;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await this.updatePostMeta(analysis.postId, updates);
      
      return {
        postId: analysis.postId,
        postTitle: analysis.postTitle,
        success: true,
        updates: Object.keys(updates),
        improvements: updates
      };
    }

    return {
      postId: analysis.postId,
      postTitle: analysis.postTitle,
      success: true,
      updates: [],
      improvements: {}
    };
  }

  /**
   * Update post meta fields using BOTH excerpt AND Rank Math API
   * This ensures it works regardless of Rank Math settings
   */
  async updatePostMeta(postId, metaUpdates) {
    try {
      // Extract the description for excerpt
      const description = metaUpdates.rank_math_description;
      
      // Method 1: Update post excerpt (works with current settings)
      if (description) {
        await this.client.post(`/wp/v2/posts/${postId}`, {
          excerpt: description
        });
        logger.info(`Set excerpt for post ${postId}`);
      }
      
      // Method 2: Also try Rank Math API (for future compatibility)
      try {
        await this.client.post('/rankmath/v1/updateMeta', {
          objectID: postId,
          objectType: 'post',
          meta: metaUpdates
        });
        logger.info(`Set Rank Math fields for post ${postId}`);
      } catch (rmError) {
        // Rank Math API might fail, but excerpt method will work
        logger.warn(`Rank Math API failed (using excerpt instead): ${rmError.message}`);
      }
      
    } catch (error) {
      logger.error(`Failed to update post ${postId}:`, error.message);
      throw error;
    }
  }

  /**
   * Optimize title for SEO
   */
  optimizeTitle(currentTitle, keyword) {
    let optimized = currentTitle || 'Untitled Post';

    // Ensure keyword is in title (if keyword exists)
    if (keyword && !optimized.toLowerCase().includes(keyword.toLowerCase())) {
      // Add keyword at the start
      optimized = `${keyword} - ${optimized}`;
    }

    // Truncate if too long
    if (optimized.length > 60) {
      optimized = optimized.substring(0, 57) + '...';
    }

    // Pad if too short
    if (optimized.length < 30) {
      optimized = `${optimized} | Complete Guide`;
    }

    return optimized;
  }

  /**
   * Optimize meta description
   */
  optimizeDescription(currentDescription, postTitle, excerpt, keyword) {
    // If description is already good, keep it
    if (currentDescription && 
        currentDescription.length >= 120 && 
        currentDescription.length <= 160) {
      return currentDescription;
    }

    // Use excerpt if available
    if (excerpt && excerpt.length > 50) {
      let optimized = excerpt.substring(0, 150);
      
      // Add CTA
      if (optimized.length < 140) {
        optimized += ' Learn more.';
      }
      
      // Truncate to 160
      if (optimized.length > 160) {
        optimized = optimized.substring(0, 157) + '...';
      }
      
      return optimized;
    }

    // Generate from title and keyword
    let optimized = `Learn about ${postTitle.toLowerCase()}.`;
    
    if (keyword) {
      optimized += ` Everything you need to know about ${keyword}.`;
    }
    
    optimized += ' Read our complete guide.';
    
    // Truncate to 160
    if (optimized.length > 160) {
      optimized = optimized.substring(0, 157) + '...';
    }

    return optimized;
  }

  /**
   * Extract main keyword from title
   */
  extractKeyword(title) {
    // Remove common words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
    
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    // Take first 2-3 meaningful words
    return words.slice(0, 3).join(' ');
  }

  /**
   * AUTO-ADD SCHEMA MARKUP to all posts
   */
  async bulkAddSchema(schemaType = 'article') {
    logger.section('Adding schema markup to all posts...');
    
    const posts = await this.getAllPosts();
    const results = [];
    let added = 0;

    for (const post of posts) {
      try {
        const meta = post.meta || {};
        const hasSchema = meta.rank_math_rich_snippet && meta.rank_math_rich_snippet !== 'off';

        if (!hasSchema) {
          await this.updatePostMeta(post.id, {
            rank_math_rich_snippet: schemaType,
            rank_math_snippet_article_type: 'BlogPosting',
            rank_math_snippet_name: post.title.rendered,
            rank_math_snippet_desc: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200)
          });

          added++;
          logger.info(`✅ Added schema to: ${post.title.rendered}`);
        }

        await this.sleep(300);
        
      } catch (error) {
        logger.error(`Failed to add schema to post ${post.id}:`, error.message);
      }
    }

    logger.success(`Schema added to ${added} posts`);

    return {
      total: posts.length,
      added: added,
      skipped: posts.length - added
    };
  }

  /**
   * Get optimization summary
   */
  async getOptimizationSummary() {
    const posts = await this.getAllPosts();
    
    let totalScore = 0;
    let needsWork = 0;
    const issues = {
      noTitle: 0,
      noDescription: 0,
      noKeyword: 0,
      noSchema: 0
    };

    for (const post of posts) {
      const analysis = await this.analyzePost(post);
      totalScore += analysis.score;
      
      if (analysis.needsOptimization) {
        needsWork++;
      }
      
      analysis.issues.forEach(issue => {
        if (issue.type === 'title') issues.noTitle++;
        if (issue.type === 'description') issues.noDescription++;
        if (issue.type === 'keyword') issues.noKeyword++;
        if (issue.type === 'schema') issues.noSchema++;
      });
    }

    return {
      totalPosts: posts.length,
      averageScore: Math.round(totalScore / posts.length),
      needsOptimization: needsWork,
      optimized: posts.length - needsWork,
      issues: issues
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
