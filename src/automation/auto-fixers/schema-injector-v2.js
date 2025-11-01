/**
 * Schema Injector v2 - With Manual Review Workflow
 *
 * Generates and injects structured data (schema.org) markup with review workflow:
 * - LocalBusiness schema for local businesses
 * - Article schema for blog posts
 * - Organization schema for company pages
 *
 * Features:
 * - Detect → Review → Apply workflow
 * - Rich descriptions for each schema addition
 * - Validation before proposal creation
 * - Verification instructions
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';

export class SchemaInjector extends AutoFixEngineBase {
  constructor(config) {
    super(config);
    this.wpClient = new WordPressClient(config.siteUrl, config.wpUser, config.wpPassword);
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'technical-seo';
  }

  /**
   * REQUIRED: Detect schema opportunities and return as proposals
   */
  async detectIssues(options = {}) {
    const proposals = [];

    console.log('   Scanning for schema opportunities...');

    // Check homepage for LocalBusiness schema
    const homepageProposal = await this.checkHomepageSchema();
    if (homepageProposal) proposals.push(homepageProposal);

    // Check blog posts for Article schema
    const articleProposals = await this.checkArticleSchema();
    proposals.push(...articleProposals);

    return proposals;
  }

  /**
   * Check homepage for LocalBusiness schema
   */
  async checkHomepageSchema() {
    try {
      const pages = await this.wpClient.getPages({ per_page: 100 });
      const homepage = pages.find(p => p.slug === 'home' || p.slug === '' || p.id === 1) || pages[0];

      if (!homepage) return null;

      const content = homepage.content.rendered;
      const existingSchema = this.extractSchema(content);

      // Check if LocalBusiness schema exists and is up-to-date
      const hasLocalBusiness = existingSchema.find(s =>
        s['@type'] === 'LocalBusiness' || s['@type']?.includes('Business')
      );

      if (hasLocalBusiness) {
        // Check if it needs updating
        const needsUpdate = this.schemaNeedsUpdate(hasLocalBusiness);

        if (!needsUpdate) {
          return null; // Schema is fine
        }

        // Schema needs updating
        const newSchema = this.generateLocalBusinessSchema();

        return {
          target_type: 'page',
          target_id: homepage.id,
          target_title: homepage.title.rendered,
          target_url: homepage.link,
          field_name: 'content',

          before_value: JSON.stringify(hasLocalBusiness, null, 2),
          after_value: JSON.stringify(newSchema, null, 2),

          issue_description: 'LocalBusiness schema exists but contains outdated information (phone, address, or business details)',
          fix_description: 'Update LocalBusiness schema with current business information',
          expected_benefit: 'Accurate schema helps Google display your business correctly in local search results, knowledge panels, and maps',

          severity: 'medium',
          risk_level: 'low',
          category: 'schema-markup',
          impact_score: 70,
          priority: 70,

          reversible: true,

          metadata: {
            fixType: 'schema_update',
            schemaType: 'LocalBusiness',
            existingSchemaId: homepage.id,
            verificationSteps: [
              'Test with Google Rich Results Test: https://search.google.com/test/rich-results',
              `View page source: ${homepage.link}`,
              'Look for <script type="application/ld+json"> in the <head>',
              'Verify business name, phone, and address are correct',
              'Check that schema validates with no errors'
            ],
            changeType: 'update-schema'
          }
        };
      } else {
        // No LocalBusiness schema - create new
        const newSchema = this.generateLocalBusinessSchema();

        return {
          target_type: 'page',
          target_id: homepage.id,
          target_title: homepage.title.rendered,
          target_url: homepage.link,
          field_name: 'content',

          before_value: 'No LocalBusiness schema present',
          after_value: JSON.stringify(newSchema, null, 2),

          issue_description: 'Homepage is missing LocalBusiness structured data - Google cannot display rich snippets',
          fix_description: 'Add LocalBusiness schema.org JSON-LD markup to homepage',
          expected_benefit: 'Enables rich snippets in search results: star ratings, business hours, location map, contact info. Improves local SEO rankings significantly.',

          severity: 'high',
          risk_level: 'low',
          category: 'schema-markup',
          impact_score: 85,
          priority: 85,

          reversible: true,

          metadata: {
            fixType: 'schema_add',
            schemaType: 'LocalBusiness',
            verificationSteps: [
              'Test with Google Rich Results Test: https://search.google.com/test/rich-results',
              `Visit homepage: ${homepage.link}`,
              'View page source (right-click → View Source)',
              'Search for "application/ld+json" to find the schema',
              'Verify all business details are accurate',
              'Confirm no validation errors in Rich Results Test',
              'Wait 1-2 weeks and check Google Search for rich snippets'
            ],
            changeType: 'add-schema'
          }
        };
      }
    } catch (error) {
      console.error('Error checking homepage schema:', error.message);
      return null;
    }
  }

  /**
   * Check blog posts for Article schema
   */
  async checkArticleSchema() {
    const proposals = [];

    try {
      const posts = await this.wpClient.getPosts({ per_page: 10 }); // Limit to avoid too many proposals

      for (const post of posts) {
        const content = post.content.rendered;
        const existingSchema = this.extractSchema(content);

        const hasArticle = existingSchema.find(s =>
          s['@type'] === 'Article' || s['@type'] === 'BlogPosting'
        );

        if (!hasArticle) {
          // Missing Article schema
          const newSchema = this.generateArticleSchema(post);

          proposals.push({
            target_type: 'post',
            target_id: post.id,
            target_title: post.title.rendered,
            target_url: post.link,
            field_name: 'content',

            before_value: 'No Article schema present',
            after_value: JSON.stringify(newSchema, null, 2),

            issue_description: `Blog post "${post.title.rendered}" is missing Article structured data`,
            fix_description: 'Add Article schema.org JSON-LD markup',
            expected_benefit: 'Helps Google understand article content, may show in News results, enables rich snippets with author, publish date, and featured image',

            severity: 'medium',
            risk_level: 'low',
            category: 'schema-markup',
            impact_score: 60,
            priority: 60,

            reversible: true,

            metadata: {
              fixType: 'schema_add',
              schemaType: 'Article',
              postId: post.id,
              verificationSteps: [
                'Test with Google Rich Results Test: https://search.google.com/test/rich-results',
                `Visit post: ${post.link}`,
                'View page source and find <script type="application/ld+json">',
                'Verify author, datePublished, and headline are correct',
                'Check that featured image URL works',
                'Confirm no validation errors'
              ],
              changeType: 'add-schema'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking article schema:', error.message);
    }

    return proposals;
  }

  /**
   * REQUIRED: Apply a single fix from an approved proposal
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, metadata } = proposal;
    const newSchema = JSON.parse(proposal.after_value);

    // Get current content
    const content = target_type === 'post'
      ? await this.wpClient.getPost(target_id)
      : await this.wpClient.getPage(target_id);

    let updatedContent = content.content.rendered;

    if (metadata.fixType === 'schema_update') {
      // Update existing schema
      const existingSchema = this.extractSchema(updatedContent);
      const toUpdate = existingSchema.find(s =>
        s['@type'] === metadata.schemaType || s['@type']?.includes('Business')
      );

      if (toUpdate) {
        const oldSchemaStr = `<script type="application/ld+json">${JSON.stringify(toUpdate)}</script>`;
        const newSchemaStr = this.wrapSchema(newSchema);
        updatedContent = updatedContent.replace(oldSchemaStr, newSchemaStr);
      }
    } else if (metadata.fixType === 'schema_add') {
      // Add new schema to beginning of content
      const schemaScript = this.wrapSchema(newSchema);
      updatedContent = schemaScript + '\n\n' + updatedContent;
    }

    // Update WordPress
    const endpoint = target_type === 'post' ? 'updatePost' : 'updatePage';
    const updated = await this.wpClient[endpoint](target_id, {
      content: updatedContent
    });

    return {
      success: true,
      contentId: target_id,
      schemaType: metadata.schemaType,
      fixType: metadata.fixType,
      timestamp: new Date().toISOString(),
      url: updated.link
    };
  }

  /**
   * Generate LocalBusiness schema from config
   */
  generateLocalBusinessSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': this.config.businessName,
      'image': `${this.config.siteUrl}/wp-content/uploads/logo.png`,
      'telephone': this.config.phone,
      'email': this.config.email,
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': this.config.address || '',
        'addressLocality': this.config.city,
        'addressRegion': this.config.state,
        'addressCountry': this.config.country
      },
      'url': this.config.siteUrl,
      'priceRange': '$$'
    };
  }

  /**
   * Generate Article schema for blog post
   */
  generateArticleSchema(post) {
    const featuredImage = post.featured_media
      ? `${this.config.siteUrl}/wp-content/uploads/featured.jpg`
      : `${this.config.siteUrl}/wp-content/uploads/default.jpg`;

    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': post.title.rendered,
      'description': post.excerpt.rendered.replace(/<[^>]+>/g, '').slice(0, 200),
      'image': featuredImage,
      'datePublished': post.date,
      'dateModified': post.modified,
      'author': {
        '@type': 'Person',
        'name': 'Admin' // Could be enhanced with real author data
      },
      'publisher': {
        '@type': 'Organization',
        'name': this.config.businessName,
        'logo': {
          '@type': 'ImageObject',
          'url': `${this.config.siteUrl}/wp-content/uploads/logo.png`
        }
      }
    };
  }

  /**
   * Extract existing schema from content
   */
  extractSchema(content) {
    const schemas = [];
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    const matches = [...content.matchAll(jsonLdRegex)];

    for (const match of matches) {
      try {
        const jsonContent = match[1].trim();
        const schema = JSON.parse(jsonContent);
        schemas.push(schema);
      } catch (e) {
        // Invalid JSON, skip
      }
    }

    return schemas;
  }

  /**
   * Check if schema needs updating
   */
  schemaNeedsUpdate(existingSchema) {
    const checks = [
      existingSchema.name !== this.config.businessName,
      existingSchema.telephone !== this.config.phone,
      existingSchema.email !== this.config.email,
      existingSchema.address?.addressLocality !== this.config.city,
      existingSchema.address?.addressRegion !== this.config.state
    ];

    return checks.some(check => check);
  }

  /**
   * Wrap schema in script tag
   */
  wrapSchema(schema) {
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  }
}

export default SchemaInjector;
