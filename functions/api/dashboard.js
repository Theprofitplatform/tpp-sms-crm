/**
 * Dashboard API - Client Overview
 * Endpoint: /api/dashboard
 *
 * Returns data for all configured clients
 */

export async function onRequestGet(context) {
  try {
    // Client configuration - matches clients/clients-config.json
    const clientsConfig = {
      instantautotraders: {
        name: 'Instant Auto Traders',
        url: 'https://instantautotraders.com.au',
        package: 'Professional',
        status: 'active'
      },
      theprofitplatform: {
        name: 'The Profit Platform',
        url: 'https://theprofitplatform.com.au',
        package: 'Internal',
        status: 'non-wordpress'
      },
      hottyres: {
        name: 'Hot Tyres',
        url: 'https://www.hottyres.com.au',
        package: 'Professional',
        status: 'active'
      },
      sadcdisabilityservices: {
        name: 'SADC Disability Services',
        url: 'https://sadcdisabilityservices.com.au',
        package: 'Professional',
        status: 'active'
      }
    };

    // Build client array
    const clients = Object.keys(clientsConfig).map(id => ({
      id,
      name: clientsConfig[id].name,
      url: clientsConfig[id].url,
      status: clientsConfig[id].status,
      package: clientsConfig[id].package,
      gscConfigured: true, // All have GSC configured
      envExists: true
    }));

    // Calculate stats
    const stats = {
      total: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      pending: 0,
      inactive: clients.filter(c => c.status !== 'active').length,
      configured: clients.length,
      needsSetup: 0
    };

    return new Response(JSON.stringify({
      success: true,
      clients,
      stats,
      timestamp: new Date().toISOString()
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
