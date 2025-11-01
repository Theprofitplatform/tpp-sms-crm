/**
 * ISSUE SUMMARY CARDS COMPONENT
 *
 * Displays issue overview with:
 * - Total issues count
 * - Severity breakdown
 * - Category distribution
 * - Quick action links
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingDown,
  FileText,
  Clock,
  Target
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: {
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    icon: AlertCircle,
    label: 'Critical'
  },
  high: {
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    icon: AlertTriangle,
    label: 'High'
  },
  medium: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    icon: AlertTriangle,
    label: 'Medium'
  },
  low: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    icon: Info,
    label: 'Low'
  }
};

export default function IssueSummaryCards({ pixelId, onFilterChange }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pixelId) {
      loadSummary();
    }
  }, [pixelId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/pixel/issues/${pixelId}/summary`);
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading issue summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeverityClick = (severity) => {
    if (onFilterChange) {
      onFilterChange({ severity: severity.toUpperCase() });
    }
  };

  const handleCategoryClick = (category) => {
    if (onFilterChange) {
      onFilterChange({ category });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) return null;

  const totalIssues = summary.total || 0;
  const resolvedIssues = summary.resolved || 0;
  const openIssues = totalIssues - resolvedIssues;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issues Card */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Total Issues</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{totalIssues}</div>
          <div className="mt-2 text-xs text-gray-500">
            {openIssues} open · {resolvedIssues} resolved
          </div>
        </div>

        {/* Critical Issues Card */}
        <SeverityCard
          severity="critical"
          count={summary.critical || 0}
          onClick={() => handleSeverityClick('critical')}
        />

        {/* High Issues Card */}
        <SeverityCard
          severity="high"
          count={summary.high || 0}
          onClick={() => handleSeverityClick('high')}
        />

        {/* Medium + Low Issues Card */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Medium + Low</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {(summary.medium || 0) + (summary.low || 0)}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {summary.medium || 0} medium · {summary.low || 0} low
          </div>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Severity Breakdown
        </h4>

        <div className="space-y-3">
          {['critical', 'high', 'medium', 'low'].map((severity) => {
            const config = SEVERITY_CONFIG[severity];
            const count = summary[severity] || 0;
            const percentage = totalIssues > 0 ? (count / totalIssues) * 100 : 0;
            const Icon = config.icon;

            return (
              <div
                key={severity}
                onClick={() => handleSeverityClick(severity)}
                className="cursor-pointer hover:bg-gray-50 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${config.color}-500 transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Distribution */}
      {summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Issues by Category
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(summary.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => {
                const percentage = totalIssues > 0 ? (count / totalIssues) * 100 : 0;

                return (
                  <div
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{category}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {percentage.toFixed(0)}% of total issues
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resolution Status
        </h4>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-semibold text-gray-900">
                {resolvedIssues} of {totalIssues} resolved
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="text-center px-6 border-l">
            <div className="text-3xl font-bold text-green-600">
              {totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Complete</div>
          </div>
        </div>

        {openIssues > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingDown className="w-4 h-4" />
              <span>
                {openIssues} issue{openIssues !== 1 ? 's' : ''} remaining
              </span>
            </div>
          </div>
        )}
      </div>

      {/* All Issues Clear State */}
      {totalIssues === 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            All Clear!
          </h3>
          <p className="text-gray-600">
            No SEO issues detected. Your site is performing great!
          </p>
        </div>
      )}
    </div>
  );
}

// Severity Card Component
function SeverityCard({ severity, count, onClick }) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-6 border-l-4 ${config.borderColor} cursor-pointer hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.textColor}`} />
          <span className="text-sm font-medium text-gray-600">{config.label} Issues</span>
        </div>
      </div>
      <div className={`text-3xl font-bold ${config.textColor}`}>{count}</div>
      <div className="mt-2 text-xs text-gray-500">
        {count === 0 ? 'None detected' : count === 1 ? 'Requires attention' : 'Require attention'}
      </div>
    </div>
  );
}
