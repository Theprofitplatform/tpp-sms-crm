#!/usr/bin/env node

/**
 * AI Content Optimization Example
 * Demonstrates how to use AI-powered content optimization
 */

import { aiOptimizer } from '../tasks/ai-content-optimizer.js';
import { wpClient } from '../tasks/fetch-posts.js';
import { logger } from '../tasks/logger.js';

// Sample post for testing (if WordPress not available)
const samplePost = {
  id: 123,
  title: {
    rendered: 'How to Improve Your Website Speed'
  },
  content: {
    rendered: `<p>Website speed is crucial for SEO and user experience. A slow website can hurt your rankings and drive visitors away.</p>
    <p>In this article, we'll explore several techniques to improve your website's loading time, including image optimization, caching, and CDN implementation.</p>
    <p>Many website owners overlook these simple optimizations that can make a huge difference in performance.</p>`
  },
  excerpt: {
    rendered: 'Learn how to make your website faster.'
  }
};

const sampleAudit = {
  issues: [
    { message: 'Title too short (34 characters)', severity: 'medium' },
    { message: 'Meta description missing', severity: 'high' },
    { message: 'Content length below 300 words', severity: 'medium' },
    { message: 'No internal links found', severity: 'low' }
  ]
};

async function main() {
  console.log('\n🤖 AI Content Optimization Demo\n');
  console.log('='.repeat(60));

  try {
    // Example 1: Full content optimization
    logger.section('Example 1: Complete Content Optimization');
    console.log('Analyzing sample post with AI...\n');

    const optimization = await aiOptimizer.optimizeContent(samplePost, sampleAudit);

    console.log(`📝 Post: ${optimization.post}`);
    console.log(`🤖 AI Source: ${optimization.source}\n`);
    console.log('💡 AI Suggestions:\n');

    optimization.suggestions.forEach((suggestion, i) => {
      console.log(`${i + 1}. ${suggestion.category}`);
      console.log(`   ${suggestion.suggestion}\n`);
    });

    // Example 2: Generate optimized titles
    console.log('='.repeat(60));
    logger.section('Example 2: Title Optimization');

    const targetKeyword = 'website speed optimization';
    console.log(`Target keyword: "${targetKeyword}"\n`);

    const titleSuggestions = await aiOptimizer.generateOptimizedTitle(
      samplePost,
      targetKeyword
    );

    console.log(`Current title: ${titleSuggestions.currentTitle}`);
    console.log(`\n🎯 AI-Generated Title Options:\n`);

    titleSuggestions.suggestions.forEach((title, i) => {
      console.log(`${i + 1}. ${title}`);
      console.log(`   Length: ${title.length} characters\n`);
    });

    // Example 3: Generate meta descriptions
    console.log('='.repeat(60));
    logger.section('Example 3: Meta Description Generation');

    const metaSuggestions = await aiOptimizer.generateMetaDescription(
      samplePost,
      targetKeyword
    );

    console.log(`Current excerpt: ${metaSuggestions.currentExcerpt.replace(/<[^>]*>/g, '')}`);
    console.log(`\n📄 AI-Generated Meta Descriptions:\n`);

    metaSuggestions.suggestions.forEach((desc, i) => {
      console.log(`${i + 1}. ${desc}`);
      console.log(`   Length: ${desc.length} characters\n`);
    });

    // Example 4: Keyword extraction
    console.log('='.repeat(60));
    logger.section('Example 4: AI Keyword Extraction');
    console.log('Extracting keywords from content...\n');

    const keywords = await aiOptimizer.extractKeywords(samplePost);

    if (keywords.keywords) {
      console.log(`🎯 Primary Keyword: ${keywords.keywords.primary || 'N/A'}\n`);

      if (keywords.keywords.secondary && keywords.keywords.secondary.length > 0) {
        console.log(`📌 Secondary Keywords:`);
        keywords.keywords.secondary.forEach(kw => {
          console.log(`   - ${kw}`);
        });
      }

      if (keywords.keywords.longTail && keywords.keywords.longTail.length > 0) {
        console.log(`\n🎪 Long-tail Opportunities:`);
        keywords.keywords.longTail.forEach(kw => {
          console.log(`   - ${kw}`);
        });
      }
    }

    // Example 5: Content improvement suggestions
    console.log('\n' + '='.repeat(60));
    logger.section('Example 5: Detailed Content Improvements');
    console.log('Getting specific improvement recommendations...\n');

    const improvements = await aiOptimizer.getContentImprovements(
      samplePost,
      sampleAudit
    );

    console.log(`📝 Post: ${improvements.postTitle}`);
    console.log(`🤖 Source: ${improvements.source}\n`);
    console.log('🔧 Recommended Improvements:\n');

    improvements.improvements.forEach((improvement, i) => {
      console.log(`${i + 1}. ${improvement}\n`);
    });

    // Example 6: Optimize a real WordPress post (optional)
    console.log('='.repeat(60));
    logger.section('Example 6: Optimize Real WordPress Post (Optional)');

    try {
      console.log('Fetching latest post from WordPress...\n');

      const posts = await wpClient.fetchAllPosts(1);

      if (posts && posts.length > 0) {
        const realPost = posts[0];
        console.log(`Found: ${realPost.title.rendered}\n`);

        const realOptimization = await aiOptimizer.optimizeContent(realPost, {
          issues: [
            { message: 'Checking for improvements', severity: 'low' }
          ]
        });

        console.log('💡 AI Suggestions for Your Post:\n');
        realOptimization.suggestions.slice(0, 5).forEach((s, i) => {
          console.log(`${i + 1}. ${s.category}: ${s.suggestion}\n`);
        });
      }
    } catch (error) {
      console.log('⚠️  Could not connect to WordPress (this is optional)');
      console.log('   Configure WordPress credentials in .env to test with real posts\n');
    }

    console.log('='.repeat(60));
    console.log('\n✅ AI content optimization demo completed!\n');
    console.log('💡 Integration Tips:');
    console.log('   - Use AI suggestions in your fix workflow');
    console.log('   - Combine with SEO audit for best results');
    console.log('   - Review AI suggestions before applying');
    console.log('   - Different AI models give different perspectives\n');

    console.log('📊 Cost Estimates (per 1000 posts):');
    console.log('   - Google Gemini: FREE (60 req/min)');
    console.log('   - OpenAI GPT-4o: ~$15-30');
    console.log('   - Claude 3.5: ~$20-40');
    console.log('   - Cohere: ~$0.40\n');

  } catch (error) {
    logger.error('Demo failed', error.message);
    console.log('\n❌ Error:', error.message);
    console.log('\n💡 Make sure you have configured at least one AI API key:');
    console.log('   - GOOGLE_GEMINI_API_KEY (FREE!)');
    console.log('   - OPENAI_API_KEY');
    console.log('   - ANTHROPIC_API_KEY');
    console.log('   - COHERE_API_KEY\n');
  }
}

main();
