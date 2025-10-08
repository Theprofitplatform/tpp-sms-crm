import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, boolean, integer, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('Australia/Sydney'),
  isPaused: boolean('is_paused').notNull().default(false),
  dailyBudgetCents: integer('daily_budget_cents'),
  monthlyBudgetCents: integer('monthly_budget_cents'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Contacts table
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  phoneE164: text('phone_e164').notNull(),
  email: text('email'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  timezone: text('timezone'),
  customFields: jsonb('custom_fields'),
  consentStatus: text('consent_status').notNull().default('unknown'), // explicit, implied, unknown
  consentSource: text('consent_source'),
  consentTimestamp: timestamp('consent_timestamp'),
  lastSentAt: timestamp('last_sent_at'),
  importBatchId: uuid('import_batch_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniquePhonePerTenant: uniqueIndex('contacts_tenant_phone_idx').on(table.tenantId, table.phoneE164),
  tenantIdx: index('contacts_tenant_idx').on(table.tenantId),
  emailIdx: index('contacts_email_idx').on(table.email),
}));

// Do Not Contact list
export const doNotContact = pgTable('do_not_contact', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  phoneE164: text('phone_e164').notNull(),
  reason: text('reason').notNull(), // STOP, COMPLAINED, MANUAL, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniquePhonePerTenant: uniqueIndex('dnc_tenant_phone_idx').on(table.tenantId, table.phoneE164),
  tenantIdx: index('dnc_tenant_idx').on(table.tenantId),
}));

// Suppression rules (cooldown periods)
export const suppressionRules = pgTable('suppression_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  windowDays: integer('window_days').notNull().default(90),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('suppression_tenant_idx').on(table.tenantId),
  activeIdx: index('suppression_active_idx').on(table.isActive).where(sql`expires_at IS NULL OR expires_at > NOW()`),
}));

// Message templates
export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  body: text('body').notNull(),
  variables: jsonb('variables'), // Array of variable names used in template
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('templates_tenant_idx').on(table.tenantId),
}));

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'), // draft, queued, running, paused, completed
  templateIds: jsonb('template_ids').notNull(), // Array of template UUIDs for rotation
  quietHoursStart: integer('quiet_hours_start').notNull().default(21), // 9 PM
  quietHoursEnd: integer('quiet_hours_end').notNull().default(9), // 9 AM
  targetUrl: text('target_url'), // For short links
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  queuedAt: timestamp('queued_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  tenantIdx: index('campaigns_tenant_idx').on(table.tenantId),
  statusIdx: index('campaigns_status_idx').on(table.status),
}));

// Send jobs (one per contact per campaign)
export const sendJobs = pgTable('send_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  templateId: uuid('template_id').notNull().references(() => messageTemplates.id),
  sendingNumberId: uuid('sending_number_id'),
  status: text('status').notNull().default('queued'), // queued, sent, delivered, failed
  body: text('body').notNull(), // Rendered message with variables
  parts: integer('parts').notNull().default(1),
  costCents: integer('cost_cents'),
  providerMessageId: text('provider_message_id'),
  failureReason: text('failure_reason'),
  queuedAt: timestamp('queued_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
}, (table) => ({
  uniqueJobPerContactCampaign: uniqueIndex('send_jobs_tenant_campaign_contact_idx').on(
    table.tenantId,
    table.campaignId,
    table.contactId
  ),
  tenantIdx: index('send_jobs_tenant_idx').on(table.tenantId),
  campaignIdx: index('send_jobs_campaign_idx').on(table.campaignId),
  statusIdx: index('send_jobs_status_idx').on(table.status),
}));

// Short links
export const shortLinks = pgTable('short_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  token: text('token').notNull().unique(),
  targetUrl: text('target_url').notNull(),
  clickedAt: timestamp('clicked_at'),
  clickCount: integer('click_count').notNull().default(0),
  humanClickCount: integer('human_click_count').notNull().default(0), // Bot-filtered
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(), // 60 days default
}, (table) => ({
  tokenIdx: uniqueIndex('short_links_token_idx').on(table.token),
  campaignIdx: index('short_links_campaign_idx').on(table.campaignId),
  tenantIdx: index('short_links_tenant_idx').on(table.tenantId),
}));

// Events (timeline of all message events)
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  sendJobId: uuid('send_job_id').references(() => sendJobs.id),
  shortLinkId: uuid('short_link_id').references(() => shortLinks.id),
  eventType: text('event_type').notNull(), // QUEUED, SENT, DELIVERED, FAILED, CLICKED, REPLIED, OPT_OUT, RESUBSCRIBE
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('events_tenant_idx').on(table.tenantId),
  contactIdx: index('events_contact_idx').on(table.contactId),
  campaignIdx: index('events_campaign_idx').on(table.campaignId),
  typeIdx: index('events_type_idx').on(table.eventType),
  createdIdx: index('events_created_idx').on(table.createdAt),
}));

// Sending numbers
export const sendingNumbers = pgTable('sending_numbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  phoneE164: text('phone_e164').notNull().unique(),
  provider: text('provider').notNull(), // twilio, etc.
  dailyLimit: integer('daily_limit').notNull().default(300),
  perMinuteLimit: integer('per_minute_limit').notNull().default(10),
  warmupStartDate: timestamp('warmup_start_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  phoneIdx: uniqueIndex('sending_numbers_phone_idx').on(table.phoneE164),
  tenantIdx: index('sending_numbers_tenant_idx').on(table.tenantId),
}));

// Webhook events (for replay protection)
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  providerEventId: text('provider_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
}, (table) => ({
  providerEventIdx: uniqueIndex('webhook_events_provider_idx').on(table.providerEventId),
  tenantIdx: index('webhook_events_tenant_idx').on(table.tenantId),
}));

// Budgets (tracking spend)
export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id).unique(),
  dailySpentCents: integer('daily_spent_cents').notNull().default(0),
  monthlySpentCents: integer('monthly_spent_cents').notNull().default(0),
  dailyResetAt: timestamp('daily_reset_at').notNull().defaultNow(),
  monthlyResetAt: timestamp('monthly_reset_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: uniqueIndex('budgets_tenant_idx').on(table.tenantId),
}));

// Costs (message part pricing by provider)
export const costs = pgTable('costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  country: text('country').notNull().default('AU'),
  perPartCents: integer('per_part_cents').notNull(),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveUntil: timestamp('effective_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerCountryIdx: index('costs_provider_country_idx').on(table.provider, table.country),
}));

// Import batches (lineage tracking)
export const importBatches = pgTable('import_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  fileName: text('file_name').notNull(),
  fileHash: text('file_hash').notNull(),
  totalRows: integer('total_rows').notNull(),
  createdCount: integer('created_count').notNull().default(0),
  updatedCount: integer('updated_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  rejectedCount: integer('rejected_count').notNull().default(0),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  rejectedRows: jsonb('rejected_rows'), // Array of { row, reason }
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  tenantIdx: index('import_batches_tenant_idx').on(table.tenantId),
  hashIdx: index('import_batches_hash_idx').on(table.fileHash),
}));

// Outbox (for reliable event publishing)
export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  aggregateId: uuid('aggregate_id').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  processedIdx: index('outbox_processed_idx').on(table.processedAt),
  createdIdx: index('outbox_created_idx').on(table.createdAt),
}));

// Users (for admin auth)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('viewer'), // admin, staff, viewer
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  tenantIdx: index('users_tenant_idx').on(table.tenantId),
}));

// Magic link tokens (for auth)
export const magicTokens = pgTable('magic_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('magic_tokens_token_idx').on(table.token),
  userIdx: index('magic_tokens_user_idx').on(table.userId),
}));

// Audit log
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdx: index('audit_log_tenant_idx').on(table.tenantId),
  userIdx: index('audit_log_user_idx').on(table.userId),
  createdIdx: index('audit_log_created_idx').on(table.createdAt),
}));
