# Quick Start: How to Ask Claude Code to Update Environment Variables

## The Simple Answer

**Just ask me naturally!** I can read and edit .env files directly.

## Examples of What You Can Ask

### 1. Update a Single Variable
**You:** "Update COOLIFY_API_TIMEOUT to 90000 in coolify-mcp"

**Me:** 
```
✅ Reading /home/avi/projects/coolify/coolify-mcp/.env
✅ Updated COOLIFY_API_TIMEOUT from 60000 to 90000
✅ Done!
```

### 2. Add a New Variable
**You:** "Add REDIS_URL=redis://localhost:6379 to mobile project"

**Me:**
```
✅ Reading /home/avi/projects/mobile/.env
✅ Added REDIS_URL=redis://localhost:6379
✅ Done!
```

### 3. Show Current Values
**You:** "Show me all API settings in coolify-mcp"

**Me:**
```
Reading .env file...

API Settings:
- COOLIFY_BASE_URL=https://coolify.theprofitplatform.com.au
- COOLIFY_TOKEN=********
- COOLIFY_API_TIMEOUT=60000
- COOLIFY_API_MAX_RETRIES=5
- COOLIFY_API_RETRY_DELAY=2000
```

### 4. Search Across Projects
**You:** "Where is DATABASE_URL defined?"

**Me:**
```
Searching projects...

Found in:
- /home/avi/projects/mobile/.env
- /home/avi/projects/seo-expert/.env
- /home/avi/projects/chat/.env
```

### 5. Copy Settings Between Projects
**You:** "Copy the API timeout settings from coolify-mcp to seo-expert"

**Me:**
```
✅ Reading source: coolify-mcp/.env
✅ Reading target: seo-expert/.env
✅ Copying:
   - COOLIFY_API_TIMEOUT=60000
   - COOLIFY_API_MAX_RETRIES=5
   - COOLIFY_API_RETRY_DELAY=2000
✅ Updated seo-expert/.env
```

## Common Patterns

### Pattern 1: Direct Update
```
"Update [VARIABLE] to [VALUE] in [PROJECT]"
"Change [VARIABLE] in [PROJECT] to [VALUE]"
"Set [VARIABLE]=[VALUE] in [PROJECT]"
```

### Pattern 2: Add New
```
"Add [VARIABLE]=[VALUE] to [PROJECT]"
"Create [VARIABLE] in [PROJECT] with value [VALUE]"
```

### Pattern 3: Show/Display
```
"Show [PROJECT] environment variables"
"Display .env for [PROJECT]"
"What are the settings in [PROJECT]?"
```

### Pattern 4: Search/Find
```
"Where is [VARIABLE] used?"
"Find all projects with [VARIABLE]"
"Search for [VARIABLE] in projects"
```

### Pattern 5: Remove
```
"Remove [VARIABLE] from [PROJECT]"
"Delete [VARIABLE] in [PROJECT]"
```

## Your Projects

Quick reference for project names:

| Project | .env Location |
|---------|---------------|
| **coolify-mcp** | `/home/avi/projects/coolify/coolify-mcp/.env` |
| **seo-expert** | `/home/avi/projects/seo-expert/.env` |
| **mobile** | `/home/avi/projects/mobile/.env` |
| **chat** | `/home/avi/projects/chat/.env` |
| **astro-site** | `/home/avi/projects/astro-site/.env` |
| **tpp-automation** | `/home/avi/projects/tpp-automation/.env` |
| **whisper** | `/home/avi/projects/whisper/.env` |
| **sms-crm** | `/home/avi/projects/sms-crm/.env` |
| **headlessx** | `/home/avi/projects/headlessx/.env` |
| **instagram-bot** | `/home/avi/projects/instagram-bot/.env` |

## Manual Management (If You Prefer)

### Using the Script

```bash
# List all .env files
/home/avi/projects/coolify/manage-env.sh list

# Show contents (masked)
/home/avi/projects/coolify/manage-env.sh show coolify-mcp

# Update a variable
/home/avi/projects/coolify/manage-env.sh update coolify-mcp API_TIMEOUT 90000

# Search for a key
/home/avi/projects/coolify/manage-env.sh search COOLIFY_TOKEN

# Backup before changes
/home/avi/projects/coolify/manage-env.sh backup coolify-mcp
```

### Using Aliases (Optional)

Add to your `.bashrc`:
```bash
source ~/.bash_aliases_env
```

Then use short commands:
```bash
env-list              # List all .env files
env-show mobile       # Show mobile project .env
env-search API_KEY    # Search for API_KEY
env-backup mobile     # Backup mobile .env
```

## Safety Features

### I Always:
1. ✅ Show you what I'm changing
2. ✅ Confirm the file path
3. ✅ Display the before/after values
4. ✅ Verify the change was successful

### You Can:
1. ✅ Ask me to backup first
2. ✅ Ask me to show the full file before editing
3. ✅ Ask me to validate the format
4. ✅ Request a dry-run (show what would change)

## Tips for Best Results

### ✅ Do:
- Specify the project name clearly
- Provide the exact variable name (case-sensitive)
- Include the full value to set
- Ask for backup if making critical changes

### ❌ Don't:
- Use vague terms like "my project" or "the API"
- Assume I know which environment (dev/staging/prod)
- Forget to restart services after changes

## After Updating .env Files

### If Using Docker:
```bash
docker-compose restart
# or
docker restart container-name
```

### If Using PM2:
```bash
pm2 restart app-name --update-env
```

### If Using Systemd:
```bash
systemctl restart service-name
```

**I can do these for you too!** Just say:
- "Update API_KEY and restart the Docker container"
- "Change DATABASE_URL and restart PM2 app"

## Common Scenarios

### Scenario 1: New API Key
**You:** "I got a new Coolify API token: abc123xyz"

**Me:**
```
✅ I'll update COOLIFY_TOKEN in coolify-mcp
✅ Creating backup first...
✅ Updated successfully
✅ Don't forget to restart Claude Desktop to use the new token!
```

### Scenario 2: Multiple Updates
**You:** "Update API settings: timeout to 90000, retries to 10"

**Me:**
```
✅ Updating coolify-mcp/.env:
   - COOLIFY_API_TIMEOUT: 60000 → 90000
   - COOLIFY_API_MAX_RETRIES: 5 → 10
✅ Done! Both values updated.
```

### Scenario 3: Setup New Project
**You:** "Create .env for my new blog project based on astro-site"

**Me:**
```
✅ Reading template from astro-site/.env
✅ Creating /home/avi/projects/blog/.env
✅ Copied base configuration
❓ What should I use for:
   - API_KEY: [waiting for value]
   - DATABASE_URL: [waiting for value]
```

## Need Help?

Just ask!
- "How do I update environment variables?"
- "Where are my .env files?"
- "What environment variables are in coolify-mcp?"
- "Help me setup .env for a new project"

## Summary

**To update environment variables with me:**

1. **Just ask naturally** - "Update X to Y in Z project"
2. **I'll handle the rest** - Read, edit, verify, confirm
3. **No special commands needed** - I can access files directly
4. **Safe and transparent** - I show you what I'm doing

That's it! 🎉

---

**Management Script:** `/home/avi/projects/coolify/manage-env.sh`  
**Comprehensive Guide:** `/home/avi/projects/coolify/ENV-MANAGEMENT-GUIDE.md`  
**This Quick Start:** `/home/avi/projects/coolify/CLAUDE-ENV-QUICK-START.md`
