/**
 * Google Search Console - Site Metrics
 * Endpoint: /api/gsc-metrics
 * 
 * Returns overall site performance metrics from GSC
 */

export async function onRequestPost(context) {
  try {
    const { siteUrl, days = 30 } = await context.request.json();

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
      // Return mock data with setup instructions
      const mockData = {
        success: true,
        isMockData: true,
        data: {
          totalClicks: 1247,
          totalImpressions: 45680,
          averageCTR: '2.73',
          averagePosition: '18.5',
          period: `Last ${days} days`,
          trend: {
            clicks: '+12%',
            impressions: '+8%',
            ctr: '+0.3%',
            position: '-2.1 (improved)'
          }
        },
        setup: {
          required: true,
          message: 'To see real GSC data:',
          steps: [
            '1. Create service account in Google Cloud Console',
            '2. Download JSON credentials',
            '3. Add to Cloudflare Pages environment variables as GSC_SERVICE_ACCOUNT',
            '4. Grant access in Google Search Console'
          ]
        }
      };

      return new Response(JSON.stringify(mockData), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // TODO: Implement real GSC API call
    // const credentials = JSON.parse(serviceAccountJson);
    // Use google-auth-library to authenticate and fetch data

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalClicks: 0,
        totalImpressions: 0,
        averageCTR: '0.00',
        averagePosition: '0.0',
        period: `Last ${days} days`,
        note: 'GSC API implementation pending'
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
