import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { wordpressAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FileText,
  Image,
  Plug,
  Database,
  Shield,
  Loader2
} from 'lucide-react'

export default function WordPressManagerPage() {
  const { toast } = useToast()
  const [testing, setTesting] = useState(null)
  const [syncing, setSyncing] = useState(null)

  // API Requests
  const { data: wpData, loading, error, refetch } = useAPIData(
    () => wordpressAPI.getSites(),
    { autoFetch: true }
  )

  const { execute: testConnection } = useAPIRequest()
  const { execute: syncSite } = useAPIRequest()

  const sites = wpData?.sites || []

  // Calculate summary stats
  const summary = useMemo(() => {
    return {
      totalSites: sites.length,
      connected: sites.filter(s => s.connected).length,
      needsConfig: sites.filter(s => !s.configured).length,
      errors: sites.filter(s => s.error).length
    }
  }, [sites])

  const handleTestConnection = useCallback(async (siteId) => {
    setTesting(siteId)
    
    await testConnection(
      () => wordpressAPI.testConnection(siteId),
      {
        showSuccessToast: true,
        successMessage: 'Connection test successful',
        onSuccess: () => {
          refetch()
        },
        onError: () => {
          refetch()
        }
      }
    )
    
    setTesting(null)
  }, [testConnection, refetch])

  const handleSync = useCallback(async (siteId) => {
    setSyncing(siteId)
    
    await syncSite(
      () => wordpressAPI.syncSite(siteId),
      {
        showSuccessToast: true,
        successMessage: 'Sync completed successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
    
    setSyncing(null)
  }, [syncSite, refetch])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'connected': return 'default'
      case 'disconnected': return 'secondary'
      case 'error': return 'destructive'
      default: return 'outline'
    }
  }, [])

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'connected': return <CheckCircle2 className="h-4 w-4" />
      case 'disconnected': return <XCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Globe className="h-4 w-4" />
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading WordPress sites...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            WordPress Manager
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
            <Globe className="h-8 w-8" />
            WordPress Manager
          </h1>
          <p className="text-muted-foreground">
            Manage WordPress site integrations
          </p>
        </div>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.connected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Config</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.needsConfig}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sites Table */}
      <Card>
        <CardHeader>
          <CardTitle>WordPress Sites</CardTitle>
          <CardDescription>Manage connected WordPress installations</CardDescription>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sites Connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your first WordPress site to start managing content
              </p>
              <Button>
                <Plug className="h-4 w-4 mr-2" />
                Connect Site
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(site.status)}
                        <span className="font-medium">{site.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        {site.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(site.status)}>
                        {site.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {site.stats?.posts || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {site.stats?.pages || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {site.lastSync
                        ? new Date(site.lastSync).toLocaleString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(site.id)}
                          disabled={testing === site.id}
                        >
                          {testing === site.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(site.id)}
                          disabled={syncing === site.id}
                        >
                          {syncing === site.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
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
