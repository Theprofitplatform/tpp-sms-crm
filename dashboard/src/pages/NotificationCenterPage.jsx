import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  Settings,
  AlertCircle
} from 'lucide-react'
import { LoadingState } from '@/components/LoadingState'

export function NotificationCenterPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    email: {
      enabled: true,
      address: '',
      digest: true
    },
    discord: {
      enabled: false,
      webhookUrl: ''
    },
    slack: {
      enabled: false,
      webhookUrl: ''
    },
    sms: {
      enabled: false,
      phoneNumber: ''
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || settings)
      }
    } catch (err) {
      console.error('Error fetching notification settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (channel, key, value) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value
      }
    }))
  }

  if (loading) return <LoadingState message="Loading notification settings..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Configure how you receive alerts and updates
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) => updateSetting('email', 'enabled', checked)}
            />
          </div>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={settings.email.address}
              onChange={(e) => updateSetting('email', 'address', e.target.value)}
              placeholder="notifications@example.com"
              disabled={!settings.email.enabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive a summary email once per day
              </p>
            </div>
            <Switch
              checked={settings.email.digest}
              onCheckedChange={(checked) => updateSetting('email', 'digest', checked)}
              disabled={!settings.email.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Discord Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Discord Notifications</CardTitle>
            </div>
            <Switch
              checked={settings.discord.enabled}
              onCheckedChange={(checked) => updateSetting('discord', 'enabled', checked)}
            />
          </div>
          <CardDescription>
            Send notifications to Discord channel via webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              type="url"
              value={settings.discord.webhookUrl}
              onChange={(e) => updateSetting('discord', 'webhookUrl', e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              disabled={!settings.discord.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Get your webhook URL from Discord Server Settings → Integrations → Webhooks
            </p>
          </div>
          {settings.discord.enabled && settings.discord.webhookUrl && (
            <Button variant="outline" size="sm">
              Test Discord Connection
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Slack Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle>Slack Notifications</CardTitle>
            </div>
            <Switch
              checked={settings.slack.enabled}
              onCheckedChange={(checked) => updateSetting('slack', 'enabled', checked)}
            />
          </div>
          <CardDescription>
            Send notifications to Slack channel via webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input
              type="url"
              value={settings.slack.webhookUrl}
              onChange={(e) => updateSetting('slack', 'webhookUrl', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              disabled={!settings.slack.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Create a webhook at api.slack.com/apps → Incoming Webhooks
            </p>
          </div>
          {settings.slack.enabled && settings.slack.webhookUrl && (
            <Button variant="outline" size="sm">
              Test Slack Connection
            </Button>
          )}
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>SMS Notifications</CardTitle>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <Switch
              checked={settings.sms.enabled}
              onCheckedChange={(checked) => updateSetting('sms', 'enabled', checked)}
              disabled
            />
          </div>
          <CardDescription>
            Receive critical alerts via SMS (requires Twilio integration)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              value={settings.sms.phoneNumber}
              onChange={(e) => updateSetting('sms', 'phoneNumber', e.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which events trigger notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rank Changes</p>
              <p className="text-sm text-muted-foreground">
                When keyword rankings change significantly
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Audit Completion</p>
              <p className="text-sm text-muted-foreground">
                When SEO audits finish running
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Optimization Results</p>
              <p className="text-sm text-muted-foreground">
                When content optimization completes
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">System Errors</p>
              <p className="text-sm text-muted-foreground">
                Critical system errors and failures
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Reports</p>
              <p className="text-sm text-muted-foreground">
                Weekly summary of all activities
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Notification Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Notifications are rate-limited to prevent spam</p>
          <p>• Critical alerts always bypass quiet hours</p>
          <p>• Digest mode batches non-urgent notifications</p>
          <p>• All notifications are logged for audit purposes</p>
        </CardContent>
      </Card>
    </div>
  )
}
