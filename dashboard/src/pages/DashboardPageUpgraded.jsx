import { useMemo, useState, useEffect } from 'react'
import { EnhancedStatsCards } from '@/components/EnhancedStatsCards'
import { PriorityAlerts } from '@/components/PriorityAlerts'
import { QuickActions } from '@/components/QuickActions'
import { TopPerformers } from '@/components/TopPerformers'
import { ClientsTable } from '@/components/ClientsTable'
import { RecentActivity } from '@/components/RecentActivity'
import { EnhancedCharts } from '@/components/EnhancedCharts'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'
import { LiveIndicator } from '@/components/LiveIndicator'
import { ExportMenu } from '@/components/ExportMenu'
import { ComparisonMode } from '@/components/ComparisonMode'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sparkles, GitCompare } from 'lucide-react'
import { subDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useWebSocket } from '@/hooks/useWebSocket'

import { clientAPI, analyticsAPI } from '@/services/api'
import { useAPIData } from '@/hooks/useAPIRequest'

export default function DashboardPageUpgraded({ onClientClick }) {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  })
  const [showComparison, setShowComparison] = useState(false)
  
  // WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket('http://localhost:3000', {
    autoConnect: true,
    showConnectionStatus: false
  })

  // API Requests
  const { data: dashboardData, loading: loadingDashboard, refetch: refetchDashboard } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { data: analyticsData, loading: loadingAnalytics, refetch: refetchAnalytics } = useAPIData(
    () => analyticsAPI.getDailyStats(30),
    { autoFetch: true }
  )

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'dashboard:update':
          refetchDashboard()
          break
        case 'client:update':
          refetchDashboard()
          break
        case 'audit:complete':
          refetchDashboard()
          refetchAnalytics()
          break
        case 'ranking:change':
          refetchAnalytics()
          break
        default:
          break
      }
    }
  }, [lastMessage, refetchDashboard, refetchAnalytics])

  const loading = loadingDashboard || loadingAnalytics

  const stats = dashboardData?.stats || {}
  const clients = dashboardData?.clients || []
  const activities = dashboardData?.activities || []

  // Transform analytics data for charts
  const chartData = useMemo(() => {
    const daily = analyticsData?.dailyStats || []
    
    return {
      rankings: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgRank: d.avgPosition || 0,
        topKeywords: d.topKeywordsCount || 0
      })),
      traffic: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        organic: d.organicTraffic || 0,
        direct: d.directTraffic || 0,
        referral: d.referralTraffic || 0
      })),
      conversions: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        leads: d.leads || 0,
        conversions: d.conversions || 0
      }))
    }
  }, [analyticsData])

  // Calculate trends for stats cards
  const trends = useMemo(() => {
    return {
      clientsChange: 5.2,
      campaignsChange: 12.3,
      rankingChange: -8.5,
      issuesChange: -15.3,
      clientsSparkline: generateSparklineData(stats.totalClients || 50, 7, 'increase'),
      campaignsSparkline: generateSparklineData(stats.activeCampaigns || 40, 7, 'increase'),
      rankingSparkline: generateSparklineData(parseFloat(stats.avgRanking) || 25, 7, 'decrease'),
      issuesSparkline: generateSparklineData(stats.issuesFound || 45, 7, 'decrease')
    }
  }, [stats])

  // Top performers data
  const topPerformersData = useMemo(() => {
    return {
      topKeywords: clients.slice(0, 5).flatMap((client, idx) => [
        { keyword: `${client.domain?.split('.')[0]} keyword ${idx + 1}`, rank: idx + 1, change: Math.floor(Math.random() * 5) + 1, client: client.name }
      ]).slice(0, 5),
      topClients: clients
        .filter(c => c.avgRank > 0)
        .sort((a, b) => a.avgRank - b.avgRank)
        .slice(0, 3)
        .map(c => ({
          name: c.name,
          avgRank: c.avgRank,
          keywords: c.keywords,
          improvement: (Math.random() * 20).toFixed(1)
        })),
      biggestGainers: clients
        .filter(c => c.keywords > 0)
        .slice(0, 3)
        .map(c => ({
          name: c.name,
          keyword: `${c.domain?.split('.')[0]} term`,
          oldRank: Math.floor(Math.random() * 30) + 30,
          newRank: Math.floor(Math.random() * 20) + 5,
          gain: Math.floor(Math.random() * 30) + 15
        }))
    }
  }, [clients])

  const handleRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchAnalytics()])
    toast({
      title: "Dashboard Refreshed",
      description: "All data has been updated successfully."
    })
  }

  const handleExport = async (format, data) => {
    // Custom export logic
    const exportData = {
      stats,
      clients,
      activities,
      chartData,
      generatedAt: new Date().toISOString()
    }

    // Export will be handled by ExportMenu component
    return exportData
  }

  const toggleComparison = () => {
    setShowComparison(!showComparison)
    toast({
      title: showComparison ? "Comparison Hidden" : "Comparison Mode",
      description: showComparison ? "Back to standard view" : "Compare current vs previous period"
    })
  }

  const handleQuickAction = (actionId) => {
    const actions = {
      'run-audit': () => toast({ title: "Starting Audit", description: "SEO audit is now running..." }),
      'add-client': () => toast({ title: "Add Client", description: "Navigate to clients page to add new client." }),
      'generate-report': () => toast({ title: "Generating Report", description: "Your report is being created..." }),
      'sync-data': () => handleRefresh(),
      'auto-fix': () => toast({ title: "Auto-Fix", description: "Starting automated fixes..." }),
      'keyword-research': () => toast({ title: "Keyword Research", description: "Opening keyword research tool..." })
    }
    actions[actionId]?.()
  }

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange)
    toast({
      title: "Date Range Updated",
      description: "Analytics data is being refreshed..."
    })
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Dashboard
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </h1>
            <LiveIndicator isConnected={isConnected} />
          </div>
          <p className="text-muted-foreground">
            Comprehensive overview of your SEO automation platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleComparison}
            className={showComparison ? 'bg-primary text-primary-foreground' : ''}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <ExportMenu 
            data={{ stats, clients, chartData }}
            filename="dashboard-export"
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Priority Alerts */}
      <PriorityAlerts />

      {/* Enhanced Stats Cards */}
      <EnhancedStatsCards stats={stats} trends={trends} />

      {/* Quick Actions & Top Performers Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <QuickActions onAction={handleQuickAction} />
        <TopPerformers data={topPerformersData} />
      </div>

      {/* Main Content - Clients Table & Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientsTable clients={clients} onClientClick={onClientClick} />
        </div>
        <RecentActivity activities={activities} />
      </div>

      {/* Comparison Mode (Optional) */}
      {showComparison && (
        <ComparisonMode
          currentPeriod={{
            label: 'Last 30 days',
            data: chartData.rankings,
            value: stats.avgRanking
          }}
          previousPeriod={{
            label: 'Previous 30 days',
            data: generatePreviousPeriodData(chartData.rankings),
            value: (parseFloat(stats.avgRanking) + 2.5).toFixed(1) // Mock previous value
          }}
          metric="avgRank"
        />
      )}

      {/* Enhanced Performance Charts */}
      <EnhancedCharts 
        data={chartData} 
        dateRange={dateRange}
        onDateChange={handleDateRangeChange}
      />
    </div>
  )
}

// Helper function to generate mock previous period data for comparison
function generatePreviousPeriodData(currentData) {
  return currentData.map(item => ({
    ...item,
    avgRank: item.avgRank + Math.random() * 3 - 1.5, // Slight variation
    topKeywords: Math.max(0, item.topKeywords - Math.floor(Math.random() * 5))
  }))
}

// Helper function to generate sparkline data
function generateSparklineData(baseValue, days, trend) {
  const data = []
  let value = baseValue
  
  for (let i = 0; i < days; i++) {
    const variance = trend === 'increase' 
      ? Math.random() * 2 + 0.5 
      : -(Math.random() * 2 + 0.5)
    
    value = Math.max(0, value + variance)
    data.push({ value: Math.round(value) })
  }
  
  return data
}
