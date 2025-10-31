#!/usr/bin/env node

/**
 * Auto-Fix Changes Viewer
 * 
 * Interactive tool to view all auto-fix changes in detail:
 * - Before/After comparisons
 * - Visual diffs
 * - Summary reports
 * - Export options
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ChangesViewer {
  constructor() {
    this.logsDir = path.join(__dirname, 'logs');
    this.reports = [];
  }

  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║           📊 AUTO-FIX CHANGES VIEWER 📊                      ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Load all reports
    await this.loadReports();

    if (this.reports.length === 0) {
      console.log('⚠️  No reports found. Run auto-fix first:\n');
      console.log('   npm run autofix:parallel\n');
      return;
    }

    // Show menu
    await this.showMenu();
  }

  async loadReports() {
    console.log('📂 Loading reports from logs/...\n');

    if (!fs.existsSync(this.logsDir)) {
      return;
    }

    const files = fs.readdirSync(this.logsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.logsDir, file), 'utf8');
        const report = JSON.parse(content);
        
        this.reports.push({
          filename: file,
          type: this.detectReportType(file),
          timestamp: report.timestamp || new Date(fs.statSync(path.join(this.logsDir, file)).mtime).toISOString(),
          data: report
        });
      } catch (error) {
        // Skip invalid files
      }
    }

    console.log(`   ✅ Loaded ${this.reports.length} reports\n`);
  }

  detectReportType(filename) {
    if (filename.includes('consolidated')) return 'consolidated';
    if (filename.includes('meta-description')) return 'meta-description';
    if (filename.includes('broken-links')) return 'broken-links';
    if (filename.includes('duplicate-content')) return 'duplicate-content';
    if (filename.includes('core-web-vitals')) return 'core-web-vitals';
    if (filename.includes('accessibility')) return 'accessibility';
    if (filename.includes('title-optimization')) return 'title-optimization';
    if (filename.includes('h1-fix')) return 'h1-fix';
    if (filename.includes('image-alt')) return 'image-alt';
    return 'other';
  }

  async showMenu() {
    console.log('═'.repeat(70));
    console.log('MAIN MENU');
    console.log('═'.repeat(70) + '\n');

    console.log('1. 📋 View Latest Changes Summary');
    console.log('2. 🔍 View Detailed Changes by Engine');
    console.log('3. 📊 View Before/After Comparisons');
    console.log('4. 📈 View All Reports');
    console.log('5. 💾 Export Changes Report');
    console.log('6. 🔎 Search Changes');
    console.log('7. ❌ Exit\n');

    const choice = process.argv[2] || '1';

    switch(choice) {
      case '1':
        await this.viewLatestSummary();
        break;
      case '2':
        await this.viewByEngine();
        break;
      case '3':
        await this.viewBeforeAfter();
        break;
      case '4':
        await this.viewAllReports();
        break;
      case '5':
        await this.exportReport();
        break;
      case '6':
        await this.searchChanges();
        break;
      default:
        await this.viewLatestSummary();
    }
  }

  async viewLatestSummary() {
    console.log('\n📋 LATEST CHANGES SUMMARY\n');
    console.log('═'.repeat(70) + '\n');

    const latest = this.reports.find(r => r.type === 'consolidated');

    if (!latest) {
      console.log('⚠️  No consolidated report found.\n');
      return;
    }

    const data = latest.data;
    
    console.log(`📅 Run Date: ${new Date(data.timestamp).toLocaleString()}`);
    console.log(`👤 Client: ${data.client?.name || 'Unknown'}`);
    console.log(`⚙️  Mode: ${data.configuration?.parallel ? 'Parallel' : 'Sequential'}`);
    console.log(`🤖 AI: ${data.configuration?.useAI ? 'Enabled' : 'Disabled'}\n`);

    console.log('─'.repeat(70));
    console.log('EXECUTION SUMMARY');
    console.log('─'.repeat(70) + '\n');

    console.log(`⏱️  Total Time: ${data.results?.totalTime || 0}s`);
    console.log(`✅ Completed Engines: ${data.results?.completed?.length || 0}`);
    console.log(`❌ Failed Engines: ${data.results?.failed?.length || 0}\n`);

    if (data.results?.completed?.length > 0) {
      console.log('✅ COMPLETED ENGINES:\n');
      data.results.completed.forEach((engine, i) => {
        console.log(`   ${i + 1}. ${engine.name}`);
        console.log(`      Duration: ${engine.duration}s`);
        
        if (engine.result) {
          if (engine.result.optimized) {
            console.log(`      ✨ Optimized: ${engine.result.optimized} items`);
          }
          if (engine.result.fixed) {
            console.log(`      🔧 Fixed: ${engine.result.fixed} items`);
          }
          if (engine.result.changes?.length) {
            console.log(`      📝 Changes: ${engine.result.changes.length}`);
          }
        }
        console.log('');
      });
    }

    if (data.results?.failed?.length > 0) {
      console.log('❌ FAILED ENGINES:\n');
      data.results.failed.forEach((engine, i) => {
        console.log(`   ${i + 1}. ${engine.name}`);
        console.log(`      Error: ${engine.error}`);
        console.log('');
      });
    }

    console.log('═'.repeat(70) + '\n');
    
    console.log('💡 TIP: View detailed changes by running:\n');
    console.log('   node view-autofix-changes.js 2  (View by engine)');
    console.log('   node view-autofix-changes.js 3  (View before/after)\n');
  }

  async viewByEngine() {
    console.log('\n🔍 DETAILED CHANGES BY ENGINE\n');
    console.log('═'.repeat(70) + '\n');

    // Group reports by type
    const engines = {};
    
    this.reports.forEach(report => {
      if (report.type !== 'consolidated' && report.type !== 'other') {
        if (!engines[report.type]) {
          engines[report.type] = [];
        }
        engines[report.type].push(report);
      }
    });

    const engineTypes = Object.keys(engines);

    if (engineTypes.length === 0) {
      console.log('⚠️  No engine-specific reports found.\n');
      return;
    }

    engineTypes.forEach((type, idx) => {
      console.log(`${idx + 1}. ${this.formatEngineName(type)}`);
      console.log(`   Reports: ${engines[type].length}`);
      console.log(`   Latest: ${new Date(engines[type][0].timestamp).toLocaleString()}\n`);
    });

    console.log('─'.repeat(70) + '\n');

    // Show details for each engine
    engineTypes.forEach(type => {
      const latest = engines[type][0];
      const data = latest.data;

      console.log(`\n📊 ${this.formatEngineName(type).toUpperCase()}\n`);
      console.log(`   Date: ${new Date(latest.timestamp).toLocaleString()}`);
      
      if (data.results) {
        console.log(`   Analyzed: ${data.results.analyzed || 0}`);
        console.log(`   Fixed: ${data.results.fixed || data.results.optimized || 0}`);
        console.log(`   Skipped: ${data.results.skipped || 0}`);
        console.log(`   Errors: ${data.results.errors || 0}`);
      }

      if (data.changes && data.changes.length > 0) {
        console.log(`\n   📝 Recent Changes (showing first 5):\n`);
        data.changes.slice(0, 5).forEach((change, i) => {
          console.log(`   ${i + 1}. ${change.title || change.pageTitle || 'Page ' + (change.postId || change.pageId)}`);
          
          if (change.oldTitle && change.newTitle) {
            console.log(`      OLD: ${change.oldTitle}`);
            console.log(`      NEW: ${change.newTitle}`);
          }
          
          if (change.oldDescription && change.newDescription) {
            console.log(`      OLD: ${change.oldDescription.substring(0, 60)}...`);
            console.log(`      NEW: ${change.newDescription.substring(0, 60)}...`);
          }

          if (change.linkUrl) {
            console.log(`      Link: ${change.linkUrl}`);
            console.log(`      Status: ${change.status}`);
          }

          if (change.issues) {
            console.log(`      Issues: ${change.issues.join(', ')}`);
          }

          console.log('');
        });

        if (data.changes.length > 5) {
          console.log(`   ... and ${data.changes.length - 5} more changes\n`);
        }
      }

      console.log('─'.repeat(70));
    });

    console.log('\n');
  }

  async viewBeforeAfter() {
    console.log('\n📊 BEFORE/AFTER COMPARISONS\n');
    console.log('═'.repeat(70) + '\n');

    // Find reports with before/after data
    const reportsWithChanges = this.reports.filter(r => 
      r.data.changes && r.data.changes.length > 0
    );

    if (reportsWithChanges.length === 0) {
      console.log('⚠️  No before/after data found.\n');
      return;
    }

    reportsWithChanges.forEach(report => {
      console.log(`\n🔧 ${this.formatEngineName(report.type).toUpperCase()}\n`);
      
      const changes = report.data.changes.slice(0, 10); // Show first 10

      changes.forEach((change, i) => {
        console.log(`${i + 1}. ${change.title || change.pageTitle || 'Page'}\n`);

        // Title changes
        if (change.oldTitle && change.newTitle) {
          console.log('   TITLE:');
          console.log(`   ❌ Before: ${change.oldTitle}`);
          console.log(`   ✅ After:  ${change.newTitle}`);
          console.log(`   📏 Length: ${change.oldLength} → ${change.newLength} chars\n`);
        }

        // Meta description changes
        if (change.oldDescription !== undefined && change.newDescription) {
          console.log('   META DESCRIPTION:');
          console.log(`   ❌ Before: ${change.oldDescription || '(none)'}`);
          console.log(`   ✅ After:  ${change.newDescription}`);
          console.log(`   📏 Length: ${change.oldLength || 0} → ${change.newLength} chars\n`);
        }

        // H1 changes
        if (change.h1Count) {
          console.log('   H1 TAGS:');
          console.log(`   ❌ Before: ${change.h1Count} H1 tags`);
          console.log(`   ✅ After:  1 H1 tag (others converted to H2)`);
          if (change.h1Tags) {
            console.log(`   Tags: ${change.h1Tags.slice(0, 3).join(', ')}\n`);
          }
        }

        // Link fixes
        if (change.linkUrl) {
          console.log('   LINK FIX:');
          console.log(`   URL: ${change.linkUrl}`);
          console.log(`   ❌ Status: ${change.status}`);
          if (change.newUrl) {
            console.log(`   ✅ Fixed: ${change.newUrl}`);
            console.log(`   Type: ${change.fixType}\n`);
          }
        }

        // Duplicate content
        if (change.similarity) {
          console.log('   DUPLICATE CONTENT:');
          console.log(`   Similarity: ${change.similarity}%`);
          console.log(`   Action: ${change.action || 'Set canonical'}\n`);
        }

        // Issues fixed
        if (change.issues && change.issues.length > 0) {
          console.log(`   Issues Fixed: ${change.issues.join(', ')}\n`);
        }

        console.log('   ' + '─'.repeat(66) + '\n');
      });

      if (report.data.changes.length > 10) {
        console.log(`   ... and ${report.data.changes.length - 10} more changes\n`);
      }
    });

    console.log('═'.repeat(70) + '\n');
  }

  async viewAllReports() {
    console.log('\n📈 ALL REPORTS\n');
    console.log('═'.repeat(70) + '\n');

    const grouped = {};

    this.reports.forEach(report => {
      const type = report.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(report);
    });

    Object.keys(grouped).forEach(type => {
      console.log(`\n${this.formatEngineName(type).toUpperCase()}`);
      console.log('─'.repeat(70));
      
      grouped[type].slice(0, 10).forEach((report, i) => {
        const date = new Date(report.timestamp).toLocaleString();
        const changes = report.data.changes?.length || 0;
        const fixed = report.data.results?.fixed || report.data.results?.optimized || 0;
        
        console.log(`${i + 1}. ${date}`);
        console.log(`   File: ${report.filename}`);
        if (changes > 0) console.log(`   Changes: ${changes}`);
        if (fixed > 0) console.log(`   Fixed: ${fixed}`);
        console.log('');
      });

      if (grouped[type].length > 10) {
        console.log(`   ... and ${grouped[type].length - 10} more reports\n`);
      }
    });

    console.log('═'.repeat(70) + '\n');
  }

  async exportReport() {
    console.log('\n💾 EXPORT CHANGES REPORT\n');
    console.log('═'.repeat(70) + '\n');

    const exportData = {
      generatedAt: new Date().toISOString(),
      totalReports: this.reports.length,
      reports: this.reports.map(r => ({
        type: r.type,
        timestamp: r.timestamp,
        filename: r.filename,
        summary: {
          analyzed: r.data.results?.analyzed,
          fixed: r.data.results?.fixed || r.data.results?.optimized,
          changes: r.data.changes?.length || 0
        }
      })),
      detailedChanges: this.reports
        .filter(r => r.data.changes && r.data.changes.length > 0)
        .map(r => ({
          engine: r.type,
          timestamp: r.timestamp,
          changes: r.data.changes
        }))
    };

    const filename = `autofix-changes-export-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.logsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Exported to: ${filepath}\n`);
    console.log(`📊 Summary:`);
    console.log(`   Total Reports: ${exportData.totalReports}`);
    console.log(`   Total Changes: ${exportData.detailedChanges.reduce((sum, r) => sum + r.changes.length, 0)}\n`);
    
    console.log('💡 You can also export as CSV or HTML. See documentation.\n');
  }

  async searchChanges() {
    const query = process.argv[3] || '';
    
    console.log(`\n🔎 SEARCH CHANGES: "${query}"\n`);
    console.log('═'.repeat(70) + '\n');

    if (!query) {
      console.log('Usage: node view-autofix-changes.js 6 "search term"\n');
      console.log('Example: node view-autofix-changes.js 6 "meta description"\n');
      return;
    }

    const results = [];

    this.reports.forEach(report => {
      if (report.data.changes) {
        report.data.changes.forEach(change => {
          const searchText = JSON.stringify(change).toLowerCase();
          if (searchText.includes(query.toLowerCase())) {
            results.push({
              engine: report.type,
              timestamp: report.timestamp,
              change
            });
          }
        });
      }
    });

    if (results.length === 0) {
      console.log(`No results found for "${query}"\n`);
      return;
    }

    console.log(`Found ${results.length} results:\n`);

    results.slice(0, 20).forEach((result, i) => {
      console.log(`${i + 1}. ${this.formatEngineName(result.engine)}`);
      console.log(`   Date: ${new Date(result.timestamp).toLocaleString()}`);
      console.log(`   Page: ${result.change.title || result.change.pageTitle || 'Unknown'}`);
      
      if (result.change.oldTitle && result.change.newTitle) {
        console.log(`   Changed: ${result.change.oldTitle} → ${result.change.newTitle}`);
      }
      
      console.log('');
    });

    if (results.length > 20) {
      console.log(`... and ${results.length - 20} more results\n`);
    }
  }

  formatEngineName(type) {
    const names = {
      'meta-description': 'Meta Description Optimizer',
      'broken-links': 'Broken Link Detector',
      'duplicate-content': 'Duplicate Content Detector',
      'core-web-vitals': 'Core Web Vitals Optimizer',
      'accessibility': 'Accessibility Fixer',
      'title-optimization': 'Title Optimizer',
      'h1-fix': 'H1 Tag Fixer',
      'image-alt': 'Image Alt Text Fixer',
      'consolidated': 'All Engines (Consolidated)',
      'other': 'Other'
    };

    return names[type] || type;
  }
}

// Run viewer
const viewer = new ChangesViewer();
viewer.run().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
