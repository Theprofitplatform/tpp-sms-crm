import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export function ComparisonMode({ currentPeriod, previousPeriod, metric = 'value' }) {
  const currentValue = currentPeriod?.[metric] || 0
  const previousValue = previousPeriod?.[metric] || 0
  const change = currentValue - previousValue
  const percentChange = (() => {
    if (previousValue === 0) return 0
    const calc = (change / previousValue) * 100
    return isFinite(calc) ? Number(calc.toFixed(1)) : 0
  })()

  const getTrendIcon = () => {
    if (change > 0) return ArrowUp
    if (change < 0) return ArrowDown
    return Minus
  }

  const getTrendColor = () => {
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  const TrendIcon = getTrendIcon()
  const trendColor = getTrendColor()

  // Combine data for comparison chart
  const comparisonData = []
  const maxLength = Math.max(
    currentPeriod?.data?.length || 0,
    previousPeriod?.data?.length || 0
  )

  for (let i = 0; i < maxLength; i++) {
    comparisonData.push({
      index: i,
      current: currentPeriod?.data?.[i]?.[metric] || 0,
      previous: previousPeriod?.data?.[i]?.[metric] || 0,
      label: currentPeriod?.data?.[i]?.label || previousPeriod?.data?.[i]?.label || `Day ${i + 1}`
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Period Comparison</CardTitle>
            <CardDescription>
              {currentPeriod?.label || 'Current Period'} vs {previousPeriod?.label || 'Previous Period'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Switch Periods
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Current Period</p>
              <p className="text-2xl font-bold">{currentValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPeriod?.label || 'Latest'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Previous Period</p>
              <p className="text-2xl font-bold">{previousValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {previousPeriod?.label || 'Compare to'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Change</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${trendColor}`}>
                  {change > 0 ? '+' : ''}{change.toLocaleString()}
                </p>
                <Badge variant={change >= 0 ? 'success' : 'destructive'} className="flex items-center gap-1">
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(percentChange)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Period over period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Trend Comparison</h4>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span>Previous</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="current"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="Current Period"
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Previous Period"
                dot={{ fill: 'hsl(var(--muted-foreground))', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            Key Insights
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Performance {change >= 0 ? 'improved' : 'declined'} by {Math.abs(percentChange)}% 
              compared to previous period
            </li>
            <li>
              • {change >= 0 ? 'Positive' : 'Negative'} trend detected across {comparisonData.length} data points
            </li>
            <li>
              • {change >= 0 ? 'Continue' : 'Review'} current strategies 
              {change >= 0 ? ' for sustained growth' : ' and implement improvements'}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
