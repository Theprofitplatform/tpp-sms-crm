import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Activity
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

export function GoalsPage() {
  const { toast } = useToast()
  const [goals, setGoals] = useState([])
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewGoalModal, setShowNewGoalModal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    target: '',
    metric: 'traffic',
    deadline: '',
    clientId: ''
  })

  useEffect(() => {
    fetchGoalsData()
  }, [])

  const fetchGoalsData = async () => {
    setLoading(true)
    try {
      // Mock goals data (in real implementation, fetch from backend)
      const mockGoals = [
        {
          id: 'goal-1',
          title: 'Increase Organic Traffic by 30%',
          description: 'Grow monthly organic traffic from 10K to 13K visitors',
          metric: 'traffic',
          currentValue: 11200,
          targetValue: 13000,
          startValue: 10000,
          status: 'in-progress',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          startDate: new Date(Date.now() - 2592000000),
          deadline: new Date(Date.now() + 2592000000),
          createdAt: new Date(Date.now() - 2592000000)
        },
        {
          id: 'goal-2',
          title: 'Achieve Top 3 Rankings for Main Keywords',
          description: 'Get top 3 positions for 5 primary keywords',
          metric: 'rankings',
          currentValue: 3,
          targetValue: 5,
          startValue: 0,
          status: 'in-progress',
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          startDate: new Date(Date.now() - 1728000000),
          deadline: new Date(Date.now() + 3456000000),
          createdAt: new Date(Date.now() - 1728000000)
        },
        {
          id: 'goal-3',
          title: 'Reduce Page Load Time to Under 2s',
          description: 'Optimize website performance for better UX',
          metric: 'performance',
          currentValue: 2.3,
          targetValue: 2.0,
          startValue: 3.5,
          status: 'in-progress',
          clientId: 'hottyres',
          clientName: 'Hot Tyres',
          startDate: new Date(Date.now() - 1296000000),
          deadline: new Date(Date.now() + 1296000000),
          createdAt: new Date(Date.now() - 1296000000)
        },
        {
          id: 'goal-4',
          title: 'Build 50 Quality Backlinks',
          description: 'Acquire backlinks from high-authority domains',
          metric: 'backlinks',
          currentValue: 52,
          targetValue: 50,
          startValue: 23,
          status: 'completed',
          clientId: 'sadcdisabilityservices',
          clientName: 'SADC Disability Services',
          startDate: new Date(Date.now() - 5184000000),
          deadline: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 5184000000)
        },
        {
          id: 'goal-5',
          title: 'Improve Mobile Score to 90+',
          description: 'Optimize mobile experience and performance',
          metric: 'mobile-score',
          currentValue: 85,
          targetValue: 90,
          startValue: 72,
          status: 'in-progress',
          clientId: 'instantautotraders',
          clientName: 'Instant Auto Traders',
          startDate: new Date(Date.now() - 864000000),
          deadline: new Date(Date.now() + 864000000),
          createdAt: new Date(Date.now() - 864000000)
        },
        {
          id: 'goal-6',
          title: 'Fix All Critical SEO Issues',
          description: 'Resolve 15 critical issues identified in audits',
          metric: 'issues',
          currentValue: 3,
          targetValue: 0,
          startValue: 15,
          status: 'in-progress',
          clientId: 'theprofitplatform',
          clientName: 'The Profit Platform',
          startDate: new Date(Date.now() - 604800000),
          deadline: new Date(Date.now() + 1209600000),
          createdAt: new Date(Date.now() - 604800000)
        }
      ]

      // Mock KPIs
      const mockKpis = [
        {
          id: 'kpi-1',
          name: 'Organic Traffic',
          value: 45200,
          change: 12,
          trend: 'up',
          target: 50000,
          unit: 'visits'
        },
        {
          id: 'kpi-2',
          name: 'Avg. Ranking Position',
          value: 8.2,
          change: -2.1,
          trend: 'up',
          target: 5.0,
          unit: 'position'
        },
        {
          id: 'kpi-3',
          name: 'Conversion Rate',
          value: 3.4,
          change: 0.8,
          trend: 'up',
          target: 4.0,
          unit: '%'
        },
        {
          id: 'kpi-4',
          name: 'Page Speed Score',
          value: 87,
          change: 5,
          trend: 'up',
          target: 90,
          unit: 'score'
        },
        {
          id: 'kpi-5',
          name: 'Total Backlinks',
          value: 1247,
          change: 23,
          trend: 'up',
          target: 1500,
          unit: 'links'
        },
        {
          id: 'kpi-6',
          name: 'Mobile Score',
          value: 82,
          change: 7,
          trend: 'up',
          target: 90,
          unit: 'score'
        }
      ]

      setGoals(mockGoals)
      setKpis(mockKpis)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch goals data:', error)
      toast({
        title: "Error Loading Goals",
        description: "Could not fetch goals and KPIs data.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleCreateGoal = () => {
    if (!newGoal.title || !newGoal.target || !newGoal.deadline) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const goal = {
      id: `goal-${Date.now()}`,
      ...newGoal,
      targetValue: parseFloat(newGoal.target),
      currentValue: 0,
      startValue: 0,
      status: 'in-progress',
      startDate: new Date(),
      deadline: new Date(newGoal.deadline),
      createdAt: new Date()
    }

    setGoals([...goals, goal])
    setShowNewGoalModal(false)
    setNewGoal({
      title: '',
      description: '',
      target: '',
      metric: 'traffic',
      deadline: '',
      clientId: ''
    })

    toast({
      title: "Goal Created",
      description: `${goal.title} has been created successfully.`,
    })
  }

  const handleMarkComplete = (goalId) => {
    setGoals(goals.map(goal =>
      goal.id === goalId
        ? { ...goal, status: 'completed', completedAt: new Date() }
        : goal
    ))
    toast({
      title: "Goal Completed!",
      description: "Congratulations on achieving this goal!",
    })
  }

  const handleDeleteGoal = (goalId) => {
    setGoals(goals.filter(g => g.id !== goalId))
    toast({
      title: "Goal Deleted",
      description: "The goal has been removed.",
      variant: "destructive"
    })
  }

  const calculateProgress = (goal) => {
    if (goal.metric === 'issues') {
      // For issues, progress is inverted (less is better)
      const resolved = goal.startValue - goal.currentValue
      const total = goal.startValue - goal.targetValue
      return Math.min(100, Math.round((resolved / total) * 100))
    } else {
      const progress = goal.currentValue - goal.startValue
      const total = goal.targetValue - goal.startValue
      return Math.min(100, Math.round((progress / total) * 100))
    }
  }

  const calculateDaysLeft = (deadline) => {
    const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'in-progress':
        return 'secondary'
      case 'at-risk':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const stats = {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.status === 'in-progress').length,
    completedGoals: goals.filter(g => g.status === 'completed').length,
    avgProgress: goals.filter(g => g.status === 'in-progress').length > 0
      ? Math.round(goals.filter(g => g.status === 'in-progress').reduce((sum, g) => sum + calculateProgress(g), 0) / goals.filter(g => g.status === 'in-progress').length)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Goals & KPIs</h1>
            <p className="text-muted-foreground">Loading goals...</p>
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
          <h1 className="text-3xl font-bold">Goals & KPIs</h1>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a measurable SEO goal to track progress
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Title *</Label>
                <Input
                  placeholder="e.g., Increase organic traffic by 25%"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description of this goal"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metric *</Label>
                  <Select
                    value={newGoal.metric}
                    onValueChange={(value) => setNewGoal({ ...newGoal, metric: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traffic">Traffic</SelectItem>
                      <SelectItem value="rankings">Rankings</SelectItem>
                      <SelectItem value="backlinks">Backlinks</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="mobile-score">Mobile Score</SelectItem>
                      <SelectItem value="issues">Issues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10000"
                    value={newGoal.target}
                    onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deadline *</Label>
                <Input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Client (Optional)</Label>
                <Input
                  placeholder="Client ID"
                  value={newGoal.clientId}
                  onChange={(e) => setNewGoal({ ...newGoal, clientId: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewGoalModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGoal}>
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGoals}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedGoals}</div>
            <p className="text-xs text-muted-foreground">
              Achieved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Across active goals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
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
            <div className="space-y-4">
              {goals.map(goal => {
                const progress = calculateProgress(goal)
                const daysLeft = calculateDaysLeft(goal.deadline)
                const isAtRisk = daysLeft < 7 && progress < 80 && goal.status === 'in-progress'

                return (
                  <Card key={goal.id} className={goal.status === 'completed' ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <Badge variant={getStatusColor(isAtRisk ? 'at-risk' : goal.status)}>
                              {goal.status === 'completed' ? 'Completed' : isAtRisk ? 'At Risk' : 'In Progress'}
                            </Badge>
                            {goal.clientName && (
                              <Badge variant="outline">{goal.clientName}</Badge>
                            )}
                          </div>
                          <CardDescription>{goal.description}</CardDescription>
                        </div>
                        {goal.status === 'in-progress' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleMarkComplete(goal.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteGoal(goal.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                        {goal.status === 'completed' && (
                          <Badge variant="default" className="gap-1">
                            <Award className="h-4 w-4" />
                            Achieved
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-semibold">{progress}%</span>
                          </div>
                          <Progress value={progress} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              Current: {goal.currentValue.toLocaleString()}
                            </span>
                            <span>
                              Target: {goal.targetValue.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {goal.status === 'completed'
                                ? `Completed ${new Date(goal.completedAt).toLocaleDateString()}`
                                : `Deadline: ${new Date(goal.deadline).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                          {goal.status === 'in-progress' && (
                            <Badge variant={daysLeft < 7 ? 'destructive' : 'secondary'}>
                              <Clock className="h-3 w-3 mr-1" />
                              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpis.map(kpi => {
              const progressToTarget = Math.min(100, Math.round((kpi.value / kpi.target) * 100))

              return (
                <Card key={kpi.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{kpi.name}</CardTitle>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-3xl font-bold">
                          {kpi.value.toLocaleString()}
                          {kpi.unit !== 'visits' && kpi.unit !== 'links' && kpi.unit !== 'score' && (
                            <span className="text-sm text-muted-foreground ml-1">{kpi.unit}</span>
                          )}
                        </div>
                        <Badge variant={kpi.trend === 'up' ? 'default' : 'destructive'} className="mt-2">
                          {kpi.change > 0 ? '+' : ''}{kpi.change}%
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Target: {kpi.target.toLocaleString()}</span>
                          <span>{progressToTarget}%</span>
                        </div>
                        <Progress value={progressToTarget} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
