#!/usr/bin/env node
/**
 * Performance Monitoring System
 * Tracks execution times, memory usage, and performance metrics
 */

import { logger } from '../audit/logger.js';
import fs from 'fs';
import path from 'path';

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
    this.thresholds = {
      slow: 1000,      // 1 second
      verySlow: 5000,  // 5 seconds
      critical: 10000  // 10 seconds
    };
  }

  /**
   * Start timing an operation
   */
  start(operationName) {
    this.timers.set(operationName, {
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed
    });
  }

  /**
   * End timing an operation and record metrics
   */
  end(operationName, metadata = {}) {
    const timer = this.timers.get(operationName);

    if (!timer) {
      logger.warn(`No timer found for operation: ${operationName}`);
      return null;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - timer.startTime;
    const memoryDelta = endMemory - timer.startMemory;

    const metric = {
      operation: operationName,
      duration,
      memoryDelta: Math.round(memoryDelta / 1024), // KB
      timestamp: new Date().toISOString(),
      status: this.getPerformanceStatus(duration),
      ...metadata
    };

    // Store metric
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    this.metrics.get(operationName).push(metric);

    // Log if slow
    if (duration > this.thresholds.slow) {
      const emoji = duration > this.thresholds.critical ? '🔴' :
                    duration > this.thresholds.verySlow ? '🟡' : '🟠';
      logger.warn(`${emoji} Slow operation: ${operationName} took ${duration}ms`);
    }

    this.timers.delete(operationName);
    return metric;
  }

  /**
   * Get performance status based on duration
   */
  getPerformanceStatus(duration) {
    if (duration > this.thresholds.critical) return 'critical';
    if (duration > this.thresholds.verySlow) return 'very_slow';
    if (duration > this.thresholds.slow) return 'slow';
    return 'good';
  }

  /**
   * Get statistics for an operation
   */
  getStats(operationName) {
    const metrics = this.metrics.get(operationName);

    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      operation: operationName,
      count: metrics.length,
      average: Math.round(sum / metrics.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: this.calculateMedian(durations),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99)
    };
  }

  /**
   * Calculate median
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || sorted[sorted.length - 1];
  }

  /**
   * Get all statistics
   */
  getAllStats() {
    const stats = {};

    for (const operationName of this.metrics.keys()) {
      stats[operationName] = this.getStats(operationName);
    }

    return stats;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const stats = this.getAllStats();
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: Object.keys(stats).length,
        totalMeasurements: Array.from(this.metrics.values())
          .reduce((sum, metrics) => sum + metrics.length, 0)
      },
      operations: stats,
      systemMetrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    return report;
  }

  /**
   * Save report to file
   */
  saveReport(filename = null) {
    const report = this.generateReport();
    const reportDir = path.join(process.cwd(), 'logs', 'performance');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = filename ||
      path.join(reportDir, `performance-${Date.now()}.json`);

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Performance report saved: ${reportFile}`);

    return reportFile;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.timers.clear();
    logger.info('Performance metrics cleared');
  }

  /**
   * Measure async function execution
   */
  async measure(operationName, fn, metadata = {}) {
    this.start(operationName);

    try {
      const result = await fn();
      this.end(operationName, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.end(operationName, { ...metadata, success: false, error: error.message });
      throw error;
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Example usage
/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new PerformanceMonitor();

  // Simulate some operations
  async function simulateOperations() {
    // Fast operation
    monitor.start('fast-operation');
    await new Promise(resolve => setTimeout(resolve, 100));
    monitor.end('fast-operation');

    // Slow operation
    monitor.start('slow-operation');
    await new Promise(resolve => setTimeout(resolve, 1500));
    monitor.end('slow-operation');

    // Another fast operation
    monitor.start('fast-operation');
    await new Promise(resolve => setTimeout(resolve, 200));
    monitor.end('fast-operation');

    // Generate and display report
    const report = monitor.generateReport();
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE REPORT');
    console.log('='.repeat(60));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(60));

    // Save report
    monitor.saveReport();
  }

  simulateOperations().catch(console.error);
}

export default PerformanceMonitor;
