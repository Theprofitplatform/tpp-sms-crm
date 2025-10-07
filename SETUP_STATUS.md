# Setup Status & Next Steps

## ✅ Completed

1. **Dependencies Installed** - All pnpm packages downloaded
2. **Environment Configured** - `.env` file created with development settings
3. **Database & Redis Running** - Docker containers running on ports 5433 and 6380
4. **Migrations Applied** - All 18 database tables created
5. **Database Seeded** - Initial data loaded:
   - Primary tenant (ID: 00000000-0000-0000-0000-000000000001)
   - Admin user: admin@example.com
   - 3 message templates
   - 1 sending number (placeholder: +61400000000)
   - Budget tracking
   - Cost structure for AU
   - Default 90-day suppression rule

## 🔧 In Progress

**Dependency Issue to Resolve:**
- date-fns version conflict (needs v2.30.0 instead of v3.6.0)

## 📋 Next Steps

###  1. Fix Dependency Issue

```bash
cd /mnt/c/Users/abhis/projects/ghl\ copy
pnpm install
pnpm --filter @sms-crm/lib build
```

### 2. Start Services

Open 3 separate terminals and run:

**Terminal 1 - API:**
```bash
cd /mnt/c/Users/abhis/projects/ghl\ copy
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/smscrm"
export REDIS_URL="redis://localhost:6380"
export REDIS_HOST="localhost"
export REDIS_PORT="6380"
pnpm dev:api
```

**Terminal 2 - Worker:**
```bash
cd /mnt/c/Users/abhis/projects/ghl\ copy
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/smscrm"
export REDIS_URL="redis://localhost:6380"
export REDIS_HOST="localhost"
export REDIS_PORT="6380"
pnpm dev:worker
```

**Terminal 3 - Web UI:**
```bash
cd /mnt/c/Users/abhis/projects/ghl\ copy
export NEXT_PUBLIC_API_URL="http://localhost:3000"
pnpm dev:web
```

### 3. Verify Services

Once all services are running, check health:

```bash
# API Health
curl http://localhost:3000/health

# Worker Health
curl http://localhost:3002/health

# Web UI
open http://localhost:3001
```

### 4. Configure Twilio (Optional for Testing)

To actually send SMS messages, update `.env` with your Twilio credentials:

```bash
# Get from https://console.twilio.com
TWILIO_ACCOUNT_SID=your_actual_account_sid
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_FROM_NUMBER=+61400000000  # Your Twilio number
```

## 🎯 Testing Without Twilio

You can still test the full platform without Twilio:
- Import CSV contacts (dry-run and commit)
- Create campaigns
- Queue messages (they'll stay in queue without provider)
- View reports and dashboards
- Test budget controls and kill switch

## 📊 Current Service Ports

- **PostgreSQL**: 5433 (localhost)
- **Redis**: 6380 (localhost)
- **API**: 3000
- **Worker**: 3002
- **Shortener**: 3003
- **Web UI**: 3001

## 🔐 Default Credentials

**Admin Login:**
- Email: admin@example.com
- Auth: Magic link (check API logs for token in dev mode)

**Database:**
- Host: localhost:5433
- User: postgres
- Password: postgres
- Database: smscrm

## 🐛 Troubleshooting

### Services Won't Start

**Check if ports are in use:**
```bash
netstat -tlnp | grep -E ":(3000|3001|3002|3003)"
```

**View Docker logs:**
```bash
docker compose -f infra/docker-compose.yml logs -f postgres redis
```

### Database Connection Issues

**Test connection:**
```bash
export PGPASSWORD=postgres
psql -h localhost -p 5433 -U postgres -d smscrm -c "SELECT COUNT(*) FROM tenants;"
```

Should return: `count: 1`

### Import Issues

**Check lib is built:**
```bash
ls -la packages/lib/dist/
```

Should see: `index.js`, `index.d.ts`, etc.

## 📁 Key Files

- **Main Config**: `.env`
- **Database Schema**: `packages/lib/src/db/schema.ts`
- **API Routes**: `apps/api/src/routes/`
- **Admin UI**: `apps/web/src/app/`
- **Worker**: `worker/shortener/src/index.ts`

## 🚀 Quick Test Flow

Once services are running:

1. **Access Web UI**: http://localhost:3001
2. **Go to Imports**: Upload a test CSV with:
   ```
   phone,email,firstName,lastName,consentStatus
   +61411111111,test@example.com,John,Doe,explicit
   +61422222222,test2@example.com,Jane,Smith,implied
   ```
3. **Dry Run**: Preview import decisions
4. **Commit**: Create contacts
5. **Create Campaign**: Use seeded templates
6. **Queue Campaign**: See gate enforcement in action
7. **View Reports**: Check campaign analytics

## 📚 Documentation

- **Full README**: `README.md`
- **API Collection**: `postman/collection.json`
- **Operations Guide**: `infra/OPERATIONS.md`
- **Cutover Checklist**: `infra/CUTOVER.md`
- **ERD**: `infra/ERD.md`

## 💡 Tips

- Use VS Code with WSL extension for better experience
- Install PostgreSQL extension to browse database
- Use REST Client extension with Postman collection
- Enable ESLint and Prettier in your editor

## ⚠️ Known Issues

1. **Date-fns peer dependency warning** - Fixed by using v2.30.0
2. **Ports already in use** - Changed to 5433/6380 to avoid conflicts
3. **Environment variables** - Need to export manually or use dotenv

## 🎯 Success Criteria

You'll know everything is working when:
- ✅ All 3 services show "healthy" status
- ✅ Web UI loads at http://localhost:3001
- ✅ Can import CSV contacts
- ✅ Can create and queue campaigns
- ✅ Database has contacts and send_jobs
- ✅ Reports show campaign statistics

## 🆘 Need Help?

If you encounter issues:
1. Check service logs in terminals
2. Verify Docker containers are running
3. Test database connection
4. Check `SETUP_STATUS.md` (this file)
5. Review `README.md` for detailed instructions

---

**Current Status**: Database ready, services need restart after dependency fix
**Next Action**: Run `pnpm install` to resolve date-fns version, then start services
**Estimated Time**: 5-10 minutes to complete setup
