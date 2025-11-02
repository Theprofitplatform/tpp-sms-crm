import { useState, useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import DashboardPageUpgraded from './pages/DashboardPageUpgraded'
import ClientsPage from './pages/ClientsPage'
import ReportsPage from './pages/ReportsPage'
import ControlCenterPage from './pages/ControlCenterPage'
import PositionTrackingPage from './pages/PositionTrackingPage'
import DomainsPage from './pages/DomainsPage'
import KeywordsPage from './pages/KeywordsPageEnhanced'
import AutoFixPage from './pages/AutoFixPage'
import AutoFixReviewPage from './pages/AutoFixReviewPage'
import AutoFixSettingsPage from './pages/AutoFixSettingsPage'
import ManualReviewDashboard from './pages/ManualReviewDashboard'
import EnginesControlPage from './pages/EnginesControlPage'
import RecommendationsPage from './pages/RecommendationsPage.phase4b'
import KeywordResearchPage from './pages/KeywordResearchPage'
import UnifiedKeywordsPage from './pages/UnifiedKeywordsPage'
import GoalsPage from './pages/GoalsPage'
import EmailCampaignsPage from './pages/EmailCampaignsPage'
import WebhooksPage from './pages/WebhooksPage'
import WhiteLabelPage from './pages/WhiteLabelPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import GoogleSearchConsolePageEnhanced from './pages/GoogleSearchConsolePageEnhanced'
import GSCSettingsPage from './pages/GSCSettingsPage'
import LocalSEOPage from './pages/LocalSEOPage'
import AIOptimizerPage from './pages/AIOptimizerPage'
import WordPressManagerPage from './pages/WordPressManagerPage'
import SchedulerPage from './pages/SchedulerPage'
import BulkOperationsPage from './pages/BulkOperationsPage'
import ExportBackupPage from './pages/ExportBackupPage'
import NotificationCenterPage from './pages/NotificationCenterPage'
import APIDocumentationPage from './pages/APIDocumentationPage'
import ActivityLogPage from './pages/ActivityLogPage'
import PixelManagementPage from './pages/PixelManagementPage'
import PixelIssuesPage from './pages/PixelIssuesPage'
import SchemaAutomationPage from './pages/SchemaAutomationPage'
import SSROptimizationPage from './pages/SSROptimizationPage'
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
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
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
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=5')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.meta?.unread || 0)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()
    // Refresh notifications every 30 seconds
    const notifInterval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(notifInterval)
  }, [])

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
    <ErrorBoundary>
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
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Notifications</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-1 text-xs"
                        onClick={() => handleNavigate('notifications')}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className="p-2 hover:bg-muted rounded-md text-sm cursor-pointer"
                            onClick={() => {
                              if (notif.link) {
                                const section = notif.link.replace('/', '')
                                handleNavigate(section || 'notifications')
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                                notif.type === 'error' ? 'bg-red-500' :
                                notif.type === 'warning' ? 'bg-yellow-500' :
                                notif.type === 'success' ? 'bg-green-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{notif.title}</p>
                                <p className="text-muted-foreground text-xs truncate">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
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
            <DashboardPageUpgraded data={dashboardData} onClientClick={handleClientSelect} />
          )}
          {currentSection === 'clients' && <ClientsPage />}
          {currentSection === 'reports' && <ReportsPage />}
          {currentSection === 'automation' && <ControlCenterPage />}
          {currentSection === 'autofix' && <AutoFixPage onNavigate={handleNavigate} />}
          {currentSection === 'autofix-review' && <AutoFixReviewPage onNavigate={handleNavigate} />}
          {currentSection === 'autofix-settings' && <AutoFixSettingsPage onNavigate={handleNavigate} />}
          {currentSection === 'manual-review' && <ManualReviewDashboard onNavigate={handleNavigate} />}
          {currentSection === 'engines-control' && <EnginesControlPage onNavigate={handleNavigate} />}
          {currentSection === 'activity-log' && <ActivityLogPage />}
          {currentSection === 'ai-optimizer' && <AIOptimizerPage />}
          {currentSection === 'pixel-management' && <PixelManagementPage />}
          {currentSection === 'pixel-issues' && <PixelIssuesPage />}
          {currentSection === 'schema-automation' && <SchemaAutomationPage />}
          {currentSection === 'ssr-optimization' && <SSROptimizationPage />}
          {currentSection === 'scheduler' && <SchedulerPage />}
          {currentSection === 'bulk-operations' && <BulkOperationsPage />}
          {currentSection === 'position-tracking' && <PositionTrackingPage />}
          {currentSection === 'domains' && <DomainsPage />}
          {currentSection === 'keywords' && <KeywordsPage />}
          {currentSection === 'google-console' && <GoogleSearchConsolePageEnhanced />}
          {currentSection === 'gsc-settings' && <GSCSettingsPage />}
          {currentSection === 'local-seo' && <LocalSEOPage />}
          {currentSection === 'wordpress' && <WordPressManagerPage />}
          {currentSection === 'recommendations' && <RecommendationsPage />}
          {currentSection === 'keyword-research' && <KeywordResearchPage />}
          {currentSection === 'unified-keywords' && <UnifiedKeywordsPage />}
          {currentSection === 'goals' && <GoalsPage />}
          {currentSection === 'emails' && <EmailCampaignsPage />}
          {currentSection === 'notifications' && <NotificationCenterPage />}
          {currentSection === 'webhooks' && <WebhooksPage />}
          {currentSection === 'api-docs' && <APIDocumentationPage />}
          {currentSection === 'export-backup' && <ExportBackupPage />}
          {currentSection === 'whitelabel' && <WhiteLabelPage />}
          {currentSection === 'analytics' && <AnalyticsPage data={dashboardData} />}
          {currentSection === 'settings' && <SettingsPage />}
          {currentSection === 'client-detail' && (
            <ClientDetailPage clientId={selectedClient} onBack={handleBackToDashboard} />
          )}
          {!['dashboard', 'clients', 'reports', 'automation', 'autofix', 'autofix-review', 'autofix-settings', 'manual-review', 'engines-control', 'activity-log', 'ai-optimizer', 'scheduler',
              'bulk-operations', 'position-tracking', 'domains', 'keywords', 'google-console', 'gsc-settings', 'local-seo', 'wordpress', 'recommendations',
              'keyword-research', 'unified-keywords', 'goals', 'emails', 'notifications', 'webhooks',
              'api-docs', 'export-backup', 'whitelabel', 'analytics', 'settings', 'client-detail', 'pixel-management', 'pixel-issues', 'schema-automation', 'ssr-optimization'].includes(currentSection) && (
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
    </ErrorBoundary>
  )
}

export default App
