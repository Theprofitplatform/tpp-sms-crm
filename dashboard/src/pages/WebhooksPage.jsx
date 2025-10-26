import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Webhook,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Activity,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export function WebhooksPage() {
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState([])
  const [deliveryLogs, setDeliveryLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [],
    secret: '',
    active: true
  })

  useEffect(() => {
    fetchWebhooksData()
  }, [])

  const fetchWebhooksData = async () => {
    setLoading(true)
    try {
      // Mock webhooks data
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Slack Notifications',
          url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
          events: ['audit.completed', 'issues.critical', 'goal.achieved'],
          secret: 'whsec_***************',
          active: true,
          stats: {
            totalDeliveries: 245,
            successfulDeliveries: 242,
            failedDeliveries: 3,
            lastDelivery: new Date(Date.now() - 3600000)
          },
          createdAt: new Date(Date.now() - 7776000000)
        },
        {
          id: 'webhook-2',
          name: 'Discord Bot',
          url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID',
          events: ['audit.completed', 'ranking.improved'],
          secret: 'whsec_***************',
          active: true,
          stats: {
            totalDeliveries: 156,
            successfulDeliveries: 156,
            failedDeliveries: 0,
            lastDelivery: new Date(Date.now() - 7200000)
          },
          createdAt: new Date(Date.now() - 5184000000)
        },
        {
          id: 'webhook-3',
          name: 'Custom Dashboard',
          url: 'https://api.example.com/webhooks/seo-updates',
          events: ['*'],
          secret: 'whsec_***************',
          active: false,
          stats: {
            totalDeliveries: 89,
            successfulDeliveries: 85,
            failedDeliveries: 4,
            lastDelivery: new Date(Date.now() - 172800000)
          },
          createdAt: new Date(Date.now() - 8640000000)
        },
        {
          id: 'webhook-4',
          name: 'Email Service Integration',
          url: 'https://api.sendgrid.com/v3/webhooks/inbound',
          events: ['client.added', 'report.generated'],
          secret: 'whsec_***************',
          active: true,
          stats: {
            totalDeliveries: 23,
            successfulDeliveries: 23,
            failedDeliveries: 0,
            lastDelivery: new Date(Date.now() - 432000000)
          },
          createdAt: new Date(Date.now() - 2592000000)
        }
      ]

      // Mock delivery logs
      const mockLogs = [
        {
          id: 'log-1',
          webhookId: 'webhook-1',
          webhookName: 'Slack Notifications',
          event: 'audit.completed',
          status: 'success',
          statusCode: 200,
          payload: { clientId: 'instantautotraders', score: 85 },
          response: { ok: true },
          timestamp: new Date(Date.now() - 3600000),
          duration: 145
        },
        {
          id: 'log-2',
          webhookId: 'webhook-2',
          webhookName: 'Discord Bot',
          event: 'ranking.improved',
          status: 'success',
          statusCode: 204,
          payload: { clientId: 'hottyres', keyword: 'tyres melbourne', oldPosition: 12, newPosition: 8 },
          response: { ok: true },
          timestamp: new Date(Date.now() - 7200000),
          duration: 232
        },
        {
          id: 'log-3',
          webhookId: 'webhook-1',
          webhookName: 'Slack Notifications',
          event: 'issues.critical',
          status: 'failed',
          statusCode: 500,
          payload: { clientId: 'theprofitplatform', issueCount: 5 },
          response: { error: 'Internal Server Error' },
          timestamp: new Date(Date.now() - 14400000),
          duration: 3021
        },
        {
          id: 'log-4',
          webhookId: 'webhook-4',
          webhookName: 'Email Service Integration',
          event: 'report.generated',
          status: 'success',
          statusCode: 200,
          payload: { clientId: 'sadcdisabilityservices', reportId: 'rpt-123' },
          response: { ok: true },
          timestamp: new Date(Date.now() - 432000000),
          duration: 189
        },
        {
          id: 'log-5',
          webhookId: 'webhook-1',
          webhookName: 'Slack Notifications',
          event: 'goal.achieved',
          status: 'success',
          statusCode: 200,
          payload: { clientId: 'instantautotraders', goalId: 'goal-1', goalName: 'Increase Traffic 30%' },
          response: { ok: true },
          timestamp: new Date(Date.now() - 604800000),
          duration: 167
        }
      ]

      setWebhooks(mockWebhooks)
      setDeliveryLogs(mockLogs)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch webhooks data:', error)
      toast({
        title: "Error Loading Webhooks",
        description: "Could not fetch webhooks data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const webhook = {
      id: `webhook-${Date.now()}`,
      ...newWebhook,
      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDelivery: null
      },
      createdAt: new Date()
    }

    setWebhooks([...webhooks, webhook])
    setShowNewWebhookModal(false)
    setNewWebhook({
      name: '',
      url: '',
      events: [],
      secret: '',
      active: true
    })

    toast({
      title: "Webhook Created",
      description: `${webhook.name} has been created successfully.`,
    })
  }

  const handleToggleWebhook = (webhookId, active) => {
    setWebhooks(webhooks.map(webhook =>
      webhook.id === webhookId ? { ...webhook, active } : webhook
    ))
    toast({
      title: active ? "Webhook Enabled" : "Webhook Disabled",
      description: `The webhook has been ${active ? 'enabled' : 'disabled'}.`,
    })
  }

  const handleDeleteWebhook = (webhookId) => {
    setWebhooks(webhooks.filter(w => w.id !== webhookId))
    toast({
      title: "Webhook Deleted",
      description: "The webhook has been removed.",
      variant: "destructive"
    })
  }

  const handleTestWebhook = async (webhook) => {
    setSelectedWebhook(webhook)
    setShowTestModal(true)
  }

  const handleSendTestPayload = () => {
    toast({
      title: "Test Payload Sent",
      description: "A test payload has been sent to the webhook URL.",
    })
    setShowTestModal(false)

    // Add a test log entry
    const testLog = {
      id: `log-test-${Date.now()}`,
      webhookId: selectedWebhook.id,
      webhookName: selectedWebhook.name,
      event: 'test.event',
      status: 'success',
      statusCode: 200,
      payload: { test: true, timestamp: new Date().toISOString() },
      response: { ok: true },
      timestamp: new Date(),
      duration: Math.floor(Math.random() * 300) + 100
    }
    setDeliveryLogs([testLog, ...deliveryLogs])
  }

  const handleCopySecret = (secret) => {
    navigator.clipboard.writeText(secret)
    toast({
      title: "Copied to Clipboard",
      description: "Webhook secret has been copied.",
    })
  }

  const availableEvents = [
    { value: '*', label: 'All Events', description: 'Receive all webhook events' },
    { value: 'audit.completed', label: 'Audit Completed', description: 'When an SEO audit finishes' },
    { value: 'audit.failed', label: 'Audit Failed', description: 'When an audit fails' },
    { value: 'issues.critical', label: 'Critical Issues Found', description: 'When critical SEO issues are detected' },
    { value: 'issues.resolved', label: 'Issues Resolved', description: 'When issues are fixed' },
    { value: 'ranking.improved', label: 'Ranking Improved', description: 'When keyword rankings improve' },
    { value: 'ranking.declined', label: 'Ranking Declined', description: 'When keyword rankings drop' },
    { value: 'goal.achieved', label: 'Goal Achieved', description: 'When a goal is completed' },
    { value: 'goal.at_risk', label: 'Goal At Risk', description: 'When a goal is behind schedule' },
    { value: 'client.added', label: 'Client Added', description: 'When a new client is added' },
    { value: 'report.generated', label: 'Report Generated', description: 'When a report is created' },
    { value: 'recommendation.new', label: 'New Recommendation', description: 'When a new recommendation is generated' }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const calculateSuccessRate = (stats) => {
    if (stats.totalDeliveries === 0) return 100
    return Math.round((stats.successfulDeliveries / stats.totalDeliveries) * 100)
  }

  const stats = {
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter(w => w.active).length,
    totalDeliveries: webhooks.reduce((sum, w) => sum + w.stats.totalDeliveries, 0),
    avgSuccessRate: webhooks.length > 0
      ? Math.round(webhooks.reduce((sum, w) => sum + calculateSuccessRate(w.stats), 0) / webhooks.length)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhooks</h1>
            <p className="text-muted-foreground">Loading webhooks...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook integrations for real-time notifications
          </p>
        </div>

        <Dialog open={showNewWebhookModal} onOpenChange={setShowNewWebhookModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Set up a new webhook endpoint to receive event notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Webhook Name *</Label>
                <Input
                  placeholder="e.g., Slack Notifications"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Endpoint URL *</Label>
                <Input
                  placeholder="https://your-app.com/webhooks/seo"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This URL will receive POST requests with event data
                </p>
              </div>

              <div className="space-y-2">
                <Label>Events to Subscribe *</Label>
                <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
                  {availableEvents.map(event => (
                    <div key={event.value} className="flex items-start space-x-2 py-2">
                      <input
                        type="checkbox"
                        id={`event-${event.value}`}
                        checked={newWebhook.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook({
                              ...newWebhook,
                              events: [...newWebhook.events, event.value]
                            })
                          } else {
                            setNewWebhook({
                              ...newWebhook,
                              events: newWebhook.events.filter(ev => ev !== event.value)
                            })
                          }
                        }}
                        className="mt-1 rounded"
                      />
                      <label htmlFor={`event-${event.value}`} className="text-sm cursor-pointer">
                        <div className="font-medium">{event.label}</div>
                        <div className="text-muted-foreground text-xs">{event.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {newWebhook.events.length} event(s) selected
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={newWebhook.active}
                  onCheckedChange={(checked) => setNewWebhook({ ...newWebhook, active: checked })}
                />
                <Label htmlFor="active">Enable immediately</Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewWebhookModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook}>
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              All configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWebhooks}</div>
            <p className="text-xs text-muted-foreground">
              Currently enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average across all
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Webhooks Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first webhook to receive real-time notifications
                </p>
                <Button onClick={() => setShowNewWebhookModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{webhook.name}</CardTitle>
                          <Badge variant={webhook.active ? 'default' : 'secondary'}>
                            {webhook.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <CardDescription className="font-mono text-xs">
                          {webhook.url}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-muted-foreground">
                            Events: {webhook.events.length === 1 && webhook.events[0] === '*' ? 'All' : webhook.events.length}
                          </span>
                          {webhook.stats.lastDelivery && (
                            <span className="text-xs text-muted-foreground">
                              Last delivery: {new Date(webhook.stats.lastDelivery).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestWebhook(webhook)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopySecret(webhook.secret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{webhook.stats.totalDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Successful</p>
                        <p className="text-2xl font-bold text-green-600">{webhook.stats.successfulDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">{webhook.stats.failedDeliveries}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{calculateSuccessRate(webhook.stats)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Logs</CardTitle>
              <CardDescription>
                Recent webhook delivery attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No delivery logs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryLogs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : log.status === 'failed' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <div>
                          <div className="font-medium">{log.webhookName}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.event} • {new Date(log.timestamp).toLocaleString()}
                          </div>
                          {log.status === 'failed' && (
                            <div className="text-xs text-red-500 mt-1">
                              {log.response.error}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={getStatusColor(log.status)}>
                            {log.statusCode}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.duration}ms
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Webhook Modal */}
      <Dialog open={showTestModal} onOpenChange={setShowTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Webhook</DialogTitle>
            <DialogDescription>
              Send a test payload to {selectedWebhook?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Payload</Label>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[300px]">
{`{
  "event": "test.event",
  "timestamp": "${new Date().toISOString()}",
  "data": {
    "test": true,
    "webhook_id": "${selectedWebhook?.id}",
    "webhook_name": "${selectedWebhook?.name}"
  }
}`}
              </pre>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowTestModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendTestPayload}>
              <Send className="h-4 w-4 mr-2" />
              Send Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
