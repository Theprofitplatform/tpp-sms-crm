import { useEffect } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  SkipForward
} from 'lucide-react'

export default function ProposalDetailModal({
  proposal,
  onClose,
  onReview,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  currentIndex,
  totalCount
}) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious()
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext()
      }

      // Quick actions (only for pending)
      if (proposal.status === 'pending') {
        if (e.key === 'a' || e.key === 'A') {
          onReview(proposal.id, 'approve')
          if (hasNext) onNext()
          else onClose()
        } else if (e.key === 'r' || e.key === 'R') {
          onReview(proposal.id, 'reject')
          if (hasNext) onNext()
          else onClose()
        } else if (e.key === 's' || e.key === 'S') {
          if (hasNext) onNext()
          else onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [proposal, onClose, onReview, onNext, onPrevious, hasNext, hasPrevious])

  if (!proposal) return null

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'applied':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {getStatusIcon(proposal.status)}
            <div>
              <h2 className="text-2xl font-bold">Proposal Details</h2>
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {totalCount}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <Badge>{proposal.engine_id}</Badge>
            <Badge variant={getRiskColor(proposal.risk_level)}>
              {proposal.risk_level} risk
            </Badge>
            <Badge variant={getSeverityColor(proposal.severity)}>
              {proposal.severity}
            </Badge>
            <Badge variant="outline">{proposal.status}</Badge>
          </div>

          {/* Location */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Location</p>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      <p>
                        <span className="font-medium">Type:</span>{' '}
                        {proposal.target_type}
                      </p>
                      <p>
                        <span className="font-medium">Title:</span>{' '}
                        {proposal.target_title}
                      </p>
                      {proposal.target_url && (
                        <p>
                          <span className="font-medium">URL:</span>{' '}
                          {proposal.target_url}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Field:</span>{' '}
                        {proposal.field_name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Issue Description</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {proposal.issue_description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposed Fix */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Proposed Fix</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {proposal.fix_description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact */}
          {proposal.impact && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-6">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Expected Impact
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 mt-2 list-disc list-inside">
                  {proposal.impact.split('\n').map((line, i) => (
                    <li key={i}>{line.replace(/^[•\-]\s*/, '')}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Risk Assessment */}
          <Card
            className={
              proposal.risk_level === 'high'
                ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900'
                : proposal.risk_level === 'medium'
                ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900'
                : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900'
            }
          >
            <CardContent className="pt-6">
              <p className="font-semibold">Risk Assessment</p>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <span className="font-medium">Risk Level:</span>{' '}
                  <Badge variant={getRiskColor(proposal.risk_level)}>
                    {proposal.risk_level}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Severity:</span>{' '}
                  <Badge variant={getSeverityColor(proposal.severity)}>
                    {proposal.severity}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Reversible:</span> Yes (can be
                  rolled back)
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full Diff */}
          <Card>
            <CardContent className="pt-6">
              <p className="font-semibold mb-3">Changes</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Before */}
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    Before
                  </p>
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                      {proposal.before_value || '(empty)'}
                    </pre>
                  </div>
                </div>

                {/* After */}
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                    After
                  </p>
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded-lg p-3">
                    <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                      {proposal.after_value || '(empty)'}
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <p className="font-semibold mb-3">Metadata</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  <span className="text-muted-foreground">
                    {new Date(proposal.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Group ID:</span>{' '}
                  <span className="text-muted-foreground font-mono text-xs">
                    {proposal.proposal_group_id}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Proposal ID:</span>{' '}
                  <span className="text-muted-foreground">{proposal.id}</span>
                </div>
                {proposal.reviewed_at && (
                  <div>
                    <span className="font-medium">Reviewed:</span>{' '}
                    <span className="text-muted-foreground">
                      {new Date(proposal.reviewed_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {proposal.applied_at && (
                  <div>
                    <span className="font-medium">Applied:</span>{' '}
                    <span className="text-muted-foreground">
                      {new Date(proposal.applied_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts Help */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="font-semibold mb-3 text-sm">Keyboard Shortcuts</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <kbd className="px-2 py-1 bg-background rounded border">←</kbd>{' '}
                  <kbd className="px-2 py-1 bg-background rounded border">→</kbd>{' '}
                  Previous/Next
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-background rounded border">
                    Esc
                  </kbd>{' '}
                  Close
                </div>
                {proposal.status === 'pending' && (
                  <>
                    <div>
                      <kbd className="px-2 py-1 bg-background rounded border">
                        A
                      </kbd>{' '}
                      Approve & Next
                    </div>
                    <div>
                      <kbd className="px-2 py-1 bg-background rounded border">
                        R
                      </kbd>{' '}
                      Reject & Next
                    </div>
                    <div>
                      <kbd className="px-2 py-1 bg-background rounded border">
                        S
                      </kbd>{' '}
                      Skip to Next
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        {proposal.status === 'pending' && (
          <div className="p-6 border-t bg-muted/30">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (hasNext) onNext()
                    else onClose()
                  }}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReview(proposal.id, 'reject')
                    if (hasNext) onNext()
                    else onClose()
                  }}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    onReview(proposal.id, 'approve')
                    if (hasNext) onNext()
                    else onClose()
                  }}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
