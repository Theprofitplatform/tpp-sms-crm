// AlertsPage.jsx
// Displays system alerts and notification management
// Dependencies: React, axios, lucide-react, custom UI components

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/data-display/StatCard'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton'
import { formatDate } from '@/utils/formatters'

const severityColors = {
  critical: 'destructive',
  warning: 'warning',
  info: 'secondary',
}

const severityIcons = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Bell,
}

export default function AlertsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [activeAlerts, setActiveAlerts] = useState([])
  const [filter, setFilter] = useState('all') // all, active, resolved

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [alertsRes, activeRes] = await Promise.allSettled([
        axios.get(API.ops.alerts.list(), { timeout: 5000 }),
        axios.get(API.ops.alerts.active(), { timeout: 5000 }),
      ])

      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data || [])
      }
      if (activeRes.status === 'fulfilled') {
        setActiveAlerts(activeRes.value.data || [])
      }

      const failed = [alertsRes, activeRes].filter(r => r.status === 'rejected')
      if (failed.length === 2) {
        setError('Failed to connect to alerts service')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch alerts')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  const handleAcknowledge = async (alertId) => {
    try {
      await axios.post(API.ops.alerts.acknowledge(alertId))
      toast.success({ title: 'Alert Acknowledged', description: 'Alert has been marked as acknowledged' })
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Failed to acknowledge',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'active') return !alert.resolved
    if (filter === 'resolved') return alert.resolved
    return true
  })

  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Alerts</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonStatCard key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Alerts</h1>
        </div>
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={loading}
          aria-label="Refresh alerts"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          {error}
          <Button variant="link" className="ml-2 h-auto p-0" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<XCircle className="h-6 w-6" />}
          label="Critical"
          value={criticalCount}
          variant={criticalCount > 0 ? 'danger' : 'default'}
          ariaLabel={`Critical alerts: ${criticalCount}`}
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Warnings"
          value={warningCount}
          variant={warningCount > 0 ? 'warning' : 'default'}
          ariaLabel={`Warning alerts: ${warningCount}`}
        />
        <StatCard
          icon={<AlertCircle className="h-6 w-6" />}
          label="Total Active"
          value={activeAlerts.length}
          ariaLabel={`Total active alerts: ${activeAlerts.length}`}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2" role="tablist" aria-label="Alert filters">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          role="tab"
          aria-selected={filter === 'all'}
        >
          All ({alerts.length})
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
          role="tab"
          aria-selected={filter === 'active'}
        >
          Active ({activeAlerts.length})
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('resolved')}
          role="tab"
          aria-selected={filter === 'resolved'}
        >
          Resolved ({alerts.filter(a => a.resolved).length})
        </Button>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert History
          </CardTitle>
          <CardDescription>Recent system alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No alerts"
              description={filter === 'all' ? 'No alerts have been triggered' : `No ${filter} alerts`}
            />
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => {
                const SeverityIcon = severityIcons[alert.severity] || Bell
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border",
                      alert.resolved ? 'bg-muted/30' : 'bg-card',
                      alert.severity === 'critical' && !alert.resolved && 'border-red-500'
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-full",
                      alert.severity === 'critical' ? 'bg-red-500/10' :
                      alert.severity === 'warning' ? 'bg-yellow-500/10' :
                      'bg-muted'
                    )}>
                      <SeverityIcon className={cn(
                        "h-5 w-5",
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'warning' ? 'text-yellow-500' :
                        'text-muted-foreground'
                      )} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{alert.title || alert.name}</span>
                        <Badge variant={severityColors[alert.severity] || 'secondary'}>
                          {alert.severity}
                        </Badge>
                        {alert.resolved && (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.message || alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(alert.created_at || alert.timestamp, { time: true })}
                      </p>
                    </div>
                    {!alert.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
