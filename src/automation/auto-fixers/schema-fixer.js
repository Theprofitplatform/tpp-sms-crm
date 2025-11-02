/**
 * Schema Markup Fixer - Phase 4B AutoFix Engine
 *
 * Automatically fixes pixel-detected schema markup issues:
 * - Missing schema markup
 * - Missing LocalBusiness schema
 * - Missing Product schema
 * - Missing Article schema
 *
 * Integrates with existing Schema Automation service
 * Date: November 2, 2025
 */

class SchemaFixer {
  constructor(options = {}) {
    this.options = {
      defaultType: options.defaultType || 'LocalBusiness',
      includeOpeningHours: options.includeOpeningHours !== false,
      includeGeo: options.includeGeo !== false,
      ...options
    };
  }

  /**
   * Main entry point - fix a pixel issue
   *
   * @param {Object} issue - Pixel issue object
   * @param {Object} clientData - Client business data
   * @returns {Object} Fix result with code and instructions
   */
  async fixIssue(issue, clientData = {}) {
    try {
      const issueType = issue.issue_type || issue.type;

      if (!['missing_schema', 'missing_local_business_schema', 'missing_product_schema', 'missing_article_schema'].includes(issueType)) {
        return {
          success: false,
          error: `Unsupported issue type: ${issueType}`,
          supported: false
        };
      }

      // Determine schema type from issue
      const schemaType = this.getSchemaTypeFromIssue(issue);

      return await this.generateSchemaMarkup(schemaType, clientData, issue);
    } catch (error) {
      console.error(`[SchemaFixer] Error fixing issue:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Determine schema type from issue
   */
  getSchemaTypeFromIssue(issue) {
    const issueType = issue.issue_type || issue.type;

    if (issueType.includes('product')) return 'Product';
    if (issueType.includes('article')) return 'Article';
    if (issueType.includes('local_business') || issueType.includes('business')) return 'LocalBusiness';

    return this.options.defaultType;
  }

  /**
   * Generate schema markup
   */
  async generateSchemaMarkup(schemaType, clientData, issue) {
    let schema;

    switch (schemaType) {
      case 'LocalBusiness':
        schema = this.generateLocalBusinessSchema(clientData);
        break;

      case 'Product':
        schema = this.generateProductSchema(clientData, issue);
        break;

      case 'Article':
        schema = this.generateArticleSchema(clientData, issue);
        break;

      default:
        schema = this.generateGenericSchema(schemaType, clientData);
    }

    // Generate fix code
    const fixCode = `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;

    return {
      success: true,
      action: 'add_schema',
      schemaType,
      schema,
      fixCode,
      instructions: [
        `Add this ${schemaType} schema markup to your page`,
        'Place it in the <head> or at the bottom of <body>',
        'Update the placeholder values with your actual data',
        'Validate with Google Rich Results Test'
      ],
      location: '<head> or bottom of <body>',
      priority: 'high',
      estimatedTime: 15,
      validationUrl: 'https://search.google.com/test/rich-results'
    };
  }

  /**
   * Generate LocalBusiness schema
   */
  generateLocalBusinessSchema(clientData) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": clientData.name || "[Business Name]",
      "description": clientData.description || "[Business Description]",
      "url": clientData.website || clientData.url || "[Website URL]",
      "telephone": clientData.phone || clientData.telephone || "[Phone Number]",
      "email": clientData.email || "[Email Address]"
    };

    // Add address if available
    if (clientData.address || (clientData.street && clientData.city)) {
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": clientData.street || clientData.address || "[Street Address]",
        "addressLocality": clientData.city || "[City]",
        "addressRegion": clientData.state || clientData.region || "[State/Region]",
        "postalCode": clientData.zip || clientData.postalCode || "[Postal Code]",
        "addressCountry": clientData.country || "US"
      };
    }

    // Add geo if available
    if (this.options.includeGeo && (clientData.latitude || clientData.lat)) {
      schema.geo = {
        "@type": "GeoCoordinates",
        "latitude": clientData.latitude || clientData.lat || "[Latitude]",
        "longitude": clientData.longitude || clientData.lng || clientData.lon || "[Longitude]"
      };
    }

    // Add opening hours if available
    if (this.options.includeOpeningHours && clientData.hours) {
      schema.openingHours = clientData.hours;
    }

    // Add image if available
    if (clientData.image || clientData.logo) {
      schema.image = clientData.image || clientData.logo;
    }

    return schema;
  }

  /**
   * Generate Product schema
   */
  generateProductSchema(clientData, issue) {
    const pageUrl = issue.page_url || issue.url || clientData.url;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": clientData.productName || "[Product Name]",
      "description": clientData.productDescription || "[Product Description]",
      "image": clientData.productImage || "[Product Image URL]",
      "url": pageUrl
    };

    // Add brand if available
    if (clientData.brand || clientData.name) {
      schema.brand = {
        "@type": "Brand",
        "name": clientData.brand || clientData.name
      };
    }

    // Add offers if price available
    if (clientData.price) {
      schema.offers = {
        "@type": "Offer",
        "price": clientData.price,
        "priceCurrency": clientData.currency || "USD",
        "availability": "https://schema.org/InStock",
        "url": pageUrl
      };
    } else {
      schema.offers = {
        "@type": "Offer",
        "price": "[Price]",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      };
    }

    // Add SKU/identifier if available
    if (clientData.sku) {
      schema.sku = clientData.sku;
    }

    if (clientData.mpn) {
      schema.mpn = clientData.mpn;
    }

    return schema;
  }

  /**
   * Generate Article schema
   */
  generateArticleSchema(clientData, issue) {
    const pageUrl = issue.page_url || issue.url;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": clientData.title || "[Article Title]",
      "description": clientData.description || "[Article Description]",
      "url": pageUrl,
      "datePublished": clientData.publishDate || new Date().toISOString(),
      "dateModified": clientData.modifiedDate || new Date().toISOString()
    };

    // Add author
    schema.author = {
      "@type": "Person",
      "name": clientData.author || "[Author Name]"
    };

    // Add publisher
    if (clientData.publisher || clientData.name) {
      schema.publisher = {
        "@type": "Organization",
        "name": clientData.publisher || clientData.name || "[Publisher Name]",
        "logo": {
          "@type": "ImageObject",
          "url": clientData.logo || "[Logo URL]"
        }
      };
    }

    // Add image if available
    if (clientData.image) {
      schema.image = clientData.image;
    }

    return schema;
  }

  /**
   * Generate generic schema
   */
  generateGenericSchema(schemaType, clientData) {
    return {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": clientData.name || "[Name]",
      "description": clientData.description || "[Description]",
      "url": clientData.url || "[URL]"
    };
  }

  /**
   * Get capabilities - what issue types this fixer supports
   */
  static getCapabilities() {
    return {
      name: 'Schema Markup Fixer',
      version: '1.0.0',
      supportedIssueTypes: [
        'missing_schema',
        'missing_local_business_schema',
        'missing_product_schema',
        'missing_article_schema'
      ],
      supportedSchemaTypes: [
        'LocalBusiness',
        'Product',
        'Article',
        'Organization',
        'Person'
      ],
      estimatedTimePerFix: 15, // minutes
      automationLevel: 'medium', // requires client data
      requiresReview: true // should verify with real data
    };
  }
}

export default SchemaFixer;
