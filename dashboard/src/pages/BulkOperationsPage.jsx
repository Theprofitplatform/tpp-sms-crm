import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

import { clientAPI, batchAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

import {
  Zap,
  CheckCircle2,
  Users,
  FileText,
  Mail,
  Play,
  Square,
  AlertTriangle,
  Loader2
} from 'lucide-react'

export default function BulkOperationsPage() {
  const { toast } = useToast()
  const [selectedClients, setSelectedClients] = useState([])
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState(false)

  // API Requests
  const { data: clientsData, loading, refetch } = useAPIData(
    () => clientAPI.getAll(),
    { autoFetch: true }
  )

  const { execute: runBulkOperation } = useAPIRequest()

  const clients = clientsData?.clients || []

  const handleSelectAll = useCallback(() => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }, [clients, selectedClients])

  const handleToggleClient = useCallback((clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }, [])

  const handleBulkOperation = useCallback(async (operation) => {
    if (selectedClients.length === 0) {
      toast({
        title: 'No Clients Selected',
        description: 'Please select at least one client',
        variant: 'destructive'
      })
      return
    }

    setRunning(true)
    setProgress(0)

    try {
      for (let i = 0; i < selectedClients.length; i++) {
        const clientId = selectedClients[i]
        
        if (operation === 'audit') {
          await clientAPI.runAudit(clientId)
        } else if (operation === 'optimize') {
          await clientAPI.runOptimization(clientId)
        }
        
        setProgress(((i + 1) / selectedClients.length) * 100)
      }

      toast({
        title: 'Operation Complete',
        description: `Successfully processed ${selectedClients.length} clients`
      })
      
      refetch()
    } catch (err) {
      toast({
        title: 'Operation Failed',
        description: err.message || 'Some operations failed',
        variant: 'destructive'
      })
    } finally {
      setRunning(false)
      setProgress(0)
      setSelectedClients([])
    }
  }, [selectedClients, refetch, toast])

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          Bulk Operations Center
        </h1>
        <p className="text-muted-foreground">
          Perform actions on multiple clients at once
        </p>
      </div>

      {/* Progress Bar */}
      {running && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Audit</CardTitle>
            <CardDescription>Run SEO audits on selected clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleBulkOperation('audit')}
              disabled={selectedClients.length === 0 || running}
            >
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Run Audits
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Optimize</CardTitle>
            <CardDescription>Optimize content for all selected clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleBulkOperation('optimize')}
              disabled={selectedClients.length === 0 || running}
            >
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Optimize All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bulk Email</CardTitle>
            <CardDescription>Send reports to selected clients</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => handleBulkOperation('send-report')}
              disabled={selectedClients.length === 0 || running}
            >
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Clients</CardTitle>
              <CardDescription>Choose which clients to perform operations on</CardDescription>
            </div>
            <Button variant="outline" onClick={handleSelectAll}>
              {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Select</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keywords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => handleToggleClient(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name || client.id}</TableCell>
                  <TableCell>{client.domain || client.url}</TableCell>
                  <TableCell>
                    <Badge variant={client.envConfigured ? 'default' : 'secondary'}>
                      {client.envConfigured ? 'Active' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.totalKeywords || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{selectedClients.length} clients selected</span>
            </div>
            {selectedClients.length > 0 && (
              <Badge variant="secondary">Ready for bulk operations</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
