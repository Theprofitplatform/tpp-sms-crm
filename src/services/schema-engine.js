/**
 * ADVANCED SCHEMA AUTOMATION ENGINE
 *
 * AI-powered schema markup generation and management
 * Automatically detects schema opportunities and generates valid JSON-LD
 *
 * Supported Schema Types:
 * - Article, BlogPosting, NewsArticle
 * - Product, Offer
 * - LocalBusiness (and subtypes)
 * - FAQPage
 * - HowTo
 * - Review, AggregateRating
 * - Event
 * - Recipe
 * - Organization
 * - Person
 * - VideoObject
 * - BreadcrumbList
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'seo-automation.db');

class SchemaEngine {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Schema type detectors
    this.detectors = {
      Article: this.detectArticle.bind(this),
      Product: this.detectProduct.bind(this),
      LocalBusiness: this.detectLocalBusiness.bind(this),
      FAQPage: this.detectFAQ.bind(this),
      HowTo: this.detectHowTo.bind(this),
      Review: this.detectReview.bind(this),
      Event: this.detectEvent.bind(this),
      Recipe: this.detectRecipe.bind(this),
      Organization: this.detectOrganization.bind(this),
      BreadcrumbList: this.detectBreadcrumb.bind(this)
    };
  }

  /**
   * Analyze a page and detect all schema opportunities
   */
  async analyzePageForSchema(clientId, url, html) {
    const $ = cheerio.load(html);

    // Check existing schema
    const existingSchema = this.extractExistingSchema($);

    const opportunities = [];

    // Run all detectors
    for (const [schemaType, detector] of Object.entries(this.detectors)) {
      // Skip if this schema type already exists
      if (existingSchema.some(s => s['@type'] === schemaType)) {
        continue;
      }

      const detection = await detector($, url);
      if (detection && detection.confidence > 50) {
        opportunities.push({
          clientId,
          pageUrl: url,
          schemaType,
          confidenceScore: detection.confidence,
          detectedData: JSON.stringify(detection.data),
          recommendation: detection.recommendation,
          priority: this.calculatePriority(detection.confidence, schemaType),
          estimatedImpact: this.estimateImpact(schemaType, detection.data)
        });
      }
    }

    // Store opportunities in database
    if (opportunities.length > 0) {
      const stmt = this.db.prepare(`
        INSERT INTO schema_opportunities (
          client_id, page_url, schema_type, confidence_score,
          detected_data, recommendation, priority, estimated_impact
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const opp of opportunities) {
        stmt.run(
          opp.clientId,
          opp.pageUrl,
          opp.schemaType,
          opp.confidenceScore,
          opp.detectedData,
          opp.recommendation,
          opp.priority,
          opp.estimatedImpact
        );
      }
    }

    return {
      existingSchema,
      opportunities,
      totalOpportunities: opportunities.length
    };
  }

  /**
   * Extract existing schema markup from page
   */
  extractExistingSchema($) {
    const schemas = [];

    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const schema = JSON.parse($(elem).html());
        schemas.push(schema);
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    return schemas;
  }

  /**
   * Detect Article schema opportunity
   */
  async detectArticle($, url) {
    const article = $('article');
    const hasArticleTag = article.length > 0;
    const h1 = $('h1').first().text().trim();
    const meta = {
      description: $('meta[name="description"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      publishDate: $('meta[property="article:published_time"]').attr('content') ||
                    $('time[datetime]').first().attr('datetime')
    };

    // Look for article indicators
    const hasHeadline = h1 && h1.length > 20;
    const hasAuthor = !!meta.author || $('.author, .byline').length > 0;
    const hasDate = !!meta.publishDate || $('time').length > 0;
    const wordCount = $('body').text().split(/\s+/).length;
    const hasContent = wordCount > 300;

    if (!hasHeadline || !hasContent) {
      return null;
    }

    let confidence = 0;
    if (hasArticleTag) confidence += 30;
    if (hasHeadline) confidence += 20;
    if (hasAuthor) confidence += 20;
    if (hasDate) confidence += 15;
    if (hasContent) confidence += 15;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        headline: h1,
        author: meta.author || $('.author, .byline').first().text().trim(),
        datePublished: meta.publishDate,
        wordCount,
        image: $('meta[property="og:image"]').attr('content') || $('img').first().attr('src')
      },
      recommendation: `This page appears to be an article with ${wordCount} words. Adding Article schema will help it appear in Google News and rich results.`
    };
  }

  /**
   * Detect Product schema opportunity
   */
  async detectProduct($, url) {
    // Look for product indicators
    const hasPrice = /(\$|€|£|USD|EUR|GBP)\s*\d+/.test($('body').text());
    const hasSKU = $('[itemprop="sku"], .sku, #sku').length > 0;
    const hasAddToCart = $('button, a').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('add to cart') || text.includes('buy now');
    }).length > 0;

    const priceText = $('[itemprop="price"], .price, .product-price').first().text();
    const productName = $('h1').first().text().trim();

    let confidence = 0;
    if (hasPrice) confidence += 30;
    if (hasSKU) confidence += 25;
    if (hasAddToCart) confidence += 25;
    if (productName) confidence += 20;

    if (confidence < 50) return null;

    // Extract price
    const priceMatch = priceText.match(/(\d+\.?\d*)/);
    const price = priceMatch ? priceMatch[1] : null;

    return {
      confidence,
      data: {
        name: productName,
        price,
        sku: $('[itemprop="sku"], .sku').first().text().trim(),
        image: $('meta[property="og:image"]').attr('content') || $('.product-image img').first().attr('src'),
        description: $('meta[name="description"]').attr('content')
      },
      recommendation: `This appears to be a product page. Adding Product schema will enable rich snippets with price and availability in search results.`
    };
  }

  /**
   * Detect LocalBusiness schema opportunity
   */
  async detectLocalBusiness($, url) {
    // Look for local business indicators
    const hasAddress = $('.address, [itemprop="address"]').length > 0 ||
                       $('body').text().match(/\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd)/i);
    const hasPhone = $('a[href^="tel:"], .phone, [itemprop="telephone"]').length > 0 ||
                     /(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/.test($('body').text());
    const hasHours = $('body').text().match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday).*\d+:\d+/i);

    let confidence = 0;
    if (hasAddress) confidence += 35;
    if (hasPhone) confidence += 30;
    if (hasHours) confidence += 20;
    if ($('body').text().toLowerCase().includes('location')) confidence += 15;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        name: $('h1').first().text().trim() || $('title').text().trim(),
        address: $('.address, [itemprop="address"]').first().text().trim(),
        phone: $('a[href^="tel:"]').first().attr('href')?.replace('tel:', '') ||
               $('body').text().match(/(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/)?.[1],
        hasHours: !!hasHours
      },
      recommendation: `This page has local business information. Adding LocalBusiness schema will improve visibility in local search and Google Maps.`
    };
  }

  /**
   * Detect FAQ schema opportunity
   */
  async detectFAQ($, url) {
    // Look for FAQ patterns
    const faqHeadings = $('h1, h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('faq') ||
             text.includes('frequently asked') ||
             text.includes('questions');
    });

    // Look for question/answer patterns
    const questions = $('[itemtype*="Question"], .faq-question, .question, dt').filter((i, el) => {
      const text = $(el).text();
      return text.endsWith('?') || text.length > 10;
    });

    const answers = $('[itemtype*="Answer"], .faq-answer, .answer, dd');

    let confidence = 0;
    if (faqHeadings.length > 0) confidence += 40;
    if (questions.length >= 3) confidence += 30;
    if (answers.length >= 3) confidence += 30;

    if (confidence < 50 || questions.length < 3) return null;

    // Extract Q&A pairs
    const qaData = [];
    questions.each((i, el) => {
      if (i < 10) { // Limit to first 10
        const question = $(el).text().trim();
        const answer = $(el).next().text().trim() || answers.eq(i).text().trim();
        if (question && answer) {
          qaData.push({ question, answer });
        }
      }
    });

    return {
      confidence,
      data: {
        questionCount: qaData.length,
        questions: qaData
      },
      recommendation: `Found ${qaData.length} question/answer pairs. Adding FAQPage schema will enable FAQ rich results in search.`
    };
  }

  /**
   * Detect HowTo schema opportunity
   */
  async detectHowTo($, url) {
    const title = $('h1').first().text().toLowerCase();
    const hasHowToTitle = title.includes('how to') || title.includes('how do');

    // Look for step indicators
    const steps = $('ol li, [class*="step"], [id*="step"]').filter((i, el) => {
      return $(el).text().length > 20;
    });

    const hasNumberedList = $('ol li').length >= 3;

    let confidence = 0;
    if (hasHowToTitle) confidence += 40;
    if (hasNumberedList) confidence += 30;
    if (steps.length >= 3) confidence += 30;

    if (confidence < 50 || steps.length < 3) return null;

    const stepsData = [];
    steps.each((i, el) => {
      if (i < 20) { // Limit to 20 steps
        const stepText = $(el).text().trim();
        if (stepText) {
          stepsData.push({
            position: i + 1,
            text: stepText,
            image: $(el).find('img').first().attr('src')
          });
        }
      }
    });

    return {
      confidence,
      data: {
        name: $('h1').first().text().trim(),
        stepCount: stepsData.length,
        steps: stepsData,
        totalTime: this.extractTime($('body').text())
      },
      recommendation: `This appears to be a how-to guide with ${stepsData.length} steps. HowTo schema will enable step-by-step rich results.`
    };
  }

  /**
   * Detect Review schema opportunity
   */
  async detectReview($, url) {
    const hasRating = $('[itemprop="rating"], .rating, .stars').length > 0 ||
                      /(\d+\.?\d*)\s*(out of|\/)\s*5|★/.test($('body').text());
    const hasReviewText = $('.review, [itemprop="review"]').length > 0;
    const hasAuthor = $('[itemprop="author"], .reviewer, .review-author').length > 0;

    let confidence = 0;
    if (hasRating) confidence += 40;
    if (hasReviewText) confidence += 35;
    if (hasAuthor) confidence += 25;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        itemReviewed: $('h1').first().text().trim(),
        ratingValue: $('[itemprop="ratingValue"]').first().text() ||
                     $('body').text().match(/(\d+\.?\d*)\s*(out of|\/)\s*5/)?.[1],
        author: $('[itemprop="author"]').first().text().trim() ||
                $('.reviewer').first().text().trim()
      },
      recommendation: `This page contains review content. Adding Review schema will display star ratings in search results.`
    };
  }

  /**
   * Detect Event schema opportunity
   */
  async detectEvent($, url) {
    const hasEventKeywords = /event|conference|webinar|workshop|seminar|concert|festival/i.test($('body').text());
    const hasDate = $('[itemprop="startDate"], .event-date, time[datetime]').length > 0;
    const hasLocation = $('.location, [itemprop="location"]').length > 0 ||
                        $('body').text().includes('venue');

    let confidence = 0;
    if (hasEventKeywords) confidence += 30;
    if (hasDate) confidence += 35;
    if (hasLocation) confidence += 35;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        name: $('h1').first().text().trim(),
        startDate: $('[itemprop="startDate"], time[datetime]').first().attr('datetime') ||
                   $('.event-date').first().text(),
        location: $('.location, [itemprop="location"]').first().text().trim()
      },
      recommendation: `This appears to be an event page. Adding Event schema will enable event rich results with date and location.`
    };
  }

  /**
   * Detect Recipe schema opportunity
   */
  async detectRecipe($, url) {
    const hasRecipeKeyword = /recipe|ingredients|instructions|cooking|baking/i.test($('body').text());
    const hasIngredients = $('[itemprop="recipeIngredient"], .ingredients, ul li').filter((i, el) => {
      return /cup|tbsp|tsp|oz|lb|gram|ml|ingredient/i.test($(el).text());
    }).length >= 3;
    const hasInstructions = $('ol li').length >= 3 || $('.instructions, [itemprop="recipeInstructions"]').length > 0;

    let confidence = 0;
    if (hasRecipeKeyword) confidence += 25;
    if (hasIngredients) confidence += 40;
    if (hasInstructions) confidence += 35;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        name: $('h1').first().text().trim(),
        hasIngredients: true,
        hasInstructions: true,
        prepTime: this.extractTime($('body').text(), 'prep'),
        cookTime: this.extractTime($('body').text(), 'cook')
      },
      recommendation: `This is a recipe page. Adding Recipe schema will enable rich recipe cards with ratings, cook time, and images.`
    };
  }

  /**
   * Detect Organization schema opportunity
   */
  async detectOrganization($, url) {
    const isHomepage = url.endsWith('/') || !url.split('/').pop().includes('.');
    const hasLogo = $('img[alt*="logo" i], .logo img').length > 0;
    const hasSocial = $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"]').length > 0;
    const hasContact = $('a[href^="mailto:"], a[href^="tel:"]').length > 0;

    let confidence = 0;
    if (isHomepage) confidence += 30;
    if (hasLogo) confidence += 25;
    if (hasSocial) confidence += 25;
    if (hasContact) confidence += 20;

    if (confidence < 50) return null;

    return {
      confidence,
      data: {
        name: $('title').text().split('|')[0].trim(),
        logo: $('img[alt*="logo" i], .logo img').first().attr('src'),
        url: url.split('/').slice(0, 3).join('/'),
        socialMedia: $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"]')
          .map((i, el) => $(el).attr('href')).get()
      },
      recommendation: `This appears to be your main website. Adding Organization schema improves brand knowledge panel in search.`
    };
  }

  /**
   * Detect Breadcrumb schema opportunity
   */
  async detectBreadcrumb($, url) {
    const breadcrumbs = $('.breadcrumb, [class*="breadcrumb"], nav[aria-label*="breadcrumb" i]');
    const hasBreadcrumbs = breadcrumbs.length > 0;
    const links = breadcrumbs.find('a');

    let confidence = 0;
    if (hasBreadcrumbs) confidence += 50;
    if (links.length >= 2) confidence += 30;
    if (breadcrumbs.find('ol, ul').length > 0) confidence += 20;

    if (confidence < 50) return null;

    const items = [];
    links.each((i, el) => {
      items.push({
        position: i + 1,
        name: $(el).text().trim(),
        url: $(el).attr('href')
      });
    });

    return {
      confidence,
      data: {
        itemCount: items.length,
        items
      },
      recommendation: `Found breadcrumb navigation with ${items.length} items. Adding BreadcrumbList schema will show breadcrumbs in search results.`
    };
  }

  /**
   * Helper: Extract time duration from text
   */
  extractTime(text, type = null) {
    const patterns = {
      prep: /prep(?:aration)?\s*time:?\s*(\d+)\s*(hour|hr|minute|min)/i,
      cook: /cook(?:ing)?\s*time:?\s*(\d+)\s*(hour|hr|minute|min)/i,
      total: /total\s*time:?\s*(\d+)\s*(hour|hr|minute|min)/i
    };

    const pattern = type ? patterns[type] : patterns.total;
    const match = text.match(pattern || /(\d+)\s*(hour|hr|minute|min)/i);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const minutes = unit.startsWith('hour') || unit === 'hr' ? value * 60 : value;

    return `PT${Math.floor(minutes / 60)}H${minutes % 60}M`;
  }

  /**
   * Calculate priority based on confidence and schema type
   */
  calculatePriority(confidence, schemaType) {
    // High-impact schema types
    const highImpact = ['Product', 'LocalBusiness', 'FAQPage', 'Review'];
    const mediumImpact = ['Article', 'HowTo', 'Recipe', 'Event'];

    if (confidence >= 80 && highImpact.includes(schemaType)) return 'high';
    if (confidence >= 70) return 'high';
    if (confidence >= 60 || mediumImpact.includes(schemaType)) return 'medium';
    return 'low';
  }

  /**
   * Estimate SEO impact of adding schema
   */
  estimateImpact(schemaType, data) {
    const impactMap = {
      'Product': 'high', // Rich snippets with price
      'LocalBusiness': 'high', // Local pack visibility
      'FAQPage': 'high', // FAQ rich results
      'Review': 'high', // Star ratings
      'Recipe': 'high', // Recipe cards
      'HowTo': 'medium', // Step-by-step results
      'Article': 'medium', // News/article features
      'Event': 'medium', // Event listings
      'Organization': 'low', // Knowledge panel
      'BreadcrumbList': 'low' // Breadcrumb display
    };

    return impactMap[schemaType] || 'medium';
  }

  /**
   * Generate schema markup using AI
   */
  async generateSchemaMarkup(schemaType, detectedData, pageContext = {}) {
    const prompt = `Generate valid JSON-LD schema markup for ${schemaType}.

Use this data extracted from the page:
${JSON.stringify(detectedData, null, 2)}

Additional context:
${JSON.stringify(pageContext, null, 2)}

Requirements:
1. Generate valid JSON-LD following schema.org specifications
2. Use all available data from the detected information
3. Add reasonable defaults for required fields if data is missing
4. Include @context and @type
5. Return ONLY the JSON object, no explanation

Schema Type: ${schemaType}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const schemaText = response.content[0].text.trim();

    // Extract JSON from response
    const jsonMatch = schemaText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate valid schema');
    }

    const schema = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!schema['@context']) schema['@context'] = 'https://schema.org';
    if (!schema['@type']) schema['@type'] = schemaType;

    return schema;
  }

  /**
   * Apply schema to a page
   */
  async applySchema(clientId, pageUrl, schemaType, schemaData, opportunityId = null) {
    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO schema_markup (
        client_id, page_url, schema_type, schema_data,
        status, applied_at, validation_status
      ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, 'pending')
    `);

    const result = stmt.run(
      clientId,
      pageUrl,
      schemaType,
      JSON.stringify(schemaData)
    );

    // Update opportunity if provided
    if (opportunityId) {
      this.db.prepare(`
        UPDATE schema_opportunities
        SET status = 'applied', applied_schema_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result.lastInsertRowid, opportunityId);
    }

    return {
      id: result.lastInsertRowid,
      schemaMarkup: schemaData,
      status: 'active'
    };
  }

  /**
   * Get schema opportunities for a client
   */
  getSchemaOpportunities(clientId, options = {}) {
    const { status = 'new', limit = 50, priority = null } = options;

    let query = `
      SELECT * FROM schema_opportunities
      WHERE client_id = ? AND status = ?
    `;
    const params = [clientId, status];

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY confidence_score DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const opportunities = this.db.prepare(query).all(...params);

    return opportunities.map(opp => ({
      ...opp,
      detected_data: JSON.parse(opp.detected_data)
    }));
  }

  /**
   * Get applied schema for a client
   */
  getAppliedSchema(clientId, pageUrl = null) {
    let query = `
      SELECT * FROM schema_markup
      WHERE client_id = ? AND status = 'active'
    `;
    const params = [clientId];

    if (pageUrl) {
      query += ' AND page_url = ?';
      params.push(pageUrl);
    }

    query += ' ORDER BY created_at DESC';

    const schemas = this.db.prepare(query).all(...params);

    return schemas.map(schema => ({
      ...schema,
      schema_data: JSON.parse(schema.schema_data)
    }));
  }

  /**
   * Remove schema markup
   */
  removeSchema(clientId, schemaId) {
    const result = this.db.prepare(`
      UPDATE schema_markup
      SET status = 'removed', removed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND client_id = ?
    `).run(schemaId, clientId);

    return result.changes > 0;
  }

  /**
   * Validate schema markup
   */
  async validateSchema(schema) {
    // Basic validation
    const errors = [];

    if (!schema['@context']) {
      errors.push('Missing @context');
    }

    if (!schema['@type']) {
      errors.push('Missing @type');
    }

    // Type-specific validation
    if (schema['@type'] === 'Article' && !schema.headline) {
      errors.push('Article schema requires headline');
    }

    if (schema['@type'] === 'Product' && !schema.name) {
      errors.push('Product schema requires name');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new SchemaEngine();
