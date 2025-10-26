/**
 * Unified Dashboard - Utility Functions
 *
 * Toast notifications, formatters, loaders, and helper functions
 */

// ============================================
// Toast Notifications
// ============================================

function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.TOAST.DURATION);
}

// ============================================
// Date & Time Formatting
// ============================================

function formatDate(date, format = 'full') {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const options = {
    full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    date: { year: 'numeric', month: 'long', day: 'numeric' },
    short: { month: 'short', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' }
  };

  return d.toLocaleDateString('en-US', options[format] || options.full);
}

function formatRelativeTime(date) {
  if (!date) return 'N/A';

  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

// ============================================
// Number Formatting
// ============================================

function formatNumber(number, decimals = 0) {
  if (number === null || number === undefined) return 'N/A';
  return Number(number).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A';
  return `${Number(value).toFixed(decimals)}%`;
}

function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

function formatCompactNumber(number) {
  if (number === null || number === undefined) return 'N/A';

  const abbrev = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.log10(Math.abs(number)) / 3 | 0;

  if (tier === 0) return number.toString();

  const suffix = abbrev[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = number / scale;

  return scaled.toFixed(1) + suffix;
}

// ============================================
// Loading States
// ============================================

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  `;
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const loading = element.querySelector('.loading');
  if (loading) loading.remove();
}

function showSkeleton(elementId, count = 3) {
  const element = document.getElementById(elementId);
  if (!element) return;

  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
    `;
  }

  element.innerHTML = html;
}

// ============================================
// Empty States
// ============================================

function showEmptyState(elementId, icon, title, description) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h4 class="empty-state-title">${title}</h4>
      <p class="empty-state-description">${description}</p>
    </div>
  `;
}

// ============================================
// String Utilities
// ============================================

function truncate(str, length = 50) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// Array Utilities
// ============================================

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (order === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
}

// ============================================
// DOM Utilities
// ============================================

function createElement(tag, className, innerHTML) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

function getElement(id) {
  return document.getElementById(id);
}

function getElements(selector) {
  return document.querySelectorAll(selector);
}

function show(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
}

function hide(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
}

function toggle(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (element.style.display === 'none') {
    element.style.display = 'block';
  } else {
    element.style.display = 'none';
  }
}

// ============================================
// Status Badge Generator
// ============================================

function getBadgeHTML(status, type = 'client') {
  const configs = {
    client: CONFIG.CLIENT_STATUSES,
    goal: CONFIG.GOAL_STATUSES,
    campaign: CONFIG.CAMPAIGN_STATUSES,
    priority: CONFIG.PRIORITIES
  };

  const config = configs[type];
  if (!config || !config[status.toUpperCase()]) {
    return `<span class="badge badge-gray">${status}</span>`;
  }

  const { label, color } = config[status.toUpperCase()];
  return `<span class="badge" style="background: ${color}20; color: ${color};">${label}</span>`;
}

// ============================================
// Progress Bar Generator
// ============================================

function getProgressHTML(current, target, showText = true) {
  const percent = Math.min((current / target) * 100, 100);

  return `
    <div class="goal-progress-container">
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width: ${percent}%"></div>
      </div>
      ${showText ? `<div class="goal-progress-text">${current} / ${target} (${percent.toFixed(0)}%)</div>` : ''}
    </div>
  `;
}

// ============================================
// Chart Color Palette
// ============================================

function getChartColors(count) {
  const colors = [
    '#667eea',
    '#764ba2',
    '#34a853',
    '#fbbc04',
    '#ea4335',
    '#4285f4',
    '#f093fb',
    '#4facfe',
    '#43e97b',
    '#fa709a'
  ];

  if (count <= colors.length) {
    return colors.slice(0, count);
  }

  // Generate more colors if needed
  const generated = [];
  for (let i = 0; i < count; i++) {
    generated.push(colors[i % colors.length]);
  }
  return generated;
}

// ============================================
// Debounce Function
// ============================================

function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// Copy to Clipboard
// ============================================

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('success', 'Copied!', 'Text copied to clipboard');
    return true;
  } catch (err) {
    showToast('error', 'Copy Failed', 'Could not copy to clipboard');
    return false;
  }
}

// ============================================
// Download File
// ============================================

function downloadFile(data, filename, type = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================
// Validation Helpers
// ============================================

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Local Storage Helpers
// ============================================

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Error saving to localStorage:', err);
    return false;
  }
}

function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error('Error loading from localStorage:', err);
    return defaultValue;
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error('Error removing from localStorage:', err);
    return false;
  }
}

// ============================================
// Event Emitter for Custom Events
// ============================================

const EventBus = {
  events: {},

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  },

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
};

// ============================================
// File Size Formatter
// ============================================

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${size} ${sizes[i]}`;
}

console.log('✅ Utils.js fully loaded');
