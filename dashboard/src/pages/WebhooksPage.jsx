import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { webhooksAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { VALIDATION_PATTERNS } from '@/constants'

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
  AlertTriangle,
  Loader2
} from 'lucide-react'

const AVAILABLE_EVENTS = [
  { value: 'audit.completed', label: 'Audit Completed' },
  { value: 'issues.critical', label: 'Critical Issues Found' },
  { value: 'goal.achieved', label: 'Goal Achieved' },
  { value: 'ranking.improved', label: 'Ranking Improved' },
  { value: 'ranking.declined', label: 'Ranking Declined' },
  { value: 'optimization.completed', label: 'Optimization Completed' },
  { value: '*', label: 'All Events' }
]

export default function WebhooksPage() {
  const { toast } = useToast()
  
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
  const [errors, setErrors] = useState({})

  // API Requests
  const { data: webhooks, loading: loadingWebhooks, refetch: refetchWebhooks } = useAPIData(
    () => webhooksAPI.getAll(),
    { autoFetch: true, initialData: [] }
  )

  const { data: deliveryLogs, loading: loadingLogs } = useAPIData(
    () => selectedWebhook ? webhooksAPI.getLogs(selectedWebhook.id, 50) : Promise.resolve([]),
    { autoFetch: false, initialData: [] }
  )

  const { execute: createWebhook, loading: creating } = useAPIRequest()
  const { execute: updateWebhook, loading: updating } = useAPIRequest()
  const { execute: deleteWebhook, loading: deleting } = useAPIRequest()
  const { execute: testWebhook, loading: testing } = useAPIRequest()
  const { execute: toggleWebhook } = useAPIRequest()

  // Stats
  const stats = useMemo(() => {
    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter(w => w.active).length,
      totalDeliveries: webhooks.reduce((sum, w) => sum + (w.stats?.totalDeliveries || 0), 0),
      avgSuccessRate: webhooks.length > 0
        ? webhooks.reduce((sum, w) => {
            const rate = w.stats?.totalDeliveries > 0
              ? (w.stats.successfulDeliveries / w.stats.totalDeliveries) * 100
              : 100
            return sum + rate
          }, 0) / webhooks.length
        : 100
    }
  }, [webhooks])

  const validateWebhook = useCallback(() => {
    const newErrors = {}
    
    if (!newWebhook.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!VALIDATION_PATTERNS.URL.test(newWebhook.url)) {
      newErrors.url = 'Invalid URL format'
    }
    
    if (newWebhook.events.length === 0) {
      newErrors.events = 'Select at least one event'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [newWebhook])

  const handleCreateWebhook = useCallback(async () => {
    if (!validateWebhook()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    await createWebhook(
      () => webhooksAPI.create(newWebhook),
      {
        showSuccessToast: true,
        successMessage: 'Webhook created successfully',
        onSuccess: () => {
          setShowNewWebhookModal(false)
          setNewWebhook({ name: '', url: '', events: [], secret: '', active: true })
          setErrors({})
          refetchWebhooks()
        }
      }
    )
  }, [newWebhook, createWebhook, refetchWebhooks, validateWebhook, toast])

  const handleToggleWebhook = useCallback(async (webhookId, active) => {
    await toggleWebhook(
      () => webhooksAPI.toggle(webhookId, active),
      {
        showSuccessToast: true,
        successMessage: `Webhook ${active ? 'enabled' : 'disabled'}`,
        onSuccess: () => {
          refetchWebhooks()
        }
      }
    )
  }, [toggleWebhook, refetchWebhooks])

  const handleTestWebhook = useCallback(async (webhookId) => {
    await testWebhook(
      () => webhooksAPI.test(webhookId),
      {
        showSuccessToast: true,
        successMessage: 'Test webhook sent successfully',
        onSuccess: () => {
          setShowTestModal(false)
          refetchWebhooks()
        }
      }
    )
  }, [testWebhook, refetchWebhooks])

  const handleDeleteWebhook = useCallback(async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    await deleteWebhook(
      () => webhooksAPI.delete(webhookId),
      {
        showSuccessToast: true,
        successMessage: 'Webhook deleted successfully',
        onSuccess: () => {
          refetchWebhooks()
        }
      }
    )
  }, [deleteWebhook, refetchWebhooks])

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }, [toast])

  if (loadingWebhooks) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading webhooks...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Webhook className="h-8 w-8" />
            Webhooks
          </h1>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications
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
                Configure a webhook to receive event notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Name *</Label>
                <Input
                  id="webhook-name"
                  placeholder="e.g., Slack Notifications"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">URL *</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  aria-invalid={!!errors.url}
                />
                {errors.url && <p className="text-sm text-red-500">{errors.url}</p>}
              </div>

              <div className="space-y-2">
                <Label>Events *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map(event => (
                    <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.value)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...newWebhook.events, event.value]
                            : newWebhook.events.filter(ev => ev !== event.value)
                          setNewWebhook({ ...newWebhook, events })
                        }}
                      />
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
                {errors.events && <p className="text-sm text-red-500">{errors.events}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                <Input
                  id="webhook-secret"
                  type="password"
                  placeholder="Webhook secret for verification"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newWebhook.active}
                  onCheckedChange={(checked) => setNewWebhook({ ...newWebhook, active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewWebhookModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWebhooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWebhooks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFinite(stats.avgSuccessRate) ? Number(stats.avgSuccessRate).toFixed(1) : '0.0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>Manage your webhook endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Webhooks Configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first webhook to start receiving notifications
              </p>
              <Button onClick={() => setShowNewWebhookModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{webhook.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {webhook.url}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(webhook.url)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </CardDescription>
                      </div>
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {webhook.events?.map(event => (
                        <Badge key={event} variant="secondary">
                          {AVAILABLE_EVENTS.find(e => e.value === event)?.label || event}
                        </Badge>
                      ))}
                    </div>

                    {webhook.stats && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Deliveries</p>
                          <p className="font-medium">{webhook.stats.totalDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Successful</p>
                          <p className="font-medium text-green-600">{webhook.stats.successfulDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed</p>
                          <p className="font-medium text-red-600">{webhook.stats.failedDeliveries}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={testing}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
