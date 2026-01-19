import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API, API_CONFIG } from '@/config/api'
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import StatCard from '@/components/data-display/StatCard'
import { SkeletonCard, SkeletonStatCard, SkeletonChart } from '@/components/ui/Skeleton'
import { formatCurrency, formatPercent, formatDate, getValueVariant } from '@/utils/formatters'

// Color constants for charts
const COLORS = {
  primary: 'hsl(var(--primary))',
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
  drawdown: '#f97316',
  equity: '#3b82f6',
  benchmark: '#8b5cf6'
}

// Month names for heatmap
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Default initial portfolio value (can be configured via account data)
const DEFAULT_INITIAL_PORTFOLIO_VALUE = 100000

/**
 * Safely parse a date string, returning null for invalid dates
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
function safeParseDate(dateInput) {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput
  }
  const parsed = new Date(dateInput)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Get the initial portfolio value from account or use default
 * @param {Object} account - Account object from API
 * @returns {number} - Initial portfolio value
 */
function getInitialPortfolioValue(account) {
  // Try to get initial value from account data, otherwise use default
  return account?.initial_equity || account?.initialEquity || DEFAULT_INITIAL_PORTFOLIO_VALUE
}

/**
 * Calculate performance metrics from trades data
 */
function calculateMetrics(trades, account) {
  if (!trades || trades.length === 0) {
    return {
      totalReturn: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      avgWin: 0,
      avgLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0
    }
  }

  // Calculate P&L for each closed trade
  const closedTrades = trades.filter(t => t.pnl !== undefined && t.pnl !== null)
  const pnls = closedTrades.map(t => t.pnl || 0)

  const winningTrades = pnls.filter(pnl => pnl > 0)
  const losingTrades = pnls.filter(pnl => pnl < 0)

  const totalProfit = winningTrades.reduce((sum, pnl) => sum + pnl, 0)
  const totalLoss = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0))

  // Get initial portfolio value from account or use default
  const startValue = getInitialPortfolioValue(account)
  const currentValue = account?.equity || startValue
  const totalReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0

  // Calculate max drawdown from equity curve
  let peak = startValue
  let maxDrawdown = 0
  let runningValue = startValue

  closedTrades.forEach(trade => {
    runningValue += (trade.pnl || 0)
    if (runningValue > peak) {
      peak = runningValue
    }
    const drawdown = ((peak - runningValue) / peak) * 100
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  })

  // Win rate
  const winRate = closedTrades.length > 0
    ? (winningTrades.length / closedTrades.length) * 100
    : 0

  // Profit factor
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0

  // Average win/loss
  const avgWin = winningTrades.length > 0
    ? totalProfit / winningTrades.length
    : 0
  const avgLoss = losingTrades.length > 0
    ? totalLoss / losingTrades.length
    : 0

  // Sharpe ratio (simplified - using trade returns)
  let sharpeRatio = 0
  if (pnls.length > 1) {
    const avgReturn = pnls.reduce((sum, pnl) => sum + pnl, 0) / pnls.length
    const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - avgReturn, 2), 0) / pnls.length
    const stdDev = Math.sqrt(variance)
    sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0 // Annualized
  }

  return {
    totalReturn,
    maxDrawdown,
    winRate,
    profitFactor: profitFactor === Infinity ? 999 : profitFactor,
    sharpeRatio,
    avgWin,
    avgLoss,
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length
  }
}

/**
 * Build equity curve data from trades
 * @param {Array} trades - Array of trade objects
 * @param {number} startValue - Initial portfolio value
 * @returns {Array} - Equity curve data points
 */
function buildEquityCurve(trades, startValue = DEFAULT_INITIAL_PORTFOLIO_VALUE) {
  if (!trades || trades.length === 0) {
    return []
  }

  // Sort trades by timestamp using safe date parsing
  const sortedTrades = [...trades]
    .filter(t => t.timestamp && safeParseDate(t.timestamp))
    .sort((a, b) => {
      const dateA = safeParseDate(a.timestamp)
      const dateB = safeParseDate(b.timestamp)
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
    })

  let equity = startValue
  const curve = [{ date: 'Start', equity: startValue, drawdown: 0 }]
  let peak = startValue

  sortedTrades.forEach(trade => {
    equity += (trade.pnl || 0)
    if (equity > peak) peak = equity
    const drawdown = ((peak - equity) / peak) * 100

    curve.push({
      date: formatDate(trade.timestamp),
      equity: Math.round(equity * 100) / 100,
      drawdown: Math.round(drawdown * 100) / 100
    })
  })

  return curve
}

/**
 * Calculate monthly returns for heatmap
 * @param {Array} trades - Array of trade objects
 * @returns {Array} - Monthly returns data for heatmap
 */
function calculateMonthlyReturns(trades) {
  if (!trades || trades.length === 0) {
    return []
  }

  // Group trades by year and month
  const monthlyData = {}

  trades.forEach(trade => {
    if (!trade.timestamp) return

    // Use safe date parsing to handle invalid timestamps
    const date = safeParseDate(trade.timestamp)
    if (!date) return

    const year = date.getFullYear()
    const month = date.getMonth()
    const key = `${year}-${month}`

    if (!monthlyData[key]) {
      monthlyData[key] = { year, month, pnl: 0 }
    }
    monthlyData[key].pnl += (trade.pnl || 0)
  })

  // Convert to array format for heatmap
  const years = [...new Set(Object.values(monthlyData).map(d => d.year))].sort()

  return years.map(year => ({
    year,
    months: MONTHS.map((name, idx) => {
      const data = monthlyData[`${year}-${idx}`]
      return {
        month: name,
        return: data ? data.pnl : null,
        hasData: !!data
      }
    })
  }))
}

/**
 * Build P&L distribution histogram
 */
function buildPnLDistribution(trades, bins = 10) {
  if (!trades || trades.length === 0) {
    return []
  }

  const pnls = trades
    .filter(t => t.pnl !== undefined && t.pnl !== null)
    .map(t => t.pnl)

  if (pnls.length === 0) return []

  const min = Math.min(...pnls)
  const max = Math.max(...pnls)
  const range = max - min
  const binSize = range / bins

  const distribution = []
  for (let i = 0; i < bins; i++) {
    const binMin = min + (i * binSize)
    const binMax = min + ((i + 1) * binSize)
    const count = pnls.filter(pnl => pnl >= binMin && (i === bins - 1 ? pnl <= binMax : pnl < binMax)).length

    distribution.push({
      range: `${formatCurrency(binMin, { decimals: 0 })} - ${formatCurrency(binMax, { decimals: 0 })}`,
      count,
      isPositive: (binMin + binMax) / 2 >= 0
    })
  }

  return distribution
}

/**
 * Calculate strategy-level performance
 */
function calculateStrategyPerformance(trades) {
  if (!trades || trades.length === 0) {
    return []
  }

  const strategyData = {}

  trades.forEach(trade => {
    const strategy = trade.strategy_id || trade.strategy || 'unknown'

    if (!strategyData[strategy]) {
      strategyData[strategy] = {
        name: strategy,
        trades: 0,
        pnl: 0,
        wins: 0,
        losses: 0
      }
    }

    strategyData[strategy].trades += 1
    strategyData[strategy].pnl += (trade.pnl || 0)

    if ((trade.pnl || 0) > 0) {
      strategyData[strategy].wins += 1
    } else if ((trade.pnl || 0) < 0) {
      strategyData[strategy].losses += 1
    }
  })

  return Object.values(strategyData).map(s => ({
    ...s,
    winRate: s.trades > 0 ? (s.wins / s.trades) * 100 : 0
  }))
}

/**
 * Calculate daily P&L from trades
 * @param {Array} trades - Array of trade objects
 * @returns {Array} - Daily P&L data points
 */
function calculateDailyPnL(trades) {
  if (!trades || trades.length === 0) {
    return []
  }

  // Group trades by date
  const dailyData = {}

  trades.forEach(trade => {
    if (!trade.timestamp) return

    const date = safeParseDate(trade.timestamp)
    if (!date) return

    const dateKey = date.toISOString().split('T')[0]

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { date: dateKey, pnl: 0, trades: 0, wins: 0, losses: 0 }
    }

    dailyData[dateKey].pnl += (trade.pnl || 0)
    dailyData[dateKey].trades += 1
    if ((trade.pnl || 0) > 0) dailyData[dateKey].wins += 1
    else if ((trade.pnl || 0) < 0) dailyData[dateKey].losses += 1
  })

  // Sort by date and return last 30 days
  return Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
}

/**
 * Build strategy weight pie chart data from intelligence data
 * @param {Object} strategyIntelligence - Strategy intelligence data from Signal service
 * @returns {Array} - Pie chart data
 */
function buildStrategyWeightPieData(strategyIntelligence) {
  if (!strategyIntelligence || !strategyIntelligence.strategies) {
    return []
  }

  const PIE_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308', '#ec4899']

  return Object.entries(strategyIntelligence.strategies).map(([name, data], index) => ({
    name,
    value: (data.weight || 0) * 100,
    weight: data.weight || 0,
    fill: PIE_COLORS[index % PIE_COLORS.length]
  })).filter(d => d.value > 0)
}

/**
 * Custom tooltip for charts
 */
function CustomTooltip({ active, payload, label, valueFormatter = formatCurrency }) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg">
      <p className="font-medium text-sm mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  )
}

/**
 * Monthly Returns Heatmap Component
 */
function MonthlyReturnsHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No monthly data available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header row with month names */}
      <div className="grid grid-cols-13 gap-1 text-xs text-muted-foreground">
        <div className="font-medium">Year</div>
        {MONTHS.map(month => (
          <div key={month} className="text-center font-medium">{month}</div>
        ))}
      </div>

      {/* Data rows */}
      {data.map(yearData => (
        <div key={yearData.year} className="grid grid-cols-13 gap-1">
          <div className="text-sm font-medium flex items-center">{yearData.year}</div>
          {yearData.months.map((monthData, idx) => (
            <div
              key={idx}
              className={cn(
                "h-8 rounded flex items-center justify-center text-xs font-medium transition-colors",
                monthData.hasData
                  ? monthData.return >= 0
                    ? "bg-green-500/80 text-white"
                    : "bg-red-500/80 text-white"
                  : "bg-muted/30 text-muted-foreground"
              )}
              title={monthData.hasData ? `${monthData.month}: ${formatCurrency(monthData.return)}` : `${monthData.month}: No data`}
            >
              {monthData.hasData && (
                <span className="truncate px-1">
                  {monthData.return >= 0 ? '+' : ''}{formatCurrency(monthData.return, { compact: true, decimals: 0 }).replace('$', '')}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function PerformancePage() {
  const [trades, setTrades] = useState([])
  const [account, setAccount] = useState(null)
  const [strategyIntelligence, setStrategyIntelligence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      if (mounted) {
        setLoading(true)
        setError(null)
      }

      try {
        const [tradesRes, accountRes, intelligenceRes] = await Promise.allSettled([
          axios.get(API.exec.trades(), { timeout: 5000 }),
          axios.get(API.exec.account(), { timeout: 5000 }),
          axios.get(API.signal.intelligence.weights(), { timeout: 5000 })
        ])

        if (!mounted) return

        if (tradesRes.status === 'fulfilled') {
          setTrades(tradesRes.value.data || [])
        }

        if (accountRes.status === 'fulfilled') {
          setAccount(accountRes.value.data)
        }

        if (intelligenceRes.status === 'fulfilled') {
          setStrategyIntelligence(intelligenceRes.value.data)
        }

        // Check for failures (trades and account are critical, intelligence is optional)
        const criticalFailures = [tradesRes, accountRes].filter(r => r.status === 'rejected')
        if (criticalFailures.length > 0) {
          setError('Some data could not be loaded')
        }
      } catch (err) {
        if (!mounted) return
        setError(err.message || 'Failed to fetch performance data')
        toast.error({
          title: 'Connection Error',
          description: 'Unable to fetch performance data. Please check if services are running.'
        })
      }

      if (mounted) {
        setLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [refreshKey])

  // Manual refresh function
  const handleRefresh = () => setRefreshKey(k => k + 1)

  // Calculate all derived data
  const metrics = useMemo(() => calculateMetrics(trades, account), [trades, account])
  const equityCurve = useMemo(() => buildEquityCurve(trades), [trades])
  const monthlyReturns = useMemo(() => calculateMonthlyReturns(trades), [trades])
  const pnlDistribution = useMemo(() => buildPnLDistribution(trades), [trades])
  const strategyPerformance = useMemo(() => calculateStrategyPerformance(trades), [trades])
  const dailyPnL = useMemo(() => calculateDailyPnL(trades), [trades])
  const strategyWeightPieData = useMemo(() => buildStrategyWeightPieData(strategyIntelligence), [strategyIntelligence])

  // Loading state
  if (loading && trades.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LineChart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Performance</h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonChart height="300px" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonChart height="300px" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LineChart className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Performance</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh performance data"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="link"
              className="h-auto p-0 pl-1"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Total Return"
          value={formatPercent(metrics.totalReturn)}
          variant={getValueVariant(metrics.totalReturn)}
          ariaLabel={`Total Return: ${formatPercent(metrics.totalReturn)}`}
        />
        <StatCard
          icon={<TrendingDown className="h-6 w-6" />}
          label="Max Drawdown"
          value={formatPercent(-metrics.maxDrawdown)}
          variant="negative"
          ariaLabel={`Maximum Drawdown: ${formatPercent(metrics.maxDrawdown)}`}
        />
        <StatCard
          icon={<Target className="h-6 w-6" />}
          label="Win Rate"
          value={formatPercent(metrics.winRate)}
          variant={metrics.winRate >= 50 ? 'positive' : 'default'}
          ariaLabel={`Win Rate: ${formatPercent(metrics.winRate)}`}
        />
        <StatCard
          icon={<Award className="h-6 w-6" />}
          label="Profit Factor"
          value={metrics.profitFactor >= 999 ? '999+' : metrics.profitFactor.toFixed(2)}
          variant={metrics.profitFactor >= 1.5 ? 'positive' : metrics.profitFactor >= 1 ? 'default' : 'negative'}
          ariaLabel={`Profit Factor: ${metrics.profitFactor.toFixed(2)}`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="Sharpe Ratio"
          value={metrics.sharpeRatio.toFixed(2)}
          variant={metrics.sharpeRatio >= 1 ? 'positive' : metrics.sharpeRatio >= 0 ? 'default' : 'negative'}
          ariaLabel={`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`}
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Avg Win"
          value={formatCurrency(metrics.avgWin)}
          variant="positive"
          ariaLabel={`Average Win: ${formatCurrency(metrics.avgWin)}`}
        />
        <StatCard
          icon={<TrendingDown className="h-6 w-6" />}
          label="Avg Loss"
          value={formatCurrency(-metrics.avgLoss)}
          variant="negative"
          ariaLabel={`Average Loss: ${formatCurrency(metrics.avgLoss)}`}
        />
        <StatCard
          icon={<PieChartIcon className="h-6 w-6" />}
          label="Total Trades"
          value={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
          ariaLabel={`Total Trades: ${metrics.winningTrades} wins, ${metrics.losingTrades} losses`}
        />
      </div>

      {/* Charts Row 1: Equity Curve & Drawdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equity Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Equity Curve
            </CardTitle>
            <CardDescription>Portfolio value over time</CardDescription>
          </CardHeader>
          <CardContent>
            {equityCurve.length <= 1 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trade history available</p>
                  <p className="text-sm">Execute trades to see equity curve</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="Equity curve chart">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value, { compact: true })}
                      className="text-muted-foreground"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={100000} stroke={COLORS.neutral} strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke={COLORS.equity}
                      strokeWidth={2}
                      dot={false}
                      name="Equity"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Drawdown
            </CardTitle>
            <CardDescription>Percentage decline from peak</CardDescription>
          </CardHeader>
          <CardContent>
            {equityCurve.length <= 1 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No drawdown data available</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="Drawdown chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `-${value}%`}
                      className="text-muted-foreground"
                      reversed
                    />
                    <Tooltip
                      content={<CustomTooltip valueFormatter={(v) => `-${v.toFixed(2)}%`} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke={COLORS.drawdown}
                      fill={COLORS.drawdown}
                      fillOpacity={0.3}
                      name="Drawdown"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Returns Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Returns
          </CardTitle>
          <CardDescription>P&L by month - Green indicates profit, red indicates loss</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyReturnsHeatmap data={monthlyReturns} />
        </CardContent>
      </Card>

      {/* Charts Row 2: Daily P&L & Strategy Weight Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily P&L Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Daily P&L (Last 30 Days)
            </CardTitle>
            <CardDescription>Daily profit/loss breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyPnL.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No daily data available</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="Daily P&L bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPnL}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tickFormatter={(value) => value.slice(5)} // Show MM-DD only
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value, { compact: true })}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-medium text-sm mb-2">{label}</p>
                            <p className="text-sm">P&L: {formatCurrency(data.pnl)}</p>
                            <p className="text-sm">Trades: {data.trades}</p>
                            <p className="text-sm text-green-500">Wins: {data.wins}</p>
                            <p className="text-sm text-red-500">Losses: {data.losses}</p>
                          </div>
                        )
                      }}
                    />
                    <ReferenceLine y={0} stroke={COLORS.neutral} strokeDasharray="3 3" />
                    <Bar dataKey="pnl" name="P&L">
                      {dailyPnL.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pnl >= 0 ? COLORS.positive : COLORS.negative}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Weight Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Strategy Weight Distribution
            </CardTitle>
            <CardDescription>Allocation weights from AI intelligence</CardDescription>
          </CardHeader>
          <CardContent>
            {strategyWeightPieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No strategy weight data available</p>
                  <p className="text-sm">Weights are calculated by the Signal service</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="Strategy weight distribution pie chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyWeightPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                    >
                      {strategyWeightPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-medium text-sm mb-1">{data.name}</p>
                            <p className="text-sm">Weight: {(data.weight * 100).toFixed(1)}%</p>
                          </div>
                        )
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: P&L Distribution & Strategy Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* P&L Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Win/Loss Distribution
            </CardTitle>
            <CardDescription>Histogram of trade P&L</CardDescription>
          </CardHeader>
          <CardContent>
            {pnlDistribution.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trade data available</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="P&L distribution histogram">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-medium text-sm">{label}</p>
                            <p className="text-sm">Trades: {payload[0].value}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="count" name="Trades">
                      {pnlDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isPositive ? COLORS.positive : COLORS.negative}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strategy Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Strategy Comparison
            </CardTitle>
            <CardDescription>Performance by trading strategy</CardDescription>
          </CardHeader>
          <CardContent>
            {strategyPerformance.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No strategy data available</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px]" role="img" aria-label="Strategy comparison chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strategyPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value, { compact: true })}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      width={100}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg">
                            <p className="font-medium text-sm mb-2">{data.name}</p>
                            <p className="text-sm">P&L: {formatCurrency(data.pnl)}</p>
                            <p className="text-sm">Trades: {data.trades}</p>
                            <p className="text-sm">Win Rate: {formatPercent(data.winRate)}</p>
                          </div>
                        )
                      }}
                    />
                    <Legend />
                    <Bar dataKey="pnl" name="P&L">
                      {strategyPerformance.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pnl >= 0 ? COLORS.positive : COLORS.negative}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategy Performance Table */}
      {strategyPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strategy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Strategy</th>
                    <th className="text-right py-3 px-4 font-medium">Trades</th>
                    <th className="text-right py-3 px-4 font-medium">Wins</th>
                    <th className="text-right py-3 px-4 font-medium">Losses</th>
                    <th className="text-right py-3 px-4 font-medium">Win Rate</th>
                    <th className="text-right py-3 px-4 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyPerformance.map((strategy) => (
                    <tr key={strategy.name} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{strategy.name}</td>
                      <td className="py-3 px-4 text-right">{strategy.trades}</td>
                      <td className="py-3 px-4 text-right text-green-500">{strategy.wins}</td>
                      <td className="py-3 px-4 text-right text-red-500">{strategy.losses}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={strategy.winRate >= 50 ? 'text-green-500' : 'text-red-500'}>
                          {formatPercent(strategy.winRate)}
                        </span>
                      </td>
                      <td className={cn(
                        "py-3 px-4 text-right font-medium",
                        strategy.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {formatCurrency(strategy.pnl, { showSign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Strategy Intelligence Metrics */}
      {strategyIntelligence && strategyIntelligence.strategies && Object.keys(strategyIntelligence.strategies).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Strategy Metrics
            </CardTitle>
            <CardDescription>
              Signal service intelligence metrics with weighted performance scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Strategy</th>
                    <th className="text-right py-3 px-4 font-medium">Weight</th>
                    <th className="text-right py-3 px-4 font-medium">Sharpe</th>
                    <th className="text-right py-3 px-4 font-medium">Profit Factor</th>
                    <th className="text-right py-3 px-4 font-medium">Win Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Expectancy</th>
                    <th className="text-right py-3 px-4 font-medium">Max DD</th>
                    <th className="text-right py-3 px-4 font-medium">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(strategyIntelligence.strategies).map(([name, data]) => {
                    const metrics = data.metrics || {}
                    return (
                      <tr key={name} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{name}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(data.weight || 0) * 100}%` }}
                              />
                            </div>
                            <span className="w-12 text-right">{((data.weight || 0) * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            (metrics.sharpe_ratio || 0) >= 1 ? 'text-green-500' :
                            (metrics.sharpe_ratio || 0) >= 0 ? 'text-yellow-500' : 'text-red-500'
                          )}>
                            {(metrics.sharpe_ratio || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            (metrics.profit_factor || 0) >= 1.5 ? 'text-green-500' :
                            (metrics.profit_factor || 0) >= 1 ? 'text-yellow-500' : 'text-red-500'
                          )}>
                            {(metrics.profit_factor || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            (metrics.win_rate || 0) >= 0.5 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {formatPercent((metrics.win_rate || 0) * 100)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            (metrics.expectancy || 0) > 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {formatCurrency(metrics.expectancy || 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-red-500">
                            {formatPercent((metrics.max_drawdown || 0) * 100)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {metrics.total_signals || 0}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Strategy Intelligence Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Strategies</p>
                <p className="text-2xl font-bold">{Object.keys(strategyIntelligence.strategies).length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Sharpe</p>
                <p className="text-2xl font-bold">
                  {(Object.values(strategyIntelligence.strategies).reduce((sum, s) =>
                    sum + (s.metrics?.sharpe_ratio || 0), 0) /
                    Object.keys(strategyIntelligence.strategies).length).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Win Rate</p>
                <p className="text-2xl font-bold">
                  {formatPercent(Object.values(strategyIntelligence.strategies).reduce((sum, s) =>
                    sum + (s.metrics?.win_rate || 0), 0) /
                    Object.keys(strategyIntelligence.strategies).length * 100)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Signals</p>
                <p className="text-2xl font-bold">
                  {Object.values(strategyIntelligence.strategies).reduce((sum, s) =>
                    sum + (s.metrics?.total_signals || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
