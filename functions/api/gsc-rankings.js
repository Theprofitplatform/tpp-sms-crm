/**
 * Google Search Console - Keyword Rankings
 * Endpoint: /api/gsc-rankings
 *
 * Returns keyword ranking data from GSC API
 */

import { getKeywordRankings } from './_gsc-helper.js';

export async function onRequestPost(context) {
  try {
    const { siteUrl, startDate, endDate, limit = 100 } = await context.request.json();

    // Validate input
    if (!siteUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'siteUrl is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get service account credentials from environment
    const serviceAccountJson = context.env.GSC_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GSC service account not configured',
        message: 'Please set GSC_SERVICE_ACCOUNT environment variable in Cloudflare dashboard'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse credentials
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Fetch real GSC rankings
    const rankings = await getKeywordRankings(serviceAccount, siteUrl, {
      startDate,
      endDate,
      rowLimit: limit
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        siteUrl,
        period: `${startDate || 'last 30 days'} to ${endDate || 'today'}`,
        rankings: rankings.slice(0, limit),
        totalKeywords: rankings.length,
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
