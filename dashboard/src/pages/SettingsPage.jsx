import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { settingsAPI } from '@/services/api'
import { useAPIRequest } from '@/hooks/useAPIRequest'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { VALIDATION_PATTERNS } from '@/constants'

// UI Components
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Icons
import {
  Settings,
  Bell,
  Link2,
  Key,
  Palette,
  Save,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react'

export default function SettingsPage() {
  // Form state
  const [settings, setSettings] = useState({
    general: {
      platformName: '',
      adminEmail: '',
      language: 'en',
      timezone: 'UTC'
    },
    notifications: {
      rankChanges: true,
      auditCompletion: true,
      optimizationResults: true,
      systemErrors: true,
      weeklyReports: true,
      emailEnabled: false,
      email: '',
      discordWebhook: ''
    },
    integrations: {
      gsc: {
        propertyType: 'domain',
        propertyUrl: '',
        clientEmail: '',
        privateKey: '',
        connected: false
      }
    },
    api: {
      apiKey: ''
    },
    appearance: {
      theme: 'system',
      primaryColor: 'blue',
      sidebarPosition: 'left'
    }
  })

  const [initialSettings, setInitialSettings] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [activeTab, setActiveTab] = useLocalStorage('settings-active-tab', 'general')

  const { loading, execute } = useAPIRequest()
  const { toast } = useToast()

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const loadSettings = async () => {
    await execute(
      () => settingsAPI.getAll(),
      {
        showErrorToast: true,
        onSuccess: (data) => {
          setSettings(data)
          setInitialSettings(JSON.parse(JSON.stringify(data)))
        },
        onError: () => {
          // Set default values if API fails
          const defaultSettings = { ...settings }
          setSettings(defaultSettings)
          setInitialSettings(JSON.parse(JSON.stringify(defaultSettings)))
        }
      }
    )
  }

  const handleChange = useCallback((category, field, value) => {
    setSettings(prev => {
      // Handle nested objects like integrations.gsc
      if (category === 'integrations' && typeof field === 'object') {
        return {
          ...prev,
          integrations: {
            ...(prev.integrations || {}),
            ...field
          }
        }
      }

      return {
        ...prev,
        [category]: {
          ...(prev[category] || {}),
          [field]: value
        }
      }
    })
    setIsDirty(true)

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`${category}.${field}`]
      return newErrors
    })
  }, [])

  // Helper function for updating GSC settings
  const handleGSCChange = useCallback((field, value) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...(prev.integrations || {}),
        gsc: {
          ...(prev.integrations?.gsc || {}),
          [field]: value
        }
      }
    }))
    setIsDirty(true)
  }, [])

  const validateSettings = () => {
    const newErrors = {}

    // Validate email
    if (settings.general?.adminEmail && !VALIDATION_PATTERNS.EMAIL.test(settings.general.adminEmail)) {
      newErrors['general.adminEmail'] = 'Invalid email format'
    }

    // Validate Discord webhook URL if provided
    if (settings.notifications?.discordWebhook && !settings.notifications.discordWebhook.startsWith('https://discord.com/api/webhooks/')) {
      newErrors['notifications.discordWebhook'] = 'Invalid Discord webhook URL'
    }

    // Validate platform name
    if (!settings.general?.platformName || settings.general.platformName.trim().length === 0) {
      newErrors['general.platformName'] = 'Platform name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    // Validate before saving
    if (!validateSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    await execute(
      () => settingsAPI.update('all', settings),
      {
        showSuccessToast: true,
        successMessage: 'Settings saved successfully',
        onSuccess: () => {
          setInitialSettings(JSON.parse(JSON.stringify(settings)))
          setIsDirty(false)
        }
      }
    )
  }

  const handleDiscard = () => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)))
    setIsDirty(false)
    setErrors({})
    toast({ title: 'Changes discarded' })
  }

  const handleRegenerateApiKey = async () => {
    if (!confirm('This will invalidate your current API key. Continue?')) {
      return
    }

    await execute(
      () => settingsAPI.generateAPIKey('Default Key'),
      {
        onSuccess: (data) => {
          if (data.success && data.apiKey) {
            // Show the full API key in an alert for the user to copy
            alert(
              `API Key Generated Successfully!\n\n` +
              `Your new API key is:\n\n${data.apiKey}\n\n` +
              `⚠️ IMPORTANT: Copy this key now! You won't be able to see it again.\n\n` +
              `The key has been copied to your clipboard.`
            )

            // Copy to clipboard
            navigator.clipboard.writeText(data.apiKey)

            // Update the masked key in the UI
            const maskedKey = data.apiKey.substring(0, 12) + '...' + data.apiKey.substring(data.apiKey.length - 4)
            handleChange('api', 'apiKey', maskedKey)

            toast({
              title: 'API Key Generated',
              description: 'Your new API key has been copied to clipboard'
            })
          }
        },
        onError: (error) => {
          toast({
            title: 'Generation Failed',
            description: error.message || 'Failed to generate API key',
            variant: 'destructive'
          })
        }
      }
    )
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  if (loading && !initialSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your application configuration
          </p>
        </div>

        {isDirty && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Discard Changes
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Unsaved changes alert */}
      {isDirty && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic application configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Platform Name */}
              <div className="space-y-2">
                <Label htmlFor="platform-name">
                  Platform Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="platform-name"
                  value={settings.general?.platformName || ''}
                  onChange={(e) => handleChange('general', 'platformName', e.target.value)}
                  placeholder="My SEO Platform"
                  aria-invalid={!!errors['general.platformName']}
                  aria-describedby={errors['general.platformName'] ? 'platform-name-error' : undefined}
                />
                {errors['general.platformName'] && (
                  <p id="platform-name-error" className="text-sm text-red-500">
                    {errors['general.platformName']}
                  </p>
                )}
              </div>

              {/* Admin Email */}
              <div className="space-y-2">
                <Label htmlFor="admin-email">
                  Admin Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={settings.general?.adminEmail || ''}
                  onChange={(e) => handleChange('general', 'adminEmail', e.target.value)}
                  placeholder="admin@example.com"
                  aria-invalid={!!errors['general.adminEmail']}
                  aria-describedby={errors['general.adminEmail'] ? 'admin-email-error' : undefined}
                />
                {errors['general.adminEmail'] && (
                  <p id="admin-email-error" className="text-sm text-red-500">
                    {errors['general.adminEmail']}
                  </p>
                )}
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.general?.language || 'en'}
                  onValueChange={(value) => handleChange('general', 'language', value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.general?.timezone || 'UTC'}
                  onValueChange={(value) => handleChange('general', 'timezone', value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries({
                rankChanges: 'Rank Changes',
                auditCompletion: 'Audit Completion',
                optimizationResults: 'Optimization Results',
                systemErrors: 'System Errors',
                weeklyReports: 'Weekly Reports'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`notif-${key}`} className="cursor-pointer">
                    {label}
                  </Label>
                  <Switch
                    id={`notif-${key}`}
                    checked={settings.notifications?.[key] || false}
                    onCheckedChange={(checked) => handleChange('notifications', key, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email settings to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Enable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled" className="cursor-pointer">
                    Enable Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications to your email address
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={settings.notifications?.emailEnabled || false}
                  onCheckedChange={(checked) => handleChange('notifications', 'emailEnabled', checked)}
                />
              </div>

              {/* Notification Email */}
              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email</Label>
                <Input
                  id="notification-email"
                  type="email"
                  value={settings.notifications?.email || ''}
                  onChange={(e) => handleChange('notifications', 'email', e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address where notifications will be sent
                </p>
              </div>

              {/* SMTP Configuration */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  SMTP settings are configured on the server. Contact your administrator to set up email delivery.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Discord Webhook */}
          <Card>
            <CardHeader>
              <CardTitle>Discord Webhook</CardTitle>
              <CardDescription>
                Receive real-time notifications in Discord
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Discord Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="discord-webhook">Discord Webhook URL (Optional)</Label>
                <Input
                  id="discord-webhook"
                  type="url"
                  value={settings.notifications?.discordWebhook || ''}
                  onChange={(e) => handleChange('notifications', 'discordWebhook', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <p className="text-sm text-muted-foreground">
                  Create a webhook in your Discord server settings. <a href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks" target="_blank" rel="noopener noreferrer" className="text-primary underline">Learn how</a>
                </p>
              </div>

              {/* Test Button */}
              <Button
                variant="outline"
                onClick={async () => {
                  if (!settings.notifications?.discordWebhook) {
                    toast({
                      title: 'Webhook URL Required',
                      description: 'Please enter a Discord webhook URL first',
                      variant: 'destructive'
                    })
                    return
                  }

                  try {
                    const response = await fetch('/api/notifications/test-discord', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ webhook: settings.notifications.discordWebhook })
                    })
                    const data = await response.json()

                    if (data.success) {
                      toast({
                        title: 'Test Sent',
                        description: 'Check your Discord channel for the test message'
                      })
                    } else {
                      toast({
                        title: 'Test Failed',
                        description: data.error || 'Failed to send test message',
                        variant: 'destructive'
                      })
                    }
                  } catch (error) {
                    toast({
                      title: 'Test Failed',
                      description: error.message,
                      variant: 'destructive'
                    })
                  }
                }}
                disabled={!settings.notifications?.discordWebhook || loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Discord Webhook
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Manage your API keys and webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.api?.apiKey || ''}
                      readOnly
                      className="pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(settings.api?.apiKey || '')}
                        aria-label="Copy API key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateApiKey}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep your API key secure. Never share it publicly.
                </p>
              </div>

              {/* Info about webhooks */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Looking for webhooks? Configure Discord webhook notifications in the <strong>Notifications</strong> tab.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex gap-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.appearance?.theme === theme ? 'default' : 'outline'}
                      onClick={() => handleChange('appearance', 'theme', theme)}
                      className="flex-1"
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['blue', 'green', 'purple', 'red', 'orange'].map((color) => (
                    <button
                      key={color}
                      className={`h-10 rounded-md border-2 ${
                        settings.appearance?.primaryColor === color
                          ? 'border-primary ring-2 ring-offset-2'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleChange('appearance', 'primaryColor', color)}
                      aria-label={`Select ${color} as primary color`}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar Position */}
              <div className="space-y-2">
                <Label htmlFor="sidebar-position">Sidebar Position</Label>
                <Select
                  value={settings.appearance?.sidebarPosition || 'left'}
                  onValueChange={(value) => handleChange('appearance', 'sidebarPosition', value)}
                >
                  <SelectTrigger id="sidebar-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>
                Connect your Google Search Console account to access real-time ranking data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  To enable Google Search Console integration, you need to:
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Create a Google Cloud project</li>
                    <li>Enable the Search Console API</li>
                    <li>Create a service account</li>
                    <li>Add the service account email to your GSC property</li>
                    <li>Enter the credentials below</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Property Type */}
              <div className="space-y-2">
                <Label htmlFor="gsc-property-type">Property Type</Label>
                <Select
                  value={settings.integrations?.gsc?.propertyType || 'domain'}
                  onValueChange={(value) => handleGSCChange('propertyType', value)}
                >
                  <SelectTrigger id="gsc-property-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Domain Property (sc-domain:example.com)</SelectItem>
                    <SelectItem value="url">URL Property (https://example.com/)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property URL/Domain */}
              <div className="space-y-2">
                <Label htmlFor="gsc-property-url">
                  {settings.integrations?.gsc?.propertyType === 'domain' ? 'Domain Name' : 'Property URL'}
                </Label>
                <Input
                  id="gsc-property-url"
                  type={settings.integrations?.gsc?.propertyType === 'url' ? 'url' : 'text'}
                  value={settings.integrations?.gsc?.propertyUrl || ''}
                  onChange={(e) => handleGSCChange('propertyUrl', e.target.value)}
                  placeholder={settings.integrations?.gsc?.propertyType === 'domain' ? 'example.com' : 'https://example.com/'}
                />
                <p className="text-sm text-muted-foreground">
                  {settings.integrations?.gsc?.propertyType === 'domain'
                    ? 'Enter your domain name (e.g., example.com)'
                    : 'Must match exactly as it appears in Google Search Console'}
                </p>
              </div>

              {/* Client Email */}
              <div className="space-y-2">
                <Label htmlFor="gsc-client-email">Service Account Email</Label>
                <Input
                  id="gsc-client-email"
                  type="email"
                  value={settings.integrations?.gsc?.clientEmail || ''}
                  onChange={(e) => handleGSCChange('clientEmail', e.target.value)}
                  placeholder="your-service-account@your-project.iam.gserviceaccount.com"
                />
                <p className="text-sm text-muted-foreground">
                  Found in your service account JSON file
                </p>
              </div>

              {/* Private Key */}
              <div className="space-y-2">
                <Label htmlFor="gsc-private-key">Service Account Private Key</Label>
                <textarea
                  id="gsc-private-key"
                  className="w-full min-h-[120px] p-2 border border-input rounded-md bg-background text-sm font-mono"
                  value={settings.integrations?.gsc?.privateKey || ''}
                  onChange={(e) => handleGSCChange('privateKey', e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...&#10;-----END PRIVATE KEY-----"
                />
                <p className="text-sm text-muted-foreground">
                  Copy the entire private_key value including the BEGIN and END lines
                </p>
              </div>

              {/* Connection Status */}
              {settings.integrations?.gsc?.connected && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Connected successfully to Google Search Console
                  </AlertDescription>
                </Alert>
              )}

              {/* Test Connection Button */}
              <Button
                variant="outline"
                disabled={!settings.integrations?.gsc?.clientEmail || !settings.integrations?.gsc?.privateKey || !settings.integrations?.gsc?.propertyUrl || loading}
                onClick={async () => {
                  const gscSettings = settings.integrations?.gsc
                  if (!gscSettings?.clientEmail || !gscSettings?.privateKey || !gscSettings?.propertyUrl) {
                    toast({
                      title: 'Missing Information',
                      description: 'Please fill in all GSC fields before testing',
                      variant: 'destructive'
                    })
                    return
                  }

                  await execute(
                    async () => {
                      const response = await fetch('/api/gsc/test-connection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clientEmail: gscSettings.clientEmail,
                          privateKey: gscSettings.privateKey,
                          propertyUrl: gscSettings.propertyUrl,
                          propertyType: gscSettings.propertyType || 'domain'
                        })
                      })
                      return response.json()
                    },
                    {
                      onSuccess: (data) => {
                        if (data.success) {
                          // Update connection status
                          setSettings(prev => ({
                            ...prev,
                            integrations: {
                              ...(prev.integrations || {}),
                              gsc: { ...prev.integrations.gsc, connected: true }
                            }
                          }))
                          toast({
                            title: 'Connection Successful',
                            description: 'Google Search Console is properly configured'
                          })
                        } else {
                          toast({
                            title: 'Connection Failed',
                            description: data.error || 'Failed to connect to GSC',
                            variant: 'destructive'
                          })
                        }
                      },
                      onError: (error) => {
                        toast({
                          title: 'Connection Failed',
                          description: error.message || 'Failed to test GSC connection',
                          variant: 'destructive'
                        })
                      }
                    }
                  )
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save reminder - Fixed position */}
      {isDirty && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="font-medium">You have unsaved changes</p>
            <p className="text-sm text-muted-foreground">Don't forget to save</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
