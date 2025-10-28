import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Upload,
  Grid3x3,
  List,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'

export function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [selectedClients, setSelectedClients] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [currentClient, setCurrentClient] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    inactive: 0
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const response = await api.client.getAll()

      if (response.success) {
        const transformedClients = (response.clients || []).map(client => ({
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

        setClients(transformedClients)
        setStats(response.stats || stats)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddClient = async (clientData) => {
    try {
      // TODO: Implement when backend endpoint is ready
      toast({
        title: "Feature Coming Soon",
        description: "Client creation will be available in the next update"
      })
      setShowAddModal(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add client",
        variant: "destructive"
      })
    }
  }

  const handleEditClient = async (clientData) => {
    try {
      // TODO: Implement when backend endpoint is ready
      toast({
        title: "Feature Coming Soon",
        description: "Client editing will be available in the next update"
      })
      setShowEditModal(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive"
      })
    }
  }

  const handleDeleteClient = async () => {
    try {
      // TODO: Implement when backend endpoint is ready
      toast({
        title: "Feature Coming Soon",
        description: "Client deletion will be available in the next update"
      })
      setShowDeleteModal(false)
      setCurrentClient(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      })
    }
  }

  const handleBulkAudit = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No Clients Selected",
        description: "Please select clients to audit"
      })
      return
    }

    try {
      toast({
        title: "Starting Audits",
        description: `Running audits for ${selectedClients.length} clients...`
      })

      // Run audits for each selected client
      const promises = selectedClients.map(id => api.client.runAudit(id))
      await Promise.all(promises)

      toast({
        title: "Audits Complete",
        description: `Successfully audited ${selectedClients.length} clients`
      })

      setSelectedClients([])
      fetchClients()
    } catch (error) {
      toast({
        title: "Error",
        description: "Some audits failed. Check individual client status.",
        variant: "destructive"
      })
    }
  }

  const handleBulkOptimize = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "No Clients Selected",
        description: "Please select clients to optimize"
      })
      return
    }

    try {
      const result = await api.batch.optimizeAll()
      toast({
        title: "Optimization Started",
        description: result.success ? "Batch optimization in progress" : "Failed to start optimization",
        variant: result.success ? "default" : "destructive"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to optimize clients",
        variant: "destructive"
      })
    }
  }

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(c => c.id))
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.domain.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      pending: 'warning',
      inactive: 'secondary',
      error: 'destructive'
    }
    return variants[status] || 'secondary'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'error': return <XCircle className="h-4 w-4" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your SEO clients and campaigns
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending || stats.needsSetup || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedClients.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status: {statusFilter === 'all' ? 'All' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    All Clients
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                    Active Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    Pending Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                    Inactive Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Bulk Actions */}
              {selectedClients.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions ({selectedClients.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk Operations</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBulkAudit}>
                      <Play className="h-4 w-4 mr-2" />
                      Run Audits
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkOptimize}>
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Optimize All
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className={`cursor-pointer transition-all ${
                selectedClients.includes(client.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client.id)}
                        onChange={() => toggleClientSelection(client.id)}
                        className="rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      {client.domain}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setCurrentClient(client)
                        setShowEditModal(true)
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => api.client.runAudit(client.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Run Audit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => api.client.testAuth(client.id)}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setCurrentClient(client)
                          setShowDeleteModal(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getStatusBadge(client.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(client.status)}
                        {client.status}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Package</span>
                    <span className="text-sm font-medium capitalize">{client.package}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Keywords</span>
                    <span className="text-sm font-medium">{client.keywords}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Rank</span>
                    <span className="text-sm font-medium">
                      {client.avgRank > 0 ? `#${client.avgRank}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Audit</span>
                    <span className="text-sm font-medium">{client.lastAudit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-3">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Domain</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Package</th>
                    <th className="text-left p-3 font-medium">Keywords</th>
                    <th className="text-left p-3 font-medium">Avg Rank</th>
                    <th className="text-left p-3 font-medium">Last Audit</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={() => toggleClientSelection(client.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-medium">{client.name}</td>
                      <td className="p-3 text-muted-foreground">{client.domain}</td>
                      <td className="p-3">
                        <Badge variant={getStatusBadge(client.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(client.status)}
                            {client.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-3 capitalize">{client.package}</td>
                      <td className="p-3">{client.keywords}</td>
                      <td className="p-3">{client.avgRank > 0 ? `#${client.avgRank}` : 'N/A'}</td>
                      <td className="p-3">{client.lastAudit}</td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setCurrentClient(client)
                              setShowEditModal(true)
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => api.client.runAudit(client.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Run Audit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => api.client.testAuth(client.id)}>
                              <TestTube className="h-4 w-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setCurrentClient(client)
                                setShowDeleteModal(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'No clients match your filters'
                  : 'No clients yet'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit/Delete Modals would go here */}
      {/* For now, showing placeholders that will be implemented when backend is ready */}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Client creation form will be available in the next update.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentClient?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClient}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
