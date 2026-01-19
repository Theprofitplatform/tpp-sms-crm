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
  AlertTriangle,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmDialog from '@/components/ConfirmDialog'

// Reusable components
import StatCard from '@/components/data-display/StatCard'
import StatusBadge from '@/components/data-display/StatusBadge'
import PriceDisplay from '@/components/data-display/PriceDisplay'
import EmptyState from '@/components/feedback/EmptyState'
import { SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderForm, setOrderForm] = useState({
    symbol: '',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 10,
    price: ''
  })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(API.exec.orders(), { timeout: 5000 })
      setOrders(res.data || [])
    } catch (err) {
      console.error('Error fetching orders:', err.message)
      setError('Failed to fetch orders')
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

  const placeOrder = async () => {
    if (!orderForm.symbol.trim()) {
      toast.error({ title: 'Validation Error', description: 'Symbol is required' })
      return
    }
    if (orderForm.quantity <= 0) {
      toast.error({ title: 'Validation Error', description: 'Quantity must be greater than 0' })
      return
    }
    if (orderForm.type === 'LIMIT' && (!orderForm.price || parseFloat(orderForm.price) <= 0)) {
      toast.error({ title: 'Validation Error', description: 'Price is required for limit orders' })
      return
    }

    setPlacingOrder(true)
    try {
      await axios.post(API.exec.orders(), {
        symbol: orderForm.symbol.toUpperCase(),
        side: orderForm.side,
        type: orderForm.type,
        quantity: parseInt(orderForm.quantity),
        price: orderForm.type === 'LIMIT' ? parseFloat(orderForm.price) : null,
        reason: 'Manual order from dashboard'
      }, { timeout: 10000 })

      toast.success({
        title: 'Order Placed',
        description: `${orderForm.side} order for ${orderForm.quantity} ${orderForm.symbol.toUpperCase()} placed`
      })
      setOrderDialogOpen(false)
      setOrderForm({ symbol: '', side: 'BUY', type: 'LIMIT', quantity: 10, price: '' })
      fetchOrders()
    } catch (err) {
      toast.error({
        title: 'Failed to place order',
        description: err.response?.data?.error || err.message
      })
    } finally {
      setPlacingOrder(false)
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

  // Loading state with skeletons
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Orders</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <SkeletonTable rows={5} columns={8} />
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
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOrderDialogOpen(true)}
            aria-label="Place a new order"
          >
            <Plus className="mr-2 h-4 w-4" />
            Place Order
          </Button>
          <Button
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
            aria-label="Refresh orders list"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
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
            <Button variant="link" className="h-auto p-0 pl-1" onClick={fetchOrders}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-6 w-6" />}
          label="Total Orders"
          value={orderStats.total}
          clickable
          onClick={() => setFilter('ALL')}
          active={filter === 'ALL'}
          ariaLabel={`Filter by all orders, ${orderStats.total} total`}
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6" />}
          label="Filled"
          value={orderStats.filled}
          variant="positive"
          clickable
          onClick={() => setFilter('FILLED')}
          active={filter === 'FILLED'}
          ariaLabel={`Filter by filled orders, ${orderStats.filled} total`}
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          label="Pending"
          value={orderStats.pending}
          clickable
          onClick={() => setFilter('PENDING')}
          active={filter === 'PENDING'}
          ariaLabel={`Filter by pending orders, ${orderStats.pending} total`}
        />
        <StatCard
          icon={<XCircle className="h-6 w-6" />}
          label="Cancelled"
          value={orderStats.cancelled}
          clickable
          onClick={() => setFilter('CANCELLED')}
          active={filter === 'CANCELLED'}
          ariaLabel={`Filter by cancelled orders, ${orderStats.cancelled} total`}
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
            aria-label="Filter orders by status"
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
            <EmptyState
              title="No orders found"
              description={filter !== 'ALL' ? `No ${filter.toLowerCase()} orders` : 'Place your first order to get started'}
              icon={FileText}
              action={filter === 'ALL' ? {
                label: 'Place Order',
                onClick: () => setOrderDialogOpen(true)
              } : undefined}
            />
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
                      <StatusBadge status={order.side.toLowerCase()} size="sm" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{order.type}</TableCell>
                    <TableCell className="text-right font-mono">{order.quantity}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {order.price ? (
                        <PriceDisplay value={order.price} />
                      ) : (
                        <span className="text-muted-foreground">MKT</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden lg:table-cell">{order.filledQty}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {order.filledPrice ? (
                        <PriceDisplay value={order.filledPrice} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status.toLowerCase()} size="sm" />
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
                          aria-label={`Cancel order ${order.id} for ${order.quantity} shares of ${order.symbol}`}
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

      {/* Place Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                value={orderForm.symbol}
                onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="side">Side</Label>
                <Select
                  id="side"
                  value={orderForm.side}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, side: e.target.value }))}
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  id="type"
                  value={orderForm.type}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP">Stop</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price {orderForm.type !== 'MARKET' && <span className="text-destructive">*</span>}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder={orderForm.type === 'MARKET' ? 'Market' : '0.00'}
                  disabled={orderForm.type === 'MARKET'}
                  value={orderForm.price}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrderDialogOpen(false)}
              aria-label="Cancel and close dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={placeOrder}
              disabled={placingOrder}
              aria-label={placingOrder ? 'Placing order, please wait' : `Place ${orderForm.side} order for ${orderForm.quantity} ${orderForm.symbol || 'shares'}`}
            >
              {placingOrder ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Placing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Place Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
