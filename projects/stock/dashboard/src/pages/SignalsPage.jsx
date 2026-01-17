import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

// Reusable components
import StatCard from '@/components/data-display/StatCard'
import StatusBadge from '@/components/data-display/StatusBadge'
import PriceDisplay from '@/components/data-display/PriceDisplay'
import EmptyState, { EmptySignals } from '@/components/feedback/EmptyState'
import Skeleton, { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton'

// Mock signals data
const mockSignals = [
  { id: 'SIG-001', symbol: 'AAPL', strategy: 'Momentum', direction: 'BUY', strength: 0.85, price: 184.50, target: 195.00, stopLoss: 178.00, status: 'PENDING', reason: 'RSI oversold bounce + MACD bullish crossover', createdAt: '2024-01-15T14:30:00Z' },
  { id: 'SIG-002', symbol: 'GOOGL', strategy: 'Mean Reversion', direction: 'BUY', strength: 0.72, price: 141.80, target: 148.00, stopLoss: 138.00, status: 'EXECUTED', reason: 'Price below 20-day Bollinger Band lower', createdAt: '2024-01-15T13:45:00Z', executedAt: '2024-01-15T13:46:00Z' },
  { id: 'SIG-003', symbol: 'TSLA', strategy: 'Momentum', direction: 'SELL', strength: 0.68, price: 242.00, target: 225.00, stopLoss: 252.00, status: 'PENDING', reason: 'Bearish divergence on RSI, resistance rejection', createdAt: '2024-01-15T12:00:00Z' },
  { id: 'SIG-004', symbol: 'NVDA', strategy: 'Breakout', direction: 'BUY', strength: 0.91, price: 508.00, target: 550.00, stopLoss: 490.00, status: 'EXECUTED', reason: 'Breaking above consolidation with volume', createdAt: '2024-01-15T10:15:00Z', executedAt: '2024-01-15T10:16:00Z' },
  { id: 'SIG-005', symbol: 'MSFT', strategy: 'Mean Reversion', direction: 'SELL', strength: 0.65, price: 388.00, target: 375.00, stopLoss: 395.00, status: 'REJECTED', reason: 'Overbought RSI + resistance level', createdAt: '2024-01-15T09:30:00Z', rejectedReason: 'Risk limit exceeded' },
  { id: 'SIG-006', symbol: 'META', strategy: 'Momentum', direction: 'BUY', strength: 0.78, price: 475.00, target: 510.00, stopLoss: 460.00, status: 'EXPIRED', reason: 'Strong uptrend continuation pattern', createdAt: '2024-01-14T15:00:00Z', expiredAt: '2024-01-15T09:30:00Z' },
]

export default function SignalsPage() {
  const [signals, setSignals] = useState(mockSignals)
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [executingSignal, setExecutingSignal] = useState(null)
  const [rejectingSignal, setRejectingSignal] = useState(null)
  const [generatingSignals, setGeneratingSignals] = useState(false)

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [signalsRes, strategiesRes] = await Promise.allSettled([
        axios.get(API.signal.signals(), { timeout: 5000 }),
        axios.get(API.signal.strategies(), { timeout: 5000 })
      ])

      if (signalsRes.status === 'fulfilled' && signalsRes.value.data?.length > 0) {
        // Map API response to UI format
        const mappedSignals = signalsRes.value.data.map(s => ({
          id: s.id,
          symbol: s.symbol,
          strategy: s.strategy_id === 'momentum' ? 'Momentum' :
                   s.strategy_id === 'mean_reversion' ? 'Mean Reversion' : s.strategy_id,
          direction: s.signal_type, // API uses signal_type, UI uses direction
          strength: s.strength,
          price: s.entry_price,
          target: s.target_price,
          stopLoss: s.stop_loss,
          status: s.status,
          reason: s.reasoning,
          createdAt: s.time,
          indicators: s.indicators,
        }))
        setSignals(mappedSignals)
      } else if (signalsRes.status === 'fulfilled' && signalsRes.value.data?.length === 0) {
        // API returned empty, keep mock data for demo
        console.log('No signals from API, using mock data')
      }
      if (strategiesRes.status === 'fulfilled') {
        setStrategies(strategiesRes.value.data || [])
      }
    } catch (err) {
      console.log('Error fetching signals, using mock data:', err.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [fetchSignals])

  const executeSignal = async (signal) => {
    setExecutingSignal(signal.id)
    try {
      await axios.post(API.exec.orders(), {
        symbol: signal.symbol,
        side: signal.direction,
        quantity: 10, // Default quantity
        type: 'LIMIT',
        price: signal.price,
        signal_id: signal.id,
        reason: `Signal execution: ${signal.reason}`
      }, { timeout: 10000 })
      toast.success({ title: 'Order Placed', description: `Order placed for ${signal.symbol}` })
      fetchSignals()
    } catch (err) {
      console.error('Execute signal error:', err)
      toast.error({
        title: 'Failed to execute signal',
        description: err.response?.data?.error || err.message || 'Network error'
      })
    } finally {
      setExecutingSignal(null)
    }
  }

  const rejectSignal = async (signal) => {
    setRejectingSignal(signal.id)
    try {
      await axios.post(API.signal.rejectSignal(signal.id), {
        reason: 'Manual rejection from dashboard'
      }, { timeout: 10000 })
      toast.success({ title: 'Signal Rejected', description: `Signal ${signal.id} rejected` })
      fetchSignals()
    } catch (err) {
      console.error('Reject signal error:', err)
      toast.error({
        title: 'Failed to reject signal',
        description: err.response?.data?.error || err.message || 'Network error'
      })
    } finally {
      setRejectingSignal(null)
    }
  }

  const generateSignals = async (strategyId = 'momentum') => {
    setGeneratingSignals(true)
    try {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'META', 'AMZN', 'AMD', 'NFLX']
      const res = await axios.post(API.signal.generateSignals(), {
        symbols,
        market: 'US',
        strategy_id: strategyId,
        lookback_days: 100
      }, { timeout: 30000 })

      if (res.data.signals_generated > 0) {
        toast.success({
          title: 'Signals Generated',
          description: `${res.data.signals_generated} new signals from ${strategyId} strategy`
        })
      } else {
        toast.info({
          title: 'No Signals',
          description: 'Market conditions don\'t meet strategy criteria (all HOLD)'
        })
      }
      fetchSignals()
    } catch (err) {
      console.error('Generate signals error:', err)
      toast.error({
        title: 'Failed to generate signals',
        description: err.response?.data?.detail || err.message || 'Network error'
      })
    } finally {
      setGeneratingSignals(false)
    }
  }

  const generateDemoSignals = async () => {
    setGeneratingSignals(true)
    try {
      const res = await axios.post(API.signal.generateDemo(), {}, { timeout: 10000 })
      toast.success({
        title: 'Demo Signals Created',
        description: `${res.data.signals_created} demo signals generated`
      })
      fetchSignals()
    } catch (err) {
      console.error('Generate demo signals error:', err)
      toast.error({
        title: 'Failed to generate demo signals',
        description: err.response?.data?.detail || err.message || 'Network error'
      })
    } finally {
      setGeneratingSignals(false)
    }
  }

  const getStrengthColor = (strength) => {
    if (strength >= 0.8) return 'bg-green-500'
    if (strength >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const filteredSignals = signals.filter(signal => {
    if (filter === 'ALL') return true
    return signal.status === filter
  })

  const signalStats = {
    total: signals.length,
    pending: signals.filter(s => s.status === 'PENDING').length,
    executed: signals.filter(s => s.status === 'EXECUTED').length,
    buySignals: signals.filter(s => s.direction === 'BUY').length,
    sellSignals: signals.filter(s => s.direction === 'SELL').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Trading Signals</h1>
        </div>
        <div className="flex items-center gap-2" role="toolbar" aria-label="Signal generation controls">
          <Button
            variant="outline"
            onClick={() => generateSignals('momentum')}
            disabled={generatingSignals || loading}
            aria-label="Generate trading signals using momentum strategy"
          >
            {generatingSignals ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Generate (Momentum)
          </Button>
          <Button
            variant="outline"
            onClick={() => generateSignals('mean_reversion')}
            disabled={generatingSignals || loading}
            aria-label="Generate trading signals using mean reversion strategy"
          >
            {generatingSignals ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Generate (Mean Rev)
          </Button>
          <Button
            variant="secondary"
            onClick={generateDemoSignals}
            disabled={generatingSignals || loading}
            aria-label="Generate demo signals for testing"
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Demo Signals
          </Button>
          <Button
            variant="outline"
            onClick={fetchSignals}
            disabled={loading}
            aria-label="Refresh signals list"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" className="h-auto p-0 pl-1" onClick={fetchSignals}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              icon={<Zap className="h-6 w-6" />}
              label="Total Signals"
              value={signalStats.total}
              clickable
              onClick={() => setFilter('ALL')}
              active={filter === 'ALL'}
              ariaLabel={`Total Signals: ${signalStats.total}. Click to show all signals`}
            />
            <StatCard
              icon={<Clock className="h-6 w-6" />}
              label="Pending"
              value={signalStats.pending}
              clickable
              onClick={() => setFilter('PENDING')}
              active={filter === 'PENDING'}
              ariaLabel={`Pending Signals: ${signalStats.pending}. Click to filter pending`}
            />
            <StatCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Buy Signals"
              value={signalStats.buySignals}
              variant="positive"
              ariaLabel={`Buy Signals: ${signalStats.buySignals}`}
            />
            <StatCard
              icon={<TrendingDown className="h-6 w-6" />}
              label="Sell Signals"
              value={signalStats.sellSignals}
              variant="negative"
              ariaLabel={`Sell Signals: ${signalStats.sellSignals}`}
            />
          </>
        )}
      </div>

      {/* Active Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Active Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {strategies.length > 0 ? strategies.map(s => (
              <Badge key={s.id} variant="secondary" className="text-sm">
                {s.name}
              </Badge>
            )) : (
              <>
                <Badge variant="secondary" className="text-sm">Momentum</Badge>
                <Badge variant="secondary" className="text-sm">Mean Reversion</Badge>
                <Badge variant="secondary" className="text-sm">Breakout</Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signals List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Signal Queue
          </CardTitle>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-40"
            aria-label="Filter signals by status"
          >
            <option value="ALL">All Signals</option>
            <option value="PENDING">Pending</option>
            <option value="EXECUTED">Executed</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <SkeletonCard contentRows={4} />
              <SkeletonCard contentRows={4} />
              <SkeletonCard contentRows={4} />
            </div>
          ) : filteredSignals.length === 0 ? (
            <EmptySignals />
          ) : (
            <div className="space-y-4">
              {filteredSignals.map(signal => (
                <div
                  key={signal.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    signal.status === 'PENDING' && "border-yellow-500/50 bg-yellow-500/5",
                    signal.status === 'EXECUTED' && "border-green-500/50 bg-green-500/5",
                    signal.status === 'REJECTED' && "border-red-500/50 bg-red-500/5",
                    signal.status === 'EXPIRED' && "border-muted"
                  )}
                >
                  {/* Signal Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "rounded-lg p-2",
                        signal.direction === 'BUY' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {signal.direction === 'BUY' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">{signal.symbol}</span>
                          <StatusBadge
                            status={signal.direction.toLowerCase()}
                            size="sm"
                            showIcon={false}
                          />
                          <Badge variant="secondary">{signal.strategy}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{signal.id}</span>
                      </div>
                    </div>
                    <StatusBadge status={signal.status.toLowerCase()} />
                  </div>

                  {/* Price Targets */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Entry</span>
                      <PriceDisplay value={signal.price} size="md" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Target</span>
                      <PriceDisplay value={signal.target} size="md" className="price-positive" />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-muted-foreground">Stop Loss</span>
                      <PriceDisplay value={signal.stopLoss} size="md" className="price-negative" />
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <span className="text-sm font-mono font-semibold">{(signal.strength * 100).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={signal.strength * 100}
                      indicatorClassName={getStrengthColor(signal.strength)}
                    />
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-muted-foreground mb-4">{signal.reason}</p>

                  {/* Actions */}
                  {signal.status === 'PENDING' && (
                    <div className="flex gap-2" role="group" aria-label={`Actions for ${signal.symbol} ${signal.direction} signal`}>
                      <Button
                        variant="success"
                        size="sm"
                        className="flex-1"
                        onClick={() => executeSignal(signal)}
                        loading={executingSignal === signal.id}
                        disabled={executingSignal !== null || rejectingSignal !== null}
                        aria-label={`Execute ${signal.direction} order for ${signal.symbol} at $${signal.price.toFixed(2)}`}
                      >
                        {executingSignal !== signal.id && <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                        {executingSignal === signal.id ? 'Executing...' : 'Execute'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => rejectSignal(signal)}
                        loading={rejectingSignal === signal.id}
                        disabled={executingSignal !== null || rejectingSignal !== null}
                        aria-label={`Reject ${signal.direction} signal for ${signal.symbol}`}
                      >
                        {rejectingSignal !== signal.id && <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                        {rejectingSignal === signal.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Generated: {new Date(signal.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
