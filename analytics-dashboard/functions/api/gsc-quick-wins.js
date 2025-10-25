/**
 * Google Search Console - Quick Wins
 * Endpoint: /api/gsc-quick-wins
 * 
 * Finds keywords ranking positions 11-20 (easy wins)
 */

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

    // Mock data - replace with real GSC API call
    const mockData = {
      success: true,
      data: {
        total: 12,
        opportunities: [
          {
            keyword: 'sell my car instant quote',
            position: 15,
            clicks: 8,
            impressions: 520,
            ctr: 1.54,
            estimatedGain: '+45 clicks/month if moved to position 5'
          },
          {
            keyword: 'instant car valuation',
            position: 18,
            clicks: 3,
            impressions: 210,
            ctr: 1.43,
            estimatedGain: '+15 clicks/month if moved to position 5'
          },
          {
            keyword: 'car buyers sydney',
            position: 12,
            clicks: 15,
            impressions: 450,
            ctr: 3.33,
            estimatedGain: '+20 clicks/month if moved to position 5'
          }
        ],
        estimatedTrafficGain: 80,
        note: 'Quick wins are keywords ranking 11-20. Small improvements = big gains!'
      }
    };

    return new Response(JSON.stringify(mockData), {
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
