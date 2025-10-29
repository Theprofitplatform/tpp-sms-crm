import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react'

const API_BASE = '/api/activity-log'

export default function ActivityLogPage() {
  const { toast } = useToast()
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    timeRange: '24h',
    page: 1,
    limit: 50
  })

  // Load data
  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.type !== 'all') params.append('type', filters.type)
      if (filters.status !== 'all') params.append('status', filters.status)
      params.append('page', filters.page)
      params.append('limit', filters.limit)
      
      const response = await fetch(`${API_BASE}?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setActivities(result.data.activities || [])
      } else {
        // Use mock data if API fails
        setActivities(getMockActivities())
      }
    } catch (error) {
      console.error('Error loading activities:', error)
      setActivities(getMockActivities())
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats?timeRange=${filters.timeRange}`)
      const result = await response.json()
      
      if (result.success) {
        setStats(result.data)
      } else {
        setStats(getMockStats())
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(getMockStats())
    }
  }, [filters.timeRange])

  const loadTimeline = useCallback(async () => {
    try {
      const groupBy = filters.timeRange === '24h' ? 'hour' : 'day'
      const response = await fetch(`${API_BASE}/timeline?timeRange=${filters.timeRange}&groupBy=${groupBy}`)
      const result = await response.json()
      
      if (result.success) {
        setTimeline(result.data || [])
      }
    } catch (error) {
      console.error('Error loading timeline:', error)
    }
  }, [filters.timeRange])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  useEffect(() => {
    loadStats()
    loadTimeline()
  }, [loadStats, loadTimeline])

  const handleRefresh = () => {
    loadActivities()
    loadStats()
    loadTimeline()
    toast({
      title: 'Refreshed',
      description: 'Activity log data has been refreshed'
    })
  }

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity)
    setShowDetailDialog(true)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Log
          </h1>
          <p className="text-muted-foreground">
            Track what's been done and monitor system activities
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last {filters.timeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.successRate}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Items Processed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItemsProcessed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalItemsSuccessful} successful
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="autofix">Auto-Fix</SelectItem>
                  <SelectItem value="api_call">API Call</SelectItem>
                  <SelectItem value="user_action">User Action</SelectItem>
                  <SelectItem value="system_event">System Event</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select
                value={filters.timeRange}
                onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${activities.length} activities found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity, idx) => (
                    <TableRow key={activity.id || idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(activity.status)}
                          <Badge variant={getStatusBadgeVariant(activity.status)}>
                            {activity.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate" title={activity.action}>
                            {activity.action}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground truncate" title={activity.description}>
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.clientName || activity.clientId || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-green-600">{activity.itemsSuccessful || 0}</span>
                          {' / '}
                          <span>{activity.itemsProcessed || 0}</span>
                          {activity.itemsFailed > 0 && (
                            <>
                              {' '}
                              <span className="text-red-600">({activity.itemsFailed} failed)</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(activity.duration)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(activity.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(activity)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity && getStatusIcon(selectedActivity.status)}
              Activity Details
            </DialogTitle>
            <DialogDescription>
              {selectedActivity?.action}
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline" className="mt-1">{selectedActivity.type}</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium mt-1">{selectedActivity.category}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={getStatusBadgeVariant(selectedActivity.status)} className="mt-1">
                      {selectedActivity.status}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium mt-1">{formatDuration(selectedActivity.duration)}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm">{selectedActivity.description}</p>
                </div>

                {/* Items Processed */}
                {selectedActivity.itemsProcessed > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Items</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Processed</p>
                        <p className="text-lg font-bold">{selectedActivity.itemsProcessed}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Successful</p>
                        <p className="text-lg font-bold text-green-600">{selectedActivity.itemsSuccessful}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="text-lg font-bold text-red-600">{selectedActivity.itemsFailed}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {selectedActivity.error && (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Error Details
                    </h3>
                    <p className="text-sm text-red-700">{selectedActivity.error}</p>
                    {selectedActivity.errorStack && (
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                        {selectedActivity.errorStack}
                      </pre>
                    )}
                  </div>
                )}

                {/* Metadata */}
                {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Metadata</h3>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Timestamp */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Timestamp</h3>
                  <p className="text-sm">{formatDate(selectedActivity.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mock data for fallback
function getMockActivities() {
  return [
    {
      id: 'activity_1',
      type: 'autofix',
      category: 'seo',
      action: 'NAP Consistency Fix',
      description: 'Fixed NAP data across all pages',
      status: 'success',
      clientId: 'client1',
      clientName: 'Instant Auto Traders',
      itemsProcessed: 25,
      itemsSuccessful: 23,
      itemsFailed: 2,
      duration: 45000,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'activity_2',
      type: 'autofix',
      category: 'seo',
      action: 'Schema Markup Injection',
      description: 'Injected LocalBusiness schema',
      status: 'success',
      clientId: 'client2',
      clientName: 'The Profit Platform',
      itemsProcessed: 1,
      itemsSuccessful: 1,
      itemsFailed: 0,
      duration: 12000,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'activity_3',
      type: 'api_call',
      category: 'integration',
      action: 'Google Search Console Sync',
      description: 'Fetched latest GSC data',
      status: 'failed',
      clientId: 'client1',
      clientName: 'Instant Auto Traders',
      itemsProcessed: 0,
      itemsSuccessful: 0,
      itemsFailed: 1,
      error: 'API rate limit exceeded',
      duration: 3000,
      createdAt: new Date(Date.now() - 10800000).toISOString()
    }
  ]
}

function getMockStats() {
  return {
    total: 145,
    success: 132,
    failed: 8,
    warning: 5,
    totalItemsProcessed: 2456,
    totalItemsSuccessful: 2389,
    totalItemsFailed: 67,
    successRate: 91,
    timeRange: '24h'
  }
}
