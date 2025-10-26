import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react'

export function StatsCards({ stats = {} }) {
  const cards = [
    {
      icon: Users,
      title: 'Total Clients',
      value: stats.totalClients || 0,
      badge: { text: '+3 this month', variant: 'success' },
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    {
      icon: CheckCircle,
      title: 'Active Campaigns',
      value: stats.activeCampaigns || 0,
      badge: { text: `${stats.running || 0} running`, variant: 'default' },
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
    {
      icon: TrendingUp,
      title: 'Avg. Ranking',
      value: stats.avgRanking ? `#${stats.avgRanking.toFixed(1)}` : '--',
      badge: { text: '+2.3 positions', variant: 'success' },
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950'
    },
    {
      icon: AlertTriangle,
      title: 'Issues Found',
      value: stats.issuesFound || 0,
      badge: { text: 'Needs attention', variant: 'warning' },
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {card.value}
                  </p>
                  <Badge variant={card.badge.variant} className="text-xs">
                    {card.badge.text}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
