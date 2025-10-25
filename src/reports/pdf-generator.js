/**
 * PDF Report Generator
 *
 * Generates professional PDF SEO reports with branding
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PDFReportGenerator {
  constructor(options = {}) {
    this.storageDir = options.storageDir || path.join(__dirname, '../../data/reports');
    this.maxSizeMB = options.maxSizeMB || 10;

    // Ensure storage directory exists
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Generate SEO report PDF
   */
  async generateReport(reportData) {
    const {
      clientName,
      businessName,
      period,
      reportType = 'monthly',
      metrics = {},
      rankings = [],
      optimizations = [],
      recommendations = [],
      branding = {}
    } = reportData;

    const filename = `${businessName.replace(/[^a-z0-9]/gi, '_')}_${reportType}_${period.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    const filepath = path.join(this.storageDir, filename);

    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Pipe to file
        const writeStream = fs.createWriteStream(filepath);
        doc.pipe(writeStream);

        // Add content
        this.addHeader(doc, { businessName, period, reportType, branding });
        this.addExecutiveSummary(doc, metrics);
        this.addMetricsSection(doc, metrics);
        this.addRankingsSection(doc, rankings);
        this.addOptimizationsSection(doc, optimizations);
        this.addRecommendationsSection(doc, recommendations);
        this.addFooter(doc, branding);

        // Finalize PDF
        doc.end();

        writeStream.on('finish', () => {
          const stats = fs.statSync(filepath);
          const sizeMB = stats.size / (1024 * 1024);

          if (sizeMB > this.maxSizeMB) {
            fs.unlinkSync(filepath);
            reject(new Error(`PDF size (${sizeMB.toFixed(2)}MB) exceeds maximum (${this.maxSizeMB}MB)`));
            return;
          }

          resolve({
            success: true,
            filename,
            filepath,
            size: stats.size,
            sizeMB: sizeMB.toFixed(2)
          });
        });

        writeStream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add report header
   */
  addHeader(doc, { businessName, period, reportType, branding }) {
    const companyName = branding.companyName || 'SEO Automation Platform';
    const primaryColor = branding.primaryColor || '#667eea';

    // Company name
    doc.fontSize(12)
       .fillColor('#666666')
       .text(companyName, 50, 50);

    // Report title
    doc.fontSize(24)
       .fillColor('#333333')
       .text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} SEO Report`, 50, 80, { bold: true });

    // Business name
    doc.fontSize(18)
       .fillColor(primaryColor)
       .text(businessName, 50, 115);

    // Period
    doc.fontSize(12)
       .fillColor('#666666')
       .text(period, 50, 145);

    // Divider line
    doc.moveTo(50, 170)
       .lineTo(545, 170)
       .strokeColor(primaryColor)
       .stroke();

    doc.moveDown(3);
  }

  /**
   * Add executive summary
   */
  addExecutiveSummary(doc, metrics) {
    doc.fontSize(16)
       .fillColor('#333333')
       .text('Executive Summary', 50, doc.y + 20);

    doc.moveDown();

    const summary = `Your website received ${metrics.totalClicks || 0} clicks and ${metrics.totalImpressions || 0} impressions this period. ` +
                   `Average position is ${metrics.avgPosition || 'N/A'} with a click-through rate of ${metrics.ctr || 0}%.`;

    doc.fontSize(11)
       .fillColor('#666666')
       .text(summary, 50, doc.y, {
         width: 495,
         align: 'left',
         lineGap: 5
       });

    doc.moveDown(2);
  }

  /**
   * Add metrics section
   */
  addMetricsSection(doc, metrics) {
    doc.fontSize(14)
       .fillColor('#333333')
       .text('Key Performance Metrics', 50, doc.y + 10);

    doc.moveDown();

    const metricsData = [
      { label: 'Total Clicks', value: metrics.totalClicks || 0, change: metrics.clicksChange || '+0%' },
      { label: 'Total Impressions', value: metrics.totalImpressions || 0, change: metrics.impressionsChange || '+0%' },
      { label: 'Average Position', value: metrics.avgPosition || 'N/A', change: metrics.positionChange || '+0' },
      { label: 'Click-Through Rate', value: `${metrics.ctr || 0}%`, change: metrics.ctrChange || '+0%' }
    ];

    const startY = doc.y;
    const columnWidth = 240;
    const rowHeight = 60;

    metricsData.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 50 + (col * (columnWidth + 15));
      const y = startY + (row * rowHeight);

      // Metric box
      doc.rect(x, y, columnWidth, 50)
         .fillAndStroke('#f8f9fa', '#e0e0e0');

      // Metric label
      doc.fontSize(10)
         .fillColor('#666666')
         .text(metric.label, x + 10, y + 10);

      // Metric value
      doc.fontSize(18)
         .fillColor('#333333')
         .text(metric.value.toString(), x + 10, y + 25);

      // Change indicator
      const changeColor = metric.change.startsWith('+') ? '#10b981' : '#ef4444';
      doc.fontSize(10)
         .fillColor(changeColor)
         .text(metric.change, x + columnWidth - 60, y + 30);
    });

    doc.y = startY + (Math.ceil(metricsData.length / 2) * rowHeight) + 20;
  }

  /**
   * Add rankings section
   */
  addRankingsSection(doc, rankings) {
    if (!rankings || rankings.length === 0) return;

    doc.addPage();

    doc.fontSize(14)
       .fillColor('#333333')
       .text('Top Keyword Rankings', 50, 50);

    doc.moveDown();

    const tableTop = doc.y;
    const itemHeight = 25;

    // Table header
    doc.fontSize(10)
       .fillColor('#ffffff')
       .rect(50, tableTop, 495, 20)
       .fill('#667eea');

    doc.fillColor('#ffffff')
       .text('Keyword', 60, tableTop + 5, { width: 250 })
       .text('Position', 320, tableTop + 5, { width: 80 })
       .text('Change', 410, tableTop + 5, { width: 80 })
       .text('Clicks', 490, tableTop + 5, { width: 50 });

    // Table rows
    rankings.slice(0, 20).forEach((ranking, index) => {
      const y = tableTop + 20 + (index * itemHeight);

      // Alternating row colors
      if (index % 2 === 0) {
        doc.rect(50, y, 495, itemHeight)
           .fill('#f8f9fa');
      }

      doc.fontSize(9)
         .fillColor('#333333')
         .text(ranking.keyword || 'N/A', 60, y + 7, { width: 240, ellipsis: true })
         .text(`#${ranking.position || 'N/A'}`, 320, y + 7, { width: 80 })
         .fillColor(ranking.change > 0 ? '#10b981' : ranking.change < 0 ? '#ef4444' : '#666666')
         .text(ranking.change > 0 ? `+${ranking.change}` : ranking.change || '-', 410, y + 7, { width: 80 })
         .fillColor('#333333')
         .text(ranking.clicks || '0', 490, y + 7, { width: 50 });
    });

    doc.y = tableTop + 20 + (Math.min(rankings.length, 20) * itemHeight) + 20;
  }

  /**
   * Add optimizations section
   */
  addOptimizationsSection(doc, optimizations) {
    if (!optimizations || optimizations.length === 0) return;

    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fontSize(14)
       .fillColor('#333333')
       .text('Completed Optimizations', 50, doc.y + 20);

    doc.moveDown();

    optimizations.slice(0, 10).forEach((optimization, index) => {
      doc.fontSize(10)
         .fillColor('#10b981')
         .text('✓', 60, doc.y)
         .fillColor('#333333')
         .text(optimization.description || optimization, 75, doc.y, { width: 470 });

      doc.moveDown(0.5);
    });

    doc.moveDown();
  }

  /**
   * Add recommendations section
   */
  addRecommendationsSection(doc, recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    if (doc.y > 650) {
      doc.addPage();
      doc.y = 50;
    }

    doc.fontSize(14)
       .fillColor('#333333')
       .text('Recommendations for Next Period', 50, doc.y + 20);

    doc.moveDown();

    recommendations.slice(0, 10).forEach((recommendation, index) => {
      const priority = recommendation.priority || 'medium';
      const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#ffa500' : '#10b981';

      doc.fontSize(10)
         .fillColor(priorityColor)
         .text('•', 60, doc.y)
         .fillColor('#333333')
         .text(recommendation.action || recommendation, 75, doc.y, { width: 470 });

      doc.moveDown(0.5);
    });
  }

  /**
   * Add footer
   */
  addFooter(doc, branding) {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Footer line
      doc.moveTo(50, 790)
         .lineTo(545, 790)
         .strokeColor('#e0e0e0')
         .stroke();

      // Footer text
      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           `${branding.companyName || 'SEO Automation Platform'} | ${branding.website || 'Generated by AI'}`,
           50,
           800,
           { align: 'center', width: 495 }
         );

      // Page number
      doc.text(`Page ${i + 1} of ${pageCount}`, 50, 800, { align: 'right', width: 495 });
    }
  }

  /**
   * Delete report
   */
  deleteReport(filename) {
    const filepath = path.join(this.storageDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }

    return false;
  }

  /**
   * List all reports
   */
  listReports() {
    if (!fs.existsSync(this.storageDir)) {
      return [];
    }

    return fs.readdirSync(this.storageDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filepath = path.join(this.storageDir, file);
        const stats = fs.statSync(filepath);

        return {
          filename: file,
          filepath,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);
  }
}

// Export singleton
export const pdfGenerator = new PDFReportGenerator();
