# Google Service Account Security Setup

## Current Status
✅ Service account credentials are protected in `.gitignore`
✅ Template file created at `service-account.json.example`
✅ No credentials in git history (verified)

---

## 🔐 Setup Instructions

### 1. Copy the template
```bash
cp config/google/service-account.json.example config/google/service-account.json
```

### 2. Add your credentials
Edit `config/google/service-account.json` with your actual Google Cloud service account credentials.

**Never commit this file to git!**

---

## 🔄 Key Rotation Process

### When to Rotate
- **Immediately** if the key was ever committed to a public repository
- Every 90 days as a security best practice
- If you suspect the key has been compromised
- When team members with access leave

### How to Rotate the Key

#### Step 1: Create a New Service Account Key
```bash
# Using gcloud CLI
gcloud iam service-accounts keys create new-key.json \
  --iam-account=seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
```

Or via Google Cloud Console:
1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Select project: `robotic-goal-456009-r2`
3. Find service account: `seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com`
4. Click "Keys" tab → "Add Key" → "Create new key" → "JSON"
5. Download and save as `config/google/service-account.json`

#### Step 2: Test the New Key
```bash
# Test with your application
npm run test:gsc  # or your test command
```

#### Step 3: Delete the Old Key
```bash
# Using gcloud CLI
gcloud iam service-accounts keys delete 6dd460ff8327709eac4810b55e6a2d4f5a6ec17b \
  --iam-account=seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
```

Or via Console:
1. Go to the service account keys page
2. Find the old key ID: `6dd460ff8327709eac4810b55e6a2d4f5a6ec17b`
3. Click ⋮ → Delete

---

## 🌍 Environment-Based Credential Management

### Option 1: Environment Variables (Recommended for Production)

#### Setup
```bash
# In your .env file
GOOGLE_SERVICE_ACCOUNT_EMAIL=seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=robotic-goal-456009-r2
```

#### Code Update
```javascript
// Instead of reading the JSON file
const credentials = {
  type: 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  // ... other fields
};

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});
```

### Option 2: Google Cloud Secret Manager (Best for Production)

```bash
# Store the service account key
gcloud secrets create service-account-key \
  --data-file=config/google/service-account.json \
  --replication-policy="automatic"

# Grant access to your service account
gcloud secrets add-iam-policy-binding service-account-key \
  --member="serviceAccount:seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

```javascript
// Retrieve in code
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getServiceAccountKey() {
  const [version] = await client.accessSecretVersion({
    name: 'projects/robotic-goal-456009-r2/secrets/service-account-key/versions/latest',
  });
  return JSON.parse(version.payload.data.toString());
}
```

### Option 3: Workload Identity (For Kubernetes/GKE)

If running on GKE, use Workload Identity instead of service account keys:

```bash
# Bind Kubernetes service account to Google service account
gcloud iam service-accounts add-iam-policy-binding \
  seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:robotic-goal-456009-r2.svc.id.goog[NAMESPACE/KSA_NAME]"
```

---

## 🛡️ Security Best Practices

### Do's ✅
- ✅ Keep service account keys in `.gitignore`
- ✅ Use environment variables for production
- ✅ Rotate keys every 90 days
- ✅ Use Secret Manager for cloud deployments
- ✅ Grant minimum required permissions (principle of least privilege)
- ✅ Monitor service account usage in Cloud Console

### Don'ts ❌
- ❌ Never commit service account keys to git
- ❌ Never share keys via email or chat
- ❌ Never store keys in public repositories
- ❌ Never use the same key across multiple environments
- ❌ Never keep keys in plain text on production servers

---

## 📊 Current Service Account Details

**Project:** robotic-goal-456009-r2
**Service Account:** seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com
**Current Key ID:** 6dd460ff8327709eac4810b55e6a2d4f5a6ec17b
**Scopes Required:**
- `https://www.googleapis.com/auth/webmasters.readonly` (Google Search Console)

---

## 🔍 Verify Setup

```bash
# Check if file is properly ignored
git check-ignore config/google/service-account.json
# Should output: config/google/service-account.json

# Verify file exists but is not tracked
ls -la config/google/service-account.json
git status config/google/service-account.json
# Should show as "untracked"

# Test Google Cloud authentication
gcloud auth activate-service-account \
  --key-file=config/google/service-account.json
```

---

## 📞 Emergency Response

### If Key is Compromised
1. **Immediately disable the key** in Google Cloud Console
2. Create a new key following the rotation process above
3. Update all applications using the old key
4. Review Cloud Audit Logs for unauthorized access
5. Consider rotating other credentials that may have been exposed

### Audit Logs
Check recent activity:
```bash
gcloud logging read "protoPayload.authenticationInfo.principalEmail=seo-analyst-automation@robotic-goal-456009-r2.iam.gserviceaccount.com" \
  --limit 50 \
  --format json
```

---

## 📚 Additional Resources

- [Google Cloud Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Managing Service Account Keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)

---

**Last Updated:** 2025-11-02
**Status:** ✅ Secure - No credentials in version control
