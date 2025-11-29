# Environment Variable Management Guide for Claude Code

## Overview

This guide explains how Claude Code (me) can access and update environment variables across your projects safely and efficiently.

## How Claude Code Accesses .env Files

Claude Code can directly read and modify .env files just like any other text file. No special permissions or tools are required - they're just regular files that I can access using the `Read` and `Edit` tools.

## Quick Access Methods

### Method 1: Direct File Access (Fastest)

I can directly read or edit any .env file if you tell me the project name:

```bash
# You say: "Update the COOLIFY_TOKEN in coolify-mcp"
# I do:
Read: /home/avi/projects/coolify/coolify-mcp/.env
Edit: Update the COOLIFY_TOKEN value
```

### Method 2: Using the Management Script

A comprehensive script has been created at `/home/avi/projects/coolify/manage-env.sh`

**Available Commands:**

```bash
# List all .env files
./manage-env.sh list

# Show .env contents (sensitive values masked)
./manage-env.sh show coolify-mcp

# Search for a key across all projects
./manage-env.sh search COOLIFY_TOKEN

# Update a specific key
./manage-env.sh update coolify-mcp API_TIMEOUT 60000

# Backup before making changes
./manage-env.sh backup coolify-mcp

# Validate .env format
./manage-env.sh validate coolify-mcp

# Compare two .env files
./manage-env.sh compare coolify-mcp seo-expert

# Edit with your preferred editor
./manage-env.sh edit coolify-mcp
```

## Common Tasks

### 1. Update an Environment Variable

**You ask:** "Update COOLIFY_API_TIMEOUT to 90000 in coolify-mcp"

**I do:**
```bash
1. Read /home/avi/projects/coolify/coolify-mcp/.env
2. Edit the file to change COOLIFY_API_TIMEOUT=60000 to COOLIFY_API_TIMEOUT=90000
3. Verify the change
```

### 2. Add a New Environment Variable

**You ask:** "Add NEW_API_KEY=abc123 to my coolify-mcp project"

**I do:**
```bash
1. Read /home/avi/projects/coolify/coolify-mcp/.env
2. Edit to append: NEW_API_KEY=abc123
3. Confirm addition
```

### 3. Find Where a Variable is Used

**You ask:** "Where is OPENAI_API_KEY used across my projects?"

**I do:**
```bash
# Search all .env files
Grep: pattern="OPENAI_API_KEY" in /home/avi/projects
# Show results with file paths
```

### 4. Copy Settings Between Projects

**You ask:** "Copy the API settings from coolify-mcp to seo-expert"

**I do:**
```bash
1. Read /home/avi/projects/coolify/coolify-mcp/.env
2. Extract API-related variables
3. Read /home/avi/projects/seo-expert/.env
4. Edit to add/update the variables
```

### 5. Create .env from Template

**You ask:** "Create a new .env for my project from .env.example"

**I do:**
```bash
1. Read .env.example
2. Create new .env file
3. Prompt you for sensitive values
4. Fill in the template
```

## Project Locations

Your projects are organized under `/home/avi/projects/`:

```
/home/avi/projects/
├── coolify/
│   └── coolify-mcp/.env
├── seoanalyst/
│   └── seo-analyst-agent/.env
├── seo-expert/
│   ├── .env
│   ├── dashboard/.env
│   └── coolify-mcp/.env
├── mobile/
│   ├── .env
│   ├── frontend/.env
│   └── dashboard/.env
├── astro-site/
│   ├── .env
│   └── api/.env
└── [other projects...]
```

## How to Ask Me to Update Environment Variables

### ✅ Good Examples:

1. **"Update COOLIFY_TOKEN in coolify-mcp to the new value xyz123"**
   - Clear project name
   - Specific variable
   - New value provided

2. **"Add DATABASE_URL to my mobile project's .env"**
   - Clear action (add)
   - Specific project
   - I'll ask for the value if needed

3. **"Show me all the API keys in coolify-mcp"**
   - Clear request
   - I'll read and display (with masking option)

4. **"Copy the database settings from mobile to seo-expert"**
   - Clear source and destination
   - Specific type of settings

### ❌ Unclear Examples:

- "Update my env" - Which project?
- "Change the token" - Which token? Which project?
- "Fix the API" - What needs fixing?

## Safety Features

### Automatic Backups

Before making changes, I can:
1. Create a backup of the current .env file
2. Show you a diff of changes
3. Wait for your confirmation

### Validation

I can validate .env files to ensure:
- Proper KEY=VALUE format
- No syntax errors
- Required variables are present
- No duplicate keys

### Sensitive Data Handling

When showing .env contents, I can:
- Mask sensitive values (passwords, tokens, keys)
- Show only variable names
- Display first/last few characters only

## Advanced Usage

### Bulk Updates

Update multiple projects at once:

```bash
# You ask: "Update API_VERSION to 2.0 in all projects"
# I do:
for project in coolify-mcp seo-expert mobile; do
  Edit: /home/avi/projects/$project/.env
  Change: API_VERSION=2.0
done
```

### Environment Syncing

Keep common variables in sync:

```bash
# You ask: "Sync REDIS_URL across all projects"
# I do:
1. Get value from main project
2. Update all other projects
3. Report which projects were updated
```

### Variable Templates

Create templates for common setups:

```bash
# You ask: "Create a standard API config template"
# I create a file with:
API_BASE_URL=
API_KEY=
API_TIMEOUT=30000
API_MAX_RETRIES=3
```

## Integration with Other Tools

### With Docker Compose

```bash
# Update and restart service
1. Edit .env file
2. Execute: docker-compose up -d --force-recreate
```

### With PM2

```bash
# Update and restart PM2 app
1. Edit .env file
2. Execute: pm2 restart app-name --update-env
```

### With Systemd Services

```bash
# Update service environment
1. Edit .env file
2. Execute: systemctl reload service-name
```

## Best Practices

### 1. Always Backup First
Before any changes, create a backup:
```bash
./manage-env.sh backup coolify-mcp
```

### 2. Use Version Control for .env.example
Keep `.env.example` in git, never `.env`:
```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 3. Document Required Variables
Keep a README or comments in .env.example:
```bash
# Required API Configuration
# COOLIFY_TOKEN - Get from Coolify Dashboard → API
# COOLIFY_BASE_URL - Your Coolify instance URL
```

### 4. Separate Environments
Use different .env files for different environments:
```
.env.development
.env.staging
.env.production
```

### 5. Rotate Secrets Regularly
Set reminders to update sensitive values:
```bash
# Add rotation date comments
COOLIFY_TOKEN=abc123  # Rotated: 2025-11-14, Next: 2026-02-14
```

## Quick Reference Commands

### For You to Run:

```bash
# List all .env files
/home/avi/projects/coolify/manage-env.sh list

# Search for a variable
/home/avi/projects/coolify/manage-env.sh search DATABASE_URL

# Backup all env files
find /home/avi/projects -name ".env" -exec cp {} {}.backup \;

# Find projects without .env
find /home/avi/projects -maxdepth 2 -type d ! -path "*/.*" -exec test ! -e {}/.env \; -print
```

### For Me (Claude Code) to Execute:

```bash
# Read any .env file
Read: /home/avi/projects/[project]/.env

# Edit any .env file
Edit: file_path="/home/avi/projects/[project]/.env"
      old_str="KEY=old_value"
      new_str="KEY=new_value"

# Search across projects
Grep: pattern="API_KEY" path="/home/avi/projects"

# Run management script
Execute: /home/avi/projects/coolify/manage-env.sh list
```

## Examples of Real Tasks

### Example 1: Increase Timeout Values
**Request:** "Increase all API timeouts to 60 seconds"

**My Actions:**
1. Search for timeout variables: `Grep: "TIMEOUT"`
2. Read each .env file found
3. Update timeout values
4. Verify changes

### Example 2: Update Database Credentials
**Request:** "Update database password in mobile project"

**My Actions:**
1. Read: `/home/avi/projects/mobile/.env`
2. Backup current file
3. Edit: Update `DATABASE_PASSWORD`
4. Recommend restarting the service

### Example 3: Setup New Project
**Request:** "Setup .env for my new project 'blog' based on astro-site"

**My Actions:**
1. Read: `/home/avi/projects/astro-site/.env`
2. Create: `/home/avi/projects/blog/.env`
3. Copy relevant variables
4. Ask for project-specific values

## Troubleshooting

### Can't Find .env File
```bash
# Use the find command
find /home/avi/projects -name ".env" | grep project-name
```

### Permission Denied
```bash
# Check permissions
ls -la /home/avi/projects/[project]/.env

# Fix if needed
chmod 600 /home/avi/projects/[project]/.env
```

### Changes Not Taking Effect
```bash
# For Docker containers
docker-compose restart

# For PM2 apps
pm2 restart app --update-env

# For systemd services
systemctl restart service-name
```

## Security Notes

### ⚠️ Important Reminders:

1. **Never commit .env files to git**
2. **Use strong, unique values for secrets**
3. **Rotate credentials regularly**
4. **Use encrypted storage for production secrets**
5. **Limit file permissions (chmod 600)**
6. **Backup before making changes**
7. **Validate after updates**

## Summary

**To update environment variables, just ask me naturally:**

- ✅ "Update API_KEY in coolify-mcp"
- ✅ "Show me the database settings in mobile project"
- ✅ "Add REDIS_URL to seo-expert"
- ✅ "Copy API settings from coolify-mcp to other projects"

I can read, edit, search, and manage any .env file in your projects. Just tell me what you need!

---

**Management Script:** `/home/avi/projects/coolify/manage-env.sh`  
**Projects Location:** `/home/avi/projects/`  
**Backup Location:** `/home/avi/.env-backups/`
