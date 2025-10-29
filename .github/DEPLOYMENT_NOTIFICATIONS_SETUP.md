# Deployment Notifications Setup

Configure notifications to get real-time updates on deployments, test results, and PR status.

## Supported Notification Channels

1. **Discord** (Recommended)
2. **Slack**
3. **Microsoft Teams**
4. **Email** (via GitHub)
5. **Custom Webhooks**

---

## 1. Discord Setup (Recommended)

### Step 1: Create Discord Webhook

1. Open your Discord server
2. Go to **Server Settings → Integrations → Webhooks**
3. Click **New Webhook**
4. Name it: `SEO Expert Deployments`
5. Select the channel for notifications
6. Click **Copy Webhook URL**

### Step 2: Add to GitHub Secrets

1. Go to your repository: `https://github.com/Theprofitplatform/seoexpert`
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste the webhook URL from Discord
6. Click **Add secret**

### Step 3: Test the Webhook

```bash
# Test from command line
curl -X POST "YOUR_DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ Test notification from SEO Expert deployment system!"}'
```

### Notifications You'll Receive

The existing deployment workflow will now send:

✅ **Deployment Success:**
```
✅ Deployment successful!
**Commit:** feat: add new feature
**Author:** John Doe
**Time:** 2025-10-29 15:30:45
```

❌ **Deployment Failure:**
```
❌ Deployment failed!
**Commit:** fix: broken feature
**Author:** Jane Smith
**Time:** 2025-10-29 15:35:20
**Check:** https://github.com/Theprofitplatform/seoexpert/actions/runs/123456
```

---

## 2. Slack Setup

### Step 1: Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Click **Create New App → From scratch**
3. Name: `SEO Expert Deployments`
4. Choose your workspace
5. Navigate to **Incoming Webhooks**
6. Activate **Incoming Webhooks**
7. Click **Add New Webhook to Workspace**
8. Select channel for notifications
9. Copy the webhook URL

### Step 2: Add to GitHub Secrets

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Paste the Slack webhook URL
5. Click **Add secret**

### Step 3: Update Deployment Workflow

Add this to `.github/workflows/deploy-production.yml` in the notification step:

```yaml
# Send to Slack
if [ -n "${{ secrets.SLACK_WEBHOOK_URL }}" ]; then
  curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"✅ Deployment successful!\n*Commit:* $COMMIT_MSG\n*Author:* $COMMIT_AUTHOR\n*Time:* $TIMESTAMP\"}"
fi
```

---

## 3. Microsoft Teams Setup

### Step 1: Create Teams Webhook

1. Open Microsoft Teams
2. Navigate to the channel for notifications
3. Click **⋯ (More options)** → **Connectors**
4. Search for **Incoming Webhook**
5. Click **Configure**
6. Name: `SEO Expert Deployments`
7. Upload an image (optional)
8. Click **Create**
9. Copy the webhook URL

### Step 2: Add to GitHub Secrets

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `TEAMS_WEBHOOK_URL`
4. Value: Paste the Teams webhook URL
5. Click **Add secret**

### Step 3: Update Deployment Workflow

Add this to `.github/workflows/deploy-production.yml`:

```yaml
# Send to Teams
if [ -n "${{ secrets.TEAMS_WEBHOOK_URL }}" ]; then
  curl -X POST "${{ secrets.TEAMS_WEBHOOK_URL }}" \
    -H "Content-Type: application/json" \
    -d "{\"@type\":\"MessageCard\",\"text\":\"✅ Deployment successful!\",\"sections\":[{\"facts\":[{\"name\":\"Commit\",\"value\":\"$COMMIT_MSG\"},{\"name\":\"Author\",\"value\":\"$COMMIT_AUTHOR\"},{\"name\":\"Time\",\"value\":\"$TIMESTAMP\"}]}]}"
fi
```

---

## 4. Email Notifications (GitHub)

GitHub can send email notifications automatically.

### Enable for Repository

1. Go to repository **Settings → Notifications**
2. Enable **Actions** notifications
3. Each team member should also:
   - Go to **GitHub Settings → Notifications**
   - Enable **Actions** under **Watching**

### What You'll Receive

- Workflow run failures
- Workflow run successes (if enabled)
- PR check status updates

---

## 5. Custom Webhook (Advanced)

### Step 1: Set Up Your Endpoint

Create an endpoint that accepts POST requests:

```javascript
// Example Express.js endpoint
app.post('/deployment-webhook', (req, res) => {
  const { status, commit, author, timestamp, url } = req.body;

  // Your custom logic here
  // - Log to database
  // - Send SMS
  // - Update dashboard
  // - Trigger other automations

  console.log(`Deployment ${status}: ${commit} by ${author}`);
  res.status(200).send('OK');
});
```

### Step 2: Add to GitHub Secrets

```
CUSTOM_WEBHOOK_URL=https://your-domain.com/deployment-webhook
CUSTOM_WEBHOOK_SECRET=your-secret-key  # Optional for verification
```

### Step 3: Update Workflow

```yaml
- name: Send custom webhook
  if: always()
  run: |
    curl -X POST "${{ secrets.CUSTOM_WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -H "X-Webhook-Secret: ${{ secrets.CUSTOM_WEBHOOK_SECRET }}" \
      -d '{
        "status": "${{ job.status }}",
        "commit": "${{ github.event.head_commit.message }}",
        "author": "${{ github.event.head_commit.author.name }}",
        "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
        "url": "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }'
```

---

## 6. GitHub Mobile App

Get instant push notifications on your phone!

### Setup

1. Install **GitHub Mobile** from:
   - iOS: https://apps.apple.com/app/github/id1477376905
   - Android: https://play.google.com/store/apps/details?id=com.github.android

2. Sign in with your GitHub account

3. Enable push notifications:
   - Go to **Settings → Notifications**
   - Enable **Actions**
   - Enable **Pull requests**

4. Watch the repository:
   - Navigate to `Theprofitplatform/seoexpert`
   - Tap the star icon
   - Select **Watch** → **All Activity**

---

## Notification Examples

### Deployment Success (Discord/Slack)

```
🚀 Production Deployment Successful!

Commit: feat: add automatic deployment workflow
Author: Claude Code
Time: 2025-10-29 15:45:30 UTC
Duration: 5m 23s
Target: Docker VPS (31.97.222.218)

Health Check: ✅ Passed
Services:
  ✅ Dashboard
  ✅ PostgreSQL
  ✅ Keyword Service
  ✅ Cloudflare Tunnel

View Details: https://github.com/Theprofitplatform/seoexpert/actions/runs/123456
```

### Deployment Failure (Discord/Slack)

```
❌ Production Deployment Failed!

Commit: fix: database migration
Author: Claude Code
Time: 2025-10-29 16:00:15 UTC
Failed at: Database Migration

Error: Migration version conflict
Service: PostgreSQL

Action Required:
1. Check logs: https://github.com/Theprofitplatform/seoexpert/actions/runs/123457
2. Fix the issue
3. Retry deployment or rollback

Rollback Command:
gh workflow run deploy-production.yml --ref main
(Select 'Rollback' option when prompted)
```

### PR Check Status (GitHub)

```
✅ All checks passed for PR #42

Tests: ✅ Passed (28/28)
Build: ✅ Passed
Security: ✅ No vulnerabilities
Code Quality: ✅ Passed

Ready to merge!
Merging will trigger automatic deployment to production.

View PR: https://github.com/Theprofitplatform/seoexpert/pull/42
```

---

## Testing Notifications

### Test Discord Webhook

```bash
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"🧪 Test notification - SEO Expert deployment system is configured!"}'
```

### Test Slack Webhook

```bash
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"🧪 Test notification - SEO Expert deployment system is configured!"}'
```

### Test Teams Webhook

```bash
curl -X POST "$TEAMS_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"@type":"MessageCard","text":"🧪 Test notification - SEO Expert deployment system is configured!"}'
```

---

## Troubleshooting

### Notifications Not Received

1. **Check webhook URL is correct** in GitHub Secrets
2. **Verify channel permissions** in Discord/Slack/Teams
3. **Test webhook manually** using curl commands above
4. **Check workflow logs** for curl command output
5. **Verify secret name** matches exactly (case-sensitive)

### Discord Webhook Not Working

- Ensure the webhook wasn't deleted in Discord
- Check channel permissions
- Verify webhook URL starts with `https://discord.com/api/webhooks/`

### Slack Webhook Not Working

- Verify webhook URL starts with `https://hooks.slack.com/services/`
- Check app permissions in Slack workspace
- Ensure webhook wasn't revoked

---

## Recommended Setup

For best visibility, set up at least:

1. ✅ **Discord/Slack** - For team notifications
2. ✅ **GitHub Mobile** - For personal push notifications
3. ✅ **Email** - As backup notification method

This ensures you never miss critical deployment events!

---

## Quick Start

```bash
# 1. Get Discord webhook URL
# 2. Add to GitHub Secrets as DISCORD_WEBHOOK_URL
# 3. Test it:

DISCORD_WEBHOOK_URL="your-webhook-url"
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ Deployment notifications configured successfully!"}'

# 4. Push a change to dev branch
# 5. Create PR to main
# 6. Merge PR
# 7. Watch the deployment notification arrive! 🎉
```

---

Need help? Check the workflow logs or review the deployment workflow file:
`.github/workflows/deploy-production.yml`
