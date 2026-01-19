/**
 * Reports API Routes - Stock Trading Automation System
 *
 * Endpoints for generating and retrieving trading reports.
 *
 * Endpoints:
 *   GET  /api/v1/reports/daily          - List available daily reports
 *   GET  /api/v1/reports/daily/:date    - Get specific daily report
 *   POST /api/v1/reports/daily/generate - Generate daily report for today
 *   GET  /api/v1/reports/daily/latest   - Get most recent daily report
 */

import express from 'express';
import { DailyReportGenerator } from '../../jobs/daily-report.js';

const router = express.Router();

/**
 * GET /api/v1/reports/daily
 * List available daily reports
 */
router.get('/daily', async (req, res) => {
  try {
    const { logger, config } = req.app.locals;
    const limit = parseInt(req.query.limit || '30', 10);

    const generator = new DailyReportGenerator({
      logger,
      executionServiceUrl: config.services.execution,
      riskServiceUrl: config.services.risk,
      dataServiceUrl: config.services.data,
      signalServiceUrl: config.services.signal,
    });

    const reports = await generator.listReports(limit);

    res.json({
      reports,
      count: reports.length,
    });
  } catch (error) {
    req.app.locals.logger.error('Failed to list reports', { error: error.message });
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * GET /api/v1/reports/daily/latest
 * Get the most recent daily report
 */
router.get('/daily/latest', async (req, res) => {
  try {
    const { logger, config } = req.app.locals;

    const generator = new DailyReportGenerator({
      logger,
      executionServiceUrl: config.services.execution,
      riskServiceUrl: config.services.risk,
      dataServiceUrl: config.services.data,
      signalServiceUrl: config.services.signal,
    });

    const reports = await generator.listReports(1);

    if (reports.length === 0) {
      return res.status(404).json({ error: 'No reports found' });
    }

    const report = await generator.getReport(reports[0].date);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    req.app.locals.logger.error('Failed to get latest report', { error: error.message });
    res.status(500).json({ error: 'Failed to get latest report' });
  }
});

/**
 * GET /api/v1/reports/daily/:date
 * Get a specific daily report by date (YYYY-MM-DD)
 */
router.get('/daily/:date', async (req, res) => {
  try {
    const { logger, config } = req.app.locals;
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const generator = new DailyReportGenerator({
      logger,
      executionServiceUrl: config.services.execution,
      riskServiceUrl: config.services.risk,
      dataServiceUrl: config.services.data,
      signalServiceUrl: config.services.signal,
    });

    const report = await generator.getReport(date);

    if (!report) {
      return res.status(404).json({ error: `Report for ${date} not found` });
    }

    res.json(report);
  } catch (error) {
    req.app.locals.logger.error('Failed to get report', { error: error.message, date: req.params.date });
    res.status(500).json({ error: 'Failed to get report' });
  }
});

/**
 * POST /api/v1/reports/daily/generate
 * Generate a daily report (for today or specified date)
 */
router.post('/daily/generate', async (req, res) => {
  try {
    const { logger, config, jobQueue } = req.app.locals;
    const { date, async: asyncMode } = req.body;

    const generator = new DailyReportGenerator({
      logger,
      executionServiceUrl: config.services.execution,
      riskServiceUrl: config.services.risk,
      dataServiceUrl: config.services.data,
      signalServiceUrl: config.services.signal,
      discordWebhook: config.notifications.discordWebhook,
    });

    // If async mode, queue the job
    if (asyncMode && jobQueue) {
      const job = await jobQueue.addJob('daily_report', { date }, { priority: 5 });
      return res.status(202).json({
        message: 'Report generation queued',
        job_id: job.id,
      });
    }

    // Generate synchronously
    const report = await generator.generate(date);

    res.json({
      message: 'Report generated successfully',
      report,
    });
  } catch (error) {
    req.app.locals.logger.error('Failed to generate report', { error: error.message });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
