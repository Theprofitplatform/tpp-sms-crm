import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { autoFixAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Wrench,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Play,
  History,
  AlertTriangle,
  Info,
  Loader2,
  MapPin
} from 'lucide-react'

export default function AutoFixPage() {
  const { toast } = useToast()
  const [runningEngine, setRunningEngine] = useState(null)

  // API Requests
  const { data: enginesData, loading: loadingEngines, refetch: refetchEngines } = useAPIData(
    () => autoFixAPI.getEngines(),
    { autoFetch: true, initialData: [] }
  )

  const { data: historyData, loading: loadingHistory, refetch: refetchHistory } = useAPIData(
    () => autoFixAPI.getHistory(50),
    { autoFetch: true, initialData: [] }
  )

  const { execute: toggleEngine } = useAPIRequest()
  const { execute: runEngine } = useAPIRequest()

  // Use fallback data if backend not available
  const mockEngines = [
    {
      id: 1,
      name: 'Content Optimizer',
      description: 'Analyzes and optimizes content quality, keyword density, headings, and internal linking',
      category: 'on-page',
      impact: 'high',
      enabled: true,
      fixesApplied: 247,
      successRate: 94,
      lastRun: new Date().toISOString()
    },
    {
      id: 2,
      name: 'NAP Consistency Fixer',
      description: 'Ensures Name, Address, Phone data is consistent across all pages',
      category: 'local-seo',
      impact: 'high',
      enabled: true,
      fixesApplied: 183,
      successRate: 98,
      lastRun: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Schema Markup Injector',
      description: 'Generates and injects LocalBusiness schema markup for better search visibility',
      category: 'technical',
      impact: 'high',
      enabled: true,
      fixesApplied: 45,
      successRate: 100,
      lastRun: new Date().toISOString()
    },
    {
      id: 4,
      name: 'Title/Meta Optimizer',
      description: 'Optimizes page titles and meta descriptions for better click-through rates',
      category: 'on-page',
      impact: 'medium',
      enabled: false,
      fixesApplied: 312,
      successRate: 89,
      lastRun: new Date(Date.now() - 86400000).toISOString()
    }
  ]

  const mockHistory = [
    {
      id: 1,
      engineId: 1,
      engineName: 'Content Optimizer',
      clientId: 'instantautotraders',
      fixesApplied: 23,
      status: 'success',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      duration: '2m 34s'
    },
    {
      id: 2,
      engineId: 2,
      engineName: 'NAP Consistency Fixer',
      clientId: 'theprofitplatform',
      fixesApplied: 15,
      status: 'success',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      duration: '1m 12s'
    },
    {
      id: 3,
      engineId: 3,
      engineName: 'Schema Markup Injector',
      clientId: 'instantautotraders',
      fixesApplied: 1,
      status: 'success',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      duration: '45s'
    }
  ]

  const engines = (enginesData && enginesData.length > 0) ? enginesData : mockEngines
  const history = (historyData && historyData.length > 0) ? historyData : mockHistory

  const stats = useMemo(() => {
    return {
      totalEngines: engines.length,
      activeEngines: engines.filter(e => e.enabled).length,
      totalFixes: engines.reduce((sum, e) => sum + (e.fixesApplied || 0), 0),
      avgSuccessRate: engines.length > 0
        ? engines.reduce((sum, e) => sum + (e.successRate || 0), 0) / engines.length
        : 0
    }
  }, [engines])

  const handleToggleEngine = useCallback(async (engineId, enabled) => {
    await toggleEngine(
      () => autoFixAPI.toggleEngine(engineId, enabled),
      {
        showSuccessToast: true,
        successMessage: `Engine ${enabled ? 'enabled' : 'disabled'}`,
        onSuccess: () => {
          refetchEngines()
        }
      }
    )
  }, [toggleEngine, refetchEngines])

  const handleRunEngine = useCallback(async (engineId) => {
    setRunningEngine(engineId)

    await runEngine(
      () => autoFixAPI.runEngine(engineId),
      {
        showSuccessToast: true,
        successMessage: 'Engine started successfully',
        onSuccess: () => {
          refetchEngines()
          refetchHistory()
        }
      }
    )

    setRunningEngine(null)
  }, [runEngine, refetchEngines, refetchHistory])

  const getImpactColor = useCallback((impact) => {
    switch (impact) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }, [])

  const getCategoryIcon = useCallback((category) => {
    switch (category) {
      case 'on-page': return <Zap className="h-4 w-4" />
      case 'local-seo': return <MapPin className="h-4 w-4" />
      case 'accessibility': return <Info className="h-4 w-4" />
      case 'technical': return <Settings className="h-4 w-4" />
      case 'performance': return <Clock className="h-4 w-4" />
      default: return <Wrench className="h-4 w-4" />
    }
  }, [])

  if (loadingEngines && loadingHistory) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading auto-fix engines...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="h-8 w-8" />
          Auto-Fix Engines
        </h1>
        <p className="text-muted-foreground">
          Automated SEO issue resolution
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Engines</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEngines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEngines}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fixes Applied</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFixes.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSuccessRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engines">
        <TabsList>
          <TabsTrigger value="engines">Engines ({engines.length})</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="engines" className="space-y-4">
          {engines.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Engines Available</h3>
                <p className="text-muted-foreground">
                  Auto-fix engines will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {engines.map(engine => (
                <Card key={engine.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getCategoryIcon(engine.category)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{engine.name}</CardTitle>
                          <CardDescription>{engine.description}</CardDescription>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{engine.category}</Badge>
                            <Badge variant={getImpactColor(engine.impact)}>
                              {engine.impact} impact
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={engine.enabled}
                        onCheckedChange={(checked) => handleToggleEngine(engine.id, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fixes Applied</p>
                        <p className="font-medium">{engine.fixesApplied || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium">{engine.successRate || 0}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Run</p>
                        <p className="font-medium">
                          {engine.lastRun
                            ? new Date(engine.lastRun).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>

                    {engine.enabled && engine.successRate && (
                      <Progress value={engine.successRate} className="h-2" />
                    )}

                    <Button
                      onClick={() => handleRunEngine(engine.id)}
                      disabled={!engine.enabled || runningEngine === engine.id}
                      size="sm"
                    >
                      {runningEngine === engine.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fix History</CardTitle>
              <CardDescription>Recent auto-fix operations</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Engine</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fixes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="font-medium">{item.engineName}</TableCell>
                        <TableCell>{item.clientName || 'All'}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.fixesApplied || 0}</TableCell>
                        <TableCell>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : 'N/A'}
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
