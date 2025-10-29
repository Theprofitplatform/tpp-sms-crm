# Discord Deployment Notifications - 2 Minute Setup

Get instant deployment notifications in Discord with this super quick guide.

---

## ⚡ Quick Setup (2 Minutes)

### Step 1: Create Discord Webhook (1 minute)

1. **Open your Discord server**
2. Right-click on the channel where you want notifications
3. Click **Edit Channel**
4. Click **Integrations** (left sidebar)
5. Click **Webhooks**
6. Click **New Webhook** button
7. **Name it**: `SEO Deployment Bot`
8. **Select channel**: Choose where notifications go
9. Click **Copy Webhook URL**
10. Click **Save Changes**

**Done!** You now have a webhook URL like:
```
https://discord.com/api/webhooks/123456789/abcdefg...
```

---

### Step 2: Add to GitHub Secrets (1 minute)

1. **Go to**: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions

2. Click **"New repository secret"** button

3. **Name**: `DISCORD_WEBHOOK_URL`
   ⚠️ Must be EXACTLY this name (case-sensitive)

4. **Value**: Paste your Discord webhook URL

5. Click **"Add secret"** button

**Done!** GitHub can now send notifications to Discord.

---

## ✅ Test It Right Now

### Quick Test from Terminal

```bash
# Replace YOUR_WEBHOOK_URL with the actual URL
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"✅ Discord notifications configured! Deployment alerts will appear here."}'
```

You should see a message appear in your Discord channel instantly!

---

## 📬 What Notifications You'll Receive

### Deployment Success
```
✅ Deployment successful!
**Commit:** feat: add new feature
**Author:** YourName
**Time:** 2025-10-29 15:30:45
```

### Deployment Failure
```
❌ Deployment failed!
**Commit:** fix: broken feature
**Author:** YourName
**Time:** 2025-10-29 15:35:20
**Check:** https://github.com/Theprofitplatform/seoexpert/actions/runs/123456
```

---

## 🎨 Customize (Optional)

### Change Webhook Name/Avatar

1. Go back to Discord webhook settings
2. Change the **Name** (e.g., "🚀 Deployment Bot")
3. Upload an **Avatar** image
4. Click **Save Changes**

Now your notifications will look custom!

---

## 🔧 Advanced: Rich Embeds (Optional)

Want fancy colored embeds instead of simple messages? Edit the deployment workflow:

**File**: `.github/workflows/deploy-production.yml`

**Find this section** (around line 210-215):
```yaml
curl -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"✅ Deployment successful!..."
```

**Replace with** (for rich embeds):
```yaml
curl -X POST "${{ secrets.DISCORD_WEBHOOK_URL }}" \
  -H "Content-Type: application/json" \
  -d "{
    \"embeds\": [{
      \"title\": \"✅ Deployment Successful\",
      \"color\": 3066993,
      \"fields\": [
        {\"name\": \"Commit\", \"value\": \"$COMMIT_MSG\", \"inline\": false},
        {\"name\": \"Author\", \"value\": \"$COMMIT_AUTHOR\", \"inline\": true},
        {\"name\": \"Time\", \"value\": \"$TIMESTAMP\", \"inline\": true}
      ],
      \"footer\": {\"text\": \"SEO Expert Deployment\"}
    }]
  }"
```

This creates nice colored embed cards!

---

## 🎯 Discord Embed Colors

For the `"color"` field:
- **Green (Success)**: `3066993`
- **Red (Error)**: `15158332`
- **Orange (Warning)**: `15105570`
- **Blue (Info)**: `3447003`

---

## ✅ Verification

After setup, your next deployment will send a notification. To trigger a test:

```bash
# Make a small change
git checkout dev
echo "# Test" >> TEST.md
git add TEST.md
git commit -m "test: discord notifications"
git push origin dev

# Create PR and merge
# Watch notification arrive in Discord!
```

---

## 🔕 Disable Notifications Temporarily

**Option 1**: Mute the channel
- Right-click channel → Mute Channel

**Option 2**: Remove the GitHub secret
- Go to: https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions
- Delete `DISCORD_WEBHOOK_URL` secret

**Option 3**: Comment out the webhook code
- Edit `.github/workflows/deploy-production.yml`
- Add `#` before curl commands sending notifications

---

## 🎪 Multiple Channels

Want notifications in multiple channels?

### Option 1: Multiple Webhooks (Simple)
```yaml
# In deploy-production.yml, duplicate the curl command:
curl -X POST "${{ secrets.DISCORD_WEBHOOK_PROD }}" ...
curl -X POST "${{ secrets.DISCORD_WEBHOOK_DEV }}" ...
```

### Option 2: Discord Server Settings
- Create webhooks for different channels
- Use same notification for all
- Control who sees what via channel permissions

---

## 📞 Troubleshooting

### "Webhook not found" error

**Solution**:
- Webhook was deleted in Discord
- Create a new webhook
- Update the GitHub secret

### "Invalid Webhook Token" error

**Solution**:
- Webhook URL is incomplete or incorrect
- Copy the FULL URL from Discord (should be ~120 characters)
- Update GitHub secret with correct URL

### No notifications appearing

**Check**:
1. Is `DISCORD_WEBHOOK_URL` secret set in GitHub?
2. Is the webhook still active in Discord?
3. Did the deployment workflow actually run?
4. Check GitHub Actions logs for errors

---

## 🚀 You're Done!

**Setup time**: 2 minutes
**Cost**: $0 (free!)
**Value**: Never miss a deployment again!

Your next deployment will send a notification to Discord automatically.

---

## 📚 More Options

Want other notification channels?

- **Slack**: See `.github/DEPLOYMENT_NOTIFICATIONS_SETUP.md`
- **Microsoft Teams**: See `.github/DEPLOYMENT_NOTIFICATIONS_SETUP.md`
- **Email**: Already built-in with GitHub notifications
- **SMS**: Use Twilio or similar service (advanced)

---

**Current PR with notification support**: https://github.com/Theprofitplatform/seoexpert/pull/18

**Watch deployments**: https://github.com/Theprofitplatform/seoexpert/actions

**Status**: ✅ Ready to use after PR merge!
