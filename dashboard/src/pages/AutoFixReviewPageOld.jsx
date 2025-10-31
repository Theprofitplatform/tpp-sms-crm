import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import ProposalCard from '../components/ProposalCard'
import {
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Play,
  Loader2,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'

const API_BASE = '/api'

export default function AutoFixReviewPage({ onNavigate }) {
  const { toast } = useToast()

  const [proposals, setProposals] = useState([])
  const [selectedProposals, setSelectedProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [stats, setStats] = useState(null)

  // Load proposals
  const loadProposals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/autofix/proposals?status=${filterStatus}&limit=100`
      )
      const data = await response.json()

      if (data.success) {
        setProposals(data.proposals || [])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load proposals',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [filterStatus, toast])

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/autofix/statistics`)
      const data = await response.json()

      if (data.success) {
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  useEffect(() => {
    loadProposals()
    loadStats()
  }, [loadProposals, loadStats])

  // Handle single review
  const handleReview = async (proposalId, action) => {
    try {
      const response = await fetch(`${API_BASE}/autofix/proposals/${proposalId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewedBy: 'user'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `Proposal ${action}d successfully`
        })
        loadProposals()
        loadStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review proposal',
        variant: 'destructive'
      })
    }
  }

  // Handle bulk review
  const handleBulkReview = async (action) => {
    if (selectedProposals.length === 0) return

    try {
      const response = await fetch(`${API_BASE}/autofix/proposals/bulk-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalIds: selectedProposals,
          action,
          reviewedBy: 'user'
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `${selectedProposals.length} proposals ${action}d`
        })
        setSelectedProposals([])
        loadProposals()
        loadStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to review proposals',
        variant: 'destructive'
      })
    }
  }

  // Apply approved proposals
  const handleApply = async () => {
    // Get unique group IDs from approved proposals
    const approvedProposals = proposals.filter(p => p.status === 'approved')
    const groupIds = [...new Set(approvedProposals.map(p => p.proposal_group_id))]

    if (groupIds.length === 0) {
      toast({
        title: 'No Approved Proposals',
        description: 'There are no approved proposals to apply',
        variant: 'destructive'
      })
      return
    }

    setApplying(true)

    try {
      for (const groupId of groupIds) {
        // Get group info
        const groupResponse = await fetch(`${API_BASE}/autofix/proposals/group/${groupId}`)
        const groupData = await groupResponse.json()

        if (groupData.success && groupData.session) {
          // Apply
          const applyResponse = await fetch(`${API_BASE}/autofix/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupId,
              engineId: groupData.session.engine_id,
              clientId: groupData.session.client_id
            })
          })

          const applyData = await applyResponse.json()

          if (applyData.success) {
            toast({
              title: 'Success',
              description: `Applied ${applyData.result.succeeded} changes from ${groupData.session.engine_name}`
            })
          }
        }
      }

      loadProposals()
      loadStats()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply proposals',
        variant: 'destructive'
      })
    } finally {
      setApplying(false)
    }
  }

  // Select/deselect proposal
  const handleSelectProposal = (proposalId) => {
    setSelectedProposals(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    )
  }

  // Select all visible
  const handleSelectAll = () => {
    if (selectedProposals.length === proposals.length) {
      setSelectedProposals([])
    } else {
      setSelectedProposals(proposals.map(p => p.id))
    }
  }

  if (loading && proposals.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading proposals...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate && onNavigate('autofix')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Review Auto-Fix Proposals</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Review and approve changes before they're applied to your website
          </p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applied || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.approval_rate ? stats.approval_rate.toFixed(0) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedProposals.length > 0 && (
        <Card className="bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedProposals.length} proposal{selectedProposals.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkReview('approve')}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkReview('reject')}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProposals([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="mr-2 h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="mr-2 h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="mr-2 h-4 w-4" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="applied">
              <Play className="mr-2 h-4 w-4" />
              Applied
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {filterStatus === 'approved' && proposals.length > 0 && (
              <Button
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Apply All Approved
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                loadProposals()
                loadStats()
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <TabsContent value={filterStatus} className="space-y-4">
          {filterStatus === 'pending' && proposals.length > 0 && (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedProposals.length === proposals.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          )}

          {proposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No {filterStatus} proposals</h3>
                <p className="text-muted-foreground">
                  {filterStatus === 'pending' && 'Run an auto-fix engine to generate proposals'}
                  {filterStatus === 'approved' && 'No proposals have been approved yet'}
                  {filterStatus === 'rejected' && 'No proposals have been rejected'}
                  {filterStatus === 'applied' && 'No proposals have been applied yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {proposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  selected={selectedProposals.includes(proposal.id)}
                  onSelect={handleSelectProposal}
                  onReview={handleReview}
                  showActions={filterStatus === 'pending'}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
