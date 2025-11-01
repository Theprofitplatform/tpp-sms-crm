/**
 * ANALYTICS DASHBOARD COMPONENT
 *
 * Displays pixel analytics with:
 * - SEO score trends
 * - Core Web Vitals charts
 * - Issue trend analysis
 * - Time period filtering
 * - Export functionality
 */

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Download,
  Calendar,
  AlertCircle,
  Zap,
  Eye
} from 'lucide-react';

const TIME_PERIODS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' }
];

export default function AnalyticsDashboard({ pixelId }) {
  const [analytics, setAnalytics] = useState([]);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (pixelId) {
      loadAnalytics();
      loadTrends();
    }
  }, [pixelId, selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/pixel/analytics/${pixelId}?days=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const response = await fetch(`/api/v2/pixel/analytics/${pixelId}/trends`);
      const data = await response.json();
      if (data.success) {
        setTrends(data.data);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const response = await fetch(`/api/v2/pixel/analytics/${pixelId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: selectedPeriod, format })
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-analytics-${pixelId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel-analytics-${pixelId}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    } finally {
      setExporting(false);
    }
  };

  const calculateAverage = (metric) => {
    if (analytics.length === 0) return 0;
    const sum = analytics.reduce((acc, day) => acc + (day[metric] || 0), 0);
    return (sum / analytics.length).toFixed(2);
  };

  const formatTrend = (value) => {
    const num = parseFloat(value);
    const isPositive = num > 0;
    return {
      value: Math.abs(num).toFixed(1),
      isPositive,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      icon: isPositive ? TrendingUp : TrendingDown
    };
  };

  const getTrendForMetric = (metric) => {
    if (!trends || !trends.last7Days) return null;
    return trends.last7Days[metric];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                className="border rounded px-3 py-1 text-sm"
              >
                {TIME_PERIODS.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div className="relative group">
              <button
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg py-1 hidden group-hover:block z-10">
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                >
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analytics.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Analytics Data
          </h3>
          <p className="text-gray-600">
            Analytics will appear here once your pixel starts tracking pages.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SEO Score Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-600">Avg SEO Score</span>
                </div>
                {getTrendForMetric('seoScore') && (
                  <TrendIndicator trend={getTrendForMetric('seoScore')} />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {calculateAverage('avg_seo_score')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Out of 100
              </div>
            </div>

            {/* Page Views Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-600">Page Views</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.reduce((sum, day) => sum + (day.page_views || 0), 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total in period
              </div>
            </div>

            {/* LCP Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-600">Avg LCP</span>
                </div>
                {getTrendForMetric('lcp') && (
                  <TrendIndicator trend={getTrendForMetric('lcp')} inverse />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(calculateAverage('avg_lcp') / 1000).toFixed(2)}s
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt;2.5s
              </div>
            </div>

            {/* Issues Card */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">Total Issues</span>
                </div>
                {getTrendForMetric('totalIssues') && (
                  <TrendIndicator trend={getTrendForMetric('totalIssues')} inverse />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.reduce((sum, day) => sum + (day.total_issues || 0), 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Detected in period
              </div>
            </div>
          </div>

          {/* SEO Score Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold mb-4">SEO Score Trend</h4>
            <SimpleLineChart
              data={analytics}
              dataKey="avg_seo_score"
              label="SEO Score"
              color="#3B82F6"
              maxValue={100}
            />
          </div>

          {/* Core Web Vitals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold mb-4">Core Web Vitals</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  LCP (Largest Contentful Paint)
                </div>
                <SimpleLineChart
                  data={analytics}
                  dataKey="avg_lcp"
                  label="LCP (ms)"
                  color="#10B981"
                  formatValue={(v) => `${(v / 1000).toFixed(2)}s`}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  FID (First Input Delay)
                </div>
                <SimpleLineChart
                  data={analytics}
                  dataKey="avg_fid"
                  label="FID (ms)"
                  color="#F59E0B"
                  formatValue={(v) => `${v}ms`}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">
                  CLS (Cumulative Layout Shift)
                </div>
                <SimpleLineChart
                  data={analytics}
                  dataKey="avg_cls"
                  label="CLS"
                  color="#EF4444"
                  formatValue={(v) => v.toFixed(3)}
                />
              </div>
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-semibold mb-4">Issue Breakdown Over Time</h4>
            <IssueStackedChart data={analytics} />
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SEO Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LCP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CLS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.map((day, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{day.page_views}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-semibold ${
                          day.avg_seo_score >= 80 ? 'text-green-600' :
                          day.avg_seo_score >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {day.avg_seo_score?.toFixed(1) || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {day.avg_lcp ? `${(day.avg_lcp / 1000).toFixed(2)}s` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {day.avg_fid ? `${day.avg_fid}ms` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {day.avg_cls ? day.avg_cls.toFixed(3) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">{day.critical_issues || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-orange-600">{day.high_issues || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-yellow-600">{day.medium_issues || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-blue-600">{day.low_issues || 0}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Trend Indicator Component
function TrendIndicator({ trend, inverse = false }) {
  const trendData = formatTrend(trend);
  const isGood = inverse ? !trendData.isPositive : trendData.isPositive;
  const Icon = trendData.icon;

  return (
    <div className={`flex items-center gap-1 text-xs ${isGood ? 'text-green-600' : 'text-red-600'}`}>
      <Icon className="w-3 h-3" />
      <span>{trendData.value}%</span>
    </div>
  );
}

function formatTrend(value) {
  const num = parseFloat(value);
  const isPositive = num > 0;
  return {
    value: Math.abs(num).toFixed(1),
    isPositive,
    color: isPositive ? 'text-green-600' : 'text-red-600',
    icon: isPositive ? TrendingUp : TrendingDown
  };
}

// Simple Line Chart Component (SVG-based)
function SimpleLineChart({ data, dataKey, label, color, maxValue, formatValue }) {
  if (data.length === 0) return null;

  const values = data.map(d => d[dataKey] || 0).reverse();
  const max = maxValue || Math.max(...values) * 1.1;
  const min = Math.min(...values) * 0.9;
  const range = max - min;

  const width = 600;
  const height = 150;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const latestValue = values[values.length - 1];
  const displayValue = formatValue ? formatValue(latestValue) : latestValue.toFixed(2);

  return (
    <div className="space-y-2">
      <div className="text-2xl font-bold" style={{ color }}>
        {displayValue}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
          const y = padding + chartHeight * (1 - percent);
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {values.map((value, index) => {
          const x = padding + (index / (values.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((value - min) / range) * chartHeight;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
}

// Issue Stacked Chart Component
function IssueStackedChart({ data }) {
  if (data.length === 0) return null;

  const reversedData = [...data].reverse();
  const maxIssues = Math.max(...reversedData.map(d => d.total_issues || 0));

  return (
    <div className="space-y-3">
      {reversedData.map((day, index) => {
        const total = day.total_issues || 0;
        const critical = day.critical_issues || 0;
        const high = day.high_issues || 0;
        const medium = day.medium_issues || 0;
        const low = day.low_issues || 0;

        return (
          <div key={index} className="flex items-center gap-3">
            <div className="text-xs text-gray-500 w-20">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="flex-1 flex h-8 bg-gray-100 rounded overflow-hidden">
              {critical > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center text-xs text-white font-semibold"
                  style={{ width: `${(critical / total) * 100}%` }}
                  title={`${critical} Critical`}
                >
                  {critical > 0 && critical}
                </div>
              )}
              {high > 0 && (
                <div
                  className="bg-orange-500 flex items-center justify-center text-xs text-white font-semibold"
                  style={{ width: `${(high / total) * 100}%` }}
                  title={`${high} High`}
                >
                  {high > 0 && high}
                </div>
              )}
              {medium > 0 && (
                <div
                  className="bg-yellow-500 flex items-center justify-center text-xs text-white font-semibold"
                  style={{ width: `${(medium / total) * 100}%` }}
                  title={`${medium} Medium`}
                >
                  {medium > 0 && medium}
                </div>
              )}
              {low > 0 && (
                <div
                  className="bg-blue-500 flex items-center justify-center text-xs text-white font-semibold"
                  style={{ width: `${(low / total) * 100}%` }}
                  title={`${low} Low`}
                >
                  {low > 0 && low}
                </div>
              )}
            </div>
            <div className="text-sm font-semibold text-gray-700 w-12 text-right">
              {total}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-600">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <span className="text-xs text-gray-600">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className="text-xs text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-xs text-gray-600">Low</span>
        </div>
      </div>
    </div>
  );
}
