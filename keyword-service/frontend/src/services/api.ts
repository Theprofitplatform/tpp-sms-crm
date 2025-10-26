import axios from 'axios';
import type {
  Project,
  Keyword,
  Topic,
  PageGroup,
  JobStatus,
  Analytics,
  SerpAnalysis,
  SystemHealth,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Project API
export const projectApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: number) => api.get<Project>(`/project/${id}`),
  create: (data: {
    name: string;
    seeds: string;
    geo?: string;
    language?: string;
    focus?: string;
  }) => api.post<{ job_id: string }>('/create', data),
  delete: (id: number) => api.delete(`/project/${id}`),
  status: (id: number) => api.get<JobStatus>(`/project/${id}/status`),
};

// Keyword API
export const keywordApi = {
  list: (projectId: number, params?: {
    limit?: number;
    offset?: number;
    intent?: string;
    min_volume?: number;
    max_difficulty?: number;
    search?: string;
  }) => api.get<{ keywords: Keyword[]; total: number }>(`/project/${projectId}/keywords`, { params }),
  get: (id: number) => api.get<Keyword>(`/keyword/${id}`),
  update: (id: number, data: Partial<Keyword>) => api.patch(`/keyword/${id}`, data),
};

// Analytics API
export const analyticsApi = {
  overview: (projectId: number) => api.get<Analytics>(`/project/${projectId}/analytics/overview`),
  intentDistribution: (projectId: number) =>
    api.get<Analytics['intent_distribution']>(`/project/${projectId}/analytics/intent-distribution`),
  difficultyVolume: (projectId: number) =>
    api.get<Analytics['difficulty_volume']>(`/project/${projectId}/analytics/difficulty-volume`),
  opportunityFunnel: (projectId: number) =>
    api.get<Analytics['opportunity_funnel']>(`/project/${projectId}/analytics/opportunity-funnel`),
  trafficTimeline: (projectId: number) =>
    api.get<Analytics['traffic_timeline']>(`/project/${projectId}/analytics/traffic-timeline`),
};

// Topic & Clustering API
export const topicApi = {
  list: (projectId: number) => api.get<Topic[]>(`/project/${projectId}/topics`),
  get: (projectId: number, topicId: number) => api.get<Topic>(`/project/${projectId}/topics/${topicId}`),
  graph: (projectId: number, topicId: number) =>
    api.get<any>(`/project/${projectId}/topics/${topicId}/graph`),
};

export const pageGroupApi = {
  list: (projectId: number) => api.get<PageGroup[]>(`/project/${projectId}/page-groups`),
  get: (projectId: number, groupId: number) => api.get<PageGroup>(`/project/${projectId}/page-groups/${groupId}`),
};

// SERP Analysis API
export const serpApi = {
  analysis: (projectId: number) => api.get<SerpAnalysis>(`/project/${projectId}/serp-analysis`),
  snapshot: (keywordId: number) => api.get<any>(`/keyword/${keywordId}/serp-snapshot`),
};

// System & Monitoring API
export const systemApi = {
  health: () => api.get<SystemHealth>('/system-health'),
  auditLogs: (params?: { limit?: number; provider?: string }) =>
    api.get<any[]>('/audit-logs', { params }),
  quotaUsage: () => api.get<SystemHealth['api_quota']>('/quota-usage'),
};

// Job API
export const jobApi = {
  status: (jobId: string) => api.get<JobStatus>(`/job/${jobId}/status`),
};

// Export API
export const exportApi = {
  keywords: (projectId: number) => `/api/project/${projectId}/export/keywords`,
  briefs: (projectId: number) => `/api/project/${projectId}/export/briefs`,
  calendar: (projectId: number) => `/api/project/${projectId}/export/calendar`,
};

export default api;
