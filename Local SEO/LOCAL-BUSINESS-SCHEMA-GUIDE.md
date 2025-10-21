# 🏢 LOCAL BUSINESS SCHEMA IMPLEMENTATION GUIDE

**Purpose:** Add LocalBusiness schema markup to your homepage for better local SEO
**Time Required:** 30 minutes
**Impact:** Enhanced local search presence, rich results for business queries

---

## 📊 WHAT IS LOCAL BUSINESS SCHEMA?

Local Business schema tells Google:
- Your business type (Automotive Business)
- Exact location and service areas
- Contact information
- Opening hours
- Services offered
- Customer ratings

**Result:** Google shows your business info directly in search results with enhanced formatting.

---

## 🎯 STEP 1: CUSTOMIZE THE SCHEMA FILE

I've created `local-business-schema.json` for you. You need to fill in the placeholders:

### Fields to Update:

**1. Street Address:**
```json
"streetAddress": "[Your street address here]"
```
Replace with your actual street address (no abbreviations).

**2. Postcode:**
```json
"postalCode": "[Your postcode]"
```
Replace with your Australian postcode.

**3. Geographic Coordinates:**

Get your lat/long from Google Maps:
1. Go to https://www.google.com/maps
2. Search for your business address
3. Right-click on the location pin
4. Click on the coordinates to copy (e.g., "-33.8688, 151.2093")

```json
"latitude": "-33.8688",
"longitude": "151.2093"
```

**4. Phone Number:**
```json
"telephone": "+61-2-XXXX-XXXX"
```
Format: +61 (country code) - 2 (area code) - YOUR-NUMBER

**5. Email:**
```json
"email": "info@instantautotraders.com.au"
```
Use your business email.

**6. Logo Image URL:**
```json
"image": "https://instantautotraders.com.au/logo.png"
```
Make sure this image exists and is at least 600x60px.

**7. Opening Hours:**

Update to match your actual hours:
```json
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Saturday",
    "opens": "09:00",
    "closes": "16:00"
  }
]
```

**8. Aggregate Rating:** (Update after you get Google reviews)
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "reviewCount": "150"
}
```

**If you don't have reviews yet, DELETE this entire section.**

**9. Social Media Links:**
```json
"sameAs": [
  "https://www.facebook.com/[your-facebook-page]",
  "https://www.instagram.com/[your-instagram]",
  "https://www.linkedin.com/company/[your-linkedin]",
  "https://twitter.com/[your-twitter]"
]
```

Replace with your actual social media URLs or delete the ones you don't have.

**10. Optional Fields:**

If applicable, fill in:
- Founder name
- Founding year
- Number of employees

If not applicable, delete these fields.

---

## 🛠️ STEP 2: ADD SCHEMA TO YOUR HOMEPAGE

### Method 1: Via WordPress Theme (Recommended)

**If using a theme with custom code section:**

1. Log into WordPress admin
2. Go to: Appearance → Theme Editor
3. Open: `header.php` or use theme's custom code section
4. Add this code just before `</head>` tag:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AutomotiveBusiness",
  "name": "Instant Auto Traders",
  ...
  [PASTE YOUR CUSTOMIZED SCHEMA HERE]
  ...
}
</script>
```

5. Click "Update File"

### Method 2: Via WordPress Plugin

**Using WPCode (Recommended Plugin):**

1. Install "WPCode" plugin (free)
2. Go to: Code Snippets → Add Snippet
3. Choose "Add Your Custom Code"
4. Paste schema code (wrapped in `<script type="application/ld+json">...</script>` tags)
5. Set location: "Site Wide Header"
6. Activate the snippet

### Method 3: Via Rank Math SEO Plugin

**If you already have Rank Math installed:**

1. Go to: Rank Math → General Settings → Edit Robots.txt
2. Actually, go to: Rank Math → Titles & Meta → Local SEO
3. Enable Local SEO
4. Fill in business information
5. Rank Math automatically generates LocalBusiness schema

**Note:** Rank Math method is easiest but less customizable.

### Method 4: Direct File Edit (Advanced)

**If you have FTP access:**

1. Connect via FTP to your website
2. Navigate to: `/wp-content/themes/[your-theme]/`
3. Download `header.php`
4. Open in text editor
5. Add schema code before `</head>` tag
6. Save and re-upload
7. Clear cache

---

## ✅ STEP 3: VERIFY YOUR SCHEMA

### Test with Google Rich Results Test:

1. Go to: https://search.google.com/test/rich-results
2. Enter your homepage URL: https://instantautotraders.com.au
3. Click "Test URL"
4. Wait 15-30 seconds
5. Look for results

**Expected Results:**
```
✅ AutomotiveBusiness detected
   Valid structure
   ✓ Name: Instant Auto Traders
   ✓ Address: [Your address]
   ✓ Telephone: [Your phone]
   ✓ Opening hours: [Your hours]
   ✓ Services: [4 services listed]

✅ No issues detected
```

**If you see errors:**
- Read the error message
- Check for missing commas or brackets in JSON
- Verify all required fields are filled
- Make sure coordinates are in correct format

### Test with Schema Markup Validator:

1. Go to: https://validator.schema.org
2. Paste your full schema code
3. Click "Run Test"
4. Check for green checkmarks

**Passing validation = ready to go live**

---

## 📈 STEP 4: MONITOR RESULTS

### Week 1-2:
- Google crawls and indexes your schema
- No visible changes yet (normal)

### Week 3-4:
- Business info may start appearing in Knowledge Panel
- Rich results for brand searches ("Instant Auto Traders")

### Week 5-8:
- Enhanced local search presence
- Business info shows in more queries
- Potential rich results for service searches

### How to Check:

**Google Search (Incognito):**
```
Search: "Instant Auto Traders Sydney"
```
Look for:
- Business info card on right side
- Phone number, address, hours displayed
- Services listed

**Google Search Console:**
1. Go to: Search Console → Enhancements
2. Look for: "Unparsed structured data" or "Corporate Contacts"
3. Should show 0 errors

---

## 🔄 UPDATING YOUR SCHEMA

### When to Update:

**Immediately update if you:**
- Change business address
- Change phone number
- Update business hours
- Add new services
- Get more reviews (update aggregate rating)

**How to Update:**

1. Edit the schema file
2. Replace old schema code with new on homepage
3. Re-test with Rich Results Test
4. Clear website cache
5. Request re-indexing in Google Search Console

---

## 🎯 ADVANCED: ADD MULTIPLE SCHEMAS

You can have multiple schema types on one page. For homepage, consider adding:

**1. LocalBusiness Schema** (from local-business-schema.json)
**2. Organization Schema** (brand/company info)
**3. WebSite Schema** (sitelinks search box)

**How to add multiple:**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AutomotiveBusiness",
      ... local business schema ...
    },
    {
      "@type": "Organization",
      ... organization schema ...
    },
    {
      "@type": "WebSite",
      ... website schema ...
    }
  ]
}
</script>
```

**I can create Organization and WebSite schemas if you want these too.**

---

## ❓ TROUBLESHOOTING

**Problem:** Rich Results Test shows "No structured data detected"
**Solution:**
- Check schema is actually on the page (view page source, search for "schema.org")
- Ensure script tags are correct: `<script type="application/ld+json">`
- Clear browser cache and re-test

**Problem:** "Missing required field" error
**Solution:** Check which field is mentioned in error, add it to your schema

**Problem:** "Invalid coordinates" error
**Solution:** Coordinates must be numbers without quotes:
- ✅ Correct: `"latitude": -33.8688`
- ❌ Wrong: `"latitude": "-33.8688"`

**Problem:** Schema shows on Rich Results Test but not in Google Search
**Solution:**
- Wait 2-4 weeks for Google to process
- Make sure schema is on the homepage (not just test page)
- Request indexing in Google Search Console

---

## ✅ COMPLETION CHECKLIST

- [ ] Customized all fields in local-business-schema.json
- [ ] Removed placeholder text (all [brackets])
- [ ] Added correct lat/long coordinates
- [ ] Updated opening hours to match actual hours
- [ ] Added social media links or removed if not applicable
- [ ] Removed aggregateRating section if no reviews yet
- [ ] Added schema to homepage using one of the 4 methods
- [ ] Tested with Google Rich Results Test
- [ ] Verified: "AutomotiveBusiness detected" with 0 errors
- [ ] Checked page source to confirm schema is visible
- [ ] Requested re-indexing in Google Search Console

**Status: Ready for Google to index**

---

## 📊 EXPECTED IMPACT

### Short-term (Week 3-4):
- Business info appears in Knowledge Panel
- Enhanced brand search results
- Structured data detected in Search Console

### Medium-term (Week 5-8):
- Improved local search visibility
- Business details show for service queries
- Higher click-through rate on local searches

### Long-term (Month 3+):
- Combined with citations = stronger local authority
- Potential rich results for multiple queries
- Better overall local pack rankings
- **Revenue impact:** +$500-1,500/month (combined with other local SEO efforts)

---

## 💡 PRO TIPS

✅ **Update quarterly:** Keep hours, phone, services current
✅ **Add reviews:** Update aggregateRating as you get more reviews
✅ **Be accurate:** Don't exaggerate rating or review count (Google checks)
✅ **Match NAP:** Ensure schema NAP matches Google Business Profile exactly
✅ **Keep it simple:** Start with LocalBusiness schema, add others later if needed
✅ **Test regularly:** Re-test with Rich Results Test after any changes
✅ **Monitor Search Console:** Check for schema errors monthly

---

## 🚀 NEXT STEPS AFTER SCHEMA

Once your LocalBusiness schema is live:

1. **Week 1:** Get Google Business Profile verified
2. **Week 2:** Get first 5 reviews
3. **Week 3:** Update aggregateRating in schema
4. **Week 4:** Submit to 30+ directories for NAP consistency
5. **Week 8:** Measure local search visibility improvements

**All these steps are in LOCAL-SEO-IMPLEMENTATION-GUIDE.md**

---

**Quick Start:**

1. **Now (5 mins):** Open local-business-schema.json
2. **Today (20 mins):** Customize all fields with your actual info
3. **Today (5 mins):** Add to homepage via WPCode plugin or theme editor
4. **Today (2 mins):** Test with Rich Results Test
5. **Done!** Google will index within 1-2 weeks

**Expected outcome:** Enhanced local search presence, business info showing in Google Knowledge Panel, improved local rankings.

═══════════════════════════════════════════════════════════════════════════════

**Last Updated:** October 15, 2025
**File:** local-business-schema.json
**Status:** Ready to customize and implement
**Time Required:** 30 minutes
**Next Action:** Open local-business-schema.json and fill in your details!

═══════════════════════════════════════════════════════════════════════════════
