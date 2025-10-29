import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

import { clientAPI, analyticsAPI, schedulerAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { POLLING_INTERVALS } from '@/constants'

import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Calendar,
  Settings,
  TrendingUp,
  Activity,
  Sparkles,
  Globe,
  Mail,
  Target,
  MapPin,
  FileText,
  Loader2
} from 'lucide-react'

export default function ControlCenterPage() {
  const { toast } = useToast()
  const pollInterval = useRef(null)

  // API Requests
  const { data: clientsData, loading: loadingClients, refetch: refetchClients } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { data: jobsData, loading: loadingJobs, refetch: refetchJobs } = useAPIData(
    () => schedulerAPI.getActiveJobs(),
    { autoFetch: true }
  )

  const { data: scheduledData, loading: loadingScheduled } = useAPIData(
    () => schedulerAPI.getScheduled(),
    { autoFetch: true }
  )

  const { data: historyData, loading: loadingHistory } = useAPIData(
    () => schedulerAPI.getHistory(50),
    { autoFetch: true }
  )

  const { execute: runQuickAction } = useAPIRequest()
  const { execute: stopJob } = useAPIRequest()

  const clients = clientsData?.clients || []
  const activeJobs = jobsData?.jobs || []
  const scheduledJobs = scheduledData?.scheduled || []
  const jobHistory = historyData?.history || []
  const loading = loadingClients || loadingJobs || loadingScheduled || loadingHistory

  // Poll for active jobs
  useEffect(() => {
    if (activeJobs.length > 0) {
      pollInterval.current = setInterval(() => {
        refetchJobs()
      }, POLLING_INTERVALS.SHORT)
    } else if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [activeJobs.length, refetchJobs])

  const handleQuickAction = useCallback(async (clientId, action) => {
    await runQuickAction(
      () => action === 'audit' ? clientAPI.runAudit(clientId) : clientAPI.runOptimization(clientId),
      {
        showSuccessToast: true,
        successMessage: `${action} started successfully`,
        onSuccess: () => {
          refetchJobs()
          refetchClients()
        }
      }
    )
  }, [runQuickAction, refetchJobs, refetchClients])

  const handleStopJob = useCallback(async (jobId) => {
    await stopJob(
      () => schedulerAPI.stopJob(jobId),
      {
        showSuccessToast: true,
        successMessage: 'Job stopped successfully',
        onSuccess: () => refetchJobs()
      }
    )
  }, [stopJob, refetchJobs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading control center...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Control Center
          </h1>
          <p className="text-muted-foreground">
            Monitor and control all SEO automation operations
          </p>
        </div>
        <Button onClick={() => { refetchClients(); refetchJobs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledJobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobHistory.filter(j => j.status === 'completed' && 
                new Date(j.endTime).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
          <CardDescription>Currently running operations</CardDescription>
        </CardHeader>
        <CardContent>
          {activeJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No active jobs running</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge>{job.type}</Badge>
                      <span className="font-medium">{job.clientName || job.clientId}</span>
                    </div>
                    <Progress value={job.progress || 0} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.progress || 0}% complete
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleStopJob(job.id)}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Start operations for your clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {clients.slice(0, 6).map(client => (
              <div key={client.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{client.name || client.id}</p>
                  <p className="text-sm text-muted-foreground">{client.domain || client.url}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction(client.id, 'audit')}>
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleQuickAction(client.id, 'optimize')}>
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
          <CardDescription>Latest completed jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {jobHistory.slice(0, 10).map((job, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2">
                  {job.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{job.type} - {job.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.endTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
