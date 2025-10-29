import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  Loader2
} from 'lucide-react'

export default function RecommendationsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')

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
  const { execute: applyRec, loading: applying } = useAPIRequest()

  // Filter recommendations locally by search
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec =>
      rec.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      rec.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
  }, [recommendations, debouncedSearch])

  const stats = useMemo(() => {
    return {
      total: recommendations.length,
      pending: recommendations.filter(r => r.status === 'pending').length,
      completed: recommendations.filter(r => r.status === 'completed').length,
      avgImpact: recommendations.length > 0
        ? Math.round(recommendations.reduce((sum, r) => sum + (r.impact || 0), 0) / recommendations.length)
        : 0
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

  const handleApply = useCallback(async (recId) => {
    if (!confirm('Apply this recommendation? This will make changes to your site.')) return

    await applyRec(
      () => recommendationsAPI.apply(recId),
      {
        showSuccessToast: true,
        successMessage: 'Recommendation applied successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [applyRec, refetch])

  const getPriorityColor = useCallback((priority) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'secondary'
    }
  }, [])

  const getImpactColor = useCallback((impact) => {
    if (impact >= 80) return 'text-green-600'
    if (impact >= 50) return 'text-yellow-600'
    return 'text-muted-foreground'
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
        </h1>
        <p className="text-muted-foreground">
          Actionable suggestions to improve your SEO
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgImpact}%</div>
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
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
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
            <Card key={rec.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <CardDescription>{rec.description}</CardDescription>
                    {rec.clientName && (
                      <Badge variant="outline" className="mt-2">
                        {rec.clientName}
                      </Badge>
                    )}
                  </div>
                  <div className={`text-2xl font-bold ${getImpactColor(rec.impact)}`}>
                    +{rec.impact}%
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rec.benefits && rec.benefits.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Benefits:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {rec.benefits.map((benefit, idx) => (
                        <li key={idx}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {rec.effort && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Effort: {rec.effort}
                    </div>
                  )}
                  {rec.estimatedTime && (
                    <div>Time: {rec.estimatedTime}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApply(rec.id)}
                    disabled={applying || rec.status === 'completed'}
                  >
                    {applying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Apply
                  </Button>
                  {rec.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus(rec.id, 'completed')}
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
    </div>
  )
}
