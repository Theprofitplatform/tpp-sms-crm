# Supabase Migration Plan 🚀
**Date:** November 16, 2025  
**Goal:** Give each project its own Supabase instance  
**Current Status:** 1 shared Supabase in "supabase" project

---

## 📊 CURRENT STATE

### What You Have Now:

```
📦 supabase (Project)
   └── 🌍 production
       ├── 🗄️ supabase-w84occs4w0wks4cc4kc8o484 ← SHARED SUPABASE
       └── ⚡ repair-redis ← WRONG PROJECT!

📦 repair (Project)  
   └── 🌍 production
       └── 📱 mobile-repair-app ← NEEDS SUPABASE!

📦 SEO Expert (Project)
   └── 🌍 production
       └── ⚙️ service-agkcg888sw84ookgcg40gok4 ← MAY NEED SUPABASE

📦 TPP Automation Platform (Project)
   └── 🌍 production
       └── ⚙️ tpp-automation ← MAY NEED SUPABASE
```

---

## 🎯 TARGET STATE

### What You Should Have:

```
📦 repair (Project)
   └── 🌍 production
       ├── 📱 mobile-repair-app
       ├── 🗄️ repair-supabase ← NEW!
       └── ⚡ repair-redis ← MOVED HERE!
   └── 🌍 staging ← OPTIONAL
       ├── 📱 mobile-repair-app
       ├── 🗄️ repair-supabase-staging
       └── ⚡ repair-redis-staging

📦 SEO Expert (Project)
   └── 🌍 production
       ├── ⚙️ seo-service
       └── 🗄️ seo-supabase ← NEW (if needed)

📦 TPP Automation Platform (Project)
   └── 🌍 production
       ├── ⚙️ tpp-automation
       └── 🗄️ tpp-supabase ← NEW (if needed)

📦 supabase (Project) ← DELETE THIS!
```

---

## 📋 MIGRATION PLAN

### Phase 1: Repair Project (HIGH PRIORITY) ✅

**Why First:** Has an application that definitely needs database

#### Step 1.1: Create New Supabase for Repair
```
1. Open Coolify Dashboard
2. Go to "repair" project → production environment
3. Click "Add Resource" → "Service"
4. Search: "Supabase"
5. Configure:
   - Name: repair-supabase
   - Domain: supabase-repair.yourdomain.com (or subdomain)
   - Postgres Password: [generate strong password]
   - JWT Secret: [generate secret]
   - Anon Key: [will be auto-generated]
   - Service Key: [will be auto-generated]
6. Deploy and wait for all containers to start
7. Save the connection details:
   - Supabase URL
   - Anon Key
   - Service Key
   - Database connection string
```

#### Step 1.2: Create New Redis for Repair
```
1. In "repair" project → production environment
2. Click "Add Resource" → "Service"  
3. Search: "Redis"
4. Configure:
   - Name: repair-redis
   - Version: 7.2 (match current)
5. Deploy
6. Save connection details
```

#### Step 1.3: Update Mobile Repair App
```
1. Go to mobile-repair-app in repair project
2. Update environment variables:
   - SUPABASE_URL=https://supabase-repair.yourdomain.com
   - SUPABASE_ANON_KEY=[new anon key]
   - SUPABASE_SERVICE_KEY=[new service key]
   - REDIS_URL=redis://repair-redis:6379
3. Redeploy application
4. Test thoroughly
```

#### Step 1.4: Migrate Data (if needed)
```
1. Export data from old Supabase:
   docker exec [old-supabase-postgres] pg_dump -U postgres > repair_backup.sql

2. Import to new Supabase:
   docker exec -i [new-supabase-postgres] psql -U postgres < repair_backup.sql

3. Or use Supabase Studio to export/import
```

#### Step 1.5: Verify and Monitor
```
1. Test all mobile repair app functionality
2. Check Redis cache is working
3. Verify database connections
4. Monitor for 24-48 hours
```

---

### Phase 2: SEO Expert Project (OPTIONAL) 🤔

**Check First:** Does SEO Expert need a database?

#### Assessment:
```
1. Check what service-agkcg888sw84ookgcg40gok4 is
2. Does it currently use the shared Supabase?
3. Does it store data or just process?
```

#### If YES (needs database):
```
Follow same steps as repair:
1. Add "seo-supabase" service to SEO Expert project
2. Configure with unique credentials
3. Update service environment variables
4. Migrate data if needed
5. Test and verify
```

#### If NO (doesn't need database):
```
Skip - no action needed
```

---

### Phase 3: TPP Automation Platform (OPTIONAL) 🤔

**Check First:** Does TPP need a database?

#### Assessment:
```
1. Check what tpp-automation service does
2. Does it currently use the shared Supabase?
3. What data does it store?
```

#### If YES (needs database):
```
1. Add "tpp-supabase" service to TPP Automation Platform project
2. Configure with unique credentials
3. Update tpp-automation environment variables
4. Migrate data if needed
5. Test and verify
```

#### If NO (doesn't need database):
```
Skip - no action needed
```

---

### Phase 4: Clean Up (FINAL STEP) 🧹

**ONLY after all migrations are complete and verified!**

#### Step 4.1: Verify No Dependencies
```
1. Confirm repair app works with new Supabase
2. Confirm SEO Expert works (or doesn't use old Supabase)
3. Confirm TPP works (or doesn't use old Supabase)
4. Check logs for any errors pointing to old Supabase
5. Wait at least 1 week before cleanup
```

#### Step 4.2: Delete Old Resources
```
1. Go to "supabase" project
2. Stop repair-redis service
3. Delete repair-redis service
4. Stop supabase-w84occs4w0wks4cc4kc8o484 service
5. Delete supabase-w84occs4w0wks4cc4kc8o484 service
```

#### Step 4.3: Delete Empty Project
```
1. Verify "supabase" project is now empty
2. Go to project settings
3. Delete "supabase" project
```

---

## ⚠️ IMPORTANT WARNINGS

### Before You Start:

1. **Backup Everything!**
   ```bash
   # Backup old Supabase database
   docker exec supabase-db pg_dumpall -U postgres > full_backup.sql
   
   # Backup Redis data
   docker exec repair-redis redis-cli SAVE
   docker cp repair-redis:/data/dump.rdb redis_backup.rdb
   ```

2. **Plan Downtime**
   - Schedule during low-traffic period
   - Notify users if needed
   - Have rollback plan ready

3. **Test in Staging First** (if you create staging environments)
   - Practice the migration
   - Identify issues before production
   - Document any problems

4. **Don't Rush**
   - One project at a time
   - Verify each step
   - Monitor for issues
   - Wait between phases

---

## 📝 DETAILED STEPS FOR REPAIR PROJECT

### Step-by-Step Walkthrough:

#### 1. Add Supabase Service to Repair Project

**Via Coolify Dashboard:**
```
1. Navigate to: Projects → repair → production
2. Click: "Add Resource"
3. Select: "Service"
4. In search box, type: "Supabase"
5. Click on Supabase service template
6. Configuration:
   
   General:
   - Name: repair-supabase
   - Server: [select your server]
   
   Domains:
   - Add domain: supabase-repair.yourdomain.com
   - Enable SSL: Yes
   
   Environment Variables:
   - POSTGRES_PASSWORD: [generate 32-char password]
   - JWT_SECRET: [generate 64-char secret]
   - ANON_KEY: [will auto-generate]
   - SERVICE_ROLE_KEY: [will auto-generate]
   - SITE_URL: https://repair.yourdomain.com
   
7. Click "Deploy"
8. Wait for all containers to start (5-10 minutes)
9. Check status: All should be "healthy"
```

**What Gets Deployed:**
- PostgreSQL (database)
- PostgREST (API)
- GoTrue (authentication)
- Realtime (websockets)
- Storage (file storage)
- Kong (API gateway)
- Studio (admin UI)

#### 2. Get Connection Details

**After deployment completes:**
```
1. Go to: Services → repair-supabase
2. Click on "Environment Variables" tab
3. Copy these values:
   - SUPABASE_URL: https://supabase-repair.yourdomain.com
   - ANON_KEY: eyJhbG... (long token)
   - SERVICE_ROLE_KEY: eyJhbG... (long token)
   - DATABASE_URL: postgresql://postgres:[password]@repair-supabase-db:5432/postgres
4. Save these securely (password manager)
```

#### 3. Add Redis Service

**Via Coolify Dashboard:**
```
1. In repair project → production
2. Click: "Add Resource" → "Service"
3. Search: "Redis"
4. Configuration:
   - Name: repair-redis
   - Version: 7.2
   - Enable persistence: Yes
   - Password: [generate password]
5. Deploy
6. Note connection: redis://repair-redis:6379
```

#### 4. Update Mobile Repair Application

**Find your application:**
```
1. Go to: repair project → production → mobile-repair-app
2. Click on application
3. Go to "Environment Variables" tab
```

**Update variables:**
```
OLD VALUES (delete these):
- SUPABASE_URL=https://[old-supabase-domain]
- SUPABASE_ANON_KEY=[old-key]
- REDIS_URL=redis://repair-redis:6379 (if it exists)

NEW VALUES (add these):
- SUPABASE_URL=https://supabase-repair.yourdomain.com
- SUPABASE_ANON_KEY=[new-anon-key-from-step-2]
- SUPABASE_SERVICE_KEY=[new-service-key-from-step-2]
- REDIS_URL=redis://repair-redis:6379
- DATABASE_URL=[new-database-url-from-step-2]

Click "Save"
```

**Redeploy application:**
```
1. Click "Deploy" button
2. Wait for deployment to complete
3. Check logs for errors
4. Test application functionality
```

#### 5. Migrate Data (If Needed)

**Option A: Empty database (fresh start)**
```
- No migration needed
- Application will create tables on first run
- Best for new deployments
```

**Option B: Migrate existing data**
```
1. Export from old Supabase:
   - Go to Supabase Studio (old instance)
   - SQL Editor
   - Run: pg_dump or use Studio export
   - Save SQL file

2. Import to new Supabase:
   - Go to Supabase Studio (new instance)
   - SQL Editor
   - Paste and run SQL
   - Or use Studio import feature

3. Verify data:
   - Check tables exist
   - Check row counts match
   - Test queries
```

#### 6. Testing Checklist

**Test everything:**
```
✅ Application loads
✅ User login works
✅ Data displays correctly
✅ Create new records works
✅ Update records works
✅ Delete records works
✅ Image uploads work (if using Storage)
✅ Real-time updates work (if using Realtime)
✅ Cache is working (Redis)
✅ No errors in logs
```

#### 7. Monitor

**For 24-48 hours:**
```
- Check application logs
- Check Supabase logs
- Check Redis logs
- Monitor performance
- Watch for errors
- Get user feedback
```

---

## 🚨 ROLLBACK PLAN

If something goes wrong:

### Immediate Rollback:
```
1. Go to mobile-repair-app
2. Revert environment variables to OLD values
3. Redeploy application
4. Application will reconnect to old Supabase
5. Debug the issue
6. Try migration again when ready
```

### Why This Works:
- Old Supabase is still running
- Old Redis is still running
- Just changing environment variables
- No data loss
- Quick recovery

---

## ⏱️ ESTIMATED TIMELINE

### Per Project:

| Task | Time | Complexity |
|------|------|------------|
| Deploy new Supabase | 10-15 min | Easy |
| Deploy new Redis | 5 min | Easy |
| Update app env vars | 5 min | Easy |
| Test application | 30 min | Medium |
| Migrate data | 1-4 hours | Hard |
| Monitor & verify | 24-48 hours | Medium |

**Total per project:** 2-3 hours active work + 1-2 days monitoring

### Full Migration:
- **Repair project:** 2-3 hours + monitoring
- **SEO Expert:** 2-3 hours + monitoring (if needed)
- **TPP Automation:** 2-3 hours + monitoring (if needed)
- **Cleanup:** 30 min
- **Total:** 1-2 weeks (with proper monitoring between phases)

---

## 💰 COST ESTIMATE

### Resource Usage Per Supabase Instance:

**Small instance (development/staging):**
- Memory: ~2GB
- CPU: 1 core
- Storage: 10-20GB
- Cost: Minimal (self-hosted)

**Medium instance (production):**
- Memory: ~4GB
- CPU: 2 cores
- Storage: 20-50GB
- Cost: Still minimal (self-hosted)

### Total Additional Resources:
- 3 Supabase instances (if all projects need it)
- 3 Redis instances (lightweight)
- Total memory: ~6-12GB additional
- **Impact:** Should be fine on your current server

---

## ✅ SUCCESS CRITERIA

### You'll know it's done when:

1. ✅ Each product has its own Supabase
2. ✅ Each product has its own Redis (if needed)
3. ✅ All applications work correctly
4. ✅ No errors in logs
5. ✅ Old "supabase" project is deleted
6. ✅ Clean project organization
7. ✅ Easy to manage per product

---

## 📞 SUPPORT CHECKLIST

### Before Starting:
- [ ] Read full plan
- [ ] Backup all data
- [ ] Test in staging (if available)
- [ ] Schedule migration time
- [ ] Notify team/users

### During Migration:
- [ ] Follow steps exactly
- [ ] Take notes of any issues
- [ ] Save all credentials securely
- [ ] Test thoroughly at each step
- [ ] Don't rush

### After Migration:
- [ ] Monitor for 48 hours
- [ ] Document what you did
- [ ] Update team documentation
- [ ] Clean up old resources
- [ ] Celebrate! 🎉

---

**Status:** Ready to Execute  
**Risk Level:** Medium (with proper backups: Low)  
**Confidence:** High ✅

**START WITH:** Repair project (most critical)  
**THEN:** Assess if SEO Expert and TPP need Supabase  
**FINALLY:** Clean up old shared Supabase

---

Let me know when you're ready to start, and I'll guide you through step-by-step!
