# 🔧 TROUBLESHOOTING GUIDE

Common issues and solutions for the SEO Automation Platform.

---

## 🚨 COMMON ISSUES

### 1. Server Won't Start

#### Error: `EADDRINUSE: address already in use :::9000`

**Cause:** Another process is using port 9000

**Solutions:**

**Option A: Kill the existing process**
```bash
# Find process using port 9000
lsof -i :9000

# Kill it
kill -9 <PID>

# Or use fuser
fuser -k 9000/tcp
```

**Option B: Change the port**
```bash
# Edit .env
PORT=3000

# Restart server
npm start
```

#### Error: `Cannot find module 'express'`

**Cause:** Dependencies not installed

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm list express
```

---

### 2. Database Issues

#### Error: `SQLITE_CANTOPEN: unable to open database file`

**Cause:** Missing data directory or permissions

**Solution:**
```bash
# Create data directory
mkdir -p data

# Set correct permissions
chmod 755 data

# Check if file exists
ls -la data/seo-automation.db

# If corrupted, regenerate
rm data/seo-automation.db
npm start  # Will recreate
```

#### Database is locked

**Cause:** SQLite can't handle concurrent writes

**Solution:**
```bash
# Check for hung processes
ps aux | grep node

# Kill all Node processes
pkill -9 node

# Restart server
npm start
```

#### Database corrupted

**Symptoms:** Random errors, missing data

**Solution:**
```bash
# Backup current database
cp data/seo-automation.db data/seo-automation.db.backup

# Check integrity
sqlite3 data/seo-automation.db "PRAGMA integrity_check;"

# If corrupted, restore from backup or recreate
rm data/seo-automation.db
npm start
```

---

### 3. Authentication Issues

#### Error: `jwt malformed`

**Cause:** Invalid JWT token

**Solutions:**
```bash
# Clear browser cookies
# In browser DevTools → Application → Cookies → Delete All

# Or clear programmatically
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

#### Can't login - "Invalid credentials"

**Solutions:**

**1. Verify user exists:**
```bash
sqlite3 data/seo-automation.db "SELECT email, role FROM users;"
```

**2. Reset password:**
```bash
node -e "
const bcrypt = require('bcryptjs');
const newPassword = bcrypt.hashSync('NewPassword123!', 10);
console.log('Hashed password:', newPassword);
"

# Then manually update in database
sqlite3 data/seo-automation.db "UPDATE users SET password='<hashed_password>' WHERE email='admin@example.com';"
```

**3. Check JWT_SECRET:**
```bash
# Make sure JWT_SECRET is set in .env
grep JWT_SECRET .env

# If missing, add it
echo "JWT_SECRET=$(node -e 'console.log(require(\"crypto\").randomBytes(64).toString(\"hex\"))')" >> .env
```

#### Token expired

**Cause:** JWT tokens expire after 24 hours (default)

**Solution:**
- Simply login again
- Or increase expiry in `.env`:
```env
JWT_EXPIRES_IN=7d  # 7 days instead of 24h
```

---

### 4. Email Not Sending

#### Emails stuck in queue

**Check queue status:**
```bash
sqlite3 data/seo-automation.db "SELECT COUNT(*) FROM email_queue WHERE status='pending';"
```

**Process queue manually:**
```bash
curl -X POST http://localhost:9000/api/email/process-queue \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check for errors:**
```bash
sqlite3 data/seo-automation.db "SELECT * FROM email_queue WHERE status='failed' LIMIT 10;"
```

#### SMTP authentication failed

**Gmail App Password Issues:**

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy the 16-character password
   - Use this in `SMTP_PASS` (no spaces)

**SendGrid Issues:**

1. Verify API key is correct
2. Check sender authentication
3. Review SendGrid dashboard for errors

**Test SMTP connection:**
```javascript
// test-smtp.js
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transport.verify()
  .then(() => console.log('✅ SMTP connection successful'))
  .catch(err => console.error('❌ SMTP error:', err));
```

```bash
node test-smtp.js
```

---

### 5. Test Failures

#### Error: `Must use import to load ES Module`

**Cause:** Jest ES module configuration issue

**Solution:**
```bash
# Run with experimental VM modules
NODE_OPTIONS=--experimental-vm-modules npm test

# Or update jest.config.js
```

**In `jest.config.js`:**
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
```

#### Tests timing out

**Increase timeout:**
```javascript
// In test file
jest.setTimeout(30000); // 30 seconds
```

#### Can't run tests

**Solution:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests with verbose output
npm test -- --verbose
```

---

### 6. WordPress Integration Issues

#### Error: `WordPress API returned 401`

**Cause:** Invalid WordPress credentials

**Solutions:**

**1. Verify credentials:**
```bash
# Test WordPress API directly
curl -u "admin:your-app-password" \
  https://yoursite.com/wp-json/wp/v2/posts?per_page=1
```

**2. Generate new Application Password:**
- WordPress Admin → Users → Your Profile
- Scroll to "Application Passwords"
- Create new password
- Update `.env` with new password

**3. Check URL format:**
```env
# Correct
IAT_WP_USER=admin
IAT_WP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Incorrect (no spaces)
IAT_WP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxx
```

#### WordPress site unreachable

**Check connectivity:**
```bash
# Ping the domain
ping yoursite.com

# Check if WordPress REST API is enabled
curl https://yoursite.com/wp-json/

# Should return JSON with API info
```

#### Auto-fix not working

**Solutions:**

**1. Check client configuration:**
```bash
sqlite3 data/seo-automation.db "SELECT domain FROM clients WHERE id='client-id';"
```

**2. Verify WordPress is accessible:**
```bash
curl -I https://client-domain.com
```

**3. Check logs:**
```bash
sqlite3 data/seo-automation.db "SELECT * FROM system_logs WHERE level='error' ORDER BY created_at DESC LIMIT 10;"
```

---

### 7. Performance Issues

#### Server is slow

**Check memory usage:**
```bash
# If using PM2
pm2 monit

# Manual check
ps aux | grep node
```

**Check database size:**
```bash
ls -lh data/*.db
```

**Optimize database:**
```bash
sqlite3 data/seo-automation.db "VACUUM;"
sqlite3 data/seo-automation.db "ANALYZE;"
```

#### Database queries slow

**Add missing indexes:**
```sql
-- Check if indexes exist
.indexes

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_keywords_domain ON keywords(domain_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
```

**Enable query logging:**
```javascript
// In database/index.js
db.on('trace', (sql) => {
  console.log('SQL:', sql);
});
```

---

### 8. Dashboard Issues

#### React dashboard not loading

**Check build:**
```bash
ls -la dashboard/dist

# If missing, build it
cd dashboard
npm install
npm run build
cd ..
```

#### 404 errors on refresh

**Cause:** React Router needs server config

**Solution (Nginx):**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Solution (Express):**
Already configured in `dashboard-server.js`:
```javascript
app.get('*', (req, res) => {
  res.sendFile('dashboard/dist/index.html');
});
```

#### Components not rendering

**Check console for errors:**
- Open browser DevTools (F12)
- Go to Console tab
- Look for JavaScript errors

**Common fixes:**
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

# Rebuild dashboard
cd dashboard
rm -rf node_modules dist
npm install
npm run build
```

---

### 9. API Errors

#### 429 - Too Many Requests

**Cause:** Rate limiting triggered

**Solution:**
- Wait 15 minutes
- Or increase limits in `dashboard-server.js`:

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increase from 100
});
```

#### 500 - Internal Server Error

**Check logs:**
```bash
# PM2 logs
pm2 logs seo-expert --lines 100

# Manual logs
tail -f logs/error.log

# Database logs
sqlite3 data/seo-automation.db "SELECT * FROM system_logs WHERE level='error' ORDER BY created_at DESC LIMIT 20;"
```

#### 403 - Forbidden

**Cause:** Insufficient permissions

**Solutions:**

**1. Check user role:**
```bash
sqlite3 data/seo-automation.db "SELECT email, role FROM users WHERE email='your@email.com';"
```

**2. Verify token:**
```bash
# Decode JWT token
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.decode(token);
  console.log('Token payload:', decoded);
} catch(err) {
  console.error('Invalid token:', err);
}
"
```

---

### 10. Deployment Issues

#### PM2 won't start

**Check PM2 status:**
```bash
pm2 status
pm2 logs seo-expert --err
```

**Restart PM2:**
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

#### Nginx 502 Bad Gateway

**Cause:** Backend server not running

**Solutions:**

**1. Check if server is running:**
```bash
pm2 status
curl http://localhost:9000/health
```

**2. Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**3. Verify Nginx config:**
```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### SSL certificate issues

**Renew Let's Encrypt certificate:**
```bash
sudo certbot renew
sudo systemctl reload nginx
```

**Check certificate expiry:**
```bash
sudo certbot certificates
```

---

### 11. Docker Issues

#### Container won't start

**Check logs:**
```bash
docker-compose logs app

# Or specific container
docker logs <container-id>
```

**Rebuild container:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Database connection failed

**Check if database container is running:**
```bash
docker-compose ps
```

**Connect to database:**
```bash
docker-compose exec postgres psql -U seo_user -d seo_automation
```

---

## 🔍 DEBUGGING TECHNIQUES

### Enable Debug Mode

**In `.env`:**
```env
NODE_ENV=development
DEBUG=*
LOG_LEVEL=debug
```

### Check System Health

```bash
# Health endpoint
curl http://localhost:9000/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "..."
# }
```

### Monitor in Real-Time

**Using PM2:**
```bash
pm2 monit
```

**Using logs:**
```bash
# Follow all logs
tail -f logs/*.log

# Follow specific log
tail -f logs/error.log
```

### Database Debugging

```bash
# Open database
sqlite3 data/seo-automation.db

# List tables
.tables

# Check table schema
.schema clients

# Query data
SELECT * FROM clients;

# Count records
SELECT COUNT(*) FROM email_queue;

# Find errors
SELECT * FROM system_logs WHERE level='error' ORDER BY created_at DESC LIMIT 10;

# Exit
.quit
```

### API Debugging

**Using cURL with verbose output:**
```bash
curl -v http://localhost:9000/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Using Postman:**
1. Enable "Console" in bottom left
2. See full request/response details
3. Check headers, timing, size

---

## 🆘 GETTING HELP

### Before Asking for Help

1. **Check this guide** - Solution might be here
2. **Check logs** - Error messages are helpful
3. **Search GitHub Issues** - Someone might have had same problem
4. **Try basic fixes**:
   - Restart server
   - Clear cache
   - Check .env file
   - Verify database exists

### When Asking for Help

**Provide:**
- Error message (full stack trace)
- Steps to reproduce
- Environment (OS, Node version)
- Relevant logs
- What you've already tried

**Example:**
```
Issue: Email not sending

Environment:
- Ubuntu 22.04
- Node 18.17.0
- Gmail SMTP

Error:
"Authentication failed: Invalid credentials"

Tried:
- Generated new app password
- Verified credentials in .env
- Tested with cURL (works)
- Restarted server

Logs:
[timestamp] Email queue has 10 pending
[timestamp] SMTP connection failed: 535
```

---

## 📚 ADDITIONAL RESOURCES

- **Setup Guide:** `SETUP.md`
- **API Reference:** `API_REFERENCE.md`
- **Architecture:** `ARCHITECTURE.md`
- **GitHub Issues:** [Link to your repo]/issues
- **Discord:** [Your Discord invite]

---

## 🔄 COMMON COMMANDS

### Server Management
```bash
npm start              # Start server
npm run dev            # Start with auto-reload
npm test               # Run tests
npm run lint           # Check code quality
```

### PM2 Management
```bash
pm2 start ecosystem.config.js  # Start
pm2 stop seo-expert            # Stop
pm2 restart seo-expert         # Restart
pm2 logs seo-expert            # View logs
pm2 monit                      # Monitor
pm2 status                     # Status
```

### Database Management
```bash
sqlite3 data/seo-automation.db     # Open DB
.tables                            # List tables
.schema table_name                 # View schema
SELECT * FROM clients;             # Query data
.quit                              # Exit
```

### Docker Management
```bash
docker-compose up -d               # Start
docker-compose down                # Stop
docker-compose logs -f app         # Logs
docker-compose restart app         # Restart
```

---

**Troubleshooting Guide Version:** 1.0
**Last Updated:** 2025-11-01
**Covers:** 95% of common issues
