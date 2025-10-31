# Fix WordPress Connection Test

## Issue Found

The WordPress connection test is failing with error: `siteUrl.replace is not a function`

### Root Cause

The `WordPressClient` class expects 3 separate parameters:
```javascript
new WordPressClient(siteUrl, username, password)
```

But the test endpoint is passing the entire client object:
```javascript
const wordpress = new WordPressClient(client); // ❌ Wrong!
```

The client object doesn't have the WordPress credentials loaded from the `.env` file.

---

## Solution

### Option 1: Add Helper Function to Load WordPress Credentials

Add this function after the `checkEnvFile()` function in `dashboard-server.js`:

```javascript
// Load WordPress credentials from .env file
function loadWordPressCredentials(clientId) {
  const envPath = path.join(__dirname, 'clients', `${clientId}.env`);
  
  if (!fs.existsSync(envPath)) {
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const credentials = {};
  
  // Parse .env file
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      credentials[key] = value;
    }
  });
  
  return {
    url: credentials.WORDPRESS_URL,
    username: credentials.WORDPRESS_USER,
    password: credentials.WORDPRESS_APP_PASSWORD
  };
}
```

### Option 2: Fix the Test Endpoint

Update the test endpoint (around line 3049):

```javascript
// Test WordPress connection
app.post('/api/wordpress/test/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const clients = loadClients();
    const client = clients[siteId];
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    
    // Load WordPress credentials from .env file
    const credentials = loadWordPressCredentials(siteId);
    
    if (!credentials) {
      return res.status(404).json({ 
        success: false, 
        error: 'WordPress credentials not found. Please configure .env file.' 
      });
    }
    
    // Create WordPress client with proper parameters
    const wordpress = new WordPressClient(
      credentials.url,
      credentials.username,
      credentials.password
    );
    
    const result = await wordpress.getPosts({ per_page: 1 });
    
    res.json({ 
      success: true, 
      connected: true,
      message: 'Connection successful',
      postsFound: result.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      connected: false,
      error: error.message 
    });
  }
});
```

### Option 3: Fix the Sync Endpoint

Update the sync endpoint (around line 3077):

```javascript
// Sync WordPress site data
app.post('/api/wordpress/sync/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const clients = loadClients();
    const client = clients[siteId];
    
    if (!client) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    
    // Load WordPress credentials from .env file
    const credentials = loadWordPressCredentials(siteId);
    
    if (!credentials) {
      return res.status(404).json({ 
        success: false, 
        error: 'WordPress credentials not found. Please configure .env file.' 
      });
    }
    
    // Create WordPress client with proper parameters
    const wordpress = new WordPressClient(
      credentials.url,
      credentials.username,
      credentials.password
    );
    
    const posts = await wordpress.getPosts({ per_page: 100 });
    
    res.json({ 
      success: true, 
      message: 'Sync completed',
      synced: posts.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Quick Fix Script

Save this as `fix-wordpress-connection-test.sh`:

```bash
#!/bin/bash

echo "=== Fixing WordPress Connection Test ==="

# Create backup
cp "/mnt/c/Users/abhis/projects/seo expert/dashboard-server.js" \
   "/mnt/c/Users/abhis/projects/seo expert/dashboard-server.js.backup"

echo "✅ Backup created"

# The fix needs to be applied manually due to the complexity
echo "⚠️  Manual fix required:"
echo ""
echo "1. Add loadWordPressCredentials() function"
echo "2. Update test endpoint to use credentials"
echo "3. Update sync endpoint to use credentials"
echo ""
echo "See FIX_WORDPRESS_CONNECTION_TEST.md for details"
```

---

## Alternative Quick Test

Test the connection manually via curl:

```bash
# Test Instant Auto Traders directly
curl -u "Claude:zIwkqwZOS3rdm3VDjDdiid9b" \
  https://instantautotraders.com.au/wp-json/wp/v2/posts?per_page=1

# If this works, the credentials are correct
# If it fails, there may be an issue with the WordPress site
```

---

## Temporary Workaround

Until the fix is applied, you can:

1. **Skip the connection test** for now
2. **Use the dashboard to add sites** - the add functionality works
3. **Manually verify** WordPress credentials using curl

---

## Files to Modify

1. **dashboard-server.js**
   - Add `loadWordPressCredentials()` function (line ~175)
   - Update `/api/wordpress/test/:siteId` endpoint (line ~3049)
   - Update `/api/wordpress/sync/:siteId` endpoint (line ~3077)

---

## Testing After Fix

```bash
# 1. Restart dashboard
pkill -f dashboard-server
node dashboard-server.js &

# 2. Test the connection
curl -X POST http://localhost:9000/api/wordpress/test/instantautotraders | jq .

# Expected output:
# {
#   "success": true,
#   "connected": true,
#   "message": "Connection successful",
#   "postsFound": 1
# }
```

---

## Status

- ✅ WordPress credentials found and configured
- ✅ Site showing in dashboard
- ⚠️ Connection test needs fix (known issue)
- ⚠️ Sync needs fix (known issue)
- ✅ Add new site works

**Impact**: Low - sites are configured and showing, just the test/sync buttons need fixing.
