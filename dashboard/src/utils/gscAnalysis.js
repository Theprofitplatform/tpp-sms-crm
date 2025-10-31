/**
 * Google Search Console Analysis Utilities
 * Traffic potential calculations and actionable recommendations
 */

import { CTR_BY_POSITION } from './positionAnalysis'

/**
 * Calculate traffic potential for GSC query
 */
export function calculateGSCTrafficPotential(query) {
  const { position, impressions, clicks } = query
  const currentPosition = Math.round(position)
  
  // Target position 5 for quick wins (positions 11-20)
  // Target position 1 for optimization (positions 4-10)
  const targetPosition = currentPosition > 10 ? 5 : 1
  
  const currentCTR = CTR_BY_POSITION[currentPosition] || 0.005
  const targetCTR = CTR_BY_POSITION[targetPosition] || 0.065
  
  const currentEstimatedClicks = Math.round(currentCTR * impressions)
  const potentialClicks = Math.round(targetCTR * impressions)
  const clicksGain = potentialClicks - (clicks || currentEstimatedClicks)
  const percentGain = clicks > 0 ? Math.round((clicksGain / clicks) * 100) : 0
  
  return {
    current: clicks || currentEstimatedClicks,
    potential: potentialClicks,
    gain: clicksGain,
    percentGain,
    targetPosition
  }
}

/**
 * Get actionable recommendations for GSC query
 */
export function getGSCRecommendations(query) {
  const { position, ctr, clicks, impressions } = query
  const avgCTR = clicks && impressions ? (clicks / impressions) : 0
  
  // Quick wins (positions 11-20)
  if (position >= 11 && position <= 15) {
    return {
      priority: 'HIGH',
      category: 'Quick Win',
      icon: 'zap',
      color: 'yellow',
      recommendations: [
        {
          action: 'Content Enhancement',
          description: 'Add 300-500 words of unique, value-adding content',
          effort: 'Medium',
          impact: 'High'
        },
        {
          action: 'Internal Linking',
          description: 'Add 3-5 contextual internal links from high-authority pages',
          effort: 'Low',
          impact: 'High'
        },
        {
          action: 'On-Page SEO',
          description: 'Optimize title tag with target keyword at beginning',
          effort: 'Low',
          impact: 'Medium'
        },
        {
          action: 'User Experience',
          description: 'Improve page load speed to < 2.5s LCP',
          effort: 'Medium',
          impact: 'Medium'
        }
      ],
      timeframe: '2-4 weeks',
      successRate: '70%'
    }
  }
  
  if (position >= 16 && position <= 20) {
    return {
      priority: 'MEDIUM',
      category: 'Growth Opportunity',
      icon: 'trending-up',
      color: 'blue',
      recommendations: [
        {
          action: 'Link Building',
          description: 'Build 3-5 quality backlinks from relevant domains',
          effort: 'High',
          impact: 'High'
        },
        {
          action: 'Content Update',
          description: 'Refresh content with latest data and statistics',
          effort: 'Medium',
          impact: 'High'
        },
        {
          action: 'Schema Markup',
          description: 'Add comprehensive schema (FAQ, HowTo, or Article)',
          effort: 'Low',
          impact: 'Medium'
        },
        {
          action: 'Topic Cluster',
          description: 'Create 2-3 supporting pages and link to main page',
          effort: 'High',
          impact: 'High'
        }
      ],
      timeframe: '4-8 weeks',
      successRate: '60%'
    }
  }
  
  // Low CTR optimization (positions 1-10)
  if (position <= 10 && avgCTR < 0.02) {
    return {
      priority: 'HIGH',
      category: 'CTR Optimization',
      icon: 'mouse-pointer-click',
      color: 'orange',
      recommendations: [
        {
          action: 'Title Optimization',
          description: 'Rewrite title with emotional triggers or numbers',
          effort: 'Low',
          impact: 'Very High'
        },
        {
          action: 'Meta Description',
          description: 'Write compelling meta with clear value proposition and CTA',
          effort: 'Low',
          impact: 'High'
        },
        {
          action: 'Rich Snippets',
          description: 'Add star ratings, pricing, or availability markup',
          effort: 'Medium',
          impact: 'High'
        },
        {
          action: 'A/B Testing',
          description: 'Test different title formulas in GSC',
          effort: 'Low',
          impact: 'Medium'
        }
      ],
      timeframe: '1-2 weeks',
      successRate: '80%'
    }
  }
  
  // Top 3 positions - maintain and optimize
  if (position <= 3) {
    return {
      priority: 'MEDIUM',
      category: 'Maintain Position',
      icon: 'shield',
      color: 'green',
      recommendations: [
        {
          action: 'Monitor Competitors',
          description: 'Weekly competitor analysis for position changes',
          effort: 'Low',
          impact: 'High'
        },
        {
          action: 'Content Freshness',
          description: 'Update content quarterly with new information',
          effort: 'Low',
          impact: 'Medium'
        },
        {
          action: 'Featured Snippet',
          description: 'Optimize for featured snippet if not already winning',
          effort: 'Medium',
          impact: 'High'
        },
        {
          action: 'Backlink Monitoring',
          description: 'Monitor and maintain quality backlink profile',
          effort: 'Low',
          impact: 'Medium'
        }
      ],
      timeframe: 'Ongoing',
      successRate: '90%'
    }
  }
  
  // Positions 4-10 - push to top 3
  if (position >= 4 && position <= 10) {
    return {
      priority: 'HIGH',
      category: 'Top 3 Opportunity',
      icon: 'target',
      color: 'blue',
      recommendations: [
        {
          action: 'Content Depth',
          description: 'Make content 2x more comprehensive than competitors',
          effort: 'High',
          impact: 'Very High'
        },
        {
          action: 'E-E-A-T Signals',
          description: 'Add author bio, credentials, citations, and sources',
          effort: 'Medium',
          impact: 'High'
        },
        {
          action: 'Multimedia',
          description: 'Add original images, videos, or interactive elements',
          effort: 'High',
          impact: 'Medium'
        },
        {
          action: 'User Engagement',
          description: 'Improve dwell time with better formatting and structure',
          effort: 'Medium',
          impact: 'High'
        }
      ],
      timeframe: '3-6 weeks',
      successRate: '65%'
    }
  }
  
  // Default recommendations
  return {
    priority: 'LOW',
    category: 'Monitor',
    icon: 'eye',
    color: 'gray',
    recommendations: [
      {
        action: 'Regular Monitoring',
        description: 'Track position changes weekly',
        effort: 'Low',
        impact: 'Low'
      },
      {
        action: 'Maintain Quality',
        description: 'Keep content accurate and up-to-date',
        effort: 'Low',
        impact: 'Low'
      }
    ],
    timeframe: 'Ongoing',
    successRate: '50%'
  }
}

/**
 * Categorize GSC queries by opportunity type
 */
export function categorizeGSCData(queries) {
  const quickWins = []
  const lowCTR = []
  const top3Maintain = []
  const top10Push = []
  const longTail = []
  
  queries.forEach(query => {
    const { position, clicks, impressions } = query
    const ctr = clicks && impressions ? (clicks / impressions) : 0
    
    // Quick wins (positions 11-20 with decent volume)
    if (position >= 11 && position <= 20 && impressions >= 50) {
      const traffic = calculateGSCTrafficPotential(query)
      quickWins.push({
        ...query,
        traffic,
        recommendations: getGSCRecommendations(query)
      })
    }
    
    // Low CTR in top 10
    else if (position <= 10 && ctr < 0.02 && impressions >= 100) {
      const traffic = calculateGSCTrafficPotential(query)
      lowCTR.push({
        ...query,
        traffic,
        recommendations: getGSCRecommendations(query)
      })
    }
    
    // Top 3 to maintain
    else if (position <= 3) {
      const traffic = calculateGSCTrafficPotential(query)
      top3Maintain.push({
        ...query,
        traffic,
        recommendations: getGSCRecommendations(query)
      })
    }
    
    // Positions 4-10 - push to top 3
    else if (position >= 4 && position <= 10 && impressions >= 100) {
      const traffic = calculateGSCTrafficPotential(query)
      top10Push.push({
        ...query,
        traffic,
        recommendations: getGSCRecommendations(query)
      })
    }
    
    // Long tail (positions 21+)
    else if (position >= 21 && impressions >= 20) {
      longTail.push(query)
    }
  })
  
  // Sort by potential traffic gain
  quickWins.sort((a, b) => b.traffic.gain - a.traffic.gain)
  lowCTR.sort((a, b) => b.traffic.gain - a.traffic.gain)
  top10Push.sort((a, b) => b.traffic.gain - a.traffic.gain)
  
  return {
    quickWins: quickWins.slice(0, 20),
    lowCTR: lowCTR.slice(0, 20),
    top3Maintain: top3Maintain.slice(0, 20),
    top10Push: top10Push.slice(0, 20),
    longTail: longTail.slice(0, 50)
  }
}

/**
 * Generate GSC setup wizard steps
 */
export const GSC_SETUP_STEPS = [
  {
    step: 1,
    title: 'Create Google Cloud Project',
    description: 'Set up a project in Google Cloud Console',
    instructions: [
      'Go to Google Cloud Console (console.cloud.google.com)',
      'Click "Select a project" → "New Project"',
      'Name your project (e.g., "SEO Dashboard")',
      'Click "Create" and wait for project creation',
      'Select your new project from the dropdown'
    ],
    estimatedTime: '2 minutes',
    link: 'https://console.cloud.google.com'
  },
  {
    step: 2,
    title: 'Enable Search Console API',
    description: 'Activate the Google Search Console API',
    instructions: [
      'In Google Cloud Console, go to "APIs & Services"',
      'Click "Enable APIs and Services"',
      'Search for "Google Search Console API"',
      'Click on it and press "Enable"',
      'Wait for API activation (takes a few seconds)'
    ],
    estimatedTime: '1 minute',
    link: 'https://console.cloud.google.com/apis/library'
  },
  {
    step: 3,
    title: 'Create Service Account',
    description: 'Generate credentials for API access',
    instructions: [
      'Go to "APIs & Services" → "Credentials"',
      'Click "Create Credentials" → "Service Account"',
      'Name it "GSC Service Account"',
      'Click "Create and Continue"',
      'Skip roles (optional) and click "Done"'
    ],
    estimatedTime: '2 minutes',
    link: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    step: 4,
    title: 'Download JSON Key',
    description: 'Get your service account credentials',
    instructions: [
      'Click on your newly created service account',
      'Go to "Keys" tab',
      'Click "Add Key" → "Create new key"',
      'Select "JSON" format',
      'Click "Create" - file will download automatically'
    ],
    estimatedTime: '1 minute',
    note: 'Keep this file secure - it contains sensitive credentials'
  },
  {
    step: 5,
    title: 'Grant Search Console Access',
    description: 'Add service account to your GSC property',
    instructions: [
      'Open the JSON file and copy the "client_email" value',
      'Go to Google Search Console (search.google.com/search-console)',
      'Select your property',
      'Click Settings (gear icon) → "Users and permissions"',
      'Click "Add user" and paste the client_email',
      'Set permission level to "Full" or "Owner"',
      'Click "Add"'
    ],
    estimatedTime: '2 minutes',
    link: 'https://search.google.com/search-console'
  },
  {
    step: 6,
    title: 'Configure in Dashboard',
    description: 'Add credentials to your SEO Dashboard',
    instructions: [
      'Go to Settings → Google Search Console',
      'Upload your JSON key file, or',
      'Copy/paste the JSON content',
      'Enter your GSC property URL',
      'Click "Save Configuration"',
      'Test the connection'
    ],
    estimatedTime: '1 minute'
  }
]
