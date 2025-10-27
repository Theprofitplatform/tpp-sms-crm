import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Shield
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

export function WordPressManagerPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [testing, setTesting] = useState(null)
  const [wpData, setWpData] = useState({
    sites: [],
    summary: {
      totalSites: 0,
      connected: 0,
      needsConfig: 0,
      errors: 0
    }
  })

  useEffect(() => {
    fetchWPData()
  }, [])

  const fetchWPData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/wordpress/sites')

      if (!response.ok) {
        throw new Error('Failed to fetch WordPress data')
      }

      const data = await response.json()

      const sites = data.sites || []
      setWpData({
        sites,
        summary: {
          totalSites: sites.length,
          connected: sites.filter(s => s.connected).length,
          needsConfig: sites.filter(s => !s.configured).length,
          errors: sites.filter(s => s.error).length
        }
      })
    } catch (err) {
      console.error('Error fetching WordPress data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async (siteId) => {
    setTesting(siteId)
    try {
      const response = await fetch(`/api/wordpress/test/${siteId}`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchWPData()
      }
    } catch (err) {
      console.error('Test connection error:', err)
    } finally {
      setTesting(null)
    }
  }

  const handleSync = async (siteId) => {
    try {
      const response = await fetch(`/api/wordpress/sync/${siteId}`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchWPData()
      }
    } catch (err) {
      console.error('Sync error:', err)
    }
  }

  const getStatusBadge = (site) => {
    if (site.error) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
    }
    if (!site.configured) {
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Not Configured</Badge>
    }
    if (site.connected) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>
    }
    return <Badge variant="secondary">Unknown</Badge>
  }

  if (loading) return <LoadingState message="Loading WordPress sites..." />
  if (error) return <ErrorState message={error} onRetry={fetchWPData} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8 text-primary" />
            WordPress Manager
          </h1>
          <p className="text-muted-foreground">
            Manage WordPress sites and connections
          </p>
        </div>
        <Button onClick={fetchWPData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wpData.summary.totalSites}</div>
            <p className="text-xs text-muted-foreground">Managed sites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{wpData.summary.connected}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Config</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{wpData.summary.needsConfig}</div>
            <p className="text-xs text-muted-foreground">Requires setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{wpData.summary.errors}</div>
            <p className="text-xs text-muted-foreground">Connection errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Sites Table */}
      <Card>
        <CardHeader>
          <CardTitle>WordPress Sites</CardTitle>
          <CardDescription>
            Manage connections and settings for all WordPress sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wpData.sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No WordPress sites configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Plugins</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wpData.sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {site.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>{getStatusBadge(site)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{site.version || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>{site.postCount || 0}</TableCell>
                    <TableCell>{site.pluginCount || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestConnection(site.id)}
                          disabled={testing === site.id}
                        >
                          {testing === site.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSync(site.id)}
                        >
                          Sync
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

      {/* Tabs for detailed info */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Site Health</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        {/* Site Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Site Health Status
              </CardTitle>
              <CardDescription>
                WordPress site health checks and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wpData.sites.map((site) => (
                  <div key={site.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{site.name}</h4>
                      {site.healthScore && (
                        <Badge variant={site.healthScore >= 80 ? 'default' : 'secondary'}>
                          Health Score: {site.healthScore}%
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">PHP Version</span>
                        <span>{site.phpVersion || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">MySQL Version</span>
                        <span>{site.mysqlVersion || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">HTTPS</span>
                        {site.https ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plugins Tab */}
        <TabsContent value="plugins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Plugin Management
              </CardTitle>
              <CardDescription>
                View and manage WordPress plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wpData.sites.map((site) => (
                  <div key={site.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{site.name}</h4>
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        {site.pluginCount || 0} plugins installed
                      </p>
                      {site.pluginsNeedUpdate && (
                        <p className="text-yellow-600 mt-1">
                          {site.pluginsNeedUpdate} plugins need updates
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Media Library
              </CardTitle>
              <CardDescription>
                WordPress media library statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wpData.sites.map((site) => (
                  <div key={site.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{site.name}</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Media Files</span>
                        <span>{site.mediaCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Media Size</span>
                        <span>{site.mediaSize || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Information
              </CardTitle>
              <CardDescription>
                WordPress database statistics and optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {wpData.sites.map((site) => (
                  <div key={site.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{site.name}</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Database Size</span>
                        <span>{site.dbSize || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tables</span>
                        <span>{site.dbTables || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            WordPress Connection Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            To connect a WordPress site, you need to create an Application Password:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Log in to your WordPress admin panel</li>
            <li>Go to Users → Your Profile</li>
            <li>Scroll to "Application Passwords"</li>
            <li>Create a new application password</li>
            <li>Copy the password and save it in your .env file</li>
          </ol>
          <p className="pt-2">
            <strong>Note:</strong> Application Passwords require WordPress 5.6+ and HTTPS.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
