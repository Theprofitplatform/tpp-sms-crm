#!/usr/bin/env node

/**
 * Competitor Response System CLI - Day 10
 *
 * Intelligent system that monitors competitor movements and generates
 * actionable response strategies.
 *
 * Usage:
 *   node run-competitor-response.js <clientId> [options]
 *
 * Options:
 *   --auto-execute     Auto-execute top priority tasks
 *   --track <taskId>   Track performance of a task
 *   --report          Generate detailed report
 *
 * Examples:
 *   # Analyze competitors and generate response plan
 *   node run-competitor-response.js instantautotraders
 *
 *   # Auto-execute top priority responses
 *   node run-competitor-response.js hottyres --auto-execute
 *
 *   # Track performance of task
 *   node run-competitor-response.js sadc --track threat-1
 */

import { CompetitorResponseSystem } from './src/automation/competitor-response-system.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const clientId = args[0];

const autoExecute = args.includes('--auto-execute');
const trackTaskId = args.includes('--track') ? args[args.indexOf('--track') + 1] : null;
const generateReport = args.includes('--report');

// Validate arguments
if (!clientId) {
  console.error('❌ Error: Client ID is required\n');
  console.log('Usage: node run-competitor-response.js <clientId> [options]\n');
  console.log('Options:');
  console.log('  --auto-execute     Auto-execute top priority tasks');
  console.log('  --track <taskId>   Track performance of a task');
  console.log('  --report          Generate detailed report\n');
  console.log('Examples:');
  console.log('  node run-competitor-response.js instantautotraders');
  console.log('  node run-competitor-response.js hottyres --auto-execute');
  console.log('  node run-competitor-response.js sadc --track threat-1');
  process.exit(1);
}

// Client configurations
const clientConfigs = {
  instantautotraders: {
    id: 'instantautotraders',
    businessName: 'Instant Auto Traders',
    siteUrl: 'https://instantautotraders.com.au',
    gscPropertyUrl: 'sc-domain:instantautotraders.com.au'
  },
  hottyres: {
    id: 'hottyres',
    businessName: 'Hot Tyres',
    siteUrl: 'https://hottyres.com.au',
    gscPropertyUrl: 'sc-domain:hottyres.com.au'
  },
  sadc: {
    id: 'sadc',
    businessName: 'SADC Disability Services',
    siteUrl: 'https://sadcdisabilityservices.com.au',
    gscPropertyUrl: 'sc-domain:sadcdisabilityservices.com.au'
  }
};

// Load client-specific .env file if it exists
const clientEnvPath = path.join(__dirname, 'clients', `${clientId}.env`);
if (fs.existsSync(clientEnvPath)) {
  console.log(`📄 Loading client config from: ${clientEnvPath}\n`);
  dotenv.config({ path: clientEnvPath });
}

const config = clientConfigs[clientId];
if (!config) {
  console.error(`❌ Error: Unknown client "${clientId}"\n`);
  console.log('Available clients:');
  Object.keys(clientConfigs).forEach(id => {
    console.log(`  - ${id}`);
  });
  process.exit(1);
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎯 Competitor Response System - Day 10');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const responseSystem = new CompetitorResponseSystem(config);

  try {
    // Handle performance tracking
    if (trackTaskId) {
      console.log('📊 Performance Tracking Mode\n');
      const result = await responseSystem.trackResponsePerformance(trackTaskId);

      if (result.success) {
        console.log('✅ Performance tracking initiated');
        console.log(`   Check back in: ${result.checkBackIn}`);
        process.exit(0);
      } else {
        console.error(`❌ Tracking failed: ${result.error}`);
        process.exit(1);
      }
    }

    // Generate response plan
    const result = await responseSystem.generateResponsePlan({
      autoExecute
    });

    if (result.success) {
      // Display threats
      if (result.threats && result.threats.length > 0) {
        console.log('🚨 COMPETITIVE THREATS');
        console.log('═'.repeat(70));
        console.log('');

        result.threats.slice(0, 10).forEach((threat, index) => {
          const icon = threat.severity === 'high' ? '🔴' :
                      threat.severity === 'medium' ? '🟡' : '🟢';

          console.log(`${index + 1}. ${icon} ${threat.keyword}`);
          console.log(`   Your Position: #${threat.yourPosition}`);
          console.log(`   Competitors Ahead: ${threat.competitors.map(c => `${c.name} (#${c.position})`).join(', ')}`);
          console.log(`   ${threat.message}`);
          console.log(`   → ${threat.recommendation}`);
          console.log('');
        });
      }

      // Display opportunities
      if (result.opportunities && result.opportunities.length > 0) {
        console.log('💡 OPPORTUNITIES');
        console.log('═'.repeat(70));
        console.log('');

        result.opportunities.slice(0, 10).forEach((opp, index) => {
          const icon = opp.priority === 'high' ? '🔥' :
                      opp.priority === 'medium' ? '⭐' : '💡';

          console.log(`${index + 1}. ${icon} ${opp.keyword}`);
          console.log(`   Type: ${opp.type.replace(/_/g, ' ')}`);
          console.log(`   Current Position: #${opp.yourPosition} → Target: #${opp.targetPosition}`);
          if (opp.estimatedTraffic) {
            console.log(`   Potential Traffic Gain: +${opp.estimatedTraffic} visitors/month`);
          }
          console.log(`   ${opp.message}`);
          console.log('   Actions:');
          opp.actions.forEach(action => {
            console.log(`     • ${action}`);
          });
          console.log('');
        });
      }

      // Display action plan
      if (result.tasks && result.tasks.length > 0) {
        console.log('📋 PRIORITIZED ACTION PLAN');
        console.log('═'.repeat(70));
        console.log('');

        const highPriority = result.tasks.filter(t => t.priority === 1);
        const mediumPriority = result.tasks.filter(t => t.priority === 2);
        const lowPriority = result.tasks.filter(t => t.priority === 3);

        if (highPriority.length > 0) {
          console.log('🔴 HIGH PRIORITY (Do First)');
          console.log('');
          highPriority.forEach((task, index) => {
            console.log(`${index + 1}. ${task.title}`);
            console.log(`   Current: #${task.currentPosition} → Target: #${task.targetPosition}`);
            console.log(`   Impact: ${task.expectedImpact} | Effort: ${task.estimatedEffort}`);
            console.log(`   Deadline: ${task.deadline}`);
            if (task.potentialTraffic) {
              console.log(`   Traffic Gain: +${task.potentialTraffic} visitors/month`);
            }
            console.log(`   ${task.autoFixable ? '🤖 Auto-fixable' : '👤 Manual review required'}`);
            console.log('');
          });
        }

        if (mediumPriority.length > 0) {
          console.log('🟡 MEDIUM PRIORITY (Do This Week)');
          console.log('');
          mediumPriority.slice(0, 5).forEach((task, index) => {
            console.log(`${index + 1}. ${task.title}`);
            console.log(`   Impact: ${task.expectedImpact} | Effort: ${task.estimatedEffort} | Deadline: ${task.deadline}`);
            console.log('');
          });
        }

        if (lowPriority.length > 0) {
          console.log(`🟢 LOW PRIORITY (${lowPriority.length} tasks - Do This Month)`);
          console.log('');
        }
      }

      // Display summary
      if (result.summary) {
        console.log('📊 SUMMARY');
        console.log('═'.repeat(70));
        console.log('');
        console.log(`   Total Threats: ${result.summary.totalThreats} (${result.summary.highSeverityThreats} high severity)`);
        console.log(`   Total Opportunities: ${result.summary.totalOpportunities} (${result.summary.quickWins} quick wins)`);
        console.log(`   Total Tasks: ${result.summary.totalTasks} (${result.summary.highPriorityTasks} high priority)`);
        console.log(`   Auto-fixable Tasks: ${result.summary.autoFixableTasks}`);
        if (result.summary.estimatedTrafficGain > 0) {
          console.log(`   Potential Traffic Gain: +${result.summary.estimatedTrafficGain} visitors/month`);
        }
        console.log('');
      }

      // Recommendations
      console.log('💬 RECOMMENDATIONS');
      console.log('═'.repeat(70));
      console.log('');

      if (result.tasks && result.tasks.length > 0) {
        const autoFixable = result.tasks.filter(t => t.autoFixable && t.priority === 1);

        if (autoFixable.length > 0) {
          console.log('1. Run with --auto-execute to automatically fix top priority issues:');
          console.log(`   node run-competitor-response.js ${clientId} --auto-execute\n`);
        }

        console.log('2. Focus on high-priority tasks first (better ROI)');
        console.log('3. Track performance after implementing changes');
        console.log('4. Re-run this analysis weekly to monitor progress\n');
      } else {
        console.log('✅ No urgent actions required. Your competitive position is strong!\n');
        console.log('Recommendations:');
        console.log('1. Run competitor tracking to gather more data:');
        console.log('   POST /api/competitors/:clientId/run');
        console.log('2. Re-run this analysis after collecting competitor data\n');
      }

      // Generate report file if requested
      if (generateReport && result.tasks && result.tasks.length > 0) {
        const reportPath = path.join(__dirname, 'logs', 'competitor-response', `${clientId}-${Date.now()}.json`);
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
          fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
        console.log(`📄 Detailed report saved to: ${reportPath}\n`);
      }

      process.exit(0);
    } else {
      console.error(`\n❌ Analysis failed: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
