import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  FileText,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmDialog from '../components/ConfirmDialog'

// Mock orders data
const mockOrders = [
  { id: 'ORD-001', symbol: 'AAPL', side: 'BUY', type: 'LIMIT', quantity: 10, price: 180.00, status: 'FILLED', filledQty: 10, filledPrice: 179.85, createdAt: '2024-01-15T10:30:00Z', filledAt: '2024-01-15T10:30:05Z' },
  { id: 'ORD-002', symbol: 'GOOGL', side: 'BUY', type: 'MARKET', quantity: 5, price: null, status: 'FILLED', filledQty: 5, filledPrice: 142.50, createdAt: '2024-01-15T11:00:00Z', filledAt: '2024-01-15T11:00:02Z' },
  { id: 'ORD-003', symbol: 'TSLA', side: 'SELL', type: 'LIMIT', quantity: 10, price: 250.00, status: 'PENDING', filledQty: 0, filledPrice: null, createdAt: '2024-01-15T14:00:00Z', filledAt: null },
  { id: 'ORD-004', symbol: 'MSFT', side: 'BUY', type: 'LIMIT', quantity: 15, price: 370.00, status: 'CANCELLED', filledQty: 0, filledPrice: null, createdAt: '2024-01-14T09:00:00Z', cancelledAt: '2024-01-14T16:00:00Z' },
  { id: 'ORD-005', symbol: 'NVDA', side: 'BUY', type: 'MARKET', quantity: 8, price: null, status: 'FILLED', filledQty: 8, filledPrice: 510.20, createdAt: '2024-01-14T10:15:00Z', filledAt: '2024-01-14T10:15:03Z' },
  { id: 'ORD-006', symbol: 'AMZN', side: 'SELL', type: 'STOP', quantity: 20, price: 150.00, status: 'PENDING', filledQty: 0, filledPrice: null, createdAt: '2024-01-15T15:30:00Z', filledAt: null },
  { id: 'ORD-007', symbol: 'META', side: 'BUY', type: 'LIMIT', quantity: 12, price: 480.00, status: 'REJECTED', filledQty: 0, filledPrice: null, createdAt: '2024-01-13T11:45:00Z', rejectedAt: '2024-01-13T11:45:01Z', rejectReason: 'Insufficient buying power' },
]

function StatCard({ icon: IconComponent, label, value, variant = 'default', active = false, onClick, className }) {
  const variantStyles = {
    default: '',
    positive: 'text-green-500',
    negative: 'text-red-500',
  }

  return (
    <Card
      className={cn(
        className,
        onClick && "cursor-pointer transition-colors hover:bg-muted/50",
        active && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
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

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(API.exec.orders(), { timeout: 5000 })
      if (res.data && res.data.length > 0) {
        setOrders(res.data)
      }
    } catch {
      console.log('Using mock order data')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const cancelOrder = (order) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Order?',
      message: `Are you sure you want to cancel order ${order.id} for ${order.quantity} shares of ${order.symbol}?`,
      confirmText: 'Cancel Order',
      cancelText: 'Keep Order',
      danger: true,
      onConfirm: async () => {
        try {
          await axios.delete(API.exec.orderById(order.id))
          toast.success({ title: 'Order Cancelled', description: `Order ${order.id} cancelled` })
          fetchOrders()
        } catch (err) {
          toast.error({
            title: 'Failed to cancel order',
            description: err.response?.data?.error || err.message
          })
        }
        setConfirmDialog({ isOpen: false })
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'FILLED': return <CheckCircle className="h-4 w-4" />
      case 'PENDING': return <Clock className="h-4 w-4" />
      case 'CANCELLED': return <XCircle className="h-4 w-4" />
      case 'REJECTED': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'FILLED': return 'filled'
      case 'PENDING': return 'pending'
      case 'CANCELLED': return 'cancelled'
      case 'REJECTED': return 'rejected'
      default: return 'secondary'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'ALL') return true
    return order.status === filter
  })

  const orderStats = {
    total: orders.length,
    filled: orders.filter(o => o.status === 'FILLED').length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    rejected: orders.filter(o => o.status === 'REJECTED').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Orders</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchOrders}
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
            <Button variant="link" className="h-auto p-0 pl-1" onClick={fetchOrders}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Total Orders"
          value={orderStats.total}
          onClick={() => setFilter('ALL')}
          active={filter === 'ALL'}
        />
        <StatCard
          icon={CheckCircle}
          label="Filled"
          value={orderStats.filled}
          variant="positive"
          onClick={() => setFilter('FILLED')}
          active={filter === 'FILLED'}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={orderStats.pending}
          onClick={() => setFilter('PENDING')}
          active={filter === 'PENDING'}
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={orderStats.cancelled}
          onClick={() => setFilter('CANCELLED')}
          active={filter === 'CANCELLED'}
        />
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Order History
          </CardTitle>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-40"
          >
            <option value="ALL">All Orders</option>
            <option value="FILLED">Filled</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50 mb-4" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">
                {filter !== 'ALL' ? `No ${filter.toLowerCase()} orders` : 'Place your first order'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Filled</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Fill Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell className="font-semibold">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={order.side === 'BUY' ? 'buy' : 'sell'}>
                        {order.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{order.type}</TableCell>
                    <TableCell className="text-right font-mono">{order.quantity}</TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {order.price ? `$${order.price.toFixed(2)}` : 'MKT'}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">{order.filledQty}</TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">
                      {order.filledPrice ? `$${order.filledPrice.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)} className="gap-1">
                        {getStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                      {new Date(order.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => cancelOrder(order)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
