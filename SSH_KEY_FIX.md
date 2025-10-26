# SSH Key Fix for GitHub Actions

## Issue
GitHub Actions failed with: `Error loading key "(stdin)": error in libcrypto`

This means the SSH key wasn't pasted correctly in GitHub Secrets.

## Solution

### Step 1: Get the Correct Key
```bash
cat ~/.ssh/tpp_vps
```

Output (ALL 7 lines):
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACCQyH63HJAwwWgDSoxZgVdzgAWvuBIBQ0RP/D0m8yxwXwAAAJDOZU8KzmVP
CgAAAAtzc2gtZWQyNTUxOQAAACCQyH63HJAwwWgDSoxZgVdzgAWvuBIBQ0RP/D0m8yxwXw
AAAEBuekAPU8vPz0ONtKDTHfJTIiIkb3bmbSXg8bvqJRcvJpDIfrcckDDBaANKjFmBV3OA
Ba+4EgFDRE/8PSbzLHBfAAAAC3RwcC12cHMta2V5AQI=
-----END OPENSSH PRIVATE KEY-----
```

### Step 2: Update GitHub Secret

1. **Open GitHub Secrets:**
   https://github.com/Theprofitplatform/seoexpert/settings/secrets/actions

2. **Find VPS_SSH_KEY:**
   - Click the pencil icon next to `VPS_SSH_KEY`
   - OR delete it and click "New repository secret"

3. **Paste the Key:**
   - Name: `VPS_SSH_KEY`
   - Value: Paste ALL 7 lines (including `-----BEGIN` and `-----END` lines)
   - Make sure there are NO extra spaces before/after
   - Make sure all newlines are preserved

4. **Save:**
   - Click "Update secret" or "Add secret"

### Step 3: Re-run Deployment

**Option A: Via GitHub UI**
1. Go to: https://github.com/Theprofitplatform/seoexpert/actions
2. Click on the failed "Deploy to Production VPS" run
3. Click "Re-run all jobs"

**Option B: Push a new commit**
```bash
cd "/mnt/c/Users/abhis/projects/seo expert"
echo "# SSH key fixed" >> SSH_KEY_FIX.md
git add SSH_KEY_FIX.md
git commit -m "fix: update SSH key for deployment"
git push origin main
```

### Verification

Once the secret is updated correctly, you'll see:
- ✅ Tests pass (801 tests)
- ✅ SSH connection succeeds
- ✅ Deployment completes
- ✅ API health check passes

### Common Issues

**Issue:** Key still fails with libcrypto error
- **Solution:** Make sure you copied ALL 7 lines including BEGIN/END

**Issue:** Key format not recognized
- **Solution:** Don't add quotes around the key - paste it directly

**Issue:** Still getting authentication errors
- **Solution:** The key might have extra whitespace - try copying from terminal directly

---

**Key fingerprint:** `256 SHA256:XrA3+C46LkAbMdjs8RzBdLOEr6aXNTS0Cg7ookADWfI tpp-vps-key (ED25519)`

This is the correct fingerprint to verify your key.
# SSH key fixed via gh CLI
