# Google Service Account Configuration

## Quick Setup (First Time)

```bash
# 1. Copy the template
cp service-account.json.example service-account.json

# 2. Add your Google Cloud credentials to service-account.json
# Get them from: https://console.cloud.google.com/iam-admin/serviceaccounts

# 3. Verify it's not tracked by git
git check-ignore service-account.json
```

## Files in This Directory

| File | Purpose | Git Status |
|------|---------|------------|
| `service-account.json` | **YOUR ACTUAL CREDENTIALS** | ❌ Ignored by git |
| `service-account.json.example` | Template for reference | ✅ Committed |
| `SECURITY_SETUP.md` | Complete security guide | ✅ Committed |
| `README.md` | This file | ✅ Committed |

## Security Status

✅ **Protected** - Your credentials are NOT committed to git
✅ **Ignored** - Listed in `.gitignore` (line 94)
✅ **Safe** - No credentials in git history

## Current Service Account

**Project:** robotic-goal-456009-r2
**Email:** seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
**Used For:** Google Search Console API access

## Important

⚠️ **NEVER commit `service-account.json` to git!**
⚠️ **Rotate keys every 90 days** (see `SECURITY_SETUP.md`)
⚠️ **If exposed, rotate immediately!**

## Need Help?

- **Setup Guide:** See `SECURITY_SETUP.md`
- **Key Rotation:** See `SECURITY_SETUP.md` → "Key Rotation Process"
- **Production Deployment:** See `SECURITY_SETUP.md` → "Environment-Based Credential Management"

---

**Last Updated:** 2025-11-02
