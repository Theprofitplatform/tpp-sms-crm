import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Star,
  Globe,
  FileCode,
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

export function LocalSEOPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [localSEOData, setLocalSEOData] = useState({
    clients: [],
    summary: {
      totalClients: 0,
      avgScore: 0,
      issuesFound: 0,
      lastRun: null
    }
  })

  useEffect(() => {
    fetchLocalSEOData()
  }, [])

  const fetchLocalSEOData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/local-seo/scores')

      if (!response.ok) {
        throw new Error('Failed to fetch local SEO data')
      }

      const data = await response.json()

      setLocalSEOData({
        clients: data.clients || [],
        summary: {
          totalClients: data.clients?.length || 0,
          avgScore: calculateAverageScore(data.clients || []),
          issuesFound: countTotalIssues(data.clients || []),
          lastRun: data.lastRun || new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('Error fetching local SEO data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverageScore = (clients) => {
    if (clients.length === 0) return 0
    const sum = clients.reduce((acc, client) => acc + (client.score || 0), 0)
    return (sum / clients.length).toFixed(1)
  }

  const countTotalIssues = (clients) => {
    return clients.reduce((acc, client) => {
      return acc +
        (client.napConsistency ? 0 : 1) +
        (client.schemaMarkup ? 0 : 1) +
        (client.citations || 0)
    }, 0)
  }

  const handleRunAudit = async (clientId) => {
    setRunning(true)
    try {
      const response = await fetch(`/api/local-seo/audit/${clientId}`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchLocalSEOData()
      }
    } catch (err) {
      console.error('Audit error:', err)
    } finally {
      setRunning(false)
    }
  }

  const handleAutoFix = async (clientId) => {
    setRunning(true)
    try {
      const response = await fetch(`/api/local-seo/auto-fix/${clientId}`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchLocalSEOData()
      }
    } catch (err) {
      console.error('Auto-fix error:', err)
    } finally {
      setRunning(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score) => {
    if (score >= 80) return { variant: 'default', label: 'Excellent' }
    if (score >= 60) return { variant: 'secondary', label: 'Good' }
    return { variant: 'destructive', label: 'Needs Work' }
  }

  if (loading) return <LoadingState message="Loading local SEO data..." />
  if (error) return <ErrorState message={error} onRetry={fetchLocalSEOData} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Local SEO Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and optimize local search presence
          </p>
        </div>
        <Button onClick={() => fetchLocalSEOData()} disabled={running}>
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localSEOData.summary.totalClients}</div>
            <p className="text-xs text-muted-foreground">Tracked locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(localSEOData.summary.avgScore)}`}>
              {localSEOData.summary.avgScore}
            </div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localSEOData.summary.issuesFound}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(localSEOData.summary.lastRun).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(localSEOData.summary.lastRun).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client List with Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Client Local SEO Scores</CardTitle>
          <CardDescription>
            Overall local SEO health for each client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localSEOData.clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No local SEO data available. Run an audit to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>NAP</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Citations</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localSEOData.clients.map((client) => {
                  const badge = getScoreBadge(client.score || 0)
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-xl font-bold ${getScoreColor(client.score || 0)}`}>
                            {client.score || 0}
                          </div>
                          <Progress value={client.score || 0} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {client.napConsistency ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {client.schemaMarkup ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.citations || 0} found</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRunAudit(client.id)}
                            disabled={running}
                          >
                            Audit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAutoFix(client.id)}
                            disabled={running}
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            Fix
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="nap" className="space-y-4">
        <TabsList>
          <TabsTrigger value="nap">NAP Consistency</TabsTrigger>
          <TabsTrigger value="schema">Schema Markup</TabsTrigger>
          <TabsTrigger value="citations">Citations</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* NAP Tab */}
        <TabsContent value="nap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                NAP Consistency Check
              </CardTitle>
              <CardDescription>
                Name, Address, Phone number consistency across your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {localSEOData.clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{client.name}</h4>
                      {client.napConsistency ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Consistent
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inconsistent
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{client.businessName || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{client.address || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Tab */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Schema Markup Status
              </CardTitle>
              <CardDescription>
                Structured data implementation for local business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {localSEOData.clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{client.name}</h4>
                      {client.schemaMarkup ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Implemented
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {client.schemaMarkup
                        ? 'LocalBusiness schema is properly implemented'
                        : 'Schema markup needs to be added for better local visibility'}
                    </div>
                    {!client.schemaMarkup && (
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => handleAutoFix(client.id)}
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Inject Schema
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Citations Tab */}
        <TabsContent value="citations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Citation Tracking
              </CardTitle>
              <CardDescription>
                Business listings and directory submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {localSEOData.clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{client.name}</h4>
                      <Badge variant="outline">{client.citations || 0} Citations</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Found in {client.citations || 0} business directories
                    </div>
                    <Progress value={(client.citations || 0) * 2} className="h-2 mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Review Monitoring
              </CardTitle>
              <CardDescription>
                Track and manage online reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {localSEOData.clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{client.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{client.avgRating || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {client.reviewCount || 0} reviews tracked
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
