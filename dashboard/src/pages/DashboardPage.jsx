import { StatsCards } from '@/components/StatsCards'
import { ClientsTable } from '@/components/ClientsTable'
import { RecentActivity } from '@/components/RecentActivity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export function DashboardPage({ data = {}, onClientClick }) {
  const { stats = {}, clients = [], activities = [] } = data

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
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Chart placeholder - Add Recharts implementation</p>
              </div>
            </TabsContent>
            <TabsContent value="traffic" className="space-y-4">
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Chart placeholder - Add Recharts implementation</p>
              </div>
            </TabsContent>
            <TabsContent value="conversions" className="space-y-4">
              <div className="h-[300px] flex items-center justify-center border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Chart placeholder - Add Recharts implementation</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
