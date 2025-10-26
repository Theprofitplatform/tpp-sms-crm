/**
 * Unified Dashboard - Analytics Section
 *
 * Load and display analytics data with charts and export functionality
 */

let currentAnalyticsClient = null;
let currentTimeframe = '30d';

async function loadAnalyticsSection() {
  console.log('📈 Loading analytics section...');

  // Load client selector
  await loadAnalyticsClientSelector();

  // Load analytics if a client is selected
  const clientId = getCurrentClient();
  if (clientId) {
    currentAnalyticsClient = clientId;
    await loadClientAnalytics(clientId);
  } else {
    showEmptyState('analytics-content', '📊', 'Select a Client', 'Choose a client to view analytics');
  }
}

// ============================================
// Client Selector
// ============================================

async function loadAnalyticsClientSelector() {
  const selector = document.getElementById('analytics-client-selector');
  if (!selector) return;

  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      selector.innerHTML = '<option value="">No clients found</option>';
      return;
    }

    let html = '<option value="">Select a client...</option>';
    response.clients.forEach(client => {
      const selected = client.id === currentAnalyticsClient ? 'selected' : '';
      html += `<option value="${client.id}" ${selected}>${client.name || client.id}</option>`;
    });

    selector.innerHTML = html;

    // Add event listener
    selector.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (clientId) {
        currentAnalyticsClient = clientId;
        setCurrentClient(clientId);
        await loadClientAnalytics(clientId);
      } else {
        showEmptyState('analytics-content', '📊', 'Select a Client', 'Choose a client to view analytics');
      }
    });

  } catch (error) {
    console.error('Error loading client selector:', error);
    selector.innerHTML = '<option value="">Error loading clients</option>';
  }
}

// ============================================
// Load Analytics Data
// ============================================

async function loadClientAnalytics(clientId) {
  const container = document.getElementById('analytics-content');
  if (!container) return;

  try {
    showLoading('analytics-content');

    // Load analytics data
    const response = await API.getAnalytics(clientId, currentTimeframe);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load analytics');
    }

    const analytics = response.analytics;

    // Build analytics UI
    let html = `
      <div class="analytics-container">
        <!-- Timeframe Selector -->
        <div class="analytics-header">
          <h3>Analytics Overview</h3>
          <div class="timeframe-selector">
            <select id="analytics-timeframe" class="form-select">
              <option value="7d" ${currentTimeframe === '7d' ? 'selected' : ''}>Last 7 Days</option>
              <option value="30d" ${currentTimeframe === '30d' ? 'selected' : ''}>Last 30 Days</option>
              <option value="90d" ${currentTimeframe === '90d' ? 'selected' : ''}>Last 90 Days</option>
            </select>
          </div>
        </div>

        <!-- Stats Summary -->
        <div class="analytics-stats-grid">
          ${buildAnalyticsStatsCards(analytics)}
        </div>

        <!-- Charts Row -->
        <div class="analytics-charts-row">
          <div class="chart-card">
            <div class="card-header">
              <h4>Ranking Trends</h4>
            </div>
            <div class="chart-container">
              <canvas id="analytics-ranking-chart"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <div class="card-header">
              <h4>Performance Distribution</h4>
            </div>
            <div class="chart-container">
              <canvas id="analytics-performance-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Data Tables -->
        <div class="analytics-tables">
          ${buildAnalyticsTables(analytics)}
        </div>

        <!-- Export Actions -->
        <div class="analytics-actions">
          <button class="btn btn-primary" onclick="exportAnalytics('csv')">
            📊 Export CSV
          </button>
          <button class="btn btn-primary" onclick="exportAnalytics('excel')">
            📑 Export Excel
          </button>
          <button class="btn btn-secondary" onclick="exportAnalytics('json')">
            📄 Export JSON
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Render charts
    renderAnalyticsCharts(analytics);

    // Add timeframe change listener
    const timeframeSelector = document.getElementById('analytics-timeframe');
    if (timeframeSelector) {
      timeframeSelector.addEventListener('change', async (e) => {
        currentTimeframe = e.target.value;
        await loadClientAnalytics(clientId);
      });
    }

  } catch (error) {
    console.error('Error loading analytics:', error);
    showEmptyState('analytics-content', '⚠️', 'Error', 'Failed to load analytics data');
  }
}

// ============================================
// Build Stats Cards
// ============================================

function buildAnalyticsStatsCards(analytics) {
  if (!analytics) return '';

  const rankings = analytics.rankings || {};
  const autoFixes = analytics.autoFixes || {};
  const localSeo = analytics.localSeo || {};
  const competitors = analytics.competitors || {};

  return `
    <div class="stat-card">
      <div class="stat-label">Average Ranking</div>
      <div class="stat-value">${rankings.average || 'N/A'}</div>
      <div class="stat-change ${rankings.trend === 'up' ? 'positive' : 'negative'}">
        ${rankings.trend === 'up' ? '↑' : '↓'} ${rankings.change || 0} positions
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Auto-Fixes Applied</div>
      <div class="stat-value">${autoFixes.totalApplied || 0}</div>
      <div class="stat-change positive">
        ${autoFixes.successRate || 0}% success rate
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Local SEO Score</div>
      <div class="stat-value">${localSeo.score || 0}/100</div>
      <div class="stat-change ${localSeo.trend === 'up' ? 'positive' : 'neutral'}">
        ${localSeo.change || 0} points this period
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label">Competitor Gap</div>
      <div class="stat-value">${competitors.averageGap || 'N/A'}</div>
      <div class="stat-change ${competitors.closing ? 'positive' : 'negative'}">
        ${competitors.closing ? 'Closing' : 'Widening'}
      </div>
    </div>
  `;
}

// ============================================
// Build Data Tables
// ============================================

function buildAnalyticsTables(analytics) {
  if (!analytics) return '';

  return `
    <div class="card">
      <div class="card-header">
        <h4>Top Keywords</h4>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Current Rank</th>
              <th>Previous Rank</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            ${buildTopKeywordsRows(analytics.rankings?.topKeywords)}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h4>Recent Auto-Fixes</h4>
      </div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
              <th>Impact</th>
            </tr>
          </thead>
          <tbody>
            ${buildAutoFixesRows(analytics.autoFixes?.recent)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildTopKeywordsRows(keywords) {
  if (!keywords || keywords.length === 0) {
    return '<tr><td colspan="4" class="text-center">No keyword data available</td></tr>';
  }

  return keywords.map(kw => `
    <tr>
      <td>${kw.keyword}</td>
      <td>${kw.currentRank}</td>
      <td>${kw.previousRank || 'N/A'}</td>
      <td class="${kw.change > 0 ? 'text-danger' : 'text-success'}">
        ${kw.change > 0 ? '+' : ''}${kw.change || 0}
      </td>
    </tr>
  `).join('');
}

function buildAutoFixesRows(fixes) {
  if (!fixes || fixes.length === 0) {
    return '<tr><td colspan="4" class="text-center">No auto-fixes applied yet</td></tr>';
  }

  return fixes.map(fix => `
    <tr>
      <td>${fix.type}</td>
      <td>${formatDate(fix.date, 'short')}</td>
      <td>${getBadgeHTML(fix.status, 'goal')}</td>
      <td>${fix.impact || 'Low'}</td>
    </tr>
  `).join('');
}

// ============================================
// Render Charts
// ============================================

function renderAnalyticsCharts(analytics) {
  if (!analytics) return;

  // Ranking trend chart
  if (analytics.rankings?.history) {
    const rankingData = {
      labels: analytics.rankings.history.map(h => formatDate(h.date, 'short')),
      datasets: [{
        label: 'Average Ranking',
        data: analytics.rankings.history.map(h => h.avgRank),
        borderColor: CONFIG.CHARTS.COLORS.primary,
        backgroundColor: `${CONFIG.CHARTS.COLORS.primary}20`,
        fill: true
      }]
    };

    createLineChart('analytics-ranking-chart', rankingData, {
      scales: {
        y: {
          reverse: true,
          beginAtZero: false
        }
      }
    });
  }

  // Performance distribution chart
  if (analytics.localSeo?.distribution) {
    const perfData = {
      labels: ['Excellent', 'Good', 'Fair', 'Poor'],
      data: [
        analytics.localSeo.distribution.excellent || 0,
        analytics.localSeo.distribution.good || 0,
        analytics.localSeo.distribution.fair || 0,
        analytics.localSeo.distribution.poor || 0
      ],
      colors: [
        CONFIG.CHARTS.COLORS.success,
        CONFIG.CHARTS.COLORS.info,
        CONFIG.CHARTS.COLORS.warning,
        CONFIG.CHARTS.COLORS.danger
      ]
    };

    createDoughnutChart('analytics-performance-chart', perfData);
  }
}

// ============================================
// Export Functions
// ============================================

async function exportAnalytics(format) {
  if (!currentAnalyticsClient) {
    showToast('warning', 'No Client Selected', 'Please select a client first');
    return;
  }

  try {
    showToast('info', 'Exporting...', `Generating ${format.toUpperCase()} export`);

    const response = await API.exportAnalytics(currentAnalyticsClient, format, currentTimeframe);

    if (response.success) {
      // Trigger download
      const filename = `analytics-${currentAnalyticsClient}-${currentTimeframe}.${format}`;
      downloadFile(response.data, filename, getContentType(format));

      showToast('success', 'Export Complete', `${format.toUpperCase()} file downloaded`);
    } else {
      throw new Error(response.error || 'Export failed');
    }

  } catch (error) {
    console.error('Export error:', error);
    showToast('error', 'Export Failed', error.message);
  }
}

function getContentType(format) {
  const types = {
    csv: 'text/csv',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json'
  };
  return types[format] || 'text/plain';
}

console.log('📈 Analytics.js fully loaded');
