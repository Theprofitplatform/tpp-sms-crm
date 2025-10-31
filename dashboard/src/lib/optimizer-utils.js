/**
 * AI Optimizer Utility Functions
 * Export, formatting, filtering, and calculation utilities
 */

/**
 * Export optimization history to CSV
 */
export function exportToCSV(data, filename = 'optimizations.csv') {
  const headers = [
    'Date',
    'Client',
    'Content Title',
    'Status',
    'Before Score',
    'After Score',
    'Improvement %',
    'Applied'
  ];
  
  const rows = data.map(item => [
    new Date(item.queuedAt).toLocaleDateString(),
    item.clientName,
    item.contentTitle,
    item.status,
    item.beforeScore || 'N/A',
    item.afterScore || 'N/A',
    item.improvement ? `${item.improvement}%` : 'N/A',
    item.appliedAt ? 'Yes' : 'No'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export optimization history to JSON
 */
export function exportToJSON(data, filename = 'optimizations.json') {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Download file helper
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filter optimizations by search query
 */
export function filterBySearch(data, searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') return data;
  
  const query = searchQuery.toLowerCase();
  return data.filter(item => 
    item.contentTitle?.toLowerCase().includes(query) ||
    item.clientName?.toLowerCase().includes(query) ||
    item.status?.toLowerCase().includes(query)
  );
}

/**
 * Filter optimizations by status
 */
export function filterByStatus(data, status) {
  if (!status || status === 'all') return data;
  return data.filter(item => item.status === status);
}

/**
 * Filter optimizations by client
 */
export function filterByClient(data, clientId) {
  if (!clientId || clientId === 'all') return data;
  return data.filter(item => item.clientId === clientId);
}

/**
 * Filter optimizations by date range
 */
export function filterByDateRange(data, startDate, endDate) {
  if (!startDate && !endDate) return data;
  
  return data.filter(item => {
    const itemDate = new Date(item.queuedAt);
    if (startDate && itemDate < new Date(startDate)) return false;
    if (endDate && itemDate > new Date(endDate)) return false;
    return true;
  });
}

/**
 * Filter optimizations by score improvement
 */
export function filterByImprovement(data, minImprovement) {
  if (!minImprovement) return data;
  return data.filter(item => (item.improvement || 0) >= minImprovement);
}

/**
 * Sort optimizations by field
 */
export function sortBy(data, field, direction = 'desc') {
  const sorted = [...data].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    // Handle date fields
    if (field.includes('At') || field === 'queuedAt') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    // Handle numeric fields
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Handle string fields
    const aStr = String(aVal || '').toLowerCase();
    const bStr = String(bVal || '').toLowerCase();
    
    if (direction === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
  
  return sorted;
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format score with color class
 */
export function getScoreColor(score) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get status badge variant
 */
export function getStatusVariant(status) {
  const variants = {
    pending: 'secondary',
    processing: 'default',
    completed: 'default',
    failed: 'destructive',
    rolled_back: 'outline'
  };
  return variants[status] || 'secondary';
}

/**
 * Get confidence badge color
 */
export function getConfidenceBadge(confidence) {
  const badges = {
    high: { variant: 'default', label: 'High Confidence' },
    medium: { variant: 'secondary', label: 'Medium' },
    low: { variant: 'outline', label: 'Low' }
  };
  return badges[confidence] || badges.medium;
}

/**
 * Calculate character count status (for title/meta)
 */
export function getCharCountStatus(length, min, max) {
  if (length < min) return { status: 'too_short', color: 'text-red-600' };
  if (length > max) return { status: 'too_long', color: 'text-red-600' };
  if (length >= min && length <= max) return { status: 'optimal', color: 'text-green-600' };
  return { status: 'ok', color: 'text-yellow-600' };
}

/**
 * Generate Google SERP preview data
 */
export function generateSERPPreview(title, url, meta) {
  // Truncate title to 60 chars (Google's typical limit)
  const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  
  // Truncate meta to 160 chars
  const displayMeta = meta.length > 160 ? meta.substring(0, 157) + '...' : meta;
  
  // Format URL for display
  const displayUrl = url ? new URL(url).hostname + ' › ' + new URL(url).pathname.substring(0, 30) : 'example.com';
  
  return {
    title: displayTitle,
    url: displayUrl,
    meta: displayMeta
  };
}

/**
 * Calculate aggregate statistics
 */
export function calculateStats(optimizations) {
  const completed = optimizations.filter(opt => opt.status === 'completed');
  const failed = optimizations.filter(opt => opt.status === 'failed');
  const applied = optimizations.filter(opt => opt.appliedAt);
  
  const avgImprovement = completed.length > 0
    ? Math.round(completed.reduce((sum, opt) => sum + (opt.improvement || 0), 0) / completed.length)
    : 0;
  
  const avgBeforeScore = completed.length > 0
    ? Math.round(completed.reduce((sum, opt) => sum + (opt.beforeScore || 0), 0) / completed.length)
    : 0;
  
  const avgAfterScore = completed.length > 0
    ? Math.round(completed.reduce((sum, opt) => sum + (opt.afterScore || 0), 0) / completed.length)
    : 0;
  
  const successRate = optimizations.length > 0
    ? Math.round((completed.length / optimizations.length) * 100)
    : 0;
  
  return {
    total: optimizations.length,
    completed: completed.length,
    failed: failed.length,
    applied: applied.length,
    avgImprovement,
    avgBeforeScore,
    avgAfterScore,
    successRate
  };
}

/**
 * Group optimizations by date
 */
export function groupByDate(optimizations) {
  const groups = {};
  
  optimizations.forEach(opt => {
    const date = new Date(opt.queuedAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(opt);
  });
  
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([date, items]) => ({ date, items }));
}

/**
 * Debounce function for search input
 */
export function debounce(func, wait) {
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
