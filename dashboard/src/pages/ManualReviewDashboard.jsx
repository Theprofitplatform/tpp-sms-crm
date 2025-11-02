import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useToast } from '../hooks/use-toast'
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Play,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const API_BASE = '/api'

export default function ManualReviewDashboard({ onNavigate }) {
  const { toast } = useToast()
  const [stats, setStats] = useState(null)
  const [recentProposals, setRecentProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [engines, setEngines] = useState([])

  // Available engines
  const availableEngines = [
    { id: 'nap-fixer', name: 'NAP Fixer', description: 'Fix NAP consistency', icon: '📍' },
    { id: 'broken-link-detector-v2', name: 'Broken Links', description: 'Detect broken links', icon: '🔗' },
    { id: 'image-optimizer-v2', name: 'Image Optimizer', description: 'Optimize images', icon: '🖼️' },
    { id: 'title-meta-optimizer-v2', name: 'Title/Meta', description: 'Optimize titles & metas', icon: '📝' },
    { id: 'schema-injector-v2', name: 'Schema', description: 'Add structured data', icon: '📊' },
    { id: 'content-optimizer-v2', name: 'Content', description: 'Optimize content', icon: '✍️' },
    { id: 'redirect-checker-v2', name: 'Redirects', description: 'Check redirects', icon: '↪️' },
    { id: 'internal-link-builder-v2', name: 'Internal Links', description: 'Build internal links', icon: '🔗' },
    { id: 'sitemap-optimizer-v2', name: 'Sitemap', description: 'Optimize sitemap', icon: '🗺️' },
    { id: 'robots-txt-manager-v2', name: 'Robots.txt', description: 'Manage robots.txt', icon: '🤖' }
  ]

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load statistics
      const statsRes = await fetch(`${API_BASE}/autofix/statistics`)
      const statsData = await statsRes.json()
      if (statsData.success) {
        setStats(statsData.statistics)
      }

      // Load recent proposals
      const proposalsRes = await fetch(`${API_BASE}/autofix/proposals?limit=5`)
      const proposalsData = await proposalsRes.json()
      if (proposalsData.success) {
        let proposals = proposalsData.proposals || []

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

              // Sort by priority score (high to low)
              proposals.sort((a, b) => {
                const scoreA = a.gsc_data?.priority_score || 0
                const scoreB = b.gsc_data?.priority_score || 0
                return scoreB - scoreA
              })
            }
          } catch (gscError) {
            console.warn('Failed to enrich proposals with GSC data:', gscError)
            // Continue without GSC data
          }
        }

        setRecentProposals(proposals)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const runDetection = async (engineId) => {
    toast({
      title: 'Running Detection',
      description: `Starting ${engineId}...`,
    })

    try {
      const response = await fetch(`${API_BASE}/autofix/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'instantautotraders',
          engineId: engineId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Detection Complete',
          description: `Found ${data.totalProposals || 0} issues`,
        })
        loadDashboardData()
      } else {
        toast({
          title: 'Detection Failed',
          description: data.error || 'Unknown error',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run detection',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statusData = stats ? [
    { name: 'Pending', value: stats.pending || 0, color: '#FFA500' },
    { name: 'Approved', value: stats.approved || 0, color: '#22C55E' },
    { name: 'Rejected', value: stats.rejected || 0, color: '#EF4444' },
    { name: 'Applied', value: stats.applied || 0, color: '#3B82F6' }
  ] : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Review System</h1>
          <p className="text-gray-600 mt-1">SEO Automation & Proposal Management</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onNavigate?.('autofix-review')} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            View All Proposals
          </Button>
          <Button onClick={loadDashboardData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Proposals</CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_proposals || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            <Clock className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats?.pending || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.approved || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Ready to apply</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approval Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.approval_rate ? `${stats.approval_rate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proposal Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Status Distribution</CardTitle>
            <CardDescription>Breakdown by review status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Latest SEO optimization suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProposals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No proposals yet</p>
                <p className="text-sm">Run a detection to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProposals.slice(0, 5).map((proposal) => (
                  <div key={proposal.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => onNavigate?.('autofix-review')}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{proposal.target_title || 'Untitled'}</p>
                      <p className="text-xs text-gray-500">{proposal.engine_name}</p>
                    </div>
                    <Badge variant={
                      proposal.status === 'pending' ? 'default' :
                      proposal.status === 'approved' ? 'success' :
                      proposal.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {proposal.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - SEO Engines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Quick Actions - Run Detection
          </CardTitle>
          <CardDescription>Click an engine to scan for SEO issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {availableEngines.map((engine) => (
              <Button
                key={engine.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start hover:border-blue-500 hover:bg-blue-50"
                onClick={() => runDetection(engine.id)}
              >
                <div className="text-2xl mb-2">{engine.icon}</div>
                <div className="text-left">
                  <div className="font-semibold text-sm">{engine.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{engine.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">How to Use the Manual Review System</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click an engine above to detect SEO issues on your WordPress site</li>
                <li>Review the generated proposals in the "View All Proposals" page</li>
                <li>Approve or reject each proposal based on your judgment</li>
                <li>Click "Apply Approved" to push changes to your WordPress site</li>
                <li>Monitor the statistics to track your SEO improvements</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
