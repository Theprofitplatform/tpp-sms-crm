import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

export default function ConnectionHealthCard({ sites }) {
  const health = useMemo(() => {
    if (!sites || sites.length === 0) {
      return {
        total: 0,
        connected: 0,
        disconnected: 0,
        errors: 0,
        successRate: 0,
        avgResponseTime: 0,
        lastChecked: null,
        trend: 'stable'
      }
    }

    const connected = sites.filter(s => s.connected).length
    const disconnected = sites.filter(s => !s.connected && !s.error).length
    const errors = sites.filter(s => s.error).length
    const successRate = sites.length > 0 ? (connected / sites.length) * 100 : 0

    // Calculate average response time from sites with lastSyncDuration
    const sitesWithDuration = sites.filter(s => s.lastSyncDuration > 0)
    const avgResponseTime = sitesWithDuration.length > 0
      ? sitesWithDuration.reduce((sum, s) => sum + s.lastSyncDuration, 0) / sitesWithDuration.length
      : 0

    // Find most recent sync
    const lastChecked = sites.reduce((latest, site) => {
      const siteTime = new Date(site.lastSync || 0).getTime()
      return siteTime > latest ? siteTime : latest
    }, 0)

    // Calculate trend (simplified - in production, compare with historical data)
    const recentErrors = sites.filter(s => s.error && s.lastSync && 
      new Date(s.lastSync).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length

    const trend = recentErrors === 0 ? 'up' : recentErrors < errors ? 'stable' : 'down'

    return {
      total: sites.length,
      connected,
      disconnected,
      errors,
      successRate,
      avgResponseTime,
      lastChecked: lastChecked > 0 ? new Date(lastChecked) : null,
      trend
    }
  }, [sites])

  const getHealthStatus = () => {
    if (health.successRate >= 90) return { label: 'Excellent', color: 'text-green-500', badge: 'default' }
    if (health.successRate >= 70) return { label: 'Good', color: 'text-blue-500', badge: 'secondary' }
    if (health.successRate >= 50) return { label: 'Fair', color: 'text-yellow-500', badge: 'outline' }
    return { label: 'Poor', color: 'text-red-500', badge: 'destructive' }
  }

  const status = getHealthStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Connection Health
          </span>
          <Badge variant={status.badge} className="flex items-center gap-1">
            {health.trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {health.trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Success Rate</span>
            <span className={`text-2xl font-bold ${status.color}`}>
              {Math.round(health.successRate)}%
            </span>
          </div>
          <Progress value={health.successRate} className="h-2" />
        </div>

        {/* Connection Status Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">
                {health.connected}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Connected</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-yellow-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-500">
                {health.disconnected}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-red-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-red-500">
                {health.errors}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Response Time</span>
            <span className="text-sm font-medium">
              {health.avgResponseTime > 0 
                ? `${(health.avgResponseTime / 1000).toFixed(2)}s`
                : 'N/A'
              }
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last Checked
            </span>
            <span className="text-sm font-medium">
              {health.lastChecked 
                ? health.lastChecked.toLocaleString()
                : 'Never'
              }
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Sites</span>
            <span className="text-sm font-medium">{health.total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
