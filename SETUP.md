# 🚀 SETUP GUIDE - SEO Automation Platform

Complete installation and configuration guide.

---

## 📋 PREREQUISITES

### Required Software
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Git:** Latest version

### Optional (For Production)
- **PostgreSQL:** v14+ (recommended for production)
- **Redis:** v6+ (for caching)
- **Docker:** v20+ (for containerized deployment)

### Required Accounts
- **SMTP Provider:** Gmail, SendGrid, AWS SES, or Mailgun
- **OpenAI:** API key for AI features
- **Anthropic:** API key for Claude AI features

---

## 🛠️ INSTALLATION

### 1. Clone Repository

```bash
git clone https://github.com/yourorg/seo-automation.git
cd seo-automation
```

### 2. Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 49 packages in 15s
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Server Configuration
PORT=9000
NODE_ENV=development

# AI APIs
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here

# Email (Choose one provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Sender
FROM_EMAIL=hello@yourcompany.com
FROM_NAME=Your Company
COMPANY_NAME=Your Company

# Security
JWT_SECRET=generate-random-secret-here
JWT_EXPIRES_IN=7d

# WordPress (if using WordPress integration)
IAT_WP_USER=admin
IAT_WP_PASSWORD=your-wordpress-app-password
```

### 4. Database Initialization

The SQLite database initializes automatically on first run:

```bash
npm start
```

**Expected Output:**
```
🗄️  Initializing database...
✅ Database schema created/verified
✅ Security middleware configured
✅ Server running on port 9000
```

### 5. Create Admin User

```bash
curl -X POST http://localhost:9000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "admin",
    "email": "admin@yourcompany.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

---

## 🔐 SECURITY SETUP

### 1. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy output to `.env`:
```env
JWT_SECRET=your-generated-secret-here
```

### 2. Gmail App Password Setup

If using Gmail:

1. Go to https://myaccount.google.com/apppasswords
2. Create new app password
3. Copy to `.env` as `SMTP_PASS`

### 3. WordPress Application Passwords

For WordPress integration:

1. WordPress Admin → Users → Your Profile
2. Scroll to "Application Passwords"
3. Create new password
4. Copy to `.env`

---

## 🗄️ DATABASE SETUP

### Development (SQLite - Default)

No setup needed. Database created automatically at:
```
data/seo-automation.db
```

### Production (PostgreSQL - Recommended)

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt install postgresql

# MacOS
brew install postgresql
```

2. **Create Database:**
```bash
sudo -u postgres psql
CREATE DATABASE seo_automation;
CREATE USER seo_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE seo_automation TO seo_user;
\q
```

3. **Update `.env`:**
```env
DATABASE_TYPE=postgres
DATABASE_URL=postgresql://seo_user:secure_password@localhost:5432/seo_automation
```

4. **Run Migrations:**
```bash
npm run db:migrate
```

---

## ✅ VERIFICATION

### 1. Check Server Health

```bash
curl http://localhost:9000/health
```

**Expected:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-01T..."
}
```

### 2. Run Tests

```bash
npm test
```

**Expected:** 880+ tests passing

### 3. Access Dashboard

Open browser:
```
http://localhost:9000
```

You should see the React dashboard.

### 4. Test API Authentication

```bash
curl -X POST http://localhost:9000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "SecurePassword123!"
  }'
```

**Expected:** JWT token in response

---

## 🚀 PRODUCTION DEPLOYMENT

### Docker Deployment (Recommended)

1. **Build Image:**
```bash
docker-compose build
```

2. **Start Services:**
```bash
docker-compose up -d
```

3. **Check Logs:**
```bash
docker-compose logs -f
```

### Manual Deployment (VPS)

1. **Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

2. **Deploy Application:**
```bash
# Clone & setup
git clone <repository>
cd seo-automation
npm ci --omit=dev

# Set environment
cp .env.production .env
nano .env  # Edit configuration

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Setup Nginx:**
```bash
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/seo-automation
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/seo-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

4. **Setup SSL (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔧 TROUBLESHOOTING

### Issue: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::9000`

**Solution:**
```bash
# Find process
lsof -i :9000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3000
```

### Issue: Database Connection Failed

**Error:** `SQLITE_CANTOPEN: unable to open database file`

**Solution:**
```bash
# Create data directory
mkdir -p data

# Set permissions
chmod 755 data
```

### Issue: Tests Failing

**Error:** ES module import errors

**Solution:**
```bash
# Clear cache
npm run test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Email Not Sending

**Solutions:**

1. **Check SMTP credentials in `.env`**
2. **Test SMTP connection:**
```bash
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email', pass: 'app-password' }
});
transport.verify().then(console.log).catch(console.error);
"
```

### Issue: Auth Not Working

**Error:** JWT token invalid

**Solutions:**
1. Clear browser cookies
2. Check `JWT_SECRET` in `.env`
3. Verify user exists in database:
```bash
sqlite3 data/seo-automation.db "SELECT * FROM users"
```

---

## 📊 INITIAL DATA SETUP

### 1. Create White-Label Config

```bash
curl -X POST http://localhost:9000/api/white-label/config \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "default",
    "isActive": true,
    "companyName": "Your Company",
    "emailFromName": "Your Company",
    "emailFromEmail": "hello@yourcompany.com",
    "primaryColor": "#667eea"
  }'
```

### 2. Create Test Client

```bash
curl -X POST http://localhost:9000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-client",
    "name": "Test Client",
    "domain": "https://example.com",
    "businessType": "local_business"
  }'
```

### 3. Initialize Email Campaigns

```bash
curl -X POST http://localhost:9000/api/email/initialize
```

---

## 🎯 NEXT STEPS

After setup is complete:

1. ✅ **Test Authentication** - Login to dashboard
2. ✅ **Configure White-Label** - Set your branding
3. ✅ **Create Clients** - Add your first client
4. ✅ **Test WordPress Integration** - Connect to WordPress site
5. ✅ **Run Test Audit** - Execute SEO audit
6. ✅ **Review API Docs** - See `API_REFERENCE.md`

---

## 📚 ADDITIONAL RESOURCES

- **API Reference:** `API_REFERENCE.md`
- **Architecture:** `ARCHITECTURE.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Contributing:** `CONTRIBUTING.md`

---

## 💡 TIPS

### Development Workflow

```bash
# Start with auto-reload
npm run dev

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint
```

### Database Management

```bash
# View database
sqlite3 data/seo-automation.db

# List tables
.tables

# Query data
SELECT * FROM clients;

# Exit
.quit
```

### PM2 Management

```bash
# View logs
pm2 logs

# Restart
pm2 restart seo-expert

# Monitor
pm2 monit

# Status
pm2 status
```

---

## ❓ NEED HELP?

- **Documentation:** Check other .md files in root
- **Issues:** GitHub Issues
- **Discord:** [Your Discord Link]
- **Email:** support@yourcompany.com

---

**Setup Guide Version:** 1.0
**Last Updated:** 2025-11-01
**Tested On:** Ubuntu 22.04, macOS 14, Windows 11 (WSL2)
