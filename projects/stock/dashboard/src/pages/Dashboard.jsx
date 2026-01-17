import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Database,
  RefreshCw,
  DollarSign,
  BarChart3,
  CheckCircle,
  XCircle
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Mock performance data for chart
const generatePerformanceData = () => {
  const data = []
  let value = 100000
  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    value = value * (1 + (Math.random() - 0.48) * 0.02)
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value),
      benchmark: 100000 * (1 + (30 - i) * 0.001)
    })
  }
  return data
}

function StatCard({ icon: Icon, label, value, variant = 'default', className }) {
  const variantStyles = {
    default: '',
    positive: 'text-green-500',
    negative: 'text-red-500',
    danger: 'text-red-500',
    safe: 'text-green-500',
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold font-mono", variantStyles[variant])}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [mode, setMode] = useState(null)
  const [health, setHealth] = useState({})
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [performanceData] = useState(generatePerformanceData)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [modeRes, opsHealth, dataHealth, signalHealth, riskHealth, execHealth, strategiesRes] = await Promise.allSettled([
        axios.get(API.ops.mode(), { timeout: 5000 }),
        axios.get(API.ops.health(), { timeout: 5000 }),
        axios.get(API.data.health(), { timeout: 5000 }),
        axios.get(API.signal.health(), { timeout: 5000 }),
        axios.get(API.risk.health(), { timeout: 5000 }),
        axios.get(API.exec.health(), { timeout: 5000 }),
        axios.get(API.signal.strategies(), { timeout: 5000 }),
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
    const interval = setInterval(fetchData, 30000)
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

  const currentValue = performanceData[performanceData.length - 1]?.value || 0
  const startValue = performanceData[0]?.value || 100000
  const totalReturn = ((currentValue - startValue) / startValue * 100).toFixed(2)

  if (loading && !mode) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Trading System...</p>
        </div>
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
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Network Error</AlertTitle>
          <AlertDescription>
            {error}. Some data may be unavailable.
            <Button variant="link" className="h-auto p-0 pl-1" onClick={fetchData}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Portfolio Value"
          value={`$${currentValue.toLocaleString()}`}
        />
        <StatCard
          icon={BarChart3}
          label="Total Return"
          value={`${totalReturn}%`}
          variant={parseFloat(totalReturn) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          icon={Activity}
          label="Active Strategies"
          value={strategies.length}
        />
        <StatCard
          icon={Shield}
          label="Risk Status"
          value={mode?.kill_switch_active ? 'HALTED' : 'ACTIVE'}
          variant={mode?.kill_switch_active ? 'danger' : 'safe'}
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
