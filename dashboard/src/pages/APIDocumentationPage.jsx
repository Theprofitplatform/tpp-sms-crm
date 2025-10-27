import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Code,
  Book,
  Key,
  Terminal,
  Copy,
  CheckCircle2
} from 'lucide-react'

export function APIDocumentationPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState(null)

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(id)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const endpoints = {
    keywords: [
      { method: 'GET', path: '/api/v2/keywords', description: 'List all keywords' },
      { method: 'POST', path: '/api/v2/keywords', description: 'Add new keyword' },
      { method: 'GET', path: '/api/v2/keywords/:id', description: 'Get keyword details' },
      { method: 'PUT', path: '/api/v2/keywords/:id', description: 'Update keyword' },
      { method: 'DELETE', path: '/api/v2/keywords/:id', description: 'Delete keyword' },
    ],
    research: [
      { method: 'POST', path: '/api/v2/research/projects', description: 'Create research project' },
      { method: 'GET', path: '/api/v2/research/projects', description: 'List projects' },
      { method: 'GET', path: '/api/v2/research/projects/:id', description: 'Get project details' },
    ],
    sync: [
      { method: 'GET', path: '/api/v2/sync/status', description: 'Get sync status' },
      { method: 'POST', path: '/api/v2/sync/trigger', description: 'Trigger sync' },
    ]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Code className="h-8 w-8 text-primary" />
          API Documentation
        </h1>
        <p className="text-muted-foreground">
          Complete API reference for developers
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Base URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded font-mono text-sm">
                http://localhost:3000
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard('http://localhost:3000', 'base-url')}
              >
                {copiedEndpoint === 'base-url' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Authentication</p>
            <p className="text-sm text-muted-foreground">
              Use JWT token in Authorization header: <code className="bg-muted px-1 rounded">Bearer YOUR_TOKEN</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
          <TabsTrigger value="sync">Sync</TabsTrigger>
        </TabsList>

        {Object.entries(endpoints).map(([category, categoryEndpoints]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {categoryEndpoints.map((endpoint, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Example Request</p>
                    <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                      <pre>{`curl -X ${endpoint.method} \\
  http://localhost:3000${endpoint.path} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• 1000 requests per hour per IP address</p>
          <p>• 100 requests per minute per endpoint</p>
          <p>• Rate limit headers included in all responses</p>
        </CardContent>
      </Card>
    </div>
  )
}
