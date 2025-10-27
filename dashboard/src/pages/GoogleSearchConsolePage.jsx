import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Search,
  MousePointerClick,
  Eye,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  ExternalLink
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

export function GoogleSearchConsolePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [gscData, setGscData] = useState({
    summary: {
      totalClicks: 0,
      totalImpressions: 0,
      avgCTR: 0,
      avgPosition: 0
    },
    quickWins: [],
    lowCTRPages: [],
    topQueries: [],
    topPages: [],
    recentChanges: []
  })

  useEffect(() => {
    fetchGSCData()
  }, [])

  const fetchGSCData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch GSC metrics from database
      const response = await fetch('/api/analytics/gsc/summary')

      if (!response.ok) {
        throw new Error('Failed to fetch GSC data')
      }

      const data = await response.json()

      // Transform data for display
      setGscData({
        summary: {
          totalClicks: data.totalClicks || 0,
          totalImpressions: data.totalImpressions || 0,
          avgCTR: ((data.totalClicks / data.totalImpressions) * 100).toFixed(2) || 0,
          avgPosition: data.avgPosition?.toFixed(1) || 0
        },
        quickWins: data.quickWins || [],
        lowCTRPages: data.lowCTRPages || [],
        topQueries: data.topQueries || [],
        topPages: data.topPages || [],
        recentChanges: data.recentChanges || []
      })
    } catch (err) {
      console.error('Error fetching GSC data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/gsc/sync', { method: 'POST' })
      if (response.ok) {
        await fetchGSCData()
      }
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = () => {
    // Export GSC data to CSV
    const csvContent = generateCSV(gscData)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gsc-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const generateCSV = (data) => {
    // Simple CSV generation
    let csv = 'Query,Clicks,Impressions,CTR,Position\n'
    data.topQueries.forEach(q => {
      csv += `"${q.query}",${q.clicks},${q.impressions},${q.ctr},${q.position}\n`
    })
    return csv
  }

  if (loading) return <LoadingState message="Loading Google Search Console data..." />
  if (error) return <ErrorState message={error} onRetry={fetchGSCData} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Search Console</h1>
          <p className="text-muted-foreground">
            Real-time search performance data from Google
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gscData.summary.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 28 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gscData.summary.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 28 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gscData.summary.avgCTR}%</div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Position</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gscData.summary.avgPosition}</div>
            <p className="text-xs text-muted-foreground">Search ranking</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="quick-wins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quick-wins">Quick Wins</TabsTrigger>
          <TabsTrigger value="low-ctr">Low CTR Pages</TabsTrigger>
          <TabsTrigger value="top-queries">Top Queries</TabsTrigger>
          <TabsTrigger value="top-pages">Top Pages</TabsTrigger>
        </TabsList>

        {/* Quick Wins Tab */}
        <TabsContent value="quick-wins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Wins - Position 11-20</CardTitle>
              <CardDescription>
                Keywords ranking on page 2 that could quickly reach page 1 with optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gscData.quickWins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No quick win opportunities found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Potential</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gscData.quickWins.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.query}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.position?.toFixed(1)}</Badge>
                        </TableCell>
                        <TableCell>{item.clicks}</TableCell>
                        <TableCell>{item.impressions}</TableCell>
                        <TableCell>{(item.ctr * 100).toFixed(2)}%</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            High
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low CTR Tab */}
        <TabsContent value="low-ctr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low CTR Pages</CardTitle>
              <CardDescription>
                Pages with good rankings but poor click-through rates - optimize titles and descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gscData.lowCTRPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No low CTR pages found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gscData.lowCTRPages.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {item.page}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.position?.toFixed(1)}</Badge>
                        </TableCell>
                        <TableCell>{item.clicks}</TableCell>
                        <TableCell>{item.impressions}</TableCell>
                        <TableCell>
                          <span className="text-orange-600 font-medium">
                            {(item.ctr * 100).toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
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

        {/* Top Queries Tab */}
        <TabsContent value="top-queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Queries</CardTitle>
              <CardDescription>
                Your best-performing search queries by clicks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gscData.topQueries.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.query}</TableCell>
                      <TableCell>{item.clicks}</TableCell>
                      <TableCell>{item.impressions}</TableCell>
                      <TableCell>{(item.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.position?.toFixed(1)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Pages Tab */}
        <TabsContent value="top-pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>
                Your best-performing pages by clicks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gscData.topPages.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium max-w-md truncate">
                        {item.page}
                      </TableCell>
                      <TableCell>{item.clicks}</TableCell>
                      <TableCell>{item.impressions}</TableCell>
                      <TableCell>{(item.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.position?.toFixed(1)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            About Google Search Console Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This dashboard displays real search performance data directly from Google Search Console.
            Unlike paid SEO tools that provide estimates, this data is 100% accurate and free.
          </p>
          <p>
            <strong>Quick Wins:</strong> Keywords ranking positions 11-20 are your best opportunities.
            These are already showing relevance to Google and with minor optimization can reach page 1.
          </p>
          <p>
            <strong>Low CTR Pages:</strong> Pages with good rankings but poor CTR waste potential traffic.
            Improve titles and meta descriptions to increase clicks.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
