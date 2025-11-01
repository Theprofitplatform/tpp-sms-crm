/**
 * PIXEL HEALTH INDICATOR COMPONENT
 *
 * Displays pixel health status with:
 * - Real-time status badge
 * - Uptime percentages
 * - Last ping timestamp
 * - Health history chart
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  UP: {
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    icon: CheckCircle,
    label: 'Operational'
  },
  DOWN: {
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    icon: XCircle,
    label: 'Down'
  },
  DEGRADED: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    icon: AlertTriangle,
    label: 'Degraded'
  },
  UNKNOWN: {
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    icon: Activity,
    label: 'Unknown'
  }
};

export default function PixelHealthIndicator({ pixelId, lastPingAt, compact = false }) {
  const [uptime, setUptime] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (pixelId) {
      loadUptime();
      loadHealth();
    }
  }, [pixelId]);

  const loadUptime = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/pixel/uptime/${pixelId}`);
      const data = await response.json();
      if (data.success) {
        setUptime(data.data);
      }
    } catch (error) {
      console.error('Error loading uptime:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await fetch(`/api/v2/pixel/health/${pixelId}?hours=24`);
      const data = await response.json();
      if (data.success) {
        setHealth(data.data);
      }
    } catch (error) {
      console.error('Error loading health:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUptime(), loadHealth()]);
    setRefreshing(false);
  };

  const getTimeSinceLastPing = () => {
    if (!lastPingAt) return 'Never';
    const now = new Date();
    const lastPing = new Date(lastPingAt);
    const diffMs = now - lastPing;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getUptimeStatus = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 99) return { color: 'text-green-600', label: 'Excellent' };
    if (pct >= 95) return { color: 'text-blue-600', label: 'Good' };
    if (pct >= 90) return { color: 'text-yellow-600', label: 'Fair' };
    return { color: 'text-red-600', label: 'Poor' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentStatus = uptime?.currentStatus || 'UNKNOWN';
  const config = STATUS_CONFIG[currentStatus];
  const Icon = config.icon;

  // Compact version for dashboard cards
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.textColor}`} />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{config.label}</div>
          <div className="text-xs text-gray-500">
            {uptime?.last24Hours}% uptime (24h)
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className={`bg-white rounded-lg shadow border-l-4 ${config.borderColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${config.bgColor}`}>
              <Icon className={`w-6 h-6 ${config.textColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Pixel Status</h3>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${config.bgColor} ${config.textColor}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Last ping: {getTimeSinceLastPing()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Uptime Statistics */}
      {uptime && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Uptime Statistics</h4>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 24 Hours */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Last 24 Hours</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUptimeStatus(uptime.last24Hours).color}`}>
                  {uptime.last24Hours}%
                </span>
                <span className={`text-xs ${getUptimeStatus(uptime.last24Hours).color}`}>
                  {getUptimeStatus(uptime.last24Hours).label}
                </span>
              </div>
              <div className="mt-2">
                <UptimeBar percentage={parseFloat(uptime.last24Hours)} />
              </div>
            </div>

            {/* 7 Days */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Last 7 Days</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUptimeStatus(uptime.last7Days).color}`}>
                  {uptime.last7Days}%
                </span>
                <span className={`text-xs ${getUptimeStatus(uptime.last7Days).color}`}>
                  {getUptimeStatus(uptime.last7Days).label}
                </span>
              </div>
              <div className="mt-2">
                <UptimeBar percentage={parseFloat(uptime.last7Days)} />
              </div>
            </div>

            {/* 30 Days */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Last 30 Days</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${getUptimeStatus(uptime.last30Days).color}`}>
                  {uptime.last30Days}%
                </span>
                <span className={`text-xs ${getUptimeStatus(uptime.last30Days).color}`}>
                  {getUptimeStatus(uptime.last30Days).label}
                </span>
              </div>
              <div className="mt-2">
                <UptimeBar percentage={parseFloat(uptime.last30Days)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health History */}
      {health && health.history && health.history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Health History (24h)</h4>
          <HealthHistoryChart history={health.history} />

          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Checks</div>
              <div className="text-lg font-semibold text-gray-900">
                {health.totalChecks}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Average Uptime</div>
              <div className="text-lg font-semibold text-green-600">
                {health.uptime}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Uptime Bar Component
function UptimeBar({ percentage }) {
  const getColor = (pct) => {
    if (pct >= 99) return 'bg-green-500';
    if (pct >= 95) return 'bg-blue-500';
    if (pct >= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${getColor(percentage)} transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}

// Health History Chart Component
function HealthHistoryChart({ history }) {
  if (!history || history.length === 0) return null;

  // Group by hour for better visualization
  const hourlyData = history.reduce((acc, entry) => {
    const hour = new Date(entry.timestamp).getHours();
    if (!acc[hour]) {
      acc[hour] = { up: 0, down: 0, degraded: 0 };
    }
    if (entry.status === 'UP') acc[hour].up++;
    else if (entry.status === 'DOWN') acc[hour].down++;
    else if (entry.status === 'DEGRADED') acc[hour].degraded++;
    return acc;
  }, {});

  const hours = Object.keys(hourlyData).sort((a, b) => a - b);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {hours.map((hour) => {
          const data = hourlyData[hour];
          const total = data.up + data.down + data.degraded;
          const upPercentage = (data.up / total) * 100;

          return (
            <div key={hour} className="flex-1 flex flex-col justify-end items-center gap-1">
              <div
                className={`w-full rounded-t ${
                  upPercentage === 100 ? 'bg-green-500' :
                  upPercentage >= 90 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ height: `${upPercentage}%` }}
                title={`${hour}:00 - ${upPercentage.toFixed(1)}% uptime`}
              ></div>
              <div className="text-xs text-gray-400">{hour}</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Up</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Degraded</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Down</span>
        </div>
      </div>
    </div>
  );
}
