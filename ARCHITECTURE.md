# 🏗️ SYSTEM ARCHITECTURE

Comprehensive architecture documentation for the SEO Automation Platform.

---

## 📊 SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                  SEO AUTOMATION PLATFORM                     │
│                    (Node.js + React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React       │  │   Admin      │  │   Client     │      │
│  │  Dashboard   │  │   Panel      │  │   Portal     │      │
│  │  (Port 9000) │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────────────┴──────────────────┘               │
│                            │                                  │
│                 ┌──────────▼──────────┐                      │
│                 │   Express Server    │                      │
│                 │   133 API Endpoints │                      │
│                 │   Port: 9000        │                      │
│                 └──────────┬──────────┘                      │
│                            │                                  │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼──────┐      │
│  │  Services   │  │   Automation    │  │  Database  │      │
│  │   Layer     │  │     Layer       │  │  (SQLite)  │      │
│  └──────┬──────┘  └────────┬────────┘  └─────┬──────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼──────┐      │
│  │              External Services                     │      │
│  │  • WordPress Sites   • Email (SMTP)               │      │
│  │  • OpenAI/Claude     • Google Search Console      │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ DIRECTORY STRUCTURE

```
seo-expert/
├── src/
│   ├── api/                    # API route handlers
│   │   ├── v2/                 # Version 2 endpoints
│   │   ├── activity-log-routes.js
│   │   ├── autofix-review-routes.js
│   │   ├── domains-api.js
│   │   └── keywords-api.js
│   │
│   ├── automation/             # Automation modules
│   │   ├── auto-fixers/        # Auto-fix engines
│   │   ├── email-automation.js # Email campaign engine
│   │   ├── historical-tracker.js
│   │   ├── local-keyword-tracker.js
│   │   ├── social-media-auditor.js
│   │   ├── gmb-optimizer.js
│   │   ├── citation-monitor.js
│   │   ├── competitor-analyzer.js
│   │   └── review-monitor.js
│   │
│   ├── auth/                   # Authentication
│   │   ├── auth-service.js     # Auth business logic
│   │   └── auth-middleware.js  # JWT middleware
│   │
│   ├── database/               # Database layer
│   │   ├── index.js            # Main DB with 47 tables
│   │   ├── history-db.js       # Historical data
│   │   ├── scheduler-db.js     # Job scheduling
│   │   ├── activity-log-db.js
│   │   ├── autofix-db.js
│   │   ├── recommendations-db.js
│   │   ├── goals-db.js
│   │   ├── notifications-db.js
│   │   └── webhooks-db.js
│   │
│   ├── services/               # Business logic services
│   │   ├── optimization-processor.js
│   │   ├── scraper-service.js
│   │   ├── local-seo-scheduler.js
│   │   ├── notification-service.js
│   │   ├── comparison-service.js
│   │   ├── alert-service.js
│   │   ├── export-service.js
│   │   ├── webhook-manager.js
│   │   ├── gsc-service.js
│   │   └── recommendation-generator.js
│   │
│   ├── routes/                 # Express routes
│   │   └── auth-routes.js
│   │
│   ├── middleware/             # Express middleware
│   │   └── route-protection.js
│   │
│   ├── utils/                  # Utility functions
│   │   ├── input-validator.js
│   │   └── safe-exec.js
│   │
│   ├── integrations/           # Third-party integrations
│   │   └── google-search-console/
│   │
│   ├── jobs/                   # Scheduled jobs
│   │   └── position-tracking-cron.js
│   │
│   └── white-label/            # White-label system
│       └── white-label-service.js
│
├── dashboard/                  # React dashboard
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # 30+ page components
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API clients
│   │   └── lib/                # Utilities
│   └── dist/                   # Built assets
│
├── data/                       # SQLite databases
│   ├── seo-automation.db       # Main database (1.2MB)
│   ├── local-seo-history.db    # Historical data
│   └── scheduler.db            # Job scheduling
│
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
│
├── scripts/                    # Automation scripts
│   ├── verify-features.js      # Feature verification
│   └── consolidate-docs.sh     # Documentation cleanup
│
├── docs/                       # Documentation
│   └── archive/                # Historical docs
│
├── dashboard-server.js         # Main server (141KB)
├── ecosystem.config.js         # PM2 configuration
├── docker-compose.yml          # Docker setup
└── .env                        # Environment variables
```

---

## 🔧 CORE COMPONENTS

### 1. Express Server (`dashboard-server.js`)

**Responsibilities:**
- HTTP server on port 9000
- API endpoint routing (133 endpoints)
- Authentication middleware
- Security (Helmet, CORS, rate limiting)
- WebSocket support (Socket.io)
- Static file serving (React dashboard)

**Key Features:**
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting (100 req/15min API, 5 req/15min auth)
- Request logging (Morgan)
- Error handling
- File upload support (Multer)

**Size:** 141KB (~3,000 lines)
**Status:** ⚠️ Needs refactoring (too large)

---

### 2. Database Layer (`src/database/`)

**Schema Design:**
- **47 Tables** total
- **17 Tables** currently populated (36%)
- **SQLite** for development
- **PostgreSQL-ready** (abstraction layer planned)

**Table Categories:**

#### Core Tables (9 tables)
- `clients` - Client information
- `users` - Authentication
- `domains` - Domain management
- `keywords` - Keyword tracking

#### Email System (7 tables)
- `leads` - Lead capture
- `lead_events` - Lead tracking
- `email_campaigns` - Campaign definitions
- `email_queue` - Email scheduling
- `email_sequences` - Drip sequences
- `email_tracking` - Open/click tracking
- `email_unsubscribes` - Opt-outs

#### SEO Automation (10 tables)
- `optimization_history` - All optimizations
- `local_seo_scores` - Local SEO metrics
- `competitor_rankings` - Competitor tracking
- `competitor_alerts` - Ranking alerts
- `keyword_performance` - Keyword positions
- `gsc_metrics` - Google Search Console data
- `auto_fix_actions` - Auto-fix history
- `schema_markup` - Schema implementations
- `schema_opportunities` - AI-detected opportunities
- `page_performance` - Core Web Vitals

#### Reporting (3 tables)
- `reports_generated` - Report metadata
- `report_templates` - Custom templates
- `portal_access_logs` - Access tracking

#### Admin (8 tables)
- `system_logs` - Application logs
- `auth_activity_log` - Auth events
- `password_reset_tokens` - Password resets
- `white_label_config` - Branding configs
- `webhooks` - Webhook registrations
- `webhook_logs` - Webhook delivery logs
- `recommendations` - AI recommendations
- `client_goals` - Goal tracking

#### Otto SEO Features (7 tables)
- `pixel_deployments` - Monitoring scripts
- `pixel_page_data` - Collected data
- `ssr_optimizations` - Server-side fixes
- `ssr_cache` - Optimization cache
- `scraper_settings` - Scraper configuration
- `serp_results` - Search results
- `autofix_*` - Auto-fix review system (3 tables)

**Database Operations (`db.clientOps`, `db.emailOps`, etc.):**
```javascript
import db from './src/database/index.js';

// Client operations
db.clientOps.getById(clientId);
db.clientOps.upsert(clientData);

// Email operations
db.emailOps.queueEmail(emailData);
db.emailOps.getPendingEmails(50);

// Lead operations
db.leadOps.createLead(leadData);
db.leadOps.trackEvent(leadId, 'email_opened');

// Analytics
db.analytics.getClientDashboard(clientId, 30);
```

---

### 3. Automation Layer (`src/automation/`)

**Purpose:** Self-contained modules for SEO automation tasks

#### Email Automation (`email-automation.js` - 693 lines)
- Drip campaign orchestration
- Template rendering
- White-label branding integration
- Queue management
- Tracking (opens, clicks)

#### Historical Tracker (`historical-tracker.js` - 517 lines)
- Stores audit results in SQLite
- Calculates trends (up/down/stable)
- Period comparisons
- Chart data generation
- AI insights

#### Local Keyword Tracker (`local-keyword-tracker.js` - 408 lines)
- Generates local keyword variations
- Tracks positions (near me, location-specific)
- Identifies ranking opportunities
- Optimization recommendations

#### Social Media Auditor (`social-media-auditor.js` - 490 lines)
- Audits 7 platforms (Facebook, Instagram, LinkedIn, etc.)
- NAP consistency checking
- Profile completeness analysis
- Platform-specific recommendations

#### GMB Optimizer (`gmb-optimizer.js` - 515 lines)
- Analyzes 10 GMB sections
- Calculates optimization score (0-100)
- Prioritized action items
- Phased optimization roadmap

#### Other Modules:
- Citation Monitor (396 lines)
- Competitor Analyzer (338 lines)
- Review Monitor (419 lines)

**Module Pattern:**
```javascript
export class ModuleName {
  constructor(config) {
    this.config = config;
    this.db = this.initializeDatabase();
  }

  async analyze() {
    // Analysis logic
  }

  async fix() {
    // Auto-fix logic
  }

  async report() {
    // Report generation
  }
}
```

---

### 4. Services Layer (`src/services/`)

**Purpose:** Business logic separated from routes

**Key Services:**

#### Optimization Processor
- Processes optimization requests
- Validates changes
- Applies fixes
- Tracks results

#### Scraper Service
- Manages multiple scraper providers
- Fallback logic
- Error handling
- Rate limiting

#### Local SEO Scheduler
- Schedules audit runs
- Manages automation jobs
- Handles failures
- Notifications

#### Notification Service
- Email notifications
- Discord webhooks
- In-app notifications
- Notification queue

#### Export Service
- CSV generation
- Excel (XLSX) export
- JSON export
- PDF reports

#### Webhook Manager
- Webhook registration
- Event triggering
- Delivery retry logic
- Signature verification

---

### 5. Authentication System (`src/auth/`)

**Components:**

#### Auth Service (`auth-service.js`)
- User registration
- Login/logout
- Password hashing (bcrypt, 10 rounds)
- JWT token generation
- Password reset flow

#### Auth Middleware (`auth-middleware.js`)
- Token verification
- Role-based access control
- Request authentication
- User context injection

**Security Features:**
- HTTP-only cookies
- JWT tokens (24h expiry)
- Password strength validation
- Activity logging
- Brute-force protection (rate limiting)

**Flow:**
```
1. User submits login
2. Server validates credentials
3. Bcrypt verifies password
4. JWT token generated
5. Token sent in HTTP-only cookie
6. Middleware verifies token on each request
7. User context available in req.user
```

---

### 6. React Dashboard (`dashboard/`)

**Technology Stack:**
- React 18+
- React Router for routing
- Custom hooks for API calls
- shadcn/ui components
- Lucide icons
- TailwindCSS for styling

**Structure:**
```
dashboard/
├── src/
│   ├── pages/              # 30+ page components
│   │   ├── DashboardPage.jsx
│   │   ├── ClientsPage.jsx
│   │   ├── AutoFixPage.jsx
│   │   ├── EmailCampaignsPage.jsx
│   │   └── ...
│   │
│   ├── components/         # Reusable components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── ErrorBoundary.jsx
│   │   └── ...
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAPIRequest.js
│   │   ├── useLocalStorage.js
│   │   └── use-toast.js
│   │
│   ├── services/           # API client
│   │   └── api.js
│   │
│   └── lib/                # Utilities
│       └── utils.js
│
└── dist/                   # Production build
```

**Page Components (30+):**
- Dashboard (overview)
- Clients management
- Domains tracking
- Keywords analysis
- Auto-fix control center
- Auto-fix review system
- Email campaigns
- Analytics
- Reports
- Settings
- White-label config
- API documentation
- Activity logs
- Bulk operations
- Control center
- (and 15+ more)

---

## 🔄 DATA FLOW

### 1. Client Audit Flow

```
User Action (Dashboard)
    ↓
API Request: POST /api/local-seo/audit/:clientId
    ↓
Route Handler (dashboard-server.js)
    ↓
LocalSEOOrchestrator.runAudit()
    ↓
┌─────────────────────────────────┐
│  Parallel Module Execution:     │
│  • NAP Checker                   │
│  • Schema Detector               │
│  • Citation Monitor              │
│  • Review Monitor                │
│  • Competitor Analyzer           │
│  • Social Media Auditor          │
│  • GMB Optimizer                 │
│  • Keyword Tracker               │
└─────────────────────────────────┘
    ↓
Results Aggregation
    ↓
Historical Tracker (save to DB)
    ↓
Response to Client
```

### 2. Email Campaign Flow

```
Lead Captured (Form Submission)
    ↓
POST /api/leads
    ↓
db.leadOps.createLead()
    ↓
db.leadOps.trackEvent('lead_captured')
    ↓
EmailAutomation.triggerCampaign('welcome')
    ↓
db.emailOps.queueEmail()
    ↓
Cron Job (every 15 min): processQueue()
    ↓
EmailSender.send()
    ↓
db.emailOps.trackEvent('sent')
    ↓
User Opens Email
    ↓
GET /api/email/track/:trackingId
    ↓
db.emailOps.trackEvent('opened')
```

### 3. Auto-Fix Flow

```
User: "Run Auto-Fix"
    ↓
POST /api/auto-fix/detect/:clientId
    ↓
AutoFixEngine.detectIssues()
    ↓
WordPress API: Scan site
    ↓
AI Analysis (Claude/OpenAI)
    ↓
Issues Detected
    ↓
User Reviews (optional)
    ↓
POST /api/auto-fix/apply/:clientId
    ↓
WordPress API: Apply fixes
    ↓
db.autoFixOps.record()
    ↓
Notification sent
```

---

## 🔐 SECURITY ARCHITECTURE

### Defense Layers

**Layer 1: Network**
- HTTPS enforcement (production)
- Cloudflare proxy (optional)
- Rate limiting by IP

**Layer 2: Application**
- Helmet.js security headers
- CORS configuration
- Content Security Policy
- XSS protection

**Layer 3: Authentication**
- JWT tokens (HTTP-only cookies)
- Bcrypt password hashing (10 rounds)
- Token expiration (24h)
- Activity logging

**Layer 4: Authorization**
- Role-based access control (RBAC)
- Client-specific data isolation
- Admin-only endpoints
- Protected routes middleware

**Layer 5: Data**
- SQL injection protection (parameterized queries)
- Input validation
- Output sanitization
- Secure file uploads

**Layer 6: Monitoring**
- Activity logs
- Auth event logging
- Error tracking
- Anomaly detection

---

## 📡 API ARCHITECTURE

### API Versioning
- `/api/v1/` - Legacy endpoints
- `/api/v2/` - Current endpoints
- `/api/` - Default (maps to latest)

### Endpoint Categories
1. **Auth** (8 endpoints)
2. **Clients** (15 endpoints)
3. **Leads** (10 endpoints)
4. **Email** (12 endpoints)
5. **Local SEO** (20 endpoints)
6. **Auto-Fix** (15 endpoints)
7. **Reports** (8 endpoints)
8. **White-Label** (6 endpoints)
9. **Keywords** (15 endpoints)
10. **Admin** (21 endpoints)
11. **Webhooks** (5 endpoints)
12. **Analytics** (8 endpoints)

**Total:** 133 endpoints

### Response Format
```javascript
// Success
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

---

## 🗄️ DATABASE ARCHITECTURE

### Design Principles
1. **Normalized** - 3NF for most tables
2. **Indexed** - Key columns have indexes
3. **Constraints** - Foreign keys enforced
4. **Transactions** - ACID compliance
5. **Migrations** - Version-controlled schema

### Performance Optimizations
- WAL mode enabled (Write-Ahead Logging)
- Compound indexes on frequent queries
- Connection pooling (prepared statements)
- Query optimization (<10ms average)

### Scaling Strategy
1. **Development:** SQLite (current)
2. **Small Production:** SQLite (up to 100 clients)
3. **Medium Production:** PostgreSQL (100-1000 clients)
4. **Large Production:** PostgreSQL + Redis cache

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Development
```
┌─────────────────┐
│  Local Machine  │
│  Node.js        │
│  Port: 9000     │
│  SQLite DB      │
└─────────────────┘
```

### Production (Current - PM2)
```
┌─────────────────────────────────┐
│         VPS Server              │
│  ┌──────────────────────────┐  │
│  │  Nginx (Port 80/443)     │  │
│  │  SSL Termination         │  │
│  └──────────┬───────────────┘  │
│             ↓                   │
│  ┌──────────────────────────┐  │
│  │  PM2 Process Manager     │  │
│  │  ├─ Node.js (9000)       │  │
│  │  └─ Auto-restart         │  │
│  └──────────┬───────────────┘  │
│             ↓                   │
│  ┌──────────────────────────┐  │
│  │  SQLite Database         │  │
│  │  /data/seo-automation.db │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

### Production (Recommended - Docker)
```
┌──────────────────────────────────────┐
│         Docker Host                  │
│  ┌────────────────────────────────┐ │
│  │  Nginx Container (80/443)      │ │
│  └────────────┬───────────────────┘ │
│               ↓                      │
│  ┌────────────────────────────────┐ │
│  │  App Container (9000)          │ │
│  │  Node.js + Express             │ │
│  └────────────┬───────────────────┘ │
│               ↓                      │
│  ┌────────────────────────────────┐ │
│  │  PostgreSQL Container (5432)   │ │
│  │  Persistent Volume             │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  Redis Container (6379)        │ │
│  │  (Optional caching)            │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 🔄 SCALABILITY CONSIDERATIONS

### Current Capacity
- **Clients:** ~100 (SQLite limit)
- **Requests:** ~1,000/hour
- **Database:** 1.2MB (very small)
- **Memory:** ~150MB

### Bottlenecks
1. SQLite write concurrency
2. Single server instance
3. No caching layer
4. No load balancing

### Scaling Path

**Stage 1: 100-500 Clients**
- Switch to PostgreSQL
- Add Redis caching
- Optimize queries

**Stage 2: 500-2000 Clients**
- Horizontal scaling (2-3 instances)
- Load balancer
- Separate database server
- CDN for static assets

**Stage 3: 2000+ Clients**
- Microservices architecture
- Message queue (RabbitMQ)
- Distributed caching
- Multi-region deployment

---

## 🧪 TESTING ARCHITECTURE

### Test Pyramid
```
       /\
      /E2E\     (10% - 50 tests)
     /------\
    /Integration\ (30% - 300 tests)
   /------------\
  /  Unit Tests  \ (60% - 600 tests)
 /----------------\
```

**Current Status:**
- Total Tests: 956
- Passing: 880 (92%)
- Failing: 76 (8%)
- Coverage: Unknown (needs report)

### Test Structure
```
tests/
├── unit/              # Fast, isolated tests
│   ├── database/
│   ├── automation/
│   └── services/
├── integration/       # API + database tests
│   ├── auth-api.test.js
│   └── email-flow.test.js
└── e2e/               # Full user journeys
    └── (Playwright tests)
```

---

## 📚 ADDITIONAL DOCUMENTATION

- **Setup Guide:** `SETUP.md`
- **API Reference:** `API_REFERENCE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Contributing:** `CONTRIBUTING.md`

---

**Architecture Version:** 2.0
**Last Updated:** 2025-11-01
**System Status:** ~60% Complete, Production-Ready by Week 4
