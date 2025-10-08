# SMS CRM Development Guide

## Quick Start

### Prerequisites
- Node.js 20+ and pnpm
- Docker and Docker Compose
- PostgreSQL and Redis (or use Docker)

### Initial Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your database and Redis settings

# 3. Start infrastructure
cd infra
docker compose up -d

# 4. Run database migrations
pnpm run migrate

# 5. Start development servers
pnpm run dev:api    # API server (port 3000)
pnpm run dev:web    # Web frontend (port 3001)
pnpm run dev:worker # Background worker (port 3002)
```

## Current Project Status

### ✅ Working Features
- Monorepo structure with pnpm workspaces
- Basic API server with Fastify
- Database schema with Drizzle ORM
- Shared TypeScript library
- Basic test framework (Vitest) - 10 tests passing
- TypeScript build errors fixed
- Basic linting framework configured
- Web application deployed to Cloudflare Pages
- Contact upload functionality working
- Redis session management configured
- Production deployment automation

### ✅ Recently Fixed Issues

#### 1. Web Application Deployment (RESOLVED)
**Problem**: Cloudflare 522 error - origin connection timeout
**Root Cause**: Web container not running in production
**Solution**:
- Fixed Docker build process for web app
- Configured nginx reverse proxy
- Deployed to Cloudflare Pages with custom domain

#### 2. Contact Upload Issues (RESOLVED)
**Problem**: Redis authentication failures
**Root Cause**: Redis service not starting properly
**Solution**: Fixed Redis configuration and service startup

#### 3. Dependency Conflicts (RESOLVED)
**Problem**: `date-fns` module resolution errors
**Solution**: Cleared dependencies and rebuilt packages

#### 2. Linting Issues (MEDIUM PRIORITY)
**Problem**: 369+ linting errors remaining
- Mostly in compiled `dist/` files
- Some import order issues in source files
- TypeScript explicit any warnings

**Fix**:
```bash
# Auto-fix linting issues
pnpm run lint:fix

# Check specific files
pnpm run lint apps/api/src/index.ts
```

#### 3. Performance Issues (MEDIUM PRIORITY)
- Campaign creation loads all contacts into memory
- N+1 queries in gate-checker service
- No pagination or batch processing

#### 4. Missing Integration Tests (LOW PRIORITY)
- No API endpoint tests
- No frontend tests
- No database integration tests

## Development Workflow

### Essential Commands

```bash
# Development
pnpm run dev:api               # API server (port 3000)
pnpm run dev:web               # Web frontend (port 3001)
pnpm run dev:worker            # Background worker (port 3002)

# Testing
pnpm run test                  # Run all tests (10 tests currently)
pnpm run test:coverage         # Run with coverage
pnpm run test:db               # Run database migration tests
pnpm run test:watch            # Run tests in watch mode

# Code Quality
pnpm run lint                  # Run ESLint (369+ issues currently)
pnpm run lint:fix              # Auto-fix linting issues
pnpm run format                # Format code with Prettier
pnpm run format:check          # Check formatting
pnpm run typecheck             # TypeScript type checking

# Database
pnpm run migrate               # Apply migrations
pnpm run migrate:generate      # Generate new migration
pnpm run seed                  # Seed database with test data

# Build
pnpm run build                 # Build all packages
pnpm run build:api             # Build API only
pnpm run build:web             # Build web frontend only
pnpm run build:worker          # Build worker only
```

### Docker Development
```bash
# Full development environment
cd infra
docker compose -f docker-compose.yml up --build

# Production environment
cd infra
docker compose -f docker-compose.prod.yml up -d
```

## Architecture Overview

### Monorepo Structure
- **apps/api** - REST API server (Fastify)
- **apps/web** - Admin UI (Next.js)
- **worker/shortener** - Background worker (Docker)
- **worker/shortener-cloudflare** - Cloudflare Worker for link shortening
- **packages/lib** - Shared utilities, types, and database schema
- **infra/** - Docker and deployment configs

### Core Services
- **PostgreSQL** - Main database
- **Redis** - Sessions, rate limiting, queues
- **Twilio** - SMS provider (optional for dev)

### Key Data Flow
1. CSV Import → Dry-run preview → Database upsert
2. Campaign Creation → Gate checks → Queue → Send via worker
3. Webhooks → Signature verification → State updates
4. Short Links → Unique tokens → Click tracking

## Troubleshooting Common Issues

### API Won't Start
```bash
# Check for dependency issues
cd apps/api
pnpm install

# Check if Redis is running
docker ps | grep redis

# Check if database is accessible
cd packages/lib
pnpm run migrate
```

### Module Resolution Errors (Current Issue)
**Problem**: `date-fns` dependency conflicts
```bash
# Clear all node_modules and reinstall
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install

# Check for conflicting dependencies
pnpm list date-fns
pnpm list date-fns-tz

# Try updating specific packages
cd packages/lib
pnpm update date-fns date-fns-tz

# Check if packages/lib is built
pnpm run build
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test database connection
cd packages/lib
pnpm run migrate

# Reset database if needed
cd infra
docker compose down -v
docker compose up -d
```

### Frontend Issues
```bash
# Check if API is running
curl http://localhost:3000/health

# Clear Next.js cache
cd apps/web
rm -rf .next

# Test Cloudflare Pages deployment
curl -I https://sms.theprofitplatform.com.au/

# Check Cloudflare Pages deployment status
cd apps/web
wrangler pages deployment list --project-name=sms-crm-web
```

## Testing Strategy

### Current Test Status
- ✅ Basic test framework (Vitest) configured
- ✅ 10 passing tests (2 in API, 8 in lib)
- ✅ Tests running successfully
- ❌ No integration tests
- ❌ No API endpoint tests
- ❌ No frontend tests
- ❌ No database integration tests

### Test Commands
```bash
# Run all tests (10 tests currently)
pnpm run test

# Run specific package tests
cd apps/api && pnpm run test
cd packages/lib && pnpm run test

# Run with coverage
pnpm run test:coverage

# Run in watch mode
pnpm run test:watch
```

## Security Considerations

### Current Security Status
- ✅ Webhook signature verification
- ✅ CSRF protection on admin routes
- ✅ Magic link authentication
- ❌ Default development secrets in use
- ❌ Missing rate limiting on some endpoints

### Security Checklist
- [ ] Change default secrets in production
- [ ] Enable Redis session management
- [ ] Add rate limiting to all endpoints
- [ ] Implement proper input validation
- [ ] Set up HTTPS in production

## Deployment

### Cloudflare Pages (Web Frontend)
The web application is deployed to Cloudflare Pages for global CDN distribution.

**Production URL**: https://sms.theprofitplatform.com.au/

**Deployment Process**:
```bash
# Build the web app
cd apps/web
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy out --project-name=sms-crm-web --branch=main
```

**Environment Variables (set in Cloudflare Dashboard)**:
- `NEXT_PUBLIC_API_URL` - API server URL (https://apisms.theprofitplatform.com.au)
- `NODE_ENV` - Environment (production)

### VPS Deployment (API & Services)
```bash
# SSH to VPS
ssh tpp-vps

# Navigate to project
cd projects/ghl

# Use deployment script
./infra/deploy.sh
```

### Environment Variables
Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SESSION_SECRET` - Session encryption key
- `COOKIE_SECRET` - Cookie encryption key
- `TWILIO_*` - SMS provider credentials (optional)
- `API_BASE_URL` - API server base URL
- `WEB_URL` - Web frontend URL

## Development Priorities

### Phase 1: Core Functionality (Current)
1. Implement campaign creation and management
2. Connect frontend to backend APIs
3. Add proper error handling and logging
4. Fix remaining linting issues

### Phase 2: Enhanced Features
1. Implement proper campaign creation with pagination
2. Fix gate-checker performance issues
3. Add comprehensive testing (API, frontend, integration)
4. Implement monitoring and logging

### Phase 3: Production Optimization
1. Add rate limiting and security measures
2. Optimize database queries and performance
3. Set up backup and recovery procedures
4. Create comprehensive documentation

## Getting Help

### Common Debugging Steps
1. Check if all services are running: `docker ps`
2. Verify environment variables: `cat .env.local`
3. Check API health: `curl http://localhost:3000/health`
4. Check frontend: `curl http://localhost:3001`
5. Check logs: `docker compose logs`

### Useful Resources
- Project documentation in `CLAUDE.md`
- Database schema in `packages/lib/src/db/schema.ts`
- API routes in `apps/api/src/routes/`
- Shared utilities in `packages/lib/src/utils/`

---

**Last Updated**: 2025-10-08
**Current Status**: ✅ Production deployment working - Web app live on Cloudflare Pages
**Next Steps**:
1. Implement campaign creation and management features
2. Connect frontend components to backend APIs
3. Add comprehensive testing
4. Fix remaining linting issues

**Current Metrics**:
- ✅ 10 tests passing
- ❌ 369+ linting issues (to be addressed)
- ✅ API server running successfully
- ✅ Web application deployed to Cloudflare Pages
- ✅ Contact upload functionality working
- ✅ Redis session management configured
- ✅ Production deployment automation working