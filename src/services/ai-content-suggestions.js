/**
 * AI-Powered Content Suggestions
 * 
 * Uses GPT-4 to provide intelligent content optimization suggestions:
 * - Content quality analysis
 * - SEO improvement recommendations
 * - Keyword optimization suggestions
 * - Content expansion ideas
 * - Competitive analysis insights
 * - Readability improvements
 */

import { OpenAI } from 'openai';
import db from '../database/index.js';

export class AIContentSuggestions {
  constructor(config = {}) {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    if (!this.openai) {
      console.warn('⚠️  OpenAI API key not found. AI features will be disabled.');
    }

    this.config = config;
  }

  /**
   * Analyze content and provide comprehensive suggestions
   */
  async analyzeContent(content, context = {}) {
    if (!this.openai) {
      return this.getFallbackSuggestions(content, context);
    }

    try {
      const prompt = this.buildAnalysisPrompt(content, context);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO content analyst. Provide actionable, specific suggestions to improve content for search engines and user experience.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content);

      return {
        success: true,
        suggestions: response,
        model: 'gpt-4o',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('AI analysis error:', error.message);
      return this.getFallbackSuggestions(content, context);
    }
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(content, context) {
    const { title, url, targetKeyword, industry, competitors } = context;

    return `Analyze this web content and provide SEO optimization suggestions.

CONTENT DETAILS:
${title ? `Title: ${title}` : ''}
${url ? `URL: ${url}` : ''}
${targetKeyword ? `Target Keyword: ${targetKeyword}` : ''}
${industry ? `Industry: ${industry}` : ''}

CONTENT:
${content.substring(0, 3000)}

${competitors ? `\nCOMPETITORS:\n${competitors.join('\n')}` : ''}

Provide a JSON response with:
{
  "contentQualityScore": <number 0-100>,
  "seoScore": <number 0-100>,
  "readabilityScore": <number 0-100>,
  "keyIssues": [
    {
      "category": "seo|content|readability|technical",
      "severity": "critical|high|medium|low",
      "issue": "description",
      "suggestion": "how to fix"
    }
  ],
  "contentSuggestions": [
    "specific suggestion 1",
    "specific suggestion 2"
  ],
  "keywordOpportunities": [
    {
      "keyword": "suggested keyword",
      "reason": "why to add it",
      "placement": "where to add it"
    }
  ],
  "structureImprovements": [
    "structural improvement 1"
  ],
  "competitiveInsights": [
    "what competitors are doing better"
  ],
  "quickWins": [
    "easy fixes that will have immediate impact"
  ]
}`;
  }

  /**
   * Generate meta description using AI
   */
  async generateMetaDescription(title, content, options = {}) {
    if (!this.openai) {
      return this.generateBasicMetaDescription(title, content);
    }

    try {
      const { maxLength = 155, includeKeyword, businessName, location } = options;

      const prompt = `Write a compelling meta description for this webpage:

Title: ${title}
Content: ${content.substring(0, 500)}

Requirements:
- Maximum ${maxLength} characters
- Include call-to-action
- Focus on benefits
${includeKeyword ? `- Include keyword: ${includeKeyword}` : ''}
${businessName ? `- Mention business: ${businessName}` : ''}
${location ? `- Include location: ${location}` : ''}
- Natural and engaging

Write ONLY the meta description.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      });

      let description = completion.choices[0].message.content.trim();
      description = description.replace(/^["']|["']$/g, '');

      if (description.length > maxLength) {
        description = description.substring(0, maxLength - 3) + '...';
      }

      return description;

    } catch (error) {
      console.error('AI meta description error:', error.message);
      return this.generateBasicMetaDescription(title, content);
    }
  }

  /**
   * Generate heading suggestions using AI
   */
  async suggestHeadings(content, currentHeadings, options = {}) {
    if (!this.openai) {
      return this.generateBasicHeadingSuggestions(content, currentHeadings);
    }

    try {
      const { targetKeyword, tone = 'professional' } = options;

      const prompt = `Suggest improved headings for this content:

Content: ${content.substring(0, 1000)}

Current Headings:
${currentHeadings.map((h, i) => `${i + 1}. ${h.level}: ${h.text}`).join('\n')}

${targetKeyword ? `Target Keyword: ${targetKeyword}` : ''}
Tone: ${tone}

Provide improved headings that:
- Follow proper hierarchy (H1 > H2 > H3)
- Include target keyword naturally
- Are engaging and descriptive
- Match the ${tone} tone

Return JSON:
{
  "suggestions": [
    {
      "level": "h1|h2|h3",
      "original": "original heading",
      "suggested": "improved heading",
      "reason": "why this is better"
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content);
      return response.suggestions;

    } catch (error) {
      console.error('AI heading suggestions error:', error.message);
      return this.generateBasicHeadingSuggestions(content, currentHeadings);
    }
  }

  /**
   * Predict SEO score impact of changes
   */
  async predictImpact(currentContent, proposedChanges) {
    if (!this.openai) {
      return { estimatedImpact: 'moderate', confidence: 'low' };
    }

    try {
      const prompt = `Predict the SEO impact of these proposed changes:

CURRENT CONTENT:
${currentContent.substring(0, 1000)}

PROPOSED CHANGES:
${JSON.stringify(proposedChanges, null, 2)}

Analyze and return JSON:
{
  "estimatedImpact": "significant|moderate|minimal|negative",
  "confidence": "high|medium|low",
  "scoreChange": <estimated change in SEO score>,
  "expectedOutcomes": [
    "specific expected outcome"
  ],
  "risks": [
    "potential risk"
  ],
  "recommendations": [
    "recommendation before implementing"
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      console.error('AI impact prediction error:', error.message);
      return {
        estimatedImpact: 'moderate',
        confidence: 'low',
        scoreChange: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate content expansion ideas
   */
  async suggestContentExpansion(content, context = {}) {
    if (!this.openai) {
      return ['Add more detailed examples', 'Include statistics', 'Add FAQ section'];
    }

    try {
      const { targetKeyword, currentWordCount, targetWordCount = 1500 } = context;
      const wordsNeeded = targetWordCount - (currentWordCount || 0);

      const prompt = `Suggest ways to expand this content from ${currentWordCount || 'current'} words to ${targetWordCount} words:

${content.substring(0, 1500)}

${targetKeyword ? `Target Keyword: ${targetKeyword}` : ''}

Suggest ${Math.ceil(wordsNeeded / 200)} specific sections or topics to add that:
- Are relevant and valuable
- Naturally include target keyword
- Improve SEO and user value
- Are specific (not generic "add more content")

Return JSON array of suggestions:
[
  {
    "section": "section title",
    "topics": ["topic 1", "topic 2"],
    "estimatedWords": <number>,
    "seoValue": "high|medium|low",
    "priority": "high|medium|low"
  }
]`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const response = JSON.parse(completion.choices[0].message.content);
      return response.suggestions || response;

    } catch (error) {
      console.error('AI content expansion error:', error.message);
      return [
        {
          section: 'Detailed Examples',
          topics: ['Real-world case studies', 'Step-by-step guides'],
          estimatedWords: 300,
          seoValue: 'high',
          priority: 'high'
        }
      ];
    }
  }

  /**
   * Fallback suggestions (rule-based)
   */
  getFallbackSuggestions(content, context) {
    const wordCount = content.split(/\s+/).length;
    const hasImages = content.includes('<img');
    const hasLinks = content.includes('<a');

    const suggestions = {
      contentQualityScore: wordCount > 500 ? 70 : 50,
      seoScore: 60,
      readabilityScore: 65,
      keyIssues: [],
      contentSuggestions: [],
      keywordOpportunities: [],
      structureImprovements: [],
      quickWins: []
    };

    if (wordCount < 300) {
      suggestions.keyIssues.push({
        category: 'content',
        severity: 'critical',
        issue: 'Content too short',
        suggestion: 'Expand content to at least 300 words'
      });
    }

    if (!hasImages) {
      suggestions.quickWins.push('Add relevant images to improve engagement');
    }

    if (!hasLinks) {
      suggestions.quickWins.push('Add internal links to related pages');
    }

    return {
      success: true,
      suggestions,
      model: 'rule-based',
      timestamp: new Date().toISOString()
    };
  }

  generateBasicMetaDescription(title, content) {
    const text = content.replace(/<[^>]*>/g, '').substring(0, 155);
    return text + (text.length >= 155 ? '...' : '');
  }

  generateBasicHeadingSuggestions(content, currentHeadings) {
    return currentHeadings.map(h => ({
      level: h.level,
      original: h.text,
      suggested: h.text,
      reason: 'AI unavailable - manual review recommended'
    }));
  }
}

export default new AIContentSuggestions();
