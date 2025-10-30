import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Checkbox } from './ui/checkbox'
import { ThumbsUp, ThumbsDown, Info, AlertTriangle } from 'lucide-react'

export function ProposalCard({
  proposal,
  selected,
  onSelect,
  onToggleSelect,
  onReview,
  showCheckbox,
  showActions = true,
  onClick
}) {
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getSeverityIcon = (severity) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-3 w-3" />
    }
    return <Info className="h-3 w-3" />
  }

  return (
    <Card 
      className={`transition-all ${selected ? 'ring-2 ring-primary' : ''} ${onClick ? 'cursor-pointer hover:bg-accent' : ''}`}
      onClick={(e) => {
        // Don't trigger if clicking on checkbox or buttons
        if (e.target.closest('button') || e.target.closest('[role="checkbox"]')) {
          return
        }
        onClick && onClick()
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {showCheckbox && proposal.status === 'pending' && onToggleSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              className="mt-1"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {proposal.engine_name}
              </Badge>
              <Badge variant={getRiskColor(proposal.risk_level)} className="text-xs">
                {proposal.risk_level} risk
              </Badge>
              <Badge 
                variant={getSeverityColor(proposal.severity)} 
                className="text-xs flex items-center gap-1"
              >
                {getSeverityIcon(proposal.severity)}
                {proposal.severity}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {proposal.category}
              </Badge>
            </div>

            <CardTitle className="text-base mb-1">
              {proposal.fix_description}
            </CardTitle>
            
            <p className="text-sm text-muted-foreground">
              {proposal.issue_description}
            </p>

            <div className="text-xs text-muted-foreground mt-2">
              <strong>Target:</strong> {proposal.target_title || `${proposal.target_type} ${proposal.target_id}`} ({proposal.field_name})
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Diff View */}
        {proposal.diff_html ? (
          <div className="bg-muted p-3 rounded-lg overflow-x-auto">
            <div 
              className="text-sm font-mono"
              dangerouslySetInnerHTML={{ __html: proposal.diff_html }}
            />
          </div>
        ) : (
          <div className="bg-muted p-3 rounded-lg space-y-1">
            <div className="text-xs font-mono text-red-600 dark:text-red-400 line-through">
              {proposal.before_value?.substring(0, 150)}
              {proposal.before_value?.length > 150 && '...'}
            </div>
            <div className="text-xs font-mono text-green-600 dark:text-green-400">
              {proposal.after_value?.substring(0, 150)}
              {proposal.after_value?.length > 150 && '...'}
            </div>
          </div>
        )}

        {/* Expected Benefit */}
        {proposal.expected_benefit && (
          <div className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{proposal.expected_benefit}</span>
          </div>
        )}

        {/* Actions */}
        {showActions && proposal.status === 'pending' && onReview && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onReview(proposal.id, 'approve')}
              className="flex-1"
            >
              <ThumbsUp className="mr-1 h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(proposal.id, 'reject')}
              className="flex-1"
            >
              <ThumbsDown className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )}

        {/* Status Badge for non-pending */}
        {proposal.status !== 'pending' && (
          <div className="pt-2 flex items-center gap-2">
            <Badge 
              variant={
                proposal.status === 'approved' || proposal.status === 'applied'
                  ? 'default'
                  : proposal.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {proposal.status}
            </Badge>
            {proposal.reviewed_by && (
              <span className="text-xs text-muted-foreground">
                by {proposal.reviewed_by}
              </span>
            )}
            {proposal.reviewed_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(proposal.reviewed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProposalCard
