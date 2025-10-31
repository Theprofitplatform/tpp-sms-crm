import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Eye,
  FileText,
  BarChart3,
  Zap,
  RefreshCw,
  Loader2
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AIOptimizerPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedComparison, setSelectedComparison] = useState(null)
  const [optimizerData, setOptimizerData] = useState({
    queue: [],
    history: [],
    stats: {
      totalOptimizations: 0,
      successRate: 0,
      avgImprovement: 0,
      inProgress: 0
    },
    clients: []
  })

  // Refs to prevent stale closures
  const abortControllerRef = useRef(null)
  const intervalRef = useRef(null)

  // Memoized fetch function to prevent infinite loops
  const fetchOptimizerData = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController()

    try {
      setError(null)

      const response = await fetch('/api/ai-optimizer/status', {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('Failed to fetch optimizer data')
      }

      const data = await response.json()

      setOptimizerData({
        queue: data.queue || [],
        history: data.history || [],
        stats: {
          totalOptimizations: data.history?.length || 0,
          successRate: calculateSuccessRate(data.history || []),
          avgImprovement: calculateAvgImprovement(data.history || []),
          inProgress: data.queue?.filter(q => q.status === 'processing').length || 0
        },
        clients: data.clients || []
      })
    } catch (err) {
      // Don't show error for aborted requests
      if (err.name !== 'AbortError') {
        console.error('Error fetching optimizer data:', err)
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - function is stable

  const calculateSuccessRate = useCallback((history) => {
    if (history.length === 0) return 0
    const successful = history.filter(h => h.status === 'completed').length
    return ((successful / history.length) * 100).toFixed(1)
  }, [])

  const calculateAvgImprovement = useCallback((history) => {
    const completed = history.filter(h => h.status === 'completed' && h.improvement)
    if (completed.length === 0) return 0
    const sum = completed.reduce((acc, h) => acc + h.improvement, 0)
    return (sum / completed.length).toFixed(1)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchOptimizerData()
  }, [fetchOptimizerData])

  // FIXED: Polling logic separated into its own effect to prevent infinite loops
  useEffect(() => {
    // Only poll if there are jobs in progress
    const hasActiveJobs = optimizerData.stats.inProgress > 0 || 
                         optimizerData.queue.some(q => q.status === 'processing')

    if (hasActiveJobs) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Set up new polling interval
      intervalRef.current = setInterval(() => {
        fetchOptimizerData()
      }, 5000) // Poll every 5 seconds
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [optimizerData.stats.inProgress, optimizerData.queue, fetchOptimizerData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Clear polling interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleOptimize = useCallback(async () => {
    if (!selectedClient) {
      toast({
        title: 'Client Required',
        description: 'Please select a client first.',
        variant: 'destructive'
      })
      return
    }

    setOptimizing(true)
    try {
      const response = await fetch('/api/ai-optimizer/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: selectedClient,
          contentType: 'post'
        })
      })

      if (response.ok) {
        await fetchOptimizerData()
        setSelectedClient('')
        toast({
          title: 'Optimization Started',
          description: 'The optimization will take 5-10 seconds to complete.'
        })
      } else {
        throw new Error('Failed to start optimization')
      }
    } catch (err) {
      console.error('Optimization error:', err)
      toast({
        title: 'Optimization Failed',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setOptimizing(false)
    }
  }, [selectedClient, fetchOptimizerData, toast])

  const handleBulkOptimize = useCallback(async () => {
    if (!selectedClient) {
      toast({
        title: 'Client Required',
        description: 'Please select a client first.',
        variant: 'destructive'
      })
      return
    }

    setOptimizing(true)
    try {
      const response = await fetch('/api/ai-optimizer/bulk-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientId: selectedClient,
          limit: 10
        })
      })

      if (response.ok) {
        await fetchOptimizerData()
        toast({
          title: 'Bulk Optimization Started',
          description: 'Processing multiple optimizations...'
        })
      } else {
        throw new Error('Failed to start bulk optimization')
      }
    } catch (err) {
      console.error('Bulk optimization error:', err)
      toast({
        title: 'Bulk Optimization Failed',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setOptimizing(false)
    }
  }, [selectedClient, fetchOptimizerData, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading AI Optimizer...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Optimizer
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchOptimizerData}>
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
            <Sparkles className="h-8 w-8" />
            AI Optimizer
          </h1>
          <p className="text-muted-foreground">
            AI-powered content optimization
          </p>
        </div>
        <Button onClick={fetchOptimizerData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Optimizations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizerData.stats.totalOptimizations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizerData.stats.successRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{optimizerData.stats.avgImprovement}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizerData.stats.inProgress}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Optimize</CardTitle>
          <CardDescription>Start a new optimization job</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {optimizerData.clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleOptimize} disabled={optimizing || !selectedClient}>
              {optimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Optimize
                </>
              )}
            </Button>
            <Button onClick={handleBulkOptimize} disabled={optimizing || !selectedClient} variant="outline">
              <Zap className="h-4 w-4 mr-2" />
              Bulk Optimize
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue and History */}
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            Queue ({optimizerData.queue.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({optimizerData.history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Queue</CardTitle>
              <CardDescription>Jobs waiting to be processed</CardDescription>
            </CardHeader>
            <CardContent>
              {optimizerData.queue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs in queue
                </div>
              ) : (
                <div className="space-y-2">
                  {optimizerData.queue.map((job, idx) => (
                    <div key={job.id || idx} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{job.clientName || job.clientId}</p>
                        <p className="text-sm text-muted-foreground">{job.contentType}</p>
                      </div>
                      <Badge variant={job.status === 'processing' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>Recently completed optimizations</CardDescription>
            </CardHeader>
            <CardContent>
              {optimizerData.history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Improvement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizerData.history.slice(0, 20).map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>{item.clientName || item.clientId}</TableCell>
                        <TableCell>{item.contentType}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'completed' ? 'default' : 'destructive'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.improvement ? `+${item.improvement}%` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
