import axios from 'axios';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';

/**
 * AI Content Optimization Module
 * Integrates with OpenAI, Anthropic Claude, Cohere, and Google Gemini
 */

export class AIContentOptimizer {
  constructor() {
    this.openaiKey = config.ai.openaiApiKey;
    this.anthropicKey = config.ai.anthropicApiKey;
    this.cohereKey = config.ai.cohereApiKey;
    this.geminiKey = config.google.geminiApiKey;
  }

  /**
   * Optimize content using AI
   * @param {object} post - WordPress post object
   * @param {object} auditResults - SEO audit results
   * @returns {Promise<object>} Optimization suggestions
   */
  async optimizeContent(post, auditResults) {
    try {
      logger.info(`AI optimizing post: ${post.title.rendered}`);

      // Use the best available AI service
      if (this.anthropicKey) {
        return await this.optimizeWithClaude(post, auditResults);
      }
      if (this.openaiKey) {
        return await this.optimizeWithOpenAI(post, auditResults);
      }
      if (this.geminiKey) {
        return await this.optimizeWithGemini(post, auditResults);
      }
      if (this.cohereKey) {
        return await this.optimizeWithCohere(post, auditResults);
      }

      logger.warn('No AI API keys configured');
      return {
        post: post.title.rendered,
        suggestions: [],
        message: 'No AI API keys configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GEMINI_API_KEY, or COHERE_API_KEY to .env'
      };

    } catch (error) {
      logger.error('AI optimization failed', error.message);
      throw error;
    }
  }

  /**
   * Optimize with Claude (Anthropic) - Best quality
   */
  async optimizeWithClaude(post, auditResults) {
    try {
      const prompt = this.buildOptimizationPrompt(post, auditResults);

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      const suggestions = this.parseAISuggestions(response.data.content[0].text);

      return {
        post: post.title.rendered,
        source: 'Claude 3 Haiku',
        suggestions,
        raw: response.data.content[0].text
      };

    } catch (error) {
      logger.error('Claude API failed', error.message);
      throw error;
    }
  }

  /**
   * Optimize with OpenAI GPT-4
   */
  async optimizeWithOpenAI(post, auditResults) {
    try {
      const prompt = this.buildOptimizationPrompt(post, auditResults);

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO content optimizer. Provide actionable, specific suggestions to improve SEO.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const suggestions = this.parseAISuggestions(response.data.choices[0].message.content);

      return {
        post: post.title.rendered,
        source: 'GPT-4o',
        suggestions,
        raw: response.data.choices[0].message.content
      };

    } catch (error) {
      logger.error('OpenAI API failed', error.message);
      throw error;
    }
  }

  /**
   * Optimize with Google Gemini (Free tier available!)
   */
  async optimizeWithGemini(post, auditResults) {
    try {
      const prompt = this.buildOptimizationPrompt(post, auditResults);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const text = response.data.candidates[0].content.parts[0].text;
      const suggestions = this.parseAISuggestions(text);

      return {
        post: post.title.rendered,
        source: 'Google Gemini 2.5 Flash',
        suggestions,
        raw: text
      };

    } catch (error) {
      logger.error('Gemini API failed', error.message);
      throw error;
    }
  }

  /**
   * Optimize with Cohere
   */
  async optimizeWithCohere(post, auditResults) {
    try {
      const prompt = this.buildOptimizationPrompt(post, auditResults);

      const response = await axios.post(
        'https://api.cohere.ai/v1/generate',
        {
          model: 'command',
          prompt: prompt,
          max_tokens: 2000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.cohereKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const suggestions = this.parseAISuggestions(response.data.generations[0].text);

      return {
        post: post.title.rendered,
        source: 'Cohere Command',
        suggestions,
        raw: response.data.generations[0].text
      };

    } catch (error) {
      logger.error('Cohere API failed', error.message);
      throw error;
    }
  }

  /**
   * Generate optimized title using AI
   */
  async generateOptimizedTitle(post, targetKeyword) {
    try {
      const prompt = `Generate an SEO-optimized title for this blog post. The title should:
- Be 50-60 characters long
- Include the keyword: "${targetKeyword}"
- Be compelling and click-worthy
- Accurately reflect the content

Current title: ${post.title.rendered}
Content excerpt: ${this.stripHtml(post.content.rendered).substring(0, 500)}...

Generate 3 alternative title options in this format:
1. [Title option 1]
2. [Title option 2]
3. [Title option 3]`;

      const result = await this.generateText(prompt);

      return {
        currentTitle: post.title.rendered,
        suggestions: this.extractTitleOptions(result.text),
        source: result.source
      };

    } catch (error) {
      logger.error('AI title generation failed', error.message);
      throw error;
    }
  }

  /**
   * Generate optimized meta description using AI
   */
  async generateMetaDescription(post, targetKeyword) {
    try {
      const prompt = `Generate an SEO-optimized meta description for this blog post. The description should:
- Be 150-160 characters long
- Include the keyword: "${targetKeyword}"
- Be compelling and encourage clicks
- Accurately summarize the content

Title: ${post.title.rendered}
Content: ${this.stripHtml(post.content.rendered).substring(0, 1000)}...

Generate 2 meta description options:
1. [Description option 1]
2. [Description option 2]`;

      const result = await this.generateText(prompt);

      return {
        currentExcerpt: post.excerpt.rendered,
        suggestions: this.extractDescriptionOptions(result.text),
        source: result.source
      };

    } catch (error) {
      logger.error('AI meta description generation failed', error.message);
      throw error;
    }
  }

  /**
   * Extract and suggest keywords using AI
   */
  async extractKeywords(post) {
    try {
      const content = this.stripHtml(post.content.rendered);
      const prompt = `Analyze this blog post content and extract:
1. Primary keyword (1-3 words)
2. Secondary keywords (5-10 keywords)
3. Long-tail keyword opportunities (3-5 phrases)

Content:
${content.substring(0, 2000)}...

Format as JSON:
{
  "primary": "keyword",
  "secondary": ["keyword1", "keyword2", ...],
  "longTail": ["phrase1", "phrase2", ...]
}`;

      const result = await this.generateText(prompt);
      const keywords = this.extractJSON(result.text);

      return {
        postTitle: post.title.rendered,
        keywords,
        source: result.source
      };

    } catch (error) {
      logger.error('AI keyword extraction failed', error.message);
      throw error;
    }
  }

  /**
   * Get content improvement suggestions
   */
  async getContentImprovements(post, auditResults) {
    try {
      const issues = auditResults.issues.map(i => `- ${i.message}`).join('\n');

      const prompt = `Review this blog post and suggest specific improvements:

Title: ${post.title.rendered}
Current Issues:
${issues}

Content: ${this.stripHtml(post.content.rendered).substring(0, 1500)}...

Provide:
1. Specific content improvements (what to add, remove, or change)
2. Heading structure suggestions
3. Internal linking opportunities
4. Call-to-action recommendations
5. Readability improvements

Format as a numbered list.`;

      const result = await this.generateText(prompt);

      return {
        postTitle: post.title.rendered,
        improvements: this.parseImprovements(result.text),
        source: result.source
      };

    } catch (error) {
      logger.error('AI content improvement failed', error.message);
      throw error;
    }
  }

  /**
   * Build optimization prompt
   */
  buildOptimizationPrompt(post, auditResults) {
    const issues = auditResults.issues
      .map(i => `- ${i.severity.toUpperCase()}: ${i.message}`)
      .join('\n');

    const content = this.stripHtml(post.content.rendered);

    return `You are an SEO expert. Analyze this blog post and provide specific, actionable optimization suggestions.

TITLE: ${post.title.rendered}

SEO ISSUES FOUND:
${issues}

CONTENT (first 1000 chars):
${content.substring(0, 1000)}...

Provide specific suggestions in these categories:
1. Title Optimization
2. Meta Description
3. Content Structure
4. Keyword Usage
5. Readability
6. Internal Linking

Format each suggestion as:
Category: [Specific actionable suggestion]`;
  }

  /**
   * Parse AI suggestions from response
   */
  parseAISuggestions(text) {
    const suggestions = [];
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Match patterns like "1. Title: ..." or "- Category: ..."
      const match = line.match(/^[\d\-•]\s*([^:]+):\s*(.+)$/);
      if (match) {
        suggestions.push({
          category: match[1].trim(),
          suggestion: match[2].trim()
        });
      }
    }

    return suggestions.length > 0 ? suggestions : [{ category: 'General', suggestion: text }];
  }

  /**
   * Generic text generation (uses best available AI)
   */
  async generateText(prompt) {
    if (this.anthropicKey) {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      return { text: response.data.content[0].text, source: 'Claude 3 Haiku' };
    }

    if (this.openaiKey) {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return { text: response.data.choices[0].message.content, source: 'GPT-4o' };
    }

    if (this.geminiKey) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        }
      );
      return { text: response.data.candidates[0].content.parts[0].text, source: 'Gemini 2.5 Flash' };
    }

    throw new Error('No AI API keys configured');
  }

  /**
   * Helper methods
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  extractTitleOptions(text) {
    const matches = text.match(/^\d+\.\s*(.+)$/gm);
    return matches ? matches.map(m => m.replace(/^\d+\.\s*/, '').trim()) : [];
  }

  extractDescriptionOptions(text) {
    const matches = text.match(/^\d+\.\s*(.+)$/gm);
    return matches ? matches.map(m => m.replace(/^\d+\.\s*/, '').trim()) : [];
  }

  extractJSON(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      /* istanbul ignore next */
      return null;
    }
  }

  parseImprovements(text) {
    const improvements = [];
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        improvements.push(match[1].trim());
      }
    }

    return improvements;
  }
}

// Export singleton instance
export const aiOptimizer = new AIContentOptimizer();
