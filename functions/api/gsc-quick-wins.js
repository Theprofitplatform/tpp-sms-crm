/**
 * Google Search Console - Quick Wins
 * Endpoint: /api/gsc-quick-wins
 *
 * Finds keywords ranking positions 11-20 (easy wins)
 */

import { findQuickWins } from './_gsc-helper.js';

export async function onRequestPost(context) {
  try {
    const { siteUrl } = await context.request.json();

    if (!siteUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'siteUrl is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for service account
    const serviceAccountJson = context.env.GSC_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
      return new Response(JSON.stringify({
        success: false,
        error: 'GSC service account not configured',
        setup_url: 'https://github.com/your-repo/docs/gsc-setup.md'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse service account credentials
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Fetch real quick wins from GSC
    const quickWins = await findQuickWins(serviceAccount, siteUrl);

    return new Response(JSON.stringify({
      success: true,
      data: {
        total: quickWins.total,
        opportunities: quickWins.opportunities,
        estimatedTrafficGain: quickWins.estimatedTrafficGain,
        note: 'Quick wins are keywords ranking 11-20. Small improvements = big gains!'
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
