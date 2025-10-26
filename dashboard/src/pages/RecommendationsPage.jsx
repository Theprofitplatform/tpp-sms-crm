import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Lightbulb,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export function RecommendationsPage() {
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      // Mock recommendations data (in real implementation, fetch from backend)
      const mockRecommendations = [
        {
          id: 'rec-1',
          title: 'Improve Page Load Speed',
          description: 'Optimize images and enable caching to reduce page load time from 3.2s to under 2s',
          category: 'performance',
          priority: 'high',
          impact: 85,
          effort: 'medium',
          estimatedTime: '4-6 hours',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          status: 'pending',
          createdAt: new Date(Date.now() - 86400000),
          benefits: [
            'Improved user experience',
            'Better search rankings',
            'Reduced bounce rate'
          ],
          steps: [
            'Compress and optimize images',
            'Enable browser caching',
            'Minify CSS and JavaScript',
            'Use a CDN'
          ]
        },
        {
          id: 'rec-2',
          title: 'Add Schema Markup for Products',
          description: 'Implement Product schema to enhance search result appearance',
          category: 'technical',
          priority: 'high',
          impact: 78,
          effort: 'low',
          estimatedTime: '2-3 hours',
          clientId: 'hottyres',
          clientName: 'Hot Tyres',
          status: 'pending',
          createdAt: new Date(Date.now() - 172800000),
          benefits: [
            'Rich snippets in search results',
            'Higher click-through rates',
            'Better product visibility'
          ],
          steps: [
            'Add Product schema markup',
            'Include price and availability',
            'Test with Google Rich Results',
            'Monitor performance'
          ]
        },
        {
          id: 'rec-3',
          title: 'Fix Missing Alt Text on Images',
          description: '23 images are missing descriptive alt text affecting accessibility and SEO',
          category: 'accessibility',
          priority: 'medium',
          impact: 62,
          effort: 'low',
          estimatedTime: '1-2 hours',
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          status: 'pending',
          createdAt: new Date(Date.now() - 259200000),
          benefits: [
            'Improved accessibility',
            'Better image SEO',
            'Enhanced user experience'
          ],
          steps: [
            'Audit all images',
            'Write descriptive alt text',
            'Update CMS templates',
            'Verify implementation'
          ]
        },
        {
          id: 'rec-4',
          title: 'Optimize Meta Descriptions',
          description: '12 pages have meta descriptions that are too short or missing',
          category: 'on-page',
          priority: 'high',
          impact: 72,
          effort: 'low',
          estimatedTime: '2-3 hours',
          clientId: 'sadcdisabilityservices',
          clientName: 'SADC Disability Services',
          status: 'pending',
          createdAt: new Date(Date.now() - 345600000),
          benefits: [
            'Improved click-through rates',
            'Better search visibility',
            'More descriptive previews'
          ],
          steps: [
            'Review current meta descriptions',
            'Write compelling descriptions',
            'Include target keywords',
            'Test in search results'
          ]
        },
        {
          id: 'rec-5',
          title: 'Create XML Sitemap',
          description: 'No XML sitemap found - create and submit to search engines',
          category: 'technical',
          priority: 'high',
          impact: 88,
          effort: 'low',
          estimatedTime: '1 hour',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          status: 'pending',
          createdAt: new Date(Date.now() - 432000000),
          benefits: [
            'Better indexation',
            'Faster discovery of new content',
            'Improved crawl efficiency'
          ],
          steps: [
            'Generate XML sitemap',
            'Submit to Google Search Console',
            'Submit to Bing Webmaster Tools',
            'Monitor indexation status'
          ]
        },
        {
          id: 'rec-6',
          title: 'Improve Internal Linking',
          description: 'Add strategic internal links to improve site structure and page authority',
          category: 'on-page',
          priority: 'medium',
          impact: 65,
          effort: 'medium',
          estimatedTime: '3-4 hours',
          clientId: 'hottyres',
          clientName: 'Hot Tyres',
          status: 'in-progress',
          createdAt: new Date(Date.now() - 518400000),
          benefits: [
            'Better page authority distribution',
            'Improved navigation',
            'Enhanced user experience'
          ],
          steps: [
            'Audit current link structure',
            'Identify linking opportunities',
            'Add contextual links',
            'Monitor impact'
          ]
        },
        {
          id: 'rec-7',
          title: 'Fix Duplicate Content Issues',
          description: '5 pages have duplicate or very similar content',
          category: 'content',
          priority: 'high',
          impact: 80,
          effort: 'high',
          estimatedTime: '6-8 hours',
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          status: 'pending',
          createdAt: new Date(Date.now() - 604800000),
          benefits: [
            'Avoid ranking penalties',
            'Better page rankings',
            'Improved content quality'
          ],
          steps: [
            'Identify duplicate content',
            'Rewrite or consolidate pages',
            'Set up canonical tags',
            'Monitor search performance'
          ]
        },
        {
          id: 'rec-8',
          title: 'Enable HTTPS Everywhere',
          description: 'Some pages still load over HTTP - implement HTTPS site-wide',
          category: 'technical',
          priority: 'high',
          impact: 90,
          effort: 'medium',
          estimatedTime: '3-5 hours',
          clientId: 'sadcdisabilityservices',
          clientName: 'SADC Disability Services',
          status: 'completed',
          createdAt: new Date(Date.now() - 691200000),
          completedAt: new Date(Date.now() - 86400000),
          benefits: [
            'Improved security',
            'SEO ranking boost',
            'Better user trust'
          ],
          steps: [
            'Obtain SSL certificate',
            'Update all internal links',
            'Set up 301 redirects',
            'Update Google Search Console'
          ]
        }
      ]

      setRecommendations(mockRecommendations)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      toast({
        title: "Error Loading Recommendations",
        description: "Could not fetch recommendations data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleApplyRecommendation = (recId) => {
    toast({
      title: "Recommendation Queued",
      description: "This recommendation has been added to your action queue.",
    })
    setRecommendations(recommendations.map(rec =>
      rec.id === recId ? { ...rec, status: 'in-progress' } : rec
    ))
  }

  const handleMarkComplete = (recId) => {
    toast({
      title: "Marked as Complete",
      description: "This recommendation has been marked as completed.",
    })
    setRecommendations(recommendations.map(rec =>
      rec.id === recId ? { ...rec, status: 'completed', completedAt: new Date() } : rec
    ))
  }

  const handleDismiss = (recId) => {
    toast({
      title: "Recommendation Dismissed",
      description: "This recommendation has been dismissed.",
      variant: "destructive"
    })
    setRecommendations(recommendations.map(rec =>
      rec.id === recId ? { ...rec, status: 'dismissed' } : rec
    ))
  }

  // Filter recommendations
  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter
    const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'pending').length,
    inProgress: recommendations.filter(r => r.status === 'in-progress').length,
    completed: recommendations.filter(r => r.status === 'completed').length,
    avgImpact: recommendations.length > 0
      ? Math.round(recommendations.reduce((sum, r) => sum + r.impact, 0) / recommendations.length)
      : 0
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getImpactColor = (impact) => {
    if (impact >= 80) return 'text-green-600'
    if (impact >= 60) return 'text-yellow-600'
    return 'text-orange-600'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recommendations</h1>
            <p className="text-muted-foreground">Loading recommendations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recommendations</h1>
          <p className="text-muted-foreground">
            AI-powered SEO suggestions and action items
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Not started
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgImpact}</div>
            <p className="text-xs text-muted-foreground">
              Impact score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recommendations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="on-page">On-Page SEO</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
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
        </CardHeader>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All caught up! Run audits to generate new recommendations.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecommendations.map(rec => (
            <Card key={rec.id} className={rec.status === 'completed' ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                      <Badge variant={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {rec.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>{rec.description}</CardDescription>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className={`h-4 w-4 ${getImpactColor(rec.impact)}`} />
                        Impact: <span className="font-semibold">{rec.impact}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {rec.estimatedTime}
                      </span>
                      <span>Effort: {rec.effort}</span>
                      <span>Client: {rec.clientName}</span>
                    </div>
                  </div>
                  {rec.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApplyRecommendation(rec.id)}>
                        Apply
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDismiss(rec.id)}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                  {rec.status === 'in-progress' && (
                    <Button size="sm" onClick={() => handleMarkComplete(rec.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  {rec.status === 'completed' && (
                    <Badge variant="default">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Benefits:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {rec.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Implementation Steps:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      {rec.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-semibold text-primary">{idx + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
