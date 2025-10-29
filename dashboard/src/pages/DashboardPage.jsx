import { useMemo } from 'react'
import { StatsCards } from '@/components/StatsCards'
import { ClientsTable } from '@/components/ClientsTable'
import { RecentActivity } from '@/components/RecentActivity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, Loader2 } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

import { clientAPI, analyticsAPI } from '@/services/api'
import { useAPIData } from '@/hooks/useAPIRequest'

export default function DashboardPage({ onClientClick }) {
  // API Requests
  const { data: dashboardData, loading: loadingDashboard, refetch: refetchDashboard } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { data: analyticsData, loading: loadingAnalytics } = useAPIData(
    () => analyticsAPI.getDailyStats(30),
    { autoFetch: true }
  )

  const loading = loadingDashboard || loadingAnalytics

  const stats = dashboardData?.stats || {}
  const clients = dashboardData?.clients || []
  const activities = dashboardData?.activities || []

  // Transform analytics data for charts
  const chartData = useMemo(() => {
    const daily = analyticsData?.dailyStats || []
    
    return {
      rankings: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
        avgRank: d.avgPosition || 0,
        topKeywords: d.topKeywordsCount || 0
      })),
      traffic: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
        organic: d.organicTraffic || 0,
        direct: d.directTraffic || 0,
        referral: d.referralTraffic || 0
      })),
      conversions: daily.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
        leads: d.leads || 0,
        conversions: d.conversions || 0
      }))
    }
  }, [analyticsData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your SEO automation platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetchDashboard}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientsTable clients={clients} onClientClick={onClientClick} />
        </div>
        <RecentActivity activities={activities} />
      </div>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Track your SEO metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rankings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="traffic">Traffic</TabsTrigger>
              <TabsTrigger value="conversions">Conversions</TabsTrigger>
            </TabsList>

            <TabsContent value="rankings" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.rankings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgRank"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Average Rank"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="topKeywords"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Top 10 Keywords"
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="organic" stackId="1" stroke="#8884d8" fill="#8884d8" name="Organic" />
                  <Area type="monotone" dataKey="direct" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Direct" />
                  <Area type="monotone" dataKey="referral" stackId="1" stroke="#ffc658" fill="#ffc658" name="Referral" />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="conversions" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.conversions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="#8884d8" strokeWidth={2} name="Leads" />
                  <Line type="monotone" dataKey="conversions" stroke="#82ca9d" strokeWidth={2} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
