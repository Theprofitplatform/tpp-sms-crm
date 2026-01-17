import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  FileText,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost'
  : `http://${window.location.hostname}`

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

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}:5104/api/v1/orders`)
      if (res.data && res.data.length > 0) {
        setOrders(res.data)
      }
    } catch {
      console.log('Using mock order data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

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
          await axios.delete(`${API_BASE}:5104/api/v1/orders/${order.id}`)
          toast.success(`Order ${order.id} cancelled`)
          fetchOrders()
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to cancel order')
        }
        setConfirmDialog({ isOpen: false })
      },
      onCancel: () => setConfirmDialog({ isOpen: false })
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'FILLED': return <CheckCircle size={16} className="status-icon filled" />
      case 'PENDING': return <Clock size={16} className="status-icon pending" />
      case 'CANCELLED': return <XCircle size={16} className="status-icon cancelled" />
      case 'REJECTED': return <AlertCircle size={16} className="status-icon rejected" />
      default: return <Clock size={16} className="status-icon" />
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
    <div className="orders-page">
      <div className="page-header">
        <h1><FileText size={28} /> Orders</h1>
        <button onClick={fetchOrders} className="refresh-btn">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className={`stat-card clickable ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          <FileText size={24} />
          <div className="stat-content">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{orderStats.total}</span>
          </div>
        </div>
        <div className={`stat-card clickable ${filter === 'FILLED' ? 'active' : ''}`} onClick={() => setFilter('FILLED')}>
          <CheckCircle size={24} />
          <div className="stat-content">
            <span className="stat-label">Filled</span>
            <span className="stat-value positive">{orderStats.filled}</span>
          </div>
        </div>
        <div className={`stat-card clickable ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{orderStats.pending}</span>
          </div>
        </div>
        <div className={`stat-card clickable ${filter === 'CANCELLED' ? 'active' : ''}`} onClick={() => setFilter('CANCELLED')}>
          <XCircle size={24} />
          <div className="stat-content">
            <span className="stat-label">Cancelled</span>
            <span className="stat-value">{orderStats.cancelled}</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card orders-table-card">
        <div className="card-header">
          <h2>Order History</h2>
          <div className="filter-group">
            <Filter size={16} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All Orders</option>
              <option value="FILLED">Filled</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Filled</th>
                <th>Fill Price</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">{order.id}</td>
                  <td className="symbol">{order.symbol}</td>
                  <td className={`side ${order.side.toLowerCase()}`}>{order.side}</td>
                  <td>{order.type}</td>
                  <td>{order.quantity}</td>
                  <td>{order.price ? `$${order.price.toFixed(2)}` : 'MKT'}</td>
                  <td>{order.filledQty}</td>
                  <td>{order.filledPrice ? `$${order.filledPrice.toFixed(2)}` : '-'}</td>
                  <td className={`status ${order.status.toLowerCase()}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </td>
                  <td className="time">{new Date(order.createdAt).toLocaleString()}</td>
                  <td>
                    {order.status === 'PENDING' && (
                      <button className="cancel-btn" onClick={() => cancelOrder(order)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
