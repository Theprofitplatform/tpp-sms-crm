/**
 * Audit → SerpBear Sync Integration
 * Automatically sync discovered keywords to SerpBear after audits
 */

import serpbearAPI from './serpbear-api.js';

/**
 * Sync audit results to SerpBear
 * @param {string} domain - Client domain
 * @param {object} auditResults - Results from SEO audit
 * @param {object} gscData - Google Search Console data (if available)
 */
export async function syncAuditToSerpBear(domain, auditResults, gscData = null) {
  console.log('\n🔄 Syncing audit results to SerpBear...\n');

  try {
    // 1. Ensure domain exists in SerpBear
    const domains = await serpbearAPI.getDomains();
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const domainExists = domains.some(d => d.domain === cleanDomain);

    if (!domainExists) {
      console.log(`➕ Adding domain to SerpBear: ${cleanDomain}`);
      await serpbearAPI.addDomain(cleanDomain);
    }

    // 2. Import high-value keywords from GSC
    if (gscData && gscData.length > 0) {
      console.log(`\n📊 Analyzing ${gscData.length} GSC keywords...`);
      
      await serpbearAPI.importFromGSC(domain, gscData, {
        minImpressions: 50,      // Must have at least 50 impressions
        maxPosition: 30,         // Position 1-30 (page 1-3)
        limit: 50,               // Top 50 opportunities
        tags: 'gsc-auto,high-value'
      });
    }

    // 3. Extract keywords from meta titles and H1s
    const onPageKeywords = extractOnPageKeywords(auditResults);
    if (onPageKeywords.length > 0) {
      console.log(`\n📝 Found ${onPageKeywords.length} on-page target keywords`);
      
      await serpbearAPI.addKeywords(domain, onPageKeywords, {
        device: 'both',
        tags: 'on-page-target'
      });
    }

    // 4. Get current ranking stats
    console.log('\n📈 Fetching current ranking stats...\n');
    const stats = await serpbearAPI.getRankingStats(domain);
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║      SerpBear Ranking Summary          ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Total Keywords: ${stats.totalKeywords}`);
    console.log(`Average Position: ${stats.averagePosition}`);
    console.log(`Top 3 Rankings: ${stats.top3}`);
    console.log(`Top 10 Rankings: ${stats.top10}`);
    console.log(`Top 20 Rankings: ${stats.top20}`);
    console.log(`Unranked: ${stats.unranked}`);
    console.log('');

    // 5. Trigger ranking refresh
    console.log('🔄 Triggering ranking refresh...\n');
    await serpbearAPI.refreshKeywords(domain);

    return {
      success: true,
      stats,
      message: 'Audit data synced to SerpBear successfully'
    };

  } catch (error) {
    console.error('❌ Error syncing to SerpBear:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract target keywords from audit results
 * Looks at meta titles, H1 tags, and focus keywords
 */
function extractOnPageKeywords(auditResults) {
  const keywords = new Set();

  if (!auditResults || !auditResults.content) {
    return [];
  }

  // Extract from each audited page
  auditResults.content.forEach(page => {
    // Extract from title
    if (page.title) {
      const titleKeywords = extractKeywordsFromText(page.title);
      titleKeywords.forEach(kw => keywords.add(kw));
    }

    // Extract from H1
    if (page.h1Count > 0 && page.h1Tags) {
      page.h1Tags.forEach(h1 => {
        const h1Keywords = extractKeywordsFromText(h1);
        h1Keywords.forEach(kw => keywords.add(kw));
      });
    }

    // Extract from meta description (secondary keywords)
    if (page.description) {
      const descKeywords = extractKeywordsFromText(page.description);
      descKeywords.slice(0, 2).forEach(kw => keywords.add(kw)); // Top 2 only
    }
  });

  // Filter and clean
  return Array.from(keywords)
    .filter(kw => kw.length > 3 && kw.length < 60) // Reasonable length
    .filter(kw => !isStopPhrase(kw))                // Remove generic phrases
    .slice(0, 20);                                  // Limit to 20
}

/**
 * Extract meaningful keyword phrases from text
 * Uses simple heuristics - can be enhanced with NLP
 */
function extractKeywordsFromText(text) {
  if (!text) return [];

  // Remove common HTML entities and special chars
  const cleaned = text
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .toLowerCase();

  // Split into phrases (2-4 words)
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  const phrases = [];

  // Bigrams (2 words)
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  // Trigrams (3 words)
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return [...new Set(phrases)].slice(0, 5); // Top 5 unique phrases
}

/**
 * Check if phrase is too generic (stop phrase)
 */
function isStopPhrase(phrase) {
  const stopPhrases = [
    'home page',
    'contact us',
    'about us',
    'read more',
    'click here',
    'learn more',
    'get started',
    'sign up',
    'log in',
    'privacy policy',
    'terms conditions',
    'terms service'
  ];

  return stopPhrases.some(stop => phrase.includes(stop));
}

/**
 * Generate a ranking report from SerpBear data
 * For inclusion in client reports
 */
export async function generateRankingReport(domain, days = 30) {
  try {
    const stats = await serpbearAPI.getRankingStats(domain);
    const changes = await serpbearAPI.getPositionChanges(domain, days);

    return {
      stats,
      changes,
      summary: {
        totalImprovement: changes.improved.length,
        totalDecline: changes.declined.length,
        biggestWin: changes.improved[0] || null,
        biggestLoss: changes.declined[0] || null
      }
    };
  } catch (error) {
    console.error('Error generating ranking report:', error);
    return null;
  }
}

/**
 * Check if SerpBear is properly configured
 */
export function isSerpBearConfigured() {
  return !!(process.env.SERPBEAR_URL && process.env.SERPBEAR_TOKEN);
}
