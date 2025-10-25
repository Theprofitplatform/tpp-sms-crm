/**
 * Google Search Console API Helper for Cloudflare Workers
 * Lightweight JWT-based authentication without googleapis dependency
 */

/**
 * Create JWT token for Google Service Account authentication
 */
async function createJWT(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Get OAuth2 access token
 */
async function getAccessToken(serviceAccount) {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Query Google Search Console API
 */
export async function queryGSC(serviceAccount, siteUrl, options = {}) {
  const {
    startDate = getDateDaysAgo(30),
    endDate = getDateDaysAgo(0),
    dimensions = ['query'],
    rowLimit = 1000
  } = options;

  const accessToken = await getAccessToken(serviceAccount);

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit,
        dataState: 'final'
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GSC API failed: ${response.statusText} - ${error}`);
  }

  return await response.json();
}

/**
 * Get site metrics summary
 */
export async function getSiteMetrics(serviceAccount, siteUrl, days = 30) {
  const data = await queryGSC(serviceAccount, siteUrl, {
    startDate: getDateDaysAgo(days),
    endDate: getDateDaysAgo(0),
    dimensions: []
  });

  if (!data.rows || data.rows.length === 0) {
    return {
      totalClicks: 0,
      totalImpressions: 0,
      averageCTR: '0.00',
      averagePosition: '0.0',
      period: `Last ${days} days`
    };
  }

  const row = data.rows[0];
  return {
    totalClicks: row.clicks,
    totalImpressions: row.impressions,
    averageCTR: (row.ctr * 100).toFixed(2),
    averagePosition: row.position.toFixed(1),
    period: `Last ${days} days`
  };
}

/**
 * Get keyword rankings
 */
export async function getKeywordRankings(serviceAccount, siteUrl, options = {}) {
  const data = await queryGSC(serviceAccount, siteUrl, {
    ...options,
    dimensions: options.dimensions || ['query', 'page']
  });

  if (!data.rows || data.rows.length === 0) {
    return [];
  }

  return data.rows.map(row => ({
    keyword: row.keys[0],
    page: row.keys[1] || siteUrl,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: (row.ctr * 100).toFixed(2),
    position: Math.round(row.position)
  }));
}

/**
 * Find quick win opportunities (ranking 11-20)
 */
export async function findQuickWins(serviceAccount, siteUrl) {
  const rankings = await getKeywordRankings(serviceAccount, siteUrl);

  const quickWins = rankings.filter(r => r.position > 10 && r.position <= 20);
  quickWins.sort((a, b) => b.impressions - a.impressions);

  const estimatedGain = quickWins.reduce((sum, opp) => {
    const currentCTR = getExpectedCTR(opp.position);
    const targetCTR = getExpectedCTR(5);
    return sum + (opp.impressions * (targetCTR - currentCTR));
  }, 0);

  return {
    total: quickWins.length,
    opportunities: quickWins.slice(0, 50),
    estimatedTrafficGain: Math.round(estimatedGain)
  };
}

// Helper functions

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getExpectedCTR(position) {
  const ctrByPosition = {
    1: 0.316, 2: 0.158, 3: 0.100, 4: 0.077, 5: 0.061,
    6: 0.050, 7: 0.042, 8: 0.036, 9: 0.031, 10: 0.027,
    11: 0.018, 12: 0.015, 13: 0.013, 14: 0.011, 15: 0.010,
    16: 0.008, 17: 0.007, 18: 0.006, 19: 0.005, 20: 0.004
  };
  return ctrByPosition[Math.round(position)] || 0.003;
}

function base64UrlEncode(input) {
  if (typeof input === 'string') {
    input = new TextEncoder().encode(input);
  }
  if (input instanceof ArrayBuffer) {
    input = new Uint8Array(input);
  }

  const base64 = btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
