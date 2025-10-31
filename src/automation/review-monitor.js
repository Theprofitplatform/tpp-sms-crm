/**
 * REVIEW MONITORING SERVICE
 * 
 * Monitors reviews across multiple platforms
 * Tracks sentiment, response rate, and reputation trends
 */

export class ReviewMonitor {
  constructor(businessConfig) {
    this.config = businessConfig;
    this.platforms = [];
  }

  /**
   * Get review platforms to monitor
   */
  getReviewPlatforms() {
    const country = this.config.country || 'AU';
    
    const platforms = {
      AU: [
        { name: 'Google', priority: 'CRITICAL', weight: 40 },
        { name: 'Facebook', priority: 'HIGH', weight: 25 },
        { name: 'ProductReview', priority: 'HIGH', weight: 15 },
        { name: 'Yelp', priority: 'MEDIUM', weight: 10 },
        { name: 'True Local', priority: 'MEDIUM', weight: 10 }
      ],
      US: [
        { name: 'Google', priority: 'CRITICAL', weight: 35 },
        { name: 'Yelp', priority: 'CRITICAL', weight: 30 },
        { name: 'Facebook', priority: 'HIGH', weight: 20 },
        { name: 'BBB', priority: 'HIGH', weight: 15 }
      ]
    };

    return platforms[country] || platforms.AU;
  }

  /**
   * Scan reviews from a platform
   */
  async scanPlatform(platform) {
    console.log(`  ⭐ Checking ${platform.name} reviews...`);

    try {
      // Mock review data
      const hasReviews = Math.random() > 0.2;
      
      if (!hasReviews) {
        return {
          platform: platform.name,
          priority: platform.priority,
          weight: platform.weight,
          present: false,
          message: 'No reviews found'
        };
      }

      const reviewCount = Math.floor(Math.random() * 80) + 10;
      const avgRating = (Math.random() * 1.5 + 3.5).toFixed(1);
      const recentReviews = this.generateMockReviews(5);

      // Calculate metrics
      const responseRate = Math.floor(Math.random() * 60) + 30; // 30-90%
      const avgResponseTime = Math.floor(Math.random() * 48) + 2; // 2-50 hours
      
      const sentiment = this.analyzeSentiment(recentReviews);

      return {
        platform: platform.name,
        priority: platform.priority,
        weight: platform.weight,
        present: true,
        metrics: {
          totalReviews: reviewCount,
          averageRating: parseFloat(avgRating),
          rating: parseFloat(avgRating),
          ratingDistribution: this.generateRatingDistribution(reviewCount),
          responseRate,
          avgResponseTime,
          recentReviews,
          sentiment,
          lastReviewDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      console.log(`     ⚠️  Error checking ${platform.name}: ${error.message}`);
      return {
        platform: platform.name,
        error: error.message,
        present: false
      };
    }
  }

  /**
   * Generate mock reviews
   */
  generateMockReviews(count) {
    const reviews = [];
    const templates = {
      positive: [
        'Excellent service! Highly recommend.',
        'Very professional and helpful staff.',
        'Great experience, will definitely return.',
        'Outstanding quality and service.',
        'Exceeded my expectations!'
      ],
      negative: [
        'Disappointed with the service.',
        'Could be better, had some issues.',
        'Not what I expected.',
        'Service was slow.',
        'Had a problem with my order.'
      ],
      neutral: [
        'Average experience, nothing special.',
        'It was okay.',
        'Standard service.',
        'Met expectations.',
        'Decent experience overall.'
      ]
    };

    for (let i = 0; i < count; i++) {
      const rating = Math.floor(Math.random() * 5) + 1;
      let sentiment, text;
      
      if (rating >= 4) {
        sentiment = 'positive';
        text = templates.positive[Math.floor(Math.random() * templates.positive.length)];
      } else if (rating <= 2) {
        sentiment = 'negative';
        text = templates.negative[Math.floor(Math.random() * templates.negative.length)];
      } else {
        sentiment = 'neutral';
        text = templates.neutral[Math.floor(Math.random() * templates.neutral.length)];
      }

      reviews.push({
        rating,
        text,
        sentiment,
        date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        responded: Math.random() > 0.4
      });
    }

    return reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Generate rating distribution
   */
  generateRatingDistribution(total) {
    // Bias towards positive reviews (typical pattern)
    const distribution = {
      5: Math.floor(total * 0.50),
      4: Math.floor(total * 0.25),
      3: Math.floor(total * 0.15),
      2: Math.floor(total * 0.06),
      1: Math.floor(total * 0.04)
    };

    return distribution;
  }

  /**
   * Analyze sentiment of reviews
   */
  analyzeSentiment(reviews) {
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    reviews.forEach(review => {
      sentimentCounts[review.sentiment]++;
    });

    const total = reviews.length;
    return {
      positive: Math.round((sentimentCounts.positive / total) * 100),
      neutral: Math.round((sentimentCounts.neutral / total) * 100),
      negative: Math.round((sentimentCounts.negative / total) * 100),
      score: Math.round(
        (sentimentCounts.positive * 100 + sentimentCounts.neutral * 50) / total
      )
    };
  }

  /**
   * Run complete review audit
   */
  async runAudit() {
    console.log(`\n⭐ REVIEW MONITORING - ${this.config.businessName}`);
    console.log('='.repeat(70));

    const platforms = this.getReviewPlatforms();
    console.log(`\nMonitoring ${platforms.length} review platforms...`);

    const results = [];
    
    for (const platform of platforms) {
      const data = await this.scanPlatform(platform);
      results.push(data);
      await this.delay(500);
    }

    this.platforms = results;

    // Calculate overall metrics
    const summary = this.calculateSummary(results);

    console.log('\n📊 REVIEW MONITORING SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Total Platforms: ${platforms.length}`);
    console.log(`   Platforms with Reviews: ${summary.platformsWithReviews}`);
    console.log(`   Total Reviews: ${summary.totalReviews}`);
    console.log(`   Average Rating: ${summary.averageRating} ⭐`);
    console.log(`   Overall Response Rate: ${summary.responseRate}%`);
    console.log(`   Reputation Score: ${summary.reputationScore}/100`);

    return {
      platforms: results,
      summary,
      recommendations: this.getRecommendations(summary),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate summary metrics
   */
  calculateSummary(platforms) {
    const withReviews = platforms.filter(p => p.present && p.metrics);
    
    if (withReviews.length === 0) {
      return {
        platformsWithReviews: 0,
        totalReviews: 0,
        averageRating: 0,
        responseRate: 0,
        reputationScore: 0,
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        needsAttention: []
      };
    }

    // Calculate weighted average rating
    let weightedRatingSum = 0;
    let totalWeight = 0;
    let totalReviews = 0;
    let totalResponses = 0;
    let totalReviewsForResponse = 0;

    withReviews.forEach(p => {
      weightedRatingSum += p.metrics.averageRating * p.weight;
      totalWeight += p.weight;
      totalReviews += p.metrics.totalReviews;
      
      const responsibleReviews = Math.floor(p.metrics.totalReviews * (p.metrics.responseRate / 100));
      totalResponses += responsibleReviews;
      totalReviewsForResponse += p.metrics.totalReviews;
    });

    const averageRating = (weightedRatingSum / totalWeight).toFixed(1);
    const responseRate = Math.round((totalResponses / totalReviewsForResponse) * 100);

    // Calculate reputation score
    const ratingScore = (parseFloat(averageRating) / 5) * 40; // 40% weight
    const volumeScore = Math.min((totalReviews / 100) * 30, 30); // 30% weight, max at 100 reviews
    const responseScore = (responseRate / 100) * 20; // 20% weight
    const presenceScore = (withReviews.length / platforms.length) * 10; // 10% weight

    const reputationScore = Math.round(ratingScore + volumeScore + responseScore + presenceScore);

    // Aggregate sentiment
    let totalSentimentReviews = 0;
    let sentimentSum = { positive: 0, neutral: 0, negative: 0 };

    withReviews.forEach(p => {
      if (p.metrics.sentiment) {
        const reviewCount = p.metrics.recentReviews.length;
        totalSentimentReviews += reviewCount;
        sentimentSum.positive += (p.metrics.sentiment.positive / 100) * reviewCount;
        sentimentSum.neutral += (p.metrics.sentiment.neutral / 100) * reviewCount;
        sentimentSum.negative += (p.metrics.sentiment.negative / 100) * reviewCount;
      }
    });

    const sentiment = {
      positive: totalSentimentReviews > 0 ? Math.round((sentimentSum.positive / totalSentimentReviews) * 100) : 0,
      neutral: totalSentimentReviews > 0 ? Math.round((sentimentSum.neutral / totalSentimentReviews) * 100) : 0,
      negative: totalSentimentReviews > 0 ? Math.round((sentimentSum.negative / totalSentimentReviews) * 100) : 0
    };

    // Identify platforms needing attention
    const needsAttention = withReviews.filter(p => 
      p.metrics.averageRating < 3.5 || 
      p.metrics.responseRate < 50 ||
      p.metrics.totalReviews < 10
    ).map(p => ({
      platform: p.platform,
      issues: [
        p.metrics.averageRating < 3.5 && 'Low rating',
        p.metrics.responseRate < 50 && 'Low response rate',
        p.metrics.totalReviews < 10 && 'Few reviews'
      ].filter(Boolean)
    }));

    return {
      platformsWithReviews: withReviews.length,
      totalReviews,
      averageRating: parseFloat(averageRating),
      responseRate,
      reputationScore,
      sentiment,
      needsAttention,
      breakdown: withReviews.map(p => ({
        platform: p.platform,
        reviews: p.metrics.totalReviews,
        rating: p.metrics.averageRating,
        responseRate: p.metrics.responseRate
      }))
    };
  }

  /**
   * Get recommendations
   */
  getRecommendations(summary) {
    const recommendations = [];

    // Low rating
    if (summary.averageRating < 3.5) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Reputation Management',
        action: 'Urgent: Address low average rating through service improvements',
        impact: 'Critical for business credibility',
        metric: `Current: ${summary.averageRating}⭐, Target: 4.0⭐+`
      });
    } else if (summary.averageRating < 4.0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Rating Improvement',
        action: 'Improve service quality to reach 4.0+ rating',
        impact: 'Better local search rankings',
        metric: `Current: ${summary.averageRating}⭐, Target: 4.0⭐+`
      });
    }

    // Low response rate
    if (summary.responseRate < 60) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Review Engagement',
        action: `Increase review response rate from ${summary.responseRate}% to 80%+`,
        impact: 'Shows customer care, improves reputation'
      });
    }

    // Few total reviews
    if (summary.totalReviews < 50) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Review Generation',
        action: `Build review volume from ${summary.totalReviews} to 50+ reviews`,
        impact: 'Increases trust and local visibility'
      });
    }

    // Negative sentiment
    if (summary.sentiment.negative > 20) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Sentiment Analysis',
        action: `Address ${summary.sentiment.negative}% negative sentiment in reviews`,
        impact: 'Improves overall reputation'
      });
    }

    // Platforms needing attention
    if (summary.needsAttention.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Platform Management',
        action: `Focus on ${summary.needsAttention.length} platform(s) with issues`,
        impact: 'Improves overall review presence',
        platforms: summary.needsAttention
      });
    }

    // Missing from platforms
    const missingPlatforms = this.getReviewPlatforms().length - summary.platformsWithReviews;
    if (missingPlatforms > 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'Platform Coverage',
        action: `Establish presence on ${missingPlatforms} additional review platform(s)`,
        impact: 'Broadens review coverage'
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

export default ReviewMonitor;
