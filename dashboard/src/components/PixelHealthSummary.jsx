import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'
import { pixelAPI } from '@/services/api'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  XCircle
} from 'lucide-react'

export default function PixelHealthSummary({ clientId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pixelData, setPixelData] = useState(null)
  const [issuesSummary, setIssuesSummary] = useState(null)
  const [healthData, setHealthData] = useState(null)

  useEffect(() => {
    const fetchPixelData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch pixel status for client
        const pixelResponse = await pixelAPI.getClientPixels(clientId)

        if (!pixelResponse.success || !pixelResponse.data || pixelResponse.data.length === 0) {
          setPixelData(null)
          setLoading(false)
          return
        }

        const pixel = pixelResponse.data[0] // Get first pixel for this client
        setPixelData(pixel)

        // Fetch issues summary
        try {
          const issuesResponse = await pixelAPI.getIssueSummary(pixel.id)
          if (issuesResponse.success) {
            setIssuesSummary(issuesResponse.data)
          }
        } catch (err) {
          console.warn('Failed to fetch issues summary:', err)
        }

        // Fetch health data
        try {
          const healthResponse = await pixelAPI.getHealth(pixel.id)
          if (healthResponse.success) {
            setHealthData(healthResponse.data)
          }
        } catch (err) {
          console.warn('Failed to fetch health data:', err)
        }

        setLoading(false)
      } catch (err) {
        console.error('Failed to fetch pixel data:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (clientId) {
      fetchPixelData()
    }
  }, [clientId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SEO Health
          </CardTitle>
          <CardDescription>Pixel monitoring and SEO issue detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SEO Health
          </CardTitle>
          <CardDescription>Pixel monitoring and SEO issue detection</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load pixel data: {error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!pixelData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            SEO Health
          </CardTitle>
          <CardDescription>Pixel monitoring and SEO issue detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No pixel deployed for this client</p>
            <Button onClick={() => navigate('/pixel-management')} variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Deploy Pixel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate status indicator
  const getStatusBadge = () => {
    if (!healthData) {
      return <Badge variant="secondary">Unknown</Badge>
    }

    const uptime = healthData.last24Hours || 0
    if (uptime >= 95) {
      return <Badge className="bg-green-600">Online ({uptime}% uptime)</Badge>
    } else if (uptime >= 80) {
      return <Badge className="bg-yellow-600">Degraded ({uptime}% uptime)</Badge>
    } else {
      return <Badge variant="destructive">Down ({uptime}% uptime)</Badge>
    }
  }

  // Calculate SEO score
  const seoScore = issuesSummary?.seoScore || 0
  const criticalIssues = issuesSummary?.bySeverity?.critical || 0
  const highIssues = issuesSummary?.bySeverity?.high || 0
  const mediumIssues = issuesSummary?.bySeverity?.medium || 0
  const totalIssues = criticalIssues + highIssues + mediumIssues

  // Calculate trend (mock for now, would need historical data)
  const trend = seoScore >= 70 ? 'up' : 'down'

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pixel Status
              </CardTitle>
              <CardDescription>
                {pixelData.domain || 'Unknown domain'}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SEO Score */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">SEO Score</span>
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="text-3xl font-bold">
                {seoScore}
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Critical Issues</span>
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">
                {criticalIssues}
              </div>
            </div>

            {/* Total Issues */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Issues</span>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-3xl font-bold">
                {totalIssues}
              </div>
            </div>
          </div>

          {/* Last Seen */}
          {healthData?.lastSeen && (
            <div className="mt-4 text-sm text-muted-foreground">
              Last seen: {new Date(healthData.lastSeen).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {criticalIssues > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {criticalIssues} critical SEO {criticalIssues === 1 ? 'issue' : 'issues'} detected that require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Issue Breakdown */}
      {issuesSummary && totalIssues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Issue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalIssues > 0 && (
                <div className="flex items-center justify-between p-2 border-l-4 border-red-600 bg-red-50">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Critical</span>
                  </div>
                  <Badge variant="destructive">{criticalIssues}</Badge>
                </div>
              )}
              {highIssues > 0 && (
                <div className="flex items-center justify-between p-2 border-l-4 border-orange-600 bg-orange-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">High Priority</span>
                  </div>
                  <Badge className="bg-orange-600">{highIssues}</Badge>
                </div>
              )}
              {mediumIssues > 0 && (
                <div className="flex items-center justify-between p-2 border-l-4 border-yellow-600 bg-yellow-50">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">Medium Priority</span>
                  </div>
                  <Badge className="bg-yellow-600">{mediumIssues}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => navigate('/pixel-management')}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View All Issues
        </Button>
        {totalIssues > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/pixel-management')}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Review & Fix
          </Button>
        )}
      </div>
    </div>
  )
}
