/**
 * Title and Meta Description Optimizer v2
 *
 * Refactored to use manual review workflow with AI-powered optimizations
 *
 * Features:
 * - Identifies low-CTR pages from Google Search Console
 * - Uses Claude AI to generate optimized titles/meta descriptions
 * - Creates detailed proposals for review
 * - Manual approval before changes are applied
 * - Rich descriptions and verification steps
 * - Automatic risk assessment
 *
 * @extends AutoFixEngineBase
 */

import { AutoFixEngineBase } from './engine-base.js';
import { WordPressClient } from '../wordpress-client.js';
import { GoogleSearchConsole } from '../google-search-console.js';

export class TitleMetaOptimizerV2 extends AutoFixEngineBase {
  constructor(config) {
    super(config);

    this.wpClient = new WordPressClient(
      config.siteUrl,
      config.wpUser,
      config.wpPassword
    );

    this.gscClient = new GoogleSearchConsole(config.gscPropertyUrl);
    this.anthropicApiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    // Performance thresholds
    this.minCTRThreshold = 0.02; // 2% CTR minimum
    this.minImpressions = 100; // Minimum impressions to consider
    this.maxPosition = 20; // Only consider pages in top 20
  }

  /**
   * Get engine category
   */
  getCategory() {
    return 'on-page-seo';
  }

  /**
   * Detect issues: Find low-CTR pages and generate AI optimizations
   */
  async detectIssues(options = {}) {
    const issues = [];
    const limit = options.limit || 10; // Limit AI calls to avoid costs

    try {
      // Step 1: Get GSC performance data
      console.log('   📊 Fetching Google Search Console data...');
      const gscData = await this.gscClient.getPerformanceData({
        dimensions: ['page'],
        startDate: options.startDate,
        endDate: options.endDate
      });

      if (!gscData.rows || gscData.rows.length === 0) {
        console.log('   ℹ️  No GSC data available');
        return issues;
      }

      console.log(`   ✅ Retrieved ${gscData.rows.length} pages from GSC`);

      // Step 2: Identify low-CTR pages
      console.log('   🔍 Identifying low-CTR pages...');
      const lowCTRPages = this.identifyLowCTRPages(gscData);
      console.log(`   Found ${lowCTRPages.length} low-CTR pages`);

      if (lowCTRPages.length === 0) {
        console.log('   ✅ All pages have acceptable CTR');
        return issues;
      }

      // Step 3: Match to WordPress content
      console.log('   🔗 Matching to WordPress content...');
      const matchedPages = await this.matchPagesToWordPress(lowCTRPages);
      console.log(`   Matched ${matchedPages.length} pages to WordPress`);

      if (matchedPages.length === 0) {
        console.log('   ⚠️  No pages could be matched to WordPress');
        return issues;
      }

      // Step 4: Generate AI optimizations (limited to avoid API costs)
      const pagesToOptimize = matchedPages.slice(0, limit);
      console.log(`   🤖 Generating AI optimizations for ${pagesToOptimize.length} pages...`);

      for (let i = 0; i < pagesToOptimize.length; i++) {
        const page = pagesToOptimize[i];

        try {
          console.log(`      [${i + 1}/${pagesToOptimize.length}] ${page.title.substring(0, 50)}...`);

          // Generate optimization using AI
          const optimization = await this.generateAIOptimization(page);

          // Create proposal
          const issue = this.createIssueFromOptimization(page, optimization);
          issues.push(issue);

          console.log(`      ✅ Optimization generated`);

        } catch (error) {
          console.error(`      ❌ Failed to optimize: ${error.message}`);
          // Continue with next page
        }
      }

      if (matchedPages.length > limit) {
        console.log(`   ℹ️  ${matchedPages.length - limit} more pages available (increase --limit to optimize more)`);
      }

    } catch (error) {
      console.error(`   ❌ Detection error: ${error.message}`);
      throw error;
    }

    return issues;
  }

  /**
   * Identify pages with low CTR from GSC data
   */
  identifyLowCTRPages(gscData) {
    const lowCTRPages = [];
    const avgCTR = this.calculateAverageCTR(gscData.rows);

    for (const row of gscData.rows) {
      const ctr = row.ctr || 0;
      const impressions = row.impressions || 0;
      const position = row.position || 0;

      // Criteria for optimization:
      // 1. CTR below threshold OR below average
      // 2. Has significant impressions
      // 3. Good position (top 20)
      const isBelowThreshold = ctr < this.minCTRThreshold || ctr < avgCTR;
      const hasTraffic = impressions >= this.minImpressions;
      const goodPosition = position <= this.maxPosition;

      if (isBelowThreshold && hasTraffic && goodPosition) {
        lowCTRPages.push({
          url: row.keys[0],
          ctr: ctr,
          impressions: impressions,
          clicks: row.clicks || 0,
          position: position,
          avgCTR: avgCTR
        });
      }
    }

    // Sort by impressions (highest potential for improvement)
    return lowCTRPages.sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Calculate average CTR across all pages
   */
  calculateAverageCTR(rows) {
    if (rows.length === 0) return 0;
    const totalCTR = rows.reduce((sum, row) => sum + (row.ctr || 0), 0);
    return totalCTR / rows.length;
  }

  /**
   * Match GSC pages to WordPress posts/pages
   */
  async matchPagesToWordPress(gscPages) {
    const matched = [];

    // Get all posts and pages
    const [posts, pages] = await Promise.all([
      this.wpClient.getPosts({ per_page: 100 }),
      this.wpClient.getPages({ per_page: 100 })
    ]);

    const allContent = [...posts, ...pages];

    for (const gscPage of gscPages) {
      // Try to match by URL
      const wpPage = allContent.find(p => {
        const pageUrl = p.link.toLowerCase();
        const gscUrl = gscPage.url.toLowerCase();

        // Exact match or slug match
        return pageUrl === gscUrl ||
               pageUrl.includes(p.slug) && gscUrl.includes(p.slug);
      });

      if (wpPage) {
        matched.push({
          ...gscPage,
          wpId: wpPage.id,
          wpType: wpPage.type,
          title: wpPage.title.rendered,
          currentMeta: wpPage.yoast_head_json?.og_description ||
                      wpPage.excerpt?.rendered ||
                      '',
          content: wpPage.content.rendered,
          slug: wpPage.slug
        });
      }
    }

    return matched;
  }

  /**
   * Generate AI-powered optimization using Claude
   */
  async generateAIOptimization(page) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    // Extract clean text from HTML content
    const cleanContent = page.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    const prompt = `You are an expert SEO copywriter. Analyze this webpage and create an optimized title and meta description that will improve click-through rate (CTR) in Google search results.

Current Page Information:
- URL: ${page.url}
- Current Title: ${page.title}
- Current Meta Description: ${page.currentMeta || '(none)'}
- Current CTR: ${(page.ctr * 100).toFixed(2)}%
- Average Position: ${page.position.toFixed(1)}
- Impressions: ${page.impressions.toLocaleString()}
- Clicks: ${page.clicks}
- Average CTR for site: ${(page.avgCTR * 100).toFixed(2)}%

Content Preview:
${cleanContent}

Please create:
1. Optimized Title Tag (50-60 characters)
   - Compelling and click-worthy
   - Includes primary keyword naturally
   - Creates urgency or curiosity
   - Accurate to page content

2. Optimized Meta Description (150-160 characters)
   - Compelling call-to-action
   - Includes relevant keywords
   - Highlights unique value
   - Encourages clicks

3. Brief explanation of improvements

Respond ONLY with valid JSON in this exact format:
{
  "title": "your optimized title here",
  "description": "your optimized meta description here",
  "reasoning": "brief explanation of why these will improve CTR"
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse Claude response as JSON');
      }

      const optimization = JSON.parse(jsonMatch[0]);

      // Validate response
      if (!optimization.title || !optimization.description) {
        throw new Error('Invalid optimization response from AI');
      }

      return {
        newTitle: optimization.title,
        newDescription: optimization.description,
        reasoning: optimization.reasoning,
        aiModel: 'claude-3-5-sonnet-20241022'
      };

    } catch (error) {
      console.error('      AI generation error:', error.message);
      throw error;
    }
  }

  /**
   * Create issue proposal from AI optimization
   */
  createIssueFromOptimization(page, optimization) {
    const ctrDiff = page.avgCTR - page.ctr;
    const potentialClicks = Math.round(page.impressions * ctrDiff);

    // Calculate risk level
    let riskLevel = 'low';
    if (page.clicks > 1000) {
      riskLevel = 'medium'; // High-traffic page, more risky to change
    }

    // Calculate severity based on potential impact
    let severity = 'medium';
    if (potentialClicks > 100) {
      severity = 'high';
    } else if (potentialClicks > 500) {
      severity = 'critical';
    }

    const verificationSteps = [
      `1. Check the updated page at: ${page.url}`,
      `2. View page source and verify the <title> tag contains: "${optimization.newTitle.substring(0, 40)}..."`,
      `3. Verify meta description in page source or using SEO browser extension`,
      `4. Test how it appears in Google with: site:${new URL(page.url).hostname} "${optimization.newTitle.split(' ').slice(0, 3).join(' ')}"`,
      `5. Monitor CTR in Google Search Console over next 14 days`,
      `6. Expected improvement: ${potentialClicks} more clicks per month if CTR reaches site average`
    ];

    return {
      target_type: page.wpType,
      target_id: page.wpId,
      target_title: page.title,
      target_url: page.url,
      field_name: 'title_and_meta',

      before_value: JSON.stringify({
        title: page.title,
        meta: page.currentMeta || '(empty)'
      }, null, 2),

      after_value: JSON.stringify({
        title: optimization.newTitle,
        meta: optimization.newDescription
      }, null, 2),

      issue_description: `Low click-through rate (${(page.ctr * 100).toFixed(2)}%) compared to site average (${(page.avgCTR * 100).toFixed(2)}%). Page has ${page.impressions.toLocaleString()} impressions but only ${page.clicks} clicks at position ${page.position.toFixed(1)}. Current title "${page.title}" may not be compelling enough to encourage clicks.`,

      fix_description: `Update title from "${page.title}" to "${optimization.newTitle}" and meta description to "${optimization.newDescription}". AI analysis: ${optimization.reasoning}`,

      expected_benefit: `Improving CTR from ${(page.ctr * 100).toFixed(2)}% to site average ${(page.avgCTR * 100).toFixed(2)}% could generate approximately ${potentialClicks} additional clicks per month. Better titles and descriptions improve organic traffic, user engagement, and SERP appeal.`,

      severity: severity,
      risk_level: riskLevel,
      category: 'on-page-seo',

      impact_score: Math.min(100, Math.round(potentialClicks / 10)),
      priority: severity === 'critical' ? 90 : severity === 'high' ? 75 : 60,

      reversible: true,

      metadata: {
        verificationSteps,
        gscMetrics: {
          currentCTR: page.ctr,
          avgCTR: page.avgCTR,
          impressions: page.impressions,
          clicks: page.clicks,
          position: page.position,
          potentialClicks: potentialClicks
        },
        ai: {
          model: optimization.aiModel,
          reasoning: optimization.reasoning,
          generatedAt: new Date().toISOString()
        },
        original: {
          title: page.title,
          meta: page.currentMeta
        },
        proposed: {
          title: optimization.newTitle,
          meta: optimization.newDescription
        }
      }
    };
  }

  /**
   * Apply fix: Update WordPress with optimized title and meta
   */
  async applyFix(proposal, options = {}) {
    const { target_id, target_type, metadata } = proposal;

    if (!metadata || !metadata.proposed) {
      throw new Error('Proposal missing required metadata');
    }

    try {
      // Prepare update data
      const updateData = {
        title: metadata.proposed.title
      };

      // Update excerpt as fallback for meta description
      // Note: For Yoast SEO, you'd need to update yoast_wpseo_metadesc custom field
      if (metadata.proposed.meta) {
        updateData.excerpt = metadata.proposed.meta;

        // If Yoast SEO is installed, update meta field
        updateData.meta = {
          yoast_wpseo_metadesc: metadata.proposed.meta
        };
      }

      // Update WordPress post or page
      if (target_type === 'post') {
        await this.wpClient.updatePost(target_id, updateData);
      } else {
        await this.wpClient.updatePage(target_id, updateData);
      }

      console.log(`      ✅ Updated ${target_type} #${target_id}`);

      return {
        success: true,
        contentId: target_id,
        contentType: target_type,
        updatedFields: ['title', 'meta_description'],
        message: 'Title and meta description updated successfully'
      };

    } catch (error) {
      console.error(`      ❌ Failed to apply fix: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to check if page can be optimized
   */
  canOptimize(page) {
    return page.wpId &&
           page.ctr < page.avgCTR &&
           page.impressions >= this.minImpressions &&
           page.position <= this.maxPosition;
  }

  /**
   * Get statistics about optimization potential
   */
  async getOptimizationPotential(options = {}) {
    try {
      const gscData = await this.gscClient.getPerformanceData({
        dimensions: ['page']
      });

      if (!gscData.rows || gscData.rows.length === 0) {
        return {
          totalPages: 0,
          lowCTRPages: 0,
          potentialClicks: 0
        };
      }

      const lowCTRPages = this.identifyLowCTRPages(gscData);
      const avgCTR = this.calculateAverageCTR(gscData.rows);

      const potentialClicks = lowCTRPages.reduce((sum, page) => {
        const ctrGain = avgCTR - page.ctr;
        return sum + (page.impressions * ctrGain);
      }, 0);

      return {
        totalPages: gscData.rows.length,
        lowCTRPages: lowCTRPages.length,
        avgCTR: avgCTR,
        potentialClicks: Math.round(potentialClicks),
        topOpportunities: lowCTRPages.slice(0, 5).map(p => ({
          url: p.url,
          ctr: p.ctr,
          impressions: p.impressions,
          potentialGain: Math.round(p.impressions * (avgCTR - p.ctr))
        }))
      };

    } catch (error) {
      console.error('Failed to get optimization potential:', error.message);
      return null;
    }
  }
}

export default TitleMetaOptimizerV2;
