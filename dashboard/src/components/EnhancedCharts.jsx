import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts'
import { DateRangePicker } from './DateRangePicker'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function EnhancedCharts({ data, dateRange, onDateChange }) {
  const chartData = data || {
    rankings: [],
    traffic: [],
    conversions: []
  }

  // Calculate trends
  const calculateTrend = (data, key) => {
    if (!data || data.length < 2) return 0
    const current = data[data.length - 1]?.[key] || 0
    const previous = data[0]?.[key] || 0
    if (previous === 0) return 0
    return ((current - previous) / previous * 100).toFixed(1)
  }

  const rankingTrend = calculateTrend(chartData.rankings, 'avgRank')
  const trafficTrend = calculateTrend(chartData.traffic, 'organic')
  const conversionTrend = calculateTrend(chartData.conversions, 'conversions')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>Track your SEO metrics and performance over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={onDateChange} />
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rankings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {rankingTrend < 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Ranking Trend</p>
                  <p className={`text-lg font-bold ${rankingTrend < 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(rankingTrend)}% {rankingTrend < 0 ? 'improved' : 'declined'}
                  </p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData.rankings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgRank"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="Average Rank"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="topKeywords"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  name="Top 10 Keywords"
                  dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Traffic Growth</p>
                  <p className="text-lg font-bold text-green-500">+{Math.abs(trafficTrend)}%</p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData.traffic}>
                <defs>
                  <linearGradient id="colorOrganic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDirect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReferral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="organic" 
                  stackId="1" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#colorOrganic)"
                  strokeWidth={2}
                  name="Organic" 
                />
                <Area 
                  type="monotone" 
                  dataKey="direct" 
                  stackId="1" 
                  stroke="hsl(var(--chart-2))" 
                  fill="url(#colorDirect)"
                  strokeWidth={2}
                  name="Direct" 
                />
                <Area 
                  type="monotone" 
                  dataKey="referral" 
                  stackId="1" 
                  stroke="hsl(var(--chart-3))" 
                  fill="url(#colorReferral)"
                  strokeWidth={2}
                  name="Referral" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="conversions" className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Growth</p>
                  <p className="text-lg font-bold text-green-500">+{Math.abs(conversionTrend)}%</p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData.conversions}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="leads" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 0, 0]}
                  name="Leads"
                />
                <Bar 
                  dataKey="conversions" 
                  fill="hsl(var(--chart-2))" 
                  radius={[8, 8, 0, 0]}
                  name="Conversions"
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Position</p>
                    <p className="text-3xl font-bold">
                      {chartData.rankings[chartData.rankings.length - 1]?.avgRank || '--'}
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                      {rankingTrend < 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-green-500">{Math.abs(rankingTrend)}% improved</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-red-500">{Math.abs(rankingTrend)}% declined</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Organic Traffic</p>
                    <p className="text-3xl font-bold">
                      {chartData.traffic[chartData.traffic.length - 1]?.organic || 0}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{Math.abs(trafficTrend)}% growth</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Conversions</p>
                    <p className="text-3xl font-bold">
                      {chartData.conversions[chartData.conversions.length - 1]?.conversions || 0}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>+{Math.abs(conversionTrend)}% increase</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
