import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Settings, Bell, Mail, Key, Database, Palette } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your platform configuration and preferences
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Database className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>
                Manage your SEO automation platform settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform Name</label>
                <Input defaultValue="SEO Automation Platform" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Email</label>
                <Input type="email" defaultValue="admin@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Language</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>America/Los_Angeles</option>
                  <option>Europe/London</option>
                </select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure automation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-run Audits</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically run SEO audits weekly
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rank Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Check rankings daily for all clients
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-fix Issues</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically fix common SEO issues
                  </p>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose which emails you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: 'Audit Completed', description: 'When an SEO audit finishes' },
                { title: 'Ranking Changes', description: 'When keyword rankings change significantly' },
                { title: 'New Issues Found', description: 'When new SEO issues are detected' },
                { title: 'Campaign Updates', description: 'Weekly campaign performance reports' },
                { title: 'System Alerts', description: 'Important system notifications' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
              ))}
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>
                Manage your third-party integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Google Search Console', status: 'Connected', icon: '🔍' },
                { name: 'Google Analytics', status: 'Connected', icon: '📊' },
                { name: 'Ahrefs API', status: 'Not Connected', icon: '🔗' },
                { name: 'SEMrush', status: 'Not Connected', icon: '📈' },
                { name: 'Slack', status: 'Connected', icon: '💬' },
              ].map((service, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{service.icon}</span>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <Badge variant={service.status === 'Connected' ? 'success' : 'secondary'}>
                        {service.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    {service.status === 'Connected' ? 'Configure' : 'Connect'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API access keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input type="password" value="sk_live_xxxxxxxxxxxxxxxx" readOnly />
                  <Button variant="outline">Copy</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <Input defaultValue="https://api.example.com/webhooks" />
              </div>
              <div className="flex gap-2">
                <Button>Regenerate Key</Button>
                <Button variant="outline">View Documentation</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>
                Current API usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Requests this month</span>
                  <span className="font-medium">1,247 / 10,000</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[12%]"></div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Need higher limits?
                </p>
                <Button variant="outline" size="sm">Upgrade Plan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Preferences</CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme Mode</label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Light</Button>
                  <Button variant="outline" size="sm">Dark</Button>
                  <Button variant="default" size="sm">System</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2">
                  {['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500'].map((color, idx) => (
                    <button
                      key={idx}
                      className={`h-10 w-10 rounded-md ${color} border-2 ${idx === 0 ? 'border-foreground' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sidebar Position</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option>Left</option>
                  <option>Right</option>
                </select>
              </div>
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
