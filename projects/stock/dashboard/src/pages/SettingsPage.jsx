import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API, API_CONFIG } from '@/config/api'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
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

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(API.ops.settings(), { timeout: 5000 })
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }))
      }
    } catch {
      console.log('Using default settings')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await axios.put(API.ops.settings(), settings)
      toast.success({ title: 'Settings Saved', description: 'Your settings have been saved successfully' })
    } catch (err) {
      toast.error({
        title: 'Failed to save settings',
        description: err.response?.data?.error || err.message
      })
    }
    setSaving(false)
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <Button
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxDailyLossPct">Max Daily Loss (%)</Label>
              <Input
                id="maxDailyLossPct"
                type="number"
                step="0.1"
                value={settings.maxDailyLossPct}
                onChange={(e) => handleChange('maxDailyLossPct', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Trading stops if daily loss exceeds this</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxWeeklyLossPct">Max Weekly Loss (%)</Label>
              <Input
                id="maxWeeklyLossPct"
                type="number"
                step="0.1"
                value={settings.maxWeeklyLossPct}
                onChange={(e) => handleChange('maxWeeklyLossPct', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Trading stops if weekly loss exceeds this</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPositionSizePct">Max Position Size (%)</Label>
              <Input
                id="maxPositionSizePct"
                type="number"
                step="0.1"
                value={settings.maxPositionSizePct}
                onChange={(e) => handleChange('maxPositionSizePct', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Maximum allocation per position</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDrawdownPct">Max Drawdown (%)</Label>
              <Input
                id="maxDrawdownPct"
                type="number"
                step="0.1"
                value={settings.maxDrawdownPct}
                onChange={(e) => handleChange('maxDrawdownPct', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" />
                Triggers kill switch
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxOrdersPerDay">Max Orders Per Day</Label>
              <Input
                id="maxOrdersPerDay"
                type="number"
                value={settings.maxOrdersPerDay}
                onChange={(e) => handleChange('maxOrdersPerDay', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Prevents over-trading</p>
            </div>
          </CardContent>
        </Card>

        {/* Trading Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Trading Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="defaultOrderType">Default Order Type</Label>
              <Select
                id="defaultOrderType"
                value={settings.defaultOrderType}
                onChange={(e) => handleChange('defaultOrderType', e.target.value)}
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop</option>
                <option value="STOP_LIMIT">Stop Limit</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slippageTolerance">Slippage Tolerance (%)</Label>
              <Input
                id="slippageTolerance"
                type="number"
                step="0.01"
                value={settings.slippageTolerance}
                onChange={(e) => handleChange('slippageTolerance', parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Max acceptable slippage for market orders</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>After-Hours Trading</Label>
                <p className="text-xs text-muted-foreground">Enable trading outside market hours</p>
              </div>
              <Switch
                checked={settings.enableAfterHours}
                onCheckedChange={(checked) => handleChange('enableAfterHours', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Discord Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via Discord</p>
              </div>
              <Switch
                checked={settings.discordNotifications}
                onCheckedChange={(checked) => handleChange('discordNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trade Execution</Label>
                <p className="text-xs text-muted-foreground">Notify when trades are executed</p>
              </div>
              <Switch
                checked={settings.notifyOnTrade}
                onCheckedChange={(checked) => handleChange('notifyOnTrade', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Signals</Label>
                <p className="text-xs text-muted-foreground">Notify when new signals are generated</p>
              </div>
              <Switch
                checked={settings.notifyOnSignal}
                onCheckedChange={(checked) => handleChange('notifyOnSignal', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Risk Alerts</Label>
                <p className="text-xs text-muted-foreground">Notify on risk threshold breaches</p>
              </div>
              <Switch
                checked={settings.notifyOnRiskAlert}
                onCheckedChange={(checked) => handleChange('notifyOnRiskAlert', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="autoRefreshInterval">Auto-Refresh Interval (seconds)</Label>
              <Input
                id="autoRefreshInterval"
                type="number"
                min="10"
                max="300"
                value={settings.autoRefreshInterval}
                onChange={(e) => handleChange('autoRefreshInterval', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">How often to refresh dashboard data</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleChange('darkMode', checked)}
              />
            </div>

            <Separator />

            {/* API Endpoints */}
            <div className="space-y-3">
              <Label className="text-muted-foreground">API Endpoints</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">Ops Service</span>
                  <code className="text-xs text-muted-foreground">{API_CONFIG.ops}</code>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">Data Service</span>
                  <code className="text-xs text-muted-foreground">{API_CONFIG.data}</code>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">Signal Engine</span>
                  <code className="text-xs text-muted-foreground">{API_CONFIG.signal}</code>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">Risk Engine</span>
                  <code className="text-xs text-muted-foreground">{API_CONFIG.risk}</code>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">Execution Service</span>
                  <code className="text-xs text-muted-foreground">{API_CONFIG.exec}</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
