import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  PlayCircle, 
  FileText, 
  Plus, 
  RefreshCw, 
  Settings, 
  Upload,
  Search,
  Zap
} from 'lucide-react'

export function QuickActions({ onAction }) {
  const actions = [
    {
      id: 'run-audit',
      label: 'Run Audit',
      icon: PlayCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      description: 'Start SEO audit'
    },
    {
      id: 'add-client',
      label: 'Add Client',
      icon: Plus,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      description: 'New client setup'
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      description: 'Create new report'
    },
    {
      id: 'sync-data',
      label: 'Sync Data',
      icon: RefreshCw,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      description: 'Update from GSC'
    },
    {
      id: 'auto-fix',
      label: 'Auto-Fix Issues',
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      description: 'Fix SEO issues'
    },
    {
      id: 'keyword-research',
      label: 'Keyword Research',
      icon: Search,
      color: 'text-pink-500',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
      description: 'Find keywords'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all"
                onClick={() => onAction && onAction(action.id)}
              >
                <div className={`p-2 rounded-lg ${action.bgColor}`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
