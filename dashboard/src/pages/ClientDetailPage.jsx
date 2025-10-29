import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

import { clientAPI, analyticsAPI, keywordAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

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
  RefreshCw
} from 'lucide-react'

export default function ClientDetailPage({ clientId, onBack }) {
  const { toast } = useToast()
  const [runningAudit, setRunningAudit] = useState(false)

  // API Requests
  const { data: clientData, loading: loadingClient, refetch: refetchClient } = useAPIData(
    () => clientAPI.getById(clientId),
    { autoFetch: true }
  )

  const { data: performanceData, loading: loadingPerf } = useAPIData(
    () => analyticsAPI.getClientPerformance(clientId, 10),
    { autoFetch: true }
  )

  const { data: auditsData, loading: loadingAudits } = useAPIData(
    () => analyticsAPI.getClientAudits(clientId, 10),
    { autoFetch: true }
  )

  const { data: keywordsData, loading: loadingKeywords } = useAPIData(
    () => keywordAPI.getClientKeywords(clientId, 10),
    { autoFetch: true }
  )

  const { execute: runAudit } = useAPIRequest()
  const { execute: runOptimization } = useAPIRequest()

  const loading = loadingClient || loadingPerf || loadingAudits || loadingKeywords

  const client = clientData?.client
  const performance = performanceData?.data || []
  const audits = auditsData?.data || []
  const keywords = keywordsData?.keywords || []

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!performance.length) return null

    const latest = performance[0] || {}
    const previous = performance[1] || {}

    const calculateChange = (current, previous, lowerIsBetter = false) => {
      if (!previous || !current) return '+0%'
      const diff = current - previous
      const percentage = previous !== 0 ? (diff / previous * 100).toFixed(1) : 0
      return `${diff >= 0 ? '+' : ''}${percentage}%`
    }

    return {
      traffic: latest.trafficCount || 0,
      trafficChange: calculateChange(latest.trafficCount, previous.trafficCount),
      trafficTrend: (latest.trafficCount || 0) >= (previous.trafficCount || 0) ? 'up' : 'down',
      backlinks: latest.backlinksCount || 0,
      backlinksChange: calculateChange(latest.backlinksCount, previous.backlinksCount),
      backlinksTrend: (latest.backlinksCount || 0) >= (previous.backlinksCount || 0) ? 'up' : 'down',
      avgRank: latest.avgPosition || 0,
      rankChange: calculateChange(latest.avgPosition, previous.avgPosition, true),
      rankTrend: (latest.avgPosition || 0) <= (previous.avgPosition || 0) ? 'up' : 'down',
      pageSpeed: latest.performanceScore || 0
    }
  }, [performance])

  // Calculate issues
  const issues = useMemo(() => {
    const criticalAudits = audits.filter(a => !a.success && a.type === 'audit')
    const warnings = audits.filter(a => a.type === 'optimization')
    const successes = audits.filter(a => a.success)

    return {
      critical: criticalAudits.length,
      warning: warnings.length,
      success: successes.length
    }
  }, [audits])

  const handleRunAudit = useCallback(async () => {
    setRunningAudit(true)

    await runAudit(
      () => clientAPI.runAudit(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Audit started successfully',
        onSuccess: () => {
          setTimeout(() => {
            refetchClient()
            setRunningAudit(false)
          }, 3000)
        },
        onError: () => {
          setRunningAudit(false)
        }
      }
    )
  }, [clientId, runAudit, refetchClient])

  const handleRunOptimization = useCallback(async () => {
    await runOptimization(
      () => clientAPI.runOptimization(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Optimization started successfully',
        onSuccess: () => {
          refetchClient()
        }
      }
    )
  }, [clientId, runOptimization, refetchClient])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading client details...</span>
      </div>
    )
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Client Not Found</h3>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name || client.id}</h1>
            <a
              href={`https://${client.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:underline flex items-center gap-1"
            >
              {client.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRunAudit} disabled={runningAudit}>
            {runningAudit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run Audit
          </Button>
          <Button variant="outline" onClick={handleRunOptimization}>
            <Settings className="h-4 w-4 mr-2" />
            Optimize
          </Button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Traffic</CardTitle>
              {metrics.trafficTrend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.traffic.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{metrics.trafficChange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Rank</CardTitle>
              {metrics.rankTrend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgRank}</div>
              <p className="text-xs text-muted-foreground">{metrics.rankChange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Backlinks</CardTitle>
              {metrics.backlinksTrend === 'up' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.backlinks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{metrics.backlinksChange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Page Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pageSpeed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issues Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Issues Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium">{issues.critical} Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">{issues.warning} Warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">{issues.success} Passed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="keywords">
        <TabsList>
          <TabsTrigger value="keywords">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>Top Keywords</CardTitle>
              <CardDescription>Best performing keywords</CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No keywords data available</p>
              ) : (
                <div className="space-y-2">
                  {keywords.map((kw, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border-b">
                      <span className="font-medium">{kw.keyword}</span>
                      <Badge>{kw.search_volume || 0} vol</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>Recent audit results</CardDescription>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No audits performed yet</p>
              ) : (
                <div className="space-y-2">
                  {audits.map((audit, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{audit.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(audit.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={audit.success ? 'default' : 'destructive'}>
                        {audit.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
