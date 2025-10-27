import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'

export function SchedulerPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schedulerData, setSchedulerData] = useState({
    jobs: [],
    stats: {
      totalJobs: 0,
      activeJobs: 0,
      successRate: 0,
      lastRun: null
    }
  })

  useEffect(() => {
    fetchSchedulerData()
  }, [])

  const fetchSchedulerData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/scheduler/jobs')

      if (!response.ok) {
        throw new Error('Failed to fetch scheduler data')
      }

      const data = await response.json()

      setSchedulerData({
        jobs: data.jobs || [],
        stats: {
          totalJobs: data.jobs?.length || 0,
          activeJobs: data.jobs?.filter(j => j.enabled).length || 0,
          successRate: calculateSuccessRate(data.jobs || []),
          lastRun: data.lastRun
        }
      })
    } catch (err) {
      console.error('Error fetching scheduler data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateSuccessRate = (jobs) => {
    const jobsWithRuns = jobs.filter(j => j.totalRuns > 0)
    if (jobsWithRuns.length === 0) return 100

    const totalRuns = jobsWithRuns.reduce((sum, j) => sum + j.totalRuns, 0)
    const successfulRuns = jobsWithRuns.reduce((sum, j) => sum + j.successfulRuns, 0)

    return ((successfulRuns / totalRuns) * 100).toFixed(1)
  }

  const handleToggleJob = async (jobId, enabled) => {
    try {
      const response = await fetch(`/api/scheduler/jobs/${jobId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        await fetchSchedulerData()
      }
    } catch (err) {
      console.error('Toggle job error:', err)
    }
  }

  const handleRunNow = async (jobId) => {
    try {
      const response = await fetch(`/api/scheduler/jobs/${jobId}/run`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchSchedulerData()
      }
    } catch (err) {
      console.error('Run job error:', err)
    }
  }

  const getStatusBadge = (job) => {
    if (!job.enabled) {
      return <Badge variant="outline"><Pause className="h-3 w-3 mr-1" />Disabled</Badge>
    }
    if (job.running) {
      return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
    }
    if (job.lastRunSuccess === false) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
    }
    if (job.lastRunSuccess === true) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>
    }
    return <Badge variant="outline">Pending</Badge>
  }

  if (loading) return <LoadingState message="Loading scheduler..." />
  if (error) return <ErrorState message={error} onRetry={fetchSchedulerData} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Scheduler & Automation Jobs
          </h1>
          <p className="text-muted-foreground">
            Manage automated tasks and cron jobs
          </p>
        </div>
        <Button onClick={fetchSchedulerData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedulerData.stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">Scheduled tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{schedulerData.stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{schedulerData.stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Execution success</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Execution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {schedulerData.stats.lastRun
                ? new Date(schedulerData.stats.lastRun).toLocaleTimeString()
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent run</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>
            Configure and manage automation jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedulerData.jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled jobs configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulerData.jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {job.schedule}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(job)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.nextRun
                        ? new Date(job.nextRun).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.lastRun
                        ? new Date(job.lastRun).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {job.totalRuns > 0 ? (
                        <span className={
                          (job.successfulRuns / job.totalRuns) >= 0.9
                            ? 'text-green-600 font-medium'
                            : 'text-yellow-600 font-medium'
                        }>
                          {Math.round((job.successfulRuns / job.totalRuns) * 100)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={job.enabled}
                        onCheckedChange={(checked) => handleToggleJob(job.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunNow(job.id)}
                        disabled={job.running}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Execution History</CardTitle>
          <CardDescription>
            Latest job execution results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedulerData.jobs.filter(j => j.lastRun).slice(0, 10).map((job) => (
              <div key={job.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  {job.lastRunSuccess ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{job.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(job.lastRun).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {job.lastRunDuration ? `${job.lastRunDuration}ms` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Run #{job.totalRuns}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Cron Schedule Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Jobs use standard cron syntax: <code className="bg-muted px-1 py-0.5 rounded">minute hour day month weekday</code></p>
          <div className="grid gap-1 mt-2">
            <p><code className="bg-muted px-1 py-0.5 rounded">0 6 * * *</code> - Daily at 6:00 AM</p>
            <p><code className="bg-muted px-1 py-0.5 rounded">*/15 * * * *</code> - Every 15 minutes</p>
            <p><code className="bg-muted px-1 py-0.5 rounded">0 0 * * 0</code> - Weekly on Sunday at midnight</p>
            <p><code className="bg-muted px-1 py-0.5 rounded">0 0 1 * *</code> - Monthly on the 1st at midnight</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
