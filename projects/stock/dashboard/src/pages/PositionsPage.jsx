import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  DollarSign,
  Percent,
  AlertTriangle,
  LayoutGrid,
  List,
  Target,
  Shield
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import ConfirmDialog from '../components/ConfirmDialog'
import { StatCard } from '@/components/data-display/StatCard'
import { DataTable } from '@/components/data-display/DataTable'
import { PriceDisplay, PercentDisplay } from '@/components/data-display/PriceDisplay'
import { EmptyState, EmptyPositions } from '@/components/feedback/EmptyState'
import { SkeletonCard, SkeletonStatCard, SkeletonTable, SkeletonChart } from '@/components/ui/Skeleton'
import { formatCurrency, formatPercent, getValueVariant } from '@/utils/formatters'
import { PositionCard } from '@/components/trading/PositionCard'

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6']

// Transform API response to normalized position format
function normalizePosition(pos) {
  return {
    id: pos.id,
    symbol: pos.symbol,
    name: pos.name || pos.symbol,
    market: pos.market || 'US',
    side: pos.side || 'LONG',
    quantity: pos.quantity,
    // Handle both camelCase and snake_case field names
    avgPrice: pos.avgPrice || pos.average_entry_price || 0,
    average_entry_price: pos.average_entry_price || pos.avgPrice || 0,
    currentPrice: pos.currentPrice || pos.current_price || 0,
    current_price: pos.current_price || pos.currentPrice || 0,
    stop_loss: pos.stop_loss || pos.stopLoss || null,
    take_profit: pos.take_profit || pos.takeProfit || null,
    unrealized_pnl: pos.unrealized_pnl || pos.unrealizedPnl || null,
  }
}

export default function PositionsPage() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(API.exec.positions(), { timeout: 5000 })
      const normalizedPositions = (res.data || []).map(normalizePosition)
      setPositions(normalizedPositions)
    } catch (err) {
      console.error('Error fetching positions:', err.message)
      setError('Failed to fetch positions')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  const closePosition = (position) => {
    setConfirmDialog({
      isOpen: true,
      title: `Close ${position.symbol} Position?`,
      message: `Are you sure you want to close your ${position.quantity} share position in ${position.symbol}?`,
      confirmText: 'Close Position',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: async () => {
        try {
          await axios.post(API.exec.orders(), {
            symbol: position.symbol,
            side: 'SELL',
            quantity: position.quantity,
            type: 'MARKET',
            reason: 'Manual close from dashboard'
          })
          toast.success({ title: 'Position Closed', description: `Closed ${position.symbol} position` })
          fetchPositions()
        } catch (err) {
          toast.error({
            title: 'Failed to close position',
            description: err.response?.data?.error || err.message
          })
        }
        setConfirmDialog({ isOpen: false })
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    })
  }

  const calculatePnL = (pos) => {
    const marketValue = pos.quantity * pos.currentPrice
    const costBasis = pos.quantity * pos.avgPrice
    return marketValue - costBasis
  }

  const calculatePnLPercent = (pos) => {
    return ((pos.currentPrice - pos.avgPrice) / pos.avgPrice * 100).toFixed(2)
  }

  const totalValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0)
  const totalPnL = positions.reduce((sum, pos) => sum + calculatePnL(pos), 0)
  const totalCost = positions.reduce((sum, pos) => sum + (pos.quantity * pos.avgPrice), 0)

  const pieData = positions.map(pos => ({
    name: pos.symbol,
    value: pos.quantity * pos.currentPrice
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Positions</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={fetchPositions}
            disabled={loading}
            aria-label="Refresh positions data"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="link"
              className="h-auto p-0 pl-1"
              onClick={fetchPositions}
              aria-label="Retry fetching positions"
            >
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
              icon={<DollarSign className="h-6 w-6" />}
              label="Total Value"
              value={formatCurrency(totalValue)}
              ariaLabel={`Total portfolio value: ${formatCurrency(totalValue)}`}
            />
            <StatCard
              icon={<Percent className="h-6 w-6" />}
              label="Total P&L"
              value={formatCurrency(totalPnL, { showSign: true })}
              variant={getValueVariant(totalPnL)}
              ariaLabel={`Total profit and loss: ${formatCurrency(totalPnL, { showSign: true })}`}
            />
            <StatCard
              icon={<Briefcase className="h-6 w-6" />}
              label="Open Positions"
              value={positions.length}
              ariaLabel={`Open positions count: ${positions.length}`}
            />
            <StatCard
              icon={totalPnL >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              label="Return %"
              value={formatPercent(totalCost > 0 ? (totalPnL / totalCost) * 100 : 0)}
              variant={getValueVariant(totalPnL)}
              ariaLabel={`Return percentage: ${formatPercent(totalCost > 0 ? (totalPnL / totalCost) * 100 : 0)}`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Positions Display - Table or Cards */}
        <div className="lg:col-span-2">
          {viewMode === 'cards' ? (
            // Card View
            <>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : positions.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <EmptyPositions />
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {positions.map(pos => (
                    <PositionCard
                      key={pos.id || pos.symbol}
                      position={pos}
                      onClose={closePosition}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            // Table View
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Open Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SkeletonTable rows={5} columns={8} />
                ) : positions.length === 0 ? (
                  <EmptyPositions />
                ) : (
                  <Table aria-label="Open positions table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Entry</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Current</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead className="text-right hidden md:table-cell">SL</TableHead>
                        <TableHead className="text-right hidden md:table-cell">TP</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map(pos => {
                        const pnl = calculatePnL(pos)
                        const pnlPercent = parseFloat(calculatePnLPercent(pos))
                        return (
                          <TableRow key={pos.id || pos.symbol}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{pos.symbol}</span>
                                <span className={cn(
                                  "text-xs px-1.5 py-0.5 rounded",
                                  pos.side === 'LONG' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  {pos.side}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{pos.quantity}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              <PriceDisplay value={pos.avgPrice} />
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              <PriceDisplay value={pos.currentPrice} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <PriceDisplay value={pnl} showTrend showSign />
                                <span className={cn(
                                  "text-xs",
                                  pnlPercent >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell">
                              {pos.stop_loss ? (
                                <div className="flex items-center justify-end gap-1 text-red-500">
                                  <Shield className="h-3 w-3" />
                                  <PriceDisplay value={pos.stop_loss} />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right hidden md:table-cell">
                              {pos.take_profit ? (
                                <div className="flex items-center justify-end gap-1 text-green-500">
                                  <Target className="h-3 w-3" />
                                  <PriceDisplay value={pos.take_profit} />
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => closePosition(pos)}
                                aria-label={`Close ${pos.symbol} position`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonChart height="300px" />
            ) : (
              <div className="h-[300px]" role="img" aria-label="Portfolio allocation pie chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [formatCurrency(value), 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
