import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Target, Zap } from 'lucide-react';
import { Card, StatCard } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useProjects } from '@/hooks/useProjects';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';

export const Home: React.FC = () => {
  const { data: projects, isLoading } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const totalKeywords = projects?.reduce((sum, p) => sum + p.keyword_count, 0) || 0;
  const totalVolume = projects?.reduce((sum, p) => sum + (p.total_volume || 0), 0) || 0;
  const activeProjects = projects?.filter(p => p.last_checkpoint !== 'completed').length || 0;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Welcome to Keyword Research Dashboard</h1>
        <p className="text-lg opacity-90 mb-6">
          AI-powered keyword research and content planning for SEO success
        </p>
        <Button
          variant="secondary"
          size="lg"
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Projects"
          value={projects?.length || 0}
          icon={<Target />}
          color="primary"
        />
        <StatCard
          title="Total Keywords"
          value={totalKeywords.toLocaleString()}
          icon={<Zap />}
          color="secondary"
        />
        <StatCard
          title="Total Search Volume"
          value={totalVolume.toLocaleString()}
          icon={<TrendingUp />}
          color="primary"
        />
      </div>

      {/* Recent Projects */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Recent Projects</h2>
          <Link to="/projects">
            <Button variant="ghost">View All</Button>
          </Link>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <Link key={project.id} to={`/project/${project.id}`}>
                <Card hoverable className="h-full">
                  <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Keywords: {project.keyword_count}</p>
                    <p>Volume: {project.total_volume?.toLocaleString() || 0}</p>
                    <p>Location: {project.geo}</p>
                    <p className="text-xs text-gray-500">Created: {project.created_at}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No projects yet. Create your first project to get started!</p>
            <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateModal(true)}>
              Create Your First Project
            </Button>
          </div>
        )}
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Create a Project</h3>
            <p className="text-sm text-gray-600">
              Start by creating a new project with your seed keywords
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Analyze Results</h3>
            <p className="text-sm text-gray-600">
              Review keyword metrics, difficulty scores, and opportunities
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Plan Content</h3>
            <p className="text-sm text-gray-600">
              Generate content briefs and build your content calendar
            </p>
          </div>
        </div>
      </Card>

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
