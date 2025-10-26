// Type definitions for the dashboard

export interface Project {
  id: number;
  name: string;
  created_at: string;
  geo: string;
  language: string;
  focus: string;
  keyword_count: number;
  total_volume: number;
  avg_difficulty: string;
  last_checkpoint: string;
  checkpoint_time?: string;
  intent_distribution?: Record<string, number>;
}

export interface Keyword {
  id?: number;
  text: string;
  intent: string;
  volume: number;
  cpc: string | number;
  difficulty: string | number;
  opportunity: string | number;
  traffic_potential: number;
  trend_direction?: string;
  serp_features?: string[];
  entities?: string[];
  topic_id?: number;
  page_group_id?: number;
}

export interface Topic {
  id: number;
  label: string;
  total_volume: number;
  total_opportunity: number;
  avg_difficulty: number;
  keyword_count: number;
  pillar_keyword?: string;
}

export interface PageGroup {
  id: number;
  label: string;
  target_keyword?: string;
  total_volume: number;
  total_opportunity: number;
  keyword_count: number;
  outline?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  word_range?: string;
}

export interface JobStatus {
  job_id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  project_id?: number;
  error?: string;
  last_checkpoint?: string;
  checkpoint_time?: string;
}

export interface Analytics {
  intent_distribution: Array<{ name: string; value: number; color: string }>;
  difficulty_volume: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    opportunity: number;
    intent: string;
  }>;
  opportunity_funnel: Array<{ name: string; count: number; percentage: number }>;
  traffic_timeline: Array<{ month: string; projected_traffic: number }>;
}

export interface SerpAnalysis {
  top_domains: Array<{ domain: string; appearances: number }>;
  serp_features: Array<{ feature: string; count: number; percentage: number }>;
  competitor_presence: Array<{ keyword: string; competitors: string[] }>;
}

export interface SystemHealth {
  api_quota: Record<string, { used: number; limit: number; percentage: number }>;
  api_latency: Array<{ timestamp: string; latency: number; provider: string }>;
  cache_hit_rate: number;
  active_jobs: number;
}
