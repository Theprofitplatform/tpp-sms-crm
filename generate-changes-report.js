#!/usr/bin/env node

/**
 * Generate HTML Report of Auto-Fix Changes
 * 
 * Creates a beautiful HTML report showing all changes with:
 * - Visual before/after comparisons
 * - Summary statistics
 * - Filtering and search
 * - Export options
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class HTMLReportGenerator {
  constructor() {
    this.logsDir = path.join(__dirname, 'logs');
    this.outputFile = path.join(__dirname, 'logs', 'autofix-changes-report.html');
  }

  async generate() {
    console.log('\n📊 Generating HTML Changes Report...\n');

    // Load latest consolidated report
    const consolidatedFiles = fs.readdirSync(this.logsDir)
      .filter(f => f.startsWith('consolidated-report-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (consolidatedFiles.length === 0) {
      console.log('⚠️  No reports found. Run auto-fix first:\n');
      console.log('   npm run autofix:parallel\n');
      return;
    }

    const latestFile = consolidatedFiles[0];
    const consolidated = JSON.parse(
      fs.readFileSync(path.join(this.logsDir, latestFile), 'utf8')
    );

    // Load all engine-specific reports from same date
    const dateStr = latestFile.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const engineReports = {};

    if (dateStr) {
      const engineFiles = fs.readdirSync(this.logsDir)
        .filter(f => f.includes(dateStr) && f !== latestFile && f.endsWith('.json'));

      engineFiles.forEach(file => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.logsDir, file), 'utf8'));
          const type = this.detectEngineType(file);
          engineReports[type] = data;
        } catch (error) {
          // Skip invalid files
        }
      });
    }

    // Generate HTML
    const html = this.generateHTML(consolidated, engineReports);

    fs.writeFileSync(this.outputFile, html);

    console.log(`✅ Report generated: ${this.outputFile}\n`);
    console.log(`📊 Summary:`);
    console.log(`   Date: ${new Date(consolidated.timestamp).toLocaleString()}`);
    console.log(`   Client: ${consolidated.client?.name || 'Unknown'}`);
    console.log(`   Engines: ${consolidated.results?.completed?.length || 0} completed`);
    console.log(`   Time: ${consolidated.results?.totalTime || 0}s\n`);
    console.log(`🌐 Open in browser:`);
    console.log(`   file://${this.outputFile}\n`);
  }

  detectEngineType(filename) {
    if (filename.includes('meta-description')) return 'meta-description';
    if (filename.includes('broken-links')) return 'broken-links';
    if (filename.includes('duplicate-content')) return 'duplicate-content';
    if (filename.includes('core-web-vitals')) return 'core-web-vitals';
    if (filename.includes('accessibility')) return 'accessibility';
    if (filename.includes('title-optimization')) return 'title';
    if (filename.includes('h1-fix')) return 'h1';
    if (filename.includes('image-alt')) return 'image-alt';
    return 'unknown';
  }

  generateHTML(consolidated, engineReports) {
    const timestamp = new Date(consolidated.timestamp).toLocaleString();
    const client = consolidated.client?.name || 'Unknown';
    const totalTime = consolidated.results?.totalTime || 0;
    const completed = consolidated.results?.completed || [];
    const failed = consolidated.results?.failed || [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auto-Fix Changes Report - ${timestamp}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .card h3 { color: #333; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .card .value { font-size: 36px; font-weight: bold; color: #667eea; }
        .card .label { color: #666; font-size: 14px; margin-top: 5px; }
        .engines { margin-bottom: 30px; }
        .engine {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .engine-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        .engine-title { font-size: 20px; font-weight: 600; color: #333; }
        .engine-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-error { background: #f8d7da; color: #721c24; }
        .changes { margin-top: 20px; }
        .change-item {
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .change-title { font-weight: 600; color: #333; margin-bottom: 10px; }
        .before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 10px;
        }
        .before, .after {
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
        }
        .before {
            background: #fff3cd;
            border-left: 3px solid #ffc107;
        }
        .after {
            background: #d4edda;
            border-left: 3px solid #28a745;
        }
        .before-label, .after-label {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .before-label { color: #856404; }
        .after-label { color: #155724; }
        .stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        .stat {
            padding: 8px 15px;
            background: #e7f3ff;
            border-radius: 5px;
            font-size: 14px;
            color: #0066cc;
        }
        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 14px;
        }
        .search-box {
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .search-box input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            font-size: 16px;
        }
        .search-box input:focus {
            outline: none;
            border-color: #667eea;
        }
        @media print {
            body { background: white; }
            .search-box { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Auto-Fix Changes Report</h1>
            <p>Generated on ${timestamp}</p>
            <p>Client: ${client} | Total Time: ${totalTime}s</p>
        </div>

        <div class="search-box">
            <input type="text" id="searchInput" placeholder="🔍 Search changes..." onkeyup="filterChanges()">
        </div>

        <div class="summary">
            <div class="card">
                <h3>Total Engines</h3>
                <div class="value">${completed.length + failed.length}</div>
                <div class="label">Engines executed</div>
            </div>
            <div class="card">
                <h3>Completed</h3>
                <div class="value">${completed.length}</div>
                <div class="label">Successfully completed</div>
            </div>
            <div class="card">
                <h3>Failed</h3>
                <div class="value">${failed.length}</div>
                <div class="label">Encountered errors</div>
            </div>
            <div class="card">
                <h3>Execution Time</h3>
                <div class="value">${totalTime}s</div>
                <div class="label">${Math.round(totalTime / 60)} minutes</div>
            </div>
        </div>

        <div class="engines" id="enginesContainer">
            ${this.generateEnginesHTML(completed, failed, engineReports)}
        </div>

        <div class="footer">
            <p>Generated by Auto-Fix Engine v3.0</p>
            <p>For more information, see the documentation in your project directory</p>
        </div>
    </div>

    <script>
        function filterChanges() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const engines = document.getElementById('enginesContainer').getElementsByClassName('engine');

            for (let i = 0; i < engines.length; i++) {
                const text = engines[i].textContent || engines[i].innerText;
                if (text.toLowerCase().indexOf(filter) > -1) {
                    engines[i].style.display = "";
                } else {
                    engines[i].style.display = "none";
                }
            }
        }
    </script>
</body>
</html>`;
  }

  generateEnginesHTML(completed, failed, engineReports) {
    let html = '';

    completed.forEach(engine => {
      const engineType = this.detectEngineType(engine.name.toLowerCase().replace(/\s+/g, '-'));
      const report = engineReports[engineType];

      html += `
        <div class="engine">
            <div class="engine-header">
                <div class="engine-title">${engine.name}</div>
                <span class="engine-badge badge-success">✅ Completed in ${engine.duration}s</span>
            </div>
            
            ${this.generateEngineStatsHTML(engine, report)}
            ${this.generateChangesHTML(report)}
        </div>
      `;
    });

    failed.forEach(engine => {
      html += `
        <div class="engine">
            <div class="engine-header">
                <div class="engine-title">${engine.name}</div>
                <span class="engine-badge badge-error">❌ Failed</span>
            </div>
            <div class="stat">Error: ${engine.error}</div>
        </div>
      `;
    });

    return html;
  }

  generateEngineStatsHTML(engine, report) {
    if (!report || !report.results) return '';

    const stats = [];

    if (report.results.analyzed) stats.push(`Analyzed: ${report.results.analyzed}`);
    if (report.results.optimized) stats.push(`Optimized: ${report.results.optimized}`);
    if (report.results.fixed) stats.push(`Fixed: ${report.results.fixed}`);
    if (report.results.skipped) stats.push(`Skipped: ${report.results.skipped}`);
    if (report.results.errors) stats.push(`Errors: ${report.results.errors}`);

    if (stats.length === 0) return '';

    return `
      <div class="stats">
        ${stats.map(s => `<div class="stat">${s}</div>`).join('')}
      </div>
    `;
  }

  generateChangesHTML(report) {
    if (!report || !report.changes || report.changes.length === 0) {
      return '<div class="stat">No changes recorded</div>';
    }

    let html = '<div class="changes">';
    
    report.changes.slice(0, 10).forEach(change => {
      html += `
        <div class="change-item">
          <div class="change-title">${change.title || change.pageTitle || 'Page ' + (change.postId || change.pageId || '')}</div>
          ${this.generateChangeDetailsHTML(change)}
        </div>
      `;
    });

    if (report.changes.length > 10) {
      html += `<div class="stat">... and ${report.changes.length - 10} more changes</div>`;
    }

    html += '</div>';
    return html;
  }

  generateChangeDetailsHTML(change) {
    let html = '';

    // Title changes
    if (change.oldTitle && change.newTitle) {
      html += `
        <div class="before-after">
          <div class="before">
            <div class="before-label">Before (${change.oldLength} chars)</div>
            ${change.oldTitle}
          </div>
          <div class="after">
            <div class="after-label">After (${change.newLength} chars)</div>
            ${change.newTitle}
          </div>
        </div>
      `;
    }

    // Meta description changes
    if (change.oldDescription !== undefined && change.newDescription) {
      html += `
        <div class="before-after">
          <div class="before">
            <div class="before-label">Before (${change.oldLength || 0} chars)</div>
            ${change.oldDescription || '(none)'}
          </div>
          <div class="after">
            <div class="after-label">After (${change.newLength} chars)</div>
            ${change.newDescription}
          </div>
        </div>
      `;
    }

    // Link fixes
    if (change.linkUrl) {
      html += `
        <div class="stat">Link: ${change.linkUrl}</div>
        <div class="stat">Status: ${change.status}</div>
        ${change.newUrl ? `<div class="stat">Fixed: ${change.newUrl} (${change.fixType})</div>` : ''}
      `;
    }

    // Issues
    if (change.issues && change.issues.length > 0) {
      html += `<div class="stat">Issues: ${change.issues.join(', ')}</div>`;
    }

    // H1 changes
    if (change.h1Count) {
      html += `<div class="stat">H1 tags: ${change.h1Count} → 1 (converted to H2)</div>`;
    }

    return html;
  }
}

// Generate report
const generator = new HTMLReportGenerator();
generator.generate().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
