/**
 * AutoFixPanel Component
 *
 * Displays fixable SEO issues detected by Otto SEO Pixel
 * with automated fix proposals and one-click apply functionality.
 *
 * Phase: 4B - AutoFix UI Integration
 * Date: November 2, 2025
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pixelAPI } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  Code,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Play,
  Clock,
  TrendingUp
} from 'lucide-react'

export default function AutoFixPanel({ clientId }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pixelId, setPixelId] = useState(null)
  const [fixableIssues, setFixableIssues] = useState([])
  const [applying, setApplying] = useState({})
  const [previewProposal, setPreviewProposal] = useState(null)
  const [expandedIssues, setExpandedIssues] = useState(new Set())

  // Fetch pixel and fixable issues
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get client's pixel
        const pixelResponse = await pixelAPI.getClientPixels(clientId)
        if (!pixelResponse.success || !pixelResponse.data || pixelResponse.data.length === 0) {
          setPixelId(null)
          setLoading(false)
          return
        }

        const pixel = pixelResponse.data[0]
        setPixelId(pixel.id)

        // Fetch fixable issues
        const fixableResponse = await pixelAPI.getFixableIssues(pixel.id)
        if (fixableResponse.success) {
          setFixableIssues(fixableResponse.data || [])
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch AutoFix data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (clientId) {
      fetchData()
    }
  }, [clientId])

  // Apply a fix
  const handleApplyFix = async (proposalId, issueId) => {
    setApplying(prev => ({ ...prev, [proposalId]: true }))

    try {
      const result = await pixelAPI.applyFix(proposalId, true, 'dashboard-user')

      if (result.success) {
        toast({
          title: 'Fix Applied Successfully',
          description: 'The SEO issue has been resolved with the automated fix.',
        })

        // Remove the fixed issue from the list
        setFixableIssues(prev => prev.filter(item => item.issue.id !== issueId))
      } else {
        throw new Error(result.error || 'Failed to apply fix')
      }
    } catch (err) {
      toast({
        title: 'Fix Application Failed',
        description: err.message,
        variant: 'destructive'
      })
    } finally {
      setApplying(prev => ({ ...prev, [proposalId]: false }))
    }
  }

  // Toggle issue expansion
  const toggleExpanded = (issueId) => {
    setExpandedIssues(prev => {
      const next = new Set(prev)
      if (next.has(issueId)) {
        next.delete(issueId)
      } else {
        next.add(issueId)
      }
      return next
    })
  }

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  // Get confidence label
  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  // Render loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AutoFix
          </CardTitle>
          <CardDescription>Automated SEO issue resolution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AutoFix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Render no pixel state
  if (!pixelId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AutoFix
          </CardTitle>
          <CardDescription>Automated SEO issue resolution</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Otto SEO pixel deployed for this client. Deploy a pixel to enable AutoFix.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Render no issues state
  if (fixableIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AutoFix
          </CardTitle>
          <CardDescription>Automated SEO issue resolution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Fixable Issues</h3>
            <p className="text-muted-foreground">
              All detected SEO issues are either resolved or cannot be automatically fixed.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render fixable issues
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AutoFix
                <Badge variant="secondary">{fixableIssues.length} Fixable</Badge>
              </CardTitle>
              <CardDescription>Automated SEO issue resolution powered by AI</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Phase 4B
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fixableIssues.map(({ issue, fixProposal }) => {
              const isExpanded = expandedIssues.has(issue.id)
              const isApplying = applying[fixProposal.proposalId]

              return (
                <div
                  key={issue.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Issue Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{issue.issue_type.replace(/_/g, ' ')}</h4>
                        <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : issue.severity === 'HIGH' ? 'default' : 'secondary'}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline" className={getConfidenceColor(fixProposal.confidence)}>
                          {(fixProposal.confidence * 100).toFixed(0)}% Confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Page: {issue.page_url}
                      </p>
                    </div>
                  </div>

                  {/* Fix Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => setPreviewProposal(fixProposal)}
                      variant="outline"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview Fix
                    </Button>

                    {fixProposal.confidence >= 0.8 ? (
                      <Button
                        size="sm"
                        onClick={() => handleApplyFix(fixProposal.proposalId, issue.id)}
                        disabled={isApplying}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-Apply
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApplyFix(fixProposal.proposalId, issue.id)}
                        disabled={isApplying}
                        variant="default"
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Apply with Review
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(issue.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Details
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Engine:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {fixProposal.engine}
                        </code>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Estimated Time:</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fixProposal.estimatedTime} seconds
                        </p>
                      </div>

                      {fixProposal.metadata && Object.keys(fixProposal.metadata).length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1">Metadata:</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(fixProposal.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewProposal && (
        <Dialog open={!!previewProposal} onOpenChange={() => setPreviewProposal(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Fix Preview
              </DialogTitle>
              <DialogDescription>
                Preview the automatically generated fix code
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Confidence Score:</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getConfidenceColor(previewProposal.confidence)}>
                    {(previewProposal.confidence * 100).toFixed(0)}%
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({getConfidenceLabel(previewProposal.confidence)} Confidence)
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Generated Fix Code:</p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {previewProposal.fix}
                  </pre>
                </div>
              </div>

              {previewProposal.requiresReview && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This fix requires manual review before application due to confidence score below 0.8
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewProposal(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const proposalId = previewProposal.proposalId
                  const issueId = fixableIssues.find(item =>
                    item.fixProposal.proposalId === proposalId
                  )?.issue.id

                  setPreviewProposal(null)
                  if (issueId) {
                    handleApplyFix(proposalId, issueId)
                  }
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Apply This Fix
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
