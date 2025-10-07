CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"daily_spent_cents" integer DEFAULT 0 NOT NULL,
	"monthly_spent_cents" integer DEFAULT 0 NOT NULL,
	"daily_reset_at" timestamp DEFAULT now() NOT NULL,
	"monthly_reset_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"template_ids" jsonb NOT NULL,
	"quiet_hours_start" integer DEFAULT 21 NOT NULL,
	"quiet_hours_end" integer DEFAULT 9 NOT NULL,
	"target_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"queued_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"email" text,
	"first_name" text,
	"last_name" text,
	"timezone" text,
	"custom_fields" jsonb,
	"consent_status" text DEFAULT 'unknown' NOT NULL,
	"consent_source" text,
	"consent_timestamp" timestamp,
	"last_sent_at" timestamp,
	"import_batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"country" text DEFAULT 'AU' NOT NULL,
	"per_part_cents" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "do_not_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid,
	"campaign_id" uuid,
	"send_job_id" uuid,
	"short_link_id" uuid,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"total_rows" integer NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejected_rows" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "magic_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"aggregate_type" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "send_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"sending_number_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"body" text NOT NULL,
	"parts" integer DEFAULT 1 NOT NULL,
	"cost_cents" integer,
	"provider_message_id" text,
	"failure_reason" text,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sending_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone_e164" text NOT NULL,
	"provider" text NOT NULL,
	"daily_limit" integer DEFAULT 300 NOT NULL,
	"per_minute_limit" integer DEFAULT 10 NOT NULL,
	"warmup_start_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sending_numbers_phone_e164_unique" UNIQUE("phone_e164")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"token" text NOT NULL,
	"target_url" text NOT NULL,
	"clicked_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"human_click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "short_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suppression_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"window_days" integer DEFAULT 90 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Australia/Sydney' NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"daily_budget_cents" integer,
	"monthly_budget_cents" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_tenant_idx" ON "audit_log" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_user_idx" ON "audit_log" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_idx" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "budgets_tenant_idx" ON "budgets" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_tenant_idx" ON "campaigns" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_tenant_phone_idx" ON "contacts" ("tenant_id","phone_e164");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_tenant_idx" ON "contacts" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "costs_provider_country_idx" ON "costs" ("provider","country");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dnc_tenant_phone_idx" ON "do_not_contact" ("tenant_id","phone_e164");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dnc_tenant_idx" ON "do_not_contact" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_tenant_idx" ON "events" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_contact_idx" ON "events" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_campaign_idx" ON "events" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_created_idx" ON "events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_tenant_idx" ON "import_batches" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_hash_idx" ON "import_batches" ("file_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "magic_tokens_token_idx" ON "magic_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_tokens_user_idx" ON "magic_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_tenant_idx" ON "message_templates" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_processed_idx" ON "outbox" ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_created_idx" ON "outbox" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "send_jobs_tenant_campaign_contact_idx" ON "send_jobs" ("tenant_id","campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_jobs_tenant_idx" ON "send_jobs" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_jobs_campaign_idx" ON "send_jobs" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_jobs_status_idx" ON "send_jobs" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sending_numbers_phone_idx" ON "sending_numbers" ("phone_e164");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sending_numbers_tenant_idx" ON "sending_numbers" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "short_links_token_idx" ON "short_links" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_links_campaign_idx" ON "short_links" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_links_tenant_idx" ON "short_links" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppression_tenant_idx" ON "suppression_rules" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suppression_active_idx" ON "suppression_rules" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_idx" ON "webhook_events" ("provider_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_tenant_idx" ON "webhook_events" ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "do_not_contact" ADD CONSTRAINT "do_not_contact_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_send_job_id_send_jobs_id_fk" FOREIGN KEY ("send_job_id") REFERENCES "send_jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_short_link_id_short_links_id_fk" FOREIGN KEY ("short_link_id") REFERENCES "short_links"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "magic_tokens" ADD CONSTRAINT "magic_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sending_numbers" ADD CONSTRAINT "sending_numbers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "short_links" ADD CONSTRAINT "short_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "short_links" ADD CONSTRAINT "short_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "short_links" ADD CONSTRAINT "short_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suppression_rules" ADD CONSTRAINT "suppression_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
