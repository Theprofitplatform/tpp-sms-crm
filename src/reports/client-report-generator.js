/**
 * Client Report Generator
 * Creates beautiful HTML reports from automation results
 */

import fs from 'fs';
import path from 'path';

export class ClientReportGenerator {
  constructor(clientConfig, automationResults) {
    this.client = clientConfig;
    this.results = automationResults;
    this.reportDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Generate complete HTML report
   */
  generateHTML() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Report - ${this.client.name} - ${this.reportDate}</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="container">
    ${this.generateHeader()}
    ${this.generateExecutiveSummary()}
    ${this.generateMetricsSection()}
    ${this.generateQuickWins()}
    ${this.generateOptimizations()}
    ${this.generateRecommendations()}
    ${this.generateFooter()}
  </div>
</body>
</html>
`;
    return html;
  }

  getStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f5f5f5;
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        padding: 40px;
      }

      .header {
        text-align: center;
        padding-bottom: 30px;
        border-bottom: 3px solid #0066cc;
        margin-bottom: 40px;
      }

      .header h1 {
        color: #0066cc;
        font-size: 32px;
        margin-bottom: 10px;
      }

      .header .date {
        color: #666;
        font-size: 14px;
      }

      .section {
        margin-bottom: 40px;
      }

      .section h2 {
        color: #0066cc;
        font-size: 24px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #eee;
      }

      .executive-summary {
        background: #f8f9fa;
        padding: 25px;
        border-radius: 8px;
        border-left: 4px solid #0066cc;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .metric-card {
        background: #fff;
        border: 2px solid #eee;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }

      .metric-card.success { border-color: #28a745; }
      .metric-card.warning { border-color: #ffc107; }
      .metric-card.info { border-color: #0066cc; }

      .metric-value {
        font-size: 36px;
        font-weight: bold;
        color: #0066cc;
        margin-bottom: 5px;
      }

      .metric-label {
        color: #666;
        font-size: 14px;
        text-transform: uppercase;
      }

      .metric-trend {
        font-size: 14px;
        margin-top: 10px;
      }

      .metric-trend.up { color: #28a745; }
      .metric-trend.down { color: #dc3545; }

      .table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }

      .table th {
        background: #0066cc;
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: 600;
      }

      .table td {
        padding: 12px;
        border-bottom: 1px solid #eee;
      }

      .table tr:hover {
        background: #f8f9fa;
      }

      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }

      .badge.success { background: #d4edda; color: #155724; }
      .badge.warning { background: #fff3cd; color: #856404; }
      .badge.info { background: #d1ecf1; color: #0c5460; }

      .recommendations {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 20px;
        border-radius: 8px;
      }

      .recommendations ul {
        margin-left: 20px;
        margin-top: 10px;
      }

      .recommendations li {
        margin-bottom: 10px;
        line-height: 1.8;
      }

      .footer {
        margin-top: 60px;
        padding-top: 20px;
        border-top: 2px solid #eee;
        text-align: center;
        color: #666;
        font-size: 14px;
      }

      .highlight {
        background: linear-gradient(transparent 60%, #fff3cd 60%);
        padding: 2px 4px;
      }
    `;
  }

  generateHeader() {
    return `
      <div class="header">
        <h1>SEO Performance Report</h1>
        <h2>${this.client.name}</h2>
        <p class="date">Report Period: ${this.reportDate}</p>
        <p class="date">${this.client.url}</p>
      </div>
    `;
  }

  generateExecutiveSummary() {
    const metrics = this.results.phases?.metrics || {};
    const quickWins = this.results.phases?.quickWins || {};
    const bulkOpt = this.results.phases?.bulkOptimization || {};

    return `
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="executive-summary">
          <p style="font-size: 18px; margin-bottom: 15px;">
            <strong>Your website's SEO performance this week:</strong>
          </p>
          <ul style="line-height: 2; margin-left: 20px;">
            <li><strong>${quickWins.total || 0}</strong> quick win opportunities identified that could drive <strong>+${quickWins.estimatedTrafficGain || 0} clicks/month</strong></li>
            <li><strong>${bulkOpt?.optimized || 0}</strong> pages optimized with improved metadata and schema markup</li>
            <li>Your site received <strong>${metrics.totalClicks || 0} clicks</strong> and <strong>${metrics.totalImpressions || 0} impressions</strong> from Google</li>
            <li>Average search position: <strong>${metrics.averagePosition || 'N/A'}</strong></li>
          </ul>
        </div>
      </div>
    `;
  }

  generateMetricsSection() {
    const metrics = this.results.phases?.metrics || {};
    const quickWins = this.results.phases?.quickWins || {};

    return `
      <div class="section">
        <h2>Key Performance Metrics</h2>
        <div class="metrics-grid">
          <div class="metric-card info">
            <div class="metric-value">${metrics.totalClicks || 0}</div>
            <div class="metric-label">Total Clicks</div>
            <div class="metric-trend">Last 30 days</div>
          </div>
          <div class="metric-card info">
            <div class="metric-value">${(metrics.totalImpressions || 0).toLocaleString()}</div>
            <div class="metric-label">Impressions</div>
            <div class="metric-trend">Last 30 days</div>
          </div>
          <div class="metric-card ${parseFloat(metrics.averageCTR || 0) > 2 ? 'success' : 'warning'}">
            <div class="metric-value">${metrics.averageCTR || 0}%</div>
            <div class="metric-label">Click Rate</div>
            <div class="metric-trend">${parseFloat(metrics.averageCTR || 0) > 2 ? 'Above average' : 'Room for improvement'}</div>
          </div>
          <div class="metric-card ${parseFloat(metrics.averagePosition || 99) < 10 ? 'success' : 'warning'}">
            <div class="metric-value">${metrics.averagePosition || 'N/A'}</div>
            <div class="metric-label">Avg Position</div>
            <div class="metric-trend">${parseFloat(metrics.averagePosition || 99) < 10 ? 'Top 10!' : 'Improving...'}</div>
          </div>
        </div>
      </div>
    `;
  }

  generateQuickWins() {
    const quickWins = this.results.phases?.quickWins?.opportunities || [];

    if (quickWins.length === 0) {
      return '';
    }

    const rows = quickWins.slice(0, 10).map(kw => `
      <tr>
        <td>${kw.keyword}</td>
        <td style="text-align: center;">${kw.position}</td>
        <td style="text-align: center;">${kw.impressions}</td>
        <td style="text-align: center;">${kw.clicks}</td>
        <td><span class="badge success">Optimize Now</span></td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <h2>🎯 Quick Win Opportunities</h2>
        <p style="margin-bottom: 15px;">
          These keywords are ranking on page 2 (positions 11-20).
          <span class="highlight">Small improvements can move them to page 1 and significantly increase traffic.</span>
        </p>
        <table class="table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th style="text-align: center;">Position</th>
              <th style="text-align: center;">Impressions</th>
              <th style="text-align: center;">Clicks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          <strong>Potential impact:</strong> Moving these keywords to position 5 could add
          <strong>+${this.results.phases?.quickWins?.estimatedTrafficGain || 0} clicks per month</strong>.
        </p>
      </div>
    `;
  }

  generateOptimizations() {
    const bulkOpt = this.results.phases?.bulkOptimization || {};

    const optimized = bulkOpt.optimized || 0;
    const failed = bulkOpt.failed || 0;
    const skipped = bulkOpt.skipped || 0;

    return `
      <div class="section">
        <h2>✅ Optimizations Completed</h2>
        <div class="metrics-grid">
          <div class="metric-card success">
            <div class="metric-value">${optimized}</div>
            <div class="metric-label">Pages Optimized</div>
          </div>
          <div class="metric-card info">
            <div class="metric-value">${skipped}</div>
            <div class="metric-label">Already Optimized</div>
          </div>
          ${failed > 0 ? `
          <div class="metric-card warning">
            <div class="metric-value">${failed}</div>
            <div class="metric-label">Needs Review</div>
          </div>
          ` : ''}
        </div>
        <p style="margin-top: 15px;">
          This week we updated metadata, schema markup, and SEO settings on <strong>${optimized} pages</strong>
          to improve their visibility in search results.
        </p>
      </div>
    `;
  }

  generateRecommendations() {
    const recommendations = [];

    const quickWins = this.results.phases?.quickWins?.opportunities || [];
    if (quickWins.length > 0) {
      recommendations.push(`Focus on the top ${Math.min(5, quickWins.length)} quick win keywords - they're closest to page 1`);
    }

    const lowCTR = this.results.phases?.lowCTR?.pages || [];
    if (lowCTR.length > 0) {
      recommendations.push(`Improve title tags and meta descriptions for ${lowCTR.length} pages with low click-through rates`);
    }

    const metrics = this.results.phases?.metrics || {};
    if (parseFloat(metrics.averagePosition || 99) > 10) {
      recommendations.push('Continue building high-quality backlinks to improve average rankings');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring rankings and creating quality content');
      recommendations.push('Focus on technical SEO improvements and site speed');
    }

    const items = recommendations.map(r => `<li>${r}</li>`).join('');

    return `
      <div class="section">
        <h2>📌 Recommended Actions</h2>
        <div class="recommendations">
          <p><strong>Focus areas for next week:</strong></p>
          <ul>
            ${items}
          </ul>
        </div>
      </div>
    `;
  }

  generateFooter() {
    return `
      <div class="footer">
        <p><strong>SEO Automation Report</strong></p>
        <p>Generated automatically on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p style="margin-top: 10px; font-size: 12px;">
          This report is based on data from Google Search Console and automated SEO analysis.
        </p>
      </div>
    `;
  }

  /**
   * Save report to file
   */
  async saveToFile(outputDir = null) {
    const dir = outputDir || `logs/clients/${this.client.id}/reports`;

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `seo-report-${this.reportDate}.html`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, this.generateHTML(), 'utf8');

    console.log(`✅ Report saved: ${filepath}`);
    return filepath;
  }

  /**
   * Get plain text summary for email
   */
  getTextSummary() {
    const metrics = this.results.phases?.metrics || {};
    const quickWins = this.results.phases?.quickWins || {};
    const bulkOpt = this.results.phases?.bulkOptimization || {};

    return `
SEO PERFORMANCE REPORT
${this.client.name}
${this.reportDate}

SUMMARY:
- ${quickWins.total || 0} quick win opportunities identified (+${quickWins.estimatedTrafficGain || 0} potential clicks/month)
- ${bulkOpt?.optimized || 0} pages optimized this week
- ${metrics.totalClicks || 0} clicks from Google (last 30 days)
- ${metrics.totalImpressions || 0} impressions (last 30 days)
- Average position: ${metrics.averagePosition || 'N/A'}

View the full HTML report for detailed analysis and recommendations.

---
Generated by SEO Automation System
    `.trim();
  }
}
