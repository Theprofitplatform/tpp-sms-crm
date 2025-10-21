import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Report Generator
 */
export class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../logs');
  }

  /**
   * Generate comprehensive audit report
   */
  generateReport(data) {
    const {
      contentAudit = [],
      technicalAudit = {},
      fixes = null,
      metadata = {}
    } = data;

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    const report = {
      timestamp,
      summary: this.generateSummary(contentAudit, technicalAudit, fixes),
      contentAudit: this.processContentAudit(contentAudit),
      technicalAudit,
      fixes,
      recommendations: this.generateRecommendations(contentAudit, technicalAudit),
      metadata
    };

    // Save JSON report
    const jsonPath = path.join(this.reportsDir, `audit-report-${dateStr}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    logger.success(`JSON report saved: ${jsonPath}`);

    // Generate HTML report
    const htmlPath = path.join(this.reportsDir, `audit-report-${dateStr}.html`);
    const html = this.generateHTML(report);
    fs.writeFileSync(htmlPath, html);
    logger.success(`HTML report saved: ${htmlPath}`);

    // Generate markdown summary
    const mdPath = path.join(this.reportsDir, `audit-summary-${dateStr}.md`);
    const markdown = this.generateMarkdown(report);
    fs.writeFileSync(mdPath, markdown);
    logger.success(`Markdown summary saved: ${mdPath}`);

    return {
      jsonPath,
      htmlPath,
      mdPath,
      report
    };
  }

  /**
   * Generate summary statistics
   */
  generateSummary(contentAudit, technicalAudit, fixes) {
    const totalPosts = contentAudit.length;
    const totalIssues = contentAudit.reduce((sum, audit) => sum + audit.issues.length, 0);
    const avgScore = totalPosts > 0
      ? (contentAudit.reduce((sum, audit) => sum + audit.score, 0) / totalPosts).toFixed(1)
      : 0;

    // Categorize issues by severity
    const issuesBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    contentAudit.forEach(audit => {
      audit.issues.forEach(issue => {
        const severity = issue.severity || 'low';
        issuesBySeverity[severity]++;
      });
    });

    // Technical audit summary
    const technicalIssues = technicalAudit.issues?.length || 0;
    const performanceScore = technicalAudit.metrics?.mobile?.scores?.performance || 0;

    return {
      totalPosts,
      totalIssues,
      avgScore,
      issuesBySeverity,
      technicalIssues,
      performanceScore,
      fixesApplied: fixes?.applied || 0,
      fixesTotal: fixes?.total || 0
    };
  }

  /**
   * Process content audit results
   */
  processContentAudit(contentAudit) {
    // Group by issue type
    const issuesByType = {};

    contentAudit.forEach(audit => {
      audit.issues.forEach(issue => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push({
          postId: audit.postId,
          postTitle: audit.title,
          postUrl: audit.url,
          message: issue.message,
          severity: issue.severity
        });
      });
    });

    return {
      posts: contentAudit,
      issuesByType
    };
  }

  /**
   * Generate prioritized recommendations
   */
  generateRecommendations(contentAudit, technicalAudit) {
    const recommendations = [];

    // Critical issues first
    const criticalIssues = [];
    contentAudit.forEach(audit => {
      audit.issues.forEach(issue => {
        if (issue.severity === 'critical') {
          criticalIssues.push({
            post: audit.title,
            postUrl: audit.url,
            issue: issue.message,
            fix: issue.fix
          });
        }
      });
    });

    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        title: 'Address Critical Issues Immediately',
        items: criticalIssues
      });
    }

    // Technical recommendations
    if (technicalAudit.issues?.length > 0) {
      const highPriorityTech = technicalAudit.issues
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => ({ issue: i.message, fix: i.fix }));

      if (highPriorityTech.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          title: 'Technical SEO Improvements',
          items: highPriorityTech
        });
      }
    }

    // Performance recommendations
    if (technicalAudit.metrics?.mobile?.scores?.performance < 70) {
      const perfOpportunities = technicalAudit.metrics.mobile.opportunities?.slice(0, 5) || [];

      if (perfOpportunities.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          title: 'Performance Optimization Opportunities',
          items: perfOpportunities.map(o => ({
            issue: o.title,
            savings: o.savings,
            fix: o.description
          }))
        });
      }
    }

    // Content recommendations
    const commonIssues = this.findCommonIssues(contentAudit);
    if (commonIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Common Content Issues',
        items: commonIssues
      });
    }

    return recommendations;
  }

  /**
   * Find most common issues
   */
  findCommonIssues(contentAudit) {
    const issueCount = {};

    contentAudit.forEach(audit => {
      audit.issues.forEach(issue => {
        const key = `${issue.type}:${issue.message}`;
        if (!issueCount[key]) {
          issueCount[key] = {
            type: issue.type,
            message: issue.message,
            fix: issue.fix,
            count: 0
          };
        }
        issueCount[key].count++;
      });
    });

    return Object.values(issueCount)
      .filter(i => i.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Generate HTML report
   */
  generateHTML(report) {
    const { summary, contentAudit, technicalAudit, recommendations } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${new Date(report.timestamp).toLocaleDateString()}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 { margin: 0 0 10px 0; }
    .header .date { opacity: 0.9; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .summary-card .score-good { color: #10b981; }
    .summary-card .score-warning { color: #f59e0b; }
    .summary-card .score-bad { color: #ef4444; }
    .section {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .section h2 {
      margin-top: 0;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .issue-list {
      list-style: none;
      padding: 0;
    }
    .issue-item {
      padding: 15px;
      margin-bottom: 10px;
      border-left: 4px solid #ddd;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .severity-critical { border-left-color: #ef4444; }
    .severity-high { border-left-color: #f59e0b; }
    .severity-medium { border-left-color: #3b82f6; }
    .severity-low { border-left-color: #10b981; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #dbeafe; color: #1e40af; }
    .badge-low { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SEO Audit Report</h1>
    <div class="date">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <h3>Posts Audited</h3>
      <div class="value">${summary.totalPosts}</div>
    </div>
    <div class="summary-card">
      <h3>Average Score</h3>
      <div class="value ${summary.avgScore >= 70 ? 'score-good' : summary.avgScore >= 50 ? 'score-warning' : 'score-bad'}">
        ${summary.avgScore}/100
      </div>
    </div>
    <div class="summary-card">
      <h3>Total Issues</h3>
      <div class="value score-bad">${summary.totalIssues}</div>
    </div>
    <div class="summary-card">
      <h3>Performance Score</h3>
      <div class="value ${summary.performanceScore >= 70 ? 'score-good' : summary.performanceScore >= 50 ? 'score-warning' : 'score-bad'}">
        ${summary.performanceScore}/100
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Issues by Severity</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>Critical</h3>
        <div class="value score-bad">${summary.issuesBySeverity.critical}</div>
      </div>
      <div class="summary-card">
        <h3>High</h3>
        <div class="value score-warning">${summary.issuesBySeverity.high}</div>
      </div>
      <div class="summary-card">
        <h3>Medium</h3>
        <div class="value">${summary.issuesBySeverity.medium}</div>
      </div>
      <div class="summary-card">
        <h3>Low</h3>
        <div class="value score-good">${summary.issuesBySeverity.low}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Priority Recommendations</h2>
    ${recommendations.map(rec => `
      <div style="margin-bottom: 20px;">
        <h3><span class="badge badge-${rec.priority.toLowerCase()}">${rec.priority}</span> ${rec.title}</h3>
        <ul class="issue-list">
          ${rec.items.map(item => {
            const postId = contentAudit.posts.find(p => p.url === item.postUrl)?.postId;
            const editUrl = postId && item.postUrl ? `${item.postUrl.split('/').slice(0, 3).join('/')}/wp-admin/post.php?post=${postId}&action=edit` : null;
            return `
            <li class="issue-item">
              ${item.post ? `
                <div style="margin-bottom: 8px;">
                  <a href="${item.postUrl}" target="_blank" style="color: #667eea; text-decoration: none; font-weight: 500; margin-right: 12px;">📄 ${item.post}</a>
                  ${editUrl ? `<a href="${editUrl}" target="_blank" style="color: #10b981; font-size: 13px; text-decoration: none;">✏️ Edit</a>` : ''}
                </div>` : ''}
              <strong>${item.issue || item.message}</strong>
              ${item.fix ? `<br><small>Fix: ${item.fix}</small>` : ''}
              ${item.savings ? `<br><small>Potential savings: ${item.savings}</small>` : ''}
            </li>
          `;
          }).join('')}
        </ul>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Content Audit Details</h2>
    ${contentAudit.posts.slice(0, 10).map(post => `
      <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
        <h3>
          <a href="${post.url}" target="_blank" style="color: #333; text-decoration: none;">${post.title}</a>
          <span class="badge ${post.score >= 70 ? 'badge-low' : post.score >= 50 ? 'badge-medium' : 'badge-critical'}">${post.score}/100</span>
        </h3>
        <div style="margin: 5px 0 15px 0;">
          <a href="${post.url}" target="_blank" style="color: #667eea; font-size: 14px; text-decoration: none; margin-right: 15px;">🔗 View Post</a>
          <a href="${post.url.split('/').slice(0, 3).join('/')}/wp-admin/post.php?post=${post.postId}&action=edit" target="_blank" style="color: #10b981; font-size: 14px; text-decoration: none;">✏️ Edit in WordPress</a>
        </div>
        ${post.issues.length > 0 ? `
          <ul class="issue-list">
            ${post.issues.map(issue => `
              <li class="issue-item severity-${issue.severity}">
                <span class="badge badge-${issue.severity}">${issue.severity}</span>
                ${issue.message}
                ${issue.fix ? `<br><small><strong>Fix:</strong> ${issue.fix}</small>` : ''}
              </li>
            `).join('')}
          </ul>
        ` : '<p>No issues found</p>'}
      </div>
    `).join('')}
  </div>

  <footer style="text-align: center; margin-top: 40px; color: #666;">
    <p>Generated by WordPress SEO Automation Tool</p>
  </footer>
</body>
</html>`;
  }

  /**
   * Generate Markdown summary
   */
  generateMarkdown(report) {
    const { summary, recommendations, contentAudit } = report;

    return `# SEO Audit Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Posts Audited:** ${summary.totalPosts}
- **Average Score:** ${summary.avgScore}/100
- **Total Issues:** ${summary.totalIssues}
- **Performance Score:** ${summary.performanceScore}/100

### Issues by Severity

- **Critical:** ${summary.issuesBySeverity.critical}
- **High:** ${summary.issuesBySeverity.high}
- **Medium:** ${summary.issuesBySeverity.medium}
- **Low:** ${summary.issuesBySeverity.low}

## Priority Recommendations

${recommendations.map(rec => `
### ${rec.priority}: ${rec.title}

${rec.items.map(item => `
${item.post ? `- 📄 **[${item.post}](${item.postUrl})**\n` : ''}- **${item.issue || item.message}**
  ${item.fix ? `- *Fix:* ${item.fix}` : ''}
  ${item.savings ? `- *Savings:* ${item.savings}` : ''}
`).join('\n')}
`).join('\n')}

## Posts Audited

${contentAudit.posts.slice(0, 10).map(post => `
### [${post.title}](${post.url}) - ${post.score}/100

**Issues Found:** ${post.issues.length}

${post.issues.length > 0 ? post.issues.map(issue => `
- **[${issue.severity.toUpperCase()}]** ${issue.message}
  - *Fix:* ${issue.fix || 'N/A'}
`).join('') : '*No issues found*'}
`).join('\n')}

---

*Generated by WordPress SEO Automation Tool*
`;
  }

  /**
   * Generate JSON report only (for testing/individual use)
   */
  generateJSON(data) {
    const { summary, posts } = data;
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    const report = {
      timestamp,
      summary,
      posts
    };

    const jsonPath = path.join(this.reportsDir, `audit-report-${dateStr}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    return jsonPath;
  }

  /**
   * Generate Markdown report only (for testing/individual use)
   */
  generateMarkdownFile(data) {
    const { summary, posts } = data;
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    const report = {
      timestamp,
      summary,
      contentAudit: { posts },
      technicalAudit: {},
      recommendations: []
    };

    const markdown = this.generateMarkdown(report);
    const mdPath = path.join(this.reportsDir, `audit-summary-${dateStr}.md`);
    fs.writeFileSync(mdPath, markdown);

    return mdPath;
  }

  /**
   * Generate HTML report only (for testing/individual use)
   */
  generateHTMLFile(data) {
    const { summary, posts } = data;
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];

    const report = {
      timestamp,
      summary,
      contentAudit: { posts },
      technicalAudit: {},
      recommendations: []
    };

    const html = this.generateHTML(report);
    const htmlPath = path.join(this.reportsDir, `audit-report-${dateStr}.html`);
    fs.writeFileSync(htmlPath, html);

    return htmlPath;
  }

  /**
   * Calculate summary statistics from posts array
   */
  calculateSummary(posts) {
    const totalPosts = posts.length;
    const totalIssues = posts.reduce((sum, post) => {
      return sum + (post.issues?.length || 0);
    }, 0);
    const averageScore = totalPosts > 0
      ? Math.round(posts.reduce((sum, post) => sum + (post.score || 0), 0) / totalPosts)
      : 0;

    // Count issues by severity
    let criticalIssues = 0;
    let warnings = 0;

    posts.forEach(post => {
      (post.issues || []).forEach(issue => {
        if (issue.severity === 'critical') {
          criticalIssues++;
        } else if (issue.severity === 'warning') {
          warnings++;
        }
      });
    });

    return {
      totalPosts,
      totalIssues,
      averageScore,
      criticalIssues,
      warnings
    };
  }

  /**
   * Generate all report formats and return file paths
   */
  generateAll(data) {
    const jsonPath = this.generateJSON(data);
    const mdPath = this.generateMarkdownFile(data);
    const htmlPath = this.generateHTMLFile(data);

    return [jsonPath, mdPath, htmlPath];
  }
}

/**
 * Generate and save report
 */
export function generateReport(data) {
  const generator = new ReportGenerator();
  return generator.generateReport(data);
}
