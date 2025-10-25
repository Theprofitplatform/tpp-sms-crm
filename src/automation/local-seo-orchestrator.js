/**
 * LOCAL SEO ORCHESTRATOR
 *
 * Coordinates all Local SEO automation tasks:
 * - NAP consistency checks
 * - Local business schema deployment
 * - Directory submission tracking
 * - Review request automation
 * - Local citation monitoring
 *
 * @module local-seo-orchestrator
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';

/**
 * NAP Consistency Checker
 */
class NAPChecker {
  constructor(clientConfig) {
    this.config = clientConfig;
    this.results = {
      score: 0,
      issues: [],
      warnings: [],
      findings: []
    };
  }

  /**
   * Check NAP consistency across multiple pages
   */
  async checkConsistency(pages = null) {
    const pagesToCheck = pages || this.getDefaultPages();

    console.log(`\n🔍 Checking NAP consistency across ${pagesToCheck.length} pages...`);

    const findings = [];

    for (const url of pagesToCheck) {
      try {
        const html = await this.fetchPage(url);
        const napData = this.extractNAP(html, url);
        findings.push(napData);
      } catch (error) {
        console.log(`   ⚠️  Failed to fetch ${url}: ${error.message}`);
      }
    }

    this.results.findings = findings;
    this.analyzeConsistency(findings);

    return this.results;
  }

  /**
   * Get default pages to check
   */
  getDefaultPages() {
    const baseUrl = this.config.siteUrl;
    return [
      baseUrl,
      `${baseUrl}/contact`,
      `${baseUrl}/about`,
      `${baseUrl}/contact-us`
    ];
  }

  /**
   * Fetch page content
   */
  async fetchPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  /**
   * Extract NAP information from HTML
   */
  extractNAP(html, url) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const bodyText = document.body.textContent || '';

    const found = {
      url,
      businessName: [],
      phones: [],
      emails: [],
      addresses: [],
      schemas: []
    };

    // Extract business name
    if (this.config.businessName) {
      const nameRegex = new RegExp(this.config.businessName, 'gi');
      const nameMatches = bodyText.match(nameRegex);
      if (nameMatches) {
        found.businessName = [...new Set(nameMatches)];
      }
    }

    // Extract phone numbers (Australian format)
    const phoneRegex = /(\+?61[\s-]?)?(\(0?[2-8]\)|0?[2-8])[\s-]?\d{4}[\s-]?\d{4}/g;
    const phoneMatches = bodyText.match(phoneRegex);
    if (phoneMatches) {
      found.phones = [...new Set(phoneMatches.map(p => p.trim()))];
    }

    // Extract emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emailMatches = bodyText.match(emailRegex);
    if (emailMatches) {
      const businessEmails = emailMatches.filter(email => {
        const domain = this.config.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return email.toLowerCase().includes(domain.toLowerCase());
      });
      found.emails = [...new Set(businessEmails)];
    }

    // Extract addresses (Australian cities/suburbs)
    const cityRegex = new RegExp(`${this.config.city || 'Sydney'}\\s*,?\\s*${this.config.state || 'NSW'}\\s*\\d{4}`, 'gi');
    const addressMatches = bodyText.match(cityRegex);
    if (addressMatches) {
      found.addresses = [...new Set(addressMatches)];
    }

    // Extract schema markup
    const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
    schemaScripts.forEach(script => {
      try {
        const schema = JSON.parse(script.textContent);
        if (schema.address || schema.telephone) {
          found.schemas.push({
            type: schema['@type'],
            name: schema.name,
            address: schema.address,
            telephone: schema.telephone,
            email: schema.email
          });
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    return found;
  }

  /**
   * Analyze consistency across findings
   */
  analyzeConsistency(findings) {
    const allPhones = new Set();
    const allEmails = new Set();

    findings.forEach(result => {
      result.phones.forEach(phone => allPhones.add(phone));
      result.emails.forEach(email => allEmails.add(email));
    });

    // Check phone consistency
    if (allPhones.size > 1) {
      this.results.issues.push({
        type: 'PHONE_INCONSISTENCY',
        severity: 'HIGH',
        message: `Found ${allPhones.size} different phone number formats`,
        details: Array.from(allPhones)
      });
    }

    // Check email consistency
    if (allEmails.size > 1) {
      this.results.warnings.push({
        type: 'EMAIL_INCONSISTENCY',
        severity: 'MEDIUM',
        message: `Found ${allEmails.size} different email addresses`,
        details: Array.from(allEmails)
      });
    }

    // Check schema consistency
    const schemasWithPhone = [];
    findings.forEach(result => {
      if (result.schemas) {
        result.schemas.forEach(schema => {
          if (schema.telephone) {
            schemasWithPhone.push({
              url: result.url,
              type: schema.type,
              phone: schema.telephone
            });
          }
        });
      }
    });

    if (schemasWithPhone.length > 0) {
      const schemaPhones = new Set(schemasWithPhone.map(s => s.phone));
      if (schemaPhones.size > 1) {
        this.results.issues.push({
          type: 'SCHEMA_PHONE_INCONSISTENCY',
          severity: 'HIGH',
          message: 'Schema markup has inconsistent phone numbers',
          details: schemasWithPhone
        });
      }
    }

    // Calculate score
    this.results.score = this.calculateScore();
  }

  /**
   * Calculate NAP consistency score
   */
  calculateScore() {
    let score = 100;

    this.results.issues.forEach(issue => {
      score -= issue.severity === 'HIGH' ? 20 : 10;
    });

    this.results.warnings.forEach(warning => {
      score -= 5;
    });

    return Math.max(0, score);
  }
}

/**
 * Local Business Schema Manager
 */
class LocalSchemaManager {
  constructor(clientConfig) {
    this.config = clientConfig;
  }

  /**
   * Generate local business schema markup
   */
  generateSchema() {
    const schema = {
      "@context": "https://schema.org",
      "@type": this.config.businessType || "LocalBusiness",
      "name": this.config.businessName,
      "image": this.config.logoUrl || `${this.config.siteUrl}/wp-content/uploads/logo.png`,
      "description": this.config.businessDescription,
      "url": this.config.siteUrl
    };

    // Add address if available
    if (this.config.address) {
      schema.address = {
        "@type": "PostalAddress",
        "streetAddress": this.config.address.street,
        "addressLocality": this.config.address.city || this.config.city,
        "addressRegion": this.config.address.state || this.config.state,
        "postalCode": this.config.address.postcode,
        "addressCountry": this.config.address.country || "AU"
      };
    }

    // Add coordinates if available
    if (this.config.geo) {
      schema.geo = {
        "@type": "GeoCoordinates",
        "latitude": this.config.geo.latitude,
        "longitude": this.config.geo.longitude
      };
    }

    // Add contact info
    if (this.config.phone) {
      schema.telephone = this.config.phone;
    }

    if (this.config.email) {
      schema.email = this.config.email;
    }

    // Add opening hours if available
    if (this.config.openingHours) {
      schema.openingHoursSpecification = this.config.openingHours;
    }

    // Add service area
    if (this.config.serviceArea) {
      schema.areaServed = this.config.serviceArea;
    }

    // Add social profiles
    if (this.config.socialProfiles) {
      schema.sameAs = this.config.socialProfiles;
    }

    return schema;
  }

  /**
   * Check if schema already exists on a page
   */
  async hasSchema(url) {
    try {
      const response = await axios.get(url);
      const html = response.data;
      return html.includes('"@type": "LocalBusiness"') ||
             html.includes('"@type": "AutomotiveBusiness"') ||
             html.includes(`"name": "${this.config.businessName}"`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate schema markup HTML
   */
  generateSchemaMarkup() {
    const schema = this.generateSchema();
    return `
<!-- Local Business Schema Markup - Added by SEO Automation -->
<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>
<!-- End Local Business Schema -->
`;
  }
}

/**
 * Directory Submission Tracker
 */
class DirectoryTracker {
  constructor(clientConfig) {
    this.config = clientConfig;
    this.directories = this.getDirectoryList();
  }

  /**
   * Get relevant directory list based on business type and location
   */
  getDirectoryList() {
    const baseDirectories = [
      {
        tier: 1,
        name: "Google Business Profile",
        url: "https://business.google.com",
        priority: "CRITICAL",
        category: "search-engine"
      },
      {
        tier: 1,
        name: "Bing Places",
        url: "https://www.bingplaces.com",
        priority: "HIGH",
        category: "search-engine"
      },
      {
        tier: 1,
        name: "Apple Maps",
        url: "https://register.apple.com/business",
        priority: "HIGH",
        category: "search-engine"
      },
      {
        tier: 1,
        name: "Facebook Business",
        url: "https://www.facebook.com/business/pages",
        priority: "HIGH",
        category: "social"
      }
    ];

    // Add Australian directories if client is in Australia
    if (this.config.country === 'AU') {
      baseDirectories.push(
        {
          tier: 1,
          name: "True Local",
          url: "https://www.truelocal.com.au",
          priority: "HIGH",
          category: "au-directory"
        },
        {
          tier: 1,
          name: "Yellow Pages Australia",
          url: "https://www.yellowpages.com.au",
          priority: "HIGH",
          category: "au-directory"
        },
        {
          tier: 2,
          name: "Start Local",
          url: "https://www.startlocal.com.au",
          priority: "MEDIUM",
          category: "au-directory"
        },
        {
          tier: 2,
          name: "Local Search (Sensis)",
          url: "https://www.localsearch.com.au",
          priority: "MEDIUM",
          category: "au-directory"
        }
      );
    }

    return baseDirectories;
  }

  /**
   * Generate directory submission report
   */
  generateReport() {
    const tier1 = this.directories.filter(d => d.tier === 1);
    const tier2 = this.directories.filter(d => d.tier === 2);

    return {
      totalDirectories: this.directories.length,
      tier1Count: tier1.length,
      tier2Count: tier2.length,
      criticalDirectories: tier1.filter(d => d.priority === 'CRITICAL'),
      recommendedDirectories: [...tier1, ...tier2]
    };
  }

  /**
   * Generate CSV tracker for client
   */
  async generateCSVTracker(outputPath) {
    const headers = [
      'Tier',
      'Priority',
      'Directory Name',
      'URL',
      'Category',
      'Status',
      'Date Submitted',
      'Listing URL',
      'Notes'
    ];

    const rows = this.directories.map(dir => [
      dir.tier,
      dir.priority,
      dir.name,
      dir.url,
      dir.category,
      'Pending',
      '',
      '',
      ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    await fs.writeFile(outputPath, csvContent);
    return outputPath;
  }
}

/**
 * Review Request Generator
 */
class ReviewRequestGenerator {
  constructor(clientConfig) {
    this.config = clientConfig;
  }

  /**
   * Generate review request email template
   */
  generateEmailTemplate(customerName = '[Customer Name]', personalNote = '') {
    const template = {
      subject: `Thanks for choosing ${this.config.businessName}!`,
      body: `Hi ${customerName},

Thank you for choosing ${this.config.businessName}! We hope you had a great experience with our service.

${personalNote}

Would you mind taking 2 minutes to share your experience on Google? Your feedback helps other ${this.config.city} residents know what to expect when working with us.

👉 Click here to leave a review: ${this.config.reviewLink || '[GOOGLE_REVIEW_LINK_NEEDED]'}

We really appreciate your time!

Best regards,
${this.config.businessOwner || 'The Team'}
${this.config.businessName}
${this.config.phone || ''}`
    };

    return template;
  }

  /**
   * Generate multiple review request templates
   */
  generateTemplates() {
    return {
      recent: this.generateEmailTemplate('[Customer Name]', 'Thanks for your recent business!'),
      followUp: this.generateEmailTemplate('[Customer Name]', 'I wanted to follow up and see how everything went.'),
      vip: this.generateEmailTemplate('[Customer Name]', 'As one of our valued customers, your feedback means a lot to us.')
    };
  }

  /**
   * Check review status
   */
  async checkReviewCount() {
    // This would integrate with Google Business Profile API
    // For now, return a placeholder
    return {
      totalReviews: null,
      averageRating: null,
      recentReviews: null,
      needsApiSetup: true
    };
  }
}

/**
 * Main Local SEO Orchestrator
 */
export class LocalSEOOrchestrator {
  constructor(clientConfig) {
    this.config = clientConfig;
    this.napChecker = new NAPChecker(clientConfig);
    this.schemaManager = new LocalSchemaManager(clientConfig);
    this.directoryTracker = new DirectoryTracker(clientConfig);
    this.reviewGenerator = new ReviewRequestGenerator(clientConfig);
    this.results = {};
  }

  /**
   * Run complete Local SEO audit and automation
   */
  async runCompleteAudit() {
    console.log(`\n🏪 LOCAL SEO AUTOMATION - ${this.config.businessName}`);
    console.log('='.repeat(70));

    const results = {
      client: this.config.id,
      timestamp: new Date().toISOString(),
      tasks: {}
    };

    try {
      // 1. NAP Consistency Check
      console.log('\n📍 Task 1: NAP Consistency Check');
      results.tasks.napConsistency = await this.napChecker.checkConsistency();
      console.log(`   ✓ NAP Score: ${results.tasks.napConsistency.score}/100`);

      // 2. Schema Audit
      console.log('\n🏷️  Task 2: Local Business Schema Audit');
      const hasSchema = await this.schemaManager.hasSchema(this.config.siteUrl);
      results.tasks.schema = {
        hasSchema,
        schemaGenerated: this.schemaManager.generateSchemaMarkup()
      };
      console.log(`   ${hasSchema ? '✓' : '⚠️ '} Schema ${hasSchema ? 'found' : 'missing'}`);

      // 3. Directory Tracking
      console.log('\n📂 Task 3: Directory Submission Tracking');
      results.tasks.directories = this.directoryTracker.generateReport();
      console.log(`   ✓ ${results.tasks.directories.totalDirectories} directories identified`);
      console.log(`   → ${results.tasks.directories.tier1Count} Tier 1 (high priority)`);

      // 4. Review Status
      console.log('\n⭐ Task 4: Review Request Preparation');
      results.tasks.reviews = {
        templates: this.reviewGenerator.generateTemplates(),
        status: await this.reviewGenerator.checkReviewCount()
      };
      console.log('   ✓ Review request templates generated');

      // Summary
      console.log('\n📊 LOCAL SEO AUDIT SUMMARY');
      console.log('='.repeat(70));
      console.log(`   NAP Consistency: ${this.getNAPGrade(results.tasks.napConsistency.score)}`);
      console.log(`   Schema Markup: ${hasSchema ? '✅ Present' : '⚠️  Missing'}`);
      console.log(`   High Priority Directories: ${results.tasks.directories.tier1Count}`);
      console.log(`   Review Templates: ✅ Ready`);

      this.results = results;
      return results;

    } catch (error) {
      console.error(`\n❌ Error during Local SEO audit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get NAP grade based on score
   */
  getNAPGrade(score) {
    if (score >= 95) return '✅ Excellent (A+)';
    if (score >= 85) return '✅ Good (A)';
    if (score >= 75) return '⚠️  Fair (B)';
    if (score >= 60) return '⚠️  Needs Improvement (C)';
    return '❌ Critical Issues (F)';
  }

  /**
   * Generate complete local SEO report
   */
  async generateReport(outputDir) {
    const reportPath = path.join(outputDir, `local-seo-report-${this.config.id}.json`);
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    // Also generate CSV tracker
    const csvPath = path.join(outputDir, `directory-tracker-${this.config.id}.csv`);
    await this.directoryTracker.generateCSVTracker(csvPath);

    console.log(`\n📄 Reports Generated:`);
    console.log(`   → ${reportPath}`);
    console.log(`   → ${csvPath}`);

    return {
      reportPath,
      csvPath
    };
  }

  /**
   * Get actionable recommendations
   */
  getRecommendations() {
    const recommendations = [];

    // NAP issues
    if (this.results.tasks?.napConsistency?.score < 85) {
      recommendations.push({
        priority: 'HIGH',
        category: 'NAP Consistency',
        action: 'Fix phone number inconsistencies across website',
        impact: 'Improves local search rankings and user trust'
      });
    }

    // Schema missing
    if (!this.results.tasks?.schema?.hasSchema) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Schema Markup',
        action: 'Add LocalBusiness schema to homepage',
        impact: 'Enables rich snippets in Google search results'
      });
    }

    // Directory submissions
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Directory Listings',
      action: `Submit to ${this.results.tasks?.directories?.tier1Count} high-priority directories`,
      impact: 'Increases local citations and online visibility'
    });

    // Reviews
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Reviews',
      action: 'Start requesting customer reviews using generated templates',
      impact: 'Improves local rankings and conversion rates'
    });

    return recommendations;
  }
}

export default LocalSEOOrchestrator;
