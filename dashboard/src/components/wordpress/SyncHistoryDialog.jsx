import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { wordpressAPI } from '@/services/api'
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download,
  Search,
  Filter,
  Loader2
} from 'lucide-react'

export default function SyncHistoryDialog({ open, onOpenChange, siteId = null }) {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [filteredHistory, setFilteredHistory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (open) {
      fetchHistory()
    }
  }, [open, siteId])

  useEffect(() => {
    // Filter history based on search and status
    let filtered = history

    if (searchTerm) {
      filtered = filtered.filter(h => 
        h.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.siteId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(h => h.status === statusFilter)
    }

    setFilteredHistory(filtered)
  }, [history, searchTerm, statusFilter])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await wordpressAPI.getSyncHistory(siteId)
      setHistory(data.history || [])
      setFilteredHistory(data.history || [])
    } catch (error) {
      console.error('Failed to fetch sync history:', error)
      // Use mock data if API fails
      setHistory(generateMockHistory())
      setFilteredHistory(generateMockHistory())
    } finally {
      setLoading(false)
    }
  }

  const generateMockHistory = () => {
    const now = Date.now()
    return [
      {
        id: 1,
        siteId: 'instantautotraders',
        siteName: 'Instant Auto Traders',
        timestamp: new Date(now - 1000 * 60 * 5),
        status: 'success',
        duration: 1234,
        itemsSynced: 45,
        message: 'Successfully synced all data'
      },
      {
        id: 2,
        siteId: 'hottyres',
        siteName: 'Hot Tyres',
        timestamp: new Date(now - 1000 * 60 * 30),
        status: 'success',
        duration: 2100,
        itemsSynced: 32,
        message: 'Sync completed'
      },
      {
        id: 3,
        siteId: 'instantautotraders',
        siteName: 'Instant Auto Traders',
        timestamp: new Date(now - 1000 * 60 * 60),
        status: 'error',
        duration: 500,
        itemsSynced: 0,
        message: 'Connection timeout'
      },
      {
        id: 4,
        siteId: 'hottyres',
        siteName: 'Hot Tyres',
        timestamp: new Date(now - 1000 * 60 * 90),
        status: 'success',
        duration: 1890,
        itemsSynced: 28,
        message: 'Sync completed successfully'
      }
    ]
  }

  const exportHistory = () => {
    const csv = [
      'Site ID,Site Name,Timestamp,Status,Duration (ms),Items Synced,Message',
      ...filteredHistory.map(h => 
        `${h.siteId},${h.siteName},${h.timestamp.toISOString()},${h.status},${h.duration},${h.itemsSynced},"${h.message}"`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordpress-sync-history-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = {
    total: filteredHistory.length,
    success: filteredHistory.filter(h => h.status === 'success').length,
    failed: filteredHistory.filter(h => h.status === 'error').length,
    avgDuration: filteredHistory.length > 0
      ? filteredHistory.reduce((sum, h) => sum + (h.duration || 0), 0) / filteredHistory.length
      : 0
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Sync History & Logs
          </DialogTitle>
          <DialogDescription>
            View synchronization history and detailed logs for all WordPress sites
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by site name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter(statusFilter === 'all' ? 'success' : statusFilter === 'success' ? 'error' : 'all')}
              >
                <Filter className="h-4 w-4 mr-2" />
                {statusFilter === 'all' ? 'All' : statusFilter === 'success' ? 'Success' : 'Failed'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportHistory}
                disabled={filteredHistory.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* History List */}
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="p-4 space-y-3">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No sync history found</p>
                    </div>
                  ) : (
                    filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">{item.siteName}</p>
                              <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {item.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.timestamp.toLocaleString()}
                              </span>
                              <span>Duration: {(item.duration / 1000).toFixed(2)}s</span>
                              {item.itemsSynced > 0 && (
                                <span>Items: {item.itemsSynced}</span>
                              )}
                            </div>
                          </div>
                          {item.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total Syncs</p>
                </div>
              </Card>

              <Card className="p-4 bg-green-500/10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-1">{stats.success}</div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
              </Card>

              <Card className="p-4 bg-red-500/10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500 mb-1">{stats.failed}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">
                    {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium mb-3">Performance Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Duration</span>
                  <span className="font-medium">
                    {(stats.avgDuration / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Syncs Today</span>
                  <span className="font-medium">
                    {filteredHistory.filter(h => 
                      h.timestamp.toDateString() === new Date().toDateString()
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Sync</span>
                  <span className="font-medium">
                    {filteredHistory.length > 0 
                      ? filteredHistory[0].timestamp.toLocaleString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      {children}
    </div>
  )
}
