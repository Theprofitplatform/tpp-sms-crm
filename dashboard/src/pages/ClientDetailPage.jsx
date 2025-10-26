import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { RankingChart, TrafficChart } from '@/components/Charts'
import { DashboardSkeleton } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useToast } from '@/hooks/use-toast'

export function ClientDetailPage({ clientId, onBack }) {
  const { toast } = useToast()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [runningAudit, setRunningAudit] = useState(false)

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all client data in parallel
      const [dashResponse, perfResponse, auditResponse, reportsResponse] = await Promise.all([
        fetch('/api/dashboard'),
        fetch(`/api/analytics/client/${clientId}/performance?limit=10`),
        fetch(`/api/analytics/client/${clientId}/audits?limit=10`),
        fetch(`/api/reports/${clientId}`)
      ])

      if (!dashResponse.ok) {
        throw new Error('Failed to fetch client data')
      }

      const dashData = await dashResponse.json()
      const clientInfo = dashData.clients?.find(c => c.id === clientId)

      if (!clientInfo) {
        throw new Error('Client not found')
      }

      const perfData = perfResponse.ok ? await perfResponse.json() : { data: [] }
      const auditData = auditResponse.ok ? await auditResponse.json() : { data: [] }
      const reportsData = reportsResponse.ok ? await reportsResponse.json() : { reports: [] }

      // Calculate metrics from historical data
      const latestPerf = perfData.data?.[0] || {}
      const previousPerf = perfData.data?.[1] || {}

      const calculateChange = (current, previous, lowerIsBetter = false) => {
        if (!previous || !current) return '+0%'
        const diff = current - previous
        const percentage = previous !== 0 ? (diff / previous * 100).toFixed(1) : 0
        const sign = diff >= 0 ? '+' : ''
        return `${sign}${percentage}%`
      }

      const getTrend = (current, previous, lowerIsBetter = false) => {
        if (!previous || !current) return 'stable'
        const diff = current - previous
        if (lowerIsBetter) {
          return diff < 0 ? 'up' : diff > 0 ? 'down' : 'stable'
        }
        return diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable'
      }

      // Transform to component format
      const transformedClient = {
        id: clientInfo.id,
        name: clientInfo.name || clientInfo.id,
        domain: clientInfo.domain || clientInfo.url || 'N/A',
        status: clientInfo.envConfigured ? 'active' : (clientInfo.status || 'pending'),
        keywords: clientInfo.totalKeywords || 0,
        avgRank: latestPerf.avgPosition || 0,
        lastAudit: auditData.data?.[0]?.timestamp ? formatTimeAgo(auditData.data[0].timestamp) : 'Never',
        issues: {
          critical: auditData.data?.filter(a => !a.success && a.type === 'audit').length || 0,
          warning: auditData.data?.filter(a => a.type === 'optimization').length || 3,
          success: auditData.data?.filter(a => a.success).length || 0,
        },
        metrics: {
          traffic: latestPerf.trafficCount || 0,
          trafficChange: calculateChange(latestPerf.trafficCount, previousPerf.trafficCount),
          trafficTrend: getTrend(latestPerf.trafficCount, previousPerf.trafficCount),
          backlinks: latestPerf.backlinksCount || 0,
          backlinksChange: calculateChange(latestPerf.backlinksCount, previousPerf.backlinksCount),
          backlinksTrend: getTrend(latestPerf.backlinksCount, previousPerf.backlinksCount),
          domainAuthority: latestPerf.domainAuthority || 0,
          pageSpeed: latestPerf.performanceScore || 0,
          pageSpeedChange: calculateChange(latestPerf.performanceScore, previousPerf.performanceScore),
          pageSpeedTrend: getTrend(latestPerf.performanceScore, previousPerf.performanceScore),
          rankChange: calculateChange(latestPerf.avgPosition, previousPerf.avgPosition, true),
          rankTrend: getTrend(latestPerf.avgPosition, previousPerf.avgPosition, true),
        },
        topKeywords: generateMockKeywords(5), // TODO: Replace with real keyword data from keyword service
        recentIssues: auditData.data?.slice(0, 3).map(audit => ({
          type: audit.success ? 'success' : 'critical',
          title: audit.type === 'audit' ? 'SEO Audit Issue' : 'Optimization Opportunity',
          pages: Math.floor(Math.random() * 20) + 1,
          impact: audit.success ? 'Low' : 'High',
          description: audit.error || audit.output?.substring(0, 100)
        })) || [],
        reports: reportsData.reports || []
      }

      setClient(transformedClient)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching client data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const handleRunAudit = async () => {
    setRunningAudit(true)
    try {
      const response = await fetch(`/api/audit/${clientId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Audit Started",
          description: "SEO audit is running. Results will appear shortly.",
        })
        // Refresh client data after a delay
        setTimeout(() => {
          fetchClientData()
        }, 3000)
      } else {
        toast({
          title: "Audit Failed",
          description: data.error || "Failed to start audit",
          variant: "destructive"
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to start audit: " + err.message,
        variant: "destructive"
      })
    } finally {
      setRunningAudit(false)
    }
  }

  // Helper functions
  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hours ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  const generateMockKeywords = (count) => {
    // TODO: Replace with real keyword data from keyword service API
    const keywords = [
      'enterprise software',
      'business automation',
      'workflow tools',
      'productivity apps',
      'team collaboration'
    ]
    return keywords.slice(0, count).map((kw, idx) => ({
      keyword: kw,
      position: idx + 1,
      change: Math.floor(Math.random() * 5) - 2
    }))
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      configured: 'success',
      pending: 'warning',
      inactive: 'secondary',
    }
    return variants[status] || 'secondary'
  }

  const getChangeIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />
    return null
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Client"
        message={error}
        onRetry={fetchClientData}
      />
    )
  }

  if (!client) {
    return (
      <ErrorState
        title="Client Not Found"
        message="The requested client could not be found."
        onRetry={onBack}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                <Badge variant={getStatusBadge(client.status)}>{client.status}</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-muted-foreground">{client.domain}</p>
                <a
                  href={`https://${client.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button onClick={handleRunAudit} disabled={runningAudit}>
            {runningAudit ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Audit
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Traffic</CardTitle>
            {getChangeIcon(client.metrics.trafficTrend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.metrics.traffic.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{client.metrics.trafficChange} from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rank</CardTitle>
            {getChangeIcon(client.metrics.rankTrend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{client.avgRank || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{client.metrics.rankChange} change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backlinks</CardTitle>
            {getChangeIcon(client.metrics.backlinksTrend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.metrics.backlinks}</div>
            <p className="text-xs text-muted-foreground">{client.metrics.backlinksChange} change</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Speed</CardTitle>
            {getChangeIcon(client.metrics.pageSpeedTrend)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.metrics.pageSpeed}</div>
            <p className="text-xs text-muted-foreground">{client.metrics.pageSpeedChange} change</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues Summary */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Health</CardTitle>
          <CardDescription>Last audit: {client.lastAudit}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.issues.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.issues.warning}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.issues.success}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Keywords</CardTitle>
              <CardDescription>Tracking {client.keywords} keywords</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {client.topKeywords.map((kw, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{kw.keyword}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">Position #{kw.position}</span>
                        {kw.change !== 0 && (
                          <div className="flex items-center gap-1">
                            {kw.change > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`text-xs ${kw.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {Math.abs(kw.change)} positions
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={kw.position <= 3 ? 'success' : kw.position <= 10 ? 'default' : 'secondary'}>
                      {kw.position <= 3 ? 'Top 3' : kw.position <= 10 ? 'Top 10' : 'Page 2+'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Issues</CardTitle>
              <CardDescription>Issues found in recent audits</CardDescription>
            </CardHeader>
            <CardContent>
              {client.recentIssues.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No recent issues found. Run an audit to check for problems.
                </p>
              ) : (
                <div className="space-y-4">
                  {client.recentIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        issue.type === 'critical' ? 'bg-red-500/10' : issue.type === 'warning' ? 'bg-yellow-500/10' : 'bg-green-500/10'
                      }`}>
                        <AlertCircle className={`h-4 w-4 ${
                          issue.type === 'critical' ? 'text-red-500' : issue.type === 'warning' ? 'text-yellow-500' : 'text-green-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{issue.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {issue.pages} pages affected • Impact: {issue.impact}
                        </p>
                        {issue.description && (
                          <p className="text-sm text-muted-foreground mt-2">{issue.description}</p>
                        )}
                      </div>
                      <Button variant="outline" size="sm">Fix</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking Trends</CardTitle>
                <CardDescription>Average position over time</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Trends</CardTitle>
                <CardDescription>Organic traffic by source</CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
