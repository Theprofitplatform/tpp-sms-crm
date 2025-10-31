import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X, Download } from 'lucide-react'

export default function OptimizationFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  clientFilter,
  setClientFilter,
  improvementFilter,
  setImprovementFilter,
  clients,
  onExportCSV,
  onExportJSON,
  onClearFilters
}) {
  const hasFilters = searchQuery || statusFilter !== 'all' || clientFilter !== 'all' || improvementFilter > 0

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rolled_back">Rolled Back</SelectItem>
          </SelectContent>
        </Select>

        {/* Client Filter */}
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Improvement Filter */}
        <Select 
          value={String(improvementFilter)} 
          onValueChange={(val) => setImprovementFilter(Number(val))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Min improvement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any Improvement</SelectItem>
            <SelectItem value="10">10%+ improvement</SelectItem>
            <SelectItem value="20">20%+ improvement</SelectItem>
            <SelectItem value="30">30%+ improvement</SelectItem>
            <SelectItem value="50">50%+ improvement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {hasFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportCSV}
            className="h-8"
          >
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExportJSON}
            className="h-8"
          >
            <Download className="h-3 w-3 mr-1" />
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  )
}
