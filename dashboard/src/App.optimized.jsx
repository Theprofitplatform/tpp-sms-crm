import { useState, useEffect, lazy, Suspense } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardSkeleton } from './components/LoadingState'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Bell, Search, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { Badge } from './components/ui/badge'
import { Toaster } from './components/ui/toaster'
import { useToast } from './hooks/use-toast'

// Lazy load page components for better performance
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClientsPage = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const ControlCenterPage = lazy(() => import('./pages/ControlCenterPage').then(m => ({ default: m.ControlCenterPage })))
const AutoFixPage = lazy(() => import('./pages/AutoFixPage').then(m => ({ default: m.AutoFixPage })))
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })))
const KeywordResearchPage = lazy(() => import('./pages/KeywordResearchPage').then(m => ({ default: m.KeywordResearchPage })))
const UnifiedKeywordsPage = lazy(() => import('./pages/UnifiedKeywordsPage'))
const GoalsPage = lazy(() => import('./pages/GoalsPage').then(m => ({ default: m.GoalsPage })))
const EmailCampaignsPage = lazy(() => import('./pages/EmailCampaignsPage').then(m => ({ default: m.EmailCampaignsPage })))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage').then(m => ({ default: m.WebhooksPage })))
const WhiteLabelPage = lazy(() => import('./pages/WhiteLabelPage').then(m => ({ default: m.WhiteLabelPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })))
const GoogleSearchConsolePage = lazy(() => import('./pages/GoogleSearchConsolePage').then(m => ({ default: m.GoogleSearchConsolePage })))
const LocalSEOPage = lazy(() => import('./pages/LocalSEOPage').then(m => ({ default: m.LocalSEOPage })))
const AIOptimizerPage = lazy(() => import('./pages/AIOptimizerPage').then(m => ({ default: m.AIOptimizerPage })))
const WordPressManagerPage = lazy(() => import('./pages/WordPressManagerPage').then(m => ({ default: m.WordPressManagerPage })))
const SchedulerPage = lazy(() => import('./pages/SchedulerPage').then(m => ({ default: m.SchedulerPage })))
const BulkOperationsPage = lazy(() => import('./pages/BulkOperationsPage').then(m => ({ default: m.BulkOperationsPage })))
const ExportBackupPage = lazy(() => import('./pages/ExportBackupPage').then(m => ({ default: m.ExportBackupPage })))
const NotificationCenterPage = lazy(() => import('./pages/NotificationCenterPage').then(m => ({ default: m.NotificationCenterPage })))
const APIDocumentationPage = lazy(() => import('./pages/APIDocumentationPage').then(m => ({ default: m.APIDocumentationPage })))

function App() {
  const { toast } = useToast()
  const [currentSection, setCurrentSection] = useState('dashboard')
  const [selectedClient, setSelectedClient] = useState(null)
  const [isDark, setIsDark] = useState(false)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalClients: 0,
      activeCampaigns: 0,
      running: 0,
      avgRanking: 0,
      issuesFound: 0
    },
    clients: [],
    activities: [],
    loading: true
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashResponse = await fetch('/api/dashboard')
        if (!dashResponse.ok) throw new Error('Failed to fetch dashboard data')
        
        const dashData = await dashResponse.json()
        const auditsResponse = await fetch('/api/analytics/summary')
        const auditsData = auditsResponse.ok ? await auditsResponse.json() : { data: {} }

        const transformedData = {
          stats: {
            totalClients: dashData.stats?.total || 0,
            activeCampaigns: dashData.stats?.active || 0,
            running: dashData.stats?.configured || 0,
            avgRanking: 0,
            issuesFound: dashData.stats?.needsSetup || 0
          },
          clients: (dashData.clients || []).map(client => ({
            id: client.id,
            name: client.name || client.id,
            domain: client.domain || client.url || 'N/A',
            status: client.envConfigured ? 'active' : (client.status || 'pending'),
            keywords: client.totalKeywords || 0,
            avgRank: client.avgPosition || 0,
            reportCount: client.reportCount || 0,
            latestReport: client.latestReport
          })),
          activities: [],
          loading: false
        }

        setDashboardData(transformedData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setDashboardData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [toast])

  const handleClientClick = (client) => {
    setSelectedClient(client)
    setCurrentSection('client-detail')
  }

  const renderPage = () => {
    const pageProps = { data: dashboardData, onClientClick: handleClientClick }
    
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        {currentSection === 'dashboard' && <DashboardPage {...pageProps} />}
        {currentSection === 'analytics' && <AnalyticsPage {...pageProps} />}
        {currentSection === 'clients' && <ClientsPage {...pageProps} />}
        {currentSection === 'client-detail' && <ClientDetailPage client={selectedClient} />}
        {currentSection === 'reports' && <ReportsPage />}
        {currentSection === 'control-center' && <ControlCenterPage />}
        {currentSection === 'auto-fix' && <AutoFixPage />}
        {currentSection === 'recommendations' && <RecommendationsPage />}
        {currentSection === 'keyword-research' && <KeywordResearchPage />}
        {currentSection === 'unified-keywords' && <UnifiedKeywordsPage />}
        {currentSection === 'goals' && <GoalsPage />}
        {currentSection === 'email-campaigns' && <EmailCampaignsPage />}
        {currentSection === 'webhooks' && <WebhooksPage />}
        {currentSection === 'white-label' && <WhiteLabelPage />}
        {currentSection === 'settings' && <SettingsPage />}
        {currentSection === 'google-search-console' && <GoogleSearchConsolePage />}
        {currentSection === 'local-seo' && <LocalSEOPage />}
        {currentSection === 'ai-optimizer' && <AIOptimizerPage />}
        {currentSection === 'wordpress' && <WordPressManagerPage />}
        {currentSection === 'scheduler' && <SchedulerPage />}
        {currentSection === 'bulk-operations' && <BulkOperationsPage />}
        {currentSection === 'export-backup' && <ExportBackupPage />}
        {currentSection === 'notification-center' && <NotificationCenterPage />}
        {currentSection === 'api-documentation' && <APIDocumentationPage />}
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar 
          currentSection={currentSection}
          onSectionChange={setCurrentSection}
        />
        
        <div className="flex-1 flex flex-col min-h-screen ml-64">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <div className="flex-1 flex items-center gap-4">
                <div className="relative w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search clients, reports, keywords..."
                    className="pl-9 w-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)}>
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        3
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuItem>New audit completed</DropdownMenuItem>
                    <DropdownMenuItem>Ranking improved for keyword</DropdownMenuItem>
                    <DropdownMenuItem>Weekly report ready</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            {renderPage()}
          </main>
        </div>
      </div>
      
      <Toaster />
    </div>
  )
}

export default App
