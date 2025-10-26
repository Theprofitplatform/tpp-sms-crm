import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Filter,
  Plus,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'

export function ReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showViewer, setShowViewer] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateConfig, setGenerateConfig] = useState({
    clientId: '',
    type: 'full',
    format: 'html'
  })
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchReportsData()
  }, [])

  const fetchReportsData = async () => {
    setLoading(true)
    try {
      // Fetch clients first
      const dashResponse = await fetch('/api/dashboard')
      const dashData = await dashResponse.json()
      const clientsList = dashData.clients || []
      setClients(clientsList)

      // Fetch reports for each client
      const allReports = []
      for (const client of clientsList) {
        try {
          const reportsResponse = await fetch(`/api/reports/${client.id}`)
          if (reportsResponse.ok) {
            const clientReports = await reportsResponse.json()
            // Add client info to each report
            const reportsWithClient = clientReports.map(report => ({
              ...report,
              clientId: client.id,
              clientName: client.name || client.id,
              clientDomain: client.domain || client.url
            }))
            allReports.push(...reportsWithClient)
          }
        } catch (err) {
          console.error(`Failed to fetch reports for ${client.id}:`, err)
        }
      }

      // Sort by date (newest first)
      allReports.sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp))
      setReports(allReports)
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      toast({
        title: "Error Loading Reports",
        description: "Could not fetch reports data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!generateConfig.clientId) {
      toast({
        title: "Client Required",
        description: "Please select a client to generate a report for.",
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    try {
      // Run audit first
      await api.client.runAudit(generateConfig.clientId)

      // Wait a moment for audit to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Refresh reports
      await fetchReportsData()

      toast({
        title: "Report Generated",
        description: `New ${generateConfig.type} report created successfully.`,
      })

      setShowGenerateModal(false)
      setGenerateConfig({ clientId: '', type: 'full', format: 'html' })
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message || "Could not generate report.",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setShowViewer(true)
  }

  const handleDownloadReport = async (report) => {
    try {
      // In a real implementation, this would download the actual report file
      toast({
        title: "Download Started",
        description: `Downloading ${report.type || 'report'} for ${report.clientName}`,
      })

      // Create a download link
      const reportData = JSON.stringify(report, null, 2)
      const blob = new Blob([reportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.clientId}-report-${new Date(report.date || report.timestamp).toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.clientDomain?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClient = clientFilter === 'all' || report.clientId === clientFilter
    const matchesType = typeFilter === 'all' || report.type === typeFilter

    return matchesSearch && matchesClient && matchesType
  })

  // Calculate stats
  const stats = {
    total: reports.length,
    thisWeek: reports.filter(r => {
      const date = new Date(r.date || r.timestamp)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date > weekAgo
    }).length,
    thisMonth: reports.filter(r => {
      const date = new Date(r.date || r.timestamp)
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return date > monthAgo
    }).length,
    clients: new Set(reports.map(r => r.clientId)).size
  }

  const getReportIcon = (report) => {
    if (report.status === 'success' || report.score > 70) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (report.status === 'warning' || report.score > 40) return <AlertCircle className="h-5 w-5 text-yellow-500" />
    if (report.status === 'processing') return <Clock className="h-5 w-5 text-blue-500" />
    return <FileText className="h-5 w-5 text-muted-foreground" />
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View and manage SEO audit reports
          </p>
        </div>

        <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Run an audit and generate a new report for a client
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client</label>
                <Select
                  value={generateConfig.clientId}
                  onValueChange={(value) => setGenerateConfig({ ...generateConfig, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name || client.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select
                  value={generateConfig.type}
                  onValueChange={(value) => setGenerateConfig({ ...generateConfig, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Audit</SelectItem>
                    <SelectItem value="quick">Quick Scan</SelectItem>
                    <SelectItem value="performance">Performance Only</SelectItem>
                    <SelectItem value="seo">SEO Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select
                  value={generateConfig.format}
                  onValueChange={(value) => setGenerateConfig({ ...generateConfig, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} disabled={generating}>
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">
              With reports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Client Filter */}
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name || client.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full">Full Audit</SelectItem>
                <SelectItem value="quick">Quick Scan</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports ({filteredReports.length})</CardTitle>
          <CardDescription>
            Click on a report to view details or download
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || clientFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Generate your first report to get started'}
              </p>
              <Button onClick={() => setShowGenerateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getReportIcon(report)}
                    <div>
                      <div className="font-medium">{report.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.clientDomain}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-medium">
                        {formatDate(report.date || report.timestamp)}
                      </div>
                      <Badge variant={report.type === 'full' ? 'default' : 'secondary'} className="text-xs">
                        {report.type || 'audit'}
                      </Badge>
                    </div>

                    {report.score !== undefined && (
                      <div className="text-right hidden lg:block">
                        <div className="text-2xl font-bold">{report.score}</div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport?.clientName} - {selectedReport?.date && formatDate(selectedReport.date)}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <p className="text-lg font-semibold">{selectedReport.clientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Domain</label>
                  <p className="text-lg">{selectedReport.clientDomain}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p>{formatDate(selectedReport.date || selectedReport.timestamp)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <Badge>{selectedReport.type || 'audit'}</Badge>
                </div>
              </div>

              {/* Report Content */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Report Summary</h3>
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(selectedReport, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowViewer(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownloadReport(selectedReport)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
