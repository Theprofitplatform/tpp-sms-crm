import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { goalsAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Target,
  TrendingUp,
  Calendar,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Activity,
  Loader2,
  Trash2
} from 'lucide-react'

export default function GoalsPage() {
  const { toast } = useToast()
  
  const [showNewGoalModal, setShowNewGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: '',
    metric: 'traffic',
    deadline: '',
    clientId: ''
  })

  // API Requests
  const { data: goalsData, loading: loadingGoals, refetch: refetchGoals } = useAPIData(
    () => goalsAPI.getAll(),
    { autoFetch: true, initialData: { goals: [], kpis: [] } }
  )

  const { execute: createGoal, loading: creating } = useAPIRequest()
  const { execute: updateGoal, loading: updating } = useAPIRequest()
  const { execute: deleteGoal, loading: deleting } = useAPIRequest()

  const goals = goalsData?.goals || []
  const kpis = goalsData?.kpis || []

  // Calculate progress
  const calculateProgress = useCallback((goal) => {
    const range = goal.targetValue - goal.startValue
    const current = goal.currentValue - goal.startValue
    return Math.max(0, Math.min(100, (current / range) * 100))
  }, [])

  // Stats calculation
  const stats = useMemo(() => {
    return {
      totalGoals: goals.length,
      inProgress: goals.filter(g => g.status === 'in-progress').length,
      completed: goals.filter(g => g.status === 'completed').length,
      avgProgress: goals.length > 0 
        ? goals.reduce((sum, g) => sum + calculateProgress(g), 0) / goals.length 
        : 0
    }
  }, [goals, calculateProgress])

  const handleCreateGoal = useCallback(async () => {
    if (!newGoal.title || !newGoal.target) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      })
      return
    }

    await createGoal(
      () => goalsAPI.create(newGoal),
      {
        showSuccessToast: true,
        successMessage: 'Goal created successfully',
        onSuccess: () => {
          setShowNewGoalModal(false)
          setNewGoal({
            title: '',
            description: '',
            target: '',
            metric: 'traffic',
            deadline: '',
            clientId: ''
          })
          refetchGoals()
        }
      }
    )
  }, [newGoal, createGoal, refetchGoals, toast])

  const handleUpdateGoal = useCallback(async (goalId, updates) => {
    await updateGoal(
      () => goalsAPI.update(goalId, updates),
      {
        showSuccessToast: true,
        successMessage: 'Goal updated successfully',
        onSuccess: () => {
          setEditingGoal(null)
          refetchGoals()
        }
      }
    )
  }, [updateGoal, refetchGoals])

  const handleDeleteGoal = useCallback(async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    await deleteGoal(
      () => goalsAPI.delete(goalId),
      {
        showSuccessToast: true,
        successMessage: 'Goal deleted successfully',
        onSuccess: () => {
          refetchGoals()
        }
      }
    )
  }, [deleteGoal, refetchGoals])

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in-progress': return 'secondary'
      case 'at-risk': return 'destructive'
      default: return 'outline'
    }
  }, [])

  const getMetricIcon = useCallback((metric) => {
    switch (metric) {
      case 'traffic': return <TrendingUp className="h-4 w-4" />
      case 'rankings': return <Award className="h-4 w-4" />
      case 'performance': return <Activity className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }, [])

  if (loadingGoals) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading goals...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Goals & KPIs
          </h1>
          <p className="text-muted-foreground">
            Track progress towards your SEO objectives
          </p>
        </div>

        <Dialog open={showNewGoalModal} onOpenChange={setShowNewGoalModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a new goal to track your SEO performance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Title *</Label>
                <Input
                  id="goal-title"
                  placeholder="e.g., Increase Organic Traffic by 30%"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe the goal in detail..."
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-metric">Metric</Label>
                  <Select
                    value={newGoal.metric}
                    onValueChange={(value) => setNewGoal({ ...newGoal, metric: value })}
                  >
                    <SelectTrigger id="goal-metric">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="rankings">Rankings</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="conversions">Conversions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-target">Target Value *</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    placeholder="Target value"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-deadline">Deadline</Label>
                <Input
                  id="goal-deadline"
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewGoalModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGoal} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGoals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
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
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFinite(stats.avgProgress) ? Number(stats.avgProgress).toFixed(0) : '0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="kpis">KPIs ({kpis.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first goal to start tracking progress
                </p>
                <Button onClick={() => setShowNewGoalModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {goals.map(goal => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getMetricIcon(goal.metric)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          <CardDescription>{goal.description}</CardDescription>
                          {goal.clientName && (
                            <Badge variant="outline" className="mt-2">
                              {goal.clientName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(goal.status)}>
                          {goal.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteGoal(goal.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {goal.currentValue} / {goal.targetValue}
                        </span>
                      </div>
                      <Progress value={calculateProgress(goal)} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const progress = calculateProgress(goal)
                          return isFinite(progress) ? progress.toFixed(0) : '0'
                        })()}% complete
                      </p>
                    </div>

                    {goal.deadline && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
              <CardDescription>Track your most important metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {kpis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No KPIs configured yet
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {kpis.map((kpi, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">{kpi.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <p className="text-sm text-muted-foreground">{kpi.description}</p>
                      </CardContent>
                    </Card>
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
