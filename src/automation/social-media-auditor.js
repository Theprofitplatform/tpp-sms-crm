/**
 * SOCIAL MEDIA NAP AUDITOR
 * 
 * Audits NAP consistency across social media platforms
 * Checks profile completeness and optimization
 */

export class SocialMediaAuditor {
  constructor(businessConfig) {
    this.config = businessConfig;
    this.platforms = [];
  }

  /**
   * Get social media platforms to audit
   */
  getSocialPlatforms() {
    return [
      {
        name: 'Facebook',
        priority: 'CRITICAL',
        weight: 30,
        checkNAP: true,
        checkHours: true,
        checkReviews: true
      },
      {
        name: 'Instagram',
        priority: 'HIGH',
        weight: 20,
        checkNAP: true,
        checkHours: false,
        checkReviews: false
      },
      {
        name: 'LinkedIn',
        priority: 'HIGH',
        weight: 15,
        checkNAP: true,
        checkHours: true,
        checkReviews: false
      },
      {
        name: 'Twitter',
        priority: 'MEDIUM',
        weight: 10,
        checkNAP: true,
        checkHours: false,
        checkReviews: false
      },
      {
        name: 'YouTube',
        priority: 'MEDIUM',
        weight: 10,
        checkNAP: false,
        checkHours: false,
        checkReviews: false
      },
      {
        name: 'Pinterest',
        priority: 'LOW',
        weight: 5,
        checkNAP: false,
        checkHours: false,
        checkReviews: false
      },
      {
        name: 'TikTok',
        priority: 'LOW',
        weight: 5,
        checkNAP: false,
        checkHours: false,
        checkReviews: false
      }
    ];
  }

  /**
   * Audit a single platform
   */
  async auditPlatform(platform) {
    console.log(`  📱 Auditing ${platform.name}...`);

    try {
      // Mock platform data
      const hasProfile = Math.random() > 0.3; // 70% have profile

      if (!hasProfile) {
        return {
          platform: platform.name,
          priority: platform.priority,
          weight: platform.weight,
          present: false,
          recommendation: `Create ${platform.name} business profile`
        };
      }

      const audit = {
        platform: platform.name,
        priority: platform.priority,
        weight: platform.weight,
        present: true,
        profileUrl: this.generateProfileUrl(platform.name),
        completeness: Math.floor(Math.random() * 40) + 60, // 60-100%
        issues: [],
        metrics: {}
      };

      // Check NAP if applicable
      if (platform.checkNAP) {
        const napCheck = this.checkNAP();
        audit.nap = napCheck;
        if (!napCheck.consistent) {
          audit.issues.push(...napCheck.issues);
        }
      }

      // Check business hours
      if (platform.checkHours) {
        const hasHours = Math.random() > 0.4;
        if (!hasHours) {
          audit.issues.push({
            type: 'missing_hours',
            severity: 'medium',
            message: 'Business hours not listed'
          });
        }
        audit.hasBusinessHours = hasHours;
      }

      // Check profile completeness
      const profileChecks = this.checkProfileCompleteness(platform);
      audit.profileChecks = profileChecks;
      audit.issues.push(...profileChecks.issues);

      // Platform-specific metrics
      audit.metrics = this.getPlatformMetrics(platform.name);

      // Calculate score
      audit.score = this.calculatePlatformScore(audit);

      return audit;

    } catch (error) {
      console.log(`     ⚠️  Error auditing ${platform.name}: ${error.message}`);
      return {
        platform: platform.name,
        error: error.message,
        present: false
      };
    }
  }

  /**
   * Check NAP consistency
   */
  checkNAP() {
    // Mock NAP check
    const consistent = Math.random() > 0.3;
    const issues = [];

    if (!consistent) {
      const issueTypes = [
        { field: 'name', message: 'Business name doesn\'t match website' },
        { field: 'phone', message: 'Phone number format inconsistent' },
        { field: 'address', message: 'Address missing or incomplete' }
      ];

      const issueCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < issueCount; i++) {
        issues.push({
          type: 'nap_inconsistency',
          severity: 'high',
          ...issueTypes[i]
        });
      }
    }

    return {
      consistent,
      businessName: this.config.businessName,
      phone: this.config.phone || 'Not listed',
      address: this.config.address ? 
        `${this.config.address.city}, ${this.config.address.state}` : 
        'Not listed',
      issues
    };
  }

  /**
   * Check profile completeness
   */
  checkProfileCompleteness(platform) {
    const checks = [];
    const issues = [];

    // Profile photo
    const hasPhoto = Math.random() > 0.2;
    checks.push({ item: 'Profile Photo', present: hasPhoto });
    if (!hasPhoto) {
      issues.push({
        type: 'missing_photo',
        severity: 'medium',
        message: 'Missing profile photo'
      });
    }

    // Cover photo
    if (platform.name === 'Facebook' || platform.name === 'LinkedIn') {
      const hasCover = Math.random() > 0.3;
      checks.push({ item: 'Cover Photo', present: hasCover });
      if (!hasCover) {
        issues.push({
          type: 'missing_cover',
          severity: 'low',
          message: 'Missing cover photo'
        });
      }
    }

    // Description/Bio
    const hasDescription = Math.random() > 0.2;
    checks.push({ item: 'Description', present: hasDescription });
    if (!hasDescription) {
      issues.push({
        type: 'missing_description',
        severity: 'high',
        message: 'Missing or incomplete business description'
      });
    }

    // Website link
    const hasWebsite = Math.random() > 0.15;
    checks.push({ item: 'Website Link', present: hasWebsite });
    if (!hasWebsite) {
      issues.push({
        type: 'missing_website',
        severity: 'high',
        message: 'Website link not added'
      });
    }

    // Contact info
    const hasContact = Math.random() > 0.25;
    checks.push({ item: 'Contact Info', present: hasContact });
    if (!hasContact) {
      issues.push({
        type: 'missing_contact',
        severity: 'medium',
        message: 'Contact information incomplete'
      });
    }

    return { checks, issues };
  }

  /**
   * Get platform-specific metrics
   */
  getPlatformMetrics(platformName) {
    const metrics = {
      followers: Math.floor(Math.random() * 5000) + 500,
      posts: Math.floor(Math.random() * 500) + 50,
      lastPost: this.generateRandomDate(60) // Within last 60 days
    };

    if (platformName === 'Facebook') {
      metrics.pageRating = (Math.random() * 1.5 + 3.5).toFixed(1);
      metrics.checkIns = Math.floor(Math.random() * 200);
    }

    if (platformName === 'Instagram') {
      metrics.engagement = (Math.random() * 5 + 1).toFixed(2) + '%';
    }

    if (platformName === 'YouTube') {
      metrics.subscribers = Math.floor(Math.random() * 2000) + 100;
      metrics.videos = Math.floor(Math.random() * 50) + 5;
    }

    return metrics;
  }

  /**
   * Calculate platform score
   */
  calculatePlatformScore(audit) {
    let score = 100;

    // Deduct for issues
    audit.issues.forEach(issue => {
      if (issue.severity === 'high') score -= 15;
      else if (issue.severity === 'medium') score -= 10;
      else if (issue.severity === 'low') score -= 5;
    });

    // Deduct for low completeness
    if (audit.completeness < 70) {
      score -= (70 - audit.completeness) * 0.5;
    }

    // Deduct for NAP inconsistency
    if (audit.nap && !audit.nap.consistent) {
      score -= 20;
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Run complete social media audit
   */
  async runAudit() {
    console.log(`\n📱 SOCIAL MEDIA NAP AUDIT - ${this.config.businessName}`);
    console.log('='.repeat(70));

    const platforms = this.getSocialPlatforms();
    console.log(`\nAuditing ${platforms.length} social platforms...`);

    const results = [];

    for (const platform of platforms) {
      const audit = await this.auditPlatform(platform);
      results.push(audit);
      await this.delay(300);
    }

    this.platforms = results;

    const summary = this.analyzePlatforms(results);

    console.log('\n📊 SOCIAL MEDIA AUDIT SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Platforms with Profile: ${summary.profilesPresent}/${platforms.length}`);
    console.log(`   Average Score: ${summary.avgScore}/100`);
    console.log(`   Total Issues: ${summary.totalIssues}`);
    console.log(`   NAP Consistency: ${summary.napConsistency}%`);

    return {
      platforms: results,
      summary,
      recommendations: this.getRecommendations(summary),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze platform results
   */
  analyzePlatforms(platforms) {
    const withProfiles = platforms.filter(p => p.present);
    
    const profilesPresent = withProfiles.length;
    const avgScore = withProfiles.length > 0 ?
      Math.round(withProfiles.reduce((sum, p) => sum + p.score, 0) / withProfiles.length) : 0;

    const totalIssues = withProfiles.reduce((sum, p) => sum + (p.issues?.length || 0), 0);

    // NAP consistency across platforms
    const withNAPCheck = withProfiles.filter(p => p.nap);
    const napConsistent = withNAPCheck.filter(p => p.nap.consistent).length;
    const napConsistency = withNAPCheck.length > 0 ?
      Math.round((napConsistent / withNAPCheck.length) * 100) : 0;

    // Missing critical platforms
    const missingCritical = platforms.filter(p => 
      !p.present && (p.priority === 'CRITICAL' || p.priority === 'HIGH')
    );

    // Platforms needing attention
    const needsAttention = withProfiles.filter(p => p.score < 70);

    return {
      total: platforms.length,
      profilesPresent,
      avgScore,
      totalIssues,
      napConsistency,
      missingCritical,
      needsAttention,
      breakdown: withProfiles.map(p => ({
        platform: p.platform,
        score: p.score,
        issues: p.issues?.length || 0,
        napConsistent: p.nap?.consistent || null
      }))
    };
  }

  /**
   * Get recommendations
   */
  getRecommendations(summary) {
    const recommendations = [];

    // Missing critical platforms
    if (summary.missingCritical.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Platform Coverage',
        action: `Create profiles on: ${summary.missingCritical.map(p => p.name).join(', ')}`,
        impact: 'Critical platforms for local business visibility',
        platforms: summary.missingCritical.map(p => p.name)
      });
    }

    // Low NAP consistency
    if (summary.napConsistency < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'NAP Consistency',
        action: 'Fix NAP inconsistencies across social media profiles',
        impact: 'Consistent NAP improves local SEO and user trust',
        consistency: summary.napConsistency + '%'
      });
    }

    // Low average score
    if (summary.avgScore < 70) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Profile Optimization',
        action: 'Complete and optimize social media profiles',
        impact: 'Better profiles increase engagement and credibility',
        currentScore: summary.avgScore
      });
    }

    // Platforms needing attention
    if (summary.needsAttention.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Profile Improvement',
        action: `Focus on improving ${summary.needsAttention.length} platform(s) with low scores`,
        impact: 'Fixes issues that hurt visibility',
        platforms: summary.needsAttention.map(p => p.platform)
      });
    }

    // High number of issues
    if (summary.totalIssues > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Issue Resolution',
        action: `Address ${summary.totalIssues} issues across social profiles`,
        impact: 'Resolves problems affecting user experience'
      });
    }

    return recommendations;
  }

  /**
   * Generate profile URL
   */
  generateProfileUrl(platformName) {
    const username = this.config.businessName.toLowerCase().replace(/\s+/g, '');
    
    const urls = {
      'Facebook': `https://facebook.com/${username}`,
      'Instagram': `https://instagram.com/${username}`,
      'LinkedIn': `https://linkedin.com/company/${username}`,
      'Twitter': `https://twitter.com/${username}`,
      'YouTube': `https://youtube.com/@${username}`,
      'Pinterest': `https://pinterest.com/${username}`,
      'TikTok': `https://tiktok.com/@${username}`
    };

    return urls[platformName] || '#';
  }

  /**
   * Generate random date
   */
  generateRandomDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date.toISOString();
  }

  /**
   * Utility delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SocialMediaAuditor;
