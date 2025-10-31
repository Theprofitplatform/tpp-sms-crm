import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, TrendingUp, Zap, ExternalLink, Play, Loader2 } from 'lucide-react'
import { getScoreColor } from '@/lib/optimizer-utils'

export default function RecommendationsList({ clientId, onOptimize }) {
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState({
    quickWins: [],
    highPriority: [],
    recommendations: [],
    avgImprovement: 0,
    totalOptimized: 0
  })

  useEffect(() => {
    if (clientId) {
      fetchRecommendations()
    }
  }, [clientId])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-optimizer/recommendations/${clientId}`)
      const data = await response.json()
      
      if (data.success) {
        setRecommendations(data)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = (contentId, title) => {
    if (onOptimize) {
      onOptimize(contentId, title)
    }
  }

  const renderRecommendationTable = (items, emptyMessage) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {emptyMessage}
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Content</TableHead>
            <TableHead className="text-right">Current Score</TableHead>
            <TableHead className="text-right">Issues</TableHead>
            <TableHead className="text-right">Est. Improvement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.contentId}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  {item.url && (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                    >
                      View page <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={getScoreColor(item.score)}>
                  {item.score}/100
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{item.issues} issues</Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-green-600 font-medium">
                  +{item.estimatedImprovement}%
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm" 
                  onClick={() => handleOptimize(item.contentId, item.title)}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Optimize
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
        </CardContent>
      </Card>
    )
  }

  if (!clientId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select a client to see recommendations
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{recommendations.avgImprovement}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on previous optimizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Optimized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.totalOptimized}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Content items improved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Potential Gains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {recommendations.recommendations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items ready to optimize
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <CardTitle>AI Recommendations</CardTitle>
          </div>
          <CardDescription>
            Content that could benefit from optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="quick-wins">
            <TabsList className="mb-4">
              <TabsTrigger value="quick-wins">
                <Zap className="h-4 w-4 mr-1" />
                Quick Wins ({recommendations.quickWins.length})
              </TabsTrigger>
              <TabsTrigger value="high-priority">
                <TrendingUp className="h-4 w-4 mr-1" />
                High Priority ({recommendations.highPriority.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({recommendations.recommendations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick-wins">
              {renderRecommendationTable(
                recommendations.quickWins,
                'No quick wins found. These are pages with scores between 50-70 that can be easily improved.'
              )}
            </TabsContent>

            <TabsContent value="high-priority">
              {renderRecommendationTable(
                recommendations.highPriority,
                'Great! No high-priority items. These are pages with scores below 50 that need immediate attention.'
              )}
            </TabsContent>

            <TabsContent value="all">
              {renderRecommendationTable(
                recommendations.recommendations,
                'All content is already optimized or no content found.'
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
