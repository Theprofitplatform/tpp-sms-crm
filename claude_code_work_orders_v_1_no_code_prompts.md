Use: paste one prompt at a time into Claude Code. No code in this doc. Claude Code outputs the code, tests, and files.

Work Order A — Monorepo scaffold and infra
Role
- Senior engineer automating a TypeScript monorepo on a Linux VPS with pnpm and Docker. Target low-ops.

Goal
- Set up repo, workspaces, env files, health endpoints, dev and prod run paths, CI skeleton.

Inputs
- Product and data requirements from the Requirements Pack v1.

Constraints
- pnpm workspaces. Node 20. TypeScript. No global system dependencies beyond Docker, pnpm, PM2 acceptable. Keep scripts simple.

Tasks
- Create monorepo layout: apps/api, apps/web, worker/shortener, packages/lib, infra, postman.
- Add package.json at root with workspace scripts, TypeScript config, lint, format, test placeholders.
- Add .env.example with all keys named in the pack. No secrets.
- Add health endpoints for API and worker.
- Add Dockerfiles for api, worker, web. Build for Node 20 alpine.
- Add docker-compose for dev and docker-compose.prod for prod with Postgres, Redis, api, worker, web.
- Add GitHub Actions workflow for lint, type-check, test on push.
- Add README with run steps for dev and prod.

Deliverables
- Monorepo files and folders.
- Health route returning JSON with ok true and ts.
- Working dev scripts: one command per service.
- Working prod compose with ports and dependencies.

Acceptance
- Fresh clone boots dev API and worker and web locally.
- Health endpoints respond.
- Compose up runs services and exposes ports.

Out of scope
- Business logic, DB schema, UI features.

Work Order B — Data model and migrations
Role
- Data engineer defining relational schema and migrations.

Goal
- Implement entities and constraints exactly per the Requirements Pack v1 sections 3, 4, and 5.

Inputs
- Entity list, keys, and constraints in the pack.

Constraints
- Postgres 16. Drizzle ORM migrations. Idempotent.

Tasks
- Create migrations for: tenants, contacts, do_not_contact, campaigns, message_templates, send_jobs, suppression_rules, short_links, events, sending_numbers, webhook_events, budgets, costs, import_batches (lineage), outbox.
- Enforce unique: contacts(tenant_id, phone_e164), send_jobs(tenant_id, campaign_id, contact_id), short_links(token), do_not_contact(tenant_id, phone_e164), webhook_events(provider_event_id).
- Add partial index for active suppression rules (expires_at null or in future).
- Seed one tenant and three message templates.
- Add ERD diagram export (as an image or markdown description).

Deliverables
- Migration files, seed script, ERD.

Acceptance
- Migrations apply on empty DB. Seed inserts rows. Unique constraints hold on duplicate inserts.

Out of scope
- API routes and UI.

Work Order C — Import flows
Role
- Backend + frontend engineer building CSV import UX and APIs.

Goal
- CSV mapping, dry-run with per-row decisions, commit with upsert, lineage, rejected-rows export.

Inputs
- Import rules from the pack: normalization, AU default, idempotency key, reasons.

Constraints
- 10k rows under 60 seconds on VPS.

Tasks
- Create endpoints: POST /imports/contacts/dry-run, POST /imports/contacts/commit, GET /imports/:id (summary), GET /imports/:id/rejected.csv.
- Dry-run decides per row: create, update, duplicate, invalid_phone, dnc, suppressed_by_cooldown; include reasons.
- Commit writes contacts with upsert, writes import lineage rows, sets country default AU if missing.
- Admin screen: file upload with header mapping, dry-run preview (counts + first 50 decisions), commit action, download rejected CSV.
- Log import batch id on all created/updated contacts.

Deliverables
- API routes and admin screen.

Acceptance
- Sample CSV of 1k rows returns preview in under 5 seconds, commit under 30 seconds. No duplicates created. Rejected CSV downloads.

Out of scope
- Advanced matching beyond phone + email.

Work Order D — Campaigns and send engine
Role
- Backend engineer for queueing and sending.

Goal
- Create campaigns, queue eligible contacts, enforce all gates, send and record events.

Inputs
- Gate order and state machine from the pack.

Constraints
- Idempotency. No double sends. Respect quiet hours and caps.

Tasks
- Endpoints: POST /campaigns (create), GET /campaigns/:id, POST /campaigns/:id/queue (segment optional), POST /messages/preview (length and parts).
- Queue logic: enforce gate order (pause, budget, DNC, suppression window, quiet hours, rate limits, warm-up), template rotation, idempotent job ids.
- Worker: send via provider adapter, record SENT, handle retries on 5xx, mark FAILED on 4xx invalid.
- Record costs per message part if price known. Otherwise keep placeholders.

Deliverables
- Campaign CRUD minimal, queue builder, worker send logic, message preview route.

Acceptance
- Enqueue skips DNC and suppressed contacts. Sends pause during quiet hours. Restarting worker does not duplicate messages.

Out of scope
- Segmentation UI beyond a simple all-contacts or tag filter.

Work Order E — Short links and click integrity
Role
- Edge engineer delivering a short domain and click tracking rules.

Goal
- Unique tokens per contact and campaign, redirect with right headers, bot-filtered analytics.

Inputs
- Click integrity spec from the pack.

Constraints
- No PII in tokens or URLs. Token TTL 60 days.

Tasks
- Provision short domain. Implement redirect service (edge function or worker) with 302 and Referrer-Policy no-referrer. Set HSTS.
- API to create token for target URL. Store token mapping and clicked_at.
- Optional callback from edge on first click to record CLICKED event.
- Bot filter: ignore known scanners, first-second multi-click bursts, UA heuristics. Expose clicks_human in reports.

Deliverables
- Short domain service, API integration, bot filter rules documented.

Acceptance
- Clicks register once per user in normal cases. CTR not inflated by obvious bot traffic.

Out of scope
- Full device fingerprinting.

Work Order F — Webhooks and STOP routing
Role
- Backend engineer handling inbound and status callbacks.

Goal
- Signed webhooks, tenant mapping via receiving number, STOP and START flows, state machine transitions.

Inputs
- Opt-out matrix and state machine from the pack.

Constraints
- Signature and timestamp checks mandatory. Idempotency by provider_event_id.

Tasks
- Webhook endpoint for provider status and inbound messages. Verify signature and reject stale payloads.
- Map inbound To number to tenant via sending_numbers. No fall-through to wrong tenant.
- Persist events: QUEUED, SENT, DELIVERED, FAILED, REPLIED, OPT_OUT, RESUBSCRIBE.
- STOP and synonyms: write DNC, send confirmation, block future sends. START and synonyms: remove DNC, send confirmation.
- Store webhook_events for replay protection. Document error handling and retries.

Deliverables
- Webhook endpoint and documentation.

Acceptance
- Forged requests rejected. Duplicate events ignored. STOP blocks future sends in under 60 seconds.

Out of scope
- Multi-provider fan-out.

Work Order G — Reporting
Role
- Full-stack engineer for metrics and timelines.

Goal
- Campaign report and contact timeline that reflect definitions in the pack.

Inputs
- Analytics definitions and click integrity.

Constraints
- Report loads under 2 seconds at 100k events.

Tasks
- Endpoints: GET /campaigns/:id/report, GET /contacts/:id/timeline. Include sent, delivered, failed, clicks_total, clicks_human, opt-outs, CTR, template breakdown.
- Admin views: campaign report page and contact timeline page.
- Export CSV for campaign summary.

Deliverables
- Report APIs and admin screens.

Acceptance
- Numbers reconcile with events and short_links. CTR shows human-filtered and raw.

Out of scope
- Cross-campaign attribution.

Work Order H — Budgets, caps, kill switch
Role
- Backend engineer adding spend guards.

Goal
- Daily and monthly budgets per tenant, per-minute rate limits, warm-up enforcement, one-click pause.

Inputs
- Deliverability playbook and cost model from the pack.

Constraints
- Stop new sends within 60 seconds when paused or over budget.

Tasks
- Endpoints: POST /tenants/:id/budget, GET /tenants/:id/budget, POST /tenants/:id/pause, POST /tenants/:id/resume.
- Worker checks: budgets before enqueue and before send, per-minute tenant and per-number rate limits, warm-up curve by date and number.
- Admin controls: budget editor and pause toggle with status indicator.
- Alerts: when nearing cap, on pause, on error spikes.

Deliverables
- Budget model, enforcement, UI controls, alert hooks.

Acceptance
- Spend halted above cap. Pause toggle stops sends within 60 seconds. Rate limits reduce throughput as configured.

Out of scope
- Billing integration.

Work Order I — Auth and RBAC
Role
- Security-focused engineer for admin auth.

Goal
- Email magic links, roles admin/staff/viewer, CSRF, basic audit log.

Inputs
- Threat model and secrets policy from the pack.

Constraints
- Session TTL. 2FA optional in phase 2.

Tasks
- Auth endpoints for magic link start/finish, session middleware, role checks.
- Admin UI for login and logout.
- CSRF protection on form posts. Basic audit log for admin actions (who, what, when).

Deliverables
- Working login, protected routes, role-gated actions.

Acceptance
- No access to admin routes without auth. Viewer cannot modify.

Out of scope
- SSO.

Work Order J — Ops and backups
Role
- SRE delivering runbooks, backups, restore tests, and monitoring.

Goal
- Daily backups, weekly restore drill, metrics, logs, and alerts.

Inputs
- Backup and restore runbook, KPIs, SLOs from the pack.

Constraints
- RPO 24 hours. RTO 60 minutes.

Tasks
- Backup scripts and retention. Restore script and scheduled test.
- Metrics: sends/min, delivery rate, failure rate, webhook lag, opt-out rate, parts cost. Logs: structured JSON with correlation ids.
- Dashboard with top panels and alerts for spikes and outages.
- Operations README with on-call steps and common failures.

Deliverables
- Scripts, dashboard JSON or steps, alert rules, ops docs.

Acceptance
- Weekly restore passes. Alerts fire in test. Dashboard shows live data.

End of Work Orders

