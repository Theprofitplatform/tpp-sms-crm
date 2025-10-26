import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const activityIcons = {
  audit: TrendingUp,
  error: AlertCircle,
  success: CheckCircle,
  warning: XCircle,
}

const activityColors = {
  audit: 'text-blue-500',
  error: 'text-red-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
}

export function RecentActivity({ activities = [] }) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across all clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            activities.map((activity, idx) => {
              const Icon = activityIcons[activity.type] || Clock
              const color = activityColors[activity.type] || 'text-muted-foreground'

              return (
                <div key={idx} className="flex gap-4 items-start">
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    {activity.client && (
                      <Badge variant="outline" className="text-xs">
                        {activity.client}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.timestamp && formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
