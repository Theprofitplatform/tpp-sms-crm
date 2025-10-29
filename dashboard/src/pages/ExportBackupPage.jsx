import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

import { exportAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Download,
  Upload,
  Database,
  FileText,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings
} from 'lucide-react'

export default function ExportBackupPage() {
  const { toast } = useToast()
  
  // State
  const [exportingType, setExportingType] = useState(null)

  // API Requests
  const { data: backupHistory, loading: loadingHistory, refetch: refetchHistory } = useAPIData(
    () => exportAPI.getBackupHistory(10),
    { autoFetch: true, initialData: [] }
  )

  const { data: backupSchedule, loading: loadingSchedule, refetch: refetchSchedule } = useAPIData(
    () => exportAPI.getBackupSchedule(),
    { autoFetch: true }
  )

  const { execute: updateSchedule } = useAPIRequest()
  const { execute: downloadBackupRequest } = useAPIRequest()

  // Export data handler with proper cleanup
  const handleExport = useCallback(async (type) => {
    setExportingType(type)

    try {
      const response = await fetch(`/api/export/${type}`, {
        signal: AbortSignal.timeout(300000) // 5 minute timeout for large exports
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      // Create temporary URL
      const url = window.URL.createObjectURL(blob)
      
      try {
        // Create and trigger download
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.${type === 'database' ? 'db' : 'csv'}`
        document.body.appendChild(a)
        a.click()
        
        // Cleanup DOM element
        document.body.removeChild(a)
        
        toast({
          title: 'Export Successful',
          description: `${type} data has been exported successfully.`
        })
      } finally {
        // CRITICAL: Always revoke the object URL to prevent memory leaks
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      // Handle abort errors gracefully
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        toast({
          title: 'Export Timeout',
          description: 'The export took too long and was cancelled.',
          variant: 'destructive'
        })
      } else {
        console.error('Export error:', err)
        toast({
          title: 'Export Failed',
          description: err.message || 'Failed to export data. Please try again.',
          variant: 'destructive'
        })
      }
    } finally {
      setExportingType(null)
    }
  }, [toast])

  // Download existing backup with proper cleanup
  const handleDownloadBackup = useCallback(async (backupId) => {
    await downloadBackupRequest(
      () => exportAPI.downloadBackup(backupId),
      {
        showSuccessToast: true,
        successMessage: 'Backup downloaded successfully',
        onSuccess: ({ blob, filename }) => {
          // Create temporary URL
          const url = window.URL.createObjectURL(blob)
          
          try {
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
          } finally {
            // CRITICAL: Always revoke the object URL
            window.URL.revokeObjectURL(url)
          }
        }
      }
    )
  }, [downloadBackupRequest])

  // Toggle backup schedule
  const handleToggleSchedule = useCallback(async (scheduleType, enabled) => {
    await updateSchedule(
      () => exportAPI.updateBackupSchedule({
        ...backupSchedule,
        [scheduleType]: enabled
      }),
      {
        showSuccessToast: true,
        successMessage: `${scheduleType} backups ${enabled ? 'enabled' : 'disabled'}`,
        onSuccess: () => {
          refetchSchedule()
        }
      }
    )
  }, [backupSchedule, updateSchedule, refetchSchedule])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // No cleanup needed anymore as we're revoking URLs immediately
    }
  }, [])

  const exportOptions = [
    {
      id: 'database',
      title: 'Database Backup',
      description: 'Full database export',
      icon: Database,
      type: 'database'
    },
    {
      id: 'clients',
      title: 'Clients Export',
      description: 'Export all client data as CSV',
      icon: FileText,
      type: 'clients'
    },
    {
      id: 'keywords',
      title: 'Keywords Export',
      description: 'Export keyword data as CSV',
      icon: FileText,
      type: 'keywords'
    },
    {
      id: 'reports',
      title: 'Reports Export',
      description: 'Export all generated reports',
      icon: FileText,
      type: 'reports'
    },
    {
      id: 'analytics',
      title: 'Analytics Export',
      description: 'Export analytics data as CSV',
      icon: FileText,
      type: 'analytics'
    },
    {
      id: 'full',
      title: 'Full Export',
      description: 'Export everything as ZIP',
      icon: Download,
      type: 'full'
    }
  ]

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Export & Backup Manager
        </h1>
        <p className="text-muted-foreground">
          Export data and manage automated backups
        </p>
      </div>

      {/* Export Options */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exportOptions.map((option) => {
          const Icon = option.icon
          const isExporting = exportingType === option.type
          
          return (
            <Card key={option.id}>
              <CardHeader>
                <CardTitle className="text-lg">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => handleExport(option.type)} 
                  disabled={exportingType !== null}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Icon className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automated Backups</CardTitle>
              <CardDescription>Configure automatic backup schedule</CardDescription>
            </div>
            {loadingSchedule && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="daily-backup" className="font-medium cursor-pointer">Daily Backups</Label>
              <p className="text-sm text-muted-foreground">Every day at 2:00 AM</p>
            </div>
            <Switch
              id="daily-backup"
              checked={backupSchedule?.daily || false}
              onCheckedChange={(checked) => handleToggleSchedule('daily', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly-backup" className="font-medium cursor-pointer">Weekly Backups</Label>
              <p className="text-sm text-muted-foreground">Every Sunday at 1:00 AM</p>
            </div>
            <Switch
              id="weekly-backup"
              checked={backupSchedule?.weekly || false}
              onCheckedChange={(checked) => handleToggleSchedule('weekly', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="monthly-backup" className="font-medium cursor-pointer">Monthly Backups</Label>
              <p className="text-sm text-muted-foreground">1st of each month at 12:00 AM</p>
            </div>
            <Switch
              id="monthly-backup"
              checked={backupSchedule?.monthly || false}
              onCheckedChange={(checked) => handleToggleSchedule('monthly', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Backups</CardTitle>
              <CardDescription>Your latest backup files</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refetchHistory}>
              <Download className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading backups...</span>
            </div>
          ) : !backupHistory?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No backups found
            </div>
          ) : (
            <div className="space-y-3">
              {backupHistory.map((backup, idx) => (
                <div key={backup.id || idx} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{backup.filename || `backup-${backup.id}`}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(backup.created_at)} • {formatFileSize(backup.size)}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownloadBackup(backup.id)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
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
          <p>• Export operations may take several minutes for large datasets</p>
        </CardContent>
      </Card>
    </div>
  )
}
