/**
 * Position Tracking Analysis Utilities
 * Advanced CSV analysis with traffic estimation and AI insights
 */

// CTR by Position (Industry averages from Advanced Web Ranking study)
export const CTR_BY_POSITION = {
  1: 0.316,   // 31.6%
  2: 0.158,   // 15.8%
  3: 0.106,   // 10.6%
  4: 0.080,   // 8.0%
  5: 0.065,   // 6.5%
  6: 0.053,   // 5.3%
  7: 0.044,   // 4.4%
  8: 0.038,   // 3.8%
  9: 0.033,   // 3.3%
  10: 0.029,  // 2.9%
  11: 0.025,  // 2.5%
  12: 0.022,  // 2.2%
  13: 0.020,  // 2.0%
  14: 0.018,  // 1.8%
  15: 0.016,  // 1.6%
  16: 0.014,  // 1.4%
  17: 0.013,  // 1.3%
  18: 0.012,  // 1.2%
  19: 0.011,  // 1.1%
  20: 0.010   // 1.0%
}

/**
 * Calculate traffic potential for a keyword
 */
export function calculateTrafficPotential(currentPosition, impressions, targetPosition = 5) {
  const currentCTR = CTR_BY_POSITION[Math.round(currentPosition)] || 0.005
  const targetCTR = CTR_BY_POSITION[targetPosition] || 0.065
  
  const currentClicks = Math.round(currentCTR * impressions)
  const potentialClicks = Math.round(targetCTR * impressions)
  const gain = potentialClicks - currentClicks
  const gainPercent = currentClicks > 0 ? Math.round((gain / currentClicks) * 100) : 0
  
  return {
    current: currentClicks,
    potential: potentialClicks,
    gain,
    gainPercent,
    targetPosition
  }
}

/**
 * Assess the impact level of a position change
 */
export function assessImpact(positionChange, volume, currentPosition) {
  const volumeScore = volume > 1000 ? 3 : volume > 500 ? 2 : 1
  const changeScore = Math.abs(positionChange) > 10 ? 3 : Math.abs(positionChange) > 5 ? 2 : 1
  const positionScore = currentPosition > 20 ? 3 : currentPosition > 10 ? 2 : 1
  
  const totalScore = volumeScore + changeScore + positionScore
  
  if (totalScore >= 7) return 'CRITICAL'
  if (totalScore >= 5) return 'HIGH'
  if (totalScore >= 3) return 'MEDIUM'
  return 'LOW'
}

/**
 * Get actionable recommendations for a keyword
 */
export function getActionRecommendation(keyword) {
  const { position, ctr, change, volume } = keyword
  
  // Quick wins (positions 11-20)
  if (position >= 11 && position <= 15) {
    return {
      priority: 'HIGH',
      action: 'Quick Win Opportunity',
      recommendations: [
        'Improve content depth and quality',
        'Add 2-3 internal links from high-authority pages',
        'Optimize title tag for better CTR',
        'Add FAQ schema markup',
        'Improve page speed (target < 2.5s LCP)'
      ],
      effort: 'MEDIUM',
      timeframe: '2-4 weeks'
    }
  }
  
  if (position >= 16 && position <= 20) {
    return {
      priority: 'MEDIUM',
      action: 'Build Authority',
      recommendations: [
        'Build 3-5 quality backlinks',
        'Update content with latest information',
        'Add comprehensive schema markup',
        'Improve E-E-A-T signals',
        'Create supporting content cluster'
      ],
      effort: 'HIGH',
      timeframe: '4-8 weeks'
    }
  }
  
  // Low CTR (underperforming)
  if (ctr && ctr < 0.02 && position <= 10) {
    return {
      priority: 'HIGH',
      action: 'CTR Optimization',
      recommendations: [
        'Rewrite title tag for compelling click appeal',
        'Improve meta description with clear value prop',
        'Add rich snippets (ratings, pricing, etc.)',
        'Test different title formulas',
        'Add power words and numbers'
      ],
      effort: 'LOW',
      timeframe: '1-2 weeks'
    }
  }
  
  // Declining keywords
  if (change && change < -5) {
    return {
      priority: 'CRITICAL',
      action: 'Recovery Required',
      recommendations: [
        'Audit for technical SEO issues',
        'Check for content freshness',
        'Analyze competitor improvements',
        'Review backlink profile for losses',
        'Update content comprehensiveness'
      ],
      effort: 'HIGH',
      timeframe: '1-2 weeks'
    }
  }
  
  // Top 3 - maintain position
  if (position <= 3) {
    return {
      priority: 'MEDIUM',
      action: 'Maintain & Defend',
      recommendations: [
        'Monitor competitor changes weekly',
        'Keep content fresh and updated',
        'Continue building quality backlinks',
        'Optimize for featured snippets',
        'Monitor for AI Overview appearance'
      ],
      effort: 'LOW',
      timeframe: 'Ongoing'
    }
  }
  
  // Default recommendations
  return {
    priority: 'LOW',
    action: 'Monitor',
    recommendations: [
      'Continue regular monitoring',
      'Maintain content quality',
      'Track ranking trends'
    ],
    effort: 'LOW',
    timeframe: 'Ongoing'
  }
}

/**
 * Analyze CSV data and extract insights
 */
export function analyzePositionData(csvData) {
  const keywords = parseCSV(csvData)
  
  if (keywords.length === 0) {
    throw new Error('No valid keyword data found in CSV')
  }
  
  // Calculate stats
  const stats = {
    totalKeywords: keywords.length,
    top3: keywords.filter(k => k.currentPosition <= 3).length,
    top10: keywords.filter(k => k.currentPosition <= 10).length,
    top20: keywords.filter(k => k.currentPosition <= 20).length,
    improved: keywords.filter(k => k.change > 0).length,
    declined: keywords.filter(k => k.change < 0).length,
    unchanged: keywords.filter(k => k.change === 0).length,
    avgPosition: (keywords.reduce((sum, k) => sum + k.currentPosition, 0) / keywords.length).toFixed(1),
    totalVolume: keywords.reduce((sum, k) => sum + (k.volume || 0), 0)
  }
  
  // Identify critical issues
  const critical = keywords
    .filter(k => k.change < -5 && k.volume > 100)
    .map(k => ({
      keyword: k.keyword,
      issue: `Lost ${Math.abs(k.change)} positions`,
      currentPosition: k.currentPosition,
      previousPosition: k.previousPosition,
      volume: k.volume,
      impact: assessImpact(k.change, k.volume, k.currentPosition),
      action: getActionRecommendation(k)
    }))
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      return priorityOrder[a.impact] - priorityOrder[b.impact]
    })
    .slice(0, 10)
  
  // Identify quick wins (positions 11-20)
  const opportunities = keywords
    .filter(k => k.currentPosition >= 11 && k.currentPosition <= 20 && k.volume > 50)
    .map(k => {
      const traffic = calculateTrafficPotential(k.currentPosition, k.volume * 30) // Estimate monthly impressions
      return {
        keyword: k.keyword,
        currentPosition: k.currentPosition,
        volume: k.volume,
        currentTraffic: traffic.current,
        potentialTraffic: traffic.potential,
        trafficGain: traffic.gain,
        action: getActionRecommendation(k)
      }
    })
    .sort((a, b) => b.trafficGain - a.trafficGain)
    .slice(0, 20)
  
  // Top performers
  const topPerformers = keywords
    .filter(k => k.currentPosition <= 10)
    .sort((a, b) => a.currentPosition - b.currentPosition)
    .slice(0, 20)
  
  // Biggest declines
  const declines = keywords
    .filter(k => k.change < 0)
    .map(k => ({
      ...k,
      impact: assessImpact(k.change, k.volume, k.currentPosition),
      action: getActionRecommendation(k)
    }))
    .sort((a, b) => a.change - b.change)
    .slice(0, 20)
  
  // AI Overview detection (keywords with "AI Overview" in notes/features)
  const aiOverview = keywords
    .filter(k => 
      k.features?.toLowerCase().includes('ai overview') || 
      k.notes?.toLowerCase().includes('ai overview') ||
      k.serp?.toLowerCase().includes('ai overview')
    )
    .slice(0, 20)
  
  return {
    stats,
    critical,
    opportunities,
    topPerformers,
    declines,
    aiOverview,
    keywords
  }
}

/**
 * Parse CSV data into structured keyword objects
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  if (lines.length < 2) {
    throw new Error('CSV must contain headers and at least one data row')
  }
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  // Find column indices (flexible mapping)
  const columnMap = {
    keyword: findColumnIndex(headers, ['keyword', 'query', 'search term', 'term']),
    currentPosition: findColumnIndex(headers, ['position', 'current position', 'rank', 'current rank']),
    previousPosition: findColumnIndex(headers, ['previous position', 'prev position', 'old position', 'previous rank']),
    volume: findColumnIndex(headers, ['volume', 'search volume', 'searches', 'monthly searches']),
    ctr: findColumnIndex(headers, ['ctr', 'click through rate', 'click rate']),
    traffic: findColumnIndex(headers, ['traffic', 'clicks', 'visits']),
    features: findColumnIndex(headers, ['features', 'serp features', 'serp']),
    notes: findColumnIndex(headers, ['notes', 'description'])
  }
  
  // Parse data rows
  const keywords = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    
    if (values.length < 2) continue // Skip invalid rows
    
    const keyword = values[columnMap.keyword]?.replace(/"/g, '') || `Keyword ${i}`
    const currentPosition = parseInt(values[columnMap.currentPosition]) || 0
    const previousPosition = parseInt(values[columnMap.previousPosition]) || currentPosition
    const volume = parseInt(values[columnMap.volume]) || 0
    const ctr = parseFloat(values[columnMap.ctr]) || 0
    const traffic = parseInt(values[columnMap.traffic]) || 0
    const features = values[columnMap.features]?.replace(/"/g, '') || ''
    const notes = values[columnMap.notes]?.replace(/"/g, '') || ''
    
    if (currentPosition > 0) {
      keywords.push({
        keyword,
        currentPosition,
        previousPosition,
        change: previousPosition - currentPosition, // Positive = improvement
        volume,
        ctr,
        traffic,
        features,
        notes,
        serp: features
      })
    }
  }
  
  return keywords
}

/**
 * Find column index by possible names
 */
function findColumnIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h.toLowerCase().includes(name.toLowerCase())
    )
    if (index !== -1) return index
  }
  return -1
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

/**
 * Generate sample CSV data for demo
 */
export function generateSampleCSV() {
  return `Keyword,Position,Previous Position,Search Volume,CTR,Traffic,SERP Features
"buy instant car quote online",5,8,1200,4.2,50,"Featured Snippet, AI Overview"
"sell my car instantly",15,12,890,2.1,19,"People Also Ask"
"instant car valuation tool",24,12,2400,0.8,19,"CRITICAL DECLINE"
"free car price estimator",3,4,3200,8.5,272,"Featured Snippet, Reviews"
"quick car sale platform",18,18,450,1.2,5,""
"online car marketplace",2,2,5600,12.3,688,"AI Overview, Shopping"
"instant vehicle appraisal",12,15,1100,2.4,26,"People Also Ask"
"car selling website fast",45,22,890,0.2,2,"MAJOR DROP"
"best car valuation service",7,7,1800,3.8,68,"Reviews, Ratings"
"instant cash for cars",1,1,4200,28.5,1197,"AI Overview, Local Pack"
"sell car same day",14,16,720,1.9,14,"People Also Ask"
"online car buyer instant quote",11,13,980,2.6,25,"Quick Win Opportunity"
"instant car offer guaranteed",19,18,560,1.1,6,""
"car trade-in value calculator",4,5,2100,6.8,143,"Calculator, Reviews"
"quick vehicle sale online",22,30,340,0.9,3,"Improving"
"instant auto quote service",8,8,1450,3.5,51,"People Also Ask"
"fast car selling platform",16,14,670,1.5,10,"Images, Videos"
"immediate car purchase offer",13,10,890,2.0,18,"Declining"
"instant car pricing tool",6,6,1980,4.9,97,"Featured Snippet"
"online instant car buyer",9,11,1120,3.1,35,"People Also Ask, AI Overview"`
}

/**
 * Export analysis to CSV
 */
export function exportAnalysisToCSV(analysis) {
  let csv = 'Category,Keyword,Current Position,Change,Volume,Impact,Action,Priority\n'
  
  // Critical issues
  analysis.critical.forEach(item => {
    csv += `Critical Issue,"${item.keyword}",${item.currentPosition},${item.change || 'N/A'},${item.volume},${item.impact},"${item.action.action}",${item.action.priority}\n`
  })
  
  // Opportunities
  analysis.opportunities.forEach(item => {
    csv += `Opportunity,"${item.keyword}",${item.currentPosition},N/A,${item.volume},"Traffic Gain: +${item.trafficGain}","${item.action.action}",${item.action.priority}\n`
  })
  
  // Declines
  analysis.declines.forEach(item => {
    csv += `Decline,"${item.keyword}",${item.currentPosition},${item.change},${item.volume},${item.impact},"${item.action.action}",${item.action.priority}\n`
  })
  
  return csv
}
