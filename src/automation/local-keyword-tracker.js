/**
 * LOCAL KEYWORD POSITION TRACKER
 * 
 * Tracks keyword positions in local search results
 * Monitors "near me" and location-specific queries
 */

export class LocalKeywordTracker {
  constructor(businessConfig) {
    this.config = businessConfig;
    this.keywords = [];
  }

  /**
   * Generate local keyword variations
   */
  generateLocalKeywords() {
    const baseTerms = this.getBaseTerms();
    const locations = this.getLocationVariations();
    const modifiers = ['near me', 'in', 'at', 'around'];

    const keywords = [];

    // Generate keyword combinations
    baseTerms.forEach(term => {
      // "near me" variations
      keywords.push({
        keyword: `${term} near me`,
        type: 'near-me',
        baseKeyword: term,
        searchVolume: this.estimateSearchVolume(term, 'near-me'),
        difficulty: Math.floor(Math.random() * 30) + 30,
        priority: 'HIGH'
      });

      // Location-specific
      locations.forEach(location => {
        keywords.push({
          keyword: `${term} ${location}`,
          type: 'location-specific',
          baseKeyword: term,
          location: location,
          searchVolume: this.estimateSearchVolume(term, 'location'),
          difficulty: Math.floor(Math.random() * 40) + 20,
          priority: location === this.config.city ? 'HIGH' : 'MEDIUM'
        });

        keywords.push({
          keyword: `${term} in ${location}`,
          type: 'location-specific',
          baseKeyword: term,
          location: location,
          searchVolume: this.estimateSearchVolume(term, 'location') * 0.7,
          difficulty: Math.floor(Math.random() * 40) + 20,
          priority: location === this.config.city ? 'MEDIUM' : 'LOW'
        });
      });

      // Long-tail local
      keywords.push({
        keyword: `best ${term} ${this.config.city}`,
        type: 'long-tail',
        baseKeyword: term,
        searchVolume: this.estimateSearchVolume(term, 'long-tail'),
        difficulty: Math.floor(Math.random() * 25) + 15,
        priority: 'MEDIUM'
      });
    });

    return keywords;
  }

  /**
   * Get base search terms for the business
   */
  getBaseTerms() {
    const businessType = this.config.businessType || 'LocalBusiness';

    const termsByType = {
      'AutomotiveBusiness': [
        'car buyer',
        'cash for cars',
        'sell my car',
        'car removal',
        'used car buyer',
        'car valuation'
      ],
      'Restaurant': [
        'restaurant',
        'dining',
        'food',
        'eatery',
        'cafe'
      ],
      'LocalBusiness': [
        'service',
        'company',
        'business',
        'provider'
      ]
    };

    return termsByType[businessType] || termsByType.LocalBusiness;
  }

  /**
   * Get location variations
   */
  getLocationVariations() {
    const city = this.config.city || 'Sydney';
    const state = this.config.state || 'NSW';

    // Generate nearby suburbs/areas (mock data)
    const variations = [
      city,
      state,
      `${city} ${state}`,
      `${city} CBD`,
      `${city} Metro`
    ];

    // Add mock suburbs for Sydney
    if (city.toLowerCase() === 'sydney') {
      variations.push(
        'North Sydney',
        'Western Sydney',
        'Eastern Suburbs Sydney',
        'Inner West Sydney',
        'Sydney Northern Beaches'
      );
    }

    return variations.slice(0, 8); // Limit to 8 locations
  }

  /**
   * Estimate search volume (mock)
   */
  estimateSearchVolume(term, type) {
    const base = {
      'near-me': 500,
      'location': 300,
      'long-tail': 150
    }[type] || 200;

    // Add randomness
    return Math.floor(base + (Math.random() * base * 0.5));
  }

  /**
   * Check current positions (mock)
   */
  async checkPositions(keywords = null) {
    console.log(`\n🎯 LOCAL KEYWORD TRACKING - ${this.config.businessName}`);
    console.log('='.repeat(70));

    const keywordsToCheck = keywords || this.generateLocalKeywords();
    console.log(`\nChecking positions for ${keywordsToCheck.length} keywords...`);

    const results = [];

    for (const kw of keywordsToCheck.slice(0, 20)) { // Limit to 20 for demo
      const position = await this.mockCheckPosition(kw.keyword);
      results.push({
        ...kw,
        position,
        previousPosition: position + Math.floor(Math.random() * 5) - 2,
        url: position <= 100 ? `${this.config.siteUrl}/page` : null,
        lastChecked: new Date().toISOString(),
        rankingFeatures: position <= 10 ? this.identifyRankingFeatures() : []
      });

      // Delay to simulate API call
      await this.delay(50);
    }

    this.keywords = results;

    const analysis = this.analyzePositions(results);

    console.log('\n📊 KEYWORD POSITION SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Keywords Tracked: ${results.length}`);
    console.log(`   Top 3 Positions: ${analysis.top3}`);
    console.log(`   Top 10 Positions: ${analysis.top10}`);
    console.log(`   Top 20 Positions: ${analysis.top20}`);
    console.log(`   Not Ranking: ${analysis.notRanking}`);
    console.log(`   Avg Position: ${analysis.avgPosition.toFixed(1)}`);

    return {
      keywords: results,
      analysis,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mock position check
   */
  async mockCheckPosition(keyword) {
    // Simulate ranking distribution
    const random = Math.random();
    
    if (random < 0.05) return Math.floor(Math.random() * 3) + 1; // 5% in top 3
    if (random < 0.15) return Math.floor(Math.random() * 7) + 4; // 10% in 4-10
    if (random < 0.30) return Math.floor(Math.random() * 10) + 11; // 15% in 11-20
    if (random < 0.50) return Math.floor(Math.random() * 30) + 21; // 20% in 21-50
    if (random < 0.70) return Math.floor(Math.random() * 50) + 51; // 20% in 51-100
    return 0; // 30% not ranking in top 100
  }

  /**
   * Identify ranking features
   */
  identifyRankingFeatures() {
    const allFeatures = [
      'Google Business Profile',
      'NAP Consistency',
      'Local Citations',
      'Customer Reviews',
      'Schema Markup',
      'Mobile Optimization',
      'Local Content',
      'Backlinks'
    ];

    // Randomly select 3-5 features
    const count = Math.floor(Math.random() * 3) + 3;
    const features = [];
    
    while (features.length < count) {
      const feature = allFeatures[Math.floor(Math.random() * allFeatures.length)];
      if (!features.includes(feature)) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Analyze keyword positions
   */
  analyzePositions(keywords) {
    const withPositions = keywords.filter(k => k.position > 0);
    
    const top3 = keywords.filter(k => k.position > 0 && k.position <= 3).length;
    const top10 = keywords.filter(k => k.position > 0 && k.position <= 10).length;
    const top20 = keywords.filter(k => k.position > 0 && k.position <= 20).length;
    const notRanking = keywords.filter(k => k.position === 0).length;

    const avgPosition = withPositions.length > 0 ?
      withPositions.reduce((sum, k) => sum + k.position, 0) / withPositions.length : 0;

    // Group by type
    const byType = {
      'near-me': keywords.filter(k => k.type === 'near-me'),
      'location-specific': keywords.filter(k => k.type === 'location-specific'),
      'long-tail': keywords.filter(k => k.type === 'long-tail')
    };

    // Calculate movement
    const improving = keywords.filter(k => 
      k.position > 0 && k.previousPosition > 0 && k.position < k.previousPosition
    ).length;

    const declining = keywords.filter(k =>
      k.position > 0 && k.previousPosition > 0 && k.position > k.previousPosition
    ).length;

    return {
      total: keywords.length,
      top3,
      top10,
      top20,
      notRanking,
      avgPosition,
      visibility: Math.round((top20 / keywords.length) * 100),
      improving,
      declining,
      stable: keywords.length - improving - declining,
      byType: {
        'near-me': this.analyzeTypePerformance(byType['near-me']),
        'location-specific': this.analyzeTypePerformance(byType['location-specific']),
        'long-tail': this.analyzeTypePerformance(byType['long-tail'])
      }
    };
  }

  /**
   * Analyze performance by keyword type
   */
  analyzeTypePerformance(keywords) {
    if (keywords.length === 0) {
      return { avgPosition: 0, top10: 0, visibility: 0 };
    }

    const withPositions = keywords.filter(k => k.position > 0);
    const avgPosition = withPositions.length > 0 ?
      withPositions.reduce((sum, k) => sum + k.position, 0) / withPositions.length : 0;

    const top10 = keywords.filter(k => k.position > 0 && k.position <= 10).length;

    return {
      total: keywords.length,
      avgPosition: avgPosition.toFixed(1),
      top10,
      visibility: Math.round((withPositions.length / keywords.length) * 100)
    };
  }

  /**
   * Get opportunities (keywords that could rank better)
   */
  getOpportunities() {
    const opportunities = this.keywords.filter(k => 
      k.position > 10 && k.position <= 30 && k.priority !== 'LOW'
    ).sort((a, b) => a.position - b.position);

    return opportunities.slice(0, 10).map(k => ({
      keyword: k.keyword,
      currentPosition: k.position,
      priority: k.priority,
      searchVolume: k.searchVolume,
      difficulty: k.difficulty,
      potentialGain: 30 - k.position,
      recommendation: this.getKeywordRecommendation(k)
    }));
  }

  /**
   * Get recommendation for a keyword
   */
  getKeywordRecommendation(keyword) {
    if (keyword.type === 'near-me') {
      return 'Optimize Google Business Profile and local content';
    }
    if (keyword.type === 'location-specific') {
      return `Create dedicated content for ${keyword.location}`;
    }
    if (keyword.type === 'long-tail') {
      return 'Build targeted content page with local testimonials';
    }
    return 'Improve on-page SEO and build local citations';
  }

  /**
   * Get recommendations
   */
  getRecommendations() {
    const analysis = this.analyzePositions(this.keywords);
    const recommendations = [];

    // Low visibility
    if (analysis.visibility < 30) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Local Visibility',
        action: 'Improve local keyword rankings - only ' + analysis.visibility + '% visibility in top 20',
        impact: 'Critical for local search traffic'
      });
    }

    // No top 10 rankings
    if (analysis.top10 === 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Keyword Rankings',
        action: 'No keywords in top 10 - focus on high-priority local keywords',
        impact: 'Top 10 rankings drive 90% of traffic'
      });
    }

    // Focus on near-me queries
    if (analysis.byType['near-me'].avgPosition > 20) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Near Me Optimization',
        action: 'Improve "near me" keyword rankings through GMB optimization',
        impact: 'Near me searches have high commercial intent'
      });
    }

    // Opportunities
    const opportunities = this.getOpportunities();
    if (opportunities.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Quick Wins',
        action: `Target ${opportunities.length} keywords in positions 11-30 for quick ranking improvements`,
        impact: 'Easier to improve than keywords ranking lower',
        keywords: opportunities.slice(0, 5).map(o => o.keyword)
      });
    }

    return recommendations;
  }

  /**
   * Utility delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default LocalKeywordTracker;
