/**
 * SCHEMA AUTOMATION PAGE
 *
 * AI-powered schema markup detection and generation
 * Automatic schema opportunities and management
 */

import { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Sparkles,
  TrendingUp,
  Eye,
  Trash2,
  RefreshCw,
  FileCode,
  Target,
  Award
} from 'lucide-react';

export default function SchemaAutomationPage() {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [appliedSchemas, setAppliedSchemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [generatedSchema, setGeneratedSchema] = useState(null);
  const [generatingSchema, setGeneratingSchema] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [activeTab, setActiveTab] = useState('opportunities'); // 'opportunities' or 'applied'

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadOpportunities(selectedClient);
      loadAppliedSchemas(selectedClient);
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

  const loadOpportunities = async (clientId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v2/schema/opportunities/${clientId}?status=new`);
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data);
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppliedSchemas = async (clientId) => {
    try {
      const response = await fetch(`/api/v2/schema/applied/${clientId}`);
      const data = await response.json();
      if (data.success) {
        setAppliedSchemas(data.data);
      }
    } catch (error) {
      console.error('Error loading applied schemas:', error);
    }
  };

  const generateSchema = async (opportunity) => {
    try {
      setGeneratingSchema(true);
      setSelectedOpportunity(opportunity);
      setShowSchemaModal(true);

      const response = await fetch('/api/v2/schema/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaType: opportunity.schema_type,
          detectedData: opportunity.detected_data,
          pageContext: {
            url: opportunity.page_url,
            clientId: opportunity.client_id
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedSchema(data.data.schema);
      } else {
        alert('Failed to generate schema: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating schema:', error);
      alert('Failed to generate schema');
    } finally {
      setGeneratingSchema(false);
    }
  };

  const applySchema = async () => {
    if (!selectedOpportunity || !generatedSchema) return;

    try {
      setLoading(true);
      const response = await fetch('/api/v2/schema/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient,
          pageUrl: selectedOpportunity.page_url,
          schemaType: selectedOpportunity.schema_type,
          schemaData: generatedSchema,
          opportunityId: selectedOpportunity.id
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Schema applied successfully!');
        setShowSchemaModal(false);
        setSelectedOpportunity(null);
        setGeneratedSchema(null);
        loadOpportunities(selectedClient);
        loadAppliedSchemas(selectedClient);
      } else {
        alert('Failed to apply schema: ' + data.error);
      }
    } catch (error) {
      console.error('Error applying schema:', error);
      alert('Failed to apply schema');
    } finally {
      setLoading(false);
    }
  };

  const removeSchema = async (schemaId) => {
    if (!confirm('Are you sure you want to remove this schema?')) return;

    try {
      const response = await fetch(`/api/v2/schema/${selectedClient}/${schemaId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('Schema removed successfully');
        loadAppliedSchemas(selectedClient);
      }
    } catch (error) {
      console.error('Error removing schema:', error);
      alert('Failed to remove schema');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    return badges[priority] || badges.medium;
  };

  const getImpactBadge = (impact) => {
    const badges = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700'
    };
    return badges[impact] || badges.medium;
  };

  const getSchemaIcon = (schemaType) => {
    const icons = {
      Article: FileCode,
      Product: Target,
      LocalBusiness: Award,
      FAQPage: Code,
      HowTo: Zap,
      Recipe: Sparkles,
      Review: CheckCircle,
      Event: AlertTriangle,
      Organization: Award,
      BreadcrumbList: Code
    };
    const Icon = icons[schemaType] || FileCode;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schema Automation</h1>
        <p className="text-gray-600">
          AI-powered schema markup detection and generation for rich search results
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
      </div>

      {selectedClient && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Opportunities</h3>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{opportunities.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {opportunities.filter(o => o.priority === 'high').length} high priority
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Applied Schemas</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{appliedSchemas.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {appliedSchemas.filter(s => s.auto_generated).length} AI-generated
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg Confidence</h3>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {opportunities.length > 0
                  ? Math.round(opportunities.reduce((sum, o) => sum + o.confidence_score, 0) / opportunities.length)
                  : 0}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">High Impact</h3>
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {opportunities.filter(o => o.estimated_impact === 'high').length}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'opportunities'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Opportunities ({opportunities.length})
            </button>
            <button
              onClick={() => setActiveTab('applied')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'applied'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Applied Schemas ({appliedSchemas.length})
            </button>
          </div>

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold">Schema Opportunities</h2>
                <button
                  onClick={() => loadOpportunities(selectedClient)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {loading && opportunities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Loading opportunities...</div>
                ) : opportunities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No schema opportunities found yet</p>
                    <p className="text-sm mt-2">
                      Schema opportunities are detected automatically when pages are analyzed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opportunities.map(opp => (
                      <div key={opp.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              {getSchemaIcon(opp.schema_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{opp.schema_type}</h3>
                                <span className={`px-2 py-1 text-xs rounded ${getPriorityBadge(opp.priority)}`}>
                                  {opp.priority} priority
                                </span>
                                <span className={`px-2 py-1 text-xs rounded ${getImpactBadge(opp.estimated_impact)}`}>
                                  {opp.estimated_impact} impact
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{opp.page_url}</p>
                              <p className="text-sm text-gray-700 mb-3">{opp.recommendation}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Target className="w-4 h-4" />
                                  Confidence: {opp.confidence_score}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => generateSchema(opp)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                          >
                            <Sparkles className="w-4 h-4" />
                            Generate & Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Applied Schemas Tab */}
          {activeTab === 'applied' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold">Applied Schemas</h2>
                <button
                  onClick={() => loadAppliedSchemas(selectedClient)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appliedSchemas.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No schemas applied yet
                        </td>
                      </tr>
                    ) : (
                      appliedSchemas.map(schema => (
                        <tr key={schema.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getSchemaIcon(schema.schema_type)}
                              <span className="font-medium">{schema.schema_type}</span>
                              {schema.auto_generated && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                                  AI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={schema.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {schema.page_url}
                            </a>
                          </td>
                          <td className="px-6 py-4">
                            {schema.status === 'active' ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {schema.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(schema.applied_at || schema.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setGeneratedSchema(schema.schema_data);
                                  setShowSchemaModal(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                                title="View Schema"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeSchema(schema.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded"
                                title="Remove Schema"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </>
      )}

      {/* Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {selectedOpportunity ? `${selectedOpportunity.schema_type} Schema` : 'Schema Details'}
              </h2>
              <button
                onClick={() => {
                  setShowSchemaModal(false);
                  setSelectedOpportunity(null);
                  setGeneratedSchema(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {generatingSchema ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
                  <p className="text-gray-600">AI is generating schema markup...</p>
                </div>
              ) : generatedSchema ? (
                <>
                  {selectedOpportunity && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">About This Schema</h3>
                      <p className="text-sm text-blue-700 mb-2">{selectedOpportunity.recommendation}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-blue-600">
                          Confidence: {selectedOpportunity.confidence_score}%
                        </span>
                        <span className="text-blue-600">
                          Impact: {selectedOpportunity.estimated_impact}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Generated Schema (JSON-LD)
                    </label>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                      {JSON.stringify(generatedSchema, null, 2)}
                    </pre>
                  </div>

                  {selectedOpportunity && (
                    <div className="flex gap-3">
                      <button
                        onClick={applySchema}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        {loading ? 'Applying...' : 'Apply This Schema'}
                      </button>
                      <button
                        onClick={() => {
                          setShowSchemaModal(false);
                          setSelectedOpportunity(null);
                          setGeneratedSchema(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>What happens when you apply?</strong>
                      <br />
                      This schema will be added to the page, helping search engines understand your content better
                      and enabling rich results like FAQ boxes, product cards, and more.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No schema data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
