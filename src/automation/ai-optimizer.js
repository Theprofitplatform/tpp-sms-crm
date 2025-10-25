import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../audit/logger.js';

/**
 * AI Content Optimization using Claude (Anthropic)
 * Cost: ~$0.01 per post (using Claude 3 Haiku)
 * Better quality than GPT-3.5, cheaper too!
 */
export class AIOptimizer {
  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      logger.warn('Anthropic API key not set - AI optimization will be skipped');
      this.enabled = false;
      return;
    }

    this.anthropic = new Anthropic({ apiKey: apiKey });
    this.enabled = true;
    logger.info('AI Optimizer initialized (Claude 3 Haiku)');
  }

  /**
   * Generate optimized title using AI
   */
  async generateTitle(currentTitle, keyword, context = '') {
    if (!this.enabled) return currentTitle;

    try {
      const prompt = `Create an SEO-optimized title for a blog post.

Current title: "${currentTitle}"
Target keyword: "${keyword}"
${context ? `Additional context: ${context}` : ''}

Requirements:
- Include the keyword naturally
- 50-60 characters total
- Compelling and click-worthy
- Use power words (complete, ultimate, essential, best, etc.)
- Make it actionable

Return ONLY the optimized title, nothing else.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        temperature: 0.8,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const optimized = response.content[0].text.trim().replace(/^["']|["']$/g, '');
      logger.info(`AI title: "${currentTitle}" → "${optimized}"`);
      
      return optimized;

    } catch (error) {
      logger.error('AI title generation failed:', error.message);
      return currentTitle;
    }
  }

  /**
   * Generate optimized meta description using AI
   */
  async generateMetaDescription(title, content, keyword) {
    if (!this.enabled) return '';

    try {
      const contentPreview = content.substring(0, 500);
      
      const prompt = `Create an SEO-optimized meta description.

Title: "${title}"
Target keyword: "${keyword}"
Content preview: ${contentPreview}...

Requirements:
- 150-160 characters exactly
- Include the keyword naturally
- Compelling call-to-action
- Encourage clicks
- Benefits-focused

Return ONLY the meta description, nothing else.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        temperature: 0.8,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const optimized = response.content[0].text.trim().replace(/^["']|["']$/g, '');
      logger.info(`AI meta description generated (${optimized.length} chars)`);
      
      return optimized;

    } catch (error) {
      logger.error('AI meta description generation failed:', error.message);
      return '';
    }
  }

  /**
   * Generate alt text for images
   */
  async generateAltText(imageContext, keyword) {
    if (!this.enabled) return '';

    try {
      const prompt = `Create SEO-optimized alt text for an image.

Image context: ${imageContext}
Target keyword: ${keyword}

Requirements:
- Descriptive and accessible
- Under 125 characters
- Include keyword if relevant
- Describe what's actually in the image

Return ONLY the alt text, nothing else.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      return response.content[0].text.trim();

    } catch (error) {
      logger.error('AI alt text generation failed:', error.message);
      return '';
    }
  }

  /**
   * Bulk optimize posts with AI
   */
  async bulkOptimize(posts, options = {}) {
    if (!this.enabled) {
      logger.warn('AI optimization skipped - no API key');
      return [];
    }

    const { limit = 10 } = options;
    const results = [];

    logger.section(`AI optimizing ${Math.min(posts.length, limit)} posts...`);

    for (const post of posts.slice(0, limit)) {
      try {
        const keyword = this.extractKeyword(post.title);
        const content = post.content || post.excerpt || '';
        
        const optimizations = {
          title: await this.generateTitle(post.title, keyword),
          metaDescription: await this.generateMetaDescription(
            post.title,
            content,
            keyword
          )
        };

        results.push({
          postId: post.id,
          postTitle: post.title,
          success: true,
          optimizations: optimizations
        });

        logger.success(`✅ AI optimized: ${post.title}`);

        // Rate limit to control costs
        await this.sleep(2000);

      } catch (error) {
        results.push({
          postId: post.id,
          success: false,
          error: error.message
        });
        logger.error(`AI optimization failed for post ${post.id}:`, error.message);
      }
    }

    return results;
  }

  extractKeyword(title) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    return words.slice(0, 3).join(' ');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
