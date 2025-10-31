import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { autoFixAPI } from '@/services/api'
import { useAPIData } from '@/hooks/useAPIRequest'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  FileText
} from 'lucide-react'

export default function AutoFixAnalytics() {
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('fixes')

  // API Data
  const { data: enginesData } = useAPIData(
    () => autoFixAPI.getEngines(),
    { autoFetch: true, initialData: [] }
  )

  const { data: historyData } = useAPIData(
    () => autoFixAPI.getHistory(500),
    { autoFetch: true, initialData: [] }
  )

  const engines = enginesData || []
  const history = historyData || []

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = Date.now()
    const timeRanges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity
    }

    const cutoff = now - timeRanges[timeRange]
    const relevantHistory = history.filter(h => 
      new Date(h.createdAt).getTime() > cutoff
    )

    // Overall stats
    const totalRuns = relevantHistory.length
    const successfulRuns = relevantHistory.filter(h => h.status === 'success').length
    const failedRuns = relevantHistory.filter(h => h.status === 'failed').length
    const totalFixes = relevantHistory.reduce((sum, h) => sum + (h.fixesApplied || 0), 0)
    const totalIssues = relevantHistory.reduce((sum, h) => sum + (h.issuesFound || 0), 0)
    const avgDuration = relevantHistory.length > 0
      ? relevantHistory.reduce((sum, h) => sum + (h.duration || 0), 0) / relevantHistory.length
      : 0

    // Success rate
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0

    // Engine breakdown
    const engineStats = engines.map(engine => {
      const engineHistory = relevantHistory.filter(h => h.engineId === engine.id)
      return {
        id: engine.id,
        name: engine.name,
        runs: engineHistory.length,
        fixes: engineHistory.reduce((sum, h) => sum + (h.fixesApplied || 0), 0),
        successRate: engineHistory.length > 0
          ? (engineHistory.filter(h => h.status === 'success').length / engineHistory.length) * 100
          : 0,
        avgDuration: engineHistory.length > 0
          ? engineHistory.reduce((sum, h) => sum + (h.duration || 0), 0) / engineHistory.length
          : 0
      }
    }).sort((a, b) => b.fixes - a.fixes)

    // Daily trends
    const dailyStats = {}
    relevantHistory.forEach(h => {
      const date = new Date(h.createdAt).toISOString().split('T')[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { date, runs: 0, fixes: 0, success: 0, failed: 0 }
      }
      dailyStats[date].runs++
      dailyStats[date].fixes += h.fixesApplied || 0
      if (h.status === 'success') dailyStats[date].success++
      if (h.status === 'failed') dailyStats[date].failed++
    })

    const trends = Object.values(dailyStats).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate trend direction
    const recentTrend = trends.slice(-7)
    const olderTrend = trends.slice(-14, -7)
    const recentAvg = recentTrend.length > 0
      ? recentTrend.reduce((sum, t) => sum + t.fixes, 0) / recentTrend.length
      : 0
    const olderAvg = olderTrend.length > 0
      ? olderTrend.reduce((sum, t) => sum + t.fixes, 0) / olderTrend.length
      : 0
    const trendDirection = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable'
    const trendPercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    // Issue resolution rate
    const resolutionRate = totalIssues > 0 ? (totalFixes / totalIssues) * 100 : 0

    // Peak hours
    const hourlyDistribution = {}
    relevantHistory.forEach(h => {
      const hour = new Date(h.createdAt).getHours()
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
    })
    const peakHour = Object.entries(hourlyDistribution)
      .sort((a, b) => b[1] - a[1])[0]

    return {
      overview: {
        totalRuns,
        successfulRuns,
        failedRuns,
        totalFixes,
        totalIssues,
        avgDuration,
        successRate,
        resolutionRate
      },
      engineStats,
      trends,
      trendDirection,
      trendPercentage,
      peakHour: peakHour ? parseInt(peakHour[0]) : null
    }
  }, [engines, history, timeRange])

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Auto-Fix Analytics
          </h2>
          <p className="text-muted-foreground">
            Performance insights and trends
          </p>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalRuns}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {analytics.overview.successfulRuns} successful • {analytics.overview.failedRuns} failed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Fixes</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalFixes.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {analytics.trendDirection === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : analytics.trendDirection === 'down' ? (
                <TrendingDown className="h-3 w-3 text-red-600" />
              ) : null}
              <span className={
                analytics.trendDirection === 'up' ? 'text-green-600' :
                analytics.trendDirection === 'down' ? 'text-red-600' :
                'text-muted-foreground'
              }>
                {analytics.trendPercentage > 0 ? '+' : ''}
                {analytics.trendPercentage.toFixed(1)}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.successRate.toFixed(1)}%</div>
            <Progress value={analytics.overview.successRate} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.overview.avgDuration)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Per optimization run
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engines">Engine Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="engines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engine Performance Breakdown</CardTitle>
              <CardDescription>
                Compare performance across different auto-fix engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.engineStats.map(engine => (
                <div key={engine.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{engine.name}</span>
                        <Badge variant="secondary">{engine.runs} runs</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {engine.fixes.toLocaleString()} fixes • {engine.successRate.toFixed(1)}% success • {formatDuration(engine.avgDuration)} avg
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-right">
                      {engine.fixes}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Progress value={(engine.fixes / analytics.overview.totalFixes) * 100} className="flex-1 h-2" />
                    <Progress value={engine.successRate} className="w-24 h-2" />
                  </div>
                </div>
              ))}

              {analytics.engineStats.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No engine performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Trends</CardTitle>
              <CardDescription>
                Track optimization patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.trends.slice(-14).map(day => (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Progress 
                          value={(day.fixes / Math.max(...analytics.trends.map(t => t.fixes))) * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-sm font-medium w-12 text-right">{day.fixes}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {day.success}
                        </span>
                        {day.failed > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            {day.failed}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {analytics.trends.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trend data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Issue Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Issues Found</span>
                      <span className="text-sm font-medium">{analytics.overview.totalIssues.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Issues Fixed</span>
                      <span className="text-sm font-medium">{analytics.overview.totalFixes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Resolution Rate</span>
                      <span className="text-sm font-medium">{analytics.overview.resolutionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress value={analytics.overview.resolutionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Peak Hour</span>
                      <span className="text-lg font-bold">
                        {analytics.peakHour !== null 
                          ? `${analytics.peakHour}:00 - ${analytics.peakHour + 1}:00`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Most Active Engine</span>
                      <span className="text-sm font-medium">
                        {analytics.engineStats[0]?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Trend</span>
                      <Badge variant={
                        analytics.trendDirection === 'up' ? 'default' :
                        analytics.trendDirection === 'down' ? 'destructive' :
                        'secondary'
                      }>
                        {analytics.trendDirection === 'up' ? 'Increasing' :
                         analytics.trendDirection === 'down' ? 'Decreasing' :
                         'Stable'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.overview.successRate < 80 && (
                <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Success rate below target</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review failed runs and consider adjusting engine settings
                    </p>
                  </div>
                </div>
              )}

              {analytics.trendDirection === 'down' && (
                <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Activity trending downward</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consider scheduling more frequent runs or expanding engine coverage
                    </p>
                  </div>
                </div>
              )}

              {analytics.engineStats.some(e => e.successRate < 70) && (
                <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Some engines underperforming</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics.engineStats.filter(e => e.successRate < 70).map(e => e.name).join(', ')} 
                      {' '}need attention
                    </p>
                  </div>
                </div>
              )}

              {analytics.overview.successRate >= 90 && analytics.trendDirection === 'up' && (
                <div className="flex gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Excellent performance!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your auto-fix engines are running optimally
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
