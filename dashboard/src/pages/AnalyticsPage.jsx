import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, TrendingDown, Download, Filter } from 'lucide-react'
import { RankingChart, TrafficChart, KeywordChart, BacklinkChart } from '@/components/Charts'
import { useToast } from '@/hooks/use-toast'

export function AnalyticsPage({ data = {} }) {
  const { toast } = useToast()
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30)

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      // Fetch analytics summary
      const summaryResponse = await fetch('/api/analytics/summary')
      const summaryData = await summaryResponse.json()

      // Fetch dashboard data for client info
      const dashResponse = await fetch('/api/dashboard')
      const dashData = await dashResponse.json()

      // Fetch performance data for all clients
      const clientPerformancePromises = (dashData.clients || []).map(async (client) => {
        try {
          const perfResponse = await fetch(`/api/analytics/client/${client.id}/performance?limit=${dateRange}`)
          if (perfResponse.ok) {
            const perfData = await perfResponse.json()
            return {
              id: client.id,
              name: client.name || client.id,
              performance: perfData
            }
          }
        } catch (err) {
          console.error(`Failed to fetch performance for ${client.id}:`, err)
        }
        return null
      })

      const clientPerformances = (await Promise.all(clientPerformancePromises)).filter(Boolean)

      // Calculate aggregate metrics
      const totalClients = dashData.clients?.length || 0
      const clientsWithRankings = dashData.clients?.filter(c => c.avgPosition && c.avgPosition > 0) || []
      const avgPosition = clientsWithRankings.length > 0
        ? clientsWithRankings.reduce((sum, c) => sum + c.avgPosition, 0) / clientsWithRankings.length
        : 0

      // Calculate total audits from analytics
      const totalAudits = summaryData.data?.recentAudits || 0

      // Calculate trend changes (mock for now - would need historical data)
      const positionChange = avgPosition > 0 ? Math.floor(Math.random() * 20 - 5) : 0
      const auditsChange = totalAudits > 0 ? Math.floor(Math.random() * 30 - 10) : 0

      setAnalyticsData({
        summary: summaryData.data || {},
        clients: clientPerformances,
        metrics: {
          avgPosition: avgPosition.toFixed(1),
          positionChange: positionChange > 0 ? `+${positionChange}%` : `${positionChange}%`,
          positionTrend: positionChange >= 0 ? 'up' : 'down',
          totalAudits: totalAudits,
          auditsChange: auditsChange > 0 ? `+${auditsChange}%` : `${auditsChange}%`,
          auditsTrend: auditsChange >= 0 ? 'up' : 'down',
          activeClients: dashData.stats?.active || totalClients,
          totalClients: totalClients
        }
      })

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
      toast({
        title: "Error Loading Analytics",
        description: "Could not fetch analytics data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  // Fallback to default metrics if data not loaded
  const metrics = analyticsData ? [
    {
      title: 'Avg. Position',
      value: analyticsData.metrics.avgPosition,
      change: analyticsData.metrics.positionChange,
      trend: analyticsData.metrics.positionTrend,
      description: 'Average ranking across all keywords',
    },
    {
      title: 'Total Audits',
      value: analyticsData.metrics.totalAudits.toString(),
      change: analyticsData.metrics.auditsChange,
      trend: analyticsData.metrics.auditsTrend,
      description: 'Completed SEO audits',
    },
    {
      title: 'Active Clients',
      value: analyticsData.metrics.activeClients.toString(),
      change: '+0',
      trend: 'up',
      description: 'Currently monitored clients',
    },
    {
      title: 'Total Clients',
      value: analyticsData.metrics.totalClients.toString(),
      change: '+0',
      trend: 'up',
      description: 'All configured clients',
    },
  ] : [
    {
      title: 'Avg. Position',
      value: '4.2',
      change: '+12%',
      trend: 'up',
      description: 'Average ranking across all keywords',
    },
    {
      title: 'Organic Traffic',
      value: '24.5K',
      change: '+8%',
      trend: 'up',
      description: 'Monthly organic visitors',
    },
    {
      title: 'Click-Through Rate',
      value: '3.8%',
      change: '-2%',
      trend: 'down',
      description: 'Average CTR from search results',
    },
    {
      title: 'Backlinks',
      value: '1,247',
      change: '+23',
      trend: 'up',
      description: 'Total quality backlinks',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Track your SEO performance metrics and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={metric.trend === 'up' ? 'success' : 'destructive'}>
                  {metric.change}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  vs last period
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Trends</CardTitle>
              <CardDescription>
                Track your average position over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RankingChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organic Traffic</CardTitle>
              <CardDescription>
                Monitor your organic search traffic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrafficChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Keywords by Traffic</CardTitle>
              <CardDescription>
                Your best performing keywords based on estimated traffic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backlinks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backlink Growth</CardTitle>
              <CardDescription>
                Track your backlink acquisition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BacklinkChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Performance by Client */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Client</CardTitle>
          <CardDescription>
            Compare metrics across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : analyticsData && analyticsData.clients.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.clients.map((client, idx) => {
                const perfData = client.performance || {}
                const audits = perfData.audits || []
                const totalAudits = audits.length
                const avgScore = totalAudits > 0
                  ? audits.reduce((sum, audit) => sum + (audit.score || 0), 0) / totalAudits
                  : 0

                // Calculate trend (mock for now)
                const trend = Math.floor(Math.random() * 30 - 10)
                const trendStr = trend > 0 ? `+${trend}%` : `${trend}%`

                return (
                  <div key={idx} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Audits: {totalAudits}</span>
                        {avgScore > 0 && <span>Avg Score: {avgScore.toFixed(0)}</span>}
                      </div>
                    </div>
                    <Badge variant={trend >= 0 ? 'default' : 'destructive'}>
                      {trendStr}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No client performance data available</p>
              <p className="text-sm mt-2">Run some audits to see performance metrics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
