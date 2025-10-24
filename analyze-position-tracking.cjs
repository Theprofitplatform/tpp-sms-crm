#!/usr/bin/env node

/**
 * SEMrush Position Tracking Analyzer
 * Analyzes position tracking reports and generates actionable SEO recommendations
 */

const fs = require('fs');
const path = require('path');

class PositionTrackingAnalyzer {
  constructor(csvPath) {
    this.csvPath = csvPath;
    this.data = [];
    this.insights = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      opportunities: []
    };
  }

  async analyze() {
    console.log('🔍 Analyzing Position Tracking Report...\n');
    
    // Parse CSV
    this.parseCSV();
    
    // Run analyses
    this.analyzeTopPerformers();
    this.analyzeDeclines();
    this.analyzeOpportunities();
    this.analyzeKeywordCannibalization();
    this.analyzeAIOverviewImpact();
    this.analyzeSearchVolume();
    this.analyzeLandingPageDistribution();
    
    // Generate report
    this.generateReport();
  }

  parseCSV() {
    const content = fs.readFileSync(this.csvPath, 'utf-8');
    const lines = content.split('\n');
    
    // Find header line
    const headerIndex = lines.findIndex(line => line.startsWith('Keyword,Tags,Intents'));
    if (headerIndex === -1) {
      throw new Error('Could not find CSV header');
    }
    
    const headers = this.parseCSVLine(lines[headerIndex]);
    const dataLines = lines.slice(headerIndex + 1);
    
    this.data = dataLines
      .filter(line => line.trim() && !line.startsWith('ID:') && !line.startsWith('Report type'))
      .map(line => {
        const values = this.parseCSVLine(line);
        const row = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      })
      .filter(row => row.Keyword && row.Keyword.trim());

    console.log(`✅ Parsed ${this.data.length} keywords\n`);
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  analyzeTopPerformers() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TOP PERFORMERS (Position 1-10)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const topPerformers = this.data.filter(row => {
      const latestPosition = this.getLatestPosition(row);
      return latestPosition && latestPosition <= 10;
    });

    if (topPerformers.length === 0) {
      console.log('❌ NO KEYWORDS IN TOP 10 POSITIONS');
      console.log('⚠️  This is a CRITICAL issue - immediate action required!\n');
      
      this.insights.critical.push({
        issue: 'Zero keywords in top 10 positions',
        impact: 'Missing valuable traffic and conversions',
        action: 'Emergency SEO audit and optimization required',
        priority: 'CRITICAL'
      });
    } else {
      topPerformers.forEach(row => {
        const position = this.getLatestPosition(row);
        const volume = parseInt(row['Search Volume']) || 0;
        const url = this.getLatestURL(row);
        
        console.log(`✅ "${row.Keyword}"`);
        console.log(`   Position: ${position} | Volume: ${volume}/mo | Intent: ${row.Intents}`);
        console.log(`   Landing: ${url}\n`);
      });
    }
  }

  analyzeDeclines() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📉 CRITICAL DECLINES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.data.forEach(row => {
      const difference = parseInt(row['*.instantautotraders.com.au/*_difference']) || 0;
      
      if (difference < -5) {
        const keyword = row.Keyword;
        const currentPos = this.getLatestPosition(row);
        const volume = parseInt(row['Search Volume']) || 0;
        
        console.log(`🚨 "${keyword}"`);
        console.log(`   Dropped: ${Math.abs(difference)} positions (now at position ${currentPos})`);
        console.log(`   Search Volume: ${volume}/mo`);
        console.log(`   Impact: ${this.calculateImpact(difference, volume)}\n`);

        this.insights.critical.push({
          keyword,
          issue: `Lost ${Math.abs(difference)} positions`,
          currentPosition: currentPos,
          volume,
          action: 'Immediate investigation and recovery plan needed'
        });
      }
    });

    if (this.insights.critical.length === 0) {
      console.log('✅ No critical position declines detected\n');
    }
  }

  analyzeOpportunities() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 HIGH-VALUE OPPORTUNITIES (Positions 11-20)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const opportunities = this.data.filter(row => {
      const position = this.getLatestPosition(row);
      const volume = parseInt(row['Search Volume']) || 0;
      return position >= 11 && position <= 20 && volume >= 50;
    });

    opportunities
      .sort((a, b) => (parseInt(b['Search Volume']) || 0) - (parseInt(a['Search Volume']) || 0))
      .slice(0, 10)
      .forEach(row => {
        const position = this.getLatestPosition(row);
        const volume = parseInt(row['Search Volume']) || 0;
        const cpc = row.CPC;
        const potentialTraffic = this.estimateTrafficIncrease(position, volume);

        console.log(`💎 "${row.Keyword}"`);
        console.log(`   Current: Position ${position} | Volume: ${volume}/mo | CPC: $${cpc}`);
        console.log(`   Potential gain: +${potentialTraffic} clicks/month if moved to position 3`);
        console.log(`   Landing: ${this.getLatestURL(row)}\n`);

        this.insights.opportunities.push({
          keyword: row.Keyword,
          position,
          volume,
          potentialTraffic,
          action: 'Optimize content, build backlinks, improve on-page SEO'
        });
      });
  }

  analyzeKeywordCannibalization() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  KEYWORD CANNIBALIZATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const urlMap = {};
    
    this.data.forEach(row => {
      const url = this.getLatestURL(row);
      if (!urlMap[url]) urlMap[url] = [];
      urlMap[url].push(row.Keyword);
    });

    Object.entries(urlMap).forEach(([url, keywords]) => {
      if (keywords.length > 3) {
        console.log(`🔴 ${url}`);
        console.log(`   Competing for ${keywords.length} keywords:`);
        keywords.slice(0, 5).forEach(kw => console.log(`   • ${kw}`));
        if (keywords.length > 5) console.log(`   ... and ${keywords.length - 5} more\n`);

        this.insights.high.push({
          issue: 'Multiple keywords targeting same URL',
          url,
          keywordCount: keywords.length,
          action: 'Create dedicated landing pages for keyword groups'
        });
      }
    });
  }

  analyzeAIOverviewImpact() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 AI OVERVIEW IMPACT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const aiOverviewKeywords = [];
    
    this.data.forEach(row => {
      let hasAIOverview = false;
      Object.entries(row).forEach(([key, value]) => {
        if (key.includes('_type') && value === 'ai overview') {
          hasAIOverview = true;
        }
      });
      
      if (hasAIOverview) {
        aiOverviewKeywords.push({
          keyword: row.Keyword,
          volume: parseInt(row['Search Volume']) || 0,
          position: this.getLatestPosition(row)
        });
      }
    });

    if (aiOverviewKeywords.length > 0) {
      console.log(`✅ ${aiOverviewKeywords.length} keywords appearing in AI Overviews:\n`);
      
      aiOverviewKeywords.forEach(item => {
        console.log(`   🤖 "${item.keyword}"`);
        console.log(`      Volume: ${item.volume}/mo | Position: ${item.position}\n`);
      });

      this.insights.opportunities.push({
        achievement: 'AI Overview placements secured',
        count: aiOverviewKeywords.length,
        action: 'Monitor CTR impact and optimize for featured snippets'
      });
    } else {
      console.log('❌ No AI Overview placements detected');
      console.log('💡 Opportunity: Optimize for AI Overview inclusion\n');
    }
  }

  analyzeSearchVolume() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SEARCH VOLUME ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalVolume = this.data.reduce((sum, row) => {
      return sum + (parseInt(row['Search Volume']) || 0);
    }, 0);

    const highVolume = this.data.filter(row => parseInt(row['Search Volume']) >= 100);
    const mediumVolume = this.data.filter(row => {
      const vol = parseInt(row['Search Volume']) || 0;
      return vol >= 50 && vol < 100;
    });
    const lowVolume = this.data.filter(row => parseInt(row['Search Volume']) < 50);

    console.log(`Total tracked volume: ${totalVolume.toLocaleString()} searches/month`);
    console.log(`High volume keywords (100+): ${highVolume.length}`);
    console.log(`Medium volume (50-99): ${mediumVolume.length}`);
    console.log(`Low volume (<50): ${lowVolume.length}\n`);

    const avgPosition = this.data.reduce((sum, row) => {
      return sum + this.getLatestPosition(row);
    }, 0) / this.data.length;

    console.log(`Average position: ${avgPosition.toFixed(1)}`);
    
    if (avgPosition > 20) {
      this.insights.high.push({
        issue: `Poor average position (${avgPosition.toFixed(1)})`,
        impact: 'Limited visibility for most tracked keywords',
        action: 'Comprehensive SEO overhaul needed'
      });
    }
  }

  analyzeLandingPageDistribution() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 LANDING PAGE DISTRIBUTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const pageTypes = {
      homepage: 0,
      blog: 0,
      service: 0,
      location: 0
    };

    this.data.forEach(row => {
      const url = this.getLatestURL(row);
      if (url.endsWith('.com.au/')) pageTypes.homepage++;
      else if (url.includes('/202')) pageTypes.blog++;
      else if (url.includes('sell-your')) pageTypes.service++;
      else pageTypes.location++;
    });

    console.log(`Homepage: ${pageTypes.homepage} keywords`);
    console.log(`Blog posts: ${pageTypes.blog} keywords`);
    console.log(`Service pages: ${pageTypes.service} keywords`);
    console.log(`Location pages: ${pageTypes.location} keywords\n`);

    if (pageTypes.homepage > this.data.length * 0.3) {
      this.insights.high.push({
        issue: 'Too many keywords targeting homepage',
        count: pageTypes.homepage,
        action: 'Create dedicated landing pages for keyword clusters'
      });
    }
  }

  generateReport() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 PRIORITIZED ACTION PLAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔴 CRITICAL (Do Immediately):\n');
    if (this.insights.critical.length === 0) {
      console.log('   ✅ No critical issues detected\n');
    } else {
      this.insights.critical.forEach((item, i) => {
        console.log(`${i + 1}. ${item.issue || item.keyword}`);
        if (item.keyword) console.log(`   Keyword: "${item.keyword}"`);
        console.log(`   Action: ${item.action}`);
        if (item.volume) console.log(`   Impact: ${item.volume} searches/month`);
        console.log();
      });
    }

    console.log('\n🟠 HIGH PRIORITY (This Week):\n');
    if (this.insights.high.length === 0) {
      console.log('   ✅ No high priority issues detected\n');
    } else {
      this.insights.high.forEach((item, i) => {
        console.log(`${i + 1}. ${item.issue}`);
        console.log(`   Action: ${item.action}`);
        if (item.keywordCount) console.log(`   Affected: ${item.keywordCount} keywords`);
        console.log();
      });
    }

    console.log('\n🟢 OPPORTUNITIES (Next 30 Days):\n');
    this.insights.opportunities.slice(0, 5).forEach((item, i) => {
      if (item.keyword) {
        console.log(`${i + 1}. Target: "${item.keyword}"`);
        console.log(`   Potential: +${item.potentialTraffic} clicks/month`);
        console.log(`   Action: ${item.action}\n`);
      }
    });

    // Save JSON report
    const reportPath = path.join(__dirname, 'position-tracking-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.insights, null, 2));
    console.log(`\n💾 Full analysis saved to: ${reportPath}\n`);
  }

  // Helper methods
  getLatestPosition(row) {
    const dateColumns = Object.keys(row).filter(k => 
      k.match(/\d{8}$/) && !k.includes('_type') && !k.includes('_landing')
    );
    const latestColumn = dateColumns[dateColumns.length - 1];
    const value = row[latestColumn];
    return value && !isNaN(value) ? parseInt(value) : 999;
  }

  getLatestURL(row) {
    const landingColumns = Object.keys(row).filter(k => k.includes('_landing'));
    const latestLanding = landingColumns[landingColumns.length - 1];
    return row[latestLanding] || '';
  }

  calculateImpact(positionChange, volume) {
    const impactValue = Math.abs(positionChange) * volume;
    if (impactValue > 1000) return 'HIGH';
    if (impactValue > 500) return 'MEDIUM';
    return 'LOW';
  }

  estimateTrafficIncrease(currentPosition, volume) {
    const currentCTR = this.getCTRByPosition(currentPosition);
    const targetCTR = this.getCTRByPosition(3);
    const increase = (targetCTR - currentCTR) * volume;
    return Math.round(increase);
  }

  getCTRByPosition(position) {
    const ctrMap = {
      1: 0.316, 2: 0.158, 3: 0.106, 4: 0.080, 5: 0.065,
      6: 0.053, 7: 0.044, 8: 0.038, 9: 0.033, 10: 0.029
    };
    if (position <= 10) return ctrMap[position];
    if (position <= 20) return 0.015;
    return 0.005;
  }
}

// Run analyzer
const csvPath = process.argv[2] || './23727767_3199217_position_tracking_rankings_overview_20251023.csv';

if (!fs.existsSync(csvPath)) {
  console.error(`❌ File not found: ${csvPath}`);
  console.log('Usage: node analyze-position-tracking.js <path-to-csv>');
  process.exit(1);
}

const analyzer = new PositionTrackingAnalyzer(csvPath);
analyzer.analyze().catch(console.error);
