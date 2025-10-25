/**
 * Local SEO Automation Scheduler
 *
 * Daily automated local SEO audits with auto-fix capabilities
 */

import cron from 'node-cron';
import { LocalSEOOrchestrator } from './local-seo-orchestrator.js';
import { discordNotifier } from '../audit/discord-notifier.js';
import db from '../database/index.js';

export class LocalSEOScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.orchestrator = new LocalSEOOrchestrator();
  }

  /**
   * Start the local SEO scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Local SEO scheduler is already running');
      return;
    }

    const enabled = process.env.LOCAL_SEO_ENABLED === 'true';

    if (!enabled) {
      console.log('ℹ️  Local SEO automation is disabled (LOCAL_SEO_ENABLED=false)');
      return;
    }

    // Default: Daily at 7 AM
    const schedule = process.env.LOCAL_SEO_SCHEDULE || '0 7 * * *';

    console.log(`📅 Starting local SEO scheduler with schedule: ${schedule}`);

    const job = cron.schedule(schedule, async () => {
      console.log('🗺️  Running scheduled local SEO automation...');
      const startTime = Date.now();

      try {
        const results = await this.runForAllClients();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`✅ Local SEO automation completed in ${duration}s`);
        console.log(`   - Clients processed: ${results.clientsProcessed}`);
        console.log(`   - Issues detected: ${results.totalIssues}`);
        console.log(`   - Auto-fixed: ${results.autoFixed}`);

        if (results.errors.length > 0) {
          console.log(`   - Errors: ${results.errors.length}`);
          results.errors.forEach(err => {
            console.error(`     • ${err.client}: ${err.error}`);
          });
        }

      } catch (error) {
        console.error('❌ Local SEO automation job failed:', error.message);
      }
    });

    this.jobs.set('local-seo', job);
    this.isRunning = true;

    console.log('✅ Local SEO scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Local SEO scheduler is not running');
      return;
    }

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`🛑 Stopped job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;

    console.log('✅ Local SEO scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: process.env.LOCAL_SEO_ENABLED === 'true',
      schedule: process.env.LOCAL_SEO_SCHEDULE || '0 7 * * *',
      jobCount: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }

  /**
   * Run local SEO automation for all active clients
   */
  async runForAllClients() {
    console.log('🗺️  Starting local SEO automation for all clients...');

    const clients = db.clientOps.getAll().filter(c => c.status === 'active');
    const results = {
      clientsProcessed: 0,
      totalIssues: 0,
      autoFixed: 0,
      errors: []
    };

    for (const client of clients) {
      try {
        console.log(`  Processing ${client.name}...`);

        const result = await this.processClient(client.id);

        results.clientsProcessed++;
        results.totalIssues += result.issuesDetected;
        results.autoFixed += result.issuesFixed;

        // Send Discord alert if significant issues found
        if (result.issuesDetected > 0 && process.env.DISCORD_NOTIFICATIONS_ENABLED === 'true') {
          await this.sendLocalSEOAlert(client, result);
        }

      } catch (error) {
        console.error(`  ❌ Error processing ${client.name}:`, error.message);
        results.errors.push({ client: client.name, error: error.message });
      }
    }

    console.log(`✅ Local SEO automation complete: ${results.clientsProcessed} clients, ${results.totalIssues} issues, ${results.autoFixed} fixed`);

    return results;
  }

  /**
   * Process local SEO for a specific client
   */
  async processClient(clientId) {
    const client = db.clientOps.getById(clientId);

    if (!client) {
      throw new Error('Client not found');
    }

    // Run orchestrated local SEO audit
    const auditResult = await this.orchestrator.runComplete(clientId);

    const issuesDetected = this.countIssues(auditResult);
    let issuesFixed = 0;

    // Auto-fix NAP inconsistencies if enabled
    const autoFixEnabled = process.env.LOCAL_SEO_AUTO_FIX === 'true';

    if (autoFixEnabled && auditResult.nap && auditResult.nap.inconsistencies > 0) {
      try {
        console.log(`  🔧 Auto-fixing NAP inconsistencies for ${client.name}...`);

        const fixResult = await this.orchestrator.autoFixNAP(clientId);

        if (fixResult.success) {
          issuesFixed += fixResult.fixed || 0;
          console.log(`  ✅ Fixed ${fixResult.fixed} NAP issues`);
        }

      } catch (error) {
        console.error(`  ⚠️  Auto-fix failed: ${error.message}`);
      }
    }

    // Auto-deploy schema markup if missing
    if (autoFixEnabled && auditResult.schema && auditResult.schema.score < 80) {
      try {
        console.log(`  🔧 Deploying schema markup for ${client.name}...`);

        const schemaResult = await this.orchestrator.deploySchema(clientId);

        if (schemaResult.success) {
          issuesFixed++;
          console.log(`  ✅ Schema markup deployed`);
        }

      } catch (error) {
        console.error(`  ⚠️  Schema deployment failed: ${error.message}`);
      }
    }

    // Store audit results
    this.storeAuditResults(clientId, auditResult, issuesFixed);

    return {
      clientId,
      clientName: client.name,
      issuesDetected,
      issuesFixed,
      score: auditResult.overallScore || 0,
      auditResult
    };
  }

  /**
   * Count total issues in audit result
   */
  countIssues(auditResult) {
    let issues = 0;

    if (auditResult.nap && auditResult.nap.inconsistencies) {
      issues += auditResult.nap.inconsistencies;
    }

    if (auditResult.schema && auditResult.schema.score < 80) {
      issues++;
    }

    if (auditResult.gbp && auditResult.gbp.score < 70) {
      issues++;
    }

    if (auditResult.directories && auditResult.directories.pending > 0) {
      issues += auditResult.directories.pending;
    }

    return issues;
  }

  /**
   * Store audit results in database
   */
  storeAuditResults(clientId, auditResult, issuesFixed) {
    try {
      db.localSeoOps.recordAudit(clientId, {
        score: auditResult.overallScore || 0,
        napScore: auditResult.nap?.score || 0,
        schemaScore: auditResult.schema?.score || 0,
        gbpScore: auditResult.gbp?.score || 0,
        directoriesScore: auditResult.directories?.score || 0,
        issuesDetected: this.countIssues(auditResult),
        issuesFixed,
        metadata: JSON.stringify(auditResult),
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to store audit results:', error.message);
    }
  }

  /**
   * Send Discord alert for local SEO issues
   */
  async sendLocalSEOAlert(client, result) {
    const severity = result.score < 60 ? 'HIGH' : result.score < 80 ? 'MEDIUM' : 'LOW';

    const issues = [];
    if (result.auditResult.nap && result.auditResult.nap.inconsistencies > 0) {
      issues.push(`${result.auditResult.nap.inconsistencies} NAP inconsistencies`);
    }
    if (result.auditResult.schema && result.auditResult.schema.score < 80) {
      issues.push('Schema markup incomplete');
    }
    if (result.auditResult.gbp && result.auditResult.gbp.score < 70) {
      issues.push('Google Business Profile needs optimization');
    }

    await discordNotifier.sendLocalSEOAlert({
      clientName: client.name,
      issueType: 'Local SEO Audit',
      severity,
      message: issues.join(', '),
      score: result.score
    });
  }

  /**
   * Run local SEO automation manually (bypass schedule)
   */
  async runNow() {
    console.log('🗺️  Running manual local SEO automation...');
    const startTime = Date.now();

    try {
      const results = await this.runForAllClients();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Manual local SEO automation completed in ${duration}s`);

      return {
        success: true,
        duration: parseFloat(duration),
        ...results
      };

    } catch (error) {
      console.error('❌ Manual local SEO automation failed:', error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton
export const localSeoScheduler = new LocalSEOScheduler();
