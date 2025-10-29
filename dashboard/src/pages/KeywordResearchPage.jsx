import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { keywordAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { useDebounce } from '@/hooks/useDebounce'

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
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react'

export default function KeywordResearchPage() {
  const { toast } = useToast()
  
  // State
  const [selectedProject, setSelectedProject] = useState(null)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showAddKeywordsModal, setShowAddKeywordsModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('volume')
  const [newProject, setNewProject] = useState({
    name: '',
    seedKeywords: '',
    description: ''
  })
  const [newKeywords, setNewKeywords] = useState('')

  // API Requests
  const { data: projects, loading: loadingProjects, refetch: refetchProjects } = useAPIData(
    () => keywordAPI.listProjects(),
    { autoFetch: true }
  )

  const { data: keywordsData, loading: loadingKeywords, refetch: refetchKeywords } = useAPIData(
    () => selectedProject ? keywordAPI.getKeywords(selectedProject.id, { perPage: 100 }) : Promise.resolve({ keywords: [] }),
    { autoFetch: false }
  )

  const { execute: createProject, loading: creatingProject } = useAPIRequest()
  const { execute: exportKeywords } = useAPIRequest()

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Load keywords when project selected
  useEffect(() => {
    if (selectedProject) {
      refetchKeywords()
    }
  }, [selectedProject, refetchKeywords])

  // Select first project on load
  useEffect(() => {
    if (projects?.projects && projects.projects.length > 0 && !selectedProject) {
      setSelectedProject(projects.projects[0])
    }
  }, [projects, selectedProject])

  const keywords = keywordsData?.keywords || []

  // Filter and sort keywords
  const filteredKeywords = useMemo(() => {
    return keywords
      .filter(kw => {
        const matchesSearch = kw.keyword?.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesDifficulty = difficultyFilter === 'all' ||
          (difficultyFilter === 'easy' && (kw.difficulty || 0) < 30) ||
          (difficultyFilter === 'medium' && (kw.difficulty || 0) >= 30 && (kw.difficulty || 0) < 60) ||
          (difficultyFilter === 'hard' && (kw.difficulty || 0) >= 60)
        return matchesSearch && matchesDifficulty
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'volume':
            return (b.search_volume || 0) - (a.search_volume || 0)
          case 'difficulty':
            return (a.difficulty || 0) - (b.difficulty || 0)
          case 'cpc':
            return (b.cpc || 0) - (a.cpc || 0)
          default:
            return 0
        }
      })
  }, [keywords, debouncedSearch, difficultyFilter, sortBy])

  // Calculate stats
  const stats = useMemo(() => {
    if (!keywords.length) {
      return { totalKeywords: 0, avgVolume: 0, avgDifficulty: 0, trackedPositions: 0 }
    }

    return {
      totalKeywords: keywords.length,
      avgVolume: Math.round(keywords.reduce((sum, kw) => sum + (kw.search_volume || 0), 0) / keywords.length),
      avgDifficulty: Math.round(keywords.reduce((sum, kw) => sum + (kw.difficulty || 0), 0) / keywords.length),
      trackedPositions: keywords.filter(kw => kw.position).length
    }
  }, [keywords])

  const handleCreateProject = async () => {
    if (!newProject.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a project name.",
        variant: "destructive"
      })
      return
    }

    const result = await createProject(
      () => keywordAPI.createResearch({
        name: newProject.name,
        seed_keywords: newProject.seedKeywords.split('\n').filter(k => k.trim()),
        description: newProject.description
      }),
      {
        showSuccessToast: true,
        successMessage: 'Project created successfully',
        onSuccess: () => {
          setShowNewProjectModal(false)
          setNewProject({ name: '', seedKeywords: '', description: '' })
          refetchProjects()
        }
      }
    )
  }

  const handleExportKeywords = async () => {
    if (!filteredKeywords.length) {
      toast({
        title: "No Keywords",
        description: "No keywords to export.",
        variant: "destructive"
      })
      return
    }

    const csv = [
      ['Keyword', 'Volume', 'Difficulty', 'CPC', 'Intent'].join(','),
      ...filteredKeywords.map(kw => [
        kw.keyword || '',
        kw.search_volume || 0,
        kw.difficulty || 0,
        kw.cpc || 0,
        kw.search_intent || 'unknown'
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

  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return 'text-muted-foreground'
    if (difficulty < 30) return 'text-green-600'
    if (difficulty < 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifficultyBadge = (difficulty) => {
    if (!difficulty) return 'secondary'
    if (difficulty < 30) return 'default'
    if (difficulty < 60) return 'secondary'
    return 'destructive'
  }

  // Loading state
  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading projects...</span>
      </div>
    )
  }

  // Error/empty state
  if (!projects?.success || !projects?.projects) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Keyword Research</h1>
            <p className="text-muted-foreground">Track and analyze keyword opportunities</p>
          </div>
          <Button onClick={() => setShowNewProjectModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keyword Service Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              The keyword research service is not available. Please ensure the keyword service is running.
            </p>
            <Button onClick={refetchProjects} variant="outline">
              <Loader2 className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
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
                Start a new keyword research project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="e.g., Main Keywords Q1 2025"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seed-keywords">Seed Keywords (one per line)</Label>
                <textarea
                  id="seed-keywords"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="auto trading&#10;trading software&#10;trading platform"
                  value={newProject.seedKeywords}
                  onChange={(e) => setNewProject({ ...newProject, seedKeywords: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
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
              <Button onClick={handleCreateProject} disabled={creatingProject}>
                {creatingProject && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects?.projects?.length || 0})</TabsTrigger>
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
                    </div>
                    <Select
                      value={selectedProject.id}
                      onValueChange={(value) => setSelectedProject(projects.projects.find(p => p.id === value))}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.projects.map(project => (
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
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalKeywords}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Search Volume</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgVolume.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Difficulty</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgDifficulty}/100</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tracked Positions</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.trackedPositions}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume">Sort by Volume</SelectItem>
                        <SelectItem value="difficulty">Sort by Difficulty</SelectItem>
                        <SelectItem value="cpc">Sort by CPC</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={handleExportKeywords} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Keywords ({filteredKeywords.length})</CardTitle>
                  <CardDescription>
                    Research results for this project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingKeywords ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading keywords...</span>
                    </div>
                  ) : filteredKeywords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No keywords found. Try adjusting your filters.
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead className="text-right">Difficulty</TableHead>
                            <TableHead className="text-right">CPC</TableHead>
                            <TableHead>Intent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredKeywords.map((kw, idx) => (
                            <TableRow key={kw.id || idx}>
                              <TableCell className="font-medium">{kw.keyword || 'N/A'}</TableCell>
                              <TableCell className="text-right">{(kw.search_volume || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={getDifficultyBadge(kw.difficulty || 0)}>
                                  {kw.difficulty || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">${(kw.cpc || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {kw.search_intent || 'unknown'}
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

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects?.projects?.map(project => (
              <Card key={project.id} className="cursor-pointer hover:border-primary" onClick={() => setSelectedProject(project)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription>{project.description || 'No description'}</CardDescription>
                    </div>
                    {selectedProject?.id === project.id && (
                      <Badge>Selected</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
