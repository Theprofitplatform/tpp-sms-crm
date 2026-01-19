// ReportsPage.jsx
// Displays trading reports including daily summaries and performance metrics
// Dependencies: React, axios, lucide-react, custom UI components

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  DollarSign
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/data-display/StatCard'
import { PriceDisplay } from '@/components/data-display/PriceDisplay'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonStatCard, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { formatCurrency, formatPercent, formatDate } from '@/utils/formatters'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState([])
  const [latestReport, setLatestReport] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [reportsRes, latestRes] = await Promise.allSettled([
        axios.get(API.ops.reports.daily(), { timeout: 5000 }),
        axios.get(API.ops.reports.latest(), { timeout: 5000 }),
      ])

      if (reportsRes.status === 'fulfilled') {
        setReports(reportsRes.value.data || [])
      }
      if (latestRes.status === 'fulfilled') {
        setLatestReport(latestRes.value.data)
      }

      const failed = [reportsRes, latestRes].filter(r => r.status === 'rejected')
      if (failed.length === 2) {
        setError('Failed to connect to services')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reports')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      await axios.post(API.ops.reports.generate())
      toast.success({
        title: 'Report Generated',
        description: 'Daily report has been generated successfully'
      })
      await fetchData()
    } catch (err) {
      toast.error({
        title: 'Generation Failed',
        description: err.response?.data?.error || err.message
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadReport = (report) => {
    // For now, just show a toast - actual implementation would depend on backend
    toast.info({
      title: 'Download Started',
      description: `Downloading report for ${formatDate(report.date)}`
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Reports</h1>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <SkeletonStatCard key={i} />)}
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
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">Trading performance and daily summaries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            aria-label="Refresh reports"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={generating}
          >
            <FileText className={cn("mr-2 h-4 w-4", generating && "animate-pulse")} aria-hidden="true" />
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
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

      {/* Latest Report Summary */}
      {latestReport && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={latestReport.pnl >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            label="Today's P&L"
            value={formatCurrency(latestReport.pnl, { showSign: true })}
            variant={latestReport.pnl >= 0 ? 'positive' : 'negative'}
            ariaLabel={`Today's P&L: ${formatCurrency(latestReport.pnl, { showSign: true })}`}
          />
          <StatCard
            icon={<Activity className="h-6 w-6" />}
            label="Total Trades"
            value={latestReport.trades_count ?? 0}
            ariaLabel={`Total trades today: ${latestReport.trades_count ?? 0}`}
          />
          <StatCard
            icon={<Target className="h-6 w-6" />}
            label="Win Rate"
            value={latestReport.win_rate ? formatPercent(latestReport.win_rate * 100) : '--'}
            ariaLabel={`Win rate: ${latestReport.win_rate ? formatPercent(latestReport.win_rate * 100) : 'N/A'}`}
          />
          <StatCard
            icon={<DollarSign className="h-6 w-6" />}
            label="Max Drawdown"
            value={latestReport.max_drawdown ? formatPercent(latestReport.max_drawdown) : '--'}
            variant={latestReport.max_drawdown > 5 ? 'warning' : 'default'}
            ariaLabel={`Max drawdown: ${latestReport.max_drawdown ? formatPercent(latestReport.max_drawdown) : 'N/A'}`}
          />
        </div>
      )}

      {/* Detailed Latest Report */}
      {latestReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Latest Report - {formatDate(latestReport.date)}
            </CardTitle>
            <CardDescription>
              Generated {latestReport.generated_at ? formatDate(latestReport.generated_at, { time: true }) : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-4">
                <h4 className="font-medium text-muted-foreground">Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Gross P&L</span>
                    <PriceDisplay value={latestReport.gross_pnl} showSign />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Fees</span>
                    <span className="font-mono text-sm">
                      {formatCurrency(latestReport.fees || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Net P&L</span>
                    <PriceDisplay value={latestReport.pnl} showSign />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-muted-foreground">Trading Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Trades</span>
                    <span className="font-mono">{latestReport.trades_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Winning Trades</span>
                    <span className="font-mono text-green-500">{latestReport.winning_trades ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Losing Trades</span>
                    <span className="font-mono text-red-500">{latestReport.losing_trades ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-muted-foreground">Risk Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Sharpe Ratio</span>
                    <span className="font-mono">{latestReport.sharpe_ratio?.toFixed(2) ?? '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Drawdown</span>
                    <span className="font-mono">{latestReport.max_drawdown ? formatPercent(latestReport.max_drawdown) : '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Trade Duration</span>
                    <span className="font-mono">{latestReport.avg_trade_duration ?? '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report History
          </CardTitle>
          <CardDescription>Historical trading reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No reports available"
              description="Generate a daily report to see trading performance"
              action={{
                label: 'Generate Report',
                onClick: handleGenerateReport
              }}
            />
          ) : (
            <Table aria-label="Reports history table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report, index) => (
                  <TableRow key={report.id || index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(report.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.type || 'Daily'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay value={report.pnl} showSign />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {report.trades_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {report.win_rate ? formatPercent(report.win_rate * 100) : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadReport(report)}
                        aria-label={`Download report for ${formatDate(report.date)}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
