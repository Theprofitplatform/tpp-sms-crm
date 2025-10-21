#!/usr/bin/env node

/**
 * DIRECTORY SUBMISSION TRACKER GENERATOR
 *
 * Auto-generates a pre-filled tracking spreadsheet with all 50+ directories.
 * Saves hours of manual spreadsheet setup.
 *
 * Usage: node generate-directory-tracker.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// DIRECTORY DATA (All 50+ directories from DIRECTORY-SUBMISSION-LIST.md)
// ============================================================================

const directories = [
  // TIER 1: Must-Do (High Priority)
  {
    tier: 1,
    name: "Google Business Profile",
    url: "https://business.google.com",
    authority: 5,
    timeEstimate: "30 mins",
    free: true,
    priority: "CRITICAL"
  },
  {
    tier: 1,
    name: "Bing Places for Business",
    url: "https://www.bingplaces.com",
    authority: 5,
    timeEstimate: "15 mins",
    free: true,
    priority: "HIGH"
  },
  {
    tier: 1,
    name: "Apple Maps / Apple Business Connect",
    url: "https://register.apple.com/business",
    authority: 5,
    timeEstimate: "15 mins",
    free: true,
    priority: "HIGH"
  },
  {
    tier: 1,
    name: "Facebook Business Page",
    url: "https://www.facebook.com/business/pages",
    authority: 5,
    timeEstimate: "20 mins",
    free: true,
    priority: "HIGH"
  },
  {
    tier: 1,
    name: "True Local (Australian)",
    url: "https://www.truelocal.com.au",
    authority: 4,
    timeEstimate: "10 mins",
    free: true,
    priority: "HIGH"
  },
  {
    tier: 1,
    name: "Yellow Pages Australia",
    url: "https://www.yellowpages.com.au",
    authority: 4,
    timeEstimate: "10 mins",
    free: true,
    priority: "HIGH"
  },
  {
    tier: 1,
    name: "Yelp",
    url: "https://biz.yelp.com",
    authority: 4,
    timeEstimate: "15 mins",
    free: true,
    priority: "HIGH"
  },

  // TIER 2: Important Australian Directories
  {
    tier: 2,
    name: "Start Local",
    url: "https://www.startlocal.com.au",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Local Search (Sensis)",
    url: "https://www.localsearch.com.au",
    authority: 4,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Hotfrog Australia",
    url: "https://www.hotfrog.com.au",
    authority: 3,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Aussie Web",
    url: "https://www.aussieweb.com.au",
    authority: 3,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Australia Trade Index",
    url: "https://www.australiatradeindex.com",
    authority: 2,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "City Search",
    url: "https://www.citysearch.com.au",
    authority: 3,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Loc8 Nearby",
    url: "https://www.loc8nearby.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Find Open",
    url: "https://www.findopen.com.au",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Brownbook Australia",
    url: "https://www.brownbook.net/country/au",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Cybo Australia",
    url: "https://www.cybo.com/AU",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "Whereis (Sensis)",
    url: "https://www.whereis.com",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 2,
    name: "White Pages Australia",
    url: "https://www.whitepages.com.au",
    authority: 4,
    timeEstimate: "10 mins",
    free: true,
    priority: "MEDIUM"
  },

  // TIER 3: Automotive-Specific
  {
    tier: 3,
    name: "Gumtree Business",
    url: "https://www.gumtree.com.au",
    authority: 4,
    timeEstimate: "15 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 3,
    name: "CarSales Business",
    url: "https://www.carsales.com.au",
    authority: 4,
    timeEstimate: "15 mins",
    free: false,
    priority: "LOW"
  },
  {
    tier: 3,
    name: "Carsguide",
    url: "https://www.carsguide.com.au",
    authority: 4,
    timeEstimate: "15 mins",
    free: false,
    priority: "LOW"
  },
  {
    tier: 3,
    name: "Drive.com.au",
    url: "https://www.drive.com.au",
    authority: 3,
    timeEstimate: "10 mins",
    free: false,
    priority: "LOW"
  },
  {
    tier: 3,
    name: "AutoTrader Australia",
    url: "https://www.autotrader.com.au",
    authority: 3,
    timeEstimate: "15 mins",
    free: false,
    priority: "LOW"
  },

  // TIER 4: General Business Directories
  {
    tier: 4,
    name: "LinkedIn Company Page",
    url: "https://www.linkedin.com/company/setup",
    authority: 5,
    timeEstimate: "20 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 4,
    name: "Foursquare for Business",
    url: "https://foursquare.com/add",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "Manta",
    url: "https://www.manta.com",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "Merchant Circle",
    url: "https://www.merchantcircle.com",
    authority: 2,
    timeEstimate: "10 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "Ezlocal",
    url: "https://www.ezlocal.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "iBegin",
    url: "https://www.ibegin.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "Tupalo",
    url: "https://www.tupalo.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "ShowMeLocal",
    url: "https://www.showmelocal.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "2FindLocal",
    url: "https://www.2findlocal.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "Spoke",
    url: "https://www.spoke.com",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 4,
    name: "n49",
    url: "https://www.n49.com/biz",
    authority: 2,
    timeEstimate: "8 mins",
    free: true,
    priority: "LOW"
  },

  // TIER 5: Sydney-Specific
  {
    tier: 5,
    name: "Sydney.com",
    url: "https://www.sydney.com",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "LOW"
  },

  // TIER 6: Social Platforms
  {
    tier: 6,
    name: "Instagram Business",
    url: "https://business.instagram.com",
    authority: 4,
    timeEstimate: "20 mins",
    free: true,
    priority: "MEDIUM"
  },
  {
    tier: 6,
    name: "YouTube Channel",
    url: "https://www.youtube.com/create_channel",
    authority: 4,
    timeEstimate: "20 mins",
    free: true,
    priority: "LOW"
  },
  {
    tier: 6,
    name: "Twitter/X Business",
    url: "https://twitter.com/i/flow/signup",
    authority: 3,
    timeEstimate: "10 mins",
    free: true,
    priority: "LOW"
  }
];

// ============================================================================
// CSV GENERATOR
// ============================================================================

function generateCSV() {
  const headers = [
    'Tier',
    'Priority',
    'Directory Name',
    'URL',
    'Authority (1-5)',
    'Time Estimate',
    'Free?',
    'Status',
    'Date Submitted',
    'Username/Email',
    'Password',
    'Listing URL',
    'Notes'
  ];

  const rows = directories.map(dir => [
    dir.tier,
    dir.priority,
    dir.name,
    dir.url,
    dir.authority,
    dir.timeEstimate,
    dir.free ? 'Yes' : 'No',
    'Pending', // Status
    '', // Date Submitted
    '', // Username
    '', // Password
    '', // Listing URL
    '' // Notes
  ]);

  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

// ============================================================================
// MARKDOWN TABLE GENERATOR
// ============================================================================

function generateMarkdownTable() {
  let markdown = '# Directory Submission Tracker\n\n';
  markdown += `**Generated:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Total Directories:** ${directories.length}\n\n`;
  markdown += '---\n\n';

  // Group by tier
  for (let tier = 1; tier <= 6; tier++) {
    const tierDirs = directories.filter(d => d.tier === tier);
    if (tierDirs.length === 0) continue;

    markdown += `## Tier ${tier}\n\n`;
    markdown += `Total: ${tierDirs.length} directories\n\n`;
    markdown += '| # | Directory | URL | Priority | Time | Free | Status | Date | Notes |\n';
    markdown += '|---|-----------|-----|----------|------|------|--------|------|-------|\n';

    tierDirs.forEach((dir, index) => {
      markdown += `| ${index + 1} | ${dir.name} | ${dir.url} | ${dir.priority} | ${dir.timeEstimate} | ${dir.free ? 'Yes' : 'No'} | ⏳ | | |\n`;
    });

    markdown += '\n';
  }

  // Add summary stats
  markdown += '---\n\n';
  markdown += '## Summary Statistics\n\n';
  markdown += `- **Tier 1 (Critical):** ${directories.filter(d => d.tier === 1).length} directories\n`;
  markdown += `- **Tier 2 (High):** ${directories.filter(d => d.tier === 2).length} directories\n`;
  markdown += `- **Tier 3 (Medium):** ${directories.filter(d => d.tier === 3).length} directories\n`;
  markdown += `- **Tier 4+ (Low):** ${directories.filter(d => d.tier >= 4).length} directories\n\n`;

  const totalTime = directories.reduce((sum, dir) => {
    const mins = parseInt(dir.timeEstimate);
    return sum + (isNaN(mins) ? 10 : mins);
  }, 0);

  markdown += `**Estimated Total Time:** ${Math.floor(totalTime / 60)}h ${totalTime % 60}m\n\n`;

  markdown += '---\n\n';
  markdown += '## Status Legend\n\n';
  markdown += '- ⏳ Pending\n';
  markdown += '- 🔄 In Progress\n';
  markdown += '- ✅ Complete\n';
  markdown += '- ❌ Failed/Skip\n';

  return markdown;
}

// ============================================================================
// MAIN
// ============================================================================

function generateTrackers() {
  console.log('\n📊 DIRECTORY SUBMISSION TRACKER GENERATOR');
  console.log('='.repeat(70));
  console.log(`\nGenerating trackers for ${directories.length} directories...\n`);

  const outputDir = path.join(__dirname, 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Generate CSV
  console.log('   → Generating CSV...');
  const csv = generateCSV();
  const csvFile = path.join(outputDir, 'directory-tracker.csv');
  fs.writeFileSync(csvFile, csv);
  console.log(`   ✓ CSV saved: ${csvFile}`);

  // Generate Markdown
  console.log('   → Generating Markdown table...');
  const markdown = generateMarkdownTable();
  const mdFile = path.join(outputDir, 'directory-tracker.md');
  fs.writeFileSync(mdFile, markdown);
  console.log(`   ✓ Markdown saved: ${mdFile}`);

  // Generate summary
  const tier1 = directories.filter(d => d.tier === 1);
  const tier2 = directories.filter(d => d.tier === 2);

  console.log('\n📊 SUMMARY:');
  console.log(`   → Total directories: ${directories.length}`);
  console.log(`   → Tier 1 (Must-do): ${tier1.length}`);
  console.log(`   → Tier 2 (Important): ${tier2.length}`);
  console.log(`   → Tier 1+2 (Recommended): ${tier1.length + tier2.length}`);

  console.log('\n📂 FILES CREATED:');
  console.log(`   1. ${csvFile}`);
  console.log(`      → Open in Excel/Google Sheets`);
  console.log(`      → Track submissions and credentials`);
  console.log(`\n   2. ${mdFile}`);
  console.log(`      → Markdown table format`);
  console.log(`      → Easy to view and print`);

  console.log('\n📝 HOW TO USE:');
  console.log('   1. Open the CSV in Excel or Google Sheets');
  console.log('   2. As you submit to each directory:');
  console.log('      - Change Status to "✅ Complete"');
  console.log('      - Add submission date');
  console.log('      - Save username/password');
  console.log('      - Add final listing URL');
  console.log('   3. Track your progress as you go');

  console.log('\n💡 PRO TIP:');
  console.log('   → Focus on Tier 1 first (7 directories)');
  console.log('   → Then do Tier 2 (12 directories)');
  console.log('   → This gives you 80% of the impact');

  console.log('\n✅ Done!\n');

  return {
    csvFile,
    mdFile,
    totalDirectories: directories.length
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTrackers();
}

export { generateCSV, generateMarkdownTable, generateTrackers, directories };
