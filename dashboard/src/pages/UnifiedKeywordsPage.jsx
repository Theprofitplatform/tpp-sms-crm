import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  BarChart3,
  Zap,
  Database
} from 'lucide-react';

export default function UnifiedKeywordsPage() {
  const [keywords, setKeywords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    tracking: 0,
    research: 0,
    opportunities: 0
  });

  // Fetch data on mount
  useEffect(() => {
    loadData();
    loadSyncStatus();

    // Refresh sync status every 30 seconds
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch keywords
      const keywordsRes = await fetch('/api/v2/keywords?per_page=100');
      const keywordsData = await keywordsRes.json();
      setKeywords(keywordsData.keywords || []);

      // Fetch projects
      const projectsRes = await fetch('/api/v2/research/projects');
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);

      // Fetch stats
      const statsRes = await fetch('/api/v2/keywords/stats');
      const statsData = await statsRes.json();
      setStats(statsData.stats || stats);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const res = await fetch('/api/v2/sync/status');
      const data = await res.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const triggerSync = async () => {
    try {
      const res = await fetch('/api/v2/sync/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        loadSyncStatus();
        setTimeout(loadData, 2000); // Reload data after sync
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    }
  };

  const trackKeyword = async (keywordId) => {
    try {
      const res = await fetch(`/api/v2/keywords/${keywordId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'example.com' }) // TODO: Make this dynamic
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error tracking keyword:', error);
    }
  };

  const filteredKeywords = keywords.filter(kw => {
    const matchesSearch = kw.keyword?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = selectedTab === 'all' ||
                      (selectedTab === 'tracking' && kw.is_tracking) ||
                      (selectedTab === 'research' && kw.research_project_id) ||
                      (selectedTab === 'opportunities' && kw.opportunity_score > 50);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Unified Keyword Management</h1>
          <p className="text-muted-foreground">
            Integrated position tracking and keyword research
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Keywords"
          value={stats.total}
          icon={<Database className="h-4 w-4" />}
          loading={loading}
        />
        <StatsCard
          title="Tracking"
          value={stats.tracking}
          icon={<Eye className="h-4 w-4" />}
          trend="+12%"
          loading={loading}
        />
        <StatsCard
          title="Research Projects"
          value={projects.length}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={loading}
        />
        <StatsCard
          title="Opportunities"
          value={stats.opportunities}
          icon={<Zap className="h-4 w-4" />}
          highlight
          loading={loading}
        />
      </div>

      {/* Sync Status Card */}
      {syncStatus && (
        <SyncStatusCard
          status={syncStatus}
          onTrigger={triggerSync}
        />
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Keywords</CardTitle>
              <CardDescription>
                {filteredKeywords.length} keywords found
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Keywords</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              {loading ? (
                <KeywordsTableSkeleton />
              ) : (
                <KeywordsTable
                  keywords={filteredKeywords}
                  onTrack={trackKeyword}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Research Projects Section */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Research Projects</CardTitle>
            <CardDescription>
              Active keyword research projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon, trend, highlight, loading }) {
  return (
    <Card className={highlight ? 'border-primary' : ''}>
      <CardContent className="pt-6">
        {loading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold mt-2">{value?.toLocaleString() || 0}</p>
              </div>
              <div className="text-muted-foreground">{icon}</div>
            </div>
            {trend && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Sync Status Card Component
function SyncStatusCard({ status, onTrigger }) {
  const isSyncing = status.isSyncing;
  const lastSync = status.lastSyncTime ? new Date(status.lastSyncTime) : null;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Sync Status</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isSyncing ? (
                <span className="text-blue-600">Syncing data...</span>
              ) : lastSync ? (
                `Last synced: ${lastSync.toLocaleTimeString()}`
              ) : (
                'Never synced'
              )}
            </p>
            {status.stats && (
              <p className="text-xs text-muted-foreground mt-1">
                {status.stats.totalSynced} records synced • {status.stats.totalErrors} errors
              </p>
            )}
          </div>
          <Button
            onClick={onTrigger}
            disabled={isSyncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        {isSyncing && (
          <Progress value={33} className="mt-4" />
        )}
      </CardContent>
    </Card>
  );
}

// Keywords Table Component
function KeywordsTable({ keywords, onTrack }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>Intent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No keywords found
              </TableCell>
            </TableRow>
          ) : (
            keywords.map((keyword) => (
              <KeywordRow
                key={keyword.id}
                keyword={keyword}
                onTrack={() => onTrack(keyword.id)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Keyword Row Component
function KeywordRow({ keyword, onTrack }) {
  const [showDetails, setShowDetails] = useState(false);

  const getPositionBadge = (position) => {
    if (!position || position === 0) return <Badge variant="outline">Not Ranking</Badge>;
    if (position <= 3) return <Badge className="bg-green-500">#{position}</Badge>;
    if (position <= 10) return <Badge className="bg-blue-500">#{position}</Badge>;
    if (position <= 20) return <Badge variant="secondary">#{position}</Badge>;
    return <Badge variant="outline">#{position}</Badge>;
  };

  const getOpportunityBadge = (score) => {
    if (score >= 70) return <Badge className="bg-green-500">{score}</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">{score}</Badge>;
    if (score >= 30) return <Badge variant="secondary">{score}</Badge>;
    return <Badge variant="outline">{score || 'N/A'}</Badge>;
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium max-w-xs">
          <div className="truncate">{keyword.keyword || 'Unknown'}</div>
          {keyword.lemma && keyword.lemma !== keyword.keyword && (
            <div className="text-xs text-muted-foreground">→ {keyword.lemma}</div>
          )}
        </TableCell>
        <TableCell>{getPositionBadge(keyword.position || keyword.current_position)}</TableCell>
        <TableCell>{keyword.search_volume?.toLocaleString() || '—'}</TableCell>
        <TableCell>
          <Progress
            value={keyword.difficulty || 0}
            className="w-16"
          />
          <span className="text-xs ml-2">{keyword.difficulty || 0}</span>
        </TableCell>
        <TableCell>{getOpportunityBadge(keyword.opportunity_score)}</TableCell>
        <TableCell>
          <Badge variant="outline">{keyword.intent || 'Unknown'}</Badge>
        </TableCell>
        <TableCell>
          {keyword.is_tracking ? (
            <Badge className="bg-blue-500">Tracking</Badge>
          ) : keyword.research_project_id ? (
            <Badge variant="secondary">Research</Badge>
          ) : (
            <Badge variant="outline">Idle</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {!keyword.is_tracking && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTrack}
              >
                <Target className="h-4 w-4 mr-1" />
                Track
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{keyword.keyword}</DialogTitle>
            <DialogDescription>
              Detailed keyword metrics and insights
            </DialogDescription>
          </DialogHeader>
          <KeywordDetails keyword={keyword} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Keyword Details Component
function KeywordDetails({ keyword }) {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Search Volume</label>
          <p className="text-2xl font-bold">{keyword.search_volume?.toLocaleString() || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Traffic Potential</label>
          <p className="text-2xl font-bold">{keyword.traffic_potential?.toLocaleString() || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Difficulty</label>
          <p className="text-2xl font-bold">{keyword.difficulty || 'N/A'}/100</p>
        </div>
        <div>
          <label className="text-sm font-medium">Opportunity Score</label>
          <p className="text-2xl font-bold">{keyword.opportunity_score || 'N/A'}/100</p>
        </div>
      </div>

      {/* Position History */}
      {keyword.position_history && (
        <div>
          <h3 className="font-semibold mb-2">Position History</h3>
          <div className="text-sm text-muted-foreground">
            Chart visualization would go here
          </div>
        </div>
      )}

      {/* SERP Features */}
      {keyword.serp_features && keyword.serp_features.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">SERP Features</h3>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(keyword.serp_features) ? keyword.serp_features : JSON.parse(keyword.serp_features || '[]')).map((feature, i) => (
              <Badge key={i} variant="outline">{feature}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Intent & Classification */}
      <div>
        <h3 className="font-semibold mb-2">Classification</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Intent</label>
            <p className="font-medium">{keyword.intent || 'Unknown'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Device</label>
            <p className="font-medium">{keyword.device || 'desktop'}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Country</label>
            <p className="font-medium">{keyword.country || 'US'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-2">{project.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {project.seed_terms || 'No seed terms'}
        </p>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {project.keyword_count || 0} keywords
          </span>
          <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
            {project.status || 'draft'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton Component
function KeywordsTableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
