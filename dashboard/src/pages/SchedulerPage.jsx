import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { schedulerAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2,
  Activity
} from 'lucide-react'

export default function SchedulerPage() {
  const { toast } = useToast()
  const [runningJob, setRunningJob] = useState(null)

  // API Requests
  const { data: schedulerData, loading, error, refetch } = useAPIData(
    () => schedulerAPI.getJobs(),
    { autoFetch: true }
  )

  const { execute: toggleJob } = useAPIRequest()
  const { execute: runJob } = useAPIRequest()

  const jobs = schedulerData?.jobs || []

  // Calculate stats
  const stats = useMemo(() => {
    const calculateSuccessRate = (jobs) => {
      const jobsWithRuns = jobs.filter(j => j.totalRuns > 0)
      if (jobsWithRuns.length === 0) return 100

      const totalRuns = jobsWithRuns.reduce((sum, j) => sum + j.totalRuns, 0)
      const successfulRuns = jobsWithRuns.reduce((sum, j) => sum + j.successfulRuns, 0)

      return ((successfulRuns / totalRuns) * 100).toFixed(1)
    }

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.enabled).length,
      successRate: calculateSuccessRate(jobs),
      lastRun: schedulerData?.lastRun
    }
  }, [jobs, schedulerData])

  const handleToggleJob = useCallback(async (jobId, enabled) => {
    await toggleJob(
      () => schedulerAPI.toggleJob(jobId, enabled),
      {
        showSuccessToast: true,
        successMessage: `Job ${enabled ? 'enabled' : 'disabled'}`,
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [toggleJob, refetch])

  const handleRunJob = useCallback(async (jobId) => {
    setRunningJob(jobId)
    
    await runJob(
      () => schedulerAPI.runJob(jobId),
      {
        showSuccessToast: true,
        successMessage: 'Job started successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
    
    setRunningJob(null)
  }, [runJob, refetch])

  const getStatusColor = useCallback((enabled) => {
    return enabled ? 'default' : 'secondary'
  }, [])

  const formatSchedule = useCallback((schedule) => {
    if (!schedule) return 'Not scheduled'
    
    // Convert cron to human readable
    const patterns = {
      '*/5 * * * *': 'Every 5 minutes',
      '0 * * * *': 'Every hour',
      '0 0 * * *': 'Daily at midnight',
      '0 2 * * *': 'Daily at 2:00 AM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st'
    }
    
    return patterns[schedule] || schedule
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading scheduler...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Automation Scheduler
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Automation Scheduler
          </h1>
          <p className="text-muted-foreground">
            Manage automated tasks and schedules
          </p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {stats.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>Automated tasks and their schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Configured</h3>
              <p className="text-muted-foreground">
                No scheduled jobs found
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatSchedule(job.schedule)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={(checked) => handleToggleJob(job.id, checked)}
                        />
                        <Badge variant={getStatusColor(job.enabled)}>
                          {job.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.lastRun
                        ? new Date(job.lastRun).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {job.nextRun
                        ? new Date(job.nextRun).toLocaleString()
                        : 'Not scheduled'}
                    </TableCell>
                    <TableCell>
                      {job.totalRuns > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {((job.successfulRuns / job.totalRuns) * 100).toFixed(0)}%
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({job.successfulRuns}/{job.totalRuns})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunJob(job.id)}
                        disabled={runningJob === job.id || !job.enabled}
                      >
                        {runningJob === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
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
