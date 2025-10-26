import { useQuery } from '@tanstack/react-query';
import { keywordApi } from '@/services/api';

export const useKeywords = (
  projectId: number,
  params?: {
    limit?: number;
    offset?: number;
    intent?: string;
    min_volume?: number;
    max_difficulty?: number;
    search?: string;
  }
) => {
  return useQuery({
    queryKey: ['keywords', projectId, params],
    queryFn: async () => {
      const response = await keywordApi.list(projectId, params);
      return response.data;
    },
    enabled: !!projectId,
  });
};
