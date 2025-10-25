/**
 * Charts and Analytics Module
 * Handles all data visualization and real-time chart updates
 */

// Chart instances
let performanceTrendChart = null;
let clientComparisonChart = null;
let activityTimelineChart = null;

// Socket.IO connection for real-time updates
let socket = null;

// Initialize Socket.IO connection
function initializeSocket() {
  if (socket) return;

  socket = io();

  socket.on('connect', () => {
    console.log('Socket.IO connected');
    addNotification('Connected to real-time updates', 'success');
  });

  socket.on('disconnect', () => {
    console.log('Socket.IO disconnected');
    addNotification('Disconnected from real-time updates', 'warning');
  });

  // Listen for real-time events
  socket.on('audit-completed', (data) => {
    console.log('Audit completed:', data);
    addNotification(`Audit completed for ${data.clientId}`, 'success');
    // Refresh analytics data
    setTimeout(() => loadAnalyticsData(), 2000);
  });

  socket.on('optimization-completed', (data) => {
    console.log('Optimization completed:', data);
    addNotification(`Optimization completed for ${data.clientId}`, 'success');
    setTimeout(() => loadAnalyticsData(), 2000);
  });

  socket.on('audit-failed', (data) => {
    console.log('Audit failed:', data);
    addNotification(`Audit failed for ${data.clientId}`, 'error');
  });

  socket.on('optimization-failed', (data) => {
    console.log('Optimization failed:', data);
    addNotification(`Optimization failed for ${data.clientId}`, 'error');
  });
}

// Add notification to UI
function addNotification(message, type = 'info') {
  // Create notification element if it doesn't exist
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Load analytics data and populate UI
 */
async function loadAnalyticsData() {
  try {
    // Load analytics summary
    const summaryRes = await fetch('/api/analytics/summary');
    const summaryData = await summaryRes.json();

    if (summaryData.success) {
      updateAnalyticsStats(summaryData.data);
    }

    // Load client metrics
    const metricsRes = await fetch('/api/analytics/clients/metrics');
    const metricsData = await metricsRes.json();

    if (metricsData.success) {
      updateClientMetricsTable(metricsData.data);
    }

    // Load and update charts
    await updateAllCharts();
  } catch (error) {
    console.error('Error loading analytics data:', error);
    addNotification('Failed to load analytics data', 'error');
  }
}

/**
 * Update analytics statistics cards
 */
function updateAnalyticsStats(data) {
  document.getElementById('analytics-total-audits').textContent = data.totalAudits || 0;
  document.getElementById('analytics-avg-score').textContent = data.averageScore || 0;
  document.getElementById('analytics-recent-audits').textContent = data.last30Days || 0;

  // Calculate total optimizations from client metrics
  const totalOptimizations = Object.values(data.clientMetrics || {})
    .reduce((sum, client) => sum + (client.totalOptimizations || 0), 0);
  document.getElementById('analytics-optimizations').textContent = totalOptimizations;
}

/**
 * Update client metrics table
 */
function updateClientMetricsTable(metrics) {
  const tbody = document.querySelector('#client-metrics-table tbody');
  if (!tbody) return;

  if (!metrics || Object.keys(metrics).length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No metrics data available yet. Run some audits to see analytics.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  Object.entries(metrics).forEach(([clientId, metric]) => {
    const row = document.createElement('tr');

    const lastUpdate = new Date(metric.lastUpdate);
    const daysAgo = Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
    const lastActivity = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

    row.innerHTML = `
      <td><strong>${formatClientName(clientId)}</strong></td>
      <td>${metric.totalAudits || 0}</td>
      <td>${metric.totalOptimizations || 0}</td>
      <td><span class="score-badge ${getScoreClass(metric.averageScore)}">${metric.averageScore || 'N/A'}</span></td>
      <td>${lastActivity}</td>
      <td><span class="status-badge active">Active</span></td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Get CSS class for score badge
 */
function getScoreClass(score) {
  if (!score) return '';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Format client name from ID
 */
function formatClientName(clientId) {
  return clientId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Update all charts
 */
async function updateAllCharts() {
  await Promise.all([
    updatePerformanceTrendChart(),
    updateClientComparisonChart(),
    updateActivityTimelineChart()
  ]);
}

/**
 * Update Performance Trend Chart
 */
async function updatePerformanceTrendChart() {
  try {
    const days = document.getElementById('trend-period')?.value || 30;
    const res = await fetch(`/api/analytics/daily-stats?days=${days}`);
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      // Generate sample data for demo
      const sampleData = generateSampleTrendData(days);
      renderPerformanceTrendChart(sampleData);
      return;
    }

    renderPerformanceTrendChart(data.data);
  } catch (error) {
    console.error('Error updating performance trend chart:', error);
    // Generate sample data on error
    const sampleData = generateSampleTrendData(30);
    renderPerformanceTrendChart(sampleData);
  }
}

/**
 * Generate sample trend data
 */
function generateSampleTrendData(days) {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString(),
      audits: Math.floor(Math.random() * 5) + 1,
      avgScore: Math.floor(Math.random() * 30) + 60
    });
  }

  return data;
}

/**
 * Render Performance Trend Chart
 */
function renderPerformanceTrendChart(data) {
  const ctx = document.getElementById('performance-trend-chart');
  if (!ctx) return;

  // Destroy existing chart
  if (performanceTrendChart) {
    performanceTrendChart.destroy();
  }

  const labels = data.map(d => d.date).slice(-30);
  const auditCounts = data.map(d => d.audits || 0).slice(-30);
  const avgScores = data.map(d => d.avgScore || 0).slice(-30);

  performanceTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Average Score',
          data: avgScores,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Audit Count',
          data: auditCounts,
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += context.parsed.y;
              if (context.dataset.label === 'Average Score') {
                label += '%';
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Score (%)'
          },
          min: 0,
          max: 100
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Audit Count'
          },
          grid: {
            drawOnChartArea: false
          },
          min: 0
        }
      }
    }
  });
}

/**
 * Update Client Comparison Chart
 */
async function updateClientComparisonChart() {
  try {
    const res = await fetch('/api/analytics/clients/metrics');
    const data = await res.json();

    if (!data.success || !data.data || Object.keys(data.data).length === 0) {
      // Generate sample data
      const sampleData = {
        'instant-auto-traders': { totalAudits: 15, totalOptimizations: 8, averageScore: 85 },
        'hot-tyres': { totalAudits: 12, totalOptimizations: 6, averageScore: 78 },
        'sadc-disability': { totalAudits: 10, totalOptimizations: 5, averageScore: 92 },
        'profit-platform': { totalAudits: 8, totalOptimizations: 4, averageScore: 88 }
      };
      renderClientComparisonChart(sampleData);
      return;
    }

    renderClientComparisonChart(data.data);
  } catch (error) {
    console.error('Error updating client comparison chart:', error);
  }
}

/**
 * Render Client Comparison Chart
 */
function renderClientComparisonChart(data) {
  const ctx = document.getElementById('client-comparison-chart');
  if (!ctx) return;

  if (clientComparisonChart) {
    clientComparisonChart.destroy();
  }

  const clients = Object.keys(data);
  const audits = clients.map(c => data[c].totalAudits || 0);
  const optimizations = clients.map(c => data[c].totalOptimizations || 0);
  const scores = clients.map(c => data[c].averageScore || 0);

  clientComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: clients.map(formatClientName),
      datasets: [
        {
          label: 'Audits',
          data: audits,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Optimizations',
          data: optimizations,
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Count'
          }
        }
      }
    }
  });
}

/**
 * Update Activity Timeline Chart
 */
async function updateActivityTimelineChart() {
  try {
    const res = await fetch('/api/analytics/performance?limit=50');
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      // Generate sample activity data
      const sampleData = generateSampleActivityData();
      renderActivityTimelineChart(sampleData);
      return;
    }

    renderActivityTimelineChart(data.data);
  } catch (error) {
    console.error('Error updating activity timeline chart:', error);
    const sampleData = generateSampleActivityData();
    renderActivityTimelineChart(sampleData);
  }
}

/**
 * Generate sample activity data
 */
function generateSampleActivityData() {
  const data = [];
  const today = new Date();
  const types = ['audit', 'optimization'];

  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString(),
      type: types[Math.floor(Math.random() * types.length)],
      count: Math.floor(Math.random() * 4) + 1
    });
  }

  return data;
}

/**
 * Render Activity Timeline Chart
 */
function renderActivityTimelineChart(data) {
  const ctx = document.getElementById('activity-timeline-chart');
  if (!ctx) return;

  if (activityTimelineChart) {
    activityTimelineChart.destroy();
  }

  // Group data by date and type
  const grouped = {};
  data.forEach(item => {
    const date = item.date;
    if (!grouped[date]) {
      grouped[date] = { audits: 0, optimizations: 0 };
    }
    if (item.type === 'audit') {
      grouped[date].audits++;
    } else if (item.type === 'optimization') {
      grouped[date].optimizations++;
    }
  });

  const labels = Object.keys(grouped).slice(-15);
  const audits = labels.map(date => grouped[date].audits);
  const optimizations = labels.map(date => grouped[date].optimizations);

  activityTimelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Audits',
          data: audits,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Optimizations',
          data: optimizations,
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          title: {
            display: true,
            text: 'Activity Count'
          }
        }
      }
    }
  });
}

/**
 * Update trend chart when period changes
 */
async function updateTrendChart() {
  await updatePerformanceTrendChart();
}

/**
 * Refresh all charts
 */
async function refreshCharts() {
  addNotification('Refreshing charts...', 'info');
  await loadAnalyticsData();
  addNotification('Charts updated', 'success');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize socket connection
  initializeSocket();

  // Load analytics data when analytics page is shown
  const analyticsNavLink = document.querySelector('[data-page="analytics"]');
  if (analyticsNavLink) {
    analyticsNavLink.addEventListener('click', () => {
      setTimeout(() => loadAnalyticsData(), 100);
    });
  }
});

// Export functions for use in app.js
window.loadAnalyticsData = loadAnalyticsData;
window.refreshCharts = refreshCharts;
window.updateTrendChart = updateTrendChart;
