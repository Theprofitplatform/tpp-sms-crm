import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardPage } from './pages/DashboardPage'
import { ClientsPage } from './pages/ClientsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ControlCenterPage } from './pages/ControlCenterPage'
import { AutoFixPage } from './pages/AutoFixPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { KeywordResearchPage } from './pages/KeywordResearchPage'
import UnifiedKeywordsPage from './pages/UnifiedKeywordsPage'
import { GoalsPage } from './pages/GoalsPage'
import { EmailCampaignsPage } from './pages/EmailCampaignsPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { WhiteLabelPage } from './pages/WhiteLabelPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
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
    // Apply dark mode class to document
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  useEffect(() => {
    // Fetch dashboard data from API
    const fetchData = async () => {
      try {
        // Fetch dashboard data (clients and stats)
        const dashResponse = await fetch('/api/dashboard')

        if (!dashResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const dashData = await dashResponse.json()

        // Fetch recent audit history for activities
        const auditsResponse = await fetch('/api/analytics/summary')
        const auditsData = auditsResponse.ok ? await auditsResponse.json() : { data: {} }

        // Transform backend data to dashboard format
        const transformedData = {
          stats: {
            totalClients: dashData.stats?.total || 0,
            activeCampaigns: dashData.stats?.active || 0,
            running: dashData.stats?.configured || 0,
            avgRanking: 0, // Will calculate from client data
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
          activities: transformAuditHistory(auditsData.data),
          loading: false
        }

        // Calculate average ranking from clients
        const rankedClients = transformedData.clients.filter(c => c.avgRank > 0)
        if (rankedClients.length > 0) {
          transformedData.stats.avgRanking = (
            rankedClients.reduce((sum, c) => sum + c.avgRank, 0) / rankedClients.length
          ).toFixed(1)
        }

        setDashboardData(transformedData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setDashboardData(prev => ({ ...prev, loading: false }))
        toast({
          title: "Connection Error",
          description: "Could not fetch data from server. Using cached data.",
          variant: "destructive"
        })
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [toast])

  // Transform audit history to activity feed format
  const transformAuditHistory = (analyticsData) => {
    const activities = []

    // Add recent audits as activities
    if (analyticsData.recentAudits) {
      activities.push({
        type: 'audit',
        title: 'Recent Audits Completed',
        description: `${analyticsData.recentAudits} audits in last 30 days`,
        client: 'All Clients',
        timestamp: new Date()
      })
    }

    // Add client metrics as activities
    if (analyticsData.clientMetrics) {
      Object.entries(analyticsData.clientMetrics).forEach(([clientId, metrics]) => {
        if (metrics.totalAudits > 0) {
          activities.push({
            type: 'success',
            title: 'SEO Audit Completed',
            description: `Total ${metrics.totalAudits} audits completed`,
            client: clientId,
            timestamp: new Date(metrics.lastUpdate)
          })
        }
      })
    }

    return activities.slice(0, 4) // Return latest 4 activities
  }

  const handleNavigate = (section) => {
    setCurrentSection(section)
    setSelectedClient(null) // Clear selected client when navigating
    // Show toast notification for navigation
    if (section !== 'dashboard' && section !== 'analytics' && section !== 'settings' && section !== 'clients' && section !== 'reports' && section !== 'control-center' && section !== 'auto-fix-engines' && section !== 'recommendations' && section !== 'keyword-research' && section !== 'goals' && section !== 'email-campaigns' && section !== 'webhooks' && section !== 'white-label') {
      toast({
        title: "Section Under Construction",
        description: `The ${section.replace('-', ' ')} section is being built.`,
      })
    }
  }

  const handleClientSelect = (clientId) => {
    setSelectedClient(clientId)
    setCurrentSection('client-detail')
  }

  const handleBackToDashboard = () => {
    setSelectedClient(null)
    setCurrentSection('dashboard')
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentSection={currentSection} onNavigate={handleNavigate} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="flex h-16 items-center gap-4 px-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {isDark ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-2">
                    <h4 className="font-semibold mb-2">Notifications</h4>
                    <div className="space-y-2">
                      <div className="p-2 hover:bg-muted rounded-md text-sm">
                        <p className="font-medium">New ranking update</p>
                        <p className="text-muted-foreground text-xs">Acme Corp improved by 3 positions</p>
                      </div>
                      <div className="p-2 hover:bg-muted rounded-md text-sm">
                        <p className="font-medium">Audit completed</p>
                        <p className="text-muted-foreground text-xs">TechStart Inc - 15 issues found</p>
                      </div>
                      <div className="p-2 hover:bg-muted rounded-md text-sm">
                        <p className="font-medium">Configuration needed</p>
                        <p className="text-muted-foreground text-xs">Global Solutions requires setup</p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentSection === 'dashboard' && (
            <DashboardPage data={dashboardData} onClientClick={handleClientSelect} />
          )}
          {currentSection === 'clients' && <ClientsPage />}
          {currentSection === 'reports' && <ReportsPage />}
          {currentSection === 'control-center' && <ControlCenterPage />}
          {currentSection === 'auto-fix-engines' && <AutoFixPage />}
          {currentSection === 'recommendations' && <RecommendationsPage />}
          {currentSection === 'keyword-research' && <KeywordResearchPage />}
          {currentSection === 'unified-keywords' && <UnifiedKeywordsPage />}
          {currentSection === 'goals' && <GoalsPage />}
          {currentSection === 'email-campaigns' && <EmailCampaignsPage />}
          {currentSection === 'webhooks' && <WebhooksPage />}
          {currentSection === 'white-label' && <WhiteLabelPage />}
          {currentSection === 'analytics' && <AnalyticsPage data={dashboardData} />}
          {currentSection === 'settings' && <SettingsPage />}
          {currentSection === 'client-detail' && (
            <ClientDetailPage clientId={selectedClient} onBack={handleBackToDashboard} />
          )}
          {currentSection !== 'dashboard' &&
           currentSection !== 'clients' &&
           currentSection !== 'reports' &&
           currentSection !== 'control-center' &&
           currentSection !== 'auto-fix-engines' &&
           currentSection !== 'recommendations' &&
           currentSection !== 'keyword-research' &&
           currentSection !== 'unified-keywords' &&
           currentSection !== 'goals' &&
           currentSection !== 'email-campaigns' &&
           currentSection !== 'webhooks' &&
           currentSection !== 'white-label' &&
           currentSection !== 'analytics' &&
           currentSection !== 'settings' &&
           currentSection !== 'client-detail' && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2 capitalize">
                  {currentSection.replace('-', ' ')}
                </h2>
                <p className="text-muted-foreground">
                  This section is under construction
                </p>
                <Button className="mt-4" onClick={() => handleNavigate('dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

export default App
