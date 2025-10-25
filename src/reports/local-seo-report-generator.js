/**
 * LOCAL SEO REPORT GENERATOR
 *
 * Generates comprehensive HTML reports for Local SEO audits
 *
 * @module local-seo-report-generator
 */

import fs from 'fs/promises';
import path from 'path';

export class LocalSEOReportGenerator {
  constructor(auditResults, clientConfig) {
    this.results = auditResults;
    this.config = clientConfig;
  }

  /**
   * Generate complete HTML report
   */
  async generateHTMLReport(outputPath) {
    const html = this.buildHTML();
    await fs.writeFile(outputPath, html);
    return outputPath;
  }

  /**
   * Build HTML content
   */
  buildHTML() {
    const date = new Date().toLocaleDateString();
    const napScore = this.results.tasks?.napConsistency?.score || 0;
    const hasSchema = this.results.tasks?.schema?.hasSchema || false;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local SEO Report - ${this.config.businessName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .card h2 {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        .score-circle {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3em;
            font-weight: bold;
            margin: 20px auto;
        }

        .score-excellent { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
        .score-good { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
        .score-fair { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; }
        .score-poor { background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%); color: white; }

        .metric {
            display: flex;
            justify-content: space-between;
            padding: 15px;
            border-bottom: 1px solid #eee;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-weight: 600;
            color: #555;
        }

        .metric-value {
            color: #667eea;
            font-weight: bold;
        }

        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }

        .status-success { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-danger { background: #f8d7da; color: #721c24; }

        .recommendations {
            list-style: none;
        }

        .recommendations li {
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
            background: #f8f9fa;
            border-radius: 5px;
        }

        .recommendations li.high {
            border-left-color: #dc3545;
            background: #fff5f5;
        }

        .recommendations li.medium {
            border-left-color: #ffc107;
            background: #fffbf0;
        }

        .priority-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: 600;
            margin-right: 10px;
        }

        .priority-high { background: #dc3545; color: white; }
        .priority-medium { background: #ffc107; color: #333; }
        .priority-low { background: #28a745; color: white; }

        .directory-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }

        .directory-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }

        .directory-item.tier1 {
            border-left-color: #dc3545;
        }

        .directory-item.tier2 {
            border-left-color: #ffc107;
        }

        .directory-name {
            font-weight: 600;
            margin-bottom: 5px;
        }

        .directory-url {
            font-size: 0.9em;
            color: #667eea;
            text-decoration: none;
        }

        .directory-url:hover {
            text-decoration: underline;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
            color: #555;
        }

        .issue-item {
            padding: 10px;
            margin-bottom: 10px;
            background: #fff5f5;
            border-left: 4px solid #dc3545;
            border-radius: 5px;
        }

        .warning-item {
            padding: 10px;
            margin-bottom: 10px;
            background: #fffbf0;
            border-left: 4px solid #ffc107;
            border-radius: 5px;
        }

        .footer {
            text-align: center;
            padding: 30px;
            color: #999;
            font-size: 0.9em;
        }

        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏪 Local SEO Report</h1>
            <p>${this.config.businessName}</p>
            <p>Generated: ${date}</p>
        </div>

        ${this.buildScoreSection(napScore)}
        ${this.buildNAPSection()}
        ${this.buildSchemaSection(hasSchema)}
        ${this.buildDirectoriesSection()}
        ${this.buildReviewsSection()}
        ${this.buildRecommendationsSection()}

        <div class="footer">
            <p>Report generated by SEO Automation System</p>
            <p>${date}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Build score overview section
   */
  buildScoreSection(napScore) {
    const scoreClass = napScore >= 85 ? 'score-excellent' :
                       napScore >= 70 ? 'score-good' :
                       napScore >= 50 ? 'score-fair' : 'score-poor';

    const grade = napScore >= 85 ? 'A' :
                  napScore >= 70 ? 'B' :
                  napScore >= 50 ? 'C' : 'F';

    return `
        <div class="card">
            <h2>📊 Overall NAP Consistency Score</h2>
            <div class="score-circle ${scoreClass}">
                ${napScore}<span style="font-size: 0.4em">/ 100</span>
            </div>
            <div style="text-align: center; font-size: 1.5em; margin-top: 10px;">
                Grade: ${grade}
            </div>
        </div>
    `;
  }

  /**
   * Build NAP consistency section
   */
  buildNAPSection() {
    const napData = this.results.tasks?.napConsistency;
    if (!napData) return '';

    const issues = napData.issues || [];
    const warnings = napData.warnings || [];
    const findings = napData.findings || [];

    return `
        <div class="card">
            <h2>📍 NAP Consistency Analysis</h2>

            <div class="metric">
                <span class="metric-label">Pages Checked:</span>
                <span class="metric-value">${findings.length}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Issues Found:</span>
                <span class="metric-value">${issues.length}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Warnings:</span>
                <span class="metric-value">${warnings.length}</span>
            </div>

            ${issues.length > 0 ? `
                <h3 style="margin-top: 30px; color: #dc3545;">❌ Issues (${issues.length})</h3>
                ${issues.map(issue => `
                    <div class="issue-item">
                        <strong>[${issue.severity}] ${issue.message}</strong>
                        ${issue.details ? `
                            <div style="margin-top: 10px; font-size: 0.9em;">
                                ${Array.isArray(issue.details) ?
                                    '<ul>' + issue.details.map(d => `<li>${typeof d === 'string' ? d : JSON.stringify(d)}</li>`).join('') + '</ul>' :
                                    JSON.stringify(issue.details)
                                }
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            ` : '<p style="margin-top: 20px; color: #28a745;">✅ No issues found! NAP is consistent.</p>'}

            ${warnings.length > 0 ? `
                <h3 style="margin-top: 30px; color: #ffc107;">⚠️ Warnings (${warnings.length})</h3>
                ${warnings.map(warning => `
                    <div class="warning-item">
                        <strong>${warning.message}</strong>
                        ${warning.details ? `
                            <div style="margin-top: 10px; font-size: 0.9em;">
                                <ul>
                                    ${warning.details.map(d => `<li>${d}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            ` : ''}
        </div>
    `;
  }

  /**
   * Build schema section
   */
  buildSchemaSection(hasSchema) {
    const schemaData = this.results.tasks?.schema;
    if (!schemaData) return '';

    return `
        <div class="card">
            <h2>🏷️ Local Business Schema</h2>

            <div class="metric">
                <span class="metric-label">Schema Status:</span>
                <span class="status-badge ${hasSchema ? 'status-success' : 'status-danger'}">
                    ${hasSchema ? '✅ Schema Found' : '❌ Schema Missing'}
                </span>
            </div>

            ${!hasSchema && schemaData.schemaGenerated ? `
                <div style="margin-top: 20px;">
                    <h3>📝 Recommended Schema Markup</h3>
                    <p style="margin: 10px 0; color: #666;">Add this schema to your homepage to improve local SEO:</p>
                    <pre style="font-size: 0.85em; max-height: 400px; overflow-y: auto;">${this.escapeHtml(schemaData.schemaGenerated)}</pre>
                </div>
            ` : ''}

            ${hasSchema ? `
                <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 5px;">
                    <p style="color: #155724;">✅ Your website already has local business schema markup. Great job!</p>
                </div>
            ` : ''}
        </div>
    `;
  }

  /**
   * Build directories section
   */
  buildDirectoriesSection() {
    const dirData = this.results.tasks?.directories;
    if (!dirData) return '';

    return `
        <div class="card">
            <h2>📂 Directory Submissions</h2>

            <div class="metric">
                <span class="metric-label">Total Directories:</span>
                <span class="metric-value">${dirData.totalDirectories}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Tier 1 (Critical):</span>
                <span class="metric-value">${dirData.tier1Count}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Tier 2 (Important):</span>
                <span class="metric-value">${dirData.tier2Count}</span>
            </div>

            <h3 style="margin-top: 30px;">Priority Directories to Submit</h3>
            <p style="color: #666; margin-bottom: 20px;">Focus on these high-impact directories first:</p>

            <div class="directory-list">
                ${(dirData.recommendedDirectories || []).slice(0, 6).map(dir => `
                    <div class="directory-item tier${dir.tier}">
                        <div class="directory-name">${dir.name}</div>
                        <a href="${dir.url}" class="directory-url" target="_blank">${dir.url}</a>
                        <div style="margin-top: 5px; font-size: 0.85em; color: #666;">
                            Priority: ${dir.priority}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 5px;">
                <p>📄 <strong>CSV Tracker Generated:</strong> Check your reports folder for a complete spreadsheet to track all submissions.</p>
            </div>
        </div>
    `;
  }

  /**
   * Build reviews section
   */
  buildReviewsSection() {
    return `
        <div class="card">
            <h2>⭐ Review Request Automation</h2>

            <p style="margin-bottom: 20px;">Email templates have been generated to request reviews from customers.</p>

            <div style="padding: 15px; background: #fff3cd; border-radius: 5px; margin-bottom: 15px;">
                <strong>⚠️ Action Required:</strong> Set up your Google Review Link to enable automated review requests.
            </div>

            <h3 style="margin-top: 20px;">Next Steps:</h3>
            <ol style="margin-left: 20px; line-height: 1.8;">
                <li>Get your Google Review link from Google Business Profile</li>
                <li>Update client configuration with review link</li>
                <li>Use generated email templates to request reviews</li>
                <li>Target: 5-10 reviews within first month</li>
            </ol>
        </div>
    `;
  }

  /**
   * Build recommendations section
   */
  buildRecommendationsSection() {
    // Generate recommendations based on results
    const recommendations = [];

    const napScore = this.results.tasks?.napConsistency?.score || 0;
    const hasSchema = this.results.tasks?.schema?.hasSchema || false;
    const tier1Count = this.results.tasks?.directories?.tier1Count || 0;

    if (napScore < 85) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Fix NAP Inconsistencies',
        description: 'Standardize your business name, address, and phone number across all pages',
        impact: 'Improves local search rankings and user trust'
      });
    }

    if (!hasSchema) {
      recommendations.push({
        priority: 'HIGH',
        title: 'Add LocalBusiness Schema',
        description: 'Implement structured data markup on your homepage',
        impact: 'Enables rich snippets in Google search results'
      });
    }

    recommendations.push({
      priority: 'MEDIUM',
      title: `Submit to ${tier1Count} Priority Directories`,
      description: 'Complete directory submissions to build local citations',
      impact: 'Increases online visibility and local authority'
    });

    recommendations.push({
      priority: 'MEDIUM',
      title: 'Start Requesting Customer Reviews',
      description: 'Use generated email templates to request Google reviews',
      impact: 'Improves local rankings and conversion rates'
    });

    return `
        <div class="card">
            <h2>🎯 Recommended Actions</h2>
            <p style="margin-bottom: 20px;">Prioritized recommendations to improve your local SEO:</p>

            <ul class="recommendations">
                ${recommendations.map(rec => `
                    <li class="${rec.priority.toLowerCase()}">
                        <span class="priority-badge priority-${rec.priority.toLowerCase()}">${rec.priority}</span>
                        <strong>${rec.title}</strong>
                        <div style="margin-top: 8px; color: #666;">${rec.description}</div>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #667eea;">
                            💡 Impact: ${rec.impact}
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

export default LocalSEOReportGenerator;
