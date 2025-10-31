# SerpBear - Complete Feature and Architecture Analysis

## Overview
**SerpBear** is an open-source SEO rank tracking and keyword research platform. It provides a comprehensive solution for tracking keyword positions in Google search results and integrating with Google Ads and Google Search Console.

**Current Version:** 2.0.7  
**Tech Stack:** Next.js (Frontend + Backend), SQLite (Database), TypeScript

---

## Core Features

### 1. Keyword Position Tracking
- **Unlimited Domains & Keywords:** Track multiple domains with unlimited keywords each
- **Multi-location Tracking:** Support for countries, cities, and geographic coordinates (latlong)
- **Device Tracking:** Monitor positions for desktop and mobile separately
- **Position History:** Maintains detailed position history with timestamps
- **SERP Integration:** Real-time Google search result scraping and analysis

**Key Data Points:**
- Current position
- Position history (dates mapped to positions)
- Search volume
- Device type (desktop/mobile)
- Country and city targeting
- URL tracking (top 10 SERP results)

### 2. Email Notifications
- **Interval Options:** Hourly, Daily (with morning time), Every 2 days, Weekly, Monthly
- **Selective Notifications:** Configure per domain or globally
- **Custom Recipients:** Multiple email addresses per domain
- **SMTP Integration:** Customizable SMTP server settings
- **Position Change Alerts:** Notified of keyword movements

### 3. Google Search Console Integration
- **Automated Data Sync:** Daily cron job to fetch SC data
- **Actual Metrics:** Real click-through rates (CTR), impressions, and actual visits
- **Keyword Insights:** Top performing keywords, countries, and pages
- **Historical Data:** 30-day, 7-day, and 3-day average metrics
- **Analytics:** Detailed analytics dashboard showing SC statistics

**Data Collected:**
- Impressions (yesterday, 3-day avg, 7-day avg, 30-day avg)
- Visits/Clicks (yesterday, 3-day avg, 7-day avg, 30-day avg)
- CTR (yesterday, 3-day avg, 7-day avg, 30-day avg)
- Position (yesterday, 3-day avg, 7-day avg, 30-day avg)

### 4. Google Ads Keyword Research
- **Keyword Ideas Generation:** Auto-generate keyword suggestions from:
  - Custom keyword lists
  - Website content (from domain/URLs)
  - Existing tracked keywords (seed keywords)
  - Google Search Console data
- **Search Volume Data:** Monthly search volume for keywords
- **Competition Analysis:** Competition level (HIGH/MEDIUM/LOW)
- **Favorites System:** Mark and save favorite keyword ideas

**Keyword Idea Attributes:**
- UID (unique identifier)
- Keyword text
- Monthly search volumes (historical data)
- Average monthly searches
- Competition level
- Competition index (0-100)
- Country targeting
- Added/Updated timestamps

### 5. SERP Scraping Services Integration
SerpBear integrates with multiple third-party scraping services:

| Service | Cost | Monthly Limits | Features |
|---------|------|---|----------|
| ScrapingRobot | Free | 5,000 | API support |
| Serply.io | $49/mo | 5,000 | API support |
| SerpAPI | $50+/mo | 5,000+ | API support |
| SpaceSerp | $59 lifetime | 15,000 | API support |
| SearchAPI.io | $40+/mo | 10,000+ | API support |
| ValueSerp | Pay as you go | $2.50/1K | No API |
| Serper.dev | Pay as you go | $1.00/1K | No API |
| HasData | $29+/mo | 10,000+ | API support |

**Fallback Options:**
- Proxy IP support for own infrastructure
- Custom proxy list configuration

### 6. Settings Management
- **Scraper Configuration:** Select and configure scraping service
- **API Key Management:** Secure encryption of API keys (using Cryptr)
- **Email Configuration:** SMTP server and credentials
- **Google Integrations:** Search Console and Ads credentials
- **Screenshot Integration:** Website screenshot API for domain thumbnails

---

## Database Schema

### Domain Model
```typescript
type DomainType = {
   ID: number,
   domain: string,           // Domain URL (e.g., "example.com")
   slug: string,             // URL-safe slug (e.g., "example-com")
   tags?: string,            // JSON array of tags
   notification: boolean,    // Enable/disable notifications
   notification_interval: string, // 'daily', 'weekly', 'monthly', etc.
   notification_emails: string,   // Comma-separated emails
   lastUpdated: string,      // Last keyword position update
   added: string,            // Date added
   keywordCount?: number,    // Number of tracked keywords
   keywordsUpdated?: string, // When keywords were last updated
   avgPosition?: number,     // Average position across keywords
   scVisits?: number,        // Google Search Console visits
   scImpressions?: number,   // Google Search Console impressions
   scPosition?: number,      // Google Search Console average position
   search_console?: string,  // JSON with encrypted SC credentials
   ideas_settings?: string,  // JSON with keyword ideas settings
}
```

### Keyword Model
```typescript
type KeywordType = {
   ID: number,
   keyword: string,          // The keyword phrase
   device: string,           // 'desktop' or 'mobile'
   country: string,          // ISO country code (e.g., 'US')
   domain: string,           // Associated domain
   city?: string,            // Optional city targeting
   lastUpdated: string,      // Last position check timestamp
   added: string,            // Date keyword was added
   position: number,         // Current SERP position (0 = not found)
   volume: number,           // Monthly search volume
   sticky: boolean,          // Pin to top of list
   history: KeywordHistory,  // {date: position} map
   lastResult: KeywordLastResult[], // Top 3 SERP results
   url: string,              // Primary tracking URL
   tags: string[],           // Categorization tags
   updating: boolean,        // Currently refreshing position
   lastUpdateError: {date, error, scraper} | false, // Error details
   scData?: KeywordSCData,   // Google Search Console data
   uid?: string,             // Unique identifier
}
```

**KeywordHistory Format:**
```typescript
{
  "2024-10-28": 5,
  "2024-10-27": 6,
  "2024-10-26": 5,
  ...
}
```

**SERP Result Item:**
```typescript
type KeywordLastResult = {
   position: number,        // Position in SERP (1-based)
   url: string,             // Result URL
   title: string,           // Result title
}
```

---

## API Endpoints

### Keywords Management
- **GET `/api/keywords?domain=example.com`** - Get all keywords for a domain
- **POST `/api/keywords`** - Add new keywords
  - Payload: `{ keywords: [{keyword, device, country, domain, tags?, city?}] }`
  - Auto-queues SERP scraping and volume updates
- **PUT `/api/keywords?id=1,2,3`** - Update keywords (sticky status, tags)
- **DELETE `/api/keywords?id=1,2,3`** - Remove keywords

### Domains Management
- **GET `/api/domains?withstats=true`** - Get all domains with statistics
- **POST `/api/domains`** - Add new domain
  - Payload: `{ domains: ["example.com"] }`
- **PUT `/api/domains?domain=example.com`** - Update domain settings
  - Payload: `{ notification_interval, notification_emails, search_console }`
- **DELETE `/api/domains?domain=example.com`** - Delete domain and associated keywords

### Position Refresh
- **POST `/api/refresh?id=1,2,3`** - Manually refresh keyword positions
  - For single keyword: waits for completion, returns updated keywords
  - For multiple: processes asynchronously in background
- **GET `/api/refresh?keyword=...&country=US&device=desktop`** - Get SERP for a keyword

### Google Search Console
- **GET `/api/insight?domain=example.com`** - Get SC insights
  - Returns: pages, keywords, countries, and stats
  - Caches results for 24 hours
  - Returns insights sorted by clicks/impressions/CTR
- **POST `/api/searchconsole`** - Sync SC data (CRON job)
  - Runs daily automatically

### Keyword Ideas & Research
- **GET `/api/ideas?domain=example.com`** - Get keyword ideas for domain
- **POST `/api/ideas`** - Generate new keyword ideas
  - Payload: `{ keywords: [], country, language, domain, seedSCKeywords, seedCurrentKeywords, seedType }`
  - Requires Google Ads integration
- **PUT `/api/ideas`** - Mark/unmark keyword ideas as favorites

### Google Ads Integration
- **GET `/api/adwords?code=...`** - OAuth callback for Google Ads
- **POST `/api/adwords`** - Validate Ads credentials
  - Payload: `{ developer_token, account_id }`

### Settings
- **GET `/api/settings`** - Retrieve app settings (with decrypted values)
- **PUT `/api/settings`** - Update app settings
  - Payload includes: scraper_type, API keys, SMTP config, Google credentials
  - Values are encrypted before storage

### Email Notifications
- **POST `/api/notify`** - Send position change notifications (CRON job)
  - Runs on configured interval (daily_morning default)
  - Compares current vs. previous positions
  - Generates HTML email with position changes

### Volume Data
- **GET `/api/volume`** - Get search volume for keywords
- **POST `/api/volume`** - Update volume data (CRON job)

### System
- **POST `/api/cron`** - Trigger keyword position refresh (CRON job)
- **POST `/api/clearfailed`** - Retry failed scraping queue
- **GET `/api/health`** - System health check
- **POST `/api/dbmigrate`** - Run database migrations
- **POST `/api/login`** - User authentication
- **GET `/api/logout`** - User logout

---

## Components Structure

### Common Components
- **TopBar.tsx** - Main navigation bar with domain selector
- **Sidebar.tsx** - Navigation sidebar
- **Icon.tsx** - Icon system (25KB - extensive icon library)
- **Modal.tsx** - Modal dialog wrapper
- **InputField.tsx** - Form input component
- **SelectField.tsx** - Dropdown selector
- **SecretField.tsx** - Masked password input
- **ToggleField.tsx** - Toggle switch
- **Chart.tsx** - Position history chart
- **ChartSlim.tsx** - Compact chart variant
- **Footer.tsx** - Application footer
- **SidePanel.tsx** - Slide-out panel

### Keywords Components
- **AddKeywords.tsx** - Bulk keyword import UI
- **Keyword.tsx** - Individual keyword card
- **KeywordDetails.tsx** - Detailed keyword view
- **KeywordPosition.tsx** - Position indicator
- **KeywordsTable.tsx** - Paginated keyword table (16KB)
- **KeywordFilter.tsx** - Advanced filtering (country, tags, search)
- **KeywordTagManager.tsx** - Tag management UI
- **AddTags.tsx** - Tag assignment dialog
- **SCKeyword.tsx** - Google Search Console keyword view
- **SCKeywordsTable.tsx** - SC keywords table (11KB)

### Domains Components
- **DomainItem.tsx** - Domain card with stats
- **AddDomain.tsx** - Domain creation modal

### Settings Components
- **Settings.tsx** - Settings panel
- **IntegrationCards** - Scraper/API integration options

---

## Cron Jobs & Background Tasks

### 1. Keyword Position Refresh
- **Frequency:** Configurable (Hourly, Daily, Every 2 days, Weekly, Monthly)
- **Trigger:** `/api/cron` endpoint
- **Action:** Refreshes all keyword positions via scraper API
- **Queue Management:** Failed scrapes are queued and retried hourly

### 2. Email Notifications
- **Frequency:** Daily morning (3 AM), Weekly, Monthly, or Never
- **Trigger:** `/api/notify` endpoint
- **Action:** Generates HTML email with position changes
- **Details:** Shows which keywords moved up/down, by how much

### 3. Google Search Console Sync
- **Frequency:** Daily at midnight
- **Trigger:** `/api/searchconsole` endpoint
- **Requires:** SC credentials configured globally or per-domain
- **Data Stored:** Local JSON files per domain (`data/SC_domain.json`)
- **Cache Duration:** 24 hours before re-fetching

### 4. Failed Queue Retry
- **Frequency:** Hourly
- **Trigger:** `/api/clearfailed` endpoint
- **Source:** `data/failed_queue.json`
- **Action:** Re-attempts failed SERP scrapes

---

## Key Utilities

### Scraper Integration (`utils/scraper.ts`)
- Supports custom scraper implementations
- Each scraper defines:
  - `scrapeURL()` - Generate API request URL
  - `headers()` - Custom HTTP headers
  - `serpExtractor()` - Parse scraper response
- Handles errors and fallback to failed queue

### Search Console Integration (`utils/searchConsole.ts`)
- **Google API Client:** Uses @googleapis/searchconsole
- **Data Fetching:** Retrieves 90 days of search analytics
- **Caching:** Local JSON files per domain
- **Encryption:** SC credentials encrypted with Cryptr
- **Data Types:** Tracks 3-day, 7-day, and 30-day metrics

### Google Ads Integration (`utils/adwords.ts`)
- **OAuth Flow:** Handles Google Ads OAuth callback
- **Keyword Ideas:** Generates ideas using Google Ads API
- **Refresh Token:** Stores refresh token for long-term access
- **Monthly Volumes:** Fetches search volume data
- **Language Support:** Configurable by language ID

### Email Generation (`utils/generateEmail.ts`)
- Converts keyword position changes to HTML email
- Shows domain name, position changes, and summary stats
- Uses nodemailer for SMTP transmission

### Domain Stats (`utils/domains.ts`)
- Calculates aggregate statistics per domain
- Average position across keywords
- Keyword count
- Last update timestamp
- Search Console metrics (if integrated)

---

## Authentication & Security

### User Verification
- API key-based authentication
- Environment variable: `APIKEY` (Bearer token)
- Middleware: `verifyUser()` on all protected endpoints
- Cookie-based session management for web UI

### Data Encryption
- **Encryption Library:** Cryptr (symmetric encryption)
- **Key Source:** `process.env.SECRET`
- **Encrypted Fields:**
  - Scraper API keys
  - SMTP passwords
  - Google Ads credentials
  - Google Search Console credentials

### Session Management
- JWT tokens for API authentication
- Cookie-based session for web interface
- Login endpoint: `/pages/login`
- Logout endpoint: `/api/logout`

---

## File Storage

### Settings Configuration
- **Location:** `/data/settings.json`
- **Contents:** Encrypted API keys, SMTP config, scraper settings
- **Format:** JSON with Cryptr-encrypted sensitive values

### Search Console Data
- **Location:** `/data/SC_{domain-slug}.json`
- **Contents:** Last 90 days of search analytics
- **Refresh:** Daily via cron job
- **Cache TTL:** 24 hours

### Failed Queue
- **Location:** `/data/failed_queue.json`
- **Contents:** Array of keyword IDs that failed to scrape
- **Retry:** Hourly via cron job

---

## Integration Capabilities

### Outbound Integrations
1. **Google Search Console** - Fetch search analytics and performance data
2. **Google Ads** - Generate keyword ideas and search volume data
3. **Third-party Scrapers** - Multiple SERP scraping service providers
4. **Email (SMTP)** - Send position change notifications
5. **Screenshot API** - Fetch domain thumbnails

### Data Export
- Position history and trends available for export
- Keyword ideas can be favorited and tracked
- All data stored in local SQLite database

---

## Performance Considerations

### Caching
- Search Console data cached for 24 hours
- Position history limited to last 7 days in UI (full history stored)
- Keyword volume data cached in settings

### Pagination & Virtualization
- Keywords table uses react-window for virtualization
- Supports large keyword lists (1000+) efficiently
- Client-side filtering and searching

### Rate Limiting
- Built-in retry logic with exponential backoff
- Failed scrapes queued for retry
- Configurable scrape interval and delays

---

## Future Enhancement Opportunities

1. **Batch Operations:** Multi-select keywords for bulk actions
2. **Custom Reports:** PDF/CSV export of position history
3. **Alerts System:** Real-time position drop alerts
4. **API Rate Limiting:** User-tier based rate limits
5. **Multi-user Support:** User management and role-based access
6. **Advanced Analytics:** Trend analysis and predictive positioning
7. **Competitor Tracking:** Track competitor keyword positions
8. **Content Recommendations:** AI-powered content suggestions based on SERP

---

## Integration Points for React Dashboard

### Essential Features to Integrate
1. **Domain Dashboard**
   - List all domains with quick stats
   - Add/remove domains
   - Filter and search

2. **Keyword Management**
   - Add/edit/delete keywords
   - Bulk import from CSV
   - Tag management
   - Position tracking chart

3. **Insights & Analytics**
   - Position history charts
   - Google Search Console integration
   - Keyword performance metrics
   - Top keywords by various metrics

4. **Google Integrations**
   - Search Console data display
   - Keyword ideas research
   - Volume data visualization

5. **Notifications & Settings**
   - Configure email notifications
   - Manage SMTP settings
   - Scraper API configuration
   - Google credentials management

6. **Cron Job Management**
   - Manual refresh triggers
   - View job status and logs
   - Configure update intervals

