# GitHub Secrets Setup Guide

## ✅ Prerequisites Complete
- Local testing passed ✅
- Automation working ✅
- Report generated ✅

## 🔐 Add These 8 Secrets to GitHub

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

---

### 1. GSC_SERVICE_ACCOUNT

**Name:** `GSC_SERVICE_ACCOUNT`

**Value:** (Copy the ENTIRE JSON below - all lines)

```json
{

}
```

---

### 2. ANTHROPIC_API_KEY

**Name:** `ANTHROPIC_API_KEY`

**Value:**
```

```

---

### 3. OPENAI_API_KEY (Optional)

**Name:** `OPENAI_API_KEY`

**Value:** (Use your OpenAI key, or this placeholder if you don't have one)
```
sk-placeholder-openai-key
```

---

### 4. IAT_WP_USER

**Name:** `IAT_WP_USER`

**Value:**
```
Claude
```

---

### 5. IAT_WP_PASSWORD

**Name:** `IAT_WP_PASSWORD`

**Value:**
```
```

---

### 6. HOTTYRES_WP_USER

**Name:** `HOTTYRES_WP_USER`

**Value:**
```
admin
```

---

### 7. HOTTYRES_WP_PASSWORD

**Name:** `HOTTYRES_WP_PASSWORD`

**Value:** (Get this from Hot Tyres WordPress)

To generate:
1. Log into Hot Tyres WordPress admin
2. Go to: Users → Your Profile
3. Scroll to "Application Passwords"
4. Enter name: "SEO Automation"
5. Click "Add New Application Password"
6. Copy the generated password (it will look like: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste here (remove spaces)

For now, use placeholder:
```
your-wordpress-app-password-here
```

---

### 8. SADC_WP_USER

**Name:** `SADC_WP_USER`

**Value:**
```
admin
```

---

### 9. SADC_WP_PASSWORD

**Name:** `SADC_WP_PASSWORD`

**Value:** (Get this from SADC WordPress - same process as Hot Tyres)

For now, use placeholder:
```
your-wordpress-app-password-here
```

---

## ✅ Verification Checklist

After adding all secrets, verify:
- [ ] GSC_SERVICE_ACCOUNT (full JSON)
- [ ] ANTHROPIC_API_KEY (sk-ant-...)
- [ ] OPENAI_API_KEY (optional)
- [ ] IAT_WP_USER (Claude)
- [ ] IAT_WP_PASSWORD (app password)
- [ ] HOTTYRES_WP_USER (admin)
- [ ] HOTTYRES_WP_PASSWORD (placeholder for now)
- [ ] SADC_WP_USER (admin)
- [ ] SADC_WP_PASSWORD (placeholder for now)

**Note:** The automation will work for Instant Auto Traders immediately. Hot Tyres and SADC will skip WordPress updates until you add their credentials.

---

## 🚀 Next Step

After adding secrets, go to: **Actions → Weekly SEO Automation → Run workflow**

Select:
- Client: `instantautotraders`
- Dry run: `false`

Click "Run workflow" to test!

---

## 📊 What Happens Next

**Every Monday at 9:00 AM UTC**, GitHub Actions will:
1. Fetch GSC data for all 3 clients
2. Find quick win opportunities
3. Optimize posts automatically
4. Generate beautiful HTML reports
5. Upload reports as artifacts (download from Actions tab)

**Manual runs:** You can trigger anytime from Actions tab

---

*Generated: 2025-10-24*
