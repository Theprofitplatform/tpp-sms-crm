import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  X,
  DollarSign,
  Percent
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts'
import ConfirmDialog from '../components/ConfirmDialog'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost'
  : `http://${window.location.hostname}`

// Mock positions data
const mockPositions = [
  { id: 1, symbol: 'AAPL', name: 'Apple Inc.', quantity: 50, avgPrice: 178.50, currentPrice: 185.20, side: 'LONG' },
  { id: 2, symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 20, avgPrice: 140.00, currentPrice: 142.50, side: 'LONG' },
  { id: 3, symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 30, avgPrice: 378.00, currentPrice: 385.60, side: 'LONG' },
  { id: 4, symbol: 'TSLA', name: 'Tesla Inc.', quantity: 15, avgPrice: 245.00, currentPrice: 238.40, side: 'LONG' },
  { id: 5, symbol: 'NVDA', name: 'NVIDIA Corp.', quantity: 25, avgPrice: 485.00, currentPrice: 512.30, side: 'LONG' },
]

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function PositionsPage() {
  const [positions, setPositions] = useState(mockPositions)
  const [loading, setLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}:5104/api/v1/positions`)
      if (res.data && res.data.length > 0) {
        setPositions(res.data)
      }
    } catch {
      // Use mock data if API fails
      console.log('Using mock position data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPositions()
  }, [])

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
          await axios.post(`${API_BASE}:5104/api/v1/orders`, {
            symbol: position.symbol,
            side: 'SELL',
            quantity: position.quantity,
            type: 'MARKET',
            reason: 'Manual close from dashboard'
          })
          toast.success(`Closed ${position.symbol} position`)
          fetchPositions()
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to close position')
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
    <div className="positions-page">
      <div className="page-header">
        <h1><Briefcase size={28} /> Positions</h1>
        <button onClick={fetchPositions} className="refresh-btn">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <DollarSign size={24} />
          <div className="stat-content">
            <span className="stat-label">Total Value</span>
            <span className="stat-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="stat-card">
          <Percent size={24} />
          <div className="stat-content">
            <span className="stat-label">Total P&L</span>
            <span className={`stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
              ${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <Briefcase size={24} />
          <div className="stat-content">
            <span className="stat-label">Open Positions</span>
            <span className="stat-value">{positions.length}</span>
          </div>
        </div>
        <div className="stat-card">
          {totalPnL >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          <div className="stat-content">
            <span className="stat-label">Return %</span>
            <span className={`stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {((totalPnL / totalCost) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="positions-layout">
        {/* Positions Table */}
        <div className="card positions-table-card">
          <h2>Open Positions</h2>
          <div className="table-container">
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Avg Price</th>
                  <th>Current</th>
                  <th>Market Value</th>
                  <th>P&L</th>
                  <th>P&L %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const pnl = calculatePnL(pos)
                  const pnlPercent = calculatePnLPercent(pos)
                  return (
                    <tr key={pos.id}>
                      <td className="symbol">{pos.symbol}</td>
                      <td className="name">{pos.name}</td>
                      <td>{pos.quantity}</td>
                      <td>${pos.avgPrice.toFixed(2)}</td>
                      <td>${pos.currentPrice.toFixed(2)}</td>
                      <td>${(pos.quantity * pos.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={pnl >= 0 ? 'positive' : 'negative'}>
                        {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        ${Math.abs(pnl).toFixed(2)}
                      </td>
                      <td className={pnl >= 0 ? 'positive' : 'negative'}>
                        {pnlPercent}%
                      </td>
                      <td>
                        <button className="close-btn" onClick={() => closePosition(pos)} title="Close Position">
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="card allocation-card">
          <h2>Portfolio Allocation</h2>
          <div className="pie-container">
            <ResponsiveContainer width="100%" height={300}>
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
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
