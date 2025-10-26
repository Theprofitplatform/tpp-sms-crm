import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useCreateProject } from '@/hooks/useProjects';
import { useJobUpdates } from '@/hooks/useRealtime';
import { ProgressBar } from '../common/ProgressBar';
import { SeedDiscovery } from '../SeedDiscovery';

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    seeds: '',
    geo: 'US',
    language: 'en',
    focus: 'informational',
  });

  const [showSeedDiscovery, setShowSeedDiscovery] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const createProject = useCreateProject();
  const jobStatus = useJobUpdates(jobId);

  const handleSeedsDiscovered = (seeds: string[]) => {
    setFormData({ ...formData, seeds: seeds.join(', ') });
    setShowSeedDiscovery(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await createProject.mutateAsync(formData);
      setJobId(response.job_id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const isProcessing = jobId && jobStatus?.status === 'running';
  const isCompleted = jobStatus?.status === 'completed';
  const hasFailed = jobStatus?.status === 'failed';

  if (isCompleted) {
    setTimeout(onClose, 2000);
  }

  // Calculate progress percentage based on checkpoint
  const getProgress = () => {
    if (!jobStatus?.last_checkpoint) return 0;
    const stages = ['expansion', 'serp_collection', 'metrics', 'normalization', 'classification', 'scoring', 'clustering', 'briefs', 'completed'];
    const currentIndex = stages.indexOf(jobStatus.last_checkpoint);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Create New Project</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <Input
              label="Project Name"
              placeholder="My Keyword Research Project"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isProcessing}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Seed Keywords (comma or line separated)
                </label>
                <button
                  type="button"
                  onClick={() => setShowSeedDiscovery(!showSeedDiscovery)}
                  disabled={isProcessing}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showSeedDiscovery ? 'Manual Entry' : 'Auto-Discover'}
                </button>
              </div>

              {showSeedDiscovery ? (
                <div className="border-2 border-primary-200 rounded-lg p-4 mb-4">
                  <SeedDiscovery onSeedsDiscovered={handleSeedsDiscovered} />
                </div>
              ) : (
                <textarea
                  placeholder="best running shoes&#10;running shoes for beginners&#10;marathon training tips"
                  value={formData.seeds}
                  onChange={(e) => setFormData({ ...formData, seeds: e.target.value })}
                  required
                  disabled={isProcessing}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={5}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  value={formData.geo}
                  onChange={(e) => setFormData({ ...formData, geo: e.target.value })}
                  disabled={isProcessing}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  disabled={isProcessing}
                  className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content Focus
              </label>
              <select
                value={formData.focus}
                onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
                disabled={isProcessing}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
              >
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="local">Local</option>
                <option value="any">Any</option>
              </select>
            </div>

            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Processing Project...</h3>
                <ProgressBar
                  progress={getProgress()}
                  label={jobStatus?.last_checkpoint || 'Starting...'}
                  showPercentage
                  color="primary"
                />
                <p className="text-sm text-blue-700 mt-2">
                  This may take a few minutes. Please don't close this window.
                </p>
              </div>
            )}

            {isCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-1">Project Created Successfully!</h3>
                <p className="text-sm text-green-700">Redirecting to project dashboard...</p>
              </div>
            )}

            {hasFailed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-1">Project Creation Failed</h3>
                <p className="text-sm text-red-700">{jobStatus?.error || 'An unknown error occurred'}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                loading={createProject.isPending || isProcessing}
                disabled={isProcessing || isCompleted}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Create Project'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
