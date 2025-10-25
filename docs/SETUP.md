# SEO Automation Platform - Setup Guide

Complete installation and configuration guide for the SEO Automation Platform.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Email Configuration](#email-configuration)
- [Initial Setup](#initial-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (comes with Node.js)
- **RAM**: 512MB minimum, 1GB recommended
- **Disk Space**: 500MB for application + database
- **OS**: Linux, macOS, or Windows

### Recommended for Production

- **Node.js**: 20.x LTS
- **RAM**: 2GB+ for production workloads
- **Disk Space**: 5GB+ for logs and database growth
- **OS**: Ubuntu 22.04 LTS or similar

### Check Your System

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check npm version
npm --version   # Should be 8.0.0 or higher

# Check system resources
free -h        # Linux: Check available RAM
df -h          # Check disk space
```

## Installation

### Step 1: Clone the Repository

```bash
# Using HTTPS
git clone https://github.com/yourcompany/seoexpert.git
cd seoexpert

# Or using SSH
git clone git@github.com:yourcompany/seoexpert.git
cd seoexpert
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - express (web framework)
# - better-sqlite3 (database)
# - nodemailer (email)
# - bcrypt (password hashing)
# - jsonwebtoken (authentication)
# - And 20+ other dependencies
```

### Step 3: Verify Installation

```bash
# Run tests to verify everything is working
npm test

# Expected output:
# ✅ 21 test suites passed
# ✅ 793 tests passed
# ✅ 99.87% coverage
```

## Configuration

### Step 1: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Or create manually
touch .env
```

### Step 2: Edit Environment Variables

Open `.env` in your text editor and configure:

```env
# ==================================
# SERVER CONFIGURATION
# ==================================
PORT=3000
NODE_ENV=development

# ==================================
# EMAIL CONFIGURATION (SMTP)
# ==================================

# Gmail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Email Sender Information
FROM_EMAIL=hello@yourcompany.com
FROM_NAME=Your Company Name
REPLY_TO_EMAIL=support@yourcompany.com
COMPANY_NAME=Your Company Name

# ==================================
# URLS
# ==================================
DASHBOARD_URL=http://localhost:3000

# ==================================
# SECURITY (Optional - will use defaults)
# ==================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# ==================================
# DATABASE (Optional - will use default)
# ==================================
DATABASE_PATH=./data/seo-automation.db
```

### Email Provider Examples

#### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Create an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy the 16-character password
3. Use in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App password (remove spaces)
```

#### SendGrid Setup

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key-here
```

#### AWS SES Setup

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASS=your-aws-smtp-password
```

#### Mailgun Setup

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Database Setup

The database is automatically created and initialized when you start the server for the first time.

### Automatic Initialization

```bash
# Start the server (database will be created automatically)
npm start

# You should see:
# 🗄️  Initializing database...
# ✅ Database schema created/verified
```

### Manual Database Reset

If you need to reset the database:

```bash
# Stop the server (Ctrl+C)

# Delete the database file
rm data/seo-automation.db

# Restart the server (database will be recreated)
npm start
```

### Database Location

- Default: `./data/seo-automation.db`
- Custom: Set `DATABASE_PATH` in `.env`
- Backups: Use SQLite backup tools or copy the `.db` file

### Database Schema

The database includes 18 tables:
- Authentication: `users`, `password_reset_tokens`, `auth_activity_log`
- Clients: `clients`, `portal_access_logs`
- Leads: `leads`, `lead_events`
- Emails: `email_campaigns`, `email_sequences`, `email_queue`, `email_tracking`
- Branding: `white_label_config`
- SEO: `keyword_performance`, `gsc_metrics`, `competitor_rankings`, `competitor_alerts`, `optimization_history`, `local_seo_scores`
- System: `auto_fix_actions`, `reports_generated`, `system_logs`, `response_performance`

## Email Configuration

### Testing Email Setup

```bash
# Start the server
npm start

# In another terminal, test SMTP connection
curl -X POST http://localhost:3000/api/email/initialize

# Expected response:
# {
#   "success": true,
#   "message": "Email campaigns initialized",
#   "campaignIds": [1, 2, 3, 4, 5, 6, 7, 8, 9]
# }
```

### Send Test Email

```bash
# Create a test lead to trigger welcome email
curl -X POST http://localhost:3000/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "website": "https://testbusiness.com",
    "name": "John Doe",
    "email": "your-test-email@gmail.com",
    "phone": "(555) 123-4567",
    "industry": "Technology"
  }'

# Process the email queue
curl -X POST http://localhost:3000/api/email/process-queue

# Check your inbox for the welcome email!
```

## Initial Setup

### Step 1: Create White-Label Configuration

```bash
curl -X POST http://localhost:3000/api/white-label/config \
  -H "Content-Type: application/json" \
  -d '{
    "configName": "default",
    "isActive": true,
    "companyName": "Your Company",
    "emailFromName": "Your Company",
    "emailFromEmail": "hello@yourcompany.com",
    "emailReplyTo": "support@yourcompany.com",
    "primaryColor": "#667eea",
    "secondaryColor": "#764ba2",
    "accentColor": "#10b981",
    "portalTitle": "SEO Dashboard",
    "portalWelcomeText": "Welcome to your SEO performance dashboard"
  }'
```

### Step 2: Initialize Email Campaigns

```bash
curl -X POST http://localhost:3000/api/email/initialize
```

### Step 3: Create Admin User

```bash
curl -X POST http://localhost:3000/api/auth/register \
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

### Step 4: Create First Client

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "id": "client-001",
    "name": "Acme Corporation",
    "domain": "acmecorp.com",
    "businessType": "Local Business",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "status": "active"
  }'
```

### Step 5: Create Client User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-001",
    "email": "contact@acmecorp.com",
    "password": "ClientPassword123!",
    "firstName": "John",
    "lastName": "Smith",
    "role": "client"
  }'
```

## Verification

### Check Server Status

```bash
# Server should be running on port 3000
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"2024-..."}
```

### Verify Database

```bash
# Check database file exists
ls -lh data/seo-automation.db

# Should show file size (typically 500KB - 5MB)
```

### Access Admin Panel

1. Open browser: http://localhost:3000/admin/
2. Login with admin credentials
3. Verify dashboard shows statistics

### Access Client Portal

1. Open browser: http://localhost:3000/portal/
2. Login with client credentials
3. Verify dashboard loads

### Test Lead Magnet

1. Open browser: http://localhost:3000/leadmagnet/
2. Fill out the form with test data
3. Check Admin Panel → Lead Management
4. Verify lead appears in the list

## Troubleshooting

### Port Already in Use

```bash
# Error: Port 3000 is already in use

# Solution 1: Find and kill the process
lsof -i :3000
kill -9 <PID>

# Solution 2: Use a different port
# Edit .env and change PORT=3000 to PORT=3001
```

### SMTP Connection Failed

```bash
# Error: SMTP connection failed

# Check 1: Verify credentials in .env
cat .env | grep SMTP

# Check 2: Test SMTP connection
npm run test:smtp  # If available

# Check 3: Verify firewall allows port 587/465
telnet smtp.gmail.com 587

# Check 4: For Gmail, ensure App Password is used (not regular password)
```

### Database Lock Error

```bash
# Error: database is locked

# Solution 1: Close all connections
pkill -f "node.*dashboard-server"

# Solution 2: Delete lock files
rm data/seo-automation.db-shm
rm data/seo-automation.db-wal

# Restart server
npm start
```

### Module Not Found

```bash
# Error: Cannot find module 'express'

# Solution: Reinstall dependencies
rm -rf node_modules
rm package-lock.json
npm install
```

### Permission Denied

```bash
# Error: EACCES: permission denied

# Solution: Fix permissions
chmod -R 755 .
chown -R $USER:$USER .

# For data directory
mkdir -p data
chmod 755 data
```

### Email Not Sending

```bash
# Check email queue
curl http://localhost:3000/api/email/queue

# Process queue manually
curl -X POST http://localhost:3000/api/email/process-queue

# Check for errors in server logs
tail -f logs/app.log  # If logging is enabled
```

## Next Steps

After successful setup:

1. **Configure White-Label Branding**: Visit Admin Panel → White-Label
2. **Customize Email Templates**: Edit files in `src/automation/`
3. **Add More Clients**: Use the API or Admin Panel
4. **Set Up Monitoring**: Configure logging and error tracking
5. **Review Security**: Change JWT secret, enable HTTPS
6. **Deploy to Production**: See [DEPLOYMENT.md](DEPLOYMENT.md)

## Support

Need help?

- **Documentation**: Check [README.md](../README.md) and other docs
- **Issues**: Report bugs on GitHub Issues
- **Email**: support@yourcompany.com

---

**Setup complete!** 🎉 Your SEO Automation Platform is ready to use.
