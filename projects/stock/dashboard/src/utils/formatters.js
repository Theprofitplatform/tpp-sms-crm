/**
 * Formatters - Consistent number/currency/date formatting
 */

/**
 * Format currency value
 * @param {number} value - The value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted currency string
 *
 * @example
 * formatCurrency(125000.5) // "$125,000.50"
 * formatCurrency(1500000, { compact: true }) // "$1.5M"
 */
export function formatCurrency(value, options = {}) {
  const {
    decimals = 2,
    compact = false,
    showSign = false,
  } = options

  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : (showSign && value > 0 ? '+' : '')

  if (compact) {
    if (absValue >= 1e9) {
      return `${sign}$${(absValue / 1e9).toFixed(1)}B`
    }
    if (absValue >= 1e6) {
      return `${sign}$${(absValue / 1e6).toFixed(1)}M`
    }
    if (absValue >= 1e3) {
      return `${sign}$${(absValue / 1e3).toFixed(1)}K`
    }
  }

  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return `${sign}$${formatted}`
}

/**
 * Format percentage value
 * @param {number} value - The value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted percentage string
 *
 * @example
 * formatPercent(5.25) // "5.25%"
 * formatPercent(-2.5, { showSign: true }) // "-2.50%"
 */
export function formatPercent(value, options = {}) {
  const {
    decimals = 2,
    showSign = false,
  } = options

  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  const sign = value < 0 ? '' : (showSign && value > 0 ? '+' : '')
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Format number with thousands separator
 * @param {number} value - The value to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.5678, { decimals: 2 }) // "1,234.57"
 */
export function formatNumber(value, options = {}) {
  const {
    decimals = 0,
    compact = false,
  } = options

  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }

  if (compact) {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`
    }
    if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`
    }
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format quantity (integer)
 * @param {number} value - The value to format
 * @returns {string} Formatted quantity string
 */
export function formatQuantity(value) {
  return formatNumber(value, { decimals: 0 })
}

/**
 * Format price (2 decimals by default)
 * @param {number} value - The value to format
 * @returns {string} Formatted price string
 */
export function formatPrice(value) {
  return formatCurrency(value, { decimals: 2 })
}

/**
 * Format date/time
 * @param {string|Date} date - The date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z') // "Jan 15, 2024"
 * formatDate('2024-01-15T10:30:00Z', { time: true }) // "Jan 15, 2024 10:30 AM"
 */
export function formatDate(date, options = {}) {
  const {
    time = false,
    relative = false,
  } = options

  if (!date) return '-'

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return '-'
  }

  if (relative) {
    return formatRelativeTime(d)
  }

  const dateOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }

  if (time) {
    dateOptions.hour = 'numeric'
    dateOptions.minute = '2-digit'
  }

  return d.toLocaleString('en-US', dateOptions)
}

/**
 * Format relative time (e.g., "5 minutes ago")
 * @param {Date} date - The date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return formatDate(date)
}

/**
 * Format order ID (truncate for display)
 * @param {string} id - The order ID
 * @param {number} length - Max length
 * @returns {string} Truncated ID
 */
export function formatOrderId(id, length = 12) {
  if (!id) return '-'
  if (id.length <= length) return id
  return `${id.slice(0, length)}...`
}

/**
 * Get color class based on value
 * @param {number} value - The value to evaluate
 * @returns {string} CSS class name
 */
export function getValueColorClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}

/**
 * Get variant based on value for components
 * @param {number} value - The value to evaluate
 * @returns {string} Variant name
 */
export function getValueVariant(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'default'
}
