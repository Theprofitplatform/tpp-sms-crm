import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { AnimatedCounter } from './AnimatedCounter'

export function EnhancedStatsCards({ stats = {}, trends = {} }) {
  const getTrendIcon = (change) => {
    if (change > 0) return ArrowUp
    if (change < 0) return ArrowDown
    return Minus
  }

  const getTrendColor = (change) => {
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  const getTrendBg = (change) => {
    if (change > 0) return 'bg-green-50 dark:bg-green-950'
    if (change < 0) return 'bg-red-50 dark:bg-red-950'
    return 'bg-muted'
  }

  const cards = [
    {
      icon: Users,
      title: 'Total Clients',
      value: stats.totalClients || 0,
      change: trends.clientsChange || 5.2,
      sparklineData: trends.clientsSparkline || [
        { value: 45 }, { value: 47 }, { value: 46 }, { value: 48 }, { value: 50 }, { value: 49 }, { value: 52 }
      ],
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      subtitle: 'Active accounts'
    },
    {
      icon: CheckCircle,
      title: 'Active Campaigns',
      value: stats.activeCampaigns || 0,
      change: trends.campaignsChange || 12.3,
      sparklineData: trends.campaignsSparkline || [
        { value: 30 }, { value: 32 }, { value: 35 }, { value: 33 }, { value: 36 }, { value: 38 }, { value: 40 }
      ],
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      subtitle: `${stats.running || 0} running now`
    },
    {
      icon: TrendingUp,
      title: 'Avg. Ranking',
      value: (() => {
        const val = parseFloat(stats.avgRanking)
        return val && isFinite(val) ? `#${val.toFixed(1)}` : '--'
      })(),
      change: trends.rankingChange || -8.5, // Negative is good for ranking
      sparklineData: trends.rankingSparkline || [
        { value: 25 }, { value: 23 }, { value: 21 }, { value: 19 }, { value: 18 }, { value: 17 }, { value: 15 }
      ],
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      subtitle: 'Position improved',
      invertTrend: true // For ranking, lower is better
    },
    {
      icon: AlertTriangle,
      title: 'Issues Found',
      value: stats.issuesFound || 0,
      change: trends.issuesChange || -15.3, // Negative is good for issues
      sparklineData: trends.issuesSparkline || [
        { value: 45 }, { value: 42 }, { value: 38 }, { value: 35 }, { value: 32 }, { value: 28 }, { value: 25 }
      ],
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      subtitle: 'Resolved this week',
      invertTrend: true // For issues, lower is better
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        const effectiveChange = card.invertTrend ? -card.change : card.change
        const TrendIcon = getTrendIcon(effectiveChange)
        const trendColor = getTrendColor(effectiveChange)
        const trendBg = getTrendBg(effectiveChange)

        return (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendBg}`}>
                    <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                    <span className={`text-xs font-semibold ${trendColor}`}>
                      {(() => {
                        const absChange = Math.abs(Number(card.change) || 0)
                        return isFinite(absChange) ? absChange.toFixed(1) : '0.0'
                      })()}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">
                    {typeof card.value === 'number' ? (
                      <AnimatedCounter value={card.value} duration={800} />
                    ) : (
                      card.value
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Sparkline */}
              <div className="h-16 px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={card.sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={card.iconColor.replace('text-', '#')}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
