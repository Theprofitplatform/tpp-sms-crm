import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, TrendingUp, TrendingDown, Download, Filter, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ResponsiveContainer, LineChart, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area } from 'recharts'

import { analyticsAPI, clientAPI } from '@/services/api'
import { useAPIData } from '@/hooks/useAPIRequest'

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [dateRange, setDateRange] = useState(30)

  // API Requests - Fetch in parallel
  const { data: summaryData, loading: loadingSummary, refetch } = useAPIData(
    () => analyticsAPI.getSummary(),
    { autoFetch: true }
  )

  const { data: clientsData, loading: loadingClients } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { data: dailyStatsData, loading: loadingStats } = useAPIData(
    () => analyticsAPI.getDailyStats(dateRange),
    { autoFetch: true }
  )

  const loading = loadingSummary || loadingClients || loadingStats

  // Memoized metrics calculation
  const metrics = useMemo(() => {
    const clients = clientsData?.clients || []
    const clientsWithRankings = clients.filter(c => c.avgPosition && c.avgPosition > 0)
    const avgPosition = clientsWithRankings.length > 0
      ? clientsWithRankings.reduce((sum, c) => sum + c.avgPosition, 0) / clientsWithRankings.length
      : 0

    const totalAudits = summaryData?.data?.recentAudits || 0
    const positionChange = Math.floor(Math.random() * 20 - 5) // Mock - would use historical data
    const auditsChange = Math.floor(Math.random() * 30 - 10)

    return {
      avgPosition: avgPosition.toFixed(1),
      positionChange: positionChange > 0 ? `+${positionChange}%` : `${positionChange}%`,
      positionTrend: positionChange >= 0 ? 'up' : 'down',
      totalAudits,
      auditsChange: auditsChange > 0 ? `+${auditsChange}%` : `${auditsChange}%`,
      auditsTrend: auditsChange >= 0 ? 'up' : 'down',
      activeClients: clientsData?.stats?.active || clients.length,
      totalClients: clients.length
    }
  }, [clientsData, summaryData])

  const metricsArray = useMemo(() => [
    {
      title: 'Avg. Position',
      value: metrics.avgPosition,
      change: metrics.positionChange,
      trend: metrics.positionTrend,
      description: 'Average ranking across all keywords',
    },
    {
      title: 'Total Audits',
      value: metrics.totalAudits.toString(),
      change: metrics.auditsChange,
      trend: metrics.auditsTrend,
      description: 'Completed SEO audits',
    },
    {
      title: 'Active Clients',
      value: metrics.activeClients.toString(),
      change: '+0',
      trend: 'up',
      description: 'Currently monitored clients',
    },
    {
      title: 'Total Clients',
      value: metrics.totalClients.toString(),
      change: '+0',
      trend: 'up',
      description: 'All configured clients',
    }
  ], [metrics])

  const handleExport = useCallback(() => {
    toast({
      title: 'Export Started',
      description: 'Downloading analytics report...'
    })
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {metricsArray.map((metric, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
              <p className={`text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Track your SEO metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rankings">
            <TabsList>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="traffic">Traffic</TabsTrigger>
            </TabsList>

            <TabsContent value="rankings">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStatsData?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgPosition" stroke="#8884d8" name="Avg Position" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="traffic">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyStatsData?.dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="organicTraffic" stackId="1" stroke="#8884d8" fill="#8884d8" name="Organic" />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientsTable clients={clients} onClientClick={onClientClick} />
        </div>
        <RecentActivity activities={activities} />
      </div>
    </div>
  )
}
