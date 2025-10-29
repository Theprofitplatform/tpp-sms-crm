import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Target,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Smartphone,
  Monitor,
  Search,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { trackingKeywordsAPI, domainsAPI } from '@/services/api';
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest';

export default function KeywordsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [newKeyword, setNewKeyword] = useState({
    domain_id: '',
    keyword: '',
    device: 'desktop',
    country: 'US',
    search_volume: 0,
    notes: ''
  });

  // API Requests
  const { data: domainsData, loading: loadingDomains } = useAPIData(
    () => domainsAPI.getAll(),
    { autoFetch: true }
  );

  const { data: keywordsData, loading: loadingKeywords, refetch } = useAPIData(
    () => selectedDomain ? trackingKeywordsAPI.getByDomain(selectedDomain, 1000) : trackingKeywordsAPI.getAll(1000),
    { autoFetch: true }
  );

  const { execute: addKeyword, loading: adding } = useAPIRequest();
  const { execute: deleteKeyword, loading: deleting } = useAPIRequest();

  const domains = domainsData?.domains?.filter(d => d.active) || [];
  const keywords = keywordsData?.keywords || [];
  const loading = loadingDomains || loadingKeywords;

  const handleDomainChange = useCallback((domainId) => {
    setSelectedDomain(domainId);
    refetch();
  }, [refetch]);

  const handleBulkAdd = useCallback(async () => {
    if (!newKeyword.domain_id || !bulkKeywords.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Domain and keywords are required',
        variant: 'destructive'
      });
      return;
    }

    const keywordList = bulkKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k);

    await addKeyword(
      () => trackingKeywordsAPI.bulkAdd(newKeyword.domain_id, keywordList, newKeyword.device, newKeyword.country),
      {
        showSuccessToast: true,
        successMessage: `Added keywords successfully`,
        onSuccess: (data) => {
          toast({
            title: 'Success',
            description: `Added ${data.added} keywords${data.total - data.added > 0 ? ` (${data.total - data.added} duplicates skipped)` : ''}`
          });
          setIsAddDialogOpen(false);
          setBulkKeywords('');
          refetch();
        }
      }
    );
  }, [newKeyword, bulkKeywords, addKeyword, refetch, toast]);

  const handleRefreshKeyword = useCallback(async (keywordId) => {
    await addKeyword(
      () => trackingKeywordsAPI.refresh(keywordId),
      {
        showSuccessToast: true,
        successMessage: 'Position refresh started',
        onSuccess: () => {
          // Reload keywords after 10 seconds to get updated position
          setTimeout(() => refetch(), 10000);
        }
      }
    );
  }, [addKeyword, refetch]);

  const handleRefreshAll = useCallback(async () => {
    if (!selectedDomain) {
      toast({
        title: 'Error',
        description: 'Please select a domain first',
        variant: 'destructive'
      });
      return;
    }

    await addKeyword(
      () => trackingKeywordsAPI.refreshAll(selectedDomain),
      {
        showSuccessToast: true,
        successMessage: 'Bulk refresh started',
        onSuccess: (data) => {
          toast({
            title: 'Refreshing Keywords',
            description: `Queued ${data.count || 0} keywords for refresh`
          });
          // Reload after 30 seconds
          setTimeout(() => refetch(), 30000);
        }
      }
    );
  }, [selectedDomain, addKeyword, refetch, toast]);

  const handleDeleteKeyword = useCallback(async (keywordId) => {
    if (!confirm('Are you sure you want to delete this keyword?')) {
      return;
    }

    await deleteKeyword(
      () => trackingKeywordsAPI.delete(keywordId),
      {
        showSuccessToast: true,
        successMessage: 'Keyword deleted successfully',
        onSuccess: () => refetch()
      }
    );
  }, [deleteKeyword, refetch]);

  const getPositionBadge = (position) => {
    if (position === 0) return <Badge variant="outline">Not Ranked</Badge>;
    if (position <= 3) return <Badge variant="default" className="bg-green-600">#{position}</Badge>;
    if (position <= 10) return <Badge variant="secondary">#{position}</Badge>;
    if (position <= 20) return <Badge variant="outline">#{position}</Badge>;
    return <Badge variant="destructive">#{position}</Badge>;
  };

  const getPositionTrend = (history) => {
    if (!history || history.length < 2) return null;
    
    const current = history[history.length - 1].position;
    const previous = history[history.length - 2].position;
    
    if (current === 0 || previous === 0) return null;
    
    const diff = previous - current; // Positive = improvement
    
    if (diff > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (diff < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Calculate stats
  const stats = {
    total: keywords.length,
    top3: keywords.filter(k => k.position > 0 && k.position <= 3).length,
    top10: keywords.filter(k => k.position > 0 && k.position <= 10).length,
    top20: keywords.filter(k => k.position > 10 && k.position <= 20).length,
    unranked: keywords.filter(k => k.position === 0 || k.position > 100).length,
  };

  if (loading && keywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-8 w-8" />
            Keywords Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Track keyword positions with automated daily updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll} disabled={!selectedDomain}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Keywords
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Keywords</DialogTitle>
                <DialogDescription>
                  Add keywords to track their position in search results
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain *</Label>
                  <Select
                    value={newKeyword.domain_id || undefined}
                    onValueChange={(value) => setNewKeyword({ ...newKeyword, domain_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id.toString()}>
                          {domain.display_name || domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="device">Device</Label>
                    <Select
                      value={newKeyword.device}
                      onValueChange={(value) => setNewKeyword({ ...newKeyword, device: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={newKeyword.country}
                      onValueChange={(value) => setNewKeyword({ ...newKeyword, country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk_keywords">Keywords (one per line) *</Label>
                  <Textarea
                    id="bulk_keywords"
                    placeholder="seo tools&#10;keyword research&#10;rank tracker"
                    value={bulkKeywords}
                    onChange={(e) => setBulkKeywords(e.target.value)}
                    rows={10}
                  />
                  <p className="text-sm text-muted-foreground">
                    Add multiple keywords, one per line
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAdd}>
                  Add Keywords
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Domain Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="filter_domain" className="whitespace-nowrap">
              Filter by Domain:
            </Label>
            <Select
              value={selectedDomain?.toString() || 'all'}
              onValueChange={(value) => handleDomainChange(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="All domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id.toString()}>
                    {domain.display_name || domain.domain} ({domain.keyword_count} keywords)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 3</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.top3}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.top3 / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 10</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.top10}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.top10 / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 20</CardTitle>
            <BarChart3 className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.top20}</div>
            <p className="text-xs text-muted-foreground">
              Opportunities
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unranked</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unranked}</div>
            <p className="text-xs text-muted-foreground">
              Need work
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
          <CardDescription>
            {selectedDomain 
              ? `Tracking ${keywords.length} keywords for ${domains.find(d => d.id === selectedDomain)?.display_name || 'selected domain'}`
              : `Showing all ${keywords.length} keywords`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywords.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No keywords yet</h3>
              <p className="text-muted-foreground mb-4">
                Add keywords to start tracking their positions
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Keywords
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Last Tracked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell>
                      <div className="font-medium">{keyword.keyword}</div>
                      {keyword.url && (
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {keyword.url}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {keyword.domain_display_name || keyword.domain_name}
                    </TableCell>
                    <TableCell>
                      {keyword.device === 'mobile' ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>{getPositionBadge(keyword.position)}</TableCell>
                    <TableCell>{getPositionTrend(keyword.position_history)}</TableCell>
                    <TableCell>
                      {keyword.search_volume > 0 && (
                        <Badge variant="secondary">{keyword.search_volume}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {keyword.last_tracked_at
                        ? new Date(keyword.last_tracked_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshKeyword(keyword.id)}
                          disabled={keyword.updating}
                        >
                          {keyword.updating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKeyword(keyword.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
  );
}
