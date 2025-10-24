# SerpBear Integration Guide
## Google Search Console & Google Ads Setup

---

## 🔍 Google Search Console Integration

### What You'll Get:
- Actual visit counts for tracked keywords
- Impressions and CTR data
- Discover new keyword opportunities
- View top performing keywords, countries, and pages

### Requirements:
1. A Google Cloud Project
2. Service Account with Search Console API enabled
3. Your website verified in Google Search Console

---

### Step-by-Step Setup:

#### **1. Create a Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "SerpBear SEO Tracker"

#### **2. Enable Search Console API**
1. In your Google Cloud Project, go to **APIs & Services** → **Library**
2. Search for "Google Search Console API"
3. Click **Enable**

#### **3. Create a Service Account**
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name it: "serpbear-search-console"
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

#### **4. Generate Service Account Key**
1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** → **Create New Key**
4. Select **JSON** format
5. Click **Create** - a JSON file will download

#### **5. Extract Credentials from JSON File**
Open the downloaded JSON file and find:
- `client_email` (looks like: `serpbear-sc@project-name.iam.gserviceaccount.com`)
- `private_key` (starts with: `-----BEGIN PRIVATE KEY-----`)

#### **6. Grant Access in Google Search Console**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Click **Settings** (gear icon in left sidebar)
4. Click **Users and permissions**
5. Click **Add user**
6. Paste the **client_email** from your JSON file
7. Grant **Full** permissions
8. Click **Add**

#### **7. Add to SerpBear**
1. In SerpBear, go to **Settings** (gear icon)
2. Scroll to **Google Search Console Integration**
3. Paste your **Client Email**
4. Paste your **Private Key** (entire block including BEGIN/END lines)
5. Click **Update Settings**

✅ **Done!** Search Console data will now appear for your tracked keywords.

---

## 📊 Google Ads Integration

### What You'll Get:
- Keyword research and idea generation
- Monthly search volume data for tracked keywords
- Keyword suggestions from your website content
- Competition and trend data

### Requirements:
1. A Google Cloud Project (can use the same one)
2. Google Ads Account (Test Account is fine)
3. Google Ads Developer Token

---

### Step-by-Step Setup:

#### **STEP 1: Connect Google Cloud Project**

##### **1. Create OAuth 2.0 Credentials**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the consent screen:
   - User Type: **External**
   - App name: "SerpBear"
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through all steps

##### **2. Create OAuth Client**
1. Back in **Credentials**, click **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: "SerpBear OAuth"
4. **Authorized redirect URIs**, click **Add URI** and enter:
   - For local: `http://localhost:3001/api/adwords`
   - For production: `https://yourdomain.com/api/adwords`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret** that appear

##### **3. Enable Google Ads API**
1. Go to **APIs & Services** → **Library**
2. Search for "Google Ads API"
3. Click **Enable**

##### **4. Add to SerpBear (Part 1)**
1. In SerpBear, go to **Settings** → **Integrations** → **Google Ads**
2. Under **Step 1: Connect Google Cloud Project**:
   - Paste your **Client ID**
   - Paste your **Client Secret**
3. Click **Authenticate Integration**
4. A new window opens → Sign in with Google
5. Grant permissions to SerpBear
6. Window should show "Google Ads Integrated Successfully!"
7. Close the window and return to SerpBear

---

#### **STEP 2: Connect Google Ads**

##### **1. Create/Access Google Ads Account**
1. Go to [Google Ads](https://ads.google.com/)
2. Sign in or create an account
3. **Important:** You can use a Test Account without spending money

##### **2. Get Developer Token**
1. In Google Ads, click **Tools & Settings** (wrench icon)
2. Under **Setup**, click **API Center**
3. Click **Apply for API Access**
4. Fill in the application:
   - API Usage: "Rank tracking and keyword research"
   - You'll likely get a **Test Account token** immediately (perfect for SerpBear!)
5. Copy your **Developer Token**

##### **3. Get Account ID**
1. In Google Ads, look at the top right corner
2. Your Account ID is the 10-digit number (format: XXX-XXX-XXXX)
3. Copy it

##### **4. Add to SerpBear (Part 2)**
1. In SerpBear Settings → **Google Ads**
2. Under **Step 2: Connect Google Ads**:
   - Paste your **Developer Token**
   - Paste your **Test Account ID**
3. Click **Test Google Ads Integration**
4. Wait for success message

##### **5. Update Keyword Volume (Optional)**
1. Under **Step 3: Update Keyword Volume Data**
2. Click **Update Keywords Volume Data**
3. This will fetch search volume for all your tracked keywords

✅ **Done!** You can now use keyword research features.

---

## 🎯 How to Use the Integrations

### **Using Search Console Data:**
1. Add domains and keywords in SerpBear
2. Go to **Keywords** view
3. You'll see additional columns:
   - **Visits** - Actual clicks from Google
   - **Impressions** - How many times it showed in search
   - **CTR** - Click-through rate
4. Click **Discovery** tab to find new keyword opportunities

### **Using Google Ads Data:**
1. Go to **Research** in the left menu
2. Enter seed keywords or use your website
3. SerpBear will generate keyword ideas with:
   - Monthly search volume
   - Competition level
   - Trending data
4. Add promising keywords to track with one click

---

## 🔧 Troubleshooting

### Search Console Issues:
- **"Search Console is not Integrated"** → Make sure you added the service account email to your property in GSC
- **No data showing** → Wait 24-48 hours, GSC data can be delayed
- **Permission denied** → Grant "Full" permissions in GSC, not just "Restricted"

### Google Ads Issues:
- **"redirect_uri_mismatch"** → Make sure the redirect URI in Google Cloud matches exactly: `http://localhost:3001/api/adwords`
- **Test integration fails** → Verify all 4 credentials are correct (Client ID, Secret, Dev Token, Account ID)
- **No volume data** → Test accounts have limited access, some keywords may not return data

---

## 📚 Additional Resources

- [SerpBear Docs - GSC Integration](https://docs.serpbear.com/miscellaneous/integrate-google-search-console)
- [SerpBear Docs - Google Ads Integration](https://docs.serpbear.com/miscellaneous/integrate-google-ads)
- [Google Search Console Help](https://support.google.com/webmasters)
- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)

---

## 💡 Pro Tips

1. **Use the same Google account** for GSC, Google Ads, and Google Cloud to avoid permission issues
2. **Test Account is free** - You don't need to spend money on Google Ads to use the API
3. **Service Account vs OAuth** - GSC uses Service Account (no browser auth), Google Ads uses OAuth (requires browser auth)
4. **Data freshness** - GSC data is typically 2-3 days old, this is normal
5. **API quotas** - Test accounts have lower quotas but are usually sufficient for keyword research
6. **Multiple domains** - You need to add the service account to EACH domain in GSC separately

---

## ✅ Quick Checklist

### Google Search Console:
- [ ] Google Cloud Project created
- [ ] Search Console API enabled
- [ ] Service Account created
- [ ] JSON key downloaded
- [ ] Service account email added to GSC property
- [ ] Credentials added to SerpBear settings

### Google Ads:
- [ ] OAuth credentials created
- [ ] Redirect URI configured
- [ ] Google Ads API enabled
- [ ] Client ID & Secret added to SerpBear
- [ ] Authenticated via browser popup
- [ ] Google Ads account created/accessed
- [ ] Developer Token obtained
- [ ] Account ID copied
- [ ] Developer Token & Account ID added to SerpBear
- [ ] Test integration successful

---

**Need Help?** Check the SerpBear documentation at https://docs.serpbear.com/ or open an issue on GitHub.
