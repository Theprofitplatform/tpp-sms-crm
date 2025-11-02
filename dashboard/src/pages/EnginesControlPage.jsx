import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useToast } from '../hooks/use-toast'
import {
  Play,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  TrendingUp
} from 'lucide-react'

const API_BASE = '/api'

const ENGINES = [
  {
    id: 'nap-fixer',
    name: 'NAP Fixer',
    category: 'Local SEO',
    description: 'Ensures Name, Address, and Phone number consistency across all pages and directories',
    icon: '📍',
    priority: 'high',
    riskLevel: 'low',
    estimatedTime: '2-3 min'
  },
  {
    id: 'broken-link-detector-v2',
    name: 'Broken Link Detector',
    category: 'Technical SEO',
    description: 'Scans all internal and external links, identifies broken links and suggests fixes',
    icon: '🔗',
    priority: 'high',
    riskLevel: 'low',
    estimatedTime: '3-5 min'
  },
  {
    id: 'image-optimizer-v2',
    name: 'Image Optimizer',
    category: 'On-Page SEO',
    description: 'Optimizes image alt tags, file names, and compression for better SEO and performance',
    icon: '🖼️',
    priority: 'medium',
    riskLevel: 'low',
    estimatedTime: '2-4 min'
  },
  {
    id: 'title-meta-optimizer-v2',
    name: 'Title & Meta Optimizer',
    category: 'On-Page SEO',
    description: 'Analyzes and improves page titles and meta descriptions for better click-through rates',
    icon: '📝',
    priority: 'high',
    riskLevel: 'medium',
    estimatedTime: '3-4 min'
  },
  {
    id: 'schema-injector-v2',
    name: 'Schema Markup Injector',
    category: 'Technical SEO',
    description: 'Adds structured data (Schema.org) to pages for rich snippets in search results',
    icon: '📊',
    priority: 'medium',
    riskLevel: 'medium',
    estimatedTime: '2-3 min'
  },
  {
    id: 'content-optimizer-v2',
    name: 'Content Optimizer',
    category: 'Content SEO',
    description: 'Analyzes content quality, keyword usage, readability, and suggests improvements',
    icon: '✍️',
    priority: 'high',
    riskLevel: 'medium',
    estimatedTime: '4-6 min'
  },
  {
    id: 'redirect-checker-v2',
    name: 'Redirect Checker',
    category: 'Technical SEO',
    description: 'Identifies redirect chains, loops, and improper redirects that hurt SEO',
    icon: '↪️',
    priority: 'medium',
    riskLevel: 'low',
    estimatedTime: '2-3 min'
  },
  {
    id: 'internal-link-builder-v2',
    name: 'Internal Link Builder',
    category: 'Content SEO',
    description: 'Finds opportunities for internal linking to improve site structure and PageRank flow',
    icon: '🔗',
    priority: 'medium',
    riskLevel: 'low',
    estimatedTime: '3-5 min'
  },
  {
    id: 'sitemap-optimizer-v2',
    name: 'Sitemap Optimizer',
    category: 'Technical SEO',
    description: 'Analyzes and optimizes XML sitemaps for better search engine crawling',
    icon: '🗺️',
    priority: 'low',
    riskLevel: 'low',
    estimatedTime: '1-2 min'
  },
  {
    id: 'robots-txt-manager-v2',
    name: 'Robots.txt Manager',
    category: 'Technical SEO',
    description: 'Reviews and optimizes robots.txt file to ensure proper crawler access',
    icon: '🤖',
    priority: 'low',
    riskLevel: 'low',
    estimatedTime: '1-2 min'
  }
]

const CLIENTS = [
  { id: 'instantautotraders', name: 'Instant Auto Traders', url: 'instantautotraders.com.au' },
  { id: 'hottyres', name: 'Hot Tyres', url: 'hottyres.com.au' },
  { id: 'sadcdisabilityservices', name: 'SADC Disability Services', url: 'sadcdisabilityservices.com.au' }
]

export default function EnginesControlPage({ onNavigate }) {
  const { toast } = useToast()
  const [selectedClient, setSelectedClient] = useState('instantautotraders')
  const [runningEngines, setRunningEngines] = useState(new Set())
  const [engineHistory, setEngineHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEngineHistory()
  }, [selectedClient])

  const loadEngineHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/autofix/history?clientId=${selectedClient}&limit=20`)
      const data = await response.json()
      if (data.success) {
        setEngineHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to load engine history:', error)
    }
  }

  const runEngine = async (engineId) => {
    setRunningEngines(prev => new Set(prev).add(engineId))

    toast({
      title: 'Starting Detection',
      description: `Running ${ENGINES.find(e => e.id === engineId)?.name}...`,
    })

    try {
      const response = await fetch(`${API_BASE}/autofix/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          engineId: engineId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Detection Complete!',
          description: `Found ${data.totalProposals || 0} potential issues. Click "View Proposals" to review.`,
        })
        loadEngineHistory()
      } else {
        toast({
          title: 'Detection Failed',
          description: data.error || 'An error occurred',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to run detection engine',
        variant: 'destructive'
      })
    } finally {
      setRunningEngines(prev => {
        const newSet = new Set(prev)
        newSet.delete(engineId)
        return newSet
      })
    }
  }

  const runAllEngines = async () => {
    toast({
      title: 'Running All Engines',
      description: 'This may take 5-10 minutes...',
    })

    for (const engine of ENGINES) {
      await runEngine(engine.id)
      // Small delay between engines
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    toast({
      title: 'All Engines Complete',
      description: 'All detections finished. View proposals to review results.',
    })
  }

  const getEngineStatus = (engineId) => {
    if (runningEngines.has(engineId)) {
      return { label: 'Running', color: 'blue', icon: <Loader2 className="w-4 h-4 animate-spin" /> }
    }

    const lastRun = engineHistory.find(h => h.engine_id === engineId)
    if (!lastRun) {
      return { label: 'Never Run', color: 'gray', icon: <Clock className="w-4 h-4" /> }
    }

    if (lastRun.status === 'completed') {
      return { label: 'Completed', color: 'green', icon: <CheckCircle className="w-4 h-4" /> }
    }

    return { label: 'Error', color: 'red', icon: <AlertCircle className="w-4 h-4" /> }
  }

  const getLastRunTime = (engineId) => {
    const lastRun = engineHistory.find(h => h.engine_id === engineId)
    if (!lastRun) return 'Never'

    const date = new Date(lastRun.executed_at)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const groupedEngines = ENGINES.reduce((acc, engine) => {
    if (!acc[engine.category]) acc[engine.category] = []
    acc[engine.category].push(engine)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SEO Engines Control</h1>
          <p className="text-gray-600 mt-1">Run automated SEO detections and generate proposals</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onNavigate?.('autofix-review')} variant="outline">
            View Proposals
          </Button>
          <Button onClick={runAllEngines} disabled={runningEngines.size > 0}>
            <Play className="w-4 h-4 mr-2" />
            Run All Engines
          </Button>
        </div>
      </div>

      {/* Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select WordPress Site</CardTitle>
          <CardDescription>Choose which site to scan for SEO issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CLIENTS.map(client => (
              <Button
                key={client.id}
                variant={selectedClient === client.id ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => setSelectedClient(client.id)}
              >
                <div className="font-semibold">{client.name}</div>
                <div className="text-xs text-gray-500 mt-1">{client.url}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engines Grid by Category */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Engines ({ENGINES.length})</TabsTrigger>
          {Object.keys(groupedEngines).map(category => (
            <TabsTrigger key={category} value={category}>
              {category} ({groupedEngines[category].length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENGINES.map(engine => {
              const status = getEngineStatus(engine.id)
              const lastRun = getLastRunTime(engine.id)
              const isRunning = runningEngines.has(engine.id)

              return (
                <Card key={engine.id} className={isRunning ? 'border-blue-500 bg-blue-50' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-3xl mb-2">{engine.icon}</div>
                        <CardTitle className="text-lg">{engine.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{engine.category}</CardDescription>
                      </div>
                      <Badge variant={status.color === 'blue' ? 'default' : status.color === 'green' ? 'success' : 'secondary'}>
                        <div className="flex items-center gap-1">
                          {status.icon}
                          {status.label}
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">{engine.description}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {engine.estimatedTime}
                      </div>
                      <div>Last run: {lastRun}</div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Badge variant={engine.priority === 'high' ? 'destructive' : engine.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                        {engine.priority.toUpperCase()} Priority
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {engine.riskLevel} Risk
                      </Badge>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => runEngine(engine.id)}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run Detection
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {Object.entries(groupedEngines).map(([category, engines]) => (
          <TabsContent key={category} value={category} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {engines.map(engine => {
                const status = getEngineStatus(engine.id)
                const lastRun = getLastRunTime(engine.id)
                const isRunning = runningEngines.has(engine.id)

                return (
                  <Card key={engine.id} className={isRunning ? 'border-blue-500 bg-blue-50' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-3xl mb-2">{engine.icon}</div>
                          <CardTitle className="text-lg">{engine.name}</CardTitle>
                        </div>
                        <Badge variant={status.color === 'blue' ? 'default' : status.color === 'green' ? 'success' : 'secondary'}>
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600">{engine.description}</p>
                      <Button
                        className="w-full"
                        onClick={() => runEngine(engine.id)}
                        disabled={isRunning}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Detection
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Recent History */}
      {engineHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Detection History</CardTitle>
            <CardDescription>Latest engine executions for {CLIENTS.find(c => c.id === selectedClient)?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {engineHistory.slice(0, 10).map((history, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{ENGINES.find(e => e.id === history.engine_id)?.icon}</div>
                    <div>
                      <p className="font-medium text-sm">{ENGINES.find(e => e.id === history.engine_id)?.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(history.executed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{history.proposals_count || 0} issues</p>
                      <p className="text-xs text-gray-500">{history.status}</p>
                    </div>
                    <Badge variant={history.status === 'completed' ? 'success' : 'destructive'}>
                      {history.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
