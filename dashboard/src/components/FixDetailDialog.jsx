import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react'

export function FixDetailDialog({ open, onOpenChange, run, logs }) {
  if (!run) return null

  const formatDuration = (ms) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(run.status)}
            Fix Run Details
          </DialogTitle>
          <DialogDescription>
            {run.engineName} - {formatDate(run.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={run.status === 'success' ? 'default' : 'destructive'} className="mt-1">
                  {run.status}
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Fixes Applied</p>
                <p className="text-2xl font-bold">{run.fixesApplied || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Issues Found</p>
                <p className="text-2xl font-bold">{run.issuesFound || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{formatDuration(run.duration)}</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Client</h3>
              <p>{run.clientName || run.clientId || 'All Clients'}</p>
            </div>

            {/* Error Message (if any) */}
            {run.error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Error Details
                </h3>
                <p className="text-sm text-red-700">{run.error}</p>
              </div>
            )}

            {/* Detailed Logs */}
            {logs && logs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detailed Changes ({logs.length})
                </h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page</TableHead>
                        <TableHead>Fix Type</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Before</TableHead>
                        <TableHead>After</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log, idx) => (
                        <TableRow key={log.id || idx}>
                          <TableCell className="font-medium">
                            <div className="max-w-[150px]">
                              <p className="truncate" title={log.pageTitle}>
                                {log.pageTitle || 'Unknown'}
                              </p>
                              {log.pageUrl && (
                                <a
                                  href={log.pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline truncate block"
                                  title={log.pageUrl}
                                >
                                  View Page
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.fixType || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>{log.field || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="text-sm text-muted-foreground truncate" title={log.oldValue}>
                                {log.oldValue || '(empty)'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="text-sm text-green-600 truncate" title={log.newValue}>
                                {log.newValue || '(empty)'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* No detailed logs message */}
            {(!logs || logs.length === 0) && run.status === 'success' && (
              <div className="p-8 text-center text-muted-foreground border rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No detailed change logs available for this run.</p>
                <p className="text-sm mt-1">
                  The engine completed successfully but didn't log individual changes.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
