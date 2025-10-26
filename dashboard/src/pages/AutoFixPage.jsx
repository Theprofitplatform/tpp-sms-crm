import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Wrench,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Play,
  History,
  AlertTriangle,
  Info
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export function AutoFixPage() {
  const { toast } = useToast()
  const [engines, setEngines] = useState([])
  const [fixHistory, setFixHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEngine, setSelectedEngine] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  useEffect(() => {
    fetchEnginesData()
  }, [])

  const fetchEnginesData = async () => {
    setLoading(true)
    try {
      // Mock auto-fix engines data (in real implementation, fetch from backend)
      const mockEngines = [
        {
          id: 'meta-optimizer',
          name: 'Meta Tags Optimizer',
          description: 'Automatically optimizes title tags and meta descriptions',
          category: 'on-page',
          enabled: true,
          status: 'active',
          fixesApplied: 247,
          successRate: 98,
          lastRun: new Date(Date.now() - 3600000),
          impact: 'high',
          settings: {
            autoApply: true,
            minTitleLength: 50,
            maxTitleLength: 60,
            minDescLength: 150,
            maxDescLength: 160
          }
        },
        {
          id: 'image-optimizer',
          name: 'Image Alt Text Generator',
          description: 'Generates descriptive alt text for images using AI',
          category: 'accessibility',
          enabled: true,
          status: 'active',
          fixesApplied: 1523,
          successRate: 94,
          lastRun: new Date(Date.now() - 7200000),
          impact: 'medium',
          settings: {
            autoApply: false,
            useAI: true,
            includeContext: true
          }
        },
        {
          id: 'heading-fixer',
          name: 'Heading Structure Fixer',
          description: 'Corrects heading hierarchy and ensures proper H1-H6 structure',
          category: 'on-page',
          enabled: true,
          status: 'active',
          fixesApplied: 89,
          successRate: 96,
          lastRun: new Date(Date.now() - 10800000),
          impact: 'high',
          settings: {
            autoApply: true,
            ensureSingleH1: true,
            maintainOrder: true
          }
        },
        {
          id: 'broken-link-fixer',
          name: 'Broken Link Resolver',
          description: 'Finds and fixes broken internal and external links',
          category: 'technical',
          enabled: false,
          status: 'paused',
          fixesApplied: 342,
          successRate: 87,
          lastRun: new Date(Date.now() - 86400000),
          impact: 'high',
          settings: {
            autoApply: false,
            checkExternal: true,
            autoRedirect: true
          }
        },
        {
          id: 'schema-generator',
          name: 'Schema Markup Generator',
          description: 'Automatically adds structured data to pages',
          category: 'technical',
          enabled: true,
          status: 'active',
          fixesApplied: 156,
          successRate: 99,
          lastRun: new Date(Date.now() - 14400000),
          impact: 'medium',
          settings: {
            autoApply: true,
            schemaTypes: ['Article', 'Product', 'Organization'],
            validateSchema: true
          }
        },
        {
          id: 'mobile-optimizer',
          name: 'Mobile Responsiveness Fixer',
          description: 'Fixes common mobile usability issues',
          category: 'technical',
          enabled: true,
          status: 'active',
          fixesApplied: 73,
          successRate: 91,
          lastRun: new Date(Date.now() - 18000000),
          impact: 'high',
          settings: {
            autoApply: false,
            fixViewport: true,
            optimizeTapTargets: true
          }
        },
        {
          id: 'speed-optimizer',
          name: 'Page Speed Optimizer',
          description: 'Optimizes images, CSS, and JS for faster loading',
          category: 'performance',
          enabled: false,
          status: 'paused',
          fixesApplied: 512,
          successRate: 85,
          lastRun: new Date(Date.now() - 172800000),
          impact: 'high',
          settings: {
            autoApply: false,
            compressImages: true,
            minifyCSS: true,
            minifyJS: true,
            lazyLoadImages: true
          }
        },
        {
          id: 'content-improver',
          name: 'Content Quality Enhancer',
          description: 'Suggests and applies content improvements using AI',
          category: 'content',
          enabled: true,
          status: 'active',
          fixesApplied: 198,
          successRate: 93,
          lastRun: new Date(Date.now() - 21600000),
          impact: 'medium',
          settings: {
            autoApply: false,
            useAI: true,
            improveReadability: true,
            addKeywords: true
          }
        }
      ]

      // Mock fix history
      const mockHistory = [
        {
          id: 'fix-1',
          engineId: 'meta-optimizer',
          engineName: 'Meta Tags Optimizer',
          timestamp: new Date(Date.now() - 3600000),
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          fixesApplied: 12,
          status: 'success',
          details: 'Optimized 12 meta tags across 8 pages'
        },
        {
          id: 'fix-2',
          engineId: 'image-optimizer',
          engineName: 'Image Alt Text Generator',
          timestamp: new Date(Date.now() - 7200000),
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          fixesApplied: 45,
          status: 'success',
          details: 'Generated alt text for 45 images'
        },
        {
          id: 'fix-3',
          engineId: 'broken-link-fixer',
          engineName: 'Broken Link Resolver',
          timestamp: new Date(Date.now() - 10800000),
          clientId: 'hottyres',
          clientName: 'Hot Tyres',
          fixesApplied: 3,
          status: 'partial',
          details: 'Fixed 3 out of 5 broken links'
        },
        {
          id: 'fix-4',
          engineId: 'heading-fixer',
          engineName: 'Heading Structure Fixer',
          timestamp: new Date(Date.now() - 14400000),
          clientId: 'sadcdisabilityservices',
          clientName: 'SADC Disability Services',
          fixesApplied: 7,
          status: 'success',
          details: 'Corrected heading structure on 7 pages'
        }
      ]

      setEngines(mockEngines)
      setFixHistory(mockHistory)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch engines data:', error)
      toast({
        title: "Error Loading Engines",
        description: "Could not fetch auto-fix engines data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleToggleEngine = (engineId, enabled) => {
    setEngines(engines.map(engine =>
      engine.id === engineId ? { ...engine, enabled, status: enabled ? 'active' : 'paused' } : engine
    ))
    toast({
      title: enabled ? "Engine Enabled" : "Engine Disabled",
      description: `The ${engines.find(e => e.id === engineId)?.name} has been ${enabled ? 'enabled' : 'disabled'}.`,
    })
  }

  const handleRunEngine = (engineId) => {
    toast({
      title: "Engine Running",
      description: "Auto-fix engine is processing...",
    })
    // In real implementation, trigger the engine
    setTimeout(() => {
      toast({
        title: "Engine Completed",
        description: "Auto-fixes have been applied successfully.",
      })
      fetchEnginesData()
    }, 2000)
  }

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'on-page':
        return <Wrench className="h-5 w-5" />
      case 'technical':
        return <Settings className="h-5 w-5" />
      case 'performance':
        return <Zap className="h-5 w-5" />
      case 'content':
        return <Info className="h-5 w-5" />
      case 'accessibility':
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Wrench className="h-5 w-5" />
    }
  }

  const stats = {
    totalEngines: engines.length,
    activeEngines: engines.filter(e => e.enabled).length,
    totalFixes: engines.reduce((sum, e) => sum + e.fixesApplied, 0),
    avgSuccessRate: engines.length > 0
      ? Math.round(engines.reduce((sum, e) => sum + e.successRate, 0) / engines.length)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Auto-Fix Engines</h1>
            <p className="text-muted-foreground">Loading engines...</p>
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
          <h1 className="text-3xl font-bold">Auto-Fix Engines</h1>
          <p className="text-muted-foreground">
            Automated SEO optimization and issue resolution
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engines</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEngines}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEngines} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fixes Applied</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFixes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average across all engines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEngines}</div>
            <p className="text-xs text-muted-foreground">
              Running engines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engines">Engines</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="engines" className="space-y-4">
          {/* Engines Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {engines.map(engine => (
              <Card key={engine.id} className={!engine.enabled ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getCategoryIcon(engine.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{engine.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {engine.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={engine.enabled}
                      onCheckedChange={(checked) => handleToggleEngine(engine.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fixes</p>
                        <p className="font-semibold">{engine.fixesApplied}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success</p>
                        <p className="font-semibold">{engine.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impact</p>
                        <Badge variant={engine.impact === 'high' ? 'destructive' : 'default'}>
                          {engine.impact}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span>{engine.successRate}%</span>
                      </div>
                      <Progress value={engine.successRate} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunEngine(engine.id)}
                        disabled={!engine.enabled}
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEngine(engine)
                          setShowSettingsModal(true)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Last Run */}
                    <div className="text-xs text-muted-foreground">
                      Last run: {new Date(engine.lastRun).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fix History</CardTitle>
              <CardDescription>Recent auto-fix activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fixHistory.map(fix => (
                  <div
                    key={fix.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {fix.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : fix.status === 'partial' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="font-medium">{fix.engineName}</div>
                        <div className="text-sm text-muted-foreground">
                          {fix.clientName} • {new Date(fix.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {fix.details}
                        </div>
                      </div>
                    </div>
                    <Badge variant={fix.status === 'success' ? 'default' : 'secondary'}>
                      {fix.fixesApplied} fixes
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEngine?.name} Settings</DialogTitle>
            <DialogDescription>
              Configure how this engine operates
            </DialogDescription>
          </DialogHeader>

          {selectedEngine && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Auto-apply fixes</Label>
                  <Switch checked={selectedEngine.settings.autoApply} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically apply fixes without manual approval
                </p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Engine-specific settings:</p>
                <pre className="bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedEngine.settings, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Settings Saved", description: "Engine settings updated successfully." })
              setShowSettingsModal(false)
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
