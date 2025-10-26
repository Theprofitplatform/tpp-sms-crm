/**
 * Unified Dashboard - Dashboard Section
 *
 * Load and display dashboard overview, stats, charts, and activity
 */

async function loadDashboardSection() {
  console.log('📊 Loading dashboard section...');

  // Load all dashboard data in parallel
  await Promise.all([
    loadDashboardStats(),
    loadDashboardCharts(),
    loadRecentActivity(),
    loadQuickActions()
  ]);

  // Set up auto-refresh
  setRefreshInterval('dashboard', loadDashboardStats, CONFIG.REFRESH.DASHBOARD);
  setRefreshInterval('activity', loadRecentActivity, CONFIG.REFRESH.ACTIVITY);
}

// ============================================
// Stats Cards
// ============================================

async function loadDashboardStats() {
  try {
    const response = await API.getDashboardStats();

    if (!response.success) {
      throw new Error(response.error || 'Failed to load dashboard stats');
    }

    const { stats, clients } = response;

    // Update stat cards
    updateStatCard('total-clients', stats.total || 0, '+0 this month');
    updateStatCard('active-clients', stats.active || 0, `${stats.active || 0} active`);
    updateStatCard('pending-setup', stats['pending-setup'] || stats.pending || 0, 'Need attention');
    updateStatCard('total-optimizations', calculateTotalOptimizations(clients), 'All time');

    return { stats, clients };
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showToast('error', 'Error', 'Failed to load dashboard statistics');
    return null;
  }
}

function updateStatCard(id, value, change) {
  const valueElement = document.getElementById(`stat-${id}`);
  const changeElement = document.getElementById(`stat-${id}-change`);

  if (valueElement) {
    valueElement.textContent = formatNumber(value);
    animateNumber(valueElement, value);
  }

  if (changeElement) {
    changeElement.textContent = change;
  }
}

function animateNumber(element, targetValue) {
  const duration = 1000; // 1 second
  const steps = 30;
  const stepValue = targetValue / steps;
  let currentValue = 0;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentValue += stepValue;
    currentStep++;

    if (currentStep >= steps) {
      element.textContent = formatNumber(targetValue);
      clearInterval(interval);
    } else {
      element.textContent = formatNumber(Math.floor(currentValue));
    }
  }, duration / steps);
}

function calculateTotalOptimizations(clients) {
  if (!clients || !Array.isArray(clients)) return 0;

  return clients.reduce((total, client) => {
    return total + (client.totalOptimizations || 0);
  }, 0);
}

// ============================================
// Charts
// ============================================

async function loadDashboardCharts() {
  try {
    // Load analytics summary for charts
    const response = await API.getAnalyticsSummary();

    if (!response.success) {
      console.error('Failed to load analytics for charts');
      return;
    }

    const data = response.data || {};

    // Create client distribution chart
    await createClientDistributionChart(data);

    // Create activity trend chart
    await createActivityTrendChart();

    // Create performance overview chart
    await createPerformanceChart(data);

  } catch (error) {
    console.error('Error loading charts:', error);
  }
}

async function createClientDistributionChart(data) {
  const response = await API.getDashboardStats();
  if (!response.success) return;

  const stats = response.stats;

  buildClientDistributionChart('client-distribution-chart', {
    active: stats.active || 0,
    'pending-setup': stats['pending-setup'] || stats.pending || 0,
    inactive: stats.inactive || 0
  });
}

async function createActivityTrendChart() {
  try {
    const response = await API.getDailyStats(30);

    if (!response.success || !response.data) {
      return;
    }

    const dailyStats = response.data;

    // Prepare data for line chart
    const chartData = {
      labels: dailyStats.map(d => formatDate(d.date, 'short')),
      datasets: [
        {
          label: 'Audits',
          data: dailyStats.map(d => d.audits || 0),
          borderColor: CONFIG.CHARTS.COLORS.info,
          backgroundColor: `${CONFIG.CHARTS.COLORS.info}20`
        },
        {
          label: 'Optimizations',
          data: dailyStats.map(d => d.optimizations || 0),
          borderColor: CONFIG.CHARTS.COLORS.success,
          backgroundColor: `${CONFIG.CHARTS.COLORS.success}20`
        }
      ]
    };

    createLineChart('activity-trend-chart', chartData);

  } catch (error) {
    console.error('Error creating activity trend chart:', error);
  }
}

async function createPerformanceChart(data) {
  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      return;
    }

    const clients = response.clients.slice(0, 10); // Top 10 clients

    const performanceData = clients.map(client => ({
      clientName: client.name || client.id,
      score: calculatePerformanceScore(client)
    }));

    buildPerformanceChart('performance-chart', performanceData);

  } catch (error) {
    console.error('Error creating performance chart:', error);
  }
}

function calculatePerformanceScore(client) {
  // Simple scoring algorithm
  let score = 50; // Base score

  if (client.status === 'active') score += 20;
  if (client.envConfigured) score += 15;
  if (client.totalAudits > 0) score += 10;
  if (client.totalOptimizations > 0) score += 5;

  return Math.min(score, 100);
}

// ============================================
// Recent Activity Feed
// ============================================

async function loadRecentActivity() {
  const container = document.getElementById('activity-feed');
  if (!container) return;

  try {
    showLoading('activity-feed');

    const response = await API.getRecentActivity();

    if (!response.success || !response.data || response.data.length === 0) {
      showEmptyState('activity-feed', '📭', 'No Activity', 'No recent activity to display');
      return;
    }

    const activities = response.data;

    let html = '<div class="activity-feed">';

    activities.forEach(activity => {
      html += createActivityItemHTML(activity);
    });

    html += '</div>';

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading recent activity:', error);
    container.innerHTML = '<p class="text-secondary">Failed to load recent activity</p>';
  }
}

function createActivityItemHTML(activity) {
  const iconMap = {
    audit: { icon: '📊', class: 'info' },
    optimization: { icon: '⚡', class: 'success' },
    client_added: { icon: '➕', class: 'success' },
    error: { icon: '⚠️', class: 'danger' },
    report: { icon: '📄', class: 'info' }
  };

  const config = iconMap[activity.type] || { icon: '📝', class: 'info' };

  return `
    <div class="activity-item">
      <div class="activity-icon ${config.class}">
        ${config.icon}
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title || 'Activity'}</div>
        <div class="activity-description">${activity.description || ''}</div>
        <div class="activity-time">${formatRelativeTime(activity.timestamp || activity.date)}</div>
      </div>
    </div>
  `;
}

// ============================================
// Quick Actions
// ============================================

async function loadQuickActions() {
  const container = document.getElementById('quick-actions');
  if (!container) return;

  const actions = [
    {
      icon: '🔍',
      title: 'Run Audit',
      description: 'Audit a client website',
      action: 'showClientSelector("audit")'
    },
    {
      icon: '⚡',
      title: 'Optimize',
      description: 'Run optimization',
      action: 'showClientSelector("optimize")'
    },
    {
      icon: '➕',
      title: 'Add Client',
      description: 'Add new client',
      action: 'showClientModal()'
    },
    {
      icon: '📊',
      title: 'View Reports',
      description: 'Browse reports',
      action: 'navigateTo("reports")'
    },
    {
      icon: '📧',
      title: 'Send Campaign',
      description: 'Email campaign',
      action: 'showCampaignModal()'
    },
    {
      icon: '🎯',
      title: 'Set Goal',
      description: 'Create new goal',
      action: 'showClientSelector("goal")'
    }
  ];

  let html = '<div class="quick-actions-grid">';

  actions.forEach(action => {
    html += `
      <div class="quick-action-card" onclick="${action.action}">
        <div class="action-icon">${action.icon}</div>
        <div class="action-title">${action.title}</div>
        <div class="action-description">${action.description}</div>
      </div>
    `;
  });

  html += '</div>';

  container.innerHTML = html;
}

// ============================================
// Helper Functions
// ============================================

function showClientSelector(actionType) {
  // Create a simple client selector modal
  const modalId = 'client-selector-modal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Select Client</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <div id="client-selector-list">
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading clients...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  openModal(modalId);

  // Load clients
  loadClientSelectorList(actionType);
}

async function loadClientSelectorList(actionType) {
  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      document.getElementById('client-selector-list').innerHTML = '<p>No clients found</p>';
      return;
    }

    const clients = response.clients;

    let html = '<div class="client-selector-grid">';

    clients.forEach(client => {
      html += `
        <div class="client-selector-item" onclick="handleClientAction('${client.id}', '${actionType}')">
          <div class="client-name">${client.name || client.id}</div>
          <div class="client-status">${getBadgeHTML(client.status, 'client')}</div>
        </div>
      `;
    });

    html += '</div>';

    document.getElementById('client-selector-list').innerHTML = html;

  } catch (error) {
    console.error('Error loading clients:', error);
  }
}

async function handleClientAction(clientId, actionType) {
  closeModal('client-selector-modal');

  switch (actionType) {
    case 'audit':
      await runClientAudit(clientId);
      break;
    case 'optimize':
      await runClientOptimization(clientId);
      break;
    case 'goal':
      showGoalModal(clientId);
      break;
  }
}

async function runClientAudit(clientId) {
  showToast('info', 'Running Audit', `Starting audit for client: ${clientId}`);

  try {
    const response = await API.auditClient(clientId);

    if (response.success) {
      showToast('success', 'Audit Complete', `Audit completed successfully for ${clientId}`);
      EventBus.emit('refresh-dashboard');
    } else {
      throw new Error(response.error || 'Audit failed');
    }
  } catch (error) {
    showToast('error', 'Audit Failed', error.message);
  }
}

async function runClientOptimization(clientId) {
  showToast('info', 'Running Optimization', `Starting optimization for client: ${clientId}`);

  try {
    const response = await API.optimizeClient(clientId);

    if (response.success) {
      showToast('success', 'Optimization Complete', `Optimization completed successfully for ${clientId}`);
      EventBus.emit('refresh-dashboard');
    } else {
      throw new Error(response.error || 'Optimization failed');
    }
  } catch (error) {
    showToast('error', 'Optimization Failed', error.message);
  }
}

console.log('📊 Dashboard.js loaded successfully');
