/**
 * AI Optimization Processor
 * 
 * Handles the actual AI optimization process:
 * - Fetches content from WordPress
 * - Runs SEO audits (before/after)
 * - Calls AI services for optimization
 * - Saves results to database
 */

import { AIContentOptimizer } from '../audit/ai-content-optimizer.js';
import { WordPressClient } from '../automation/wordpress-client.js';
import {
  getOptimizationById,
  updateOptimizationStatus,
  updateOptimizationResults
} from '../database/history-db.js';
import { logger } from '../audit/logger.js';

export class OptimizationProcessor {
  constructor() {
    this.aiOptimizer = new AIContentOptimizer();
    this.isProcessing = false;
  }
  
  /**
   * Process a single optimization job
   */
  async processOptimization(jobId, client) {
    console.log(`[AI Optimizer] Processing job ${jobId}...`);
    
    try {
      // 1. Update status to processing
      updateOptimizationStatus(jobId, 'processing');
      
      // 2. Get optimization details from database
      const optimization = getOptimizationById(jobId);
      
      if (!optimization) {
        throw new Error(`Optimization ${jobId} not found`);
      }
      
      // 3. Fetch content from WordPress
      console.log(`[AI Optimizer] Fetching content for ${optimization.contentTitle}...`);
      const wordpress = new WordPressClient(client);
      
      let content;
      if (optimization.contentType === 'post') {
        content = await wordpress.getPost(optimization.contentId);
      } else if (optimization.contentType === 'page') {
        content = await wordpress.getPage(optimization.contentId);
      } else {
        throw new Error(`Unsupported content type: ${optimization.contentType}`);
      }
      
      // 4. Calculate "before" state
      const beforeScore = this.calculateSEOScore(content);
      const beforeIssues = this.identifySEOIssues(content);
      
      console.log(`[AI Optimizer] Before score: ${beforeScore}/100`);
      console.log(`[AI Optimizer] Found ${beforeIssues.length} SEO issues`);
      
      // 5. Generate AI optimizations
      console.log(`[AI Optimizer] Running AI optimization...`);
      const aiResult = await this.aiOptimizer.optimizeContent(content, {
        score: beforeScore,
        issues: beforeIssues
      });
      
      console.log(`[AI Optimizer] AI Provider: ${aiResult.source}`);
      console.log(`[AI Optimizer] Generated ${aiResult.suggestions.length} suggestions`);
      
      // 6. Generate optimized title and meta
      const targetKeyword = this.extractKeyword(content.title.rendered);
      
      const optimizedTitle = await this.aiOptimizer.generateOptimizedTitle(
        content,
        targetKeyword
      );
      
      const optimizedMeta = await this.aiOptimizer.generateMetaDescription(
        content,
        targetKeyword
      );
      
      // Use first suggestion from AI, or keep original if no suggestions
      const finalTitle = optimizedTitle.suggestions && optimizedTitle.suggestions[0] 
        ? optimizedTitle.suggestions[0] 
        : content.title.rendered;
        
      const finalMeta = optimizedMeta.suggestions && optimizedMeta.suggestions[0]
        ? optimizedMeta.suggestions[0]
        : (content.excerpt?.rendered || '');
      
      // 7. Calculate "after" score
      const optimizedContent = {
        ...content,
        title: { rendered: finalTitle },
        excerpt: { rendered: finalMeta }
      };
      
      const afterScore = this.calculateSEOScore(optimizedContent);
      const improvement = afterScore > beforeScore 
        ? Math.round(((afterScore - beforeScore) / beforeScore) * 100)
        : 0;
      
      console.log(`[AI Optimizer] After score: ${afterScore}/100 (+${improvement}%)`);
      
      // 8. Extract improvements
      const improvementsApplied = aiResult.suggestions.map(s => {
        return `${s.category}: ${s.suggestion}`;
      });
      
      // 9. Save results to database
      updateOptimizationResults(jobId, {
        status: 'completed',
        
        // Before state
        beforeScore: beforeScore,
        beforeTitle: content.title.rendered,
        beforeMeta: content.excerpt?.rendered || '',
        beforeContent: this.stripHtml(content.content.rendered).substring(0, 1000),
        beforeIssues: beforeIssues,
        
        // After state
        afterScore: afterScore,
        afterTitle: finalTitle,
        afterMeta: finalMeta,
        afterContent: this.stripHtml(content.content.rendered).substring(0, 1000),
        improvementsApplied: improvementsApplied,
        
        // AI details
        aiProvider: aiResult.source,
        aiSuggestions: aiResult.suggestions,
        
        // Metrics
        improvement: improvement,
        keywordsAdded: [targetKeyword],
        
        // Cost (estimate for Gemini - FREE)
        costUSD: 0.00,
        tokensUsed: 2000,
        
        completedAt: new Date().toISOString()
      });
      
      console.log(`[AI Optimizer] ✅ Job ${jobId} completed successfully (+${improvement}%)`);
      
      return { 
        success: true, 
        improvement,
        beforeScore,
        afterScore
      };
      
    } catch (error) {
      console.error(`[AI Optimizer] ❌ Job ${jobId} failed:`, error);
      updateOptimizationStatus(jobId, 'failed', error.message);
      throw error;
    }
  }
  
  /**
   * Process optimization queue
   */
  async processQueue(queue) {
    if (this.isProcessing) {
      console.log('[AI Optimizer] Already processing queue, skipping...');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const pending = queue.filter(j => j.status === 'pending');
      
      console.log(`[AI Optimizer] Processing ${pending.length} jobs in queue...`);
      
      for (const job of pending) {
        try {
          // Note: job should have client info attached
          await this.processOptimization(job.id, job.client);
          
          // Rate limit: 3 seconds between optimizations
          await this.sleep(3000);
          
        } catch (error) {
          console.error(`[AI Optimizer] Queue processing error for ${job.id}:`, error);
          // Continue with next job
        }
      }
      
      console.log('[AI Optimizer] Queue processing completed');
      
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Calculate simple SEO score (0-100)
   */
  calculateSEOScore(content) {
    let score = 50; // Base score
    
    const title = content.title?.rendered || '';
    const excerpt = content.excerpt?.rendered || '';
    const contentText = this.stripHtml(content.content?.rendered || '');
    
    // Title checks
    if (title.length >= 30 && title.length <= 60) {
      score += 10;
    } else if (title.length > 0) {
      score += 5;
    }
    
    // Meta description checks
    if (excerpt.length >= 120 && excerpt.length <= 160) {
      score += 10;
    } else if (excerpt.length > 0) {
      score += 5;
    }
    
    // Content length checks
    if (contentText.length >= 300) {
      score += 10;
    }
    if (contentText.length >= 1000) {
      score += 10;
    }
    
    // Keyword presence (basic check)
    const titleWords = title.toLowerCase().split(' ');
    const hasKeyword = titleWords.some(word => contentText.toLowerCase().includes(word));
    if (hasKeyword) {
      score += 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Identify SEO issues
   */
  identifySEOIssues(content) {
    const issues = [];
    
    const title = content.title?.rendered || '';
    const excerpt = content.excerpt?.rendered || '';
    const contentText = this.stripHtml(content.content?.rendered || '');
    
    // Title issues
    if (!title) {
      issues.push('Missing title');
    } else if (title.length < 30) {
      issues.push('Title too short (under 30 characters)');
    } else if (title.length > 60) {
      issues.push('Title too long (over 60 characters)');
    }
    
    // Meta description issues
    if (!excerpt) {
      issues.push('Missing meta description');
    } else if (excerpt.length < 120) {
      issues.push('Meta description too short (under 120 characters)');
    } else if (excerpt.length > 160) {
      issues.push('Meta description too long (over 160 characters)');
    }
    
    // Content issues
    if (contentText.length < 300) {
      issues.push('Content too short (under 300 words)');
    }
    
    return issues;
  }
  
  /**
   * Extract primary keyword from title
   */
  extractKeyword(title) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    return words.slice(0, 2).join(' ');
  }
  
  /**
   * Strip HTML tags
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const optimizationProcessor = new OptimizationProcessor();
