import { StatsCards } from '@/components/StatsCards'
import { ClientsTable } from '@/components/ClientsTable'
import { RecentActivity } from '@/components/RecentActivity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export function DashboardPage({ data = {}, onClientClick }) {
  const { stats = {}, clients = [], activities = [] } = data

  // Sample data for charts (replace with real API data)
  const rankingsData = [
    { date: 'Jan', avgRank: 15, topKeywords: 12 },
    { date: 'Feb', avgRank: 13, topKeywords: 18 },
    { date: 'Mar', avgRank: 11, topKeywords: 22 },
    { date: 'Apr', avgRank: 9, topKeywords: 28 },
    { date: 'May', avgRank: 7, topKeywords: 35 },
    { date: 'Jun', avgRank: 6, topKeywords: 42 }
  ]

  const trafficData = [
    { date: 'Jan', organic: 1200, direct: 400, referral: 200 },
    { date: 'Feb', organic: 1800, direct: 500, referral: 300 },
    { date: 'Mar', organic: 2400, direct: 600, referral: 400 },
    { date: 'Apr', organic: 3200, direct: 700, referral: 500 },
    { date: 'May', organic: 4100, direct: 800, referral: 600 },
    { date: 'Jun', organic: 5200, direct: 900, referral: 700 }
  ]

  const conversionsData = [
    { date: 'Jan', leads: 15, conversions: 5 },
    { date: 'Feb', leads: 22, conversions: 8 },
    { date: 'Mar', leads: 30, conversions: 12 },
    { date: 'Apr', leads: 42, conversions: 18 },
    { date: 'May', leads: 55, conversions: 24 },
    { date: 'Jun', leads: 68, conversions: 32 }
  ]

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
          <Button variant="outline" size="sm">
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
        {/* Clients Overview */}
        <div className="lg:col-span-2">
          <ClientsTable clients={clients} onClientClick={onClientClick} />
        </div>

        {/* Recent Activity */}
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
                <LineChart data={rankingsData}>
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
                    dot={{ fill: '#8884d8' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="topKeywords"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Top 10 Keywords"
                    dot={{ fill: '#82ca9d' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="traffic" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="organic"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Organic Traffic"
                  />
                  <Area
                    type="monotone"
                    dataKey="direct"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Direct Traffic"
                  />
                  <Area
                    type="monotone"
                    dataKey="referral"
                    stackId="1"
                    stroke="#ffc658"
                    fill="#ffc658"
                    name="Referral Traffic"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="conversions" className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" fill="#8884d8" name="Leads Generated" />
                  <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
