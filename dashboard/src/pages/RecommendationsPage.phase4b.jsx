import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { recommendationsAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { useDebounce } from '@/hooks/useDebounce'

import {
  Lightbulb,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  Search,
  Loader2,
  Sparkles,
  Code,
  Copy,
  AlertCircle,
  Zap,
  ExternalLink
} from 'lucide-react'

export default function RecommendationsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedRec, setSelectedRec] = useState(null)
  const [showAutoFixDialog, setShowAutoFixDialog] = useState(false)

  const debouncedSearch = useDebounce(searchTerm, 300)

  // API Requests
  const { data: recommendations, loading, refetch } = useAPIData(
    () => recommendationsAPI.getAll({
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    { autoFetch: true, initialData: [] }
  )

  const { execute: updateStatus, loading: updating } = useAPIRequest()
  const { execute: applyAutoFix, loading: applyingAutoFix } = useAPIRequest()

  // Filter recommendations locally by search
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec =>
      rec.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      rec.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [recommendations, debouncedSearch])

  // PHASE 4B: Enhanced stats with AutoFix
  const stats = useMemo(() => {
    const autoFixAvailable = recommendations.filter(r => r.auto_fix_available || r.autoFixAvailable).length
    return {
      total: recommendations.length,
      pending: recommendations.filter(r => r.status === 'pending').length,
      completed: recommendations.filter(r => r.status === 'completed').length,
      autoFixAvailable,
      pixelGenerated: recommendations.filter(r => r.source_type === 'pixel_issue' || r.sourceType === 'pixel_issue').length
    }
  }, [recommendations])

  const handleUpdateStatus = useCallback(async (recId, status) => {
    await updateStatus(
      () => recommendationsAPI.updateStatus(recId, status),
      {
        showSuccessToast: true,
        successMessage: `Recommendation ${status}`,
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [updateStatus, refetch])

  // PHASE 4B: Apply AutoFix handler
  const handleApplyAutoFix = useCallback(async (rec) => {
    setSelectedRec(rec)
    setShowAutoFixDialog(true)
  }, [])

  const handleConfirmAutoFix = useCallback(async () => {
    if (!selectedRec) return

    await applyAutoFix(
      () => recommendationsAPI.applyAutoFix(selectedRec.id),
      {
        showSuccessToast: true,
        successMessage: 'AutoFix applied successfully!',
        onSuccess: () => {
          refetch()
          setShowAutoFixDialog(false)
          setSelectedRec(null)
        }
      }
    )
  }, [selectedRec, applyAutoFix, refetch])

  const handleCopyFixCode = useCallback((code) => {
    navigator.clipboard.writeText(code)
    toast({
      title: 'Copied!',
      description: 'Fix code copied to clipboard'
    })
  }, [toast])

  const getPriorityColor = useCallback((priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'secondary'
    }
  }, [])

  const getSeverityColor = useCallback((severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'default'
      case 'MEDIUM': return 'secondary'
      case 'LOW': return 'outline'
      default: return 'secondary'
    }
  }, [])

  // PHASE 4B: Get AutoFix engine display name
  const getAutoFixEngineName = useCallback((engine) => {
    const names = {
      'meta-tags-fixer': 'Meta Tags',
      'image-alt-fixer': 'Image Alt Text',
      'schema-fixer': 'Schema Markup'
    }
    return names[engine] || engine
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Lightbulb className="h-8 w-8" />
          AI Recommendations
          <Badge variant="secondary" className="ml-2">Phase 4B</Badge>
        </h1>
        <p className="text-muted-foreground">
          Actionable suggestions from pixel detection with automated fixes
        </p>
      </div>

      {/* PHASE 4B: Enhanced Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        {/* PHASE 4B: AutoFix stat */}
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AutoFix Ready</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.autoFixAvailable}</div>
          </CardContent>
        </Card>

        {/* PHASE 4B: Pixel-generated stat */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">From Pixels</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pixelGenerated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recommendations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="SEO">SEO</SelectItem>
                <SelectItem value="CONTENT">Content</SelectItem>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="SCHEMA">Schema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search or filters' : 'All recommendations completed!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecommendations.map(rec => (
            <Card key={rec.id} className={(rec.auto_fix_available || rec.autoFixAvailable) ? 'border-primary/30' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>

                      {/* PHASE 4B: AutoFix Badge */}
                      {(rec.auto_fix_available || rec.autoFixAvailable) && (
                        <Badge variant="default" className="bg-primary">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AutoFix Available
                        </Badge>
                      )}

                      {/* PHASE 4B: Pixel Source Badge */}
                      {(rec.source_type === 'pixel_issue' || rec.sourceType === 'pixel_issue') && (
                        <Badge variant="outline">
                          <Zap className="h-3 w-3 mr-1" />
                          Pixel Detected
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{rec.description}</CardDescription>

                    {/* PHASE 4B: Show metadata */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(rec.auto_fix_engine || rec.autoFixEngine) && (
                        <Badge variant="secondary" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          {getAutoFixEngineName(rec.auto_fix_engine || rec.autoFixEngine)}
                        </Badge>
                      )}
                      {rec.metadata && typeof rec.metadata === 'object' && rec.metadata.pageUrl && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {new URL(rec.metadata.pageUrl).pathname}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rec.fix_code && (
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Fix Code:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyFixCode(rec.fix_code)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <code className="text-xs block overflow-x-auto">
                      {rec.fix_code.substring(0, 200)}
                      {rec.fix_code.length > 200 && '...'}
                    </code>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {rec.estimated_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {rec.estimated_time} min
                    </div>
                  )}
                  {rec.category && (
                    <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* PHASE 4B: AutoFix button */}
                  {(rec.auto_fix_available || rec.autoFixAvailable) && rec.status === 'pending' && (
                    <Button
                      onClick={() => handleApplyAutoFix(rec)}
                      disabled={applyingAutoFix}
                      className="bg-primary"
                    >
                      {applyingAutoFix ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Apply AutoFix
                    </Button>
                  )}

                  {rec.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus(rec.id, 'COMPLETED')}
                        disabled={updating}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Done
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus(rec.id, 'dismissed')}
                        disabled={updating}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* PHASE 4B: AutoFix Dialog */}
      <Dialog open={showAutoFixDialog} onOpenChange={setShowAutoFixDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Apply AutoFix
            </DialogTitle>
            <DialogDescription>
              Review the generated fix code before applying
            </DialogDescription>
          </DialogHeader>

          {selectedRec && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Recommendation</AlertTitle>
                <AlertDescription>{selectedRec.title}</AlertDescription>
              </Alert>

              <div>
                <h4 className="text-sm font-medium mb-2">AutoFix Engine:</h4>
                <Badge variant="secondary">
                  <Code className="h-3 w-3 mr-1" />
                  {getAutoFixEngineName(selectedRec.auto_fix_engine || selectedRec.autoFixEngine)}
                </Badge>
              </div>

              {selectedRec.fix_code && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Generated Fix Code:</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyFixCode(selectedRec.fix_code)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Code
                    </Button>
                  </div>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto max-h-96">
                    {selectedRec.fix_code}
                  </pre>
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Instructions</AlertTitle>
                <AlertDescription>
                  Copy the fix code above and paste it into your website's HTML where indicated.
                  Test the changes before deploying to production.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoFixDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAutoFix} disabled={applyingAutoFix}>
              {applyingAutoFix && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
