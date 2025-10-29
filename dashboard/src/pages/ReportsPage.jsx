import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

import { clientAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { useDebounce } from '@/hooks/useDebounce'

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
  Clock,
  Loader2
} from 'lucide-react'

export default function ReportsPage() {
  const { toast } = useToast()
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

  const debouncedSearch = useDebounce(searchTerm, 300)

  // API Requests
  const { data: clientsData, loading: loadingClients } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { data: reportsData, loading: loadingReports, refetch } = useAPIData(
    () => clientAPI.getAllReports(),
    { autoFetch: true }
  )

  const { execute: generateReport, loading: generating } = useAPIRequest()

  const clients = clientsData?.clients || []
  const allReports = reportsData?.reports || []
  const loading = loadingClients || loadingReports

  // Filter reports
  const filteredReports = useMemo(() => {
    return allReports.filter(report => {
      const matchesSearch = report.clientName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           report.clientDomain?.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchesClient = clientFilter === 'all' || report.clientId === clientFilter
      const matchesType = typeFilter === 'all' || report.type === typeFilter
      return matchesSearch && matchesClient && matchesType
    })
  }, [allReports, debouncedSearch, clientFilter, typeFilter])

  const handleGenerateReport = useCallback(async () => {
    if (!generateConfig.clientId) {
      toast({
        title: 'Client Required',
        description: 'Please select a client to generate a report for.',
        variant: 'destructive'
      })
      return
    }

    await generateReport(
      () => clientAPI.runAudit(generateConfig.clientId),
      {
        showSuccessToast: true,
        successMessage: `New ${generateConfig.type} report generated successfully`,
        onSuccess: () => {
          setShowGenerateModal(false)
          setGenerateConfig({ clientId: '', type: 'full', format: 'html' })
          refetch()
        }
      }
    )
  }, [generateConfig, generateReport, refetch, toast])

  const handleViewReport = useCallback((report) => {
    setSelectedReport(report)
    setShowViewer(true)
  }, [])

  const handleDownloadReport = useCallback((report) => {
    toast({
      title: 'Download Started',
      description: 'Downloading report...'
    })
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading reports...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Reports
          </h1>
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
              <DialogDescription>Create a new SEO audit report for a client</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Client</label>
                <Select value={generateConfig.clientId} onValueChange={(v) => setGenerateConfig({...generateConfig, clientId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name || client.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Report Type</label>
                <Select value={generateConfig.type} onValueChange={(v) => setGenerateConfig({...generateConfig, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Audit</SelectItem>
                    <SelectItem value="quick">Quick Scan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateReport} disabled={generating} className="w-full">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name || client.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">Start by generating a report</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{report.clientName}</h3>
                    <p className="text-sm text-muted-foreground">{report.clientDomain}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(report.date || report.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewReport(report)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadReport(report)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
