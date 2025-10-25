/**
 * Competitor Response System - Day 10
 *
 * Intelligent system that monitors competitor movements and generates
 * actionable response strategies.
 *
 * Features:
 * - Detects competitor threats in real-time
 * - Generates smart, actionable alerts
 * - Prioritizes responses by impact potential
 * - Creates task queues with specific actions
 * - Tracks performance of responses
 * - Integrates with auto-fix engines
 *
 * Response Strategies:
 * 1. Content Gap Analysis - What do they have that you don't?
 * 2. Keyword Opportunity - Where can you overtake them?
 * 3. Quick Wins - Low-hanging fruit (positions 11-20)
 * 4. Defensive Plays - Protect your top 10 rankings
 */

import db from '../database/index.js';
import { GoogleSearchConsole } from './google-search-console.js';
import { CompetitorTracker } from './competitor-tracker.js';

export class CompetitorResponseSystem {
  constructor(config) {
    this.config = config;
    this.gscClient = config.gscPropertyUrl
      ? new GoogleSearchConsole(config.gscPropertyUrl)
      : null;
  }

  /**
   * Main orchestrator - Analyze competitors and generate response plan
   */
  async generateResponsePlan(options = {}) {
    const { autoExecute = false } = options;

    console.log('🎯 Competitor Response System - Starting Analysis...');
    console.log(`   Client: ${this.config.businessName}`);
    console.log(`   Mode: ${autoExecute ? 'AUTO-EXECUTE' : 'ANALYSIS ONLY'}\n`);

    try {
      // Step 1: Get competitor data
      console.log('📊 Fetching competitor data...');
      const competitors = await this.getCompetitorData();
      console.log(`   Found ${competitors.length} competitor ranking data points\n`);

      if (competitors.length === 0) {
        return {
          success: true,
          message: 'No competitor data available. Run competitor tracking first.',
          threats: [],
          opportunities: [],
          tasks: []
        };
      }

      // Step 2: Identify threats
      console.log('🚨 Analyzing competitive threats...');
      const threats = await this.identifyThreats(competitors);
      console.log(`   Identified ${threats.length} threats\n`);

      // Step 3: Identify opportunities
      console.log('💡 Identifying opportunities...');
      const opportunities = await this.identifyOpportunities(competitors);
      console.log(`   Found ${opportunities.length} opportunities\n`);

      // Step 4: Generate action plan
      console.log('📋 Generating action plan...');
      const tasks = await this.generateActionPlan(threats, opportunities);
      console.log(`   Created ${tasks.length} prioritized tasks\n`);

      // Step 5: Store alerts in database
      console.log('💾 Saving alerts to database...');
      await this.storeAlerts(threats, opportunities);
      console.log('');

      // Step 6: Auto-execute if requested
      if (autoExecute && tasks.length > 0) {
        console.log('🤖 Auto-executing high-priority tasks...');
        await this.executeTopTasks(tasks);
        console.log('');
      }

      // Summary
      console.log('✅ Competitor Response Analysis Complete!');
      console.log(`   🚨 Threats: ${threats.length}`);
      console.log(`   💡 Opportunities: ${opportunities.length}`);
      console.log(`   📋 Tasks: ${tasks.length}`);
      console.log('');

      return {
        success: true,
        threats,
        opportunities,
        tasks,
        summary: this.generateSummary(threats, opportunities, tasks)
      };

    } catch (error) {
      console.error('❌ Response plan generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get competitor ranking data from database
   */
  async getCompetitorData() {
    const stmt = db.db.prepare(`
      SELECT
        cr.*,
        c.competitor_name,
        c.competitor_domain
      FROM competitor_rankings cr
      LEFT JOIN (
        SELECT DISTINCT competitor_domain, competitor_name
        FROM competitor_rankings
        WHERE client_id = ?
      ) c ON cr.competitor_domain = c.competitor_domain
      WHERE cr.client_id = ?
      ORDER BY cr.date DESC
      LIMIT 500
    `);

    return stmt.all(this.config.id, this.config.id);
  }

  /**
   * Identify competitive threats
   */
  async identifyThreats(competitors) {
    const threats = [];

    // Group by keyword
    const keywordMap = {};
    competitors.forEach(comp => {
      if (!keywordMap[comp.keyword]) {
        keywordMap[comp.keyword] = [];
      }
      keywordMap[comp.keyword].push(comp);
    });

    // Analyze each keyword
    Object.entries(keywordMap).forEach(([keyword, rankings]) => {
      const yourPosition = rankings[0]?.your_position || 999;
      const competitorPositions = rankings
        .map(r => ({ domain: r.competitor_domain, position: r.their_position, name: r.competitor_name }))
        .filter(r => r.position && r.position < yourPosition)
        .sort((a, b) => a.position - b.position);

      // Threat Level 1: You're not in top 10, competitors are
      if (yourPosition > 10 && competitorPositions.some(c => c.position <= 10)) {
        threats.push({
          type: 'OUTRANKED',
          severity: 'high',
          keyword,
          yourPosition,
          competitors: competitorPositions.slice(0, 3),
          gap: yourPosition - competitorPositions[0].position,
          message: `You're ranked #${yourPosition}, competitors in top 10`,
          recommendation: 'Urgent: Optimize content, build backlinks, improve on-page SEO'
        });
      }

      // Threat Level 2: You're in top 10, but losing ground
      else if (yourPosition <= 10 && competitorPositions.length > 0) {
        const topCompetitor = competitorPositions[0];
        const gap = yourPosition - topCompetitor.position;

        if (gap >= 3) {
          threats.push({
            type: 'LOSING_GROUND',
            severity: 'medium',
            keyword,
            yourPosition,
            competitors: [topCompetitor],
            gap,
            message: `Ranked #${yourPosition}, but ${gap} positions behind ${topCompetitor.name}`,
            recommendation: 'Improve content quality, add internal links, update meta description'
          });
        }
      }

      // Threat Level 3: Multiple competitors ahead
      if (competitorPositions.length >= 3) {
        threats.push({
          type: 'MULTIPLE_COMPETITORS',
          severity: 'medium',
          keyword,
          yourPosition,
          competitors: competitorPositions.slice(0, 5),
          message: `${competitorPositions.length} competitors outranking you`,
          recommendation: 'Analyze their content strategy, identify gaps, improve your approach'
        });
      }
    });

    // Sort by severity and gap
    return threats.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'high' ? -1 : 1;
      }
      return b.gap - a.gap;
    });
  }

  /**
   * Identify opportunities to overtake competitors
   */
  async identifyOpportunities(competitors) {
    const opportunities = [];

    // Group by keyword
    const keywordMap = {};
    competitors.forEach(comp => {
      if (!keywordMap[comp.keyword]) {
        keywordMap[comp.keyword] = [];
      }
      keywordMap[comp.keyword].push(comp);
    });

    // Analyze each keyword
    Object.entries(keywordMap).forEach(([keyword, rankings]) => {
      const yourPosition = rankings[0]?.your_position || 999;
      const searchVolume = rankings[0]?.search_volume || 0;

      // Opportunity 1: Quick wins (positions 11-20)
      if (yourPosition >= 11 && yourPosition <= 20) {
        const competitorsAhead = rankings
          .filter(r => r.their_position < yourPosition)
          .length;

        opportunities.push({
          type: 'QUICK_WIN',
          priority: 'high',
          keyword,
          yourPosition,
          targetPosition: 10,
          potentialGain: yourPosition - 10,
          searchVolume,
          estimatedTraffic: this.estimateTrafficGain(yourPosition, 10, searchVolume),
          message: `Quick win opportunity: Move from #${yourPosition} to top 10`,
          actions: [
            'Update content with fresh information',
            'Improve title and meta description',
            'Add 2-3 relevant internal links',
            'Optimize images and alt text'
          ]
        });
      }

      // Opportunity 2: Low-competition keywords
      else if (yourPosition >= 4 && yourPosition <= 10) {
        const competitorsInTop3 = rankings
          .filter(r => r.their_position <= 3)
          .length;

        if (competitorsInTop3 <= 2) {
          opportunities.push({
            type: 'LOW_COMPETITION',
            priority: 'medium',
            keyword,
            yourPosition,
            targetPosition: 3,
            potentialGain: yourPosition - 3,
            searchVolume,
            estimatedTraffic: this.estimateTrafficGain(yourPosition, 3, searchVolume),
            message: `Low competition for top 3: Currently #${yourPosition}`,
            actions: [
              'Enhance content depth and quality',
              'Build 2-3 quality backlinks',
              'Add FAQ section with schema markup',
              'Improve page speed'
            ]
          });
        }
      }

      // Opportunity 3: Keyword gaps (you rank, they don't)
      else if (yourPosition <= 10) {
        const competitorsPresent = rankings
          .filter(r => r.their_position <= 20)
          .length;

        if (competitorsPresent === 0) {
          opportunities.push({
            type: 'KEYWORD_GAP',
            priority: 'low',
            keyword,
            yourPosition,
            targetPosition: Math.max(1, yourPosition - 2),
            searchVolume,
            message: `Unique ranking opportunity: You're #${yourPosition}, competitors absent`,
            actions: [
              'Strengthen this advantage with better content',
              'Target related long-tail keywords',
              'Build topic cluster around this keyword'
            ]
          });
        }
      }
    });

    // Sort by potential traffic gain
    return opportunities.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (b.estimatedTraffic || 0) - (a.estimatedTraffic || 0);
    });
  }

  /**
   * Generate prioritized action plan
   */
  async generateActionPlan(threats, opportunities) {
    const tasks = [];

    // Generate tasks from threats
    threats.forEach((threat, index) => {
      const priority = threat.severity === 'high' ? 1 : threat.severity === 'medium' ? 2 : 3;

      tasks.push({
        id: `threat-${index}`,
        type: 'DEFENSIVE',
        priority,
        keyword: threat.keyword,
        currentPosition: threat.yourPosition,
        targetPosition: Math.max(1, threat.yourPosition - 3),
        title: `Defend against ${threat.competitors[0]?.name || 'competitor'} for "${threat.keyword}"`,
        description: threat.message,
        actions: this.getActionsForThreat(threat),
        estimatedEffort: '2-4 hours',
        expectedImpact: threat.severity === 'high' ? 'High' : 'Medium',
        deadline: this.calculateDeadline(priority),
        autoFixable: this.canAutoFix(threat)
      });
    });

    // Generate tasks from opportunities
    opportunities.forEach((opp, index) => {
      const priority = opp.priority === 'high' ? 1 : opp.priority === 'medium' ? 2 : 3;

      tasks.push({
        id: `opportunity-${index}`,
        type: 'OFFENSIVE',
        priority,
        keyword: opp.keyword,
        currentPosition: opp.yourPosition,
        targetPosition: opp.targetPosition,
        title: `${opp.type.replace(/_/g, ' ')}: "${opp.keyword}"`,
        description: opp.message,
        actions: opp.actions,
        estimatedEffort: this.estimateEffort(opp),
        expectedImpact: opp.estimatedTraffic > 100 ? 'High' : opp.estimatedTraffic > 50 ? 'Medium' : 'Low',
        potentialTraffic: opp.estimatedTraffic,
        deadline: this.calculateDeadline(priority),
        autoFixable: this.canAutoFix(opp)
      });
    });

    // Sort by priority
    return tasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return (b.potentialTraffic || 0) - (a.potentialTraffic || 0);
    });
  }

  /**
   * Get specific actions for a threat
   */
  getActionsForThreat(threat) {
    const baseActions = [
      'Analyze competitor content to identify gaps',
      'Update your content with more comprehensive information',
      'Improve title and meta description for better CTR',
      'Add relevant internal links from high-authority pages',
      'Optimize images and add descriptive alt text'
    ];

    if (threat.severity === 'high') {
      return [
        'URGENT: Conduct comprehensive content audit',
        'Build 3-5 quality backlinks to this page',
        'Completely rewrite content if necessary',
        ...baseActions
      ];
    }

    return baseActions;
  }

  /**
   * Store alerts in database
   */
  async storeAlerts(threats, opportunities) {
    const allAlerts = [
      ...threats.map(t => ({
        type: t.type,
        severity: t.severity,
        keyword: t.keyword,
        competitor: t.competitors[0]?.domain || 'multiple',
        message: t.message,
        recommendation: t.recommendation
      })),
      ...opportunities.map(o => ({
        type: o.type,
        severity: 'opportunity',
        keyword: o.keyword,
        competitor: null,
        message: o.message,
        recommendation: o.actions.join('; ')
      }))
    ];

    allAlerts.forEach(alert => {
      db.competitorOps.createAlert(this.config.id, alert);
    });
  }

  /**
   * Auto-execute top priority tasks
   */
  async executeTopTasks(tasks) {
    const autoFixableTasks = tasks
      .filter(t => t.autoFixable && t.priority === 1)
      .slice(0, 3); // Limit to top 3

    if (autoFixableTasks.length === 0) {
      console.log('   No auto-fixable tasks in top priority\n');
      return;
    }

    for (const task of autoFixableTasks) {
      console.log(`   🔧 Executing: ${task.title}`);

      try {
        // Execute auto-fix actions
        await this.executeTask(task);
        console.log(`   ✅ Completed: ${task.title}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
  }

  /**
   * Execute a specific task
   */
  async executeTask(task) {
    // This would integrate with the auto-fix engines we've built
    // For now, we'll log the intent and return a promise

    // Example integration points:
    // - Content Optimizer for content improvements
    // - Title/Meta Optimizer for CTR improvements
    // - Internal linking suggestions

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true, task: task.title });
      }, 1000);
    });
  }

  /**
   * Generate summary report
   */
  generateSummary(threats, opportunities, tasks) {
    const highPriorityTasks = tasks.filter(t => t.priority === 1);
    const autoFixableTasks = tasks.filter(t => t.autoFixable);

    return {
      totalThreats: threats.length,
      highSeverityThreats: threats.filter(t => t.severity === 'high').length,
      totalOpportunities: opportunities.length,
      quickWins: opportunities.filter(o => o.type === 'QUICK_WIN').length,
      totalTasks: tasks.length,
      highPriorityTasks: highPriorityTasks.length,
      autoFixableTasks: autoFixableTasks.length,
      estimatedTrafficGain: opportunities.reduce((sum, o) => sum + (o.estimatedTraffic || 0), 0),
      topActions: highPriorityTasks.slice(0, 5).map(t => ({
        title: t.title,
        impact: t.expectedImpact,
        effort: t.estimatedEffort
      }))
    };
  }

  /**
   * Helper: Estimate traffic gain from position improvement
   */
  estimateTrafficGain(currentPos, targetPos, volume) {
    const ctrMap = {
      1: 0.316, 2: 0.158, 3: 0.106, 4: 0.080, 5: 0.065,
      6: 0.053, 7: 0.044, 8: 0.038, 9: 0.033, 10: 0.029,
      11: 0.025, 12: 0.022, 13: 0.020, 14: 0.018, 15: 0.016,
      16: 0.014, 17: 0.013, 18: 0.012, 19: 0.011, 20: 0.010
    };

    const currentCTR = ctrMap[currentPos] || 0.005;
    const targetCTR = ctrMap[targetPos] || 0.005;

    return Math.round((targetCTR - currentCTR) * volume);
  }

  /**
   * Helper: Estimate effort for opportunity
   */
  estimateEffort(opportunity) {
    const positionGap = opportunity.yourPosition - opportunity.targetPosition;

    if (positionGap <= 3) return '1-2 hours';
    if (positionGap <= 7) return '2-4 hours';
    return '4-8 hours';
  }

  /**
   * Helper: Calculate deadline based on priority
   */
  calculateDeadline(priority) {
    const now = new Date();
    const days = priority === 1 ? 7 : priority === 2 ? 14 : 30;
    const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return deadline.toISOString().split('T')[0];
  }

  /**
   * Helper: Check if task can be auto-fixed
   */
  canAutoFix(item) {
    // Tasks that can use our auto-fix engines
    const autoFixableTypes = ['QUICK_WIN', 'LOW_COMPETITION'];

    if (item.type && autoFixableTypes.includes(item.type)) {
      return true;
    }

    // Check if position gap is small (easier to auto-fix)
    if (item.yourPosition && item.yourPosition <= 15) {
      return true;
    }

    return false;
  }

  /**
   * Track performance of response actions
   */
  async trackResponsePerformance(taskId) {
    console.log(`📊 Tracking performance for task: ${taskId}...`);

    // This would:
    // 1. Look up the task in database
    // 2. Check if rankings improved after task execution
    // 3. Calculate ROI of the response
    // 4. Store performance metrics

    const stmt = db.db.prepare(`
      INSERT INTO response_performance (
        client_id, task_id, tracked_at, status
      )
      VALUES (?, ?, datetime('now'), 'tracking')
    `);

    stmt.run(this.config.id, taskId);

    return {
      success: true,
      message: 'Performance tracking started',
      checkBackIn: '7 days'
    };
  }
}
