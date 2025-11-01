import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  BarChart3,
  Download,
  Filter,
  Tag,
  SortAsc,
  SortDesc,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit2,
  Copy,
  FileSpreadsheet
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

import { trackingKeywordsAPI, domainsAPI } from '@/services/api';
import { useAPIRequest, useAPIData } from '@/hooks/useAPIRequest';

export default function KeywordsPageEnhanced() {
  const { toast } = useToast();
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  const [selectedKeywordForChart, setSelectedKeywordForChart] = useState(null);
  
  // Filter and selection states
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState(new Set());
  const [sortField, setSortField] = useState('keyword');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    positionMin: '',
    positionMax: '',
    volumeMin: '',
    trend: 'all', // all, up, down, stable
    device: 'all',
    hasUrl: 'all'
  });
  
  // Bulk operation state
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [newKeyword, setNewKeyword] = useState({
    domain_id: '',
    keyword: '',
    device: 'desktop',
    country: 'US',
    search_volume: 0,
    tags: '',
    notes: ''
  });

  // API Requests
  const { data: domainsData, loading: loadingDomains } = useAPIData(
    () => domainsAPI.getAll(),
    { autoFetch: true }
  );

  const { data: keywordsData, loading: loadingKeywords, refetch } = useAPIData(
    () => selectedDomain ? trackingKeywordsAPI.getByDomain(selectedDomain, 10000) : trackingKeywordsAPI.getAll(10000),
    { autoFetch: true }
  );

  const { execute: addKeyword, loading: adding } = useAPIRequest();
  const { execute: deleteKeyword, loading: deleting } = useAPIRequest();

  const domains = domainsData?.domains?.filter(d => d.active) || [];
  const allKeywords = keywordsData?.keywords || [];
  const loading = loadingDomains || loadingKeywords;

  // Advanced filtering and sorting
  const filteredAndSortedKeywords = useMemo(() => {
    let result = [...allKeywords];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(kw => 
        kw.keyword.toLowerCase().includes(query) ||
        kw.domain_display_name?.toLowerCase().includes(query) ||
        kw.notes?.toLowerCase().includes(query)
      );
    }

    // Advanced filters
    if (filters.positionMin) {
      const min = parseInt(filters.positionMin);
      result = result.filter(kw => kw.position >= min);
    }
    if (filters.positionMax) {
      const max = parseInt(filters.positionMax);
      result = result.filter(kw => kw.position > 0 && kw.position <= max);
    }
    if (filters.volumeMin) {
      const min = parseInt(filters.volumeMin);
      result = result.filter(kw => kw.search_volume >= min);
    }
    if (filters.device !== 'all') {
      result = result.filter(kw => kw.device === filters.device);
    }
    if (filters.hasUrl !== 'all') {
      const hasUrl = filters.hasUrl === 'yes';
      result = result.filter(kw => hasUrl ? !!kw.url : !kw.url);
    }
    if (filters.trend !== 'all') {
      result = result.filter(kw => {
        const trend = getKeywordTrend(kw.position_history);
        return trend === filters.trend;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'keyword':
          aVal = a.keyword.toLowerCase();
          bVal = b.keyword.toLowerCase();
          break;
        case 'position':
          aVal = a.position || 999;
          bVal = b.position || 999;
          break;
        case 'volume':
          aVal = a.search_volume || 0;
          bVal = b.search_volume || 0;
          break;
        case 'domain':
          aVal = a.domain_display_name?.toLowerCase() || '';
          bVal = b.domain_display_name?.toLowerCase() || '';
          break;
        case 'lastTracked':
          aVal = new Date(a.last_tracked_at || 0).getTime();
          bVal = new Date(b.last_tracked_at || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allKeywords, searchQuery, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedKeywords.length / itemsPerPage);
  const paginatedKeywords = filteredAndSortedKeywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper function to get trend
  const getKeywordTrend = (history) => {
    if (!history || history.length < 2) return 'stable';
    const current = history[history.length - 1].position;
    const previous = history[history.length - 2].position;
    if (current === 0 || previous === 0) return 'stable';
    const diff = previous - current;
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'stable';
  };

  // Handlers
  const handleDomainChange = useCallback((domainId) => {
    setSelectedDomain(domainId);
    setCurrentPage(1);
    setSelectedKeywords(new Set());
    refetch();
  }, [refetch]);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedKeywords(new Set(paginatedKeywords.map(kw => kw.id)));
    } else {
      setSelectedKeywords(new Set());
    }
  }, [paginatedKeywords]);

  const handleSelectKeyword = useCallback((keywordId, checked) => {
    const newSelected = new Set(selectedKeywords);
    if (checked) {
      newSelected.add(keywordId);
    } else {
      newSelected.delete(keywordId);
    }
    setSelectedKeywords(newSelected);
  }, [selectedKeywords]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedKeywords.size === 0) return;
    
    if (!confirm(`Delete ${selectedKeywords.size} selected keywords?`)) return;

    let successCount = 0;
    for (const keywordId of selectedKeywords) {
      try {
        await trackingKeywordsAPI.delete(keywordId);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete keyword ${keywordId}:`, error);
      }
    }

    toast({
      title: 'Bulk Delete Complete',
      description: `Deleted ${successCount} of ${selectedKeywords.size} keywords`
    });

    setSelectedKeywords(new Set());
    refetch();
  }, [selectedKeywords, toast, refetch]);

  const handleExportCSV = useCallback(() => {
    const dataToExport = selectedKeywords.size > 0
      ? filteredAndSortedKeywords.filter(kw => selectedKeywords.has(kw.id))
      : filteredAndSortedKeywords;

    const csv = [
      ['Keyword', 'Domain', 'Position', 'Device', 'Search Volume', 'Last Tracked', 'URL'].join(','),
      ...dataToExport.map(kw => [
        `"${kw.keyword}"`,
        `"${kw.domain_display_name || ''}"`,
        kw.position || 0,
        kw.device,
        kw.search_volume || 0,
        kw.last_tracked_at || '',
        `"${kw.url || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${dataToExport.length} keywords to CSV`
    });
  }, [filteredAndSortedKeywords, selectedKeywords, toast]);

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
          setNewKeyword({ ...newKeyword, domain_id: '', tags: '', notes: '' });
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
          setTimeout(() => refetch(), 10000);
        }
      }
    );
  }, [addKeyword, refetch]);

  const handleRefreshAll = useCallback(async () => {
    if (!selectedDomain && selectedKeywords.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select a domain or keywords first',
        variant: 'destructive'
      });
      return;
    }

    if (selectedKeywords.size > 0) {
      // Refresh selected keywords
      let count = 0;
      for (const keywordId of selectedKeywords) {
        try {
          await trackingKeywordsAPI.refresh(keywordId);
          count++;
        } catch (error) {
          console.error(`Failed to refresh keyword ${keywordId}`);
        }
      }
      toast({
        title: 'Bulk Refresh Started',
        description: `Refreshing ${count} keywords...`
      });
    } else {
      // Refresh all for domain
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
            setTimeout(() => refetch(), 30000);
          }
        }
      );
    }
  }, [selectedDomain, selectedKeywords, addKeyword, refetch, toast]);

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

  const showKeywordChart = useCallback((keyword) => {
    setSelectedKeywordForChart(keyword);
    setIsChartDialogOpen(true);
  }, []);

  const getPositionBadge = (position) => {
    if (position === 0) return <Badge variant="outline">Not Ranked</Badge>;
    if (position <= 3) return <Badge variant="default" className="bg-green-600">#{position}</Badge>;
    if (position <= 10) return <Badge variant="secondary">#{position}</Badge>;
    if (position <= 20) return <Badge variant="outline">#{position}</Badge>;
    return <Badge variant="destructive">#{position}</Badge>;
  };

  const getPositionTrendIcon = (history) => {
    const trend = getKeywordTrend(history);
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Calculate enhanced stats
  const stats = useMemo(() => {
    const keywords = filteredAndSortedKeywords;
    return {
      total: keywords.length,
      top3: keywords.filter(k => k.position > 0 && k.position <= 3).length,
      top10: keywords.filter(k => k.position > 0 && k.position <= 10).length,
      top20: keywords.filter(k => k.position > 10 && k.position <= 20).length,
      unranked: keywords.filter(k => k.position === 0 || k.position > 100).length,
      improving: keywords.filter(k => getKeywordTrend(k.position_history) === 'up').length,
      declining: keywords.filter(k => getKeywordTrend(k.position_history) === 'down').length,
      avgPosition: keywords.filter(k => k.position > 0).reduce((sum, k) => sum + k.position, 0) / 
                   Math.max(1, keywords.filter(k => k.position > 0).length),
      totalVolume: keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0)
    };
  }, [filteredAndSortedKeywords]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.positionMin) count++;
    if (filters.positionMax) count++;
    if (filters.volumeMin) count++;
    if (filters.device !== 'all') count++;
    if (filters.trend !== 'all') count++;
    if (filters.hasUrl !== 'all') count++;
    return count;
  }, [filters]);

  if (loading && allKeywords.length === 0) {
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
            <Badge variant="secondary" className="ml-2">Enhanced</Badge>
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced keyword position tracking with bulk operations and detailed analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsFilterDialogOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="destructive" className="ml-2">{activeFilterCount}</Badge>
            )}
          </Button>
          <Button variant="outline" onClick={handleRefreshAll} disabled={!selectedDomain && selectedKeywords.size === 0}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh {selectedKeywords.size > 0 ? `(${selectedKeywords.size})` : 'All'}
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

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <Input
                    id="tags"
                    placeholder="brand, competitor, high-value"
                    value={newKeyword.tags}
                    onChange={(e) => setNewKeyword({ ...newKeyword, tags: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAdd} disabled={adding}>
                  {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Keywords
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedKeywords.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedKeywords.size} keyword{selectedKeywords.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKeywords(new Set())}
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Domain Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Domain:</Label>
              <Select
                value={selectedDomain?.toString() || 'all'}
                onValueChange={(value) => handleDomainChange(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All domains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id.toString()}>
                      {domain.display_name || domain.domain} ({domain.keyword_count || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
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
            <div className="text-2xl font-bold text-green-600">{stats.top3}</div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const val = stats.total > 0 ? ((stats.top3 / stats.total) * 100) : 0
                return isFinite(val) ? val.toFixed(1) : '0.0'
              })()}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 10</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.top10}</div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const val = stats.total > 0 ? ((stats.top10 / stats.total) * 100) : 0
                return isFinite(val) ? val.toFixed(1) : '0.0'
              })()}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top 20</CardTitle>
            <BarChart3 className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.top20}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Improving</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.improving}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declining</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.declining}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Pos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFinite(stats.avgPosition) ? Number(stats.avgPosition).toFixed(1) : '0.0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const val = stats.totalVolume / 1000
                return isFinite(val) ? val.toFixed(1) : '0.0'
              })()}k
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Keywords</CardTitle>
              <CardDescription>
                Showing {paginatedKeywords.length} of {filteredAndSortedKeywords.length} keywords
              </CardDescription>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedKeywords.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {allKeywords.length === 0 ? 'No keywords yet' : 'No keywords match your filters'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {allKeywords.length === 0 
                  ? 'Add keywords to start tracking their positions'
                  : 'Try adjusting your search or filters'}
              </p>
              {allKeywords.length === 0 && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Keywords
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedKeywords.size === paginatedKeywords.length && paginatedKeywords.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('keyword')}>
                    <div className="flex items-center gap-1">
                      Keyword
                      {sortField === 'keyword' && (
                        sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('domain')}>
                    <div className="flex items-center gap-1">
                      Domain
                      {sortField === 'domain' && (
                        sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('position')}>
                    <div className="flex items-center gap-1">
                      Position
                      {sortField === 'position' && (
                        sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('volume')}>
                    <div className="flex items-center gap-1">
                      Volume
                      {sortField === 'volume' && (
                        sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('lastTracked')}>
                    <div className="flex items-center gap-1">
                      Last Tracked
                      {sortField === 'lastTracked' && (
                        sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKeywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedKeywords.has(keyword.id)}
                        onCheckedChange={(checked) => handleSelectKeyword(keyword.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium max-w-xs truncate">{keyword.keyword}</div>
                      {keyword.url && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPositionBadge(keyword.position)}
                        {keyword.position_history && keyword.position_history.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => showKeywordChart(keyword)}
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPositionTrendIcon(keyword.position_history)}</TableCell>
                    <TableCell>
                      {keyword.search_volume > 0 && (
                        <Badge variant="secondary">{keyword.search_volume.toLocaleString()}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {keyword.last_tracked_at
                        ? new Date(keyword.last_tracked_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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

      {/* Advanced Filters Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Filter keywords by position, volume, trend, and more
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position Min</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={filters.positionMin}
                  onChange={(e) => setFilters({ ...filters, positionMin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Position Max</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={filters.positionMax}
                  onChange={(e) => setFilters({ ...filters, positionMax: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Minimum Search Volume</Label>
              <Input
                type="number"
                placeholder="1000"
                value={filters.volumeMin}
                onChange={(e) => setFilters({ ...filters, volumeMin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Device Type</Label>
              <Select
                value={filters.device}
                onValueChange={(value) => setFilters({ ...filters, device: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position Trend</Label>
              <Select
                value={filters.trend}
                onValueChange={(value) => setFilters({ ...filters, trend: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trends</SelectItem>
                  <SelectItem value="up">Improving</SelectItem>
                  <SelectItem value="down">Declining</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Has Ranking URL</Label>
              <Select
                value={filters.hasUrl}
                onValueChange={(value) => setFilters({ ...filters, hasUrl: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Keywords</SelectItem>
                  <SelectItem value="yes">Has URL</SelectItem>
                  <SelectItem value="no">No URL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  positionMin: '',
                  positionMax: '',
                  volumeMin: '',
                  trend: 'all',
                  device: 'all',
                  hasUrl: 'all'
                });
                setCurrentPage(1);
              }}
            >
              Reset Filters
            </Button>
            <Button onClick={() => {
              setIsFilterDialogOpen(false);
              setCurrentPage(1);
            }}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyword Chart Dialog */}
      <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Position History: {selectedKeywordForChart?.keyword}</DialogTitle>
            <DialogDescription>
              Track position changes over time
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedKeywordForChart?.position_history && selectedKeywordForChart.position_history.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={selectedKeywordForChart.position_history.map(h => ({
                  date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  position: h.position > 0 ? h.position : null
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis reversed domain={[1, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="position" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Not enough historical data to display chart</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
