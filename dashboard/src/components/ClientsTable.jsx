import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, Play, Pause, Settings } from 'lucide-react'

export function ClientsTable({ clients = [], onClientClick }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.domain?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status) => {
    const variants = {
      configured: 'success',
      active: 'success',
      pending: 'warning',
      inactive: 'secondary',
      error: 'destructive'
    }
    return variants[status] || 'secondary'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Manage your SEO clients and campaigns</CardDescription>
          </div>
          <Button>Add Client</Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Domain</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Keywords</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Avg Rank</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-muted-foreground">
                    No clients found
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onClientClick && onClientClick(client.id || idx)}
                  >
                    <td className="p-3 font-medium">{client.name}</td>
                    <td className="p-3 text-muted-foreground">{client.domain}</td>
                    <td className="p-3">
                      <Badge variant={getStatusBadge(client.status)}>
                        {client.status}
                      </Badge>
                    </td>
                    <td className="p-3">{client.keywords || 0}</td>
                    <td className="p-3">{client.avgRank ? `#${client.avgRank}` : '--'}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onClientClick && onClientClick(client.id || idx)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Play className="h-4 w-4 mr-2" />
                            Run Audit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
