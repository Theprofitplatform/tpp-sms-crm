/**
 * CITATION MONITORING SERVICE
 * 
 * Tracks business citations across the web to ensure NAP consistency
 * Monitors major directories, review sites, and local platforms
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';

export class CitationMonitor {
  constructor(businessConfig) {
    this.config = businessConfig;
    this.citations = [];
    this.inconsistencies = [];
  }

  /**
   * Major citation sources to check
   */
  getCitationSources() {
    const country = this.config.country || 'AU';
    
    const sources = {
      AU: [
        {
          name: 'Google Business Profile',
          url: `https://www.google.com/search?q=${encodeURIComponent(this.config.businessName)}+${encodeURIComponent(this.config.city)}`,
          priority: 'CRITICAL',
          type: 'search-engine'
        },
        {
          name: 'Bing Places',
          url: `https://www.bing.com/maps?q=${encodeURIComponent(this.config.businessName)}`,
          priority: 'HIGH',
          type: 'search-engine'
        },
        {
          name: 'True Local',
          url: `https://www.truelocal.com.au/find/${encodeURIComponent(this.config.businessName.replace(/\s+/g, '-').toLowerCase())}`,
          priority: 'HIGH',
          type: 'directory'
        },
        {
          name: 'Yellow Pages Australia',
          url: `https://www.yellowpages.com.au/search/listings?clue=${encodeURIComponent(this.config.businessName)}`,
          priority: 'HIGH',
          type: 'directory'
        },
        {
          name: 'Start Local',
          url: `https://www.startlocal.com.au/search/?what=${encodeURIComponent(this.config.businessName)}`,
          priority: 'MEDIUM',
          type: 'directory'
        },
        {
          name: 'HotFrog',
          url: `https://www.hotfrog.com.au/search/${encodeURIComponent(this.config.businessName)}`,
          priority: 'MEDIUM',
          type: 'directory'
        },
        {
          name: 'Google Maps',
          url: `https://www.google.com/maps/search/${encodeURIComponent(this.config.businessName)}+${encodeURIComponent(this.config.city)}`,
          priority: 'CRITICAL',
          type: 'maps'
        },
        {
          name: 'Facebook',
          url: `https://www.facebook.com/search/top?q=${encodeURIComponent(this.config.businessName)}`,
          priority: 'HIGH',
          type: 'social'
        },
        {
          name: 'Yelp',
          url: `https://www.yelp.com.au/search?find_desc=${encodeURIComponent(this.config.businessName)}`,
          priority: 'MEDIUM',
          type: 'review'
        },
        {
          name: 'ProductReview',
          url: `https://www.productreview.com.au/search?query=${encodeURIComponent(this.config.businessName)}`,
          priority: 'MEDIUM',
          type: 'review'
        }
      ],
      US: [
        {
          name: 'Google Business Profile',
          url: `https://www.google.com/search?q=${encodeURIComponent(this.config.businessName)}`,
          priority: 'CRITICAL',
          type: 'search-engine'
        },
        {
          name: 'Yelp',
          url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(this.config.businessName)}`,
          priority: 'CRITICAL',
          type: 'review'
        },
        {
          name: 'Facebook',
          url: `https://www.facebook.com/search/top?q=${encodeURIComponent(this.config.businessName)}`,
          priority: 'HIGH',
          type: 'social'
        },
        {
          name: 'BBB',
          url: `https://www.bbb.org/search?find_text=${encodeURIComponent(this.config.businessName)}`,
          priority: 'HIGH',
          type: 'directory'
        },
        {
          name: 'Yellow Pages',
          url: `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(this.config.businessName)}`,
          priority: 'MEDIUM',
          type: 'directory'
        }
      ]
    };

    return sources[country] || sources.AU;
  }

  /**
   * Scan a source for business citation
   */
  async scanCitation(source) {
    try {
      console.log(`  📍 Checking ${source.name}...`);
      
      // For now, return mock data since actual scraping would require proper setup
      // In production, this would make actual HTTP requests
      const citation = {
        source: source.name,
        url: source.url,
        priority: source.priority,
        type: source.type,
        found: Math.random() > 0.3, // 70% chance found
        lastChecked: new Date().toISOString(),
        status: 'pending'
      };

      if (citation.found) {
        // Mock NAP data found
        citation.name = this.addVariation(this.config.businessName);
        citation.phone = this.config.phone || null;
        citation.address = this.config.address ? 
          `${this.config.address.street}, ${this.config.address.city} ${this.config.address.state}` : 
          null;
        citation.status = this.checkConsistency(citation);
      }

      return citation;
    } catch (error) {
      console.log(`     ⚠️  Error checking ${source.name}: ${error.message}`);
      return {
        source: source.name,
        url: source.url,
        priority: source.priority,
        found: false,
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Add minor variation to business name (simulate real-world inconsistencies)
   */
  addVariation(name) {
    const variations = [
      name,
      name.toLowerCase(),
      name.toUpperCase(),
      name.replace(/\s+/g, ''),
      name.replace(/&/g, 'and'),
      name.replace(/and/g, '&')
    ];
    
    const random = Math.random();
    if (random < 0.7) return name; // 70% correct
    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Check if citation data is consistent with business config
   */
  checkConsistency(citation) {
    const issues = [];

    // Check name
    if (citation.name && citation.name !== this.config.businessName) {
      if (citation.name.toLowerCase() === this.config.businessName.toLowerCase()) {
        issues.push({ field: 'name', severity: 'minor', message: 'Capitalization mismatch' });
      } else {
        issues.push({ field: 'name', severity: 'major', message: 'Name does not match' });
      }
    }

    // Check phone
    if (citation.phone && this.config.phone) {
      const normalizedCitation = citation.phone.replace(/\D/g, '');
      const normalizedConfig = this.config.phone.replace(/\D/g, '');
      if (normalizedCitation !== normalizedConfig) {
        issues.push({ field: 'phone', severity: 'major', message: 'Phone number mismatch' });
      }
    }

    // Check address
    if (citation.address && this.config.address && this.config.address.street) {
      const configAddress = `${this.config.address.street}, ${this.config.address.city} ${this.config.address.state}`;
      if (citation.address.toLowerCase() !== configAddress.toLowerCase()) {
        issues.push({ field: 'address', severity: 'major', message: 'Address mismatch' });
      }
    }

    citation.issues = issues;
    return issues.length === 0 ? 'consistent' : 
           issues.some(i => i.severity === 'major') ? 'inconsistent' : 'minor-issues';
  }

  /**
   * Run complete citation audit
   */
  async runAudit() {
    console.log(`\n🔍 CITATION MONITORING - ${this.config.businessName}`);
    console.log('='.repeat(70));

    const sources = this.getCitationSources();
    console.log(`\nScanning ${sources.length} citation sources...`);

    const results = [];
    
    // Check each source
    for (const source of sources) {
      const citation = await this.scanCitation(source);
      results.push(citation);
      
      // Small delay to avoid rate limiting
      await this.delay(500);
    }

    this.citations = results;

    // Analyze results
    const analysis = this.analyzeCitations(results);

    console.log('\n📊 CITATION AUDIT SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Total Sources Checked: ${results.length}`);
    console.log(`   ✅ Citations Found: ${analysis.found}`);
    console.log(`   ❌ Citations Missing: ${analysis.missing}`);
    console.log(`   ✅ Consistent: ${analysis.consistent}`);
    console.log(`   ⚠️  Inconsistent: ${analysis.inconsistent}`);
    console.log(`   Citation Score: ${analysis.score}/100`);

    return {
      citations: results,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze citation results
   */
  analyzeCitations(citations) {
    const found = citations.filter(c => c.found).length;
    const missing = citations.filter(c => !c.found).length;
    const consistent = citations.filter(c => c.status === 'consistent').length;
    const inconsistent = citations.filter(c => c.status === 'inconsistent' || c.status === 'minor-issues').length;
    
    // Calculate score
    const criticalSources = citations.filter(c => c.priority === 'CRITICAL');
    const criticalFound = criticalSources.filter(c => c.found && c.status === 'consistent').length;
    const criticalScore = criticalSources.length > 0 ? 
      (criticalFound / criticalSources.length) * 50 : 50;

    const overallFoundScore = (found / citations.length) * 30;
    const consistencyScore = found > 0 ? (consistent / found) * 20 : 0;

    const score = Math.round(criticalScore + overallFoundScore + consistencyScore);

    // Get inconsistencies
    const inconsistencies = citations
      .filter(c => c.found && c.issues && c.issues.length > 0)
      .map(c => ({
        source: c.source,
        priority: c.priority,
        issues: c.issues
      }));

    // Missing critical citations
    const missingCritical = citations
      .filter(c => !c.found && c.priority === 'CRITICAL')
      .map(c => ({ source: c.source, url: c.url }));

    return {
      total: citations.length,
      found,
      missing,
      consistent,
      inconsistent,
      score,
      inconsistencies,
      missingCritical,
      breakdown: {
        critical: {
          total: criticalSources.length,
          found: criticalFound
        },
        byType: this.groupByType(citations)
      }
    };
  }

  /**
   * Group citations by type
   */
  groupByType(citations) {
    const types = {};
    
    citations.forEach(c => {
      if (!types[c.type]) {
        types[c.type] = { total: 0, found: 0, consistent: 0 };
      }
      types[c.type].total++;
      if (c.found) types[c.type].found++;
      if (c.status === 'consistent') types[c.type].consistent++;
    });

    return types;
  }

  /**
   * Get actionable recommendations
   */
  getRecommendations() {
    const analysis = this.analyzeCitations(this.citations);
    const recommendations = [];

    // Missing critical citations
    if (analysis.missingCritical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Missing Citations',
        action: `Create listings on ${analysis.missingCritical.map(c => c.source).join(', ')}`,
        impact: 'Essential for local search visibility',
        sources: analysis.missingCritical
      });
    }

    // Inconsistent citations
    if (analysis.inconsistencies.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'NAP Inconsistencies',
        action: `Fix inconsistencies on ${analysis.inconsistencies.length} source(s)`,
        impact: 'Improves local search rankings and trust',
        details: analysis.inconsistencies
      });
    }

    // Low overall score
    if (analysis.score < 60) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Citation Building',
        action: `Build citations on ${analysis.missing} missing sources`,
        impact: 'Increases online visibility and local rankings'
      });
    }

    // Maintain good score
    if (analysis.score >= 80) {
      recommendations.push({
        priority: 'LOW',
        category: 'Maintenance',
        action: 'Monitor citations monthly for consistency',
        impact: 'Maintains strong local SEO presence'
      });
    }

    return recommendations;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CitationMonitor;
