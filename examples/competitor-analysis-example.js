#!/usr/bin/env node

/**
 * Competitor Analysis Example
 * Demonstrates how to use the competitor analysis features
 */

import { competitorAnalyzer } from '../tasks/competitor-analysis.js';
import { logger } from '../tasks/logger.js';

async function main() {
  console.log('\n🔍 Competitor Analysis Demo\n');
  console.log('='.repeat(60));

  try {
    // Example 1: Analyze a single keyword
    logger.section('Example 1: Keyword Analysis');
    const keyword = 'wordpress seo tools';
    console.log(`Analyzing keyword: "${keyword}"\n`);

    const analysis = await competitorAnalyzer.analyzeKeyword(keyword, {
      location: 'United States',
      device: 'desktop',
      limit: 5
    });

    console.log(`\n📊 Results for "${keyword}":`);
    console.log(`Source: ${analysis.source}`);
    console.log(`Total Results: ${analysis.totalResults?.toLocaleString() || 'N/A'}`);
    console.log(`\nTop 5 Competitors:`);

    analysis.competitors.forEach(competitor => {
      console.log(`\n${competitor.position}. ${competitor.title}`);
      console.log(`   Domain: ${competitor.domain}`);
      console.log(`   URL: ${competitor.url}`);
      if (competitor.richSnippet) {
        console.log(`   ⭐ Has Rich Snippet`);
      }
      if (competitor.sitelinks) {
        console.log(`   🔗 Has Sitelinks`);
      }
    });

    console.log('\n💡 Insights:');
    console.log(`   Unique Domains: ${analysis.insights.uniqueDomains}`);
    console.log(`   Domain Diversity: ${analysis.insights.domainDiversity}`);
    console.log(`   Rich Snippets: ${analysis.insights.richSnippetUsage}`);
    console.log(`   Sitelinks: ${analysis.insights.sitelinkUsage}`);

    if (analysis.insights.recommendations.length > 0) {
      console.log('\n📝 Recommendations:');
      analysis.insights.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    // Example 2: Compare with your site
    console.log('\n' + '='.repeat(60));
    logger.section('Example 2: Site Comparison');

    const yourSite = 'https://instantautotraders.com'; // Replace with your site
    console.log(`Comparing "${yourSite}" for keyword: "${keyword}"\n`);

    const comparison = await competitorAnalyzer.compareWithCompetitors(
      yourSite,
      keyword,
      { limit: 10 }
    );

    console.log(`\n🎯 Your Position:`);
    console.log(`   Domain: ${comparison.yourSite.domain}`);
    console.log(`   Ranking: ${comparison.insights.youRank ? 'Yes ✅' : 'No ❌'}`);
    console.log(`   Position: ${comparison.yourSite.position}`);

    if (comparison.insights.youRank) {
      console.log(`   Competitors Above You: ${comparison.insights.competitorsAbove}`);
    }

    console.log('\n🏆 Top 3 Competitors:');
    comparison.topCompetitors.slice(0, 3).forEach(comp => {
      console.log(`   ${comp.position}. ${comp.domain}`);
    });

    if (comparison.insights.opportunities.length > 0) {
      console.log('\n💡 Opportunities:');
      comparison.insights.opportunities.forEach(opp => {
        console.log(`   - ${opp}`);
      });
    }

    // Example 3: Get backlinks (if Bing Webmaster configured)
    console.log('\n' + '='.repeat(60));
    logger.section('Example 3: Backlink Analysis');

    const backlinks = await competitorAnalyzer.getBacklinks(yourSite);

    if (backlinks) {
      console.log(`\n🔗 Backlinks for ${backlinks.siteUrl}:`);
      console.log(`   Total Backlinks: ${backlinks.totalBacklinks}`);
      console.log(`   Unique Domains: ${backlinks.insights.uniqueDomains}`);

      if (backlinks.backlinks.length > 0) {
        console.log('\n   Top 5 Backlinks:');
        backlinks.backlinks.slice(0, 5).forEach((link, i) => {
          console.log(`   ${i + 1}. ${link.sourceUrl}`);
          console.log(`      Anchor: "${link.anchorText}"`);
        });
      }
    } else {
      console.log('\n⚠️  Backlink analysis requires BING_WEBMASTER_API_KEY');
      console.log('   Add your site to Bing Webmaster Tools and get API key');
    }

    // Example 4: Multiple keywords
    console.log('\n' + '='.repeat(60));
    logger.section('Example 4: Bulk Keyword Analysis');

    const keywords = [
      'seo automation',
      'wordpress optimization',
      'content seo tools'
    ];

    console.log(`\nAnalyzing ${keywords.length} keywords...\n`);

    const bulkResults = await competitorAnalyzer.analyzeMultipleKeywords(keywords, {
      limit: 3
    });

    console.log(`\n📊 Bulk Analysis Results:`);
    console.log(`   Total Keywords: ${bulkResults.totalKeywords}`);
    console.log(`   Successful: ${bulkResults.successful}`);
    console.log(`   Failed: ${bulkResults.failed}`);

    bulkResults.results.forEach(result => {
      if (!result.error) {
        console.log(`\n   ✅ "${result.keyword}"`);
        console.log(`      Top 3: ${result.competitors.slice(0, 3).map(c => c.domain).join(', ')}`);
      } else {
        console.log(`\n   ❌ "${result.keyword}": ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Competitor analysis demo completed!\n');
    console.log('💡 Tips:');
    console.log('   - Run this regularly to track competitor changes');
    console.log('   - Export results to JSON for historical tracking');
    console.log('   - Use insights to improve your SEO strategy\n');

  } catch (error) {
    logger.error('Demo failed', error.message);
    console.log('\n❌ Error:', error.message);
    console.log('\n💡 Make sure you have configured at least one API key:');
    console.log('   - SERPAPI_KEY');
    console.log('   - VALUESERP_API_KEY');
    console.log('   - BING_WEBMASTER_API_KEY\n');
  }
}

main();
