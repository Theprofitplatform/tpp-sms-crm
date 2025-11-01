import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

import { analyticsAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  TrendingUp,
  TrendingDown,
  Search,
  MousePointerClick,
  Eye,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink,
  Loader2
} from 'lucide-react'

export default function GoogleSearchConsolePage() {
  const { toast } = useToast()

  // API Requests
  const { data: gscData, loading, refetch } = useAPIData(
    () => analyticsAPI.getGSCSummary(),
    { autoFetch: true }
  )

  const { execute: syncGSC, loading: syncing } = useAPIRequest()

  const summary = useMemo(() => {
    if (!gscData) return { totalClicks: 0, totalImpressions: 0, avgCTR: 0, avgPosition: 0 }

    const totalClicks = Number(gscData.totalClicks) || 0
    const totalImpressions = Number(gscData.totalImpressions) || 0
    const avgPosition = Number(gscData.avgPosition) || 0

    // Calculate CTR safely
    let avgCTR = 0
    if (totalImpressions > 0 && totalClicks >= 0) {
      const ctr = (totalClicks / totalImpressions) * 100
      avgCTR = isFinite(ctr) ? Number(ctr.toFixed(2)) : 0
    }

    return {
      totalClicks,
      totalImpressions,
      avgCTR,
      avgPosition: isFinite(avgPosition) && avgPosition > 0 ? Number(avgPosition.toFixed(1)) : 0
    }
  }, [gscData])

  const handleSync = useCallback(async () => {
    await syncGSC(
      () => analyticsAPI.syncGSC(),
      {
        showSuccessToast: true,
        successMessage: 'GSC data synced successfully',
        onSuccess: () => refetch()
      }
    )
  }, [syncGSC, refetch])

  const handleExport = useCallback(() => {
    const csvContent = generateCSV(gscData)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = `gsc-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      toast({
        title: 'Export Started',
        description: 'Downloading GSC report...'
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [gscData, toast])

  const generateCSV = (data) => {
    let csv = 'Query,Clicks,Impressions,CTR,Position\n'
    ;(data?.topQueries || []).forEach(q => {
      csv += `"${q.query}",${q.clicks},${q.impressions},${q.ctr},${q.position}\n`
    })
    return csv
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading GSC data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Search Console</h1>
          <p className="text-muted-foreground">
            Real-time search performance data from Google
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgCTR}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Position</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgPosition}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Queries</CardTitle>
          <CardDescription>Best performing search queries</CardDescription>
        </CardHeader>
        <CardContent>
          {(!gscData?.topQueries || gscData.topQueries.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No GSC data available. Click Sync Now to fetch data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Position</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gscData.topQueries.map((query, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{query.query}</TableCell>
                    <TableCell>{query.clicks}</TableCell>
                    <TableCell>{query.impressions}</TableCell>
                    <TableCell>{query.ctr}%</TableCell>
                    <TableCell>{query.position}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
