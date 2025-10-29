import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { clientAPI, batchAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { useDebounce } from '@/hooks/useDebounce'

import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Settings as SettingsIcon,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Grid3x3,
  List,
  Loader2
} from 'lucide-react'

export default function ClientsPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedClients, setSelectedClients] = useState([])

  const debouncedSearch = useDebounce(searchTerm, 300)

  // API Requests
  const { data: clientsData, loading, refetch } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { execute: runAudit, loading: auditing } = useAPIRequest()
  const { execute: runOptimization, loading: optimizing } = useAPIRequest()
  const { execute: bulkAudit, loading: bulkAuditing } = useAPIRequest()

  const clients = clientsData?.clients || []
  const stats = clientsData?.stats || { total: 0, active: 0, pending: 0, inactive: 0 }

  // Filter and transform clients
  const filteredClients = useMemo(() => {
    return clients
      .map(client => ({
        id: client.id,
        name: client.name || client.id,
        domain: client.domain || client.url || '',
        email: client.contact || '',
        status: client.envConfigured ? 'active' : (client.status || 'pending'),
        package: client.package || 'basic',
        keywords: client.totalKeywords || 0,
        avgRank: client.avgPosition || 0,
        lastAudit: client.lastAudit || 'Never',
        reports: client.reportCount || 0
      }))
      .filter(client => {
        const matchesSearch = client.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                             client.domain.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchesStatus = statusFilter === 'all' || client.status === statusFilter
        return matchesSearch && matchesStatus
      })
  }, [clients, debouncedSearch, statusFilter])

  const handleRunAudit = useCallback(async (clientId) => {
    await runAudit(
      () => clientAPI.runAudit(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Audit started successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [runAudit, refetch])

  const handleRunOptimization = useCallback(async (clientId) => {
    await runOptimization(
      () => clientAPI.runOptimization(clientId),
      {
        showSuccessToast: true,
        successMessage: 'Optimization started successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [runOptimization, refetch])

  const handleBulkAudit = useCallback(async () => {
    if (selectedClients.length === 0) {
      toast({
        title: 'No Clients Selected',
        description: 'Please select clients to audit',
        variant: 'destructive'
      })
      return
    }

    await bulkAudit(
      () => batchAPI.auditAll(),
      {
        showSuccessToast: true,
        successMessage: `Audit started for ${selectedClients.length} clients`,
        onSuccess: () => {
          setSelectedClients([])
          refetch()
        }
      }
    )
  }, [selectedClients, bulkAudit, refetch, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading clients...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage all your SEO clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm w-[150px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            {selectedClients.length > 0 && (
              <Button onClick={handleBulkAudit} disabled={bulkAuditing}>
                <Play className="h-4 w-4 mr-2" />
                Audit Selected ({selectedClients.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid/List */}
      <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
        {filteredClients.map(client => (
          <Card key={client.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <CardDescription>{client.domain}</CardDescription>
                </div>
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Keywords</p>
                  <p className="font-medium">{client.keywords}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Rank</p>
                  <p className="font-medium">{client.avgRank || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleRunAudit(client.id)} disabled={auditing}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRunOptimization(client.id)} disabled={optimizing}>
                  <Settings SettingsIcon className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
