# Entity Relationship Diagram

## Core Entities

### tenants
- id (PK, UUID)
- name
- timezone (default: Australia/Sydney)
- is_paused (kill switch)
- daily_budget_cents
- monthly_budget_cents
- created_at, updated_at

### contacts
- id (PK, UUID)
- tenant_id (FK → tenants)
- phone_e164 (UNIQUE per tenant)
- email
- first_name, last_name
- timezone
- custom_fields (JSONB)
- consent_status (explicit/implied/unknown)
- consent_source
- consent_timestamp
- last_sent_at (for suppression window)
- import_batch_id (FK → import_batches)
- created_at, updated_at

### do_not_contact
- id (PK, UUID)
- tenant_id (FK → tenants)
- phone_e164 (UNIQUE per tenant)
- reason (STOP/COMPLAINED/MANUAL)
- created_at

### campaigns
- id (PK, UUID)
- tenant_id (FK → tenants)
- name
- status (draft/queued/running/paused/completed)
- template_ids (JSONB array)
- quiet_hours_start, quiet_hours_end
- target_url (for short links)
- created_at, updated_at
- queued_at, completed_at

### message_templates
- id (PK, UUID)
- tenant_id (FK → tenants)
- name
- body (with {{variables}})
- variables (JSONB array)
- is_active
- created_at, updated_at

### send_jobs
- id (PK, UUID)
- tenant_id (FK → tenants)
- campaign_id (FK → campaigns)
- contact_id (FK → contacts)
- template_id (FK → message_templates)
- sending_number_id (FK → sending_numbers)
- status (queued/sent/delivered/failed)
- body (rendered message)
- parts (SMS parts count)
- cost_cents
- provider_message_id
- failure_reason
- queued_at, sent_at, delivered_at, failed_at
- UNIQUE (tenant_id, campaign_id, contact_id) - idempotency

### short_links
- id (PK, UUID)
- tenant_id (FK → tenants)
- campaign_id (FK → campaigns)
- contact_id (FK → contacts)
- token (UNIQUE, HMAC-signed)
- target_url
- clicked_at (first click timestamp)
- click_count (total)
- human_click_count (bot-filtered)
- created_at
- expires_at (60 days TTL)

### events
- id (PK, UUID)
- tenant_id (FK → tenants)
- contact_id (FK → contacts)
- campaign_id (FK → campaigns)
- send_job_id (FK → send_jobs)
- short_link_id (FK → short_links)
- event_type (QUEUED/SENT/DELIVERED/FAILED/CLICKED/REPLIED/OPT_OUT/RESUBSCRIBE)
- metadata (JSONB)
- created_at

### sending_numbers
- id (PK, UUID)
- tenant_id (FK → tenants)
- phone_e164 (UNIQUE)
- provider (twilio/etc)
- daily_limit
- per_minute_limit
- warmup_start_date (for warmup curve)
- is_active
- created_at

### webhook_events
- id (PK, UUID)
- tenant_id (FK → tenants)
- provider_event_id (UNIQUE) - replay protection
- event_type
- payload (JSONB)
- processed_at

### budgets
- id (PK, UUID)
- tenant_id (FK → tenants, UNIQUE)
- daily_spent_cents
- monthly_spent_cents
- daily_reset_at
- monthly_reset_at
- updated_at

### costs
- id (PK, UUID)
- provider
- country (default: AU)
- per_part_cents
- effective_from, effective_until
- created_at

### import_batches
- id (PK, UUID)
- tenant_id (FK → tenants)
- file_name
- file_hash
- total_rows
- created_count, updated_count, skipped_count, rejected_count
- status (pending/processing/completed/failed)
- rejected_rows (JSONB)
- created_at, completed_at

### suppression_rules
- id (PK, UUID)
- tenant_id (FK → tenants)
- name
- window_days (default: 90)
- is_active
- expires_at
- created_at, updated_at

### users (admin auth)
- id (PK, UUID)
- tenant_id (FK → tenants)
- email (UNIQUE)
- role (admin/staff/viewer)
- is_active
- last_login_at
- created_at, updated_at

### magic_tokens
- id (PK, UUID)
- user_id (FK → users)
- token (UNIQUE)
- expires_at (15 min)
- used_at
- created_at

### audit_log
- id (PK, UUID)
- tenant_id (FK → tenants)
- user_id (FK → users)
- action
- resource_type, resource_id
- metadata (JSONB)
- created_at

## Key Relationships

- tenants → contacts (1:many)
- tenants → campaigns (1:many)
- campaigns → send_jobs (1:many)
- contacts → send_jobs (1:many)
- send_jobs → events (1:many)
- contacts → events (1:many)
- campaigns → short_links (1:many)
- tenants → do_not_contact (1:many)

## Critical Constraints

1. **contacts**: UNIQUE (tenant_id, phone_e164)
2. **send_jobs**: UNIQUE (tenant_id, campaign_id, contact_id)
3. **short_links**: UNIQUE token
4. **webhook_events**: UNIQUE provider_event_id
5. **do_not_contact**: UNIQUE (tenant_id, phone_e164)

## Indexes

- All foreign keys indexed
- contacts: email, tenant_id
- events: contact_id, campaign_id, event_type, created_at
- send_jobs: tenant_id, campaign_id, status
- short_links: token, campaign_id
- suppression_rules: is_active (partial index where active)
