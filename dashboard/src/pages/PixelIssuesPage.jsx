/**
 * PIXEL ISSUES PAGE - Phase 4B Integration
 *
 * Comprehensive view of all pixel-detected SEO issues with:
 * - Issue trends and analytics charts
 * - Severity breakdown
 * - Integration with recommendations and AutoFix
 * - Real-time issue tracking
 */

import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Sparkles,
  ExternalLink,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export default function PixelIssuesPage() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    category: 'all',
    hasRecommendation: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()

  // Fetch issues
  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pixel/issues')
      const data = await response.json()
      setIssues(data.issues || [])
    } catch (error) {
      console.error('Failed to fetch issues:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pixel issues',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchIssues()
    setRefreshing(false)
    toast({
      title: 'Refreshed',
      description: 'Issue data has been updated'
    })
  }

  // Filter and search issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Severity filter
      if (filters.severity !== 'all' && issue.severity !== filters.severity) {
        return false
      }

      // Status filter
      if (filters.status !== 'all' && issue.status !== filters.status) {
        return false
      }

      // Category filter
      if (filters.category !== 'all' && issue.category !== filters.category) {
        return false
      }

      // Has recommendation filter
      if (filters.hasRecommendation !== 'all') {
        const hasRec = issue.recommendation_id || issue.recommendationId
        if (filters.hasRecommendation === 'yes' && !hasRec) return false
        if (filters.hasRecommendation === 'no' && hasRec) return false
      }

      // Search term
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          (issue.issue_type || '').toLowerCase().includes(search) ||
          (issue.page_url || '').toLowerCase().includes(search) ||
          (issue.description || '').toLowerCase().includes(search)
        )
      }

      return true
    })
  }, [issues, filters, searchTerm])

  // Calculate stats
  const stats = useMemo(() => {
    const total = issues.length
    const open = issues.filter(i => i.status === 'OPEN').length
    const resolved = issues.filter(i => i.status === 'RESOLVED').length
    const critical = issues.filter(i => i.severity === 'CRITICAL').length
    const withRecommendations = issues.filter(i => i.recommendation_id || i.recommendationId).length

    return {
      total,
      open,
      resolved,
      critical,
      withRecommendations,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0
    }
  }, [issues])

  // Prepare chart data
  const severityChartData = useMemo(() => {
    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    }

    issues.forEach(issue => {
      if (severityCounts.hasOwnProperty(issue.severity)) {
        severityCounts[issue.severity]++
      }
    })

    return Object.entries(severityCounts).map(([name, value]) => ({
      name,
      value,
      percentage: stats.total > 0 ? ((value / stats.total) * 100).toFixed(1) : 0
    }))
  }, [issues, stats.total])

  const categoryChartData = useMemo(() => {
    const categoryCounts = {}

    issues.forEach(issue => {
      const category = issue.category || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [issues])

  // Trend data (mock - would come from API in production)
  const trendData = [
    { date: '2 weeks ago', issues: 45, resolved: 12 },
    { date: '10 days ago', issues: 52, resolved: 18 },
    { date: '1 week ago', issues: 48, resolved: 25 },
    { date: '5 days ago', issues: 55, resolved: 30 },
    { date: '3 days ago', issues: 50, resolved: 35 },
    { date: '1 day ago', issues: 47, resolved: 38 },
    { date: 'Today', issues: stats.open, resolved: stats.resolved }
  ]

  const SEVERITY_COLORS = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e'
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />
      case 'MEDIUM':
        return <Info className="h-4 w-4" />
      case 'LOW':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive'
      case 'HIGH':
        return 'default'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)

    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const handleViewRecommendation = (issue) => {
    if (issue.recommendation_id || issue.recommendationId) {
      navigate('/recommendations')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pixel Issues</h1>
          <p className="text-muted-foreground mt-1">
            SEO issues detected by your monitoring pixels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.open} open, {stats.resolved} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">With Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.withRecommendations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AutoFix may be available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.resolutionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.resolved} of {stats.total} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="severity">
            <PieChart className="h-4 w-4 mr-2" />
            Severity
          </TabsTrigger>
          <TabsTrigger value="categories">
            <BarChart3 className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issue Trends</CardTitle>
              <CardDescription>Issues detected and resolved over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="issues" stroke="#ef4444" name="Open Issues" />
                  <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>Issues breakdown by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={severityChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="flex flex-col justify-center space-y-4">
                  {severityChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: SEVERITY_COLORS[item.name] }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{item.value}</div>
                        <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues by Category</CardTitle>
              <CardDescription>Most common issue types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={filters.severity} onValueChange={(v) => setFilters({ ...filters, severity: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="meta">Meta Tags</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="schema">Schema</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.hasRecommendation} onValueChange={(v) => setFilters({ ...filters, hasRecommendation: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Has Recommendation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">With Recommendation</SelectItem>
                <SelectItem value="no">Without Recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Issues ({filteredIssues.length})</CardTitle>
          <CardDescription>
            Showing {filteredIssues.length} of {issues.length} total issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading issues...</div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No issues found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityColor(issue.severity)} className="gap-1">
                          {getSeverityIcon(issue.severity)}
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">{issue.category}</Badge>
                        {(issue.recommendation_id || issue.recommendationId) && (
                          <Badge className="bg-primary gap-1">
                            <Sparkles className="h-3 w-3" />
                            Has Recommendation
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-semibold mb-1">
                        {issue.issue_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>

                      <p className="text-sm text-muted-foreground mb-2">
                        {issue.description || issue.recommendation}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {new URL(issue.page_url).pathname}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(issue.detected_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {issue.domain}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(issue.recommendation_id || issue.recommendationId) && (
                        <Button
                          size="sm"
                          onClick={() => handleViewRecommendation(issue)}
                        >
                          View Fix
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
