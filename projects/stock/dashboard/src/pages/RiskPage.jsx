import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Shield,
  AlertTriangle,
  Activity,
  RefreshCw,
  Power,
  Lock,
  Unlock,
  TrendingDown,
  PieChart,
  Gauge,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import {
  ResponsiveContainer,
  Tooltip,
  Cell,
  PieChart as RechartsPieChart,
  Pie
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import StatCard from '@/components/data-display/StatCard'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import ErrorState, { ErrorBanner } from '@/components/feedback/ErrorState'
import { SkeletonStatCard, SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton'
import { formatCurrency, formatPercent, formatDate } from '@/utils/formatters'
import ConfirmDialog from '@/components/ConfirmDialog'

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6', '#f97316']

export default function RiskPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [killSwitch, setKillSwitch] = useState({ active: false, reason: null, activated_at: null })
  const [arming, setArming] = useState({ armed: false, expires_at: null, code: null })
  const [riskMetrics, setRiskMetrics] = useState({
    var_1day: 0,
    var_5day: 0,
    daily_pnl: 0,
    weekly_pnl: 0,
    max_drawdown: 0,
    current_drawdown: 0,
    sharpe_ratio: 0,
    beta: 0
  })
  const [exposure, setExposure] = useState([])
  const [correlations, setCorrelations] = useState([])
  const [circuitBreakers, setCircuitBreakers] = useState([])
  const [limits, setLimits] = useState({
    max_daily_loss_pct: 2.0,
    max_position_size_pct: 10.0,
    max_orders_per_day: 20,
    max_drawdown_pct: 15.0
  })
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })
  const [armingCode, setArmingCode] = useState('')
  const [showArmingInput, setShowArmingInput] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [killSwitchRes, armingRes, riskRes, exposureRes, limitsRes, circuitRes] = await Promise.allSettled([
        axios.get(API.risk.killswitch.status(), { timeout: 5000 }),
        axios.get(API.ops.arming.status(), { timeout: 5000 }),
        axios.get(API.risk.portfolio.risk(), { timeout: 5000 }),
        axios.get(API.risk.portfolio.exposure(), { timeout: 5000 }),
        axios.get(API.risk.limits(), { timeout: 5000 }),
        axios.get(API.risk.portfolio.circuitBreakers(), { timeout: 5000 }),
      ])

      if (killSwitchRes.status === 'fulfilled') {
        setKillSwitch(killSwitchRes.value.data)
      }
      if (armingRes.status === 'fulfilled') {
        setArming(armingRes.value.data)
      }
      if (riskRes.status === 'fulfilled') {
        setRiskMetrics(riskRes.value.data)
      }
      if (exposureRes.status === 'fulfilled') {
        setExposure(exposureRes.value.data?.sectors || [])
        setCorrelations(exposureRes.value.data?.correlations || [])
      }
      if (limitsRes.status === 'fulfilled') {
        setLimits(limitsRes.value.data)
      }
      if (circuitRes.status === 'fulfilled') {
        setCircuitBreakers(circuitRes.value.data || [])
      }

      const failed = [killSwitchRes, armingRes, riskRes, exposureRes, limitsRes, circuitRes]
        .filter(r => r.status === 'rejected')
      if (failed.length > 0) {
        setError(`${failed.length} API call(s) failed`)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch risk data')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const toggleKillSwitch = () => {
    if (killSwitch.active) {
      setConfirmDialog({
        isOpen: true,
        title: 'Deactivate Kill Switch?',
        message: 'This will allow trading to resume. Make sure all issues have been resolved.',
        confirmText: 'Resume Trading',
        cancelText: 'Cancel',
        danger: false,
        onConfirm: async () => {
          try {
            await axios.post(API.risk.killswitch.reset(), {
              reason: 'Manual reset from Risk Dashboard'
            })
            toast.success({ title: 'Kill Switch Deactivated', description: 'Trading can resume' })
            fetchData()
          } catch (err) {
            toast.error({
              title: 'Failed to deactivate',
              description: err.response?.data?.error || err.message
            })
          }
          setConfirmDialog({ isOpen: false })
        },
        onCancel: () => setConfirmDialog({ isOpen: false })
      })
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Activate Kill Switch?',
        message: 'This will IMMEDIATELY halt ALL trading activities. Use only in emergencies.',
        confirmText: 'HALT TRADING',
        cancelText: 'Cancel',
        danger: true,
        onConfirm: async () => {
          try {
            await axios.post(API.risk.killswitch.trigger(), {
              reason: 'Manual activation from Risk Dashboard'
            })
            toast.warning({ title: 'Kill Switch Activated', description: 'All trading has been halted' })
            fetchData()
          } catch (err) {
            toast.error({
              title: 'Failed to activate',
              description: err.response?.data?.error || err.message
            })
          }
          setConfirmDialog({ isOpen: false })
        },
        onCancel: () => setConfirmDialog({ isOpen: false })
      })
    }
  }

  const requestArming = async () => {
    try {
      const res = await axios.post(API.ops.arming.request())
      setArming({ ...arming, code: res.data.code, expires_at: res.data.expires_at })
      setShowArmingInput(true)
      toast.info({
        title: 'Arming Code Generated',
        description: `Enter the code within 5 minutes to arm for LIVE mode`
      })
    } catch (err) {
      toast.error({
        title: 'Failed to request arming',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const confirmArming = async () => {
    try {
      await axios.post(API.ops.arming.confirm(), { code: armingCode })
      toast.success({ title: 'System Armed', description: 'LIVE mode is now available' })
      setShowArmingInput(false)
      setArmingCode('')
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Arming failed',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const disarmSystem = async () => {
    try {
      await axios.post(API.ops.arming.disarm())
      toast.success({ title: 'System Disarmed', description: 'LIVE mode is now disabled' })
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Disarm failed',
        description: err.response?.data?.error || err.message
      })
    }
  }

  // Calculate usage percentages for limits
  const dailyLossUsage = Math.min(100, Math.abs(riskMetrics.daily_pnl) / limits.max_daily_loss_pct * 100)
  const drawdownUsage = Math.min(100, riskMetrics.current_drawdown / limits.max_drawdown_pct * 100)

  // Prepare exposure data for pie chart
  const exposureData = exposure.length > 0 ? exposure : [
    { name: 'Technology', value: 35 },
    { name: 'Healthcare', value: 20 },
    { name: 'Finance', value: 15 },
    { name: 'Consumer', value: 12 },
    { name: 'Energy', value: 10 },
    { name: 'Other', value: 8 },
  ]

  if (loading && !killSwitch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Risk Management</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Risk Management</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh risk data"
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

      {/* Kill Switch Warning */}
      {killSwitch.active && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>TRADING HALTED</AlertTitle>
          <AlertDescription>
            Kill switch is active. Reason: {killSwitch.reason || 'No reason provided'}
            {killSwitch.activated_at && (
              <span className="ml-2 text-xs">
                (since {formatDate(killSwitch.activated_at, { time: true })})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingDown className="h-6 w-6" />}
          label="VaR (1-Day)"
          value={formatCurrency(riskMetrics.var_1day)}
          ariaLabel={`Value at Risk 1-Day: ${formatCurrency(riskMetrics.var_1day)}`}
        />
        <StatCard
          icon={<TrendingDown className="h-6 w-6" />}
          label="VaR (5-Day)"
          value={formatCurrency(riskMetrics.var_5day)}
          ariaLabel={`Value at Risk 5-Day: ${formatCurrency(riskMetrics.var_5day)}`}
        />
        <StatCard
          icon={<Gauge className="h-6 w-6" />}
          label="Current Drawdown"
          value={formatPercent(riskMetrics.current_drawdown)}
          variant={riskMetrics.current_drawdown > limits.max_drawdown_pct * 0.8 ? 'danger' : 'default'}
          ariaLabel={`Current Drawdown: ${formatPercent(riskMetrics.current_drawdown)}`}
        />
        <StatCard
          icon={<Activity className="h-6 w-6" />}
          label="Sharpe Ratio"
          value={riskMetrics.sharpe_ratio?.toFixed(2) || '-'}
          ariaLabel={`Sharpe Ratio: ${riskMetrics.sharpe_ratio?.toFixed(2) || 'N/A'}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Kill Switch Control */}
        <Card className={cn(killSwitch.active && "border-red-500")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              Kill Switch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "rounded-lg p-6 text-center",
              killSwitch.active
                ? "bg-red-500/10 border-2 border-red-500"
                : "bg-green-500/10 border-2 border-green-500"
            )}>
              <div className="flex items-center justify-center gap-3 mb-2">
                {killSwitch.active ? (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                )}
                <span className={cn(
                  "text-2xl font-bold",
                  killSwitch.active ? "text-red-500" : "text-green-500"
                )}>
                  {killSwitch.active ? 'HALTED' : 'ACTIVE'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {killSwitch.active ? 'All trading operations are suspended' : 'Trading operations are enabled'}
              </p>
            </div>
            <Button
              variant={killSwitch.active ? 'outline' : 'destructive'}
              className="w-full"
              onClick={toggleKillSwitch}
            >
              {killSwitch.active ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Resume Trading
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Halt All Trading
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* LIVE Mode Arming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              LIVE Mode Arming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              "rounded-lg p-6 text-center",
              arming.armed
                ? "bg-yellow-500/10 border-2 border-yellow-500"
                : "bg-gray-500/10 border-2 border-gray-500"
            )}>
              <div className="flex items-center justify-center gap-3 mb-2">
                {arming.armed ? (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                ) : (
                  <Lock className="h-8 w-8 text-gray-500" />
                )}
                <span className={cn(
                  "text-2xl font-bold",
                  arming.armed ? "text-yellow-500" : "text-gray-500"
                )}>
                  {arming.armed ? 'ARMED' : 'DISARMED'}
                </span>
              </div>
              {arming.armed && arming.expires_at && (
                <p className="text-sm text-muted-foreground">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Expires: {formatDate(arming.expires_at, { time: true })}
                </p>
              )}
            </div>

            {showArmingInput ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the arming code to enable LIVE trading:
                </p>
                <input
                  type="text"
                  value={armingCode}
                  onChange={(e) => setArmingCode(e.target.value)}
                  placeholder="Enter arming code"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={confirmArming}>
                    Confirm Arming
                  </Button>
                  <Button variant="outline" onClick={() => setShowArmingInput(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {arming.armed ? (
                  <Button variant="outline" className="w-full" onClick={disarmSystem}>
                    <Lock className="mr-2 h-4 w-4" />
                    Disarm System
                  </Button>
                ) : (
                  <Button variant="default" className="w-full" onClick={requestArming}>
                    <Unlock className="mr-2 h-4 w-4" />
                    Request Arming Code
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Risk Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Loss Limit</span>
                <span className={cn(
                  dailyLossUsage > 80 && "text-red-500 font-semibold"
                )}>
                  {formatPercent(Math.abs(riskMetrics.daily_pnl))} / {formatPercent(limits.max_daily_loss_pct)}
                </span>
              </div>
              <Progress
                value={dailyLossUsage}
                className={cn(dailyLossUsage > 80 && "bg-red-200")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Max Drawdown</span>
                <span className={cn(
                  drawdownUsage > 80 && "text-red-500 font-semibold"
                )}>
                  {formatPercent(riskMetrics.current_drawdown)} / {formatPercent(limits.max_drawdown_pct)}
                </span>
              </div>
              <Progress
                value={drawdownUsage}
                className={cn(drawdownUsage > 80 && "bg-red-200")}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Max Position Size</p>
                <p className="font-semibold">{formatPercent(limits.max_position_size_pct)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Orders/Day</p>
                <p className="font-semibold">{limits.max_orders_per_day}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sector Exposure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Sector Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]" role="img" aria-label="Sector exposure pie chart">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={exposureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {exposureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`${value}%`, 'Allocation']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Circuit Breakers */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Circuit Breakers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {circuitBreakers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="mx-auto h-12 w-12 mb-3 text-green-500" />
                <p>All circuit breakers are inactive</p>
                <p className="text-sm">System is operating normally</p>
              </div>
            ) : (
              <div className="space-y-3">
                {circuitBreakers.map((breaker, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      breaker.triggered && "border-red-500 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {breaker.triggered ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{breaker.name}</p>
                        <p className="text-sm text-muted-foreground">{breaker.description}</p>
                      </div>
                    </div>
                    <StatusBadge
                      status={breaker.triggered ? 'halted' : 'active'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
