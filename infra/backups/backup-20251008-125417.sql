--
-- PostgreSQL database dump
--

\restrict PIohNiBiRsGkyiZj54IalkPzFPji4jsge3CqjrnTi2v6nikgqcpCEq7GHQnZuMG

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    daily_spent_cents integer DEFAULT 0 NOT NULL,
    monthly_spent_cents integer DEFAULT 0 NOT NULL,
    daily_reset_at timestamp without time zone DEFAULT now() NOT NULL,
    monthly_reset_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.budgets OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    template_ids jsonb NOT NULL,
    quiet_hours_start integer DEFAULT 21 NOT NULL,
    quiet_hours_end integer DEFAULT 9 NOT NULL,
    target_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    queued_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    email text,
    first_name text,
    last_name text,
    timezone text,
    custom_fields jsonb,
    consent_status text DEFAULT 'unknown'::text NOT NULL,
    consent_source text,
    consent_timestamp timestamp without time zone,
    last_sent_at timestamp without time zone,
    import_batch_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: costs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    country text DEFAULT 'AU'::text NOT NULL,
    per_part_cents integer NOT NULL,
    effective_from timestamp without time zone DEFAULT now() NOT NULL,
    effective_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.costs OWNER TO postgres;

--
-- Name: do_not_contact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.do_not_contact (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    reason text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.do_not_contact OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    contact_id uuid,
    campaign_id uuid,
    send_job_id uuid,
    short_link_id uuid,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    file_name text NOT NULL,
    file_hash text NOT NULL,
    total_rows integer NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    rejected_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejected_rows jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.import_batches OWNER TO postgres;

--
-- Name: magic_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.magic_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.magic_tokens OWNER TO postgres;

--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    body text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.message_templates OWNER TO postgres;

--
-- Name: outbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_id uuid NOT NULL,
    aggregate_type text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.outbox OWNER TO postgres;

--
-- Name: send_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.send_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    template_id uuid NOT NULL,
    sending_number_id uuid,
    status text DEFAULT 'queued'::text NOT NULL,
    body text NOT NULL,
    parts integer DEFAULT 1 NOT NULL,
    cost_cents integer,
    provider_message_id text,
    failure_reason text,
    queued_at timestamp without time zone DEFAULT now() NOT NULL,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    failed_at timestamp without time zone
);


ALTER TABLE public.send_jobs OWNER TO postgres;

--
-- Name: sending_numbers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sending_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    provider text NOT NULL,
    daily_limit integer DEFAULT 300 NOT NULL,
    per_minute_limit integer DEFAULT 10 NOT NULL,
    warmup_start_date timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sending_numbers OWNER TO postgres;

--
-- Name: short_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.short_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    campaign_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    token text NOT NULL,
    target_url text NOT NULL,
    clicked_at timestamp without time zone,
    click_count integer DEFAULT 0 NOT NULL,
    human_click_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.short_links OWNER TO postgres;

--
-- Name: suppression_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppression_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    window_days integer DEFAULT 90 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppression_rules OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    timezone text DEFAULT 'Australia/Sydney'::text NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    daily_budget_cents integer,
    monthly_budget_cents integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhook_events OWNER TO postgres;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	d4d15af4c824c2b79a5da5289f86e7eec6186de210a880d49b6940595901e94f	1759841925834
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, tenant_id, user_id, action, resource_type, resource_id, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budgets (id, tenant_id, daily_spent_cents, monthly_spent_cents, daily_reset_at, monthly_reset_at, updated_at) FROM stdin;
1692ce9f-724c-4fe0-a112-a231d0bf6054	00000000-0000-0000-0000-000000000001	0	0	2025-10-07 12:59:38.015	2025-10-07 12:59:38.015	2025-10-07 12:59:38.015447
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaigns (id, tenant_id, name, status, template_ids, quiet_hours_start, quiet_hours_end, target_url, created_at, updated_at, queued_at, completed_at) FROM stdin;
baaedb6b-c3ab-476a-8964-eb0f4cd1f0da	1b5019fb-1be6-47b9-908a-2b276ce43b17	SQL Test Campaign	draft	["3d5df277-b609-48c0-ad35-6f52797bf54e"]	21	9	\N	2025-10-08 00:38:21.819656	2025-10-08 00:38:21.819656	\N	\N
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, tenant_id, phone_e164, email, first_name, last_name, timezone, custom_fields, consent_status, consent_source, consent_timestamp, last_sent_at, import_batch_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: costs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.costs (id, provider, country, per_part_cents, effective_from, effective_until, created_at) FROM stdin;
f6e521e1-384e-41ac-990d-9496242bf207	twilio	AU	8	2025-10-07 12:59:38.018	2026-10-07 12:59:38.018	2025-10-07 12:59:38.01913
\.


--
-- Data for Name: do_not_contact; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.do_not_contact (id, tenant_id, phone_e164, reason, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, tenant_id, contact_id, campaign_id, send_job_id, short_link_id, event_type, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: import_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.import_batches (id, tenant_id, file_name, file_hash, total_rows, created_count, updated_count, skipped_count, rejected_count, status, rejected_rows, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: magic_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.magic_tokens (id, user_id, token, expires_at, used_at, created_at) FROM stdin;
b5df10c4-d0b1-4a47-a988-eb2637212f54	23d4f23d-9416-4693-91d5-a341fadbaaa2	2j5KwDo-YCtC66CWnt_TY-7S8cNvwJvt6opbeCTQlU4	2025-10-08 00:27:33.725	2025-10-08 00:12:50.737	2025-10-08 00:12:33.726719
d885a1ba-a985-44d2-a8a3-e6e9a1354459	23d4f23d-9416-4693-91d5-a341fadbaaa2	kpwpd5f7OHkHHxXUog3xtdGiaIfSWB-oCk5k5icIDKg	2025-10-08 00:38:41.101	2025-10-08 00:23:58.008	2025-10-08 00:23:41.101479
89c66c98-15a1-4867-b997-7732672788e3	23d4f23d-9416-4693-91d5-a341fadbaaa2	BQfKb-LjZzutF_jOkERROZtQzthewZSUrk70NveapQk	2025-10-08 00:46:04.881	2025-10-08 00:31:22.353	2025-10-08 00:31:04.881975
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_templates (id, tenant_id, name, body, variables, is_active, created_at, updated_at) FROM stdin;
3d5df277-b609-48c0-ad35-6f52797bf54e	00000000-0000-0000-0000-000000000001	Review Request 1	Hi {{firstName}}, thanks for choosing us! We'd love your feedback. {{link}} Reply STOP to opt out.	"[\\"firstName\\",\\"link\\"]"	t	2025-10-07 12:59:38.006649	2025-10-07 12:59:38.006649
00a96d5f-2085-401f-a504-0da1340df3e0	00000000-0000-0000-0000-000000000001	Review Request 2	Hello {{firstName}}! Your opinion matters. Share your experience: {{link}} Reply STOP to opt out.	"[\\"firstName\\",\\"link\\"]"	t	2025-10-07 12:59:38.006649	2025-10-07 12:59:38.006649
7a00afb8-8028-4de2-8d19-598d1ddf0f1f	00000000-0000-0000-0000-000000000001	Review Request 3	Hi {{firstName}}, how was your experience? Let us know: {{link}} Reply STOP to opt out.	"[\\"firstName\\",\\"link\\"]"	t	2025-10-07 12:59:38.006649	2025-10-07 12:59:38.006649
\.


--
-- Data for Name: outbox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outbox (id, aggregate_id, aggregate_type, event_type, payload, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: send_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.send_jobs (id, tenant_id, campaign_id, contact_id, template_id, sending_number_id, status, body, parts, cost_cents, provider_message_id, failure_reason, queued_at, sent_at, delivered_at, failed_at) FROM stdin;
\.


--
-- Data for Name: sending_numbers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sending_numbers (id, tenant_id, phone_e164, provider, daily_limit, per_minute_limit, warmup_start_date, is_active, created_at) FROM stdin;
f20d9552-2241-4896-8db3-b9bc4c2b78ae	00000000-0000-0000-0000-000000000001	+61400000000	twilio	300	10	2025-10-07 12:59:38.01	f	2025-10-07 12:59:38.011186
\.


--
-- Data for Name: short_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.short_links (id, tenant_id, campaign_id, contact_id, token, target_url, clicked_at, click_count, human_click_count, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: suppression_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppression_rules (id, tenant_id, name, window_days, is_active, expires_at, created_at, updated_at) FROM stdin;
5f5d45f5-02ed-4173-a60a-67f3880bb514	00000000-0000-0000-0000-000000000001	Default 90-day cooldown	90	t	\N	2025-10-07 12:59:38.022482	2025-10-07 12:59:38.022482
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, name, timezone, is_paused, daily_budget_cents, monthly_budget_cents, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	Primary Tenant	Australia/Sydney	f	10000	200000	2025-10-07 12:59:37.996221	2025-10-07 12:59:37.996221
1b5019fb-1be6-47b9-908a-2b276ce43b17	Test Tenant	Australia/Sydney	f	\N	\N	2025-10-08 00:10:27.330924	2025-10-08 00:10:27.330924
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, tenant_id, email, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
113dcf72-4739-4dce-8db2-e95234cf71ff	00000000-0000-0000-0000-000000000001	admin@example.com	admin	t	\N	2025-10-07 12:59:38.001664	2025-10-07 12:59:38.001664
23d4f23d-9416-4693-91d5-a341fadbaaa2	1b5019fb-1be6-47b9-908a-2b276ce43b17	test@example.com	admin	t	2025-10-08 00:31:22.357	2025-10-08 00:10:45.168986	2025-10-08 00:10:45.168986
\.


--
-- Data for Name: webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhook_events (id, tenant_id, provider_event_id, event_type, payload, processed_at) FROM stdin;
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: costs costs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costs
    ADD CONSTRAINT costs_pkey PRIMARY KEY (id);


--
-- Name: do_not_contact do_not_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.do_not_contact
    ADD CONSTRAINT do_not_contact_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: magic_tokens magic_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_pkey PRIMARY KEY (id);


--
-- Name: magic_tokens magic_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_token_unique UNIQUE (token);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: send_jobs send_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_pkey PRIMARY KEY (id);


--
-- Name: sending_numbers sending_numbers_phone_e164_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sending_numbers
    ADD CONSTRAINT sending_numbers_phone_e164_unique UNIQUE (phone_e164);


--
-- Name: sending_numbers sending_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sending_numbers
    ADD CONSTRAINT sending_numbers_pkey PRIMARY KEY (id);


--
-- Name: short_links short_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_pkey PRIMARY KEY (id);


--
-- Name: short_links short_links_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_token_unique UNIQUE (token);


--
-- Name: suppression_rules suppression_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppression_rules
    ADD CONSTRAINT suppression_rules_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_provider_event_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_provider_event_id_unique UNIQUE (provider_event_id);


--
-- Name: audit_log_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_created_idx ON public.audit_log USING btree (created_at);


--
-- Name: audit_log_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_tenant_idx ON public.audit_log USING btree (tenant_id);


--
-- Name: audit_log_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_user_idx ON public.audit_log USING btree (user_id);


--
-- Name: budgets_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX budgets_tenant_idx ON public.budgets USING btree (tenant_id);


--
-- Name: campaigns_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_status_idx ON public.campaigns USING btree (status);


--
-- Name: campaigns_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX campaigns_tenant_idx ON public.campaigns USING btree (tenant_id);


--
-- Name: contacts_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_email_idx ON public.contacts USING btree (email);


--
-- Name: contacts_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contacts_tenant_idx ON public.contacts USING btree (tenant_id);


--
-- Name: contacts_tenant_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contacts_tenant_phone_idx ON public.contacts USING btree (tenant_id, phone_e164);


--
-- Name: costs_provider_country_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX costs_provider_country_idx ON public.costs USING btree (provider, country);


--
-- Name: dnc_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dnc_tenant_idx ON public.do_not_contact USING btree (tenant_id);


--
-- Name: dnc_tenant_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX dnc_tenant_phone_idx ON public.do_not_contact USING btree (tenant_id, phone_e164);


--
-- Name: events_campaign_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_campaign_idx ON public.events USING btree (campaign_id);


--
-- Name: events_contact_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_contact_idx ON public.events USING btree (contact_id);


--
-- Name: events_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_created_idx ON public.events USING btree (created_at);


--
-- Name: events_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_tenant_idx ON public.events USING btree (tenant_id);


--
-- Name: events_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_type_idx ON public.events USING btree (event_type);


--
-- Name: import_batches_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_batches_hash_idx ON public.import_batches USING btree (file_hash);


--
-- Name: import_batches_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX import_batches_tenant_idx ON public.import_batches USING btree (tenant_id);


--
-- Name: magic_tokens_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX magic_tokens_token_idx ON public.magic_tokens USING btree (token);


--
-- Name: magic_tokens_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX magic_tokens_user_idx ON public.magic_tokens USING btree (user_id);


--
-- Name: outbox_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX outbox_created_idx ON public.outbox USING btree (created_at);


--
-- Name: outbox_processed_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX outbox_processed_idx ON public.outbox USING btree (processed_at);


--
-- Name: send_jobs_campaign_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX send_jobs_campaign_idx ON public.send_jobs USING btree (campaign_id);


--
-- Name: send_jobs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX send_jobs_status_idx ON public.send_jobs USING btree (status);


--
-- Name: send_jobs_tenant_campaign_contact_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX send_jobs_tenant_campaign_contact_idx ON public.send_jobs USING btree (tenant_id, campaign_id, contact_id);


--
-- Name: send_jobs_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX send_jobs_tenant_idx ON public.send_jobs USING btree (tenant_id);


--
-- Name: sending_numbers_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sending_numbers_phone_idx ON public.sending_numbers USING btree (phone_e164);


--
-- Name: sending_numbers_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sending_numbers_tenant_idx ON public.sending_numbers USING btree (tenant_id);


--
-- Name: short_links_campaign_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX short_links_campaign_idx ON public.short_links USING btree (campaign_id);


--
-- Name: short_links_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX short_links_tenant_idx ON public.short_links USING btree (tenant_id);


--
-- Name: short_links_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX short_links_token_idx ON public.short_links USING btree (token);


--
-- Name: suppression_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suppression_active_idx ON public.suppression_rules USING btree (is_active);


--
-- Name: suppression_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suppression_tenant_idx ON public.suppression_rules USING btree (tenant_id);


--
-- Name: templates_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX templates_tenant_idx ON public.message_templates USING btree (tenant_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_tenant_idx ON public.users USING btree (tenant_id);


--
-- Name: webhook_events_provider_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX webhook_events_provider_idx ON public.webhook_events USING btree (provider_event_id);


--
-- Name: webhook_events_tenant_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX webhook_events_tenant_idx ON public.webhook_events USING btree (tenant_id);


--
-- Name: audit_log audit_log_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: audit_log audit_log_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: budgets budgets_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: campaigns campaigns_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: contacts contacts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: do_not_contact do_not_contact_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.do_not_contact
    ADD CONSTRAINT do_not_contact_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: events events_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: events events_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: events events_send_job_id_send_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_send_job_id_send_jobs_id_fk FOREIGN KEY (send_job_id) REFERENCES public.send_jobs(id);


--
-- Name: events events_short_link_id_short_links_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_short_link_id_short_links_id_fk FOREIGN KEY (short_link_id) REFERENCES public.short_links(id);


--
-- Name: events events_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: import_batches import_batches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: magic_tokens magic_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.magic_tokens
    ADD CONSTRAINT magic_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: message_templates message_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: send_jobs send_jobs_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: send_jobs send_jobs_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: send_jobs send_jobs_template_id_message_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_template_id_message_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.message_templates(id);


--
-- Name: send_jobs send_jobs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.send_jobs
    ADD CONSTRAINT send_jobs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: sending_numbers sending_numbers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sending_numbers
    ADD CONSTRAINT sending_numbers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: short_links short_links_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: short_links short_links_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: short_links short_links_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: suppression_rules suppression_rules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppression_rules
    ADD CONSTRAINT suppression_rules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: users users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: webhook_events webhook_events_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- PostgreSQL database dump complete
--

\unrestrict PIohNiBiRsGkyiZj54IalkPzFPji4jsge3CqjrnTi2v6nikgqcpCEq7GHQnZuMG

