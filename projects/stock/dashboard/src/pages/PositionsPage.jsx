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
  AlertTriangle
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
import ConfirmDialog from '../components/ConfirmDialog'

// Mock positions data
const mockPositions = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, avgPrice: 178.50, currentPrice: 185.20, side: 'LONG' },
  { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 20, avgPrice: 140.00, currentPrice: 142.50, side: 'LONG' },
  { id: 3, symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgPrice: 378.00, currentPrice: 385.60, side: 'LONG' },
  { id: 4, symbol: 'TSLA', name: 'Tesla Inc.', quantity: 15, avgPrice: 245.00, currentPrice: 238.40, side: 'LONG' },
  { id: 5, symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: 25, avgPrice: 485.00, currentPrice: 512.30, side: 'LONG' },
]

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6']

function StatCard({ icon: IconComponent, label, value, variant = 'default', className }) {
  const variantStyles = {
    default: '',
    positive: 'text-green-500',
    negative: 'text-red-500',
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-lg bg-primary/10 p-3">
          <IconComponent className="h-6 w-6 text-primary" />
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

export default function PositionsPage() {
  const [positions, setPositions] = useState(mockPositions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(API.exec.positions(), { timeout: 5000 })
      if (res.data && res.data.length > 0) {
        setPositions(res.data)
      }
    } catch {
      // Use mock data if API fails - not a critical error for display
      console.log('Using mock position data')
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
        <Button
          variant="outline"
          onClick={fetchPositions}
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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" className="h-auto p-0 pl-1" onClick={fetchPositions}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          icon={Percent}
          label="Total P&L"
          value={`$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          variant={totalPnL >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          icon={Briefcase}
          label="Open Positions"
          value={positions.length}
        />
        <StatCard
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          label="Return %"
          value={`${((totalPnL / totalCost) * 100).toFixed(2)}%`}
          variant={totalPnL >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Positions Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 opacity-50 mb-4" />
                <p className="text-lg font-medium">No open positions</p>
                <p className="text-sm">Execute a signal to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="hidden md:table-cell">Name</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Avg Price</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Current</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(pos => {
                    const pnl = calculatePnL(pos)
                    const pnlPercent = calculatePnLPercent(pos)
                    return (
                      <TableRow key={pos.id}>
                        <TableCell className="font-semibold">{pos.symbol}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">{pos.name}</TableCell>
                        <TableCell className="text-right font-mono">{pos.quantity}</TableCell>
                        <TableCell className="text-right font-mono hidden sm:table-cell">${pos.avgPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono hidden sm:table-cell">${pos.currentPrice.toFixed(2)}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          <span className="flex items-center justify-end gap-1">
                            {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            ${Math.abs(pnl).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {pnlPercent}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => closePosition(pos)}
                            title="Close Position"
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

        {/* Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
