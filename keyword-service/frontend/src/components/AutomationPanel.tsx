import React, { useState } from 'react';
import { AlertCircle, Clock, Zap, Target, CheckCircle, Play } from 'lucide-react';

interface AutomationPanelProps {
  projectId: number;
}

interface Alert {
  type: string;
  keyword: string;
  action: string;
  urgency: 'high' | 'medium' | 'low';
  data?: any;
}

interface Gap {
  type: string;
  topic?: string;
  page_group?: string;
  opportunity: number;
  priority: number;
  recommended_action: string;
}

export const AutomationPanel: React.FC<AutomationPanelProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'gaps' | 'schedule'>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/project/${projectId}/alerts`);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGaps = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/project/${projectId}/gaps`);
      const data = await response.json();
      if (data.success) {
        setGaps(data.gaps || []);
      }
    } catch (error) {
      console.error('Error fetching gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/project/${projectId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency: scheduleFrequency })
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ ${scheduleFrequency} automation scheduled!`);
      }
    } catch (error) {
      console.error('Error setting up schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncToNotion = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automation/project/${projectId}/sync-notion`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Created ${data.pages_created} pages in Notion!`);
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing to Notion:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts();
    } else if (activeTab === 'gaps') {
      fetchGaps();
    }
  }, [activeTab, projectId]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-blue-500" />
          Automation
        </h2>
        <div className="flex gap-2">
          <button
            onClick={syncToNotion}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Sync to Notion
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'alerts'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Opportunity Alerts
          </div>
        </button>
        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'gaps'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Content Gaps
          </div>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'schedule'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Schedule
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No urgent alerts</p>
                  <p className="text-sm">All opportunities are being tracked</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getUrgencyColor(alert.urgency)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getUrgencyIcon(alert.urgency)}</span>
                          <span className="font-semibold uppercase text-sm">
                            {alert.type.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-white">
                            {alert.urgency.toUpperCase()}
                          </span>
                        </div>
                        <p className="font-medium text-lg mb-1">{alert.keyword}</p>
                        <p className="text-sm">{alert.action}</p>
                        {alert.data && (
                          <div className="mt-2 text-xs space-y-1">
                            {alert.data.difficulty && (
                              <p>Difficulty: {alert.data.difficulty}/100</p>
                            )}
                            {alert.data.opportunity && (
                              <p>Opportunity: {alert.data.opportunity.toFixed(1)}/100</p>
                            )}
                            {alert.data.volume && <p>Volume: {alert.data.volume}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Gaps Tab */}
          {activeTab === 'gaps' && (
            <div className="space-y-4">
              {gaps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No content gaps found</p>
                  <p className="text-sm">Your content coverage is excellent!</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>{gaps.length} content gaps</strong> identified. Priority score indicates urgency (0-100).
                    </p>
                  </div>
                  {gaps.slice(0, 10).map((gap, index) => (
                    <div key={index} className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {gap.type.replace(/_/g, ' ')}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              Priority: {gap.priority}/100
                            </span>
                          </div>
                          <p className="font-medium text-lg mb-1">
                            {gap.topic || gap.page_group}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            Action: {gap.recommended_action.replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Opportunity: {gap.opportunity.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Setup Automated Refresh</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Automatically refresh SERP data, update difficulty scores, and detect new opportunities.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refresh Frequency
                    </label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Daily (2 AM)</option>
                      <option value="weekly">Weekly (Monday 2 AM)</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly (1st of month)</option>
                    </select>
                  </div>
                  <button
                    onClick={setupSchedule}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Enable {scheduleFrequency} Automation
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h4 className="font-semibold">What Gets Automated</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Re-fetch SERP data</li>
                    <li>• Update difficulty scores</li>
                    <li>• Re-calculate opportunities</li>
                    <li>• Monitor trend changes</li>
                    <li>• Detect SERP volatility</li>
                  </ul>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <h4 className="font-semibold">Benefits</h4>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Always fresh data</li>
                    <li>• Catch opportunities early</li>
                    <li>• Track competitor changes</li>
                    <li>• Zero manual work</li>
                    <li>• Never miss trending topics</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
