/**
 * LOCAL SEO REPORT GENERATOR
 * 
 * Generates comprehensive reports in multiple formats
 * Supports HTML, JSON, and Markdown exports
 */

import fs from 'fs/promises';
import path from 'path';

export class ReportGenerator {
  constructor(auditResults, clientConfig) {
    this.results = auditResults;
    this.config = clientConfig;
  }

  /**
   * Generate HTML report
   */
  async generateHTML() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local SEO Report - ${this.config.businessName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a73e8; margin-bottom: 10px; font-size: 32px; }
    h2 { color: #333; margin: 30px 0 15px; font-size: 24px; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    h3 { color: #555; margin: 20px 0 10px; font-size: 18px; }
    .header { border-bottom: 3px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; }
    .score-card { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 30px; border-radius: 8px; margin: 20px 0; }
    .score-value { font-size: 48px; font-weight: bold; }
    .score-label { font-size: 14px; opacity: 0.9; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #1a73e8; }
    .metric-value { font-size: 32px; font-weight: bold; color: #1a73e8; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    .recommendation { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .priority-critical { border-left-color: #dc3545; background: #f8d7da; }
    .priority-high { border-left-color: #fd7e14; background: #ffe5d0; }
    .priority-medium { border-left-color: #ffc107; background: #fff3cd; }
    .priority-low { border-left-color: #28a745; background: #d4edda; }
    .recommendation-title { font-weight: bold; margin-bottom: 5px; }
    .recommendation-impact { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .status-good { color: #28a745; font-weight: bold; }
    .status-warning { color: #ffc107; font-weight: bold; }
    .status-bad { color: #dc3545; font-weight: bold; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Local SEO Audit Report</h1>
      <div class="meta">
        <strong>${this.config.businessName}</strong><br>
        ${this.config.siteUrl}<br>
        Generated: ${new Date(this.results.timestamp).toLocaleString()}
      </div>
    </div>

    <div class="score-card">
      <div class="score-label">OVERALL SCORE</div>
      <div class="score-value">${this.results.score || this.calculateOverallScore()}/100</div>
    </div>

    <h2>Performance Metrics</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${this.results.tasks?.napConsistency?.score || 0}</div>
        <div class="metric-label">NAP Consistency</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.tasks?.schema?.hasSchema ? 100 : 0}</div>
        <div class="metric-label">Schema Markup</div>
      </div>
      ${this.results.advanced ? `
      <div class="metric">
        <div class="metric-value">${this.results.advanced.citations?.analysis?.score || 0}</div>
        <div class="metric-label">Citations</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.reviews?.summary?.reputationScore || 0}</div>
        <div class="metric-label">Reputation</div>
      </div>
      ` : ''}
    </div>

    <h2>NAP Consistency Analysis</h2>
    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Business Name Found</th>
          <th>Phone Numbers</th>
          <th>Emails</th>
          <th>Schema Present</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateNAPTableRows()}
      </tbody>
    </table>

    ${this.results.advanced?.citations ? `
    <h2>Citation Analysis</h2>
    <p>
      <strong>Citations Found:</strong> ${this.results.advanced.citations.analysis.found}/${this.results.advanced.citations.analysis.total}<br>
      <strong>Citation Score:</strong> ${this.results.advanced.citations.analysis.score}/100<br>
      <strong>Consistent Citations:</strong> ${this.results.advanced.citations.analysis.consistent}<br>
      <strong>Inconsistent Citations:</strong> ${this.results.advanced.citations.analysis.inconsistent}
    </p>
    ${this.results.advanced.citations.analysis.missingCritical && this.results.advanced.citations.analysis.missingCritical.length > 0 ? `
    <h3>Missing Critical Citations</h3>
    <ul>
      ${this.results.advanced.citations.analysis.missingCritical.map(c => `<li><strong>${c.source}</strong></li>`).join('')}
    </ul>
    ` : ''}
    ` : ''}

    ${this.results.advanced?.competitors ? `
    <h2>Competitive Analysis</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">#${this.results.advanced.competitors.comparison.position}</div>
        <div class="metric-label">Market Position</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.competitors.comparison.gap > 0 ? '+' : ''}${this.results.advanced.competitors.comparison.gap}</div>
        <div class="metric-label">vs Avg Competitor</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.competitors.comparison.percentile}%</div>
        <div class="metric-label">Percentile</div>
      </div>
    </div>
    ` : ''}

    ${this.results.advanced?.reviews ? `
    <h2>Review Summary</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${this.results.advanced.reviews.summary.totalReviews}</div>
        <div class="metric-label">Total Reviews</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.reviews.summary.averageRating}⭐</div>
        <div class="metric-label">Average Rating</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.reviews.summary.reputationScore}</div>
        <div class="metric-label">Reputation Score</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.advanced.reviews.summary.responseRate}%</div>
        <div class="metric-label">Response Rate</div>
      </div>
    </div>
    ` : ''}

    <h2>Recommendations</h2>
    ${this.generateRecommendationsHTML()}

    <h2>Directory Submission Tracker</h2>
    <p>
      <strong>High Priority Directories:</strong> ${this.results.tasks?.directories?.tier1Count || 0}<br>
      <strong>Total Directories Identified:</strong> ${this.results.tasks?.directories?.totalDirectories || 0}
    </p>
    ${this.results.tasks?.directories?.criticalDirectories ? `
    <h3>Critical Directories</h3>
    <ul>
      ${this.results.tasks.directories.criticalDirectories.map(d => `<li><strong>${d.name}</strong> - ${d.priority}</li>`).join('')}
    </ul>
    ` : ''}

    <div class="footer">
      <p>Generated by SEO Automation Platform</p>
      <p>Report ID: ${this.results.client}_${Date.now()}</p>
    </div>
  </div>
</body>
</html>
    `;

    return html.trim();
  }

  /**
   * Generate NAP table rows
   */
  generateNAPTableRows() {
    const findings = this.results.tasks?.napConsistency?.findings || [];
    
    return findings.map(finding => `
      <tr>
        <td>${finding.url}</td>
        <td>${finding.businessName?.length || 0} variations</td>
        <td>${finding.phones?.length || 0}</td>
        <td>${finding.emails?.length || 0}</td>
        <td>${finding.schemas?.length > 0 ? '<span class="status-good">✓ Yes</span>' : '<span class="status-warning">✗ No</span>'}</td>
      </tr>
    `).join('');
  }

  /**
   * Generate recommendations HTML
   */
  generateRecommendationsHTML() {
    const recommendations = this.results.recommendations || [];
    
    if (recommendations.length === 0) {
      return '<p>No recommendations at this time. Your Local SEO is performing well!</p>';
    }

    return recommendations.map(rec => `
      <div class="recommendation priority-${rec.priority.toLowerCase()}">
        <div class="recommendation-title">
          ${this.getPriorityEmoji(rec.priority)} [${rec.priority}] ${rec.category}: ${rec.action}
        </div>
        <div class="recommendation-impact">${rec.impact}</div>
      </div>
    `).join('');
  }

  /**
   * Get priority emoji
   */
  getPriorityEmoji(priority) {
    const emojis = {
      CRITICAL: '🚨',
      HIGH: '🔴',
      MEDIUM: '🟡',
      LOW: '🟢'
    };
    return emojis[priority] || '⚪';
  }

  /**
   * Calculate overall score
   */
  calculateOverallScore() {
    const napScore = this.results.tasks?.napConsistency?.score || 0;
    const schemaScore = this.results.tasks?.schema?.hasSchema ? 100 : 0;
    
    if (this.results.advanced) {
      const citationScore = this.results.advanced?.citations?.analysis?.score || 0;
      const reviewScore = this.results.advanced?.reviews?.summary?.reputationScore || 0;
      return Math.round((napScore * 0.25) + (schemaScore * 0.20) + (citationScore * 0.30) + (reviewScore * 0.25));
    }
    
    return Math.round((napScore + schemaScore) / 2);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdown() {
    const score = this.results.score || this.calculateOverallScore();
    
    let md = `# Local SEO Audit Report\n\n`;
    md += `**Business:** ${this.config.businessName}\n`;
    md += `**Website:** ${this.config.siteUrl}\n`;
    md += `**Date:** ${new Date(this.results.timestamp).toLocaleString()}\n\n`;
    md += `---\n\n`;
    
    md += `## Overall Score: ${score}/100\n\n`;
    
    md += `### Performance Metrics\n\n`;
    md += `| Metric | Score | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| NAP Consistency | ${this.results.tasks?.napConsistency?.score || 0} | ${this.getStatus(this.results.tasks?.napConsistency?.score)} |\n`;
    md += `| Schema Markup | ${this.results.tasks?.schema?.hasSchema ? 100 : 0} | ${this.results.tasks?.schema?.hasSchema ? '✅ Present' : '❌ Missing'} |\n`;
    
    if (this.results.advanced) {
      md += `| Citations | ${this.results.advanced.citations?.analysis?.score || 0} | ${this.getStatus(this.results.advanced.citations?.analysis?.score)} |\n`;
      md += `| Reputation | ${this.results.advanced.reviews?.summary?.reputationScore || 0} | ${this.getStatus(this.results.advanced.reviews?.summary?.reputationScore)} |\n`;
      
      if (this.results.advanced.competitors) {
        md += `| Market Position | #${this.results.advanced.competitors.comparison.position} | ${this.results.advanced.competitors.comparison.position <= 3 ? '✅ Top 3' : '⚠️ Improve'} |\n`;
      }
    }
    
    md += `\n---\n\n`;
    
    // Recommendations
    md += `## Recommendations\n\n`;
    const recommendations = this.results.recommendations || [];
    
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
      const recs = recommendations.filter(r => r.priority === priority);
      if (recs.length > 0) {
        md += `### ${priority} Priority\n\n`;
        recs.forEach((rec, i) => {
          md += `${i + 1}. **${rec.category}:** ${rec.action}\n`;
          md += `   - *Impact:* ${rec.impact}\n\n`;
        });
      }
    });
    
    // NAP Details
    md += `\n---\n\n`;
    md += `## NAP Consistency Details\n\n`;
    const findings = this.results.tasks?.napConsistency?.findings || [];
    findings.forEach(finding => {
      md += `### ${finding.url}\n`;
      md += `- Business Names: ${finding.businessName?.length || 0} variations\n`;
      md += `- Phone Numbers: ${finding.phones?.length || 0} found\n`;
      md += `- Emails: ${finding.emails?.length || 0} found\n`;
      md += `- Schema: ${finding.schemas?.length > 0 ? '✅ Present' : '❌ Missing'}\n\n`;
    });
    
    return md;
  }

  /**
   * Generate JSON report
   */
  async generateJSON() {
    return JSON.stringify({
      reportMeta: {
        businessName: this.config.businessName,
        website: this.config.siteUrl,
        generatedAt: new Date().toISOString(),
        reportType: this.results.advanced ? 'advanced' : 'basic'
      },
      overallScore: this.results.score || this.calculateOverallScore(),
      metrics: {
        napConsistency: this.results.tasks?.napConsistency?.score || 0,
        schemaMarkup: this.results.tasks?.schema?.hasSchema ? 100 : 0,
        citations: this.results.advanced?.citations?.analysis?.score || null,
        reputation: this.results.advanced?.reviews?.summary?.reputationScore || null,
        competitivePosition: this.results.advanced?.competitors?.comparison?.position || null
      },
      recommendations: this.results.recommendations || [],
      fullResults: this.results
    }, null, 2);
  }

  /**
   * Get status label
   */
  getStatus(score) {
    if (score >= 80) return '✅ Excellent';
    if (score >= 60) return '⚠️ Good';
    if (score >= 40) return '⚠️ Fair';
    return '❌ Poor';
  }

  /**
   * Save report to file
   */
  async saveReport(format = 'html', outputDir = './reports') {
    await fs.mkdir(outputDir, { recursive: true });

    const timestamp = Date.now();
    const basename = `local-seo-${this.config.id}-${timestamp}`;
    
    let content, filename;
    
    switch (format.toLowerCase()) {
      case 'html':
        content = await this.generateHTML();
        filename = `${basename}.html`;
        break;
      case 'json':
        content = await this.generateJSON();
        filename = `${basename}.json`;
        break;
      case 'md':
      case 'markdown':
        content = await this.generateMarkdown();
        filename = `${basename}.md`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, content, 'utf8');

    return {
      format,
      filename,
      filepath,
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  /**
   * Generate all formats
   */
  async saveAllFormats(outputDir = './reports') {
    const results = await Promise.all([
      this.saveReport('html', outputDir),
      this.saveReport('json', outputDir),
      this.saveReport('markdown', outputDir)
    ]);

    return {
      generated: 3,
      formats: results,
      outputDir
    };
  }
}

export default ReportGenerator;
