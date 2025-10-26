import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useProjects } from '@/hooks/useProjects';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { formatDate } from '@/utils/format';

export const ProjectList: React.FC = () => {
  const { data: projects, isLoading } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (isLoading) {
    return <LoadingSpinner message="Loading projects..." />;
  }

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' && project.last_checkpoint === 'completed') ||
      (filterStatus === 'active' && project.last_checkpoint !== 'completed');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
          <p className="text-gray-600 mt-1">Manage your keyword research projects</p>
        </div>
        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="all">All Projects</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </Card>

      {/* Projects Grid */}
      {filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link key={project.id} to={`/project/${project.id}`}>
              <Card hoverable className="h-full">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  {project.last_checkpoint === 'completed' ? (
                    <Badge variant="success">Completed</Badge>
                  ) : (
                    <Badge variant="warning">Active</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Keywords:</span>
                    <span className="font-semibold">{project.keyword_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span className="font-semibold">{project.total_volume?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Difficulty:</span>
                    <span className="font-semibold">{project.avg_difficulty}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>{project.geo} • {project.language}</span>
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all'
                ? 'No projects match your filters'
                : 'No projects yet. Create your first project to get started!'}
            </p>
            <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowCreateModal(true)}>
              Create New Project
            </Button>
          </div>
        </Card>
      )}

      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
