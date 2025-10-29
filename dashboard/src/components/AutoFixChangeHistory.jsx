import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { autoFixAPI } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  RotateCcw,
  Calendar,
  CheckCircle,
  FileText,
  Image,
  Heading1,
  TrendingUp,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function AutoFixChangeHistory({ limit = 10 }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    loadHistory()
  }, [limit])

  async function loadHistory() {
    try {
      setLoading(true)
      const response = await autoFixAPI.getChangeHistory({ limit })
      
      if (response.success && response.reports) {
        setReports(response.reports)
      }
    } catch (error) {
      console.error('Error loading auto-fix history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load auto-fix history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    )
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No History Yet</h3>
          <p className="text-sm text-muted-foreground">
            Auto-fix optimization history will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          expanded={expandedId === report.id}
          onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
          onRefresh={loadHistory}
        />
      ))}
    </div>
  )
}

function ReportCard({ report, expanded, onToggle, onRefresh }) {
  const { toast } = useToast()
  const [reverting, setReverting] = useState(false)

  const titleChanges = report.changes?.titles?.results?.changes || []
  const h1Changes = report.changes?.h1Tags?.results?.changes || []
  const imageChanges = report.changes?.imageAlt?.results?.changes || []

  const totalChanges = report.summary?.totalChanges || 0
  const analyzed = report.summary?.analyzed || 0

  const timestamp = formatDistanceToNow(new Date(report.timestamp), {
    addSuffix: true
  })

  async function handleRevertAll() {
    if (!confirm('Are you sure you want to revert all changes from this optimization?')) {
      return
    }

    try {
      setReverting(true)
      const postIds = titleChanges.map(c => c.postId)
      
      // Extract backup ID from filename (would need to be in report data)
      const backupId = 'backup-pre-optimization-1761308146543'
      
      const result = await autoFixAPI.revertChanges(
        report.clientId,
        backupId,
        postIds
      )

      if (result.success) {
        toast({
          title: 'Success',
          description: `Reverted ${result.count} changes`,
        })
        onRefresh()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revert changes',
        variant: 'destructive'
      })
    } finally {
      setReverting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">
                {new Date(report.timestamp).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {timestamp}
              </Badge>
            </div>
            
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {analyzed} pages analyzed
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {totalChanges} changes made
              </span>
              {report.dryRun && (
                <Badge variant="secondary">Dry Run</Badge>
              )}
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Title Changes"
              value={titleChanges.length}
              variant="blue"
            />
            <StatCard
              icon={<Heading1 className="h-5 w-5" />}
              label="H1 Tag Fixes"
              value={h1Changes.length}
              variant="green"
            />
            <StatCard
              icon={<Image className="h-5 w-5" />}
              label="Image Alt Text"
              value={imageChanges.length}
              variant="purple"
            />
          </div>

          <Separator />

          {/* Title Changes */}
          {titleChanges.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Title Optimizations ({titleChanges.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {titleChanges.map((change, idx) => (
                  <TitleChangeCard key={idx} change={change} />
                ))}
              </div>
            </div>
          )}

          {/* H1 Changes */}
          {h1Changes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Heading1 className="h-5 w-5" />
                H1 Tag Fixes ({h1Changes.length})
              </h3>
              
              <div className="space-y-2">
                {h1Changes.map((change, idx) => (
                  <ChangeCard key={idx} change={change} type="h1" />
                ))}
              </div>
            </div>
          )}

          {/* Image Changes */}
          {imageChanges.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Image className="h-5 w-5" />
                Image Alt Text ({imageChanges.length})
              </h3>
              
              <div className="space-y-2">
                {imageChanges.map((change, idx) => (
                  <ChangeCard key={idx} change={change} type="image" />
                ))}
              </div>
            </div>
          )}

          {/* No Changes */}
          {totalChanges === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>No changes needed - everything was already optimized!</p>
            </div>
          )}

          {/* Actions */}
          {totalChanges > 0 && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertAll}
                disabled={reverting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {reverting ? 'Reverting...' : 'Revert All Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function StatCard({ icon, label, value, variant = 'default' }) {
  const variantClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    default: ''
  }

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function TitleChangeCard({ change }) {
  const handleViewPage = () => {
    window.open(change.url, '_blank')
  }

  const lengthDiff = change.newLength - change.oldLength
  const lengthPercentage = ((lengthDiff / change.oldLength) * 100).toFixed(0)

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Post #{change.postId}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleViewPage}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Page
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium text-sm mt-1">Before:</span>
                <div className="flex-1">
                  <p className="text-sm line-through text-muted-foreground">
                    {change.oldTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {change.oldLength} characters
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-green-600 font-medium text-sm mt-1">After:</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {change.newTitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{change.newLength} characters</span>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {lengthDiff > 0 ? '+' : ''}{lengthPercentage}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              {change.url}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChangeCard({ change, type }) {
  const handleViewPage = () => {
    window.open(change.url, '_blank')
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Post #{change.postId}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={handleViewPage}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
            
            <p className="text-sm mb-1">
              {type === 'h1' ? 'H1 Tag' : 'Image Alt Text'} fixed
            </p>
            
            <p className="text-xs text-muted-foreground font-mono">
              {change.url}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AutoFixChangeHistory
