/**
 * Unified Dashboard - Main Application
 *
 * Navigation, initialization, Socket.IO, and global event handlers
 */

// ============================================
// Global State
// ============================================

const AppState = {
  currentSection: 'dashboard',
  currentClient: null,
  socket: null,
  refreshIntervals: {},
  user: loadFromStorage('user', { name: 'Admin' })
};

// ============================================
// Application Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 SEO Automation Dashboard initializing...');

  initializeNavigation();
  initializeSocket();
  initializeSidebar();
  loadInitialSection();

  console.log('✅ Dashboard initialized successfully');
});

// ============================================
// Navigation System
// ============================================

function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      if (section) {
        navigateTo(section);
      }
    });
  });
}

function navigateTo(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.classList.remove('active'));

  // Show target section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
    AppState.currentSection = sectionName;

    // Update active nav link
    updateActiveNavLink(sectionName);

    // Load section data
    loadSectionData(sectionName);

    // Save to history
    if (history.pushState) {
      history.pushState({ section: sectionName }, '', `#${sectionName}`);
    }
  } else {
    console.error(`Section "${sectionName}" not found`);
  }
}

function updateActiveNavLink(sectionName) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('data-section') === sectionName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function loadInitialSection() {
  // Check URL hash
  const hash = window.location.hash.substring(1);
  const section = hash || 'dashboard';
  navigateTo(section);
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.section) {
    navigateTo(e.state.section);
  }
});

// ============================================
// Section Data Loading
// ============================================

function loadSectionData(sectionName) {
  // Clear existing refresh intervals
  clearRefreshIntervals();

  switch (sectionName) {
    case 'dashboard':
      loadDashboardSection();
      break;
    case 'clients':
      loadClientsSection();
      break;
    case 'analytics':
      loadAnalyticsSection();
      break;
    case 'recommendations':
      loadRecommendationsSection();
      break;
    case 'goals':
      loadGoalsSection();
      break;
    case 'automation':
      loadAutomationSection();
      break;
    case 'autofix':
      loadAutoFixSection();
      break;
    case 'campaigns':
      loadCampaignsSection();
      break;
    case 'reports':
      loadReportsSection();
      break;
    case 'whitelabel':
      loadWhiteLabelSection();
      break;
    case 'webhooks':
      loadWebhooksSection();
      break;
    default:
      console.warn(`No loader defined for section: ${sectionName}`);
  }
}

// ============================================
// Socket.IO Integration
// ============================================

function initializeSocket() {
  try {
    AppState.socket = io(CONFIG.SOCKET_URL);

    AppState.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      showToast('success', 'Connected', 'Real-time updates enabled');
    });

    AppState.socket.on('disconnect', () => {
      console.log('⚠️ WebSocket disconnected');
      showToast('warning', 'Disconnected', 'Real-time updates paused');
    });

    // Listen for real-time events
    AppState.socket.on('audit-completed', (data) => {
      showToast('success', 'Audit Complete', `Audit completed for client: ${data.clientId}`);
      EventBus.emit('refresh-dashboard');
    });

    AppState.socket.on('optimization-completed', (data) => {
      showToast('success', 'Optimization Complete', `Optimization completed for client: ${data.clientId}`);
      EventBus.emit('refresh-dashboard');
    });

    AppState.socket.on('audit-failed', (data) => {
      showToast('error', 'Audit Failed', `Audit failed for ${data.clientId}: ${data.error}`);
    });

    AppState.socket.on('optimization-failed', (data) => {
      showToast('error', 'Optimization Failed', `Optimization failed for ${data.clientId}: ${data.error}`);
    });

  } catch (error) {
    console.error('Socket.IO initialization error:', error);
  }
}

// ============================================
// Sidebar Management
// ============================================

function initializeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const mobileOverlay = document.querySelector('.mobile-overlay');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (mobileOverlay) {
        mobileOverlay.classList.toggle('active');
      }
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      mobileOverlay.classList.remove('active');
    });
  }
}

// ============================================
// Auto-Refresh Management
// ============================================

function setRefreshInterval(name, callback, interval) {
  // Clear existing interval
  if (AppState.refreshIntervals[name]) {
    clearInterval(AppState.refreshIntervals[name]);
  }

  // Set new interval
  AppState.refreshIntervals[name] = setInterval(callback, interval);
}

function clearRefreshIntervals() {
  Object.values(AppState.refreshIntervals).forEach(interval => {
    clearInterval(interval);
  });
  AppState.refreshIntervals = {};
}

// ============================================
// Global Search
// ============================================

const searchInput = document.getElementById('global-search');
if (searchInput) {
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
      performGlobalSearch(query);
    }
  }, 300));
}

async function performGlobalSearch(query) {
  console.log('Searching for:', query);
  // TODO: Implement global search
  // This could search across clients, reports, recommendations, etc.
}

// ============================================
// Global Event Listeners
// ============================================

// EventBus listeners for cross-component communication
EventBus.on('refresh-dashboard', () => {
  if (AppState.currentSection === 'dashboard') {
    loadDashboardSection();
  }
});

EventBus.on('clients-changed', () => {
  if (AppState.currentSection === 'clients') {
    loadClientsSection();
  }
  // Also refresh dashboard if visible
  if (AppState.currentSection === 'dashboard') {
    loadDashboardSection();
  }
});

EventBus.on('goals-changed', (clientId) => {
  if (AppState.currentSection === 'goals') {
    loadGoalsSection();
  }
});

EventBus.on('webhooks-changed', () => {
  if (AppState.currentSection === 'webhooks') {
    loadWebhooksSection();
  }
});

EventBus.on('campaigns-changed', () => {
  if (AppState.currentSection === 'campaigns') {
    loadCampaignsSection();
  }
});

// ============================================
// Error Handling
// ============================================

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  showToast('error', 'Application Error', 'An unexpected error occurred');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  showToast('error', 'Error', 'An unexpected error occurred');
});

// ============================================
// Cleanup on Page Unload
// ============================================

window.addEventListener('beforeunload', () => {
  clearRefreshIntervals();
  destroyAllCharts();
  if (AppState.socket) {
    AppState.socket.disconnect();
  }
});

// ============================================
// Utility Functions Available Globally
// ============================================

function refreshCurrentSection() {
  loadSectionData(AppState.currentSection);
  showToast('success', 'Refreshed', 'Data has been refreshed');
}

function setCurrentClient(clientId) {
  AppState.currentClient = clientId;
  saveToStorage('currentClient', clientId);
}

function getCurrentClient() {
  return AppState.currentClient || loadFromStorage('currentClient');
}

// ============================================
// Notifications Button
// ============================================

const notificationsBtn = document.getElementById('notifications-btn');
if (notificationsBtn) {
  notificationsBtn.addEventListener('click', () => {
    showToast('info', 'Notifications', 'No new notifications');
    // TODO: Implement notifications panel
  });
}

// ============================================
// Refresh Button
// ============================================

const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', refreshCurrentSection);
}

console.log('📱 App.js loaded successfully');
