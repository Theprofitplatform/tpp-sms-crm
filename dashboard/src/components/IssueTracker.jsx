/**
 * ISSUE TRACKER COMPONENT
 *
 * Displays SEO issues detected by the pixel with:
 * - Severity-based filtering
 * - Category grouping
 * - One-click resolution
 * - Copy-paste fix codes
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Copy,
  ExternalLink,
  Filter,
  Search,
  X
} from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    icon: AlertCircle
  },
  HIGH: {
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    icon: AlertTriangle
  },
  MEDIUM: {
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    icon: AlertTriangle
  },
  LOW: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    icon: Info
  }
};

export default function IssueTracker({ pixelId, onRefresh }) {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (pixelId) {
      loadIssues();
    }
  }, [pixelId]);

  useEffect(() => {
    filterIssues();
  }, [issues, selectedSeverity, selectedCategory, searchTerm]);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/pixel/issues/${pixelId}`);
      const data = await response.json();
      if (data.success) {
        setIssues(data.data);
      }
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIssues = () => {
    let filtered = [...issues];

    // Filter by severity
    if (selectedSeverity !== 'ALL') {
      filtered = filtered.filter(i => i.severity === selectedSeverity);
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(i => i.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.description.toLowerCase().includes(term) ||
        i.type.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term)
      );
    }

    setFilteredIssues(filtered);
  };

  const handleResolve = async (issueId) => {
    try {
      const response = await fetch(`/api/v2/pixel/issues/${issueId}/resolve`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        // Remove from list
        setIssues(issues.filter(i => i.issue_id !== issueId));
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error resolving issue:', error);
    }
  };

  const handleCopyCode = (code, issueId) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(issueId);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const categories = ['ALL', ...new Set(issues.map(i => i.category))];
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">SEO Issues ({filteredIssues.length})</h3>
          <button
            onClick={loadIssues}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              {severities.map(sev => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {(selectedSeverity !== 'ALL' || selectedCategory !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                setSelectedCategory('ALL');
                setSearchTerm('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Issues Found
            </h3>
            <p className="text-gray-600">
              {issues.length === 0
                ? "Great! No SEO issues detected."
                : "No issues match your current filters."}
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const config = SEVERITY_CONFIG[issue.severity];
            const Icon = config.icon;
            const isExpanded = expandedIssue === issue.id;

            return (
              <div
                key={issue.id}
                className={`bg-white rounded-lg shadow border-l-4 ${config.borderColor} overflow-hidden`}
              >
                {/* Issue Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`w-5 h-5 ${config.textColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${config.bgColor} ${config.textColor}`}>
                            {issue.severity}
                          </span>
                          <span className="text-xs text-gray-500">{issue.category}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {issue.description}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {issue.impact}
                        </p>
                        {issue.current_value && (
                          <div className="text-xs text-gray-500 mb-2">
                            Current: <span className="font-mono">{issue.current_value}</span>
                            {issue.target_value && (
                              <> → Target: <span className="font-mono">{issue.target_value}</span></>
                            )}
                          </div>
                        )}
                        {issue.estimated_time && (
                          <div className="text-xs text-gray-500">
                            ⏱️ Estimated fix time: {issue.estimated_time}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50"
                      >
                        {isExpanded ? 'Hide' : 'View'} Fix
                      </button>
                      <button
                        onClick={() => handleResolve(issue.issue_id)}
                        className="text-sm text-green-600 hover:text-green-700 px-3 py-1 rounded border border-green-600 hover:bg-green-50"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="space-y-3">
                        {/* Recommendation */}
                        <div>
                          <h5 className="font-semibold text-sm text-gray-900 mb-1">
                            💡 Recommendation
                          </h5>
                          <p className="text-sm text-gray-700">
                            {issue.recommendation}
                          </p>
                        </div>

                        {/* Fix Code */}
                        {issue.fix_code && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-sm text-gray-900">
                                🔧 Fix Code
                              </h5>
                              <button
                                onClick={() => handleCopyCode(issue.fix_code, issue.id)}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                {copiedCode === issue.id ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy Code
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                              <code>{issue.fix_code}</code>
                            </pre>
                          </div>
                        )}

                        {/* Learn More Link */}
                        <div>
                          <a
                            href={`https://developers.google.com/search/docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            Learn more about {issue.category}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      {filteredIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Total estimated fix time:{' '}
              <span className="font-semibold">
                {filteredIssues.reduce((sum, issue) => {
                  const time = issue.estimated_time || '';
                  const minutes = parseInt(time.match(/(\d+)/)?.[1] || 0);
                  return sum + minutes;
                }, 0)} minutes
              </span>
            </span>
            <span>
              Showing {filteredIssues.length} of {issues.length} issues
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
