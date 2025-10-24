# Fix Rank Math Settings - Step by Step Guide
**Enable custom meta descriptions in Rank Math**

---

## 🎯 **GOAL:**

Change Rank Math settings so it uses our custom meta descriptions instead of auto-generated excerpts.

---

## 📋 **STEP-BY-STEP INSTRUCTIONS:**

### **Step 1: Login to WordPress Admin**

Go to: https://instantautotraders.com.au/wp-admin

Login with your admin credentials.

---

### **Step 2: Navigate to Rank Math Settings**

1. In the left sidebar, find **"Rank Math SEO"**
2. Hover over it
3. Click **"General Settings"**

**Or go directly to:**
https://instantautotraders.com.au/wp-admin/admin.php?page=rank-math

---

### **Step 3: Go to Titles & Meta Settings**

1. In Rank Math dashboard, find the **"Titles & Meta"** tab
2. Click it

**Or go directly to:**
https://instantautotraders.com.au/wp-admin/admin.php?page=rank-math-options-general#setting-panel-post-type-post

---

### **Step 4: Configure Post Settings**

Look for the **"Posts"** section (should be the first tab)

Find these settings and configure them:

#### **Meta Description:**
- **Setting:** "Description Format"
- **Current:** Probably set to use excerpt
- **Change to:** Custom field or blank
- **What to look for:** Option that says something like:
  - "Use custom meta description if available"
  - Or just leave the format field as: `%seo_description%`

#### **Make sure this is UNCHECKED:**
- ❌ "Use post excerpt for meta description"
- ❌ "Auto-generate descriptions"

---

### **Step 5: Save Changes**

1. Scroll to the bottom
2. Click **"Save Changes"**
3. Wait for confirmation message

---

### **Step 6: Clear All Caches**

The site uses **LiteSpeed Cache**. We need to clear it:

#### **Option A: Via LiteSpeed Cache Plugin**

1. In WordPress admin sidebar, find **"LiteSpeed Cache"**
2. Click **"Purge All"** (usually in the top admin bar)
3. Confirm

#### **Option B: Via Admin Bar**

1. Look at the top of WordPress admin
2. Find **"LiteSpeed Cache"** button
3. Click **"Purge All"**

#### **Option C: Direct URL**

Go to:
https://instantautotraders.com.au/wp-admin/admin.php?page=litespeed-cache

Then click "Purge All"

---

### **Step 7: Verify One Post Manually**

1. Go to **Posts → All Posts**
2. Edit: "Second Hand Car Buyers in Sydney" (Post ID: 8343)
3. Scroll down to **Rank Math SEO** box
4. Check the **"Description"** field
5. It should show our custom description:
   > "Looking for second hand car buyers in Sydney? Get instant cash offers, free car valuation, and same-day payment. Sell your car fast with Instant Auto Traders."

**If the field is EMPTY**, the automation didn't set it properly (we'll fix that next).

**If the field HAS text**, great! Rank Math should now use it.

---

## 🧪 **VERIFICATION:**

After changing settings and clearing cache, verify one post:

1. Open an incognito/private browser window
2. Go to: https://instantautotraders.com.au/2025/10/17/second-hand-car-buyers-in-sydney/
3. Right-click → View Page Source
4. Search for: `<meta name="description"`
5. Check if it shows our custom description or still the excerpt

**Expected result:**
```html
<meta name="description" content="Looking for second hand car buyers in Sydney? Get instant cash offers, free car valuation, and same-day payment...">
```

---

## ❓ **IF DESCRIPTION FIELD IS EMPTY:**

This means the Rank Math API didn't actually save our data.

**Next steps:**
1. We'll re-run the automation with corrected settings
2. Or use a different approach (direct WordPress API)

---

## ✅ **AFTER SETTINGS ARE FIXED:**

Once you've:
- ✅ Changed Rank Math settings
- ✅ Cleared cache
- ✅ Verified settings are correct

Let me know and I'll:
1. Re-run the automation on all 69 posts
2. Verify custom descriptions appear
3. Confirm everything is working properly

---

## 📞 **NEED HELP?**

If you get stuck at any step, let me know:
- Screenshot what you're seeing
- Tell me which step you're on
- I'll guide you through it

---

**Let's do this!** 🚀
