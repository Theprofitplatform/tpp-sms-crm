import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

import { analyticsAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { categorizeGSCData, GSC_SETUP_STEPS } from '@/utils/gscAnalysis'

import {
  TrendingUp,
  TrendingDown,
  Search,
  MousePointerClick,
  Eye,
  Target,
  AlertCircle,
  RefreshCw,
  Download,
  Loader2,
  Zap,
  Shield,
  HelpCircle,
  ExternalLink,
  CheckCircle,
  Info,
  ArrowUpCircle,
  BookOpen
} from 'lucide-react'

export default function GoogleSearchConsolePageEnhanced() {
  const { toast } = useToast()
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // API Requests
  const { data: gscData, loading, refetch } = useAPIData(
    () => analyticsAPI.getGSCSummary(),
    { autoFetch: true }
  )

  const { execute: syncGSC, loading: syncing } = useAPIRequest()

  // Calculate summary metrics
  const summary = useMemo(() => {
    if (!gscData) return { totalClicks: 0, totalImpressions: 0, avgCTR: 0, avgPosition: 0 }
    return {
      totalClicks: gscData.totalClicks || 0,
      totalImpressions: gscData.totalImpressions || 0,
      avgCTR: ((gscData.totalClicks / gscData.totalImpressions) * 100).toFixed(2) || 0,
      avgPosition: gscData.avgPosition?.toFixed(1) || 0
    }
  }, [gscData])

  // Categorize GSC data with traffic potential
  const categorized = useMemo(() => {
    if (!gscData?.topQueries) return null
    return categorizeGSCData(gscData.topQueries)
  }, [gscData])

  const handleSync = useCallback(async () => {
    await syncGSC(
      () => analyticsAPI.syncGSC(),
      {
        showSuccessToast: true,
        successMessage: 'GSC data synced successfully',
        onSuccess: () => refetch()
      }
    )
  }, [syncGSC, refetch])

  const handleExport = useCallback(() => {
    if (!gscData?.topQueries) return
    
    let csvContent = 'Query,Position,Clicks,Impressions,CTR,Potential Clicks,Traffic Gain,Priority\n'
    
    ;(categorized?.quickWins || []).forEach(q => {
      csvContent += `"${q.query}",${q.position},${q.clicks},${q.impressions},${(q.clicks/q.impressions*100).toFixed(2)}%,${q.traffic.potential},${q.traffic.gain},${q.recommendations.priority}\n`
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `gsc-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Export Complete',
      description: 'GSC analysis exported successfully'
    })
  }, [gscData, categorized, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading GSC data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Google Search Console
          </h1>
          <p className="text-muted-foreground">
            SEO insights with traffic potential estimates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSetupWizard(true)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Setup Guide
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!gscData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 28 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Search appearances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgCTR}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click-through rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Position</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgPosition}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average ranking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Alert */}
      {categorized && categorized.quickWins.length > 0 && (
        <Alert className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
          <Zap className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="font-bold text-lg text-yellow-900 dark:text-yellow-100">
            {categorized.quickWins.length} Quick Win Opportunities Found!
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            You have keywords in positions 11-20 that could generate{' '}
            <span className="font-bold">
              +{categorized.quickWins.reduce((sum, q) => sum + q.traffic.gain, 0)} clicks/month
            </span>{' '}
            if optimized to reach top 10. Check the Quick Wins tab below.
          </AlertDescription>
        </Alert>
      )}

      {/* Data Tabs */}
      <Tabs defaultValue="quick-wins" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="quick-wins">
            <Zap className="h-4 w-4 mr-2" />
            Quick Wins ({categorized?.quickWins.length || 0})
          </TabsTrigger>
          <TabsTrigger value="low-ctr">
            <MousePointerClick className="h-4 w-4 mr-2" />
            Low CTR ({categorized?.lowCTR.length || 0})
          </TabsTrigger>
          <TabsTrigger value="top-3">
            <Shield className="h-4 w-4 mr-2" />
            Top 3 ({categorized?.top3Maintain.length || 0})
          </TabsTrigger>
          <TabsTrigger value="push-top">
            <Target className="h-4 w-4 mr-2" />
            Push to Top 3 ({categorized?.top10Push.length || 0})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Queries ({gscData?.topQueries?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Quick Wins Tab */}
        <TabsContent value="quick-wins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Quick Win Opportunities
              </CardTitle>
              <CardDescription>
                Keywords in positions 11-20 with high traffic potential - easiest to improve
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!categorized || categorized.quickWins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <p>No quick win opportunities found</p>
                  <p className="text-sm mt-2">Keywords ranking 11-20 will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Current Clicks</TableHead>
                      <TableHead>Potential</TableHead>
                      <TableHead>Gain</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorized.quickWins.map((query, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {query.query}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">#{Math.round(query.position)}</Badge>
                        </TableCell>
                        <TableCell>{query.impressions.toLocaleString()}</TableCell>
                        <TableCell>{query.clicks}/mo</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {query.traffic.potential}/mo
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                            +{query.traffic.gain}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {}}
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Recommendations for: {query.query}</DialogTitle>
                                <DialogDescription>
                                  Position #{Math.round(query.position)} • {query.recommendations.priority} Priority
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-sm text-muted-foreground">Current Traffic</div>
                                      <div className="text-2xl font-bold">{query.clicks}/mo</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-6">
                                      <div className="text-sm text-muted-foreground">Potential</div>
                                      <div className="text-2xl font-bold text-green-600">
                                        {query.traffic.potential}/mo
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Actionable Steps</h4>
                                  <div className="space-y-3">
                                    {query.recommendations.recommendations.map((rec, i) => (
                                      <div key={i} className="border rounded-lg p-3">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium">{rec.action}</div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                              {rec.description}
                                            </div>
                                          </div>
                                          <div className="flex gap-2 ml-4">
                                            <Badge variant="outline" className="text-xs">
                                              {rec.effort}
                                            </Badge>
                                            <Badge className="text-xs bg-green-600">
                                              {rec.impact}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t">
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Success Rate:</span> {query.recommendations.successRate}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-medium">Timeframe:</span> {query.recommendations.timeframe}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low CTR Tab */}
        <TabsContent value="low-ctr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-orange-600" />
                Low CTR Optimization
              </CardTitle>
              <CardDescription>
                Keywords in top 10 with low click-through rates - optimize titles and meta descriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!categorized || categorized.lowCTR.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>Great! All top 10 keywords have healthy CTR</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Potential Gain</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorized.lowCTR.map((query, idx) => {
                      const ctr = ((query.clicks / query.impressions) * 100).toFixed(2)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{query.query}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-600">#{Math.round(query.position)}</Badge>
                          </TableCell>
                          <TableCell>{query.impressions.toLocaleString()}</TableCell>
                          <TableCell>{query.clicks}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{ctr}%</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600">+{query.traffic.gain}</Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-xs">
                            Optimize title & meta description
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top 3 Maintain Tab */}
        <TabsContent value="top-3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Top 3 Rankings - Maintain Position
              </CardTitle>
              <CardDescription>
                Your best-performing keywords - keep monitoring and defending these positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!categorized || categorized.top3Maintain.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <p>No top 3 rankings yet</p>
                  <p className="text-sm mt-2">Work on improving positions to reach top 3</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorized.top3Maintain.map((query, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{query.query}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">#{Math.round(query.position)}</Badge>
                        </TableCell>
                        <TableCell>{query.clicks}</TableCell>
                        <TableCell>
                          {((query.clicks / query.impressions) * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Excellent
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Push to Top 3 Tab */}
        <TabsContent value="push-top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Push to Top 3
              </CardTitle>
              <CardDescription>
                Keywords in positions 4-10 - high-value targets for optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!categorized || categorized.top10Push.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4" />
                  <p>No keywords in positions 4-10</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Current Clicks</TableHead>
                      <TableHead>Potential @ #1</TableHead>
                      <TableHead>Gain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorized.top10Push.map((query, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{query.query}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-600">#{Math.round(query.position)}</Badge>
                        </TableCell>
                        <TableCell>{query.clicks}/mo</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {query.traffic.potential}/mo
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">
                            +{query.traffic.gain} (+{query.traffic.percentGain}%)
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Queries Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Search Queries</CardTitle>
              <CardDescription>
                Complete list of search queries driving traffic
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!gscData?.topQueries || gscData.topQueries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No GSC data available</p>
                  <p className="text-sm mt-2">Click "Sync Now" to fetch data from Google Search Console</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gscData.topQueries.slice(0, 50).map((query, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{query.query}</TableCell>
                        <TableCell>#{Math.round(query.position)}</TableCell>
                        <TableCell>{query.clicks}</TableCell>
                        <TableCell>{query.impressions}</TableCell>
                        <TableCell>
                          {((query.clicks / query.impressions) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {gscData?.topQueries && gscData.topQueries.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing first 50 of {gscData.topQueries.length} queries
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setup Wizard Dialog */}
      <Dialog open={showSetupWizard} onOpenChange={setShowSetupWizard}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Search Console Setup Wizard</DialogTitle>
            <DialogDescription>
              Follow these steps to connect your GSC account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {GSC_SETUP_STEPS.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Est. Time: {GSC_SETUP_STEPS[currentStep].estimatedTime}
              </div>
            </div>
            
            <Progress value={((currentStep + 1) / GSC_SETUP_STEPS.length) * 100} />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold">
                  {GSC_SETUP_STEPS[currentStep].step}. {GSC_SETUP_STEPS[currentStep].title}
                </h3>
                <p className="text-muted-foreground">
                  {GSC_SETUP_STEPS[currentStep].description}
                </p>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/50">
                <ol className="list-decimal list-inside space-y-2">
                  {GSC_SETUP_STEPS[currentStep].instructions.map((instruction, idx) => (
                    <li key={idx} className="text-sm">{instruction}</li>
                  ))}
                </ol>
              </div>
              
              {GSC_SETUP_STEPS[currentStep].note && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {GSC_SETUP_STEPS[currentStep].note}
                  </AlertDescription>
                </Alert>
              )}
              
              {GSC_SETUP_STEPS[currentStep].link && (
                <Button variant="outline" asChild>
                  <a href={GSC_SETUP_STEPS[currentStep].link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open {GSC_SETUP_STEPS[currentStep].title}
                  </a>
                </Button>
              )}
            </div>
            
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              {currentStep < GSC_SETUP_STEPS.length - 1 ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  Next Step
                </Button>
              ) : (
                <Button onClick={() => setShowSetupWizard(false)} className="bg-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
