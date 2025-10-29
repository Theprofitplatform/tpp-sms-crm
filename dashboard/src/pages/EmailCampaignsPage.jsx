import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Mail,
  Send,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  Copy,
  Zap,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { emailAPI } from '@/services/api'
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest'

export default function EmailCampaignsPage() {
  const { toast } = useToast()
  
  // State
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    subject: '',
    template: '',
    recipients: 'all',
    scheduleType: 'now',
    scheduleDate: ''
  })
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: ''
  })

  // API Requests
  const { data: campaigns, loading: loadingCampaigns, refetch: refetchCampaigns } = useAPIData(
    () => emailAPI.getCampaigns(),
    { autoFetch: true, initialData: [] }
  )

  const { data: templates, loading: loadingTemplates, refetch: refetchTemplates } = useAPIData(
    () => emailAPI.getTemplates(),
    { autoFetch: true, initialData: [] }
  )

  const { execute: createCampaign, loading: creatingCampaign } = useAPIRequest()
  const { execute: sendCampaign, loading: sendingCampaign } = useAPIRequest()
  const { execute: deleteCampaignRequest } = useAPIRequest()

  const loading = loadingCampaigns || loadingTemplates

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.subject) {
      toast({
        title: "Missing Information",
        description: "Please fill in campaign name and subject.",
        variant: "destructive"
      })
      return
    }

    const campaign = {
      id: `camp-${Date.now()}`,
      ...newCampaign,
      recipientCount: 0,
      status: 'draft',
      stats: {
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0
      },
      createdAt: new Date()
    }

    setCampaigns([...campaigns, campaign])
    setShowNewCampaignModal(false)
    setNewCampaign({
      name: '',
      subject: '',
      template: '',
      recipients: 'all',
      scheduleType: 'now',
      scheduleDate: ''
    })

    toast({
      title: "Campaign Created",
      description: `${campaign.name} has been created as a draft.`,
    })
  }

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject) {
      toast({
        title: "Missing Information",
        description: "Please fill in template name and subject.",
        variant: "destructive"
      })
      return
    }

    const template = {
      id: `template-${Date.now()}`,
      ...newTemplate,
      category: 'custom',
      variables: [],
      createdAt: new Date()
    }

    setTemplates([...templates, template])
    setShowNewTemplateModal(false)
    setNewTemplate({
      name: '',
      subject: '',
      content: ''
    })

    toast({
      title: "Template Created",
      description: `${template.name} template has been created.`,
    })
  }

  const handleSendCampaign = (campaignId) => {
    setCampaigns(campaigns.map(camp =>
      camp.id === campaignId
        ? { ...camp, status: 'sent', lastSent: new Date() }
        : camp
    ))
    toast({
      title: "Campaign Sent",
      description: "Email campaign has been sent successfully.",
    })
  }

  const handleDeleteCampaign = (campaignId) => {
    setCampaigns(campaigns.filter(c => c.id !== campaignId))
    toast({
      title: "Campaign Deleted",
      description: "The campaign has been removed.",
      variant: "destructive"
    })
  }

  const handleDuplicateCampaign = (campaign) => {
    const duplicate = {
      ...campaign,
      id: `camp-${Date.now()}`,
      name: `${campaign.name} (Copy)`,
      status: 'draft',
      stats: {
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0
      },
      createdAt: new Date()
    }
    setCampaigns([...campaigns, duplicate])
    toast({
      title: "Campaign Duplicated",
      description: `Created a copy of ${campaign.name}.`,
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'default'
      case 'scheduled':
        return 'secondary'
      case 'active':
        return 'default'
      case 'draft':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const calculateOpenRate = (stats) => {
    if (stats.sent === 0) return 0
    return Math.round((stats.opened / stats.sent) * 100)
  }

  const calculateClickRate = (stats) => {
    if (stats.opened === 0) return 0
    return Math.round((stats.clicked / stats.opened) * 100)
  }

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active' || c.status === 'scheduled').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.stats.sent, 0),
    avgOpenRate: campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + calculateOpenRate(c.stats), 0) / campaigns.length)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground">Loading campaigns...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-muted-foreground">
            Manage automated email campaigns and templates
          </p>
        </div>

        <Dialog open={showNewCampaignModal} onOpenChange={setShowNewCampaignModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Set up a new email campaign for your clients
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  placeholder="e.g., Monthly Performance Report"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Subject *</Label>
                <Input
                  placeholder="e.g., Your SEO Report for {{month}}"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={newCampaign.template}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, template: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select
                    value={newCampaign.recipients}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, recipients: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="active-clients">Active Clients</SelectItem>
                      <SelectItem value="new-clients">New Clients</SelectItem>
                      <SelectItem value="clients-with-issues">Clients with Issues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select
                    value={newCampaign.scheduleType}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, scheduleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="now">Send Now</SelectItem>
                      <SelectItem value="scheduled">Schedule</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                      <SelectItem value="triggered">Triggered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newCampaign.scheduleType === 'scheduled' && (
                <div className="space-y-2">
                  <Label>Schedule Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newCampaign.scheduleDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scheduleDate: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewCampaignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Running campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent}</div>
            <p className="text-xs text-muted-foreground">
              Total delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email campaign to get started
                </p>
                <Button onClick={() => setShowNewCampaignModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {campaigns.map(campaign => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{campaign.name}</CardTitle>
                          <Badge variant={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                          {campaign.scheduleType === 'recurring' && (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {campaign.frequency}
                            </Badge>
                          )}
                          {campaign.scheduleType === 'triggered' && (
                            <Badge variant="outline">
                              <Zap className="h-3 w-3 mr-1" />
                              Automated
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{campaign.subject}</CardDescription>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {campaign.recipientCount} recipients
                          </span>
                          {campaign.lastSent && (
                            <span>Last sent: {new Date(campaign.lastSent).toLocaleDateString()}</span>
                          )}
                          {campaign.nextSend && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Next: {new Date(campaign.nextSend).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateCampaign(campaign)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {campaign.stats.sent > 0 && (
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Sent</p>
                          <p className="text-2xl font-bold">{campaign.stats.sent}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Opened</p>
                          <p className="text-2xl font-bold">{campaign.stats.opened}</p>
                          <Badge variant="secondary" className="mt-1">
                            {calculateOpenRate(campaign.stats)}%
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clicked</p>
                          <p className="text-2xl font-bold">{campaign.stats.clicked}</p>
                          <Badge variant="secondary" className="mt-1">
                            {calculateClickRate(campaign.stats)}%
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bounced</p>
                          <p className="text-2xl font-bold">{campaign.stats.bounced}</p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showNewTemplateModal} onOpenChange={setShowNewTemplateModal}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable email template
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input
                      placeholder="e.g., Weekly Report"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Line *</Label>
                    <Input
                      placeholder="Use {{variables}} for dynamic content"
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Content (HTML)</Label>
                    <textarea
                      className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                      placeholder="Enter HTML content with {{variables}}"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available variables: client_name, dashboard_link, report_link
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewTemplateModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Create Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map(template => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.subject}</CardDescription>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {template.category}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    <p className="mb-1">Variables: {template.variables.join(', ')}</p>
                    <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedCampaign.name}</DialogTitle>
              <DialogDescription>Campaign details and performance</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="font-medium">{selectedCampaign.status}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Schedule Type</Label>
                  <p className="font-medium capitalize">{selectedCampaign.scheduleType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Recipients</Label>
                  <p className="font-medium">{selectedCampaign.recipientCount}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Open Rate</Label>
                  <p className="font-medium">{calculateOpenRate(selectedCampaign.stats)}%</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="font-medium">{selectedCampaign.subject}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
