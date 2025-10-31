/**
 * Performance Monitoring Utilities
 * 
 * Tracks Core Web Vitals and custom performance metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals'

/**
 * Report Web Vitals to console (development) or analytics (production)
 */
function sendToAnalytics(metric) {
  const { name, value, rating, id } = metric
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      id
    })
  }
  
  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to your analytics service
    // Example: Google Analytics, Plausible, etc.
    
    // For now, we can use navigator.sendBeacon
    const body = JSON.stringify({ name, value, rating, id })
    
    // Send to your analytics endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body)
    }
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initPerformanceMonitoring() {
  // Core Web Vitals
  onCLS(sendToAnalytics)  // Cumulative Layout Shift
  onFCP(sendToAnalytics)  // First Contentful Paint
  onLCP(sendToAnalytics)  // Largest Contentful Paint
  onTTFB(sendToAnalytics) // Time to First Byte
  onINP(sendToAnalytics)  // Interaction to Next Paint (replaces FID)
}

/**
 * Measure custom timing
 */
export function measureTiming(name, startTime) {
  const duration = performance.now() - startTime
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Timing] ${name}:`, `${Math.round(duration)}ms`)
  }
  
  return duration
}

/**
 * Mark a custom performance point
 */
export function mark(name) {
  if (performance.mark) {
    performance.mark(name)
  }
}

/**
 * Measure between two marks
 */
export function measure(name, startMark, endMark) {
  if (performance.measure) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0]
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Measure] ${name}:`, `${Math.round(measure.duration)}ms`)
      }
      
      return measure.duration
    } catch (error) {
      console.error('Performance measure error:', error)
    }
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  if (!performance.getEntriesByType) {
    return null
  }
  
  const navigation = performance.getEntriesByType('navigation')[0]
  const paint = performance.getEntriesByType('paint')
  
  return {
    // Navigation timing
    dnsLookup: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcpConnect: navigation?.connectEnd - navigation?.connectStart,
    ttfb: navigation?.responseStart - navigation?.requestStart,
    responseTime: navigation?.responseEnd - navigation?.responseStart,
    domParse: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
    domReady: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,
    loadComplete: navigation?.loadEventEnd - navigation?.fetchStart,
    
    // Paint timing
    fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
    
    // Memory (if available)
    memory: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
    } : null
  }
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics() {
  const metrics = getPerformanceMetrics()
  
  if (metrics) {
    console.table({
      'DNS Lookup': `${Math.round(metrics.dnsLookup)}ms`,
      'TCP Connect': `${Math.round(metrics.tcpConnect)}ms`,
      'TTFB': `${Math.round(metrics.ttfb)}ms`,
      'Response Time': `${Math.round(metrics.responseTime)}ms`,
      'DOM Parse': `${Math.round(metrics.domParse)}ms`,
      'DOM Ready': `${Math.round(metrics.domReady)}ms`,
      'Load Complete': `${Math.round(metrics.loadComplete)}ms`,
      'FCP': `${Math.round(metrics.fcp)}ms`
    })
    
    if (metrics.memory) {
      console.log('[Memory]', metrics.memory)
    }
  }
}
