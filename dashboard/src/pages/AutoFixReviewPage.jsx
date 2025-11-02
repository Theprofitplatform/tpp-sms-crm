import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import ProposalCard from '../components/ProposalCard'
import ProposalDetailModal from '../components/ProposalDetailModal'
import {
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Play,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Search,
  X,
  Filter,
  SlidersHorizontal,
  ArrowUpDown
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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    riskLevels: [],
    severities: [],
    engines: []
  })
  const [sortBy, setSortBy] = useState('date-desc')
  
  // Detail Modal State
  const [selectedProposalForDetail, setSelectedProposalForDetail] = useState(null)

  // Load proposals
  const loadProposals = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/autofix/proposals?status=${filterStatus}&limit=500`
      )
      const data = await response.json()

      if (data.success) {
        let proposals = data.proposals || []

        // Enrich proposals with GSC data
        if (proposals.length > 0) {
          try {
            const enrichRes = await fetch(`${API_BASE}/gsc/enrich-proposals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId: 'instantautotraders',
                proposalIds: proposals.map(p => p.id)
              })
            })
            const enrichData = await enrichRes.json()

            if (enrichData.success && enrichData.enriched) {
              // Merge GSC data into proposals
              proposals = proposals.map(proposal => {
                const gscData = enrichData.enriched.find(e => e.proposal_id === proposal.id)
                if (gscData) {
                  return { ...proposal, gsc_data: gscData }
                }
                return proposal
              })
            }
          } catch (gscError) {
            console.warn('Failed to enrich proposals with GSC data:', gscError)
            // Continue without GSC data
          }
        }

        setProposals(proposals)
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

  // Filter and sort proposals (client-side)
  const filteredAndSortedProposals = useMemo(() => {
    let result = [...proposals]

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => {
        const searchableText = [
          p.issue_description || '',
          p.fix_description || '',
          p.target_title || '',
          p.before_value || '',
          p.after_value || '',
          p.engine_id || ''
        ].join(' ').toLowerCase()
        
        return searchableText.includes(query)
      })
    }

    // Risk level filter
    if (filters.riskLevels.length > 0) {
      result = result.filter(p => filters.riskLevels.includes(p.risk_level))
    }

    // Severity filter
    if (filters.severities.length > 0) {
      result = result.filter(p => filters.severities.includes(p.severity))
    }

    // Engine filter
    if (filters.engines.length > 0) {
      result = result.filter(p => filters.engines.includes(p.engine_id))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'date-asc':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'severity-desc': {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
        }
        case 'severity-asc': {
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0)
        }
        case 'risk-asc': {
          const riskOrder = { high: 3, medium: 2, low: 1 }
          return (riskOrder[a.risk_level] || 0) - (riskOrder[b.risk_level] || 0)
        }
        case 'risk-desc': {
          const riskOrder = { high: 3, medium: 2, low: 1 }
          return (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0)
        }
        case 'priority-desc':
          return (b.gsc_data?.priority_score || 0) - (a.gsc_data?.priority_score || 0)
        case 'priority-asc':
          return (a.gsc_data?.priority_score || 0) - (b.gsc_data?.priority_score || 0)
        case 'traffic-desc':
          return (b.gsc_data?.before_clicks_7d || 0) - (a.gsc_data?.before_clicks_7d || 0)
        case 'traffic-asc':
          return (a.gsc_data?.before_clicks_7d || 0) - (b.gsc_data?.before_clicks_7d || 0)
        default:
          return 0
      }
    })

    return result
  }, [proposals, searchQuery, filters, sortBy])

  // Get unique filter options
  const filterOptions = useMemo(() => {
    const riskLevels = [...new Set(proposals.map(p => p.risk_level).filter(Boolean))]
    const severities = [...new Set(proposals.map(p => p.severity).filter(Boolean))]
    const engines = [...new Set(proposals.map(p => p.engine_id).filter(Boolean))]

    return { riskLevels, severities, engines }
  }, [proposals])

  // Toggle filter
  const toggleFilter = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      riskLevels: [],
      severities: [],
      engines: []
    })
  }

  // Check if any filters active
  const hasActiveFilters = searchQuery || 
    filters.riskLevels.length > 0 || 
    filters.severities.length > 0 || 
    filters.engines.length > 0

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
      const response = await fetch(`${API_BASE}/autofix/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: `Applied ${data.applied} changes successfully`
        })
        loadProposals()
        loadStats()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply changes',
        variant: 'destructive'
      })
    } finally {
      setApplying(false)
    }
  }

  // Toggle proposal selection
  const toggleProposal = (proposalId) => {
    setSelectedProposals(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    )
  }

  // Select all visible
  const handleSelectAll = () => {
    if (selectedProposals.length === filteredAndSortedProposals.length) {
      setSelectedProposals([])
    } else {
      setSelectedProposals(filteredAndSortedProposals.map(p => p.id))
    }
  }

  // Select by filter
  const selectByRisk = (risk) => {
    const ids = filteredAndSortedProposals
      .filter(p => p.risk_level === risk)
      .map(p => p.id)
    setSelectedProposals(ids)
  }

  const selectBySeverity = (severity) => {
    const ids = filteredAndSortedProposals
      .filter(p => p.severity === severity)
      .map(p => p.id)
    setSelectedProposals(ids)
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
        <Button onClick={loadProposals} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_proposals || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Applied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.applied || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">GSC Enriched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {proposals.filter(p => p.gsc_data).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">with traffic data</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search proposals... (issue, fix, title, content)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-accent' : ''}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {[
                      filters.riskLevels.length,
                      filters.severities.length,
                      filters.engines.length
                    ].reduce((a, b) => a + b, 0)}
                  </Badge>
                )}
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="severity-desc">Severity: High to Low</option>
                <option value="severity-asc">Severity: Low to High</option>
                <option value="risk-asc">Risk: Low to High</option>
                <option value="risk-desc">Risk: High to Low</option>
                <option value="priority-desc">Priority: High to Low</option>
                <option value="priority-asc">Priority: Low to High</option>
                <option value="traffic-desc">Traffic: High to Low</option>
                <option value="traffic-asc">Traffic: Low to High</option>
              </select>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Filter Options</h3>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Risk Level */}
                  <div>
                    <p className="text-sm font-medium mb-2">Risk Level</p>
                    <div className="space-y-2">
                      {filterOptions.riskLevels.map(risk => (
                        <label key={risk} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.riskLevels.includes(risk)}
                            onChange={() => toggleFilter('riskLevels', risk)}
                            className="rounded"
                          />
                          <Badge
                            variant={risk === 'high' ? 'destructive' : risk === 'medium' ? 'default' : 'secondary'}
                          >
                            {risk}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Severity */}
                  <div>
                    <p className="text-sm font-medium mb-2">Severity</p>
                    <div className="space-y-2">
                      {filterOptions.severities.map(severity => (
                        <label key={severity} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.severities.includes(severity)}
                            onChange={() => toggleFilter('severities', severity)}
                            className="rounded"
                          />
                          <Badge
                            variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'default'}
                          >
                            {severity}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Engine */}
                  <div>
                    <p className="text-sm font-medium mb-2">Engine</p>
                    <div className="space-y-2">
                      {filterOptions.engines.map(engine => (
                        <label key={engine} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.engines.includes(engine)}
                            onChange={() => toggleFilter('engines', engine)}
                            className="rounded"
                          />
                          <span className="text-sm">{engine}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results count */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                Showing {filteredAndSortedProposals.length} of {proposals.length} proposals
                {hasActiveFilters && ' (filtered)'}
              </span>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList className="grid w-full grid-cols-4">
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

        <TabsContent value={filterStatus} className="space-y-4">
          {/* Bulk Actions */}
          {filterStatus === 'pending' && filteredAndSortedProposals.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">Bulk Actions:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedProposals.length === filteredAndSortedProposals.length ? 'Deselect All' : 'Select All Visible'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectByRisk('low')}
                  >
                    Select Low Risk
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectBySeverity('high')}
                  >
                    Select High Severity
                  </Button>
                  
                  {selectedProposals.length > 0 && (
                    <>
                      <div className="h-6 w-px bg-border mx-2" />
                      <Badge variant="secondary">
                        {selectedProposals.length} selected
                      </Badge>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleBulkReview('approve')}
                      >
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve Selected
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBulkReview('reject')}
                      >
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Reject Selected
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approved Actions */}
          {filterStatus === 'approved' && filteredAndSortedProposals.length > 0 && (
            <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">
                      {filteredAndSortedProposals.length} proposals approved and ready to apply
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      Click "Apply Changes" to push these updates to your website
                    </p>
                  </div>
                  <Button onClick={handleApply} disabled={applying}>
                    {applying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Apply Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Proposals List */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAndSortedProposals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? 'No proposals match your filters'
                    : `No ${filterStatus} proposals found`}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedProposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onReview={handleReview}
                  selected={selectedProposals.includes(proposal.id)}
                  onToggleSelect={() => toggleProposal(proposal.id)}
                  showCheckbox={filterStatus === 'pending'}
                  onClick={() => setSelectedProposalForDetail(proposal)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedProposalForDetail && (
        <ProposalDetailModal
          proposal={selectedProposalForDetail}
          onClose={() => setSelectedProposalForDetail(null)}
          onReview={handleReview}
          onNext={() => {
            const currentIndex = filteredAndSortedProposals.findIndex(
              p => p.id === selectedProposalForDetail.id
            )
            if (currentIndex < filteredAndSortedProposals.length - 1) {
              setSelectedProposalForDetail(filteredAndSortedProposals[currentIndex + 1])
            }
          }}
          onPrevious={() => {
            const currentIndex = filteredAndSortedProposals.findIndex(
              p => p.id === selectedProposalForDetail.id
            )
            if (currentIndex > 0) {
              setSelectedProposalForDetail(filteredAndSortedProposals[currentIndex - 1])
            }
          }}
          hasNext={
            filteredAndSortedProposals.findIndex(
              p => p.id === selectedProposalForDetail.id
            ) < filteredAndSortedProposals.length - 1
          }
          hasPrevious={
            filteredAndSortedProposals.findIndex(
              p => p.id === selectedProposalForDetail.id
            ) > 0
          }
          currentIndex={
            filteredAndSortedProposals.findIndex(
              p => p.id === selectedProposalForDetail.id
            )
          }
          totalCount={filteredAndSortedProposals.length}
        />
      )}
    </div>
  )
}
