/**
 * Dashboard API - Client Overview
 * Endpoint: /api/dashboard
 */

export async function onRequestGet(context) {
  try {
    // For Cloudflare Functions, we'll return mock data for now
    // In production, this would connect to KV storage or D1 database
    
    const clientData = {
      success: true,
      clients: [
        {
          id: 'instantautotraders',
          name: 'Instant Auto Traders',
          url: 'https://instantautotraders.com.au',
          status: 'active',
          package: 'Premium',
          reportCount: 12,
          contact: 'client@example.com',
          started: '2024-01-15',
          envConfigured: true,
          envExists: true,
          latestReport: {
            name: 'seo-audit-2024-10-22.html',
            date: new Date().toISOString()
          }
        }
      ],
      stats: {
        total: 1,
        active: 1,
        pending: 0,
        inactive: 0,
        configured: 1,
        needsSetup: 0
      }
    };

    return new Response(JSON.stringify(clientData), {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
