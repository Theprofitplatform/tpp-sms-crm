import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, TrendingUp, Target, Zap, Award } from 'lucide-react';
import { Card, StatCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useProject } from '@/hooks/useProjects';
import { useKeywords } from '@/hooks/useKeywords';
import { useAnalytics } from '@/hooks/useAnalytics';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { KeywordTable } from '@/components/tables/KeywordTable';
import { IntentDistributionChart } from '@/components/charts/IntentDistributionChart';
import { DifficultyVolumeChart } from '@/components/charts/DifficultyVolumeChart';
import { OpportunityFunnelChart } from '@/components/charts/OpportunityFunnelChart';
import { TrafficTimelineChart } from '@/components/charts/TrafficTimelineChart';
import { AutomationPanel } from '@/components/AutomationPanel';
import { exportApi } from '@/services/api';
import { formatNumber } from '@/utils/format';

export const ProjectDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0');

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: keywordsData, isLoading: keywordsLoading } = useKeywords(projectId, { limit: 100 });
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(projectId);

  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'analytics' | 'automation'>('overview');

  if (projectLoading) {
    return <LoadingSpinner message="Loading project..." />;
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Project Not Found</h2>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const keywords = keywordsData?.keywords || [];

  // Prepare chart data
  const intentData = Object.entries(project.intent_distribution || {}).map(([name, value]) => ({
    name,
    value,
    color: {
      informational: '#3B82F6',
      commercial: '#EAB308',
      transactional: '#10B981',
      navigational: '#8B5CF6',
      local: '#F97316',
    }[name] || '#6B7280',
  }));

  const difficultyVolumeData = keywords.slice(0, 50).map((kw) => ({
    keyword: kw.text,
    volume: kw.volume || 0,
    difficulty: typeof kw.difficulty === 'string' ? parseFloat(kw.difficulty) : kw.difficulty || 0,
    opportunity: typeof kw.opportunity === 'string' ? parseFloat(kw.opportunity) : kw.opportunity || 0,
    intent: kw.intent,
  }));

  // Mock opportunity funnel data - would come from backend in real implementation
  const opportunityFunnelData = [
    { name: 'Quick Wins (Low Difficulty, High Opportunity)', count: keywords.filter(k => {
      const diff = typeof k.difficulty === 'string' ? parseFloat(k.difficulty) : k.difficulty || 0;
      const opp = typeof k.opportunity === 'string' ? parseFloat(k.opportunity) : k.opportunity || 0;
      return diff < 30 && opp > 60;
    }).length, percentage: 0 },
    { name: 'Strategic Targets (Medium Difficulty, High Volume)', count: keywords.filter(k => {
      const diff = typeof k.difficulty === 'string' ? parseFloat(k.difficulty) : k.difficulty || 0;
      return diff >= 30 && diff < 60 && k.volume > 1000;
    }).length, percentage: 0 },
    { name: 'Long-term Plays (High Difficulty, High Volume)', count: keywords.filter(k => {
      const diff = typeof k.difficulty === 'string' ? parseFloat(k.difficulty) : k.difficulty || 0;
      return diff >= 60 && k.volume > 5000;
    }).length, percentage: 0 },
    { name: 'Low Priority', count: keywords.filter(k => {
      const opp = typeof k.opportunity === 'string' ? parseFloat(k.opportunity) : k.opportunity || 0;
      return opp < 40;
    }).length, percentage: 0 },
  ];
  opportunityFunnelData.forEach(item => {
    item.percentage = (item.count / keywords.length) * 100;
  });

  // Mock traffic timeline - would come from backend
  const trafficTimelineData = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2024, i).toLocaleDateString('en', { month: 'short' }),
    projected_traffic: Math.floor((project.total_volume || 0) * 0.15 * (1 + i * 0.05)),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/projects" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-600 mt-1">
            {project.geo} • {project.language} • {project.focus}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportApi.keywords(projectId)} download>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
              Export Keywords
            </Button>
          </a>
          <a href={exportApi.briefs(projectId)} download>
            <Button variant="secondary" icon={<Download className="w-4 h-4" />}>
              Export Briefs
            </Button>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Keywords"
          value={formatNumber(project.keyword_count)}
          icon={<Zap />}
          color="primary"
        />
        <StatCard
          title="Total Volume"
          value={formatNumber(project.total_volume)}
          icon={<TrendingUp />}
          color="primary"
        />
        <StatCard
          title="Avg Difficulty"
          value={project.avg_difficulty}
          icon={<Target />}
          color="secondary"
        />
        <StatCard
          title="Top Opportunity"
          value={keywords[0] ? (typeof keywords[0].opportunity === 'string' ? keywords[0].opportunity : keywords[0].opportunity?.toFixed(1)) : 'N/A'}
          icon={<Award />}
          color="primary"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'keywords', 'analytics', 'automation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-bold mb-4">Intent Distribution</h2>
              {intentData.length > 0 ? (
                <IntentDistributionChart data={intentData} />
              ) : (
                <p className="text-center text-gray-600 py-8">No data available</p>
              )}
            </Card>

            <Card>
              <h2 className="text-xl font-bold mb-4">Opportunity Funnel</h2>
              <OpportunityFunnelChart data={opportunityFunnelData} />
            </Card>
          </div>

          <Card>
            <h2 className="text-xl font-bold mb-4">Difficulty vs Volume Analysis</h2>
            {difficultyVolumeData.length > 0 ? (
              <DifficultyVolumeChart data={difficultyVolumeData} />
            ) : (
              <p className="text-center text-gray-600 py-8">No data available</p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Projected Traffic Growth (12 Months)</h2>
            <TrafficTimelineChart data={trafficTimelineData} />
          </Card>
        </div>
      )}

      {activeTab === 'keywords' && (
        <Card>
          <h2 className="text-xl font-bold mb-4">All Keywords</h2>
          <KeywordTable keywords={keywords} loading={keywordsLoading} />
        </Card>
      )}

      {activeTab === 'analytics' && (
        <Card>
          <h2 className="text-xl font-bold mb-4">Advanced Analytics</h2>
          <p className="text-gray-600">Advanced analytics features coming soon...</p>
        </Card>
      )}

      {activeTab === 'automation' && (
        <AutomationPanel projectId={projectId} />
      )}
    </div>
  );
};
