import { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Database,
  Sliders,
  AlertTriangle
} from 'lucide-react'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost'
  : `http://${window.location.hostname}`

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    // Risk Settings
    maxDailyLossPct: 2.0,
    maxWeeklyLossPct: 5.0,
    maxPositionSizePct: 10.0,
    maxDrawdownPct: 15.0,
    maxOrdersPerDay: 20,

    // Trading Settings
    defaultOrderType: 'LIMIT',
    slippageTolerance: 0.1,
    enableAfterHours: false,

    // Notification Settings
    emailNotifications: true,
    discordNotifications: false,
    notifyOnTrade: true,
    notifyOnSignal: true,
    notifyOnRiskAlert: true,

    // System Settings
    autoRefreshInterval: 30,
    darkMode: true,
  })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}:5100/api/v1/settings`)
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }))
      }
    } catch {
      console.log('Using default settings')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await axios.post(`${API_BASE}:5100/api/v1/settings`, settings)
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings')
    }
    setSaving(false)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="page-header">
          <h1><Settings size={28} /> Settings</h1>
        </div>
        <div className="loading-state">
          <RefreshCw size={24} className="spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1><Settings size={28} /> Settings</h1>
        <button onClick={saveSettings} className="save-btn" disabled={saving}>
          {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-grid">
        {/* Risk Management */}
        <div className="card settings-card">
          <h2><Shield size={20} /> Risk Management</h2>
          <div className="settings-group">
            <div className="setting-item">
              <label>Max Daily Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.maxDailyLossPct}
                onChange={(e) => handleChange('maxDailyLossPct', parseFloat(e.target.value))}
              />
              <span className="hint">Trading stops if daily loss exceeds this</span>
            </div>

            <div className="setting-item">
              <label>Max Weekly Loss (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.maxWeeklyLossPct}
                onChange={(e) => handleChange('maxWeeklyLossPct', parseFloat(e.target.value))}
              />
              <span className="hint">Trading stops if weekly loss exceeds this</span>
            </div>

            <div className="setting-item">
              <label>Max Position Size (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.maxPositionSizePct}
                onChange={(e) => handleChange('maxPositionSizePct', parseFloat(e.target.value))}
              />
              <span className="hint">Maximum allocation per position</span>
            </div>

            <div className="setting-item">
              <label>Max Drawdown (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.maxDrawdownPct}
                onChange={(e) => handleChange('maxDrawdownPct', parseFloat(e.target.value))}
              />
              <span className="hint warning"><AlertTriangle size={14} /> Triggers kill switch</span>
            </div>

            <div className="setting-item">
              <label>Max Orders Per Day</label>
              <input
                type="number"
                value={settings.maxOrdersPerDay}
                onChange={(e) => handleChange('maxOrdersPerDay', parseInt(e.target.value))}
              />
              <span className="hint">Prevents over-trading</span>
            </div>
          </div>
        </div>

        {/* Trading Settings */}
        <div className="card settings-card">
          <h2><Sliders size={20} /> Trading Settings</h2>
          <div className="settings-group">
            <div className="setting-item">
              <label>Default Order Type</label>
              <select
                value={settings.defaultOrderType}
                onChange={(e) => handleChange('defaultOrderType', e.target.value)}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
                <option value="STOP_LIMIT">Stop Limit</option>
              </select>
            </div>

            <div className="setting-item">
              <label>Slippage Tolerance (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings.slippageTolerance}
                onChange={(e) => handleChange('slippageTolerance', parseFloat(e.target.value))}
              />
              <span className="hint">Max acceptable slippage for market orders</span>
            </div>

            <div className="setting-item toggle-item">
              <label>Enable After-Hours Trading</label>
              <button
                className={`toggle-btn ${settings.enableAfterHours ? 'active' : ''}`}
                onClick={() => handleChange('enableAfterHours', !settings.enableAfterHours)}
              >
                {settings.enableAfterHours ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card settings-card">
          <h2><Bell size={20} /> Notifications</h2>
          <div className="settings-group">
            <div className="setting-item toggle-item">
              <label>Email Notifications</label>
              <button
                className={`toggle-btn ${settings.emailNotifications ? 'active' : ''}`}
                onClick={() => handleChange('emailNotifications', !settings.emailNotifications)}
              >
                {settings.emailNotifications ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="setting-item toggle-item">
              <label>Discord Notifications</label>
              <button
                className={`toggle-btn ${settings.discordNotifications ? 'active' : ''}`}
                onClick={() => handleChange('discordNotifications', !settings.discordNotifications)}
              >
                {settings.discordNotifications ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="setting-item toggle-item">
              <label>Notify on Trade Execution</label>
              <button
                className={`toggle-btn ${settings.notifyOnTrade ? 'active' : ''}`}
                onClick={() => handleChange('notifyOnTrade', !settings.notifyOnTrade)}
              >
                {settings.notifyOnTrade ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="setting-item toggle-item">
              <label>Notify on New Signal</label>
              <button
                className={`toggle-btn ${settings.notifyOnSignal ? 'active' : ''}`}
                onClick={() => handleChange('notifyOnSignal', !settings.notifyOnSignal)}
              >
                {settings.notifyOnSignal ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="setting-item toggle-item">
              <label>Notify on Risk Alert</label>
              <button
                className={`toggle-btn ${settings.notifyOnRiskAlert ? 'active' : ''}`}
                onClick={() => handleChange('notifyOnRiskAlert', !settings.notifyOnRiskAlert)}
              >
                {settings.notifyOnRiskAlert ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card settings-card">
          <h2><Database size={20} /> System Settings</h2>
          <div className="settings-group">
            <div className="setting-item">
              <label>Auto-Refresh Interval (seconds)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.autoRefreshInterval}
                onChange={(e) => handleChange('autoRefreshInterval', parseInt(e.target.value))}
              />
              <span className="hint">How often to refresh dashboard data</span>
            </div>

            <div className="setting-item toggle-item">
              <label>Dark Mode</label>
              <button
                className={`toggle-btn ${settings.darkMode ? 'active' : ''}`}
                onClick={() => handleChange('darkMode', !settings.darkMode)}
              >
                {settings.darkMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="card settings-card api-status">
          <h2><Database size={20} /> API Endpoints</h2>
          <div className="api-list">
            <div className="api-item">
              <span className="api-name">Ops Service</span>
              <span className="api-url">{API_BASE}:5100</span>
            </div>
            <div className="api-item">
              <span className="api-name">Data Service</span>
              <span className="api-url">{API_BASE}:5101</span>
            </div>
            <div className="api-item">
              <span className="api-name">Signal Engine</span>
              <span className="api-url">{API_BASE}:5102</span>
            </div>
            <div className="api-item">
              <span className="api-name">Risk Engine</span>
              <span className="api-url">{API_BASE}:5103</span>
            </div>
            <div className="api-item">
              <span className="api-name">Execution Service</span>
              <span className="api-url">{API_BASE}:5104</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
