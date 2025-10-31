/**
 * ALERT SERVICE
 * 
 * Monitor Local SEO performance and trigger alerts based on thresholds
 * Supports score drops, consistency issues, and competitive changes
 */

import { EventEmitter } from 'events';

export class AlertService extends EventEmitter {
  constructor(thresholds = {}) {
    super();
    
    this.thresholds = {
      criticalScore: thresholds.criticalScore || 30,
      warningScore: thresholds.warningScore || 50,
      targetScore: thresholds.targetScore || 80,
      napMinimum: thresholds.napMinimum || 85,
      scoreDrop: thresholds.scoreDrop || 10,
      ...thresholds
    };

    this.alerts = [];
    this.maxAlerts = 100; // Keep last 100 alerts
  }

  /**
   * Check client score and generate alerts
   */
  checkClientScore(clientId, currentScore, previousScore = null) {
    const alerts = [];

    // Critical score alert
    if (currentScore < this.thresholds.criticalScore) {
      alerts.push(this.createAlert({
        type: 'critical',
        category: 'score',
        clientId,
        message: `Critical: Score dropped to ${currentScore}/100 (threshold: ${this.thresholds.criticalScore})`,
        severity: 'critical',
        currentValue: currentScore,
        threshold: this.thresholds.criticalScore,
        action: 'Immediate attention required. Run full audit and implement fixes.'
      }));
    }
    // Warning score alert
    else if (currentScore < this.thresholds.warningScore) {
      alerts.push(this.createAlert({
        type: 'warning',
        category: 'score',
        clientId,
        message: `Warning: Score is ${currentScore}/100 (threshold: ${this.thresholds.warningScore})`,
        severity: 'warning',
        currentValue: currentScore,
        threshold: this.thresholds.warningScore,
        action: 'Schedule optimization review within 48 hours.'
      }));
    }

    // Score drop alert
    if (previousScore !== null && (previousScore - currentScore) >= this.thresholds.scoreDrop) {
      const drop = previousScore - currentScore;
      alerts.push(this.createAlert({
        type: 'score_drop',
        category: 'performance',
        clientId,
        message: `Score dropped ${drop} points (from ${previousScore} to ${currentScore})`,
        severity: drop >= 20 ? 'critical' : 'warning',
        currentValue: currentScore,
        previousValue: previousScore,
        change: -drop,
        action: 'Investigate recent changes and run diagnostic audit.'
      }));
    }

    // Target achievement alert (positive)
    if (currentScore >= this.thresholds.targetScore && 
        (previousScore === null || previousScore < this.thresholds.targetScore)) {
      alerts.push(this.createAlert({
        type: 'achievement',
        category: 'milestone',
        clientId,
        message: `Success: Score reached target ${currentScore}/100 (target: ${this.thresholds.targetScore})`,
        severity: 'info',
        currentValue: currentScore,
        threshold: this.thresholds.targetScore,
        action: 'Maintain current optimization strategy.'
      }));
    }

    // Store and emit alerts
    alerts.forEach(alert => {
      this.storeAlert(alert);
      this.emit('alert', alert);
    });

    return alerts;
  }

  /**
   * Check NAP consistency
   */
  checkNAPConsistency(clientId, napScore, issues = []) {
    const alerts = [];

    if (napScore < this.thresholds.napMinimum) {
      alerts.push(this.createAlert({
        type: 'nap_inconsistency',
        category: 'technical',
        clientId,
        message: `NAP consistency below minimum (${napScore}/100, required: ${this.thresholds.napMinimum})`,
        severity: napScore < 70 ? 'critical' : 'warning',
        currentValue: napScore,
        threshold: this.thresholds.napMinimum,
        issues,
        action: 'Fix NAP inconsistencies across all pages and directories.'
      }));
    }

    alerts.forEach(alert => {
      this.storeAlert(alert);
      this.emit('alert', alert);
    });

    return alerts;
  }

  /**
   * Check schema implementation
   */
  checkSchema(clientId, hasSchema) {
    const alerts = [];

    if (!hasSchema) {
      alerts.push(this.createAlert({
        type: 'missing_schema',
        category: 'technical',
        clientId,
        message: 'Schema markup not detected - missing critical SEO element',
        severity: 'warning',
        currentValue: 0,
        action: 'Implement LocalBusiness schema markup immediately.'
      }));
    }

    alerts.forEach(alert => {
      this.storeAlert(alert);
      this.emit('alert', alert);
    });

    return alerts;
  }

  /**
   * Check competitive position
   */
  checkCompetitivePosition(clientId, currentPosition, previousPosition = null) {
    const alerts = [];

    // Position dropped
    if (previousPosition !== null && currentPosition > previousPosition) {
      const drop = currentPosition - previousPosition;
      alerts.push(this.createAlert({
        type: 'competitive_drop',
        category: 'competition',
        clientId,
        message: `Market position dropped from #${previousPosition} to #${currentPosition}`,
        severity: drop >= 3 ? 'warning' : 'info',
        currentValue: currentPosition,
        previousValue: previousPosition,
        change: drop,
        action: 'Analyze competitor improvements and update strategy.'
      }));
    }

    // Position improved (positive)
    if (previousPosition !== null && currentPosition < previousPosition) {
      const improvement = previousPosition - currentPosition;
      alerts.push(this.createAlert({
        type: 'competitive_improvement',
        category: 'competition',
        clientId,
        message: `Market position improved from #${previousPosition} to #${currentPosition}`,
        severity: 'info',
        currentValue: currentPosition,
        previousValue: previousPosition,
        change: -improvement,
        action: 'Continue current optimization efforts.'
      }));
    }

    alerts.forEach(alert => {
      this.storeAlert(alert);
      this.emit('alert', alert);
    });

    return alerts;
  }

  /**
   * Check review reputation
   */
  checkReputation(clientId, reputationScore, averageRating = null) {
    const alerts = [];

    if (reputationScore < 60) {
      alerts.push(this.createAlert({
        type: 'reputation_low',
        category: 'reputation',
        clientId,
        message: `Reputation score is low (${reputationScore}/100)`,
        severity: reputationScore < 40 ? 'critical' : 'warning',
        currentValue: reputationScore,
        averageRating,
        action: 'Focus on review generation and response strategy.'
      }));
    }

    if (averageRating !== null && averageRating < 3.5) {
      alerts.push(this.createAlert({
        type: 'rating_low',
        category: 'reputation',
        clientId,
        message: `Average rating is below recommended (${averageRating}/5)`,
        severity: 'warning',
        currentValue: averageRating,
        threshold: 3.5,
        action: 'Improve service quality and actively request reviews from satisfied customers.'
      }));
    }

    alerts.forEach(alert => {
      this.storeAlert(alert);
      this.emit('alert', alert);
    });

    return alerts;
  }

  /**
   * Create alert object
   */
  createAlert(alertData) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...alertData
    };
  }

  /**
   * Store alert in memory
   */
  storeAlert(alert) {
    this.alerts.unshift(alert);

    // Keep only last N alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit = 50) {
    return this.alerts.slice(0, limit);
  }

  /**
   * Get alerts by client
   */
  getClientAlerts(clientId, limit = 20) {
    return this.alerts
      .filter(alert => alert.clientId === clientId)
      .slice(0, limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity, limit = 50) {
    return this.alerts
      .filter(alert => alert.severity === severity)
      .slice(0, limit);
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category, limit = 50) {
    return this.alerts
      .filter(alert => alert.category === category)
      .slice(0, limit);
  }

  /**
   * Get alert statistics
   */
  getStatistics() {
    const bySeverity = {
      critical: 0,
      warning: 0,
      info: 0
    };

    const byCategory = {};
    const byClient = {};

    this.alerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
      byClient[alert.clientId] = (byClient[alert.clientId] || 0) + 1;
    });

    return {
      total: this.alerts.length,
      bySeverity,
      byCategory,
      byClient,
      mostAffectedClient: Object.entries(byClient)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null,
      lastAlert: this.alerts[0] || null
    };
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const before = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoffDate
    );
    const removed = before - this.alerts.length;

    return {
      removed,
      remaining: this.alerts.length
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    };

    this.emit('thresholdsUpdated', this.thresholds);
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }
}

// Export singleton
export const alertService = new AlertService();
export default alertService;
