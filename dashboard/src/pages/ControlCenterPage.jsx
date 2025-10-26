import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Activity
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'

export function ControlCenterPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState([])
  const [activeJobs, setActiveJobs] = useState([])
  const [scheduledJobs, setScheduledJobs] = useState([])
  const [jobHistory, setJobHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({
    jobType: 'audit',
    clientIds: [],
    schedule: 'daily',
    time: '09:00',
    enabled: true
  })
  const [batchConfig, setBatchConfig] = useState({
    operation: 'audit',
    clientIds: []
  })

  useEffect(() => {
    fetchControlData()
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchControlData, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchControlData = async () => {
    try {
      // Fetch clients
      const dashResponse = await fetch('/api/dashboard')
      const dashData = await dashResponse.json()
      setClients(dashData.clients || [])

      // Mock active jobs (in real implementation, fetch from backend)
      const mockActiveJobs = [
        {
          id: 'job-1',
          type: 'audit',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          status: 'running',
          progress: 65,
          startTime: new Date(Date.now() - 120000),
          estimatedTime: 180000
        }
      ]

      // Mock scheduled jobs
      const mockScheduledJobs = [
        {
          id: 'schedule-1',
          type: 'audit',
          schedule: 'daily',
          time: '09:00',
          clients: ['instantautotraders', 'theprofitplatform'],
          enabled: true,
          nextRun: new Date(Date.now() + 86400000)
        },
        {
          id: 'schedule-2',
          type: 'optimization',
          schedule: 'weekly',
          time: '02:00',
          clients: ['all'],
          enabled: true,
          nextRun: new Date(Date.now() + 259200000)
        }
      ]

      // Mock job history
      const mockJobHistory = [
        {
          id: 'hist-1',
          type: 'batch-audit',
          status: 'completed',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 3000000),
          clientsProcessed: 4,
          successCount: 4,
          failCount: 0
        },
        {
          id: 'hist-2',
          type: 'scheduled-optimization',
          status: 'completed',
          startTime: new Date(Date.now() - 86400000),
          endTime: new Date(Date.now() - 86100000),
          clientsProcessed: 4,
          successCount: 3,
          failCount: 1
        },
        {
          id: 'hist-3',
          type: 'batch-audit',
          status: 'failed',
          startTime: new Date(Date.now() - 172800000),
          endTime: new Date(Date.now() - 172200000),
          clientsProcessed: 2,
          successCount: 0,
          failCount: 2,
          error: 'Connection timeout'
        }
      ]

      setActiveJobs(mockActiveJobs)
      setScheduledJobs(mockScheduledJobs)
      setJobHistory(mockJobHistory)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch control data:', error)
      toast({
        title: "Error Loading Data",
        description: "Could not fetch automation data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleBatchOperation = async () => {
    if (batchConfig.clientIds.length === 0) {
      toast({
        title: "No Clients Selected",
        description: "Please select at least one client.",
        variant: "destructive"
      })
      return
    }

    try {
      toast({
        title: "Batch Operation Started",
        description: `Running ${batchConfig.operation} on ${batchConfig.clientIds.length} clients...`,
      })

      // Execute batch operation
      const promises = batchConfig.clientIds.map(clientId => {
        if (batchConfig.operation === 'audit') {
          return api.client.runAudit(clientId)
        }
        // Add other operations here
        return Promise.resolve()
      })

      await Promise.all(promises)

      toast({
        title: "Batch Operation Complete",
        description: `Successfully processed ${batchConfig.clientIds.length} clients.`,
      })

      setShowBatchModal(false)
      setBatchConfig({ operation: 'audit', clientIds: [] })
      fetchControlData()
    } catch (error) {
      toast({
        title: "Batch Operation Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleScheduleJob = () => {
    // In real implementation, save to backend
    toast({
      title: "Job Scheduled",
      description: `${scheduleConfig.jobType} scheduled for ${scheduleConfig.schedule} at ${scheduleConfig.time}`,
    })
    setShowScheduleModal(false)
    setScheduleConfig({
      jobType: 'audit',
      clientIds: [],
      schedule: 'daily',
      time: '09:00',
      enabled: true
    })
  }

  const handleStopJob = (jobId) => {
    toast({
      title: "Job Stopped",
      description: "The running job has been cancelled.",
      variant: "destructive"
    })
    fetchControlData()
  }

  const handleToggleSchedule = (scheduleId, enabled) => {
    toast({
      title: enabled ? "Schedule Enabled" : "Schedule Disabled",
      description: `The scheduled job has been ${enabled ? 'enabled' : 'disabled'}.`,
    })
    fetchControlData()
  }

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'scheduled':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const stats = {
    activeJobs: activeJobs.length,
    scheduledJobs: scheduledJobs.filter(j => j.enabled).length,
    completedToday: jobHistory.filter(j => {
      const today = new Date()
      const jobDate = new Date(j.endTime)
      return jobDate.toDateString() === today.toDateString() && j.status === 'completed'
    }).length,
    successRate: jobHistory.length > 0
      ? Math.round((jobHistory.filter(j => j.status === 'completed').length / jobHistory.length) * 100)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Control Center</h1>
            <p className="text-muted-foreground">Loading automation data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Control Center</h1>
          <p className="text-muted-foreground">
            Manage automation workflows and batch operations
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Batch Operation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Run Batch Operation</DialogTitle>
                <DialogDescription>
                  Execute an operation on multiple clients at once
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Operation Type</Label>
                  <Select
                    value={batchConfig.operation}
                    onValueChange={(value) => setBatchConfig({ ...batchConfig, operation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audit">Run Audit</SelectItem>
                      <SelectItem value="optimization">Auto-Optimize</SelectItem>
                      <SelectItem value="report">Generate Reports</SelectItem>
                      <SelectItem value="sync">Sync Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Clients</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    {clients.map(client => (
                      <div key={client.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={`batch-${client.id}`}
                          checked={batchConfig.clientIds.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchConfig({
                                ...batchConfig,
                                clientIds: [...batchConfig.clientIds, client.id]
                              })
                            } else {
                              setBatchConfig({
                                ...batchConfig,
                                clientIds: batchConfig.clientIds.filter(id => id !== client.id)
                              })
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`batch-${client.id}`} className="text-sm cursor-pointer">
                          {client.name || client.id}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {batchConfig.clientIds.length} client(s) selected
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowBatchModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBatchOperation}>
                  Run Operation
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
            <DialogTrigger asChild>
              <Button>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Recurring Job</DialogTitle>
                <DialogDescription>
                  Set up automated tasks to run on a schedule
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select
                    value={scheduleConfig.jobType}
                    onValueChange={(value) => setScheduleConfig({ ...scheduleConfig, jobType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audit">SEO Audit</SelectItem>
                      <SelectItem value="optimization">Auto-Optimize</SelectItem>
                      <SelectItem value="report">Generate Reports</SelectItem>
                      <SelectItem value="backup">Backup Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={scheduleConfig.schedule}
                      onValueChange={(value) => setScheduleConfig({ ...scheduleConfig, schedule: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleConfig.time}
                      onChange={(e) => setScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={scheduleConfig.enabled}
                    onCheckedChange={(checked) => setScheduleConfig({ ...scheduleConfig, enabled: checked })}
                  />
                  <Label htmlFor="enabled">Enable immediately</Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleJob}>
                  Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledJobs}</div>
            <p className="text-xs text-muted-foreground">
              Active schedules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Jobs ({activeJobs.length})</CardTitle>
            <CardDescription>Currently running automation tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.map(job => (
                <div key={job.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getJobStatusIcon(job.status)}
                      <div>
                        <div className="font-medium">{job.clientName}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {job.type} • Started {formatDuration(Date.now() - job.startTime)} ago
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopJob(job.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs ({scheduledJobs.length})</CardTitle>
          <CardDescription>Recurring automation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledJobs.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No scheduled jobs yet</p>
              <Button className="mt-4" onClick={() => setShowScheduleModal(true)}>
                Schedule Your First Job
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledJobs.map(job => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium capitalize">{job.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {job.schedule} at {job.time} • {job.clients.length === 1 && job.clients[0] === 'all' ? 'All clients' : `${job.clients.length} clients`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-medium">Next Run</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(job.nextRun)}
                      </div>
                    </div>
                    <Switch
                      checked={job.enabled}
                      onCheckedChange={(checked) => handleToggleSchedule(job.id, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
          <CardDescription>Last completed automation tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {jobHistory.map(job => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getJobStatusIcon(job.status)}
                  <div>
                    <div className="font-medium capitalize">
                      {job.type.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(job.startTime)} • {formatDuration(job.endTime - job.startTime)} duration
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {job.successCount}/{job.clientsProcessed} successful
                    </div>
                    {job.error && (
                      <div className="text-xs text-red-500">{job.error}</div>
                    )}
                  </div>
                  <Badge variant={job.status === 'completed' ? 'default' : 'destructive'}>
                    {job.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
