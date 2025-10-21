#!/usr/bin/env node
/**
 * Error Tracking System
 * Captures and reports application errors
 */

import { logger } from '../audit/logger.js';
import fs from 'fs';
import path from 'path';

export class ErrorTracker {
  constructor(options = {}) {
    this.errors = [];
    this.maxErrors = options.maxErrors || 100;
    this.errorCounts = new Map();
    this.enabled = options.enabled !== false;

    if (this.enabled) {
      this.setupGlobalHandlers();
    }
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    // Catch uncaught exceptions
    /* istanbul ignore next */
    process.on('uncaughtException', (error) => {
      this.captureError(error, {
        type: 'uncaughtException',
        fatal: true
      });

      // Exit after logging
      process.exit(1);
    });

    // Catch unhandled promise rejections
    /* istanbul ignore next */
    process.on('unhandledRejection', (reason, promise) => {
      this.captureError(reason, {
        type: 'unhandledRejection',
        promise: promise.toString()
      });
    });

    logger.info('Error tracking initialized');
  }

  /**
   * Capture an error
   */
  captureError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack || 'No stack trace',
      type: error.name || 'Error',
      context: {
        ...context,
        node_version: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };

    // Add to errors array
    this.errors.push(errorRecord);

    // Limit array size
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Update error counts
    const errorKey = `${error.name}:${error.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log error
    logger.error('Error captured:', {
      message: error.message,
      type: error.name,
      ...context
    });

    return errorRecord;
  }

  /**
   * Capture error with additional context
   */
  captureException(error, context = {}) {
    return this.captureError(error, context);
  }

  /**
   * Capture a message as an error
   */
  captureMessage(message, level = 'error', context = {}) {
    const error = new Error(message);
    return this.captureError(error, { level, ...context });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(-count).reverse();
  }

  /**
   * Get error statistics
   */
  getStats() {
    const errorsByType = new Map();

    for (const error of this.errors) {
      const type = error.type;
      errorsByType.set(type, (errorsByType.get(type) || 0) + 1);
    }

    return {
      total: this.errors.length,
      byType: Object.fromEntries(errorsByType),
      mostCommon: this.getMostCommonErrors(5),
      recent: this.getRecentErrors(5)
    };
  }

  /**
   * Get most common errors
   */
  getMostCommonErrors(count = 5) {
    const sorted = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);

    return sorted.map(([error, count]) => ({
      error,
      count,
      percentage: Math.round((count / this.errors.length) * 100)
    }));
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
    this.errorCounts.clear();
    logger.info('Error tracking cleared');
  }

  /**
   * Generate error report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.errors,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version
      }
    };

    return report;
  }

  /**
   * Save error report to file
   */
  saveReport(filename = null) {
    const report = this.generateReport();
    const reportDir = path.join(process.cwd(), 'logs', 'errors');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = filename ||
      path.join(reportDir, `errors-${Date.now()}.json`);

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logger.info(`Error report saved: ${reportFile}`);

    return reportFile;
  }

  /**
   * Wrap a function with error tracking
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error, {
          ...context,
          function: fn.name,
          args: args.length
        });
        throw error;
      }
    };
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Example usage
/* istanbul ignore next */
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new ErrorTracker({ enabled: false }); // Disable global handlers for demo

  // Simulate some errors
  try {
    throw new Error('Test error 1');
  } catch (error) {
    tracker.captureError(error, { component: 'test' });
  }

  try {
    throw new TypeError('Test type error');
  } catch (error) {
    tracker.captureError(error, { component: 'test' });
  }

  try {
    throw new Error('Test error 1'); // Duplicate
  } catch (error) {
    tracker.captureError(error, { component: 'test' });
  }

  // Generate report
  const report = tracker.generateReport();
  console.log('\n' + '='.repeat(60));
  console.log('ERROR TRACKING REPORT');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));
  console.log('='.repeat(60));
}

export default ErrorTracker;
