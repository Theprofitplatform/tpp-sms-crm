import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  Plus,
  Download,
  Filter,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  Folder,
  Edit,
  Trash2
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export function KeywordResearchPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showAddKeywordsModal, setShowAddKeywordsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('volume')
  const [newProject, setNewProject] = useState({
    name: '',
    clientId: '',
    description: ''
  })
  const [newKeywords, setNewKeywords] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchKeywords(selectedProject.id)
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      // Mock projects data (in real implementation, fetch from backend)
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Auto Trading Keywords',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          description: 'Main keyword research for auto trading services',
          keywordCount: 156,
          avgVolume: 2400,
          avgDifficulty: 42,
          createdAt: new Date(Date.now() - 2592000000),
          updatedAt: new Date(Date.now() - 86400000)
        },
        {
          id: 'proj-2',
          name: 'Profit Platform SEO',
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          description: 'Keywords for profit optimization content',
          keywordCount: 89,
          avgVolume: 1800,
          avgDifficulty: 38,
          createdAt: new Date(Date.now() - 1728000000),
          updatedAt: new Date(Date.now() - 172800000)
        },
        {
          id: 'proj-3',
          name: 'Tyre Industry Terms',
          clientId: 'hottyres',
          clientName: 'Hot Tyres',
          description: 'Tyre-related keywords and automotive terms',
          keywordCount: 234,
          avgVolume: 3200,
          avgDifficulty: 35,
          createdAt: new Date(Date.now() - 1296000000),
          updatedAt: new Date(Date.now() - 259200000)
        }
      ]

      setProjects(mockProjects)
      if (mockProjects.length > 0 && !selectedProject) {
        setSelectedProject(mockProjects[0])
      }
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast({
        title: "Error Loading Projects",
        description: "Could not fetch keyword research projects.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const fetchKeywords = async (projectId) => {
    try {
      // Mock keywords data
      const mockKeywords = [
        {
          id: 'kw-1',
          keyword: 'auto trading software',
          volume: 4400,
          difficulty: 52,
          cpc: 8.50,
          trend: 'up',
          position: 12,
          intent: 'commercial',
          cluster: 'software'
        },
        {
          id: 'kw-2',
          keyword: 'best auto trading platform',
          volume: 3600,
          difficulty: 48,
          cpc: 9.20,
          trend: 'up',
          position: null,
          intent: 'commercial',
          cluster: 'platform'
        },
        {
          id: 'kw-3',
          keyword: 'automated trading systems',
          volume: 2900,
          difficulty: 45,
          cpc: 7.80,
          trend: 'stable',
          position: 8,
          intent: 'informational',
          cluster: 'systems'
        },
        {
          id: 'kw-4',
          keyword: 'auto trading reviews',
          volume: 2200,
          difficulty: 38,
          cpc: 5.40,
          trend: 'up',
          position: 15,
          intent: 'commercial',
          cluster: 'reviews'
        },
        {
          id: 'kw-5',
          keyword: 'algorithmic trading',
          volume: 8100,
          difficulty: 68,
          cpc: 12.30,
          trend: 'up',
          position: null,
          intent: 'informational',
          cluster: 'advanced'
        },
        {
          id: 'kw-6',
          keyword: 'trading bot australia',
          volume: 1800,
          difficulty: 35,
          cpc: 6.90,
          trend: 'stable',
          position: 6,
          intent: 'commercial',
          cluster: 'local'
        },
        {
          id: 'kw-7',
          keyword: 'forex auto trading',
          volume: 5400,
          difficulty: 55,
          cpc: 10.20,
          trend: 'up',
          position: null,
          intent: 'commercial',
          cluster: 'forex'
        },
        {
          id: 'kw-8',
          keyword: 'crypto trading bot',
          volume: 12100,
          difficulty: 62,
          cpc: 11.80,
          trend: 'up',
          position: null,
          intent: 'commercial',
          cluster: 'crypto'
        },
        {
          id: 'kw-9',
          keyword: 'automated stock trading',
          volume: 3300,
          difficulty: 50,
          cpc: 8.90,
          trend: 'stable',
          position: 18,
          intent: 'commercial',
          cluster: 'stocks'
        },
        {
          id: 'kw-10',
          keyword: 'day trading automation',
          volume: 1600,
          difficulty: 42,
          cpc: 7.20,
          trend: 'down',
          position: 22,
          intent: 'informational',
          cluster: 'day-trading'
        }
      ]

      setKeywords(mockKeywords)
    } catch (error) {
      console.error('Failed to fetch keywords:', error)
      toast({
        title: "Error Loading Keywords",
        description: "Could not fetch keywords for this project.",
        variant: "destructive"
      })
    }
  }

  const handleCreateProject = () => {
    if (!newProject.name) {
      toast({
        title: "Name Required",
        description: "Please enter a project name.",
        variant: "destructive"
      })
      return
    }

    const project = {
      id: `proj-${Date.now()}`,
      ...newProject,
      keywordCount: 0,
      avgVolume: 0,
      avgDifficulty: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setProjects([...projects, project])
    setSelectedProject(project)
    setShowNewProjectModal(false)
    setNewProject({ name: '', clientId: '', description: '' })

    toast({
      title: "Project Created",
      description: `${project.name} has been created successfully.`,
    })
  }

  const handleAddKeywords = () => {
    if (!newKeywords.trim()) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive"
      })
      return
    }

    const keywordLines = newKeywords.split('\n').filter(line => line.trim())
    const newKeywordObjects = keywordLines.map((kw, idx) => ({
      id: `kw-${Date.now()}-${idx}`,
      keyword: kw.trim(),
      volume: Math.floor(Math.random() * 10000) + 100,
      difficulty: Math.floor(Math.random() * 100),
      cpc: (Math.random() * 15).toFixed(2),
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
      position: null,
      intent: ['commercial', 'informational', 'navigational'][Math.floor(Math.random() * 3)],
      cluster: 'uncategorized'
    }))

    setKeywords([...keywords, ...newKeywordObjects])
    setShowAddKeywordsModal(false)
    setNewKeywords('')

    toast({
      title: "Keywords Added",
      description: `Added ${keywordLines.length} keywords to the project.`,
    })
  }

  const handleExportKeywords = () => {
    const csv = [
      ['Keyword', 'Volume', 'Difficulty', 'CPC', 'Position', 'Intent', 'Cluster'].join(','),
      ...filteredKeywords.map(kw => [
        kw.keyword,
        kw.volume,
        kw.difficulty,
        kw.cpc,
        kw.position || 'N/A',
        kw.intent,
        kw.cluster
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedProject?.name || 'keywords'}-export.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export Started",
      description: "Downloading keywords as CSV file.",
    })
  }

  const handleDeleteProject = (projectId) => {
    setProjects(projects.filter(p => p.id !== projectId))
    if (selectedProject?.id === projectId) {
      setSelectedProject(projects[0] || null)
    }
    toast({
      title: "Project Deleted",
      description: "The project has been removed.",
      variant: "destructive"
    })
  }

  // Filter and sort keywords
  const filteredKeywords = keywords
    .filter(kw => {
      const matchesSearch = kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDifficulty = difficultyFilter === 'all' ||
        (difficultyFilter === 'easy' && kw.difficulty < 30) ||
        (difficultyFilter === 'medium' && kw.difficulty >= 30 && kw.difficulty < 60) ||
        (difficultyFilter === 'hard' && kw.difficulty >= 60)
      return matchesSearch && matchesDifficulty
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.volume - a.volume
        case 'difficulty':
          return a.difficulty - b.difficulty
        case 'cpc':
          return b.cpc - a.cpc
        case 'position':
          if (!a.position) return 1
          if (!b.position) return -1
          return a.position - b.position
        default:
          return 0
      }
    })

  const getDifficultyColor = (difficulty) => {
    if (difficulty < 30) return 'text-green-600'
    if (difficulty < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifficultyBadge = (difficulty) => {
    if (difficulty < 30) return 'default'
    if (difficulty < 60) return 'secondary'
    return 'destructive'
  }

  const stats = selectedProject ? {
    totalKeywords: keywords.length,
    avgVolume: keywords.length > 0 ? Math.round(keywords.reduce((sum, kw) => sum + kw.volume, 0) / keywords.length) : 0,
    avgDifficulty: keywords.length > 0 ? Math.round(keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / keywords.length) : 0,
    trackedPositions: keywords.filter(kw => kw.position !== null).length
  } : { totalKeywords: 0, avgVolume: 0, avgDifficulty: 0, trackedPositions: 0 }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Keyword Research</h1>
            <p className="text-muted-foreground">Loading projects...</p>
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
          <h1 className="text-3xl font-bold">Keyword Research</h1>
          <p className="text-muted-foreground">
            Track and analyze keyword opportunities
          </p>
        </div>

        <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Keyword Research Project</DialogTitle>
              <DialogDescription>
                Start a new keyword research project for a client
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  placeholder="e.g., Main Keywords Q1 2025"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Input
                  placeholder="Client ID"
                  value={newProject.clientId}
                  onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Brief description of this project"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewProjectModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject}>
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="space-y-4">
          {!selectedProject ? (
            <Card>
              <CardContent className="text-center py-12">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Create or select a project to start researching keywords
                </p>
                <Button onClick={() => setShowNewProjectModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Project Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedProject.name}</CardTitle>
                      <CardDescription>
                        {selectedProject.description || 'No description'}
                      </CardDescription>
                      {selectedProject.clientName && (
                        <Badge variant="outline" className="mt-2">
                          {selectedProject.clientName}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedProject.id}
                      onValueChange={(value) => setSelectedProject(projects.find(p => p.id === value))}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalKeywords}</div>
                    <p className="text-xs text-muted-foreground">
                      In this project
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Volume</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgVolume.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Monthly searches
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Difficulty</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgDifficulty}</div>
                    <p className="text-xs text-muted-foreground">
                      Out of 100
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tracked</CardTitle>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.trackedPositions}</div>
                    <p className="text-xs text-muted-foreground">
                      With positions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search keywords..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulty</SelectItem>
                        <SelectItem value="easy">Easy (&lt;30)</SelectItem>
                        <SelectItem value="medium">Medium (30-60)</SelectItem>
                        <SelectItem value="hard">Hard (&gt;60)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="difficulty">Difficulty</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                        <SelectItem value="position">Position</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExportKeywords}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>

                    <Dialog open={showAddKeywordsModal} onOpenChange={setShowAddKeywordsModal}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Keywords
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Keywords</DialogTitle>
                          <DialogDescription>
                            Enter keywords (one per line) to add to this project
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Keywords</Label>
                            <textarea
                              className="w-full min-h-[200px] p-3 border rounded-md"
                              placeholder="auto trading software&#10;best trading platform&#10;automated trading"
                              value={newKeywords}
                              onChange={(e) => setNewKeywords(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter one keyword per line
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setShowAddKeywordsModal(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddKeywords}>
                            Add Keywords
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              </Card>

              {/* Keywords Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Keywords ({filteredKeywords.length})</CardTitle>
                  <CardDescription>
                    All keywords in this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredKeywords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No keywords found</p>
                      <Button className="mt-4" onClick={() => setShowAddKeywordsModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Keywords
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Volume</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>CPC</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Intent</TableHead>
                            <TableHead>Cluster</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredKeywords.map(kw => (
                            <TableRow key={kw.id}>
                              <TableCell className="font-medium">{kw.keyword}</TableCell>
                              <TableCell>{kw.volume.toLocaleString()}</TableCell>
                              <TableCell>
                                <span className={getDifficultyColor(kw.difficulty)}>
                                  {kw.difficulty}
                                </span>
                              </TableCell>
                              <TableCell>${kw.cpc}</TableCell>
                              <TableCell>
                                {kw.position ? (
                                  <Badge variant="default">#{kw.position}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {kw.intent}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {kw.cluster}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Projects ({projects.length})</CardTitle>
              <CardDescription>
                Manage your keyword research projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first keyword research project
                  </p>
                  <Button onClick={() => setShowNewProjectModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{project.name}</h3>
                          {project.clientName && (
                            <Badge variant="outline">{project.clientName}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{project.keywordCount} keywords</span>
                          <span>Avg Volume: {project.avgVolume.toLocaleString()}</span>
                          <span>Avg Difficulty: {project.avgDifficulty}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProject(project)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
