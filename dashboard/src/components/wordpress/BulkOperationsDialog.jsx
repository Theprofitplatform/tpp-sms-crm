import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { wordpressAPI } from '@/services/api'
import { Loader2, CheckCircle2, XCircle, PlayCircle } from 'lucide-react'

export default function BulkOperationsDialog({ open, onOpenChange, sites, operation, onComplete }) {
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState([])
  const [completed, setCompleted] = useState(false)

  const operationTitles = {
    test: 'Test All Connections',
    sync: 'Sync All Sites',
    delete: 'Delete Multiple Sites'
  }

  const operationDescriptions = {
    test: 'Testing connection to all WordPress sites...',
    sync: 'Synchronizing data from all WordPress sites...',
    delete: 'Deleting selected WordPress sites...'
  }

  const handleRun = async () => {
    setRunning(true)
    setProgress(0)
    setResults([])
    setCompleted(false)

    const totalSites = sites.length
    const siteResults = []

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i]
      
      try {
        let result
        if (operation === 'test') {
          result = await wordpressAPI.testConnection(site.id)
        } else if (operation === 'sync') {
          result = await wordpressAPI.syncSite(site.id)
        } else if (operation === 'delete') {
          result = await wordpressAPI.deleteSite(site.id)
        }

        siteResults.push({
          site: site.name || site.id,
          success: true,
          message: result.message || 'Success'
        })
      } catch (error) {
        siteResults.push({
          site: site.name || site.id,
          success: false,
          message: error.message || 'Failed'
        })
      }

      setResults([...siteResults])
      setProgress(((i + 1) / totalSites) * 100)
    }

    setRunning(false)
    setCompleted(true)

    // Show summary toast
    const successCount = siteResults.filter(r => r.success).length
    const failedCount = siteResults.filter(r => !r.success).length

    toast({
      title: 'Bulk Operation Complete',
      description: `${successCount} succeeded, ${failedCount} failed`,
      variant: failedCount > 0 ? 'default' : 'default'
    })

    if (onComplete) {
      onComplete(siteResults)
    }
  }

  const handleClose = () => {
    if (!running) {
      onOpenChange(false)
      setResults([])
      setProgress(0)
      setCompleted(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            {operationTitles[operation]}
          </DialogTitle>
          <DialogDescription>
            {operationDescriptions[operation]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {results.length} of {sites.length} sites processed
            </p>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-md bg-muted/50"
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{result.site}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.message}
                      </p>
                    </div>
                    <Badge
                      variant={result.success ? 'default' : 'destructive'}
                      className="shrink-0"
                    >
                      {result.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Summary */}
          {completed && (
            <div className="flex gap-4 p-4 bg-muted/50 rounded-md">
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {results.filter(r => r.success).length}
                </div>
                <p className="text-xs text-muted-foreground">Succeeded</p>
              </div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {results.filter(r => !r.success).length}
                </div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold">
                  {sites.length}
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!running && !completed && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRun}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start {operationTitles[operation]}
              </Button>
            </>
          )}

          {running && (
            <Button disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {completed && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
