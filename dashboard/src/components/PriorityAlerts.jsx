import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, Info, X, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export function PriorityAlerts({ alerts = [] }) {
  const [dismissedIds, setDismissedIds] = useState(new Set())

  const defaultAlerts = [
    {
      id: 'alert-1',
      type: 'error',
      title: '3 clients have critical SEO issues',
      message: 'Multiple broken links and missing meta tags detected',
      action: 'Review Issues',
      link: '/autofix'
    },
    {
      id: 'alert-2',
      type: 'warning',
      title: 'Keyword rankings dropped for 2 campaigns',
      message: 'Average position decreased by 15% in the last 7 days',
      action: 'View Details',
      link: '/keywords'
    },
    {
      id: 'alert-3',
      type: 'info',
      title: 'New optimization suggestions available',
      message: '12 opportunities to improve your clients\' rankings',
      action: 'View Suggestions',
      link: '/recommendations'
    }
  ]

  const activeAlerts = (alerts.length > 0 ? alerts : defaultAlerts)
    .filter(alert => !dismissedIds.has(alert.id))

  const handleDismiss = (id) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return AlertCircle
      case 'warning': return AlertTriangle
      default: return Info
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      default: return 'text-blue-500'
    }
  }

  const getAlertBg = (type) => {
    switch (type) {
      case 'error': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
      default: return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
    }
  }

  if (activeAlerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => {
        const Icon = getAlertIcon(alert.type)
        const color = getAlertColor(alert.type)
        const bgColor = getAlertBg(alert.type)

        return (
          <Card key={alert.id} className={`border ${bgColor}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {alert.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.message}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1 -mr-2"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {alert.action && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => window.location.href = alert.link}
                    >
                      {alert.action}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
