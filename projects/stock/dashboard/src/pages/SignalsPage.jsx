import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost'
  : `http://${window.location.hostname}`

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
  const [filter, setFilter] = useState('ALL')

  const fetchSignals = async () => {
    setLoading(true)
    try {
      const [signalsRes, strategiesRes] = await Promise.all([
        axios.get(`${API_BASE}:5102/api/v1/signals`),
        axios.get(`${API_BASE}:5102/api/v1/strategies`)
      ])
      if (signalsRes.data && signalsRes.data.length > 0) {
        setSignals(signalsRes.data)
      }
      setStrategies(strategiesRes.data || [])
    } catch {
      console.log('Using mock signal data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const executeSignal = async (signal) => {
    try {
      await axios.post(`${API_BASE}:5104/api/v1/orders`, {
        symbol: signal.symbol,
        side: signal.direction,
        quantity: 10, // Default quantity
        type: 'LIMIT',
        price: signal.price,
        signal_id: signal.id,
        reason: `Signal execution: ${signal.reason}`
      })
      toast.success(`Order placed for ${signal.symbol}`)
      fetchSignals()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute signal')
    }
  }

  const rejectSignal = async (signal) => {
    try {
      await axios.post(`${API_BASE}:5102/api/v1/signals/${signal.id}/reject`, {
        reason: 'Manual rejection from dashboard'
      })
      toast.info(`Signal ${signal.id} rejected`)
      fetchSignals()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject signal')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EXECUTED': return <CheckCircle size={16} className="status-icon executed" />
      case 'PENDING': return <Clock size={16} className="status-icon pending" />
      case 'REJECTED': return <XCircle size={16} className="status-icon rejected" />
      case 'EXPIRED': return <Clock size={16} className="status-icon expired" />
      default: return <Clock size={16} className="status-icon" />
    }
  }

  const getStrengthColor = (strength) => {
    if (strength >= 0.8) return '#10b981'
    if (strength >= 0.6) return '#f59e0b'
    return '#ef4444'
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
    <div className="signals-page">
      <div className="page-header">
        <h1><Zap size={28} /> Trading Signals</h1>
        <button onClick={fetchSignals} className="refresh-btn">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className={`stat-card clickable ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          <Zap size={24} />
          <div className="stat-content">
            <span className="stat-label">Total Signals</span>
            <span className="stat-value">{signalStats.total}</span>
          </div>
        </div>
        <div className={`stat-card clickable ${filter === 'PENDING' ? 'active' : ''}`} onClick={() => setFilter('PENDING')}>
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{signalStats.pending}</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={24} />
          <div className="stat-content">
            <span className="stat-label">Buy Signals</span>
            <span className="stat-value positive">{signalStats.buySignals}</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingDown size={24} />
          <div className="stat-content">
            <span className="stat-label">Sell Signals</span>
            <span className="stat-value negative">{signalStats.sellSignals}</span>
          </div>
        </div>
      </div>

      {/* Active Strategies */}
      <div className="card strategies-overview">
        <h2>Active Strategies</h2>
        <div className="strategies-chips">
          {strategies.length > 0 ? strategies.map(s => (
            <span key={s.id} className="strategy-chip">{s.name}</span>
          )) : (
            <>
              <span className="strategy-chip">Momentum</span>
              <span className="strategy-chip">Mean Reversion</span>
              <span className="strategy-chip">Breakout</span>
            </>
          )}
        </div>
      </div>

      {/* Signals Table */}
      <div className="card signals-table-card">
        <div className="card-header">
          <h2>Signal Queue</h2>
          <div className="filter-group">
            <Filter size={16} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All Signals</option>
              <option value="PENDING">Pending</option>
              <option value="EXECUTED">Executed</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
        <div className="signals-list">
          {filteredSignals.map(signal => (
            <div key={signal.id} className={`signal-card ${signal.status.toLowerCase()}`}>
              <div className="signal-header">
                <div className="signal-symbol">
                  <span className={`direction ${signal.direction.toLowerCase()}`}>
                    {signal.direction === 'BUY' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </span>
                  <span className="symbol">{signal.symbol}</span>
                  <span className="strategy-badge">{signal.strategy}</span>
                </div>
                <div className="signal-status">
                  {getStatusIcon(signal.status)}
                  <span>{signal.status}</span>
                </div>
              </div>

              <div className="signal-body">
                <div className="signal-prices">
                  <div className="price-item">
                    <span className="label">Entry</span>
                    <span className="value">${signal.price.toFixed(2)}</span>
                  </div>
                  <ArrowRight size={16} className="arrow" />
                  <div className="price-item">
                    <span className="label">Target</span>
                    <span className="value positive">${signal.target.toFixed(2)}</span>
                  </div>
                  <div className="price-item stop">
                    <span className="label">Stop Loss</span>
                    <span className="value negative">${signal.stopLoss.toFixed(2)}</span>
                  </div>
                </div>

                <div className="signal-strength">
                  <span className="label">Confidence</span>
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${signal.strength * 100}%`,
                        backgroundColor: getStrengthColor(signal.strength)
                      }}
                    />
                  </div>
                  <span className="strength-value">{(signal.strength * 100).toFixed(0)}%</span>
                </div>

                <p className="signal-reason">{signal.reason}</p>
              </div>

              {signal.status === 'PENDING' && (
                <div className="signal-actions">
                  <button className="execute-btn" onClick={() => executeSignal(signal)}>
                    <CheckCircle size={16} /> Execute
                  </button>
                  <button className="reject-btn" onClick={() => rejectSignal(signal)}>
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}

              <div className="signal-footer">
                <span className="time">Generated: {new Date(signal.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
