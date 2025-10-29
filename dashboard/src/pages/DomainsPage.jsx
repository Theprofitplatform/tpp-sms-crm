import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { domainsAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'
import { VALIDATION_PATTERNS } from '@/constants'

import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  TrendingUp,
  Target,
  Loader2,
  Eye
} from 'lucide-react'

export default function DomainsPage() {
  const { toast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDomain, setNewDomain] = useState({
    domain: '',
    displayName: '',
    description: '',
    active: true
  })
  const [errors, setErrors] = useState({})

  // API Requests
  const { data: domains, loading, refetch } = useAPIData(
    () => domainsAPI.getAll(),
    { autoFetch: true, initialData: [] }
  )

  const { execute: createDomain, loading: creating } = useAPIRequest()
  const { execute: updateDomain, loading: updating } = useAPIRequest()
  const { execute: deleteDomain, loading: deleting } = useAPIRequest()
  const { execute: toggleDomain } = useAPIRequest()

  const stats = useMemo(() => {
    return {
      total: domains.length,
      active: domains.filter(d => d.active).length,
      inactive: domains.filter(d => !d.active).length
    }
  }, [domains])

  const validateDomain = useCallback(() => {
    const newErrors = {}

    if (!newDomain.domain.trim()) {
      newErrors.domain = 'Domain is required'
    } else if (!VALIDATION_PATTERNS.DOMAIN.test(newDomain.domain)) {
      newErrors.domain = 'Invalid domain format'
    }

    if (!newDomain.displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [newDomain])

  const handleCreateDomain = useCallback(async () => {
    if (!validateDomain()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive'
      })
      return
    }

    await createDomain(
      () => domainsAPI.create(newDomain),
      {
        showSuccessToast: true,
        successMessage: 'Domain added successfully',
        onSuccess: () => {
          setShowAddModal(false)
          setNewDomain({ domain: '', displayName: '', description: '', active: true })
          setErrors({})
          refetch()
        }
      }
    )
  }, [newDomain, createDomain, validateDomain, refetch, toast])

  const handleToggleDomain = useCallback(async (domainId, active) => {
    await toggleDomain(
      () => domainsAPI.toggleActive(domainId, active),
      {
        showSuccessToast: true,
        successMessage: `Domain ${active ? 'activated' : 'deactivated'}`,
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [toggleDomain, refetch])

  const handleDeleteDomain = useCallback(async (domainId) => {
    if (!confirm('Are you sure you want to delete this domain?')) return

    await deleteDomain(
      () => domainsAPI.delete(domainId),
      {
        showSuccessToast: true,
        successMessage: 'Domain deleted successfully',
        onSuccess: () => {
          refetch()
        }
      }
    )
  }, [deleteDomain, refetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading domains...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Domain Management
          </h1>
          <p className="text-muted-foreground">
            Manage and track your domains
          </p>
        </div>

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Add a new domain to track
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain.domain}
                  onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  aria-invalid={!!errors.domain}
                />
                {errors.domain && <p className="text-sm text-red-500">{errors.domain}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name *</Label>
                <Input
                  id="display-name"
                  placeholder="My Website"
                  value={newDomain.displayName}
                  onChange={(e) => setNewDomain({ ...newDomain, displayName: e.target.value })}
                  aria-invalid={!!errors.displayName}
                />
                {errors.displayName && <p className="text-sm text-red-500">{errors.displayName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description..."
                  value={newDomain.description}
                  onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newDomain.active}
                  onCheckedChange={(checked) => setNewDomain({ ...newDomain, active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDomain} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Domain
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domains</CardTitle>
          <CardDescription>All tracked domains</CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Domains Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to start tracking
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map(domain => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <a
                        href={`https://${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {domain.domain}
                      </a>
                    </TableCell>
                    <TableCell>{domain.displayName || domain.domain}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {domain.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={domain.active}
                          onCheckedChange={(checked) => handleToggleDomain(domain.id, checked)}
                        />
                        <Badge variant={domain.active ? 'default' : 'secondary'}>
                          {domain.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDomain(domain.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
