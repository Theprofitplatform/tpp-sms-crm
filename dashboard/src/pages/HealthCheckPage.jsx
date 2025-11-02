import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import {
  Activity,
  RefreshCw,
  Database,
  Globe,
  Server,
  MonitorSmartphone,
  Clock,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle
} from 'lucide-react';

const HealthCheckPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v2/health`);
      const data = await response.json();

      setHealthData(data);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      setError(err.message || 'Failed to connect to API server');

      // Set empty data to show all services as down
      setHealthData({
        status: 'unhealthy',
        services: {},
        metrics: {},
        dependencies: [],
        environment: 'unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'down':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'degraded':
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'not_configured':
      case 'not_authenticated':
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <Badge className="bg-green-500">Up</Badge>;
      case 'down':
      case 'unhealthy':
        return <Badge variant="destructive">Down</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500">Expired</Badge>;
      case 'not_configured':
        return <Badge variant="outline">Not Configured</Badge>;
      case 'not_authenticated':
        return <Badge variant="outline">Not Authenticated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getServiceIcon = (serviceName) => {
    switch (serviceName) {
      case 'api':
        return <Server className="h-6 w-6" />;
      case 'dashboard':
        return <MonitorSmartphone className="h-6 w-6" />;
      case 'database':
        return <Database className="h-6 w-6" />;
      case 'redis':
        return <Activity className="h-6 w-6" />;
      case 'wordpress':
      case 'gsc':
      case 'serpapi':
        return <Globe className="h-6 w-6" />;
      case 'filesystem':
        return <HardDrive className="h-6 w-6" />;
      default:
        return <Server className="h-6 w-6" />;
    }
  };

  const getOverallStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading && !healthData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Health Monitor</h1>
            <p className="text-muted-foreground">Loading health status...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-100 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring for all services • {healthData?.environment || 'Unknown'} Environment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealthData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Status Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Overall System Status</CardTitle>
              <CardDescription>
                Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}
              </CardDescription>
            </div>
            <div className={`text-4xl font-bold ${getOverallStatusColor(healthData?.status)}`}>
              {healthData?.status?.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-lg font-semibold">
                  {healthData?.uptime ? Math.floor(healthData.uptime / 60) + 'm' : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">{healthData?.version || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-lg font-semibold">
                  {Object.values(healthData?.services || {}).filter(s => s.status === 'up').length} / {Object.keys(healthData?.services || {}).length} Up
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Check Duration</p>
                <p className="text-lg font-semibold">{healthData?.checkDuration || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthData?.services && Object.entries(healthData.services).map(([key, service]) => (
            <Card key={key} className={service.critical && service.status === 'down' ? 'border-red-500 border-2' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(key)}
                    <div>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      {service.critical && (
                        <Badge variant="outline" className="mt-1 text-xs">Critical</Badge>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(service.status)}
                </div>

                {service.latency && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Latency:</span>
                    <span className="text-sm font-medium">{service.latency}</span>
                  </div>
                )}

                {service.port && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Port:</span>
                    <span className="text-sm font-mono">{service.port}</span>
                  </div>
                )}

                {service.error && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-xs">
                      {service.error}
                    </AlertDescription>
                  </Alert>
                )}

                {service.details && Object.keys(service.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {Object.entries(service.details).map(([detailKey, detailValue]) => (
                      <div key={detailKey} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground capitalize">
                          {detailKey.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-mono truncate ml-2 max-w-[150px]" title={String(detailValue)}>
                          {String(detailValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Metrics */}
      {healthData?.metrics && (
        <div>
          <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory */}
            {healthData.metrics.memory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    <CardTitle className="text-lg">Memory Usage</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Process Memory</span>
                      <span className="text-sm font-semibold">
                        {healthData.metrics.memory.used} / {healthData.metrics.memory.total} MB
                      </span>
                    </div>
                    <Progress
                      value={(healthData.metrics.memory.used / healthData.metrics.memory.total) * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">System Memory</span>
                      <span className="text-sm font-semibold">
                        {healthData.metrics.memory.percentUsed}% Used
                      </span>
                    </div>
                    <Progress
                      value={healthData.metrics.memory.percentUsed}
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{healthData.metrics.memory.systemTotal} MB</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Free</p>
                      <p className="font-semibold">{healthData.metrics.memory.systemFree} MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CPU */}
            {healthData.metrics.cpu && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    <CardTitle className="text-lg">CPU Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cores</span>
                    <span className="text-sm font-semibold">{healthData.metrics.cpu.cores}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-xs font-mono truncate max-w-[200px]" title={healthData.metrics.cpu.model}>
                      {healthData.metrics.cpu.model}
                    </span>
                  </div>

                  {healthData.metrics.cpu.loadAverage && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Load Average</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">1m</p>
                          <p className="font-semibold">{healthData.metrics.cpu.loadAverage[0]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">5m</p>
                          <p className="font-semibold">{healthData.metrics.cpu.loadAverage[1]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">15m</p>
                          <p className="font-semibold">{healthData.metrics.cpu.loadAverage[2]}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Process Info */}
            {healthData.metrics.process && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <CardTitle className="text-lg">Process Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-lg font-semibold">{Math.floor(healthData.metrics.process.uptime / 60)}m</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PID</p>
                      <p className="text-lg font-mono">{healthData.metrics.process.pid}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Node Version</p>
                      <p className="text-lg font-mono">{healthData.metrics.process.nodeVersion}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Platform</p>
                      <p className="text-lg font-mono">{healthData.metrics.process.platform}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Architecture</p>
                      <p className="text-lg font-mono">{healthData.metrics.process.arch}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {healthData?.dependencies && healthData.dependencies.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Dependencies</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {healthData.dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(dep.status)}
                      <div>
                        <p className="font-medium">{dep.name}</p>
                        {dep.error && <p className="text-xs text-red-500">{dep.error}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dep.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      {getStatusBadge(dep.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HealthCheckPage;
