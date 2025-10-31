import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Award, Target, ArrowUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TopPerformers({ data = {} }) {
  const topKeywords = data.topKeywords || [
    { keyword: 'seo optimization', rank: 1, change: 3, client: 'Client A' },
    { keyword: 'digital marketing', rank: 2, change: 5, client: 'Client B' },
    { keyword: 'content strategy', rank: 3, change: 2, client: 'Client C' },
    { keyword: 'local seo services', rank: 4, change: 7, client: 'Client A' },
    { keyword: 'wordpress seo', rank: 5, change: 1, client: 'Client D' }
  ]

  const topClients = data.topClients || [
    { name: 'Freedom Activewear', avgRank: 8.5, keywords: 145, improvement: 15.2 },
    { name: 'Profit Platform', avgRank: 12.3, keywords: 98, improvement: 12.8 },
    { name: 'Instant Auto Traders', avgRank: 15.7, keywords: 76, improvement: 8.4 }
  ]

  const biggestGainers = data.biggestGainers || [
    { name: 'Freedom Activewear', keyword: 'activewear online', oldRank: 45, newRank: 12, gain: 33 },
    { name: 'Profit Platform', keyword: 'trading platform', oldRank: 38, newRank: 15, gain: 23 },
    { name: 'Instant Auto Traders', keyword: 'auto trading', oldRank: 52, newRank: 31, gain: 21 }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="keywords" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="gainers">Biggest Gains</TabsTrigger>
          </TabsList>

          <TabsContent value="keywords" className="space-y-3">
            {topKeywords.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {item.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.keyword}</p>
                    <p className="text-xs text-muted-foreground">{item.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {item.change}
                  </Badge>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="clients" className="space-y-3">
            {topClients.map((client, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Avg Rank: #{client.avgRank}</span>
                      <span>•</span>
                      <span>{client.keywords} keywords</span>
                    </div>
                  </div>
                </div>
                <Badge variant="success" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {client.improvement}%
                </Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="gainers" className="space-y-3">
            {biggestGainers.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.keyword}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                  <Badge className="bg-green-500 text-white flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {item.gain} positions
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">#{item.oldRank}</span>
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">#{item.newRank}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
