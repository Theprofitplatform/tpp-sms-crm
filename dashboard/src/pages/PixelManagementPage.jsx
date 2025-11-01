/**
 * PIXEL MANAGEMENT PAGE
 *
 * Manage SEO monitoring pixels for clients
 * Enhanced with issue tracking, analytics, and health monitoring
 */

import { useState, useEffect } from 'react';
import {
  Code,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Copy,
  Trash2,
  RefreshCw,
  TrendingUp,
  Eye,
  Calendar,
  ExternalLink,
  BarChart3,
  FileText,
  Shield
} from 'lucide-react';
import IssueTracker from '../components/IssueTracker.jsx';
import IssueSummaryCards from '../components/IssueSummaryCards.jsx';
import AnalyticsDashboard from '../components/AnalyticsDashboard.jsx';
import PixelHealthIndicator from '../components/PixelHealthIndicator.jsx';

export default function PixelManagementPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [pixels, setPixels] = useState([]);
  const [pixelPages, setPixelPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPixel, setNewPixel] = useState({
    domain: '',
    deploymentType: 'header',
    features: ['meta-tracking', 'performance', 'schema'],
    debug: false
  });
  const [generatedPixel, setGeneratedPixel] = useState(null);
  const [selectedPixelId, setSelectedPixelId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [issueFilters, setIssueFilters] = useState({});

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Load pixels when client selected
  useEffect(() => {
    if (selectedClient) {
      loadPixels(selectedClient);
      loadPixelPages(selectedClient);
    }
  }, [selectedClient]);

  // Auto-select first active pixel when pixels load
  useEffect(() => {
    if (pixels.length > 0 && !selectedPixelId) {
      const activePixel = pixels.find(p => p.status === 'active');
      if (activePixel) {
        setSelectedPixelId(activePixel.id);
      }
    }
  }, [pixels]);

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

  const loadPixels = async (clientId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/pixel/status/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setPixels(data.data);
      }
    } catch (error) {
      console.error('Error loading pixels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPixelPages = async (clientId, pixelId = null) => {
    try {
      const url = pixelId
        ? `/api/v2/pixel/pages/${clientId}?pixelId=${pixelId}`
        : `/api/v2/pixel/pages/${clientId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPixelPages(data.data);
      }
    } catch (error) {
      console.error('Error loading pixel pages:', error);
    }
  };

  const generatePixel = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/pixel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          ...newPixel
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedPixel(data.data);
        loadPixels(selectedClient);
      }
    } catch (error) {
      console.error('Error generating pixel:', error);
      alert('Failed to generate pixel');
    } finally {
      setLoading(false);
    }
  };

  const deactivatePixel = async (pixelId) => {
    if (!confirm('Are you sure you want to deactivate this pixel?')) return;

    try {
      const response = await fetch('/api/v2/pixel/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          pixelId
        })
      });

      const data = await response.json();
      if (data.success) {
        loadPixels(selectedClient);
        alert('Pixel deactivated successfully');
      }
    } catch (error) {
      console.error('Error deactivating pixel:', error);
      alert('Failed to deactivate pixel');
    }
  };

  const deletePixel = async (pixelId) => {
    if (!confirm('Are you sure you want to delete this pixel? This will delete all tracked data.')) return;

    try {
      const response = await fetch(`/api/v2/pixel/${selectedClient}/${pixelId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        loadPixels(selectedClient);
        alert('Pixel deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting pixel:', error);
      alert('Failed to delete pixel');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (pixel) => {
    if (pixel.status === 'inactive') {
      return <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">Inactive</span>;
    }
    if (!pixel.isActive) {
      return <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-700 rounded flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Offline
      </span>;
    }
    return <span className="px-2 py-1 text-xs bg-green-200 text-green-700 rounded flex items-center gap-1">
      <CheckCircle className="w-3 h-3" /> Active
    </span>;
  };

  const getSEOScoreBadge = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleIssueFilterChange = (filters) => {
    setIssueFilters(filters);
    setActiveTab('issues');
  };

  const selectedPixel = pixels.find(p => p.id === selectedPixelId);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'health', label: 'Health', icon: Shield },
    { id: 'pages', label: 'Pages', icon: FileText }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pixel Management</h1>
        <p className="text-gray-600">
          Deploy lightweight SEO monitoring pixels to track and optimize any website
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
          <Code className="w-4 h-4" />
          Generate New Pixel
        </button>
      </div>

      {selectedClient && (
        <>
          {/* Pixel Selector */}
          {pixels.length > 0 && (
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Pixel for Detailed View:
              </label>
              <select
                value={selectedPixelId || ''}
                onChange={(e) => setSelectedPixelId(parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a pixel...</option>
                {pixels.map(pixel => (
                  <option key={pixel.id} value={pixel.id}>
                    {pixel.domain} - {pixel.status} ({pixel.pages_tracked} pages)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="mb-6 bg-white rounded-lg shadow">
            <div className="border-b">
              <nav className="flex -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors
                        ${isActive
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Active Pixels</h3>
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {pixels.filter(p => p.status === 'active').length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Pages Tracked</h3>
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {pixels.reduce((sum, p) => sum + (p.pages_tracked || 0), 0)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Online Now</h3>
                <CheckCircle className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {pixels.filter(p => p.isActive).length}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg SEO Score</h3>
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {pixelPages.length > 0
                  ? Math.round(pixelPages.reduce((sum, p) => sum + p.seo_score, 0) / pixelPages.length)
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Pixels List */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Deployed Pixels</h2>
              <button
                onClick={() => loadPixels(selectedClient)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {loading && pixels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Loading pixels...</div>
              ) : pixels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pixels deployed yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Generate your first pixel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pixels.map(pixel => (
                    <div key={pixel.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{pixel.domain}</h3>
                            {getStatusBadge(pixel)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Deployment:</span> {pixel.deployment_type}
                            </div>
                            <div>
                              <span className="font-medium">Pages Tracked:</span> {pixel.pages_tracked}
                            </div>
                            <div>
                              <span className="font-medium">Last Seen:</span> {formatDate(pixel.last_ping_at)}
                            </div>
                            <div>
                              <span className="font-medium">Last URL:</span>{' '}
                              {pixel.last_seen_url ? (
                                <a
                                  href={pixel.last_seen_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : 'N/A'}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Features: </span>
                            {pixel.features_enabled.map(feature => (
                              <span key={feature} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setGeneratedPixel({
                                pixelCode: pixel.pixel_code,
                                apiKey: pixel.api_key
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                            title="View Code"
                          >
                            <Code className="w-5 h-5" />
                          </button>
                          {pixel.status === 'active' && (
                            <button
                              onClick={() => deactivatePixel(pixel.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded"
                              title="Deactivate"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deletePixel(pixel.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pixels List */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Deployed Pixels</h2>
              <button
                onClick={() => loadPixels(selectedClient)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {loading && pixels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Loading pixels...</div>
              ) : pixels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pixels deployed yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    Generate your first pixel
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pixels.map(pixel => (
                    <div key={pixel.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${selectedPixelId === pixel.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`} onClick={() => setSelectedPixelId(pixel.id)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{pixel.domain}</h3>
                            {getStatusBadge(pixel)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Deployment:</span> {pixel.deployment_type}
                            </div>
                            <div>
                              <span className="font-medium">Pages Tracked:</span> {pixel.pages_tracked}
                            </div>
                            <div>
                              <span className="font-medium">Last Seen:</span> {formatDate(pixel.last_ping_at)}
                            </div>
                            <div>
                              <span className="font-medium">Last URL:</span>{' '}
                              {pixel.last_seen_url ? (
                                <a
                                  href={pixel.last_seen_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : 'N/A'}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Features: </span>
                            {pixel.features_enabled.map(feature => (
                              <span key={feature} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded mr-2">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setGeneratedPixel({
                                pixelCode: pixel.pixel_code,
                                apiKey: pixel.api_key
                              });
                              setShowCreateModal(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                            title="View Code"
                          >
                            <Code className="w-5 h-5" />
                          </button>
                          {pixel.status === 'active' && (
                            <button
                              onClick={() => deactivatePixel(pixel.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-100 rounded"
                              title="Deactivate"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deletePixel(pixel.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && selectedPixelId && (
            <div className="space-y-6">
              <IssueSummaryCards
                pixelId={selectedPixelId}
                onFilterChange={handleIssueFilterChange}
              />
              <IssueTracker
                pixelId={selectedPixelId}
                onRefresh={() => loadPixels(selectedClient)}
              />
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && selectedPixelId && (
            <AnalyticsDashboard pixelId={selectedPixelId} />
          )}

          {/* Health Tab */}
          {activeTab === 'health' && selectedPixelId && (
            <PixelHealthIndicator
              pixelId={selectedPixelId}
              lastPingAt={selectedPixel?.last_ping_at}
            />
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Tracked Pages</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SEO Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Tracked</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pixelPages.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No pages tracked yet
                      </td>
                    </tr>
                  ) : (
                    pixelPages.map(page => (
                      <tr key={page.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{page.page_title || 'Untitled'}</p>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {page.url}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSEOScoreBadge(page.seo_score)}`}>
                            {page.seo_score}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {page.issues_detected.length > 0 ? (
                            <div className="space-y-1">
                              {page.issues_detected.slice(0, 2).map((issue, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  {issue.type === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                                  {issue.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                                  {issue.type === 'info' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                  <span className="text-gray-700">{issue.message}</span>
                                </div>
                              ))}
                              {page.issues_detected.length > 2 && (
                                <p className="text-xs text-gray-500">
                                  +{page.issues_detected.length - 2} more issues
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" /> No issues
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(page.created_at)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* No Pixel Selected Message */}
          {(activeTab === 'issues' || activeTab === 'analytics' || activeTab === 'health') && !selectedPixelId && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Pixel Selected
              </h3>
              <p className="text-gray-600">
                Please select a pixel from the dropdown above to view detailed {activeTab} information.
              </p>
            </div>
          )}
        </>
      )}

      {/* Create/View Pixel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {generatedPixel ? 'Pixel Installation' : 'Generate New Pixel'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setGeneratedPixel(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {!generatedPixel ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={newPixel.domain}
                      onChange={(e) => setNewPixel({ ...newPixel, domain: e.target.value })}
                      placeholder="example.com"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deployment Type
                    </label>
                    <select
                      value={newPixel.deploymentType}
                      onChange={(e) => setNewPixel({ ...newPixel, deploymentType: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="header">Header (Recommended)</option>
                      <option value="body">Body</option>
                      <option value="footer">Footer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Features
                    </label>
                    <div className="space-y-2">
                      {['meta-tracking', 'performance', 'schema', 'live-updates'].map(feature => (
                        <label key={feature} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newPixel.features.includes(feature)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewPixel({
                                  ...newPixel,
                                  features: [...newPixel.features, feature]
                                });
                              } else {
                                setNewPixel({
                                  ...newPixel,
                                  features: newPixel.features.filter(f => f !== feature)
                                });
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPixel.debug}
                        onChange={(e) => setNewPixel({ ...newPixel, debug: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Enable debug mode (console logging)</span>
                    </label>
                  </div>

                  <button
                    onClick={generatePixel}
                    disabled={!newPixel.domain || loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Pixel'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Pixel Generated Successfully!
                    </h3>
                    <p className="text-sm text-green-700">
                      Copy the code below and paste it in your website's &lt;head&gt; section.
                    </p>
                  </div>

                  {generatedPixel.installationInstructions && (
                    <div>
                      <h4 className="font-semibold mb-2">Installation Instructions:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        {generatedPixel.installationInstructions.steps?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Pixel Code
                      </label>
                      <button
                        onClick={() => copyToClipboard(generatedPixel.pixelCode)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Code
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      {generatedPixel.pixelCode}
                    </pre>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Important:</strong> After installation, refresh your website to activate tracking.
                      It may take a few minutes for data to appear.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
