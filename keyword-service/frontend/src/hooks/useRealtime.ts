import { useEffect, useState } from 'react';
import socketService from '@/services/socket';
import type { JobStatus } from '@/types';

export const useJobUpdates = (jobId: string | null) => {
  const [status, setStatus] = useState<JobStatus | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const handleUpdate = (data: JobStatus) => {
      setStatus(data);
    };

    socketService.subscribeToJob(jobId, handleUpdate);

    return () => {
      socketService.unsubscribeFromJob(jobId);
    };
  }, [jobId]);

  return status;
};

export const useProjectUpdates = (projectId: number | null) => {
  const [update, setUpdate] = useState<any>(null);

  useEffect(() => {
    if (!projectId) return;

    const handleUpdate = (data: any) => {
      setUpdate(data);
    };

    socketService.subscribeToProject(projectId, handleUpdate);

    return () => {
      socketService.unsubscribeFromProject(projectId);
    };
  }, [projectId]);

  return update;
};
