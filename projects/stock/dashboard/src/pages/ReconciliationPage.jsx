// ReconciliationPage.jsx
// Displays reconciliation status, history, and allows manual reconciliation runs
// Dependencies: React, axios, lucide-react, custom UI components

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { API } from '@/config/api'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  History
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
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { SkeletonStatCard, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton'
import { formatDate } from '@/utils/formatters'

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [jobStatus, setJobStatus] = useState({ running: false })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [statusRes, historyRes, jobRes] = await Promise.allSettled([
        axios.get(API.exec.reconciliation.status(), { timeout: 5000 }),
        axios.get(API.exec.reconciliation.history(), { timeout: 5000 }),
        axios.get(API.ops.reconciliation.status(), { timeout: 5000 }),
      ])

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data)
      }
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data || [])
      }
      if (jobRes.status === 'fulfilled') {
        setJobStatus(jobRes.value.data || { running: false })
      }

      const failed = [statusRes, historyRes, jobRes].filter(r => r.status === 'rejected')
      if (failed.length === 3) {
        setError('Failed to connect to services')
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reconciliation data')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRunReconciliation = async () => {
    setRunning(true)
    try {
      await axios.post(API.exec.reconciliation.run())
      toast.success({ title: 'Reconciliation Complete', description: 'Positions have been reconciled' })
      await fetchData()
    } catch (err) {
      toast.error({
        title: 'Reconciliation Failed',
        description: err.response?.data?.error || err.message
      })
    } finally {
      setRunning(false)
    }
  }

  const handleStartJob = async () => {
    try {
      await axios.post(API.ops.reconciliation.start())
      toast.success({ title: 'Job Started', description: 'Scheduled reconciliation is now running' })
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Failed to start job',
        description: err.response?.data?.error || err.message
      })
    }
  }

  const handleStopJob = async () => {
    try {
      await axios.post(API.ops.reconciliation.stop())
      toast.success({ title: 'Job Stopped', description: 'Scheduled reconciliation has been stopped' })
      fetchData()
    } catch (err) {
      toast.error({
        title: 'Failed to stop job',
        description: err.response?.data?.error || err.message
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Reconciliation</h1>
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
          <RefreshCw className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Reconciliation</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            aria-label="Refresh reconciliation data"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            onClick={handleRunReconciliation}
            disabled={running}
          >
            <Play className={cn("mr-2 h-4 w-4", running && "animate-pulse")} aria-hidden="true" />
            {running ? 'Running...' : 'Run Now'}
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

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          label="Last Run"
          value={status?.last_run ? formatDate(status.last_run, { time: true }) : 'Never'}
          ariaLabel={`Last reconciliation: ${status?.last_run ? formatDate(status.last_run, { time: true }) : 'Never'}`}
        />
        <StatCard
          icon={status?.discrepancies > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
          label="Discrepancies"
          value={status?.discrepancies ?? 0}
          variant={status?.discrepancies > 0 ? 'danger' : 'success'}
          ariaLabel={`Discrepancies found: ${status?.discrepancies ?? 0}`}
        />
        <StatCard
          icon={<History className="h-6 w-6" />}
          label="Total Runs"
          value={history.length}
          ariaLabel={`Total reconciliation runs: ${history.length}`}
        />
        <Card className="flex flex-col justify-center">
          <CardHeader className="pb-2">
            <CardDescription>Scheduled Job</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <StatusBadge status={jobStatus?.running ? 'active' : 'inactive'} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobStatus?.running ? (
              <Button size="sm" variant="outline" onClick={handleStopJob}>
                <Pause className="mr-2 h-4 w-4" />
                Stop Job
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleStartJob}>
                <Play className="mr-2 h-4 w-4" />
                Start Job
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Reconciliation History
          </CardTitle>
          <CardDescription>Recent reconciliation runs and their results</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No reconciliation history"
              description="Run a reconciliation to compare internal positions with your broker"
            />
          ) : (
            <Table aria-label="Reconciliation history table">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                  <TableHead className="text-right">Discrepancies</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((run, index) => (
                  <TableRow key={run.id || index}>
                    <TableCell>
                      {formatDate(run.timestamp || run.created_at, { time: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {run.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : run.status === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant={
                          run.status === 'success' ? 'default' :
                          run.status === 'warning' ? 'warning' : 'destructive'
                        }>
                          {run.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {run.positions_checked ?? '-'}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono",
                      run.discrepancies > 0 && "text-red-500 font-semibold"
                    )}>
                      {run.discrepancies ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.duration_ms ? `${run.duration_ms}ms` : '-'}
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
