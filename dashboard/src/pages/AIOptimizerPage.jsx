import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

export function AIOptimizerPage() {
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

  useEffect(() => {
    fetchOptimizerData()
  }, [])

  const fetchOptimizerData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-optimizer/status')

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
      console.error('Error fetching optimizer data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateSuccessRate = (history) => {
    if (history.length === 0) return 0
    const successful = history.filter(h => h.status === 'completed').length
    return ((successful / history.length) * 100).toFixed(1)
  }

  const calculateAvgImprovement = (history) => {
    const completed = history.filter(h => h.status === 'completed' && h.improvement)
    if (completed.length === 0) return 0
    const sum = completed.reduce((acc, h) => acc + h.improvement, 0)
    return (sum / completed.length).toFixed(1)
  }

  const handleOptimize = async () => {
    if (!selectedClient) return

    setOptimizing(true)
    try {
      const response = await fetch('/api/ai-optimizer/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient })
      })

      if (response.ok) {
        await fetchOptimizerData()
        setSelectedClient('')
      }
    } catch (err) {
      console.error('Optimization error:', err)
    } finally {
      setOptimizing(false)
    }
  }

  const handleBulkOptimize = async () => {
    setOptimizing(true)
    try {
      const response = await fetch('/api/ai-optimizer/bulk-optimize', {
        method: 'POST'
      })

      if (response.ok) {
        await fetchOptimizerData()
      }
    } catch (err) {
      console.error('Bulk optimization error:', err)
    } finally {
      setOptimizing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>
      case 'processing':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) return <LoadingState message="Loading AI Optimizer data..." />
  if (error) return <ErrorState message={error} onRetry={fetchOptimizerData} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Content Optimizer
          </h1>
          <p className="text-muted-foreground">
            Powered by Claude AI - Optimize content for better rankings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOptimizerData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                New Optimization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start AI Optimization</DialogTitle>
                <DialogDescription>
                  Select a client to optimize their content using AI
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Client</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {optimizerData.clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedClient('')}>
                    Cancel
                  </Button>
                  <Button onClick={handleOptimize} disabled={!selectedClient || optimizing}>
                    {optimizing ? 'Starting...' : 'Start Optimization'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Optimizations</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizerData.stats.totalOptimizations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {optimizerData.stats.successRate}%
            </div>
            <Progress value={parseFloat(optimizerData.stats.successRate)} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              +{optimizerData.stats.avgImprovement}%
            </div>
            <p className="text-xs text-muted-foreground">Content score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{optimizerData.stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently optimizing</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Optimization Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="comparisons">Before/After</TabsTrigger>
        </TabsList>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Optimization Queue</CardTitle>
              <CardDescription>
                Content currently being optimized by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizerData.queue.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No optimizations in queue</p>
                  <Button className="mt-4" onClick={() => document.querySelector('[data-dialog-trigger]')?.click()}>
                    Start Optimization
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Content Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizerData.queue.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.clientName}</TableCell>
                        <TableCell>{item.contentType}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <Progress value={item.progress || 0} className="h-2" />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization History</CardTitle>
              <CardDescription>
                Past AI content optimization results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimizerData.history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No optimization history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Improvement</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizerData.history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.clientName}</TableCell>
                        <TableCell>{item.contentTitle || item.contentType}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.improvement ? (
                            <Badge variant="default">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              +{item.improvement}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(item.completedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedComparison(item)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparisons Tab */}
        <TabsContent value="comparisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Before & After Comparisons</CardTitle>
              <CardDescription>
                See the improvements made by AI optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedComparison ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{selectedComparison.clientName}</h3>
                    <Button variant="outline" onClick={() => setSelectedComparison(null)}>
                      Close
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Before Optimization
                      </h4>
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <p className="text-sm">{selectedComparison.beforeContent || 'Original content...'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BarChart3 className="h-4 w-4" />
                        Score: {selectedComparison.beforeScore || 'N/A'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        After Optimization
                      </h4>
                      <div className="border rounded-lg p-4 bg-primary/5">
                        <p className="text-sm">{selectedComparison.afterContent || 'Optimized content...'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <BarChart3 className="h-4 w-4" />
                        Score: {selectedComparison.afterScore || 'N/A'}
                        {selectedComparison.improvement && (
                          <Badge variant="default">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +{selectedComparison.improvement}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedComparison.suggestions && (
                    <div className="border rounded-lg p-4 mt-4">
                      <h4 className="font-medium mb-2">AI Suggestions Applied:</h4>
                      <ul className="space-y-1 text-sm">
                        {selectedComparison.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select an optimization from the History tab to view comparison
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
          <CardDescription>
            Optimize content for multiple clients at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Run AI optimization for all clients that need content improvements
              </p>
            </div>
            <Button onClick={handleBulkOptimize} disabled={optimizing}>
              <Zap className="h-4 w-4 mr-2" />
              {optimizing ? 'Processing...' : 'Bulk Optimize'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
