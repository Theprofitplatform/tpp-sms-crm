import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Upload,
  Database,
  FileText,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export function ExportBackupPage() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (type) => {
    setExporting(true)
    try {
      const response = await fetch(`/api/export/${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.${type === 'database' ? 'db' : 'csv'}`
        a.click()
      }
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Export & Backup Manager
        </h1>
        <p className="text-muted-foreground">
          Export data and manage backups
        </p>
      </div>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Database Backup</CardTitle>
            <CardDescription>Full database export</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('database')} disabled={exporting}>
              <Database className="h-4 w-4 mr-2" />
              Export Database
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clients Export</CardTitle>
            <CardDescription>Export all client data as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('clients')} disabled={exporting}>
              <FileText className="h-4 w-4 mr-2" />
              Export Clients
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Keywords Export</CardTitle>
            <CardDescription>Export keyword data as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('keywords')} disabled={exporting}>
              <FileText className="h-4 w-4 mr-2" />
              Export Keywords
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports Export</CardTitle>
            <CardDescription>Export all generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('reports')} disabled={exporting}>
              <FileText className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics Export</CardTitle>
            <CardDescription>Export analytics data as CSV</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('analytics')} disabled={exporting}>
              <FileText className="h-4 w-4 mr-2" />
              Export Analytics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Full Export</CardTitle>
            <CardDescription>Export everything as ZIP</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('full')} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Backups</CardTitle>
          <CardDescription>Configure automatic backup schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Backups</p>
              <p className="text-sm text-muted-foreground">Every day at 2:00 AM</p>
            </div>
            <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Backups</p>
              <p className="text-sm text-muted-foreground">Every Sunday at 1:00 AM</p>
            </div>
            <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Monthly Backups</p>
              <p className="text-sm text-muted-foreground">1st of each month</p>
            </div>
            <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Your latest backup files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">database-backup-2025-01-27.db</p>
                  <p className="text-sm text-muted-foreground">Today at 2:00 AM • 15.2 MB</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">database-backup-2025-01-26.db</p>
                  <p className="text-sm text-muted-foreground">Yesterday at 2:00 AM • 14.8 MB</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Backup Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Backups are stored securely and encrypted</p>
          <p>• Automatic backups are retained for 30 days</p>
          <p>• Manual exports are available for immediate download</p>
          <p>• All sensitive data is encrypted before backup</p>
        </CardContent>
      </Card>
    </div>
  )
}
