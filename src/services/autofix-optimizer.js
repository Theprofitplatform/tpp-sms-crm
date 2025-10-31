/**
 * Auto-Fix Performance Optimizer
 * Provides AI-powered suggestions to improve auto-fix operations
 */

import autofixDB from '../database/autofix-db.js';

/**
 * Analyze auto-fix performance and generate optimization suggestions
 */
export async function analyzePerformance(timeRangedays = 30) {
  try {
    // Get recent history
    const history = autofixDB.getRunHistory({
      limit: 1000
    });

    // Filter to time range
    const cutoff = Date.now() - (timeRangedays * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(h => h.timestamp >= cutoff);

    if (recentHistory.length === 0) {
      return {
        success: true,
        suggestions: [],
        metrics: null,
        message: 'Not enough data to analyze'
      };
    }

    // Calculate metrics
    const metrics = calculateMetrics(recentHistory);
    
    // Generate suggestions
    const suggestions = generateSuggestions(metrics, recentHistory);

    return {
      success: true,
      metrics,
      suggestions,
      analyzedRuns: recentHistory.length,
      timeRange: `${timeRangedays} days`
    };
  } catch (error) {
    console.error('Error analyzing performance:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate performance metrics
 */
function calculateMetrics(history) {
  const total = history.length;
  const successful = history.filter(h => h.status === 'success').length;
  const failed = history.filter(h => h.status === 'failed').length;
  
  const totalFixes = history.reduce((sum, h) => sum + (h.fixesApplied || 0), 0);
  const totalIssues = history.reduce((sum, h) => sum + (h.issuesFound || 0), 0);
  const totalDuration = history.reduce((sum, h) => sum + (h.duration || 0), 0);

  const successRate = total > 0 ? (successful / total) * 100 : 0;
  const avgDuration = total > 0 ? totalDuration / total : 0;
  const avgFixesPerRun = successful > 0 ? totalFixes / successful : 0;
  const resolutionRate = totalIssues > 0 ? (totalFixes / totalIssues) * 100 : 0;

  // Engine-specific metrics
  const engineMetrics = {};
  history.forEach(h => {
    if (!engineMetrics[h.engineId]) {
      engineMetrics[h.engineId] = {
        runs: 0,
        successful: 0,
        failed: 0,
        fixes: 0,
        duration: 0
      };
    }
    
    engineMetrics[h.engineId].runs++;
    if (h.status === 'success') engineMetrics[h.engineId].successful++;
    if (h.status === 'failed') engineMetrics[h.engineId].failed++;
    engineMetrics[h.engineId].fixes += h.fixesApplied || 0;
    engineMetrics[h.engineId].duration += h.duration || 0;
  });

  // Calculate per-engine stats
  Object.keys(engineMetrics).forEach(engineId => {
    const m = engineMetrics[engineId];
    m.successRate = m.runs > 0 ? (m.successful / m.runs) * 100 : 0;
    m.avgDuration = m.runs > 0 ? m.duration / m.runs : 0;
    m.avgFixesPerRun = m.successful > 0 ? m.fixes / m.successful : 0;
  });

  // Time-based patterns
  const hourlyDistribution = {};
  const dayOfWeekDistribution = {};
  
  history.forEach(h => {
    const date = new Date(h.createdAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    dayOfWeekDistribution[dayOfWeek] = (dayOfWeekDistribution[dayOfWeek] || 0) + 1;
  });

  const peakHour = Object.entries(hourlyDistribution)
    .sort((a, b) => b[1] - a[1])[0];
  const peakDay = Object.entries(dayOfWeekDistribution)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    overall: {
      totalRuns: total,
      successful,
      failed,
      successRate,
      totalFixes,
      totalIssues,
      resolutionRate,
      avgDuration,
      avgFixesPerRun
    },
    engines: engineMetrics,
    patterns: {
      peakHour: peakHour ? parseInt(peakHour[0]) : null,
      peakDay: peakDay ? parseInt(peakDay[0]) : null,
      hourlyDistribution,
      dayOfWeekDistribution
    }
  };
}

/**
 * Generate optimization suggestions based on metrics
 */
function generateSuggestions(metrics, history) {
  const suggestions = [];

  // Success rate suggestions
  if (metrics.overall.successRate < 80) {
    suggestions.push({
      category: 'reliability',
      severity: 'high',
      title: 'Low Success Rate Detected',
      description: `Current success rate is ${metrics.overall.successRate.toFixed(1)}%. Target is 80%+`,
      impact: 'High - Affects overall reliability',
      recommendations: [
        'Review failed runs to identify common issues',
        'Check WordPress connectivity and credentials',
        'Verify engine configurations are correct',
        'Consider disabling underperforming engines temporarily'
      ],
      estimatedImprovement: '15-20% increase in success rate'
    });
  }

  // Performance suggestions
  if (metrics.overall.avgDuration > 120000) { // 2 minutes
    suggestions.push({
      category: 'performance',
      severity: 'medium',
      title: 'Slow Average Execution Time',
      description: `Average run duration is ${(metrics.overall.avgDuration / 1000).toFixed(1)}s`,
      impact: 'Medium - Affects user experience',
      recommendations: [
        'Optimize database queries in engines',
        'Reduce the number of posts analyzed per run',
        'Enable caching for frequently accessed data',
        'Consider running engines in parallel'
      ],
      estimatedImprovement: '30-40% faster execution'
    });
  }

  // Engine-specific suggestions
  Object.entries(metrics.engines).forEach(([engineId, stats]) => {
    if (stats.successRate < 70) {
      suggestions.push({
        category: 'engine',
        severity: 'high',
        title: `${engineId} Underperforming`,
        description: `Success rate is only ${stats.successRate.toFixed(1)}%`,
        impact: 'High - Specific engine needs attention',
        recommendations: [
          `Review ${engineId} configuration`,
          'Check for recent changes that may have broken it',
          'Verify required dependencies are available',
          'Consider disabling until issues are resolved'
        ],
        estimatedImprovement: `Fix ${engineId} reliability issues`
      });
    }

    if (stats.avgFixesPerRun < 1 && stats.runs > 5) {
      suggestions.push({
        category: 'efficiency',
        severity: 'low',
        title: `${engineId} Low Efficiency`,
        description: `Averaging ${stats.avgFixesPerRun.toFixed(2)} fixes per run`,
        impact: 'Low - Engine may not be finding issues',
        recommendations: [
          'Review engine criteria and thresholds',
          'Ensure engine is targeting relevant content',
          'Check if most content is already optimized',
          'Consider adjusting engine sensitivity'
        ],
        estimatedImprovement: 'Increase fixes found per run'
      });
    }
  });

  // Resolution rate suggestions
  if (metrics.overall.resolutionRate < 80) {
    suggestions.push({
      category: 'effectiveness',
      severity: 'medium',
      title: 'Low Issue Resolution Rate',
      description: `Only ${metrics.overall.resolutionRate.toFixed(1)}% of issues are being fixed`,
      impact: 'Medium - Many issues left unresolved',
      recommendations: [
        'Review why some issues cannot be fixed',
        'Enhance engines to handle more issue types',
        'Add manual review step for complex issues',
        'Update engine logic to be more comprehensive'
      ],
      estimatedImprovement: '10-15% more issues resolved'
    });
  }

  // Scheduling suggestions
  if (metrics.patterns.peakHour !== null) {
    const peakHour = metrics.patterns.peakHour;
    const offPeakHour = (peakHour + 12) % 24;
    
    suggestions.push({
      category: 'scheduling',
      severity: 'low',
      title: 'Optimize Run Schedule',
      description: `Most runs happen at ${peakHour}:00. Consider off-peak hours.`,
      impact: 'Low - Better resource utilization',
      recommendations: [
        `Schedule maintenance runs at ${offPeakHour}:00 (off-peak)`,
        'Distribute runs throughout the day',
        'Use automated scheduling for consistency',
        'Avoid peak traffic hours for better performance'
      ],
      estimatedImprovement: 'Better resource distribution'
    });
  }

  // Consistency suggestions
  const recentWeek = history.filter(h => 
    h.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000)
  );
  
  if (recentWeek.length < 7) {
    suggestions.push({
      category: 'consistency',
      severity: 'low',
      title: 'Infrequent Engine Runs',
      description: `Only ${recentWeek.length} runs in the last 7 days`,
      impact: 'Low - May miss optimization opportunities',
      recommendations: [
        'Set up daily automated runs',
        'Create schedules for each engine',
        'Enable notifications to track runs',
        'Consider running critical engines more frequently'
      ],
      estimatedImprovement: 'More consistent optimization'
    });
  }

  // Bulk operation suggestions
  if (metrics.overall.totalRuns > 50 && !hasRecentBulkRuns(history)) {
    suggestions.push({
      category: 'efficiency',
      severity: 'low',
      title: 'Use Bulk Operations',
      description: 'Running engines individually - bulk ops can save time',
      impact: 'Low - Time savings for operators',
      recommendations: [
        'Use bulk run feature for multiple engines',
        'Group related engines together',
        'Schedule bulk runs during off-peak hours',
        'Monitor bulk operation success rates'
      ],
      estimatedImprovement: '50-70% time savings'
    });
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  );

  return suggestions;
}

/**
 * Check if there have been recent bulk runs
 */
function hasRecentBulkRuns(history) {
  const recentBulk = history.filter(h => {
    const sameTimeRuns = history.filter(h2 => 
      Math.abs(h2.timestamp - h.timestamp) < 60000 // Within 1 minute
    );
    return sameTimeRuns.length >= 2;
  });
  
  return recentBulk.length > 0;
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport(timeRangeDays = 30) {
  const analysis = await analyzePerformance(timeRangeDays);
  
  if (!analysis.success) {
    return analysis;
  }

  const { metrics, suggestions } = analysis;

  // Create report sections
  const report = {
    summary: {
      period: `${timeRangeDays} days`,
      totalRuns: metrics.overall.totalRuns,
      successRate: metrics.overall.successRate,
      totalFixes: metrics.overall.totalFixes,
      avgDuration: metrics.overall.avgDuration,
      grade: calculateGrade(metrics)
    },
    strengths: identifyStrengths(metrics),
    weaknesses: identifyWeaknesses(metrics),
    suggestions: suggestions.map(s => ({
      title: s.title,
      severity: s.severity,
      recommendations: s.recommendations
    })),
    actionItems: suggestions
      .filter(s => s.severity === 'high')
      .map(s => s.title)
  };

  return {
    success: true,
    report
  };
}

/**
 * Calculate overall performance grade
 */
function calculateGrade(metrics) {
  let score = 0;
  let maxScore = 0;

  // Success rate (40 points)
  score += Math.min(40, (metrics.overall.successRate / 100) * 40);
  maxScore += 40;

  // Resolution rate (30 points)
  score += Math.min(30, (metrics.overall.resolutionRate / 100) * 30);
  maxScore += 30;

  // Efficiency - avg fixes per run (20 points)
  score += Math.min(20, metrics.overall.avgFixesPerRun * 2);
  maxScore += 20;

  // Performance - duration (10 points)
  const durationScore = metrics.overall.avgDuration < 60000 ? 10 :
                       metrics.overall.avgDuration < 120000 ? 7 :
                       metrics.overall.avgDuration < 180000 ? 4 : 2;
  score += durationScore;
  maxScore += 10;

  const percentage = (score / maxScore) * 100;

  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Identify system strengths
 */
function identifyStrengths(metrics) {
  const strengths = [];

  if (metrics.overall.successRate >= 90) {
    strengths.push('Excellent success rate');
  }

  if (metrics.overall.resolutionRate >= 90) {
    strengths.push('High issue resolution rate');
  }

  if (metrics.overall.avgFixesPerRun >= 5) {
    strengths.push('Finding and fixing many issues per run');
  }

  if (metrics.overall.avgDuration < 60000) {
    strengths.push('Fast execution time');
  }

  Object.entries(metrics.engines).forEach(([engineId, stats]) => {
    if (stats.successRate >= 95 && stats.runs >= 5) {
      strengths.push(`${engineId} performing excellently`);
    }
  });

  return strengths;
}

/**
 * Identify system weaknesses
 */
function identifyWeaknesses(metrics) {
  const weaknesses = [];

  if (metrics.overall.successRate < 80) {
    weaknesses.push('Low overall success rate');
  }

  if (metrics.overall.resolutionRate < 70) {
    weaknesses.push('Many issues left unresolved');
  }

  if (metrics.overall.avgFixesPerRun < 2) {
    weaknesses.push('Not finding enough issues');
  }

  if (metrics.overall.avgDuration > 180000) {
    weaknesses.push('Slow execution time');
  }

  Object.entries(metrics.engines).forEach(([engineId, stats]) => {
    if (stats.successRate < 70 && stats.runs >= 3) {
      weaknesses.push(`${engineId} has reliability issues`);
    }
  });

  return weaknesses;
}

/**
 * Get real-time optimization recommendations
 */
export function getRealtimeRecommendations() {
  const engines = autofixDB.getEngines();
  const recentHistory = autofixDB.getRunHistory({ limit: 50 });

  const recommendations = [];

  // Check for disabled engines
  const disabledEngines = engines.filter(e => !e.enabled);
  if (disabledEngines.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${disabledEngines.length} engine(s) are disabled`,
      action: 'Review and enable if needed',
      engines: disabledEngines.map(e => e.id)
    });
  }

  // Check for engines that haven't run recently
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  engines.forEach(engine => {
    if (engine.enabled && engine.lastRun) {
      const lastRunTime = new Date(engine.lastRun).getTime();
      if (lastRunTime < oneWeekAgo) {
        recommendations.push({
          type: 'info',
          message: `${engine.name} hasn't run in over a week`,
          action: 'Consider running or scheduling it',
          engineId: engine.id
        });
      }
    }
  });

  // Check recent failures
  const recentFailures = recentHistory.filter(h => h.status === 'failed');
  if (recentFailures.length > 5) {
    recommendations.push({
      type: 'error',
      message: `${recentFailures.length} recent failures detected`,
      action: 'Review error logs and fix issues',
      affectedEngines: [...new Set(recentFailures.map(h => h.engineId))]
    });
  }

  return recommendations;
}

export default {
  analyzePerformance,
  generatePerformanceReport,
  getRealtimeRecommendations
};
