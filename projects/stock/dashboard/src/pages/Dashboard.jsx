import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import {
  Activity,
  TrendingUp,
  Shield,
  Zap,
  Database,
  RefreshCw,
  DollarSign,
  BarChart3,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatCard from '@/components/data-display/StatCard'
import ErrorState, { ErrorBanner } from '@/components/feedback/ErrorState'
import { SkeletonStatCard, SkeletonChart, SkeletonCard } from '@/components/ui/Skeleton'
import { formatCurrency, formatPercent } from '@/utils/formatters'

export default function Dashboard() {
  const [mode, setMode] = useState(null)
  const [health, setHealth] = useState({})
  const [strategies, setStrategies] = useState([])
  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // WebSocket for real-time updates
  const { isConnected, lastEvent, onMessage } = useWebSocket()

  // Handle real-time events
  useEffect(() => {
    if (!lastEvent) return

    const { type, data } = lastEvent

    // Handle different event types
    if (type === 'event_dispatched') {
      const eventType = data?.event_type

      if (eventType === 'signal_generated') {
        toast.info({
          title: 'New Signal',
          description: `${data.payload?.direction} signal for ${data.payload?.symbol}`,
        })
      } else if (eventType === 'fill_received') {
        // Add new trade to the list
        if (data.response) {
          setTrades(prev => [data.response, ...prev].slice(0, 20))
          toast.success({
            title: 'Trade Executed',
            description: `${data.response.side} ${data.response.quantity} ${data.response.symbol}`,
          })
        }
        // Refresh account data
        axios.get(API.exec.account(), { timeout: 5000 })
          .then(res => setAccount(res.data))
          .catch(() => {})
      } else if (eventType === 'kill_switch_activated' || eventType === 'kill_switch_deactivated') {
        // Refresh mode data
        axios.get(API.ops.mode(), { timeout: 5000 })
          .then(res => setMode(res.data))
          .catch(() => {})

        toast.warning({
          title: eventType === 'kill_switch_activated' ? 'Kill Switch Activated' : 'Kill Switch Deactivated',
          description: data.payload?.reason || 'Status changed',
        })
      }
    }
  }, [lastEvent])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [modeRes, opsHealth, dataHealth, signalHealth, riskHealth, execHealth, strategiesRes, accountRes, tradesRes] = await Promise.allSettled([
        axios.get(API.ops.mode(), { timeout: 5000 }),
        axios.get(API.ops.health(), { timeout: 5000 }),
        axios.get(API.data.health(), { timeout: 5000 }),
        axios.get(API.signal.health(), { timeout: 5000 }),
        axios.get(API.risk.health(), { timeout: 5000 }),
        axios.get(API.exec.health(), { timeout: 5000 }),
        axios.get(API.signal.strategies(), { timeout: 5000 }),
        axios.get(API.exec.account(), { timeout: 5000 }),
        axios.get(API.exec.trades(), { timeout: 5000 }),
      ])

      // Process results with fallbacks
      if (modeRes.status === 'fulfilled') {
        setMode(modeRes.value.data)
      }

      setHealth({
        ops: opsHealth.status === 'fulfilled' ? opsHealth.value.data : { status: 'offline' },
        data: dataHealth.status === 'fulfilled' ? dataHealth.value.data : { status: 'offline' },
        signal: signalHealth.status === 'fulfilled' ? signalHealth.value.data : { status: 'offline' },
        risk: riskHealth.status === 'fulfilled' ? riskHealth.value.data : { status: 'offline' },
        execution: execHealth.status === 'fulfilled' ? execHealth.value.data : { status: 'offline' },
      })

      if (strategiesRes.status === 'fulfilled') {
        setStrategies(strategiesRes.value.data || [])
      }

      if (accountRes.status === 'fulfilled') {
        setAccount(accountRes.value.data)
      }

      if (tradesRes.status === 'fulfilled') {
        setTrades(tradesRes.value.data || [])
      }

      // Check if any requests failed
      const failedRequests = [modeRes, opsHealth, dataHealth, signalHealth, riskHealth, execHealth, strategiesRes]
        .filter(r => r.status === 'rejected')

      if (failedRequests.length > 0) {
        setError(`${failedRequests.length} service(s) unavailable`)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
      toast.error({
        title: 'Connection Error',
        description: 'Unable to connect to trading services. Please check if services are running.',
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    // Reduce polling interval to 60s since we have WebSocket for real-time updates
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const switchMode = async (newMode) => {
    if (newMode === 'LIVE') {
      if (!confirm('WARNING: You are about to enable LIVE trading with REAL money. Continue?')) {
        return
      }
    }

    try {
      await axios.post(API.ops.modeSwitch(), {
        mode: newMode,
        reason: 'Manual switch from dashboard',
        confirmed: newMode === 'LIVE'
      })
      toast.success({ title: 'Mode Changed', description: `Switched to ${newMode} mode` })
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Failed to switch mode',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const toggleKillSwitch = async () => {
    if (!mode?.kill_switch_active) {
      if (!confirm('This will immediately halt ALL trading activities. Continue?')) {
        return
      }
    }

    try {
      if (mode?.kill_switch_active) {
        await axios.post(API.ops.killswitchDeactivate())
        toast.success({ title: 'Kill Switch Deactivated', description: 'Trading can resume' })
      } else {
        await axios.post(API.ops.killswitchActivate(), {
          reason: 'Manual activation from dashboard'
        })
        toast.warning({ title: 'Kill Switch Activated', description: 'All trading has been halted' })
      }
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Operation failed',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const getModeColor = (m) => {
    switch(m) {
      case 'BACKTEST': return 'bg-blue-500'
      case 'PAPER': return 'bg-yellow-500'
      case 'LIVE': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Use real account data
  const currentValue = account?.equity || 0
  const startValue = 100000 // Initial portfolio value
  const totalReturn = account ? ((currentValue - startValue) / startValue * 100).toFixed(2) : '0.00'
  const totalPnL = account ? (account.unrealized_pnl + account.realized_pnl) : 0

  if (loading && !mode) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Trading Dashboard</h1>
          </div>
        </div>

        {/* Stats Row skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>

        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonChart height="300px" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Trading Dashboard</h1>
          {/* WebSocket Connection Status */}
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-xs",
              isConnected
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            )}
            title={isConnected ? "Real-time updates active" : "Reconnecting..."}
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            <span>{isConnected ? "Live" : "Offline"}</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <ErrorBanner
          error={`${error}. Some data may be unavailable.`}
          onRetry={fetchData}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-6 w-6" />}
          label="Portfolio Value"
          value={formatCurrency(currentValue)}
          ariaLabel={`Portfolio Value: ${formatCurrency(currentValue)}`}
        />
        <StatCard
          icon={<BarChart3 className="h-6 w-6" />}
          label="Total Return"
          value={formatPercent(parseFloat(totalReturn))}
          variant={parseFloat(totalReturn) >= 0 ? 'positive' : 'negative'}
          ariaLabel={`Total Return: ${formatPercent(parseFloat(totalReturn))}`}
        />
        <StatCard
          icon={<Activity className="h-6 w-6" />}
          label="Active Strategies"
          value={strategies.length}
          ariaLabel={`Active Strategies: ${strategies.length}`}
        />
        <StatCard
          icon={<Shield className="h-6 w-6" />}
          label="Risk Status"
          value={mode?.kill_switch_active ? 'HALTED' : 'ACTIVE'}
          variant={mode?.kill_switch_active ? 'danger' : 'safe'}
          ariaLabel={`Risk Status: ${mode?.kill_switch_active ? 'Trading Halted' : 'Trading Active'}`}
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trades yet</p>
                <p className="text-sm">Execute signals to see trade history</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Time</th>
                    <th className="text-left py-2 font-medium">Symbol</th>
                    <th className="text-left py-2 font-medium">Side</th>
                    <th className="text-right py-2 font-medium">Qty</th>
                    <th className="text-right py-2 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 10).map((trade) => (
                    <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 font-medium">{trade.symbol}</td>
                      <td className={`py-2 ${trade.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.side}
                      </td>
                      <td className="py-2 text-right">{trade.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(trade.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Trading Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trading Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-8">
              <span className={cn(
                "text-3xl font-bold",
                mode?.mode === 'LIVE' && "text-red-500",
                mode?.mode === 'PAPER' && "text-yellow-500",
                mode?.mode === 'BACKTEST' && "text-blue-500",
              )}>
                {mode?.mode || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex gap-2">
              {['BACKTEST', 'PAPER', 'LIVE'].map(m => (
                <Button
                  key={m}
                  variant={mode?.mode === m ? 'default' : 'outline'}
                  className={cn(
                    "flex-1",
                    mode?.mode === m && getModeColor(m)
                  )}
                  onClick={() => switchMode(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Last changed: {mode?.last_mode_change ? new Date(mode.last_mode_change).toLocaleString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Kill Switch */}
        <Card className={cn(mode?.kill_switch_active && "border-red-500")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kill Switch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "rounded-lg p-4 text-center",
              mode?.kill_switch_active
                ? "bg-red-500/10 text-red-500"
                : "bg-green-500/10 text-green-500"
            )}>
              <span className="text-sm font-semibold">
                {mode?.kill_switch_active ? 'ACTIVE - TRADING HALTED' : 'INACTIVE - TRADING ENABLED'}
              </span>
            </div>
            <Button
              variant={mode?.kill_switch_active ? 'outline' : 'destructive'}
              className="w-full"
              onClick={toggleKillSwitch}
            >
              {mode?.kill_switch_active ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
            </Button>
            {mode?.kill_switch_reason && (
              <p className="text-sm text-muted-foreground">Reason: {mode.kill_switch_reason}</p>
            )}
          </CardContent>
        </Card>

        {/* Services Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Services Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(health).map(([name, data]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium capitalize">{name}</span>
                  <div className="flex items-center gap-2">
                    {data?.status === 'healthy' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">Healthy</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-500">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strategies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Trading Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strategies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Zap className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2">No strategies configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strategies.map(strategy => (
                  <div key={strategy.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{strategy.name}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {strategy.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{strategy.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
