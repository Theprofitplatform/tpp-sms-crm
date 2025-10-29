import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Google Search Console Service
 * Integrates with GSC API using service account credentials
 * Based on SerpBear's implementation
 */

// Settings file path
const SETTINGS_PATH = path.join(__dirname, '../../data/gsc-settings.json');

/**
 * Load GSC settings from file
 */
export function loadGSCSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading GSC settings:', error);
  }
  return {
    propertyType: 'domain',
    propertyUrl: '',
    clientEmail: '',
    privateKey: '',
    connected: false
  };
}

/**
 * Save GSC settings to file
 */
export function saveGSCSettings(settings) {
  try {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving GSC settings:', error);
    return false;
  }
}

/**
 * Create authenticated GSC client
 */
export async function createGSCClient(clientEmail, privateKey) {
  try {
    if (!clientEmail || !privateKey) {
      throw new Error('Client email and private key are required');
    }

    // Fix formatting of private key (handle escaped newlines)
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail.trim(),
        private_key: formattedKey,
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const authClient = await auth.getClient();
    
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: authClient,
    });

    return searchconsole;
  } catch (error) {
    console.error('Error creating GSC client:', error);
    throw error;
  }
}

/**
 * Test GSC connection
 */
export async function testGSCConnection(clientEmail, privateKey, propertyUrl, propertyType = 'domain') {
  try {
    const searchconsole = await createGSCClient(clientEmail, privateKey);
    
    // Try to fetch data to verify connection
    const siteUrl = propertyType === 'domain' 
      ? `sc-domain:${propertyUrl}`
      : propertyUrl;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 5,
      },
    });

    return {
      success: true,
      message: 'Successfully connected to Google Search Console',
      dataAvailable: response.data.rows && response.data.rows.length > 0,
    };
  } catch (error) {
    console.error('GSC connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Google Search Console',
    };
  }
}

/**
 * Fetch GSC summary data
 */
export async function fetchGSCSummary(clientEmail, privateKey, propertyUrl, propertyType = 'domain', days = 30) {
  try {
    const searchconsole = await createGSCClient(clientEmail, privateKey);
    
    const siteUrl = propertyType === 'domain' 
      ? `sc-domain:${propertyUrl}`
      : propertyUrl;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Fetch top queries
    const queriesResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 50,
        dataState: 'final',
      },
    });

    // Fetch overall stats
    const statsResponse = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: [],
        dataState: 'final',
      },
    });

    // Parse queries
    const topQueries = (queriesResponse.data.rows || []).map(row => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2) + '%',
      position: row.position.toFixed(1),
    }));

    // Parse overall stats
    const stats = statsResponse.data.rows && statsResponse.data.rows.length > 0
      ? statsResponse.data.rows[0]
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return {
      topQueries,
      totalClicks: stats.clicks || 0,
      totalImpressions: stats.impressions || 0,
      avgCTR: ((stats.ctr || 0) * 100).toFixed(2),
      avgPosition: (stats.position || 0).toFixed(1),
      lastFetched: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching GSC summary:', error);
    throw error;
  }
}

/**
 * Fetch GSC data with stored settings
 */
export async function fetchGSCDataFromSettings() {
  const settings = loadGSCSettings();
  
  if (!settings.clientEmail || !settings.privateKey) {
    throw new Error('GSC credentials not configured. Please configure in Settings → Integrations.');
  }

  if (!settings.propertyUrl) {
    throw new Error('GSC property URL not configured. Please configure in Settings → Integrations.');
  }

  return await fetchGSCSummary(
    settings.clientEmail,
    settings.privateKey,
    settings.propertyUrl,
    settings.propertyType || 'domain'
  );
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
export function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Parse Search Console item (similar to SerpBear)
 */
export function parseSearchConsoleItem(item, domainName) {
  const { clicks = 0, impressions = 0, ctr = 0, position = 0 } = item;
  const keyword = item.keys[0];
  const device = item.keys[1] ? item.keys[1].toLowerCase() : 'desktop';
  const country = item.keys[2] || 'ZZ';
  const page = item.keys[3] 
    ? item.keys[3].replace('https://', '').replace('http://', '').replace(domainName, '')
    : '';

  return {
    keyword,
    device,
    country,
    clicks,
    impressions,
    ctr: ctr * 100,
    position: Math.round(position),
    page,
  };
}

export default {
  loadGSCSettings,
  saveGSCSettings,
  createGSCClient,
  testGSCConnection,
  fetchGSCSummary,
  fetchGSCDataFromSettings,
  getDateDaysAgo,
  parseSearchConsoleItem,
};
