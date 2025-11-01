/**
 * SERVER-SIDE RENDERING OPTIMIZATION PAGE
 *
 * Apply SEO optimizations without CMS access
 * Works with any platform (Shopify, Wix, Squarespace, static sites)
 */

import { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  RotateCcw,
  Trash2,
  RefreshCw,
  Eye,
  Play,
  BarChart3,
  Globe
} from 'lucide-react';

export default function SSROptimizationPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [optimizations, setOptimizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newOptimization, setNewOptimization] = useState({
    domain: '',
    pageUrl: '',
    optimizationType: 'title',
    optimizedValue: ''
  });

  const optimizationTypes = [
    { value: 'title', label: 'Title Tag', description: 'Update page title' },
    { value: 'meta_description', label: 'Meta Description', description: 'Update meta description' },
    { value: 'schema', label: 'Schema Markup', description: 'Add structured data' },
    { value: 'canonical', label: 'Canonical URL', description: 'Set canonical link' },
    { value: 'hreflang', label: 'Hreflang Tags', description: 'Add language alternatives' },
    { value: 'og_tags', label: 'Open Graph Tags', description: 'Social media meta tags' },
    { value: 'robots_meta', label: 'Robots Meta', description: 'Control indexing' }
  ];

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadOptimizations(selectedClient);
      loadStats(selectedClient);
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
        if (data.clients.length > 0) {
          setSelectedClient(data.clients[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadOptimizations = async (clientId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/ssr/optimizations/${clientId}?status=active`);
      const data = await response.json();
      if (data.success) {
        setOptimizations(data.data);
      }
    } catch (error) {
      console.error('Error loading optimizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (clientId) => {
    try {
      const response = await fetch(`/api/v2/ssr/stats/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createOptimization = async () => {
    try {
      setLoading(true);

      // Validate JSON for schema and og_tags
      if (['schema', 'og_tags', 'hreflang'].includes(newOptimization.optimizationType)) {
        try {
          JSON.parse(newOptimization.optimizedValue);
        } catch (e) {
          alert('Invalid JSON format. Please check your input.');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/v2/ssr/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          ...newOptimization
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Optimization created successfully!');
        setShowCreateModal(false);
        setNewOptimization({
          domain: '',
          pageUrl: '',
          optimizationType: 'title',
          optimizedValue: ''
        });
        loadOptimizations(selectedClient);
        loadStats(selectedClient);
      } else {
        alert('Failed to create optimization: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating optimization:', error);
      alert('Failed to create optimization');
    } finally {
      setLoading(false);
    }
  };

  const testOptimization = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/v2/ssr/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: '<html><head><title>Test</title></head><body>Test content</body></html>',
          optimizationType: newOptimization.optimizationType,
          optimizedValue: newOptimization.optimizedValue
        })
      });

      const data = await response.json();
      if (data.success) {
        setTestResult(data);
        setShowTestModal(true);
      } else {
        alert('Test failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error testing optimization:', error);
      alert('Failed to test optimization');
    } finally {
      setLoading(false);
    }
  };

  const deactivateOptimization = async (optimizationId) => {
    if (!confirm('Are you sure you want to deactivate this optimization?')) return;

    try {
      const response = await fetch('/api/v2/ssr/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          optimizationId
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Optimization deactivated');
        loadOptimizations(selectedClient);
        loadStats(selectedClient);
      }
    } catch (error) {
      console.error('Error deactivating optimization:', error);
      alert('Failed to deactivate optimization');
    }
  };

  const rollbackOptimization = async (optimizationId) => {
    const reason = prompt('Reason for rollback:');
    if (!reason) return;

    try {
      const response = await fetch('/api/v2/ssr/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          optimizationId,
          reason
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Optimization rolled back');
        loadOptimizations(selectedClient);
        loadStats(selectedClient);
      }
    } catch (error) {
      console.error('Error rolling back optimization:', error);
      alert('Failed to rollback optimization');
    }
  };

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all cache?')) return;

    try {
      const response = await fetch('/api/v2/ssr/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        loadStats(selectedClient);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    }
  };

  const getStatusBadge = (optimization) => {
    if (optimization.status === 'active') {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Active
      </span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
      {optimization.status}
    </span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Server-Side Optimizations</h1>
        <p className="text-gray-600">
          Apply SEO optimizations without CMS access - Works with any platform
        </p>
      </div>

      {/* Client Selector */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium text-gray-700">Client:</label>
        <select
          value={selectedClient || ''}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a client</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.domain})
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Create Optimization
        </button>
      </div>

      {selectedClient && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Active Optimizations</h3>
                <Server className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.stats.reduce((sum, s) => sum + s.count_by_type, 0)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Pages Optimized</h3>
                <Globe className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {optimizations.length > 0 ? new Set(optimizations.map(o => o.page_url)).size : 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Serves</h3>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {optimizations.reduce((sum, o) => sum + (o.serve_count || 0), 0)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Cache Hits</h3>
                <BarChart3 className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.cacheStats?.total_cache_hits || 0}
              </p>
            </div>
          </div>

          {/* Optimization Types Breakdown */}
          {stats.stats.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <h2 className="text-xl font-semibold mb-4">Optimization Types</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.stats.map(stat => (
                  <div key={stat.optimization_type} className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600">{stat.optimization_type.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.count_by_type}</p>
                    <p className="text-xs text-gray-500">{stat.total_serves} serves</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimizations List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Active Optimizations</h2>
              <div className="flex gap-2">
                <button
                  onClick={clearCache}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Cache
                </button>
                <button
                  onClick={() => loadOptimizations(selectedClient)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serves</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && optimizations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Loading optimizations...
                      </td>
                    </tr>
                  ) : optimizations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No optimizations created yet</p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="mt-4 text-blue-600 hover:underline"
                        >
                          Create your first optimization
                        </button>
                      </td>
                    </tr>
                  ) : (
                    optimizations.map(opt => (
                      <tr key={opt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {opt.optimization_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={opt.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {opt.page_url}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate text-sm text-gray-700">
                            {opt.optimized_value.length > 50
                              ? opt.optimized_value.substring(0, 50) + '...'
                              : opt.optimized_value}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {opt.serve_count || 0}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(opt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => rollbackOptimization(opt.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded"
                              title="Rollback"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deactivateOptimization(opt.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded"
                              title="Deactivate"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Optimization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Server-Side Optimization</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={newOptimization.domain}
                  onChange={(e) => setNewOptimization({ ...newOptimization, domain: e.target.value })}
                  placeholder="example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page URL
                </label>
                <input
                  type="text"
                  value={newOptimization.pageUrl}
                  onChange={(e) => setNewOptimization({ ...newOptimization, pageUrl: e.target.value })}
                  placeholder="https://example.com/page"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optimization Type
                </label>
                <select
                  value={newOptimization.optimizationType}
                  onChange={(e) => setNewOptimization({ ...newOptimization, optimizationType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {optimizationTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optimized Value
                  {['schema', 'og_tags', 'hreflang'].includes(newOptimization.optimizationType) && (
                    <span className="text-xs text-gray-500 ml-2">(JSON format required)</span>
                  )}
                </label>
                <textarea
                  value={newOptimization.optimizedValue}
                  onChange={(e) => setNewOptimization({ ...newOptimization, optimizedValue: e.target.value })}
                  placeholder={
                    newOptimization.optimizationType === 'schema'
                      ? '{"@context": "https://schema.org", "@type": "Article", ...}'
                      : newOptimization.optimizationType === 'og_tags'
                      ? '{"title": "...", "description": "...", "image": "..."}'
                      : 'Enter optimized value...'
                  }
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> This optimization will be applied on-the-fly when pages are served.
                  No changes are made to your actual website files.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={testOptimization}
                  disabled={loading || !newOptimization.optimizedValue}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Test First
                </button>
                <button
                  onClick={createOptimization}
                  disabled={loading || !newOptimization.domain || !newOptimization.pageUrl || !newOptimization.optimizedValue}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Optimization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Result Modal */}
      {showTestModal && testResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Test Result</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {testResult.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Test Successful!
                  </h3>
                  <p className="text-sm text-green-700">
                    The optimization was applied successfully to the test HTML.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Test Failed
                  </h3>
                  <p className="text-sm text-red-700">{testResult.error}</p>
                </div>
              )}

              {testResult.preview && (
                <div>
                  <h4 className="font-semibold mb-2">Preview:</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(testResult.preview, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
