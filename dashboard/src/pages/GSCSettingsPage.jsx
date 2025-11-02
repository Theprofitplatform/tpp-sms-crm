/**
 * Google Search Console Settings Page
 * Manages GSC OAuth connections, property verification, and data syncing
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Globe,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Eye,
  MousePointer,
  BarChart3
} from 'lucide-react';

const API_BASE = '/api';

export default function GSCSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedClient, setSelectedClient] = useState('instantautotraders');
  const [syncingPropertyId, setSyncingPropertyId] = useState(null);
  const [stats, setStats] = useState(null);

  const clients = [
    { id: 'instantautotraders', name: 'Instant Auto Traders', url: 'https://instantautotraders.com.au' },
    { id: 'hottyres', name: 'Hot Tyres', url: 'https://hottyres.com.au' },
    { id: 'sadcdisabilityservices', name: 'SADC Disability Services', url: 'https://sadcdisabilityservices.com.au' }
  ];

  const selectedClientData = clients.find(c => c.id === selectedClient);

  // Load properties on mount and when client changes
  useEffect(() => {
    loadProperties();
    loadStats();
  }, [selectedClient]);

  const loadProperties = async () => {
    try {
      const response = await fetch(`${API_BASE}/gsc/properties?clientId=${selectedClient}`);
      const data = await response.json();

      if (data.success) {
        setProperties(data.properties || []);
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/gsc/stats?clientId=${selectedClient}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleConnectGSC = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/gsc/auth-url?clientId=${selectedClient}`);
      const data = await response.json();

      if (data.success && data.authUrl) {
        // Open OAuth URL in new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');

        toast({
          title: 'Opening Google Authorization',
          description: 'Please authorize access to Google Search Console in the new window.',
        });
      } else {
        throw new Error(data.error || 'Failed to generate auth URL');
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProperty = async (propertyId) => {
    setSyncingPropertyId(propertyId);
    try {
      const response = await fetch(`${API_BASE}/gsc/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          propertyId: propertyId,
          days: 30
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `Successfully imported ${data.result.recordsImported} records from GSC.`,
        });

        // Reload properties and stats
        await loadProperties();
        await loadStats();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingPropertyId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Google Search Console</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Google Search Console account to import search analytics and prioritize SEO improvements by traffic impact.
        </p>
      </div>

      {/* Client Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Client</CardTitle>
          <CardDescription>Choose which WordPress site to manage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedClient === client.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {client.url.replace('https://', '')}
                    </div>
                  </div>
                  {selectedClient === client.id && (
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-blue-500" />
                <div className="text-2xl font-bold">{stats.total_clicks_30d?.toLocaleString() || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Impressions (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <div className="text-2xl font-bold">{stats.total_impressions_30d?.toLocaleString() || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div className="text-2xl font-bold">{stats.avg_position || 'N/A'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <div className="text-2xl font-bold">{stats.active_issues || 0}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connected Properties */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connected Properties</CardTitle>
              <CardDescription className="mt-1">
                Verified Google Search Console properties for {selectedClientData?.name}
              </CardDescription>
            </div>
            <Button onClick={handleConnectGSC} disabled={loading}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {loading ? 'Connecting...' : 'Connect New Property'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Properties Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Google Search Console account to start importing search analytics data.
              </p>
              <Button onClick={handleConnectGSC} disabled={loading}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect to Google Search Console
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="border rounded-lg p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{property.property_url}</span>
                        {property.verified ? (
                          <Badge variant="success" className="ml-2">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Verified
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <div className="text-muted-foreground">Type</div>
                          <div className="font-medium">{property.property_type || 'URL_PREFIX'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Last Sync</div>
                          <div className="font-medium">{formatDate(property.last_sync)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div>
                            {property.last_sync_status === 'success' && (
                              <Badge variant="success">Success</Badge>
                            )}
                            {property.last_sync_status === 'failed' && (
                              <Badge variant="destructive">Failed</Badge>
                            )}
                            {!property.last_sync_status && (
                              <Badge variant="secondary">Never Synced</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Verified</div>
                          <div className="font-medium">{formatDate(property.verified_at)}</div>
                        </div>
                      </div>

                      {property.last_sync_error && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-destructive">Sync Error</div>
                              <div className="text-muted-foreground mt-1">{property.last_sync_error}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleSyncProperty(property.id)}
                      disabled={syncingPropertyId === property.id || !property.verified}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                    >
                      {syncingPropertyId === property.id ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            How GSC Integration Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Connect Your Property</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Connect New Property" to authorize access to your Google Search Console account.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Import Search Data</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Sync Now" to import clicks, impressions, CTR, and position data from GSC (last 30 days).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Prioritize by Traffic</h4>
                <p className="text-sm text-muted-foreground">
                  Proposals will automatically be enriched with traffic data and sorted by potential impact.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Track Impact</h4>
                <p className="text-sm text-muted-foreground">
                  After applying fixes, sync again to measure before/after traffic changes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Your website must be verified in Google Search Console</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>You need owner or full permissions on the GSC property</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Google OAuth credentials must be configured (GOOGLE_CLIENT_ID in .env)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
