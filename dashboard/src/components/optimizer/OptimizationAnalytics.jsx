import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, BarChart3, Target, Clock } from 'lucide-react'

export default function OptimizationAnalytics({ days = 30 }) {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    trends: [],
    byClient: [],
    scoreDistribution: { before: [], after: [] },
    processingTime: []
  })

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/ai-optimizer/analytics?days=${days}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Optimization Trends</CardTitle>
          </div>
          <CardDescription>Daily optimization activity over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.trends}>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Optimizations"
              />
              <Line
                type="monotone"
                dataKey="avgImprovement"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(142 76% 36%)' }}
                name="Avg Improvement %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* By Client Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>By Client</CardTitle>
            </div>
            <CardDescription>Average improvement per client</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.byClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.byClient}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="avgImprovement" 
                    fill="hsl(var(--primary))" 
                    name="Avg Improvement %"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Score Distribution Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <CardTitle>Score Distribution</CardTitle>
            </div>
            <CardDescription>Before vs After SEO scores</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.scoreDistribution.before.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.scoreDistribution.before.map((item, idx) => ({
                  range: item.range,
                  before: item.count,
                  after: analytics.scoreDistribution.after[idx]?.count || 0
                }))}>
                  <defs>
                    <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(0 84.2% 60.2%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="range" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="before"
                    stroke="hsl(0 84.2% 60.2%)"
                    fillOpacity={1}
                    fill="url(#colorBefore)"
                    name="Before"
                  />
                  <Area
                    type="monotone"
                    dataKey="after"
                    stroke="hsl(142 76% 36%)"
                    fillOpacity={1}
                    fill="url(#colorAfter)"
                    name="After"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Processing Time Chart */}
      {analytics.processingTime.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Processing Time</CardTitle>
            </div>
            <CardDescription>Average time per optimization (seconds)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.processingTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                  name="Time (s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
