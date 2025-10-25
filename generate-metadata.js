#!/usr/bin/env node

/**
 * Generate metadata.json from audit reports for dashboard
 */

import fs from 'fs';
import path from 'path';

const LOGS_DIR = './logs';
const OUTPUT_FILE = './web-dist/metadata.json';

// Client display names mapping
const CLIENT_NAMES = {
  'instantautotraders': 'Instant Auto Traders',
  'hottyres': 'Hot Tyres',
  'sadcdisabilityservices': 'SADC Disability Services',
  'theprofitplatform': 'The Profit Platform'
};

async function generateMetadata() {
  console.log('\n📊 Generating dashboard metadata...\n');

  const clients = [];

  try {
    // Check if multi-client logs exist
    const clientsDir = path.join(LOGS_DIR, 'clients');
    let hasMultiClient = false;

    if (fs.existsSync(clientsDir)) {
      // Multi-client setup
      const clientFolders = fs.readdirSync(clientsDir)
        .filter(f => fs.statSync(path.join(clientsDir, f)).isDirectory());

      if (clientFolders.length > 0) {
        hasMultiClient = true;
      }

      for (const clientId of clientFolders) {
        const clientDir = path.join(clientsDir, clientId);

        // Find latest JSON audit report
        const files = fs.readdirSync(clientDir)
          .filter(f => f.endsWith('.json') && f.includes('audit'))
          .map(f => ({
            name: f,
            path: path.join(clientDir, f),
            mtime: fs.statSync(path.join(clientDir, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          const latestReport = files[0];
          const reportData = JSON.parse(fs.readFileSync(latestReport.path, 'utf8'));

          if (reportData.summary) {
            clients.push({
              id: clientId,
              name: CLIENT_NAMES[clientId] || clientId,
              score: reportData.summary.avgScore || 0,
              issues: reportData.summary.totalIssues || 0,
              posts: reportData.summary.totalPosts || 0
            });

            console.log(`  ✅ ${CLIENT_NAMES[clientId]}: Score ${reportData.summary.avgScore}/100, ${reportData.summary.totalIssues} issues, ${reportData.summary.totalPosts} posts`);
          }
        }
      }
    }

    if (!hasMultiClient) {
      // Single-client setup - check for main audit report
      const mainReport = path.join(LOGS_DIR, 'seo-audit-report-' + new Date().toISOString().split('T')[0] + '.json');

      if (fs.existsSync(mainReport)) {
        const reportData = JSON.parse(fs.readFileSync(mainReport, 'utf8'));

        if (reportData.summary) {
          clients.push({
            id: 'instantautotraders',
            name: 'Instant Auto Traders',
            score: reportData.summary.avgScore || 0,
            issues: reportData.summary.totalIssues || 0,
            posts: reportData.summary.totalPosts || 0
          });

          console.log(`  ✅ Instant Auto Traders: Score ${reportData.summary.avgScore}/100, ${reportData.summary.totalIssues} issues, ${reportData.summary.totalPosts} posts`);
        }
      } else {
        console.log('  ⚠️  No audit reports found for today');

        // Try to find the latest report
        const auditFiles = fs.readdirSync(LOGS_DIR)
          .filter(f => f.startsWith('seo-audit-report-') && f.endsWith('.json'))
          .map(f => ({
            name: f,
            path: path.join(LOGS_DIR, f),
            mtime: fs.statSync(path.join(LOGS_DIR, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime);

        if (auditFiles.length > 0) {
          const latestReport = auditFiles[0];
          const reportData = JSON.parse(fs.readFileSync(latestReport.path, 'utf8'));

          if (reportData.summary) {
            clients.push({
              id: 'instantautotraders',
              name: 'Instant Auto Traders',
              score: reportData.summary.avgScore || 0,
              issues: reportData.summary.totalIssues || 0,
              posts: reportData.summary.totalPosts || 0
            });

            console.log(`  ✅ Using latest report: ${latestReport.name}`);
            console.log(`  ✅ Instant Auto Traders: Score ${reportData.summary.avgScore}/100, ${reportData.summary.totalIssues} issues, ${reportData.summary.totalPosts} posts`);
          }
        }
      }
    }

    // Generate metadata object
    const metadata = {
      generated: new Date().toISOString(),
      clients: clients
    };

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write metadata file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));

    console.log(`\n✅ Metadata generated: ${OUTPUT_FILE}`);
    console.log(`   Clients: ${clients.length}`);
    console.log(`   Generated at: ${metadata.generated}\n`);

    return metadata;

  } catch (error) {
    console.error('\n❌ Error generating metadata:', error.message);
    process.exit(1);
  }
}

// Run if called directly
generateMetadata();

export default generateMetadata;
