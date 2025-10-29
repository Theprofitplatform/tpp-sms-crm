import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { localSEOAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

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
  RefreshCw,
  Loader2
} from 'lucide-react'

export default function LocalSEOPage() {
  const { toast } = useToast()
  const [running, setRunning] = useState(null)

  // API Requests
  const { data: localSEOData, loading, error, refetch } = useAPIData(
    () => localSEOAPI.getScores(),
    { autoFetch: true }
  )

  const { execute: runAudit } = useAPIRequest()
  const { execute: runAutoFix } = useAPIRequest()

  const clients = localSEOData?.clients || []

  const summary = useMemo(() => {
    const calculateAverageScore = (clients) => {
      if (clients.length === 0) return 0
      return Math.round(clients.reduce((sum, c) => sum + (c.score || 0), 0) / clients.length)
    }

    const countTotalIssues = (clients) => {
      return clients.reduce((sum, c) => sum + (c.issues?.length || 0), 0)
    }

    return {
      totalClients: clients.length,
      avgScore: calculateAverageScore(clients),
      issuesFound: countTotalIssues(clients),
      lastRun: localSEOData?.lastRun || new Date().toISOString()
    }
  }, [clients, localSEOData])

  const handleRunAudit = useCallback(async (clientId) => {
    setRunning(clientId)

    await runAudit(
      () => localSEOAPI.runAudit(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Audit started successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )

    setRunning(null)
  }, [runAudit, refetch])

  const handleAutoFix = useCallback(async (clientId) => {
    setRunning(`fix-${clientId}`)

    await runAutoFix(
      () => localSEOAPI.autoFix(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Auto-fix completed successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )

    setRunning(null)
  }, [runAutoFix, refetch])

  const getScoreColor = useCallback((score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }, [])

  const getScoreBadge = useCallback((score) => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading local SEO data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8" />
            Local SEO
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
            <MapPin className="h-8 w-8" />
            Local SEO
          </h1>
          <p className="text-muted-foreground">
            Optimize local search presence with NAP consistency
          </p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(summary.avgScore)}`}>
              {summary.avgScore}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.issuesFound}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(summary.lastRun).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Local SEO Scores</CardTitle>
          <CardDescription>NAP consistency and local optimization status</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                Run an audit to see local SEO scores
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>NAP Status</TableHead>
                  <TableHead>GMB Status</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.domain}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${getScoreColor(client.score || 0)}`}>
                          {client.score || 0}
                        </div>
                        <Progress value={client.score || 0} className="w-20 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.nap?.consistent ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Consistent
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Issues
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.gmb?.verified ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.schema?.implemented ? (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Implemented
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.issues?.length > 0 ? (
                        <Badge variant="destructive">
                          {client.issues.length} Issues
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          No Issues
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunAudit(client.id)}
                          disabled={running === client.id}
                        >
                          {running === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAutoFix(client.id)}
                          disabled={running === `fix-${client.id}` || !client.issues?.length}
                        >
                          {running === `fix-${client.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
