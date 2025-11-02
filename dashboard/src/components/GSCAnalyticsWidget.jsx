/**
 * GSC Analytics Widget
 * Displays Google Search Console traffic metrics and trends
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MousePointer,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE = '/api';

export default function GSCAnalyticsWidget({ clientId, compact = false }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topPages, setTopPages] = useState([]);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stats
      const statsResponse = await fetch(`${API_BASE}/gsc/stats?clientId=${clientId}`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load top pages
      const pagesResponse = await fetch(`${API_BASE}/gsc/top-pages?clientId=${clientId}&limit=5`);
      const pagesData = await pagesResponse.json();

      if (pagesData.success) {
        setTopPages(pagesData.pages || []);
      }
    } catch (error) {
      console.error('Failed to load GSC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const getTrendBadge = (trend) => {
    if (trend === 'up') return <Badge variant="success" className="text-xs">↑ Up</Badge>;
    if (trend === 'down') return <Badge variant="destructive" className="text-xs">↓ Down</Badge>;
    return <Badge variant="secondary" className="text-xs">→ Stable</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading GSC Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Fetching search analytics...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.properties === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Google Search Console</CardTitle>
          <CardDescription>Connect GSC to view traffic metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No GSC data available. Connect your property to see traffic metrics.
            </p>
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect GSC
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact version for dashboard cards
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Search Performance (30d)</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MousePointer className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Clicks</span>
              </div>
              <div className="text-xl font-bold">{stats.total_clicks_30d?.toLocaleString() || 0}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Impressions</span>
              </div>
              <div className="text-xl font-bold">{stats.total_impressions_30d?.toLocaleString() || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full version with top pages
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Search Performance
            </CardTitle>
            <CardDescription className="mt-1">Last 30 days from Google Search Console</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">Clicks</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_clicks_30d?.toLocaleString() || 0}</div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground font-medium">Impressions</span>
            </div>
            <div className="text-2xl font-bold">{stats.total_impressions_30d?.toLocaleString() || 0}</div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground font-medium">Avg Position</span>
            </div>
            <div className="text-2xl font-bold">{stats.avg_position || 'N/A'}</div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground font-medium">CTR</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.total_clicks_30d && stats.total_impressions_30d
                ? `${((stats.total_clicks_30d / stats.total_impressions_30d) * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Top Performing Page */}
        {stats.top_page && (
          <div className="p-4 border rounded-lg bg-primary/5">
            <div className="text-sm font-medium text-muted-foreground mb-2">Top Performing Page</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{stats.top_page.page_url}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.top_page.clicks_30d?.toLocaleString() || 0} clicks this month
                </div>
              </div>
              <Badge variant="success">
                <TrendingUp className="h-3 w-3 mr-1" />
                Top
              </Badge>
            </div>
          </div>
        )}

        {/* Top Pages List */}
        {topPages.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-3">Top Pages (by clicks)</div>
            <div className="space-y-2">
              {topPages.slice(0, 5).map((page, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="text-sm font-medium truncate">
                      {page.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" />
                        {page.clicks_30d?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {page.impressions_30d?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Pos {page.position_30d?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {getTrendBadge(page.clicks_trend)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
