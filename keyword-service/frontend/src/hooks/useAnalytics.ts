import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/services/api';

export const useAnalytics = (projectId: number) => {
  return useQuery({
    queryKey: ['analytics', projectId],
    queryFn: async () => {
      const response = await analyticsApi.overview(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};

export const useIntentDistribution = (projectId: number) => {
  return useQuery({
    queryKey: ['intent-distribution', projectId],
    queryFn: async () => {
      const response = await analyticsApi.intentDistribution(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};

export const useDifficultyVolume = (projectId: number) => {
  return useQuery({
    queryKey: ['difficulty-volume', projectId],
    queryFn: async () => {
      const response = await analyticsApi.difficultyVolume(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};

export const useOpportunityFunnel = (projectId: number) => {
  return useQuery({
    queryKey: ['opportunity-funnel', projectId],
    queryFn: async () => {
      const response = await analyticsApi.opportunityFunnel(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
};
