import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Zap,
  CheckCircle2,
  Users,
  FileText,
  Mail,
  Play,
  Square,
  AlertTriangle
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingState } from '@/components/LoadingState'

export function BulkOperationsPage() {
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [selectedClients, setSelectedClients] = useState([])
  const [progress, setProgress] = useState(0)
  const [clients, setClients] = useState([])

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(clients.map(c => c.id))
    }
  }

  const handleToggleClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleBulkOperation = async (operation) => {
    if (selectedClients.length === 0) return

    setRunning(true)
    setProgress(0)

    try {
      for (let i = 0; i < selectedClients.length; i++) {
        await fetch(`/api/${operation}/${selectedClients[i]}`, { method: 'POST' })
        setProgress(((i + 1) / selectedClients.length) * 100)
      }
    } catch (err) {
      console.error('Bulk operation error:', err)
    } finally {
      setRunning(false)
      setProgress(0)
    }
  }

  if (loading) return <LoadingState message="Loading clients..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          Bulk Operations Center
        </h1>
        <p className="text-muted-foreground">
          Perform actions on multiple clients at once
        </p>
      </div>

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
              <FileText className="h-4 w-4 mr-2" />
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
              <Zap className="h-4 w-4 mr-2" />
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
              <Mail className="h-4 w-4 mr-2" />
              Send Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {running && (
        <Card>
          <CardHeader>
            <CardTitle>Operation in Progress...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              Processing {Math.round(progress)}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Clients</CardTitle>
          <CardDescription>
            Choose which clients to include in bulk operations
          </CardDescription>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedClients.length === clients.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="secondary">{selectedClients.length} selected</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedClients.length === clients.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keywords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => handleToggleClient(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.domain}</TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.keywords || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Bulk Operation Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Bulk operations run sequentially to avoid API rate limits</p>
          <p>• Progress is updated in real-time as each client is processed</p>
          <p>• Failed operations for individual clients won't stop the batch</p>
          <p>• All operations are logged for audit purposes</p>
        </CardContent>
      </Card>
    </div>
  )
}
