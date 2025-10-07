export type ConsentStatus = 'explicit' | 'implied' | 'unknown';
export type CampaignStatus = 'draft' | 'queued' | 'running' | 'paused' | 'completed';
export type SendJobStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type EventType = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CLICKED' | 'REPLIED' | 'OPT_OUT' | 'RESUBSCRIBE';
export type UserRole = 'admin' | 'staff' | 'viewer';
export type ImportDecision = 'create' | 'update' | 'duplicate' | 'invalid_phone' | 'dnc' | 'suppressed_by_cooldown' | 'invalid_consent';

export interface ImportRow {
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone?: string;
  consentStatus?: ConsentStatus;
  consentSource?: string;
  [key: string]: any; // Custom fields
}

export interface DryRunResult {
  decision: ImportDecision;
  reason: string;
  row: ImportRow;
  normalizedPhone?: string;
}

export interface ImportSummary {
  totalRows: number;
  createCount: number;
  updateCount: number;
  duplicateCount: number;
  invalidPhoneCount: number;
  dncCount: number;
  suppressedCount: number;
  invalidConsentCount: number;
}
