import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { autoFixAPI } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  RotateCcw,
  Calendar,
  CheckCircle,
  FileText,
  Image,
  Heading1,
  TrendingUp,
  Clock,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

export function AutoFixChangeHistory({ limit = 10 }) {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const { toast } = useToast()

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    changeType: 'all',
    dateFrom: null,
    dateTo: null,
    minChanges: 0
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [limit])

  useEffect(() => {
    applyFilters()
  }, [reports, filters])

  async function loadHistory() {
    try {
      setLoading(true)
      const response = await autoFixAPI.getChangeHistory({ limit })
      
      if (response.success && response.reports) {
        setReports(response.reports)
      }
    } catch (error) {
      console.error('Error loading auto-fix history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load auto-fix history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...reports]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(report => 
        JSON.stringify(report).toLowerCase().includes(searchLower)
      )
    }

    // Change type filter
    if (filters.changeType !== 'all') {
      filtered = filtered.filter(report => {
        const changes = report.changes || {}
        switch (filters.changeType) {
          case 'titles':
            return (changes.titles?.results?.changes?.length || 0) > 0
          case 'h1':
            return (changes.h1Tags?.results?.changes?.length || 0) > 0
          case 'images':
            return (changes.imageAlt?.results?.changes?.length || 0) > 0
          default:
            return true
        }
      })
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(report => 
        new Date(report.timestamp) >= filters.dateFrom
      )
    }

    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter(report => 
        new Date(report.timestamp) <= endOfDay
      )
    }

    // Minimum changes filter
    if (filters.minChanges > 0) {
      filtered = filtered.filter(report => 
        (report.summary?.totalChanges || 0) >= filters.minChanges
      )
    }

    setFilteredReports(filtered)
  }

  function clearFilters() {
    setFilters({
      search: '',
      changeType: 'all',
      dateFrom: null,
      dateTo: null,
      minChanges: 0
    })
  }

  function exportToCSV() {
    try {
      const headers = ['Date', 'Pages Analyzed', 'Total Changes', 'Title Changes', 'H1 Changes', 'Image Changes', 'Dry Run']
      const rows = filteredReports.map(report => {
        const titleChanges = report.changes?.titles?.results?.changes?.length || 0
        const h1Changes = report.changes?.h1Tags?.results?.changes?.length || 0
        const imageChanges = report.changes?.imageAlt?.results?.changes?.length || 0

        return [
          format(new Date(report.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          report.summary?.analyzed || 0,
          report.summary?.totalChanges || 0,
          titleChanges,
          h1Changes,
          imageChanges,
          report.dryRun ? 'Yes' : 'No'
        ]
      })

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `autofix-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: 'History exported to CSV',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  function exportToJSON() {
    try {
      const json = JSON.stringify(filteredReports, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `autofix-history-${format(new Date(), 'yyyy-MM-dd')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: 'History exported to JSON',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const stats = useMemo(() => {
    return {
      totalReports: filteredReports.length,
      totalChanges: filteredReports.reduce((sum, r) => sum + (r.summary?.totalChanges || 0), 0),
      totalAnalyzed: filteredReports.reduce((sum, r) => sum + (r.summary?.analyzed || 0), 0),
      avgChangesPerReport: filteredReports.length > 0
        ? (filteredReports.reduce((sum, r) => sum + (r.summary?.totalChanges || 0), 0) / filteredReports.length).toFixed(1)
        : 0
    }
  }, [filteredReports])

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.changeType !== 'all') count++
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.minChanges > 0) count++
    return count
  }, [filters])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Reports</div>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Changes</div>
            <div className="text-2xl font-bold">{stats.totalChanges}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pages Analyzed</div>
            <div className="text-2xl font-bold">{stats.totalAnalyzed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg Changes/Report</div>
            <div className="text-2xl font-bold">{stats.avgChangesPerReport}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Export Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search history..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>

              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
                )}
              </Button>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToJSON}>
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-sm">Change Type</Label>
                <Select 
                  value={filters.changeType} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, changeType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Changes</SelectItem>
                    <SelectItem value="titles">Title Changes</SelectItem>
                    <SelectItem value="h1">H1 Tag Fixes</SelectItem>
                    <SelectItem value="images">Image Alt Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, 'PP') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Min Changes</Label>
                <Input
                  type="number"
                  min="0"
                  value={filters.minChanges}
                  onChange={(e) => setFilters(prev => ({ ...prev, minChanges: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {reports.length === 0 ? (
              <>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No History Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-fix optimization history will appear here
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Results Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
              onRefresh={loadHistory}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, expanded, onToggle, onRefresh }) {
  const { toast } = useToast()
  const [reverting, setReverting] = useState(false)

  const titleChanges = report.changes?.titles?.results?.changes || []
  const h1Changes = report.changes?.h1Tags?.results?.changes || []
  const imageChanges = report.changes?.imageAlt?.results?.changes || []

  const totalChanges = report.summary?.totalChanges || 0
  const analyzed = report.summary?.analyzed || 0

  const timestamp = formatDistanceToNow(new Date(report.timestamp), {
    addSuffix: true
  })

  async function handleRevertAll() {
    if (!confirm('Are you sure you want to revert all changes from this optimization?')) {
      return
    }

    try {
      setReverting(true)
      const postIds = titleChanges.map(c => c.postId)
      
      // Extract backup ID from report data
      const backupId = report.backupId || `backup-pre-optimization-${report.timestamp}`
      
      const result = await autoFixAPI.revertChanges(
        report.clientId,
        backupId,
        postIds
      )

      if (result.success) {
        toast({
          title: 'Success',
          description: `Reverted ${result.count} changes`,
        })
        onRefresh()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revert changes',
        variant: 'destructive'
      })
    } finally {
      setReverting(false)
    }
  }

  async function handleExportReport() {
    try {
      const json = JSON.stringify(report, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `autofix-report-${report.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Export successful',
        description: 'Report exported',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">
                {new Date(report.timestamp).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {timestamp}
              </Badge>
            </div>
            
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {analyzed} pages analyzed
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {totalChanges} changes made
              </span>
              {report.dryRun && (
                <Badge variant="secondary">Dry Run</Badge>
              )}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
            >
              {expanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label="Title Changes"
              value={titleChanges.length}
              variant="blue"
            />
            <StatCard
              icon={<Heading1 className="h-5 w-5" />}
              label="H1 Tag Fixes"
              value={h1Changes.length}
              variant="green"
            />
            <StatCard
              icon={<Image className="h-5 w-5" />}
              label="Image Alt Text"
              value={imageChanges.length}
              variant="purple"
            />
          </div>

          <Separator />

          {/* Title Changes */}
          {titleChanges.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Title Optimizations ({titleChanges.length})
                </h3>
              </div>
              
              <div className="space-y-2">
                {titleChanges.map((change, idx) => (
                  <TitleChangeCard key={idx} change={change} />
                ))}
              </div>
            </div>
          )}

          {/* H1 Changes */}
          {h1Changes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Heading1 className="h-5 w-5" />
                H1 Tag Fixes ({h1Changes.length})
              </h3>
              
              <div className="space-y-2">
                {h1Changes.map((change, idx) => (
                  <ChangeCard key={idx} change={change} type="h1" />
                ))}
              </div>
            </div>
          )}

          {/* Image Changes */}
          {imageChanges.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Image className="h-5 w-5" />
                Image Alt Text ({imageChanges.length})
              </h3>
              
              <div className="space-y-2">
                {imageChanges.map((change, idx) => (
                  <ChangeCard key={idx} change={change} type="image" />
                ))}
              </div>
            </div>
          )}

          {/* No Changes */}
          {totalChanges === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>No changes needed - everything was already optimized!</p>
            </div>
          )}

          {/* Actions */}
          {totalChanges > 0 && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertAll}
                disabled={reverting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {reverting ? 'Reverting...' : 'Revert All Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function StatCard({ icon, label, value, variant = 'default' }) {
  const variantClasses = {
    blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
    green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
    purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
    default: ''
  }

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function TitleChangeCard({ change }) {
  const handleViewPage = () => {
    window.open(change.url, '_blank')
  }

  const lengthDiff = change.newLength - change.oldLength
  const lengthPercentage = ((lengthDiff / change.oldLength) * 100).toFixed(0)

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Post #{change.postId}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleViewPage}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Page
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium text-sm mt-1">Before:</span>
                <div className="flex-1">
                  <p className="text-sm line-through text-muted-foreground">
                    {change.oldTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {change.oldLength} characters
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-green-600 font-medium text-sm mt-1">After:</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {change.newTitle}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{change.newLength} characters</span>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {lengthDiff > 0 ? '+' : ''}{lengthPercentage}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              {change.url}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChangeCard({ change, type }) {
  const handleViewPage = () => {
    window.open(change.url, '_blank')
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Post #{change.postId}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={handleViewPage}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
            
            <p className="text-sm mb-1">
              {type === 'h1' ? 'H1 Tag' : 'Image Alt Text'} fixed
            </p>
            
            <p className="text-xs text-muted-foreground font-mono">
              {change.url}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AutoFixChangeHistory
