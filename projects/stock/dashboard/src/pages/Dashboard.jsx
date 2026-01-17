import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Database,
  RefreshCw,
  DollarSign,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import ConfirmDialog from '../components/ConfirmDialog'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost'
  : `http://${window.location.hostname}`

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

export default function Dashboard() {
  const [mode, setMode] = useState(null)
  const [health, setHealth] = useState({})
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })
  const [performanceData] = useState(generatePerformanceData)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [modeRes, opsHealth, dataHealth, signalHealth, riskHealth, execHealth, strategiesRes] = await Promise.all([
        axios.get(`${API_BASE}:5100/api/v1/mode`),
        axios.get(`${API_BASE}:5100/health`),
        axios.get(`${API_BASE}:5101/health`),
        axios.get(`${API_BASE}:5102/health`),
        axios.get(`${API_BASE}:5103/health`),
        axios.get(`${API_BASE}:5104/health`),
        axios.get(`${API_BASE}:5102/api/v1/strategies`),
      ])

      setMode(modeRes.data)
      setHealth({
        ops: opsHealth.data,
        data: dataHealth.data,
        signal: signalHealth.data,
        risk: riskHealth.data,
        execution: execHealth.data,
      })
      setStrategies(strategiesRes.data)
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch data: ' + err.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const switchMode = async (newMode) => {
    if (newMode === 'LIVE') {
      setConfirmDialog({
        isOpen: true,
        title: 'Enable LIVE Trading?',
        message: 'WARNING: You are about to enable LIVE trading with REAL money. This action should only be taken after thorough testing in PAPER mode.',
        confirmText: 'Enable LIVE',
        cancelText: 'Cancel',
        danger: true,
        onConfirm: async () => {
          try {
            await axios.post(`${API_BASE}:5100/api/v1/mode/switch`, {
              mode: newMode,
              reason: 'Manual switch from dashboard',
              confirmed: true
            })
            toast.success(`Switched to ${newMode} mode`)
            fetchData()
          } catch (err) {
            toast.error(err.response?.data?.error || err.message)
          }
          setConfirmDialog({ isOpen: false })
        },
        onCancel: () => setConfirmDialog({ isOpen: false })
      })
      return
    }

    try {
      await axios.post(`${API_BASE}:5100/api/v1/mode/switch`, {
        mode: newMode,
        reason: 'Manual switch from dashboard'
      })
      toast.success(`Switched to ${newMode} mode`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
    }
  }

  const toggleKillSwitch = async () => {
    if (!mode?.kill_switch_active) {
      setConfirmDialog({
        isOpen: true,
        title: 'Activate Kill Switch?',
        message: 'This will immediately halt ALL trading activities. Use this in emergencies only.',
        confirmText: 'ACTIVATE',
        cancelText: 'Cancel',
        danger: true,
        onConfirm: async () => {
          try {
            await axios.post(`${API_BASE}:5100/api/v1/mode/killswitch/activate`, {
              reason: 'Manual activation from dashboard'
            })
            toast.warning('Kill switch ACTIVATED - Trading halted')
            fetchData()
          } catch (err) {
            toast.error(err.response?.data?.error || err.message)
          }
          setConfirmDialog({ isOpen: false })
        },
        onCancel: () => setConfirmDialog({ isOpen: false })
      })
      return
    }

    try {
      await axios.post(`${API_BASE}:5100/api/v1/mode/killswitch/deactivate`)
      toast.success('Kill switch deactivated - Trading can resume')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || err.message)
    }
  }

  const getModeColor = (m) => {
    switch(m) {
      case 'BACKTEST': return '#3b82f6'
      case 'PAPER': return '#f59e0b'
      case 'LIVE': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const currentValue = performanceData[performanceData.length - 1]?.value || 0
  const startValue = performanceData[0]?.value || 100000
  const totalReturn = ((currentValue - startValue) / startValue * 100).toFixed(2)

  if (loading && !mode) {
    return (
      <div className="loading-container">
        <RefreshCw className="spin" size={48} />
        <p>Loading Trading System...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1><TrendingUp size={28} /> Trading Dashboard</h1>
        <button onClick={fetchData} className="refresh-btn">
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <DollarSign size={24} />
          <div className="stat-content">
            <span className="stat-label">Portfolio Value</span>
            <span className="stat-value">${currentValue.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card">
          <BarChart3 size={24} />
          <div className="stat-content">
            <span className="stat-label">Total Return</span>
            <span className={`stat-value ${parseFloat(totalReturn) >= 0 ? 'positive' : 'negative'}`}>
              {totalReturn}%
            </span>
          </div>
        </div>
        <div className="stat-card">
          <Activity size={24} />
          <div className="stat-content">
            <span className="stat-label">Active Strategies</span>
            <span className="stat-value">{strategies.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <Shield size={24} />
          <div className="stat-content">
            <span className="stat-label">Risk Status</span>
            <span className={`stat-value ${mode?.kill_switch_active ? 'danger' : 'safe'}`}>
              {mode?.kill_switch_active ? 'HALTED' : 'ACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="card chart-card">
        <h2><BarChart3 size={20} /> Portfolio Performance</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#666"
                strokeDasharray="5 5"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Trading Mode Card */}
        <div className="card mode-card">
          <h2><Activity size={20} /> Trading Mode</h2>
          <div className="mode-display" style={{ borderColor: getModeColor(mode?.mode) }}>
            <span className="mode-label" style={{ color: getModeColor(mode?.mode) }}>
              {mode?.mode || 'UNKNOWN'}
            </span>
          </div>
          <div className="mode-buttons">
            {['BACKTEST', 'PAPER', 'LIVE'].map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={mode?.mode === m ? 'active' : ''}
                style={{ '--btn-color': getModeColor(m) }}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mode-info">
            Last changed: {mode?.last_mode_change ? new Date(mode.last_mode_change).toLocaleString() : 'N/A'}
          </p>
        </div>

        {/* Kill Switch Card */}
        <div className={`card kill-switch-card ${mode?.kill_switch_active ? 'active' : ''}`}>
          <h2><Shield size={20} /> Kill Switch</h2>
          <div className="kill-switch-status">
            <span className={`status-indicator ${mode?.kill_switch_active ? 'danger' : 'safe'}`}>
              {mode?.kill_switch_active ? 'ACTIVE - TRADING HALTED' : 'INACTIVE - TRADING ENABLED'}
            </span>
          </div>
          <button
            onClick={toggleKillSwitch}
            className={`kill-switch-btn ${mode?.kill_switch_active ? 'deactivate' : 'activate'}`}
          >
            {mode?.kill_switch_active ? 'Deactivate Kill Switch' : 'Activate Kill Switch'}
          </button>
          {mode?.kill_switch_reason && (
            <p className="kill-reason">Reason: {mode.kill_switch_reason}</p>
          )}
        </div>

        {/* Services Health Card */}
        <div className="card services-card">
          <h2><Database size={20} /> Services Health</h2>
          <div className="services-grid">
            {Object.entries(health).map(([name, data]) => (
              <div key={name} className={`service-item ${data?.status === 'healthy' ? 'healthy' : 'unhealthy'}`}>
                <span className="service-name">{name}</span>
                <span className="service-status">{data?.status || 'unknown'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategies Card */}
        <div className="card strategies-card">
          <h2><Zap size={20} /> Trading Strategies</h2>
          <div className="strategies-list">
            {strategies.map(strategy => (
              <div key={strategy.id} className="strategy-item">
                <div className="strategy-header">
                  <h3>{strategy.name}</h3>
                  <span className="strategy-type">{strategy.type}</span>
                </div>
                <p className="strategy-desc">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmDialog} />
    </div>
  )
}
