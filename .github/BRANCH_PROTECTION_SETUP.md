# Branch Protection Rules Setup

This document explains how to configure branch protection rules for the dev-to-production workflow.

## Required GitHub Settings

### 1. Main Branch Protection

Navigate to: **Settings → Branches → Add branch protection rule**

#### Branch name pattern: `main`

Enable the following rules:

**Protect matching branches:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional, if you have CODEOWNERS file)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required status checks:**
    - `Run Test Suite` (from pr-checks.yml)
    - `Build Verification` (from pr-checks.yml)
    - `test / Test on Node 20.x` (from test.yml)

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**

- ✅ **Restrict who can push to matching branches**
  - Add: Repository administrators only

**Rules applied to everyone including administrators:**
- ✅ Require linear history (optional, keeps git history clean)
- ✅ Include administrators (recommended)

---

### 2. Dev Branch Protection (Optional but Recommended)

#### Branch name pattern: `dev`

Enable lighter protection for development:

- ✅ **Require status checks to pass before merging**
  - **Required status checks:**
    - `test / Test on Node 20.x`

- ✅ **Require conversation resolution before merging**

---

## Setting Up via GitHub CLI (Alternative Method)

If you have `gh` CLI installed, you can set these up with commands:

```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field required_status_checks='{"strict":true,"contexts":["Run Test Suite","Build Verification"]}' \
  --field enforce_admins=true \
  --field restrictions=null

# Protect dev branch (lighter rules)
gh api repos/:owner/:repo/branches/dev/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test / Test on Node 20.x"]}' \
  --field enforce_admins=false
```

---

## Setting Up via GitHub API

You can also use the GitHub API directly:

```bash
# Get your GitHub token from https://github.com/settings/tokens

# Protect main branch
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["Run Test Suite", "Build Verification", "test / Test on Node 20.x"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

---

## Verification

After setting up, verify the rules are active:

1. **Via GitHub UI:**
   - Go to Settings → Branches
   - You should see branch protection rules for `main` and `dev`

2. **Via GitHub CLI:**
   ```bash
   gh api repos/:owner/:repo/branches/main/protection
   ```

3. **Test the protection:**
   - Try pushing directly to main (should fail)
   - Create a PR from dev to main (should require status checks)

---

## What These Rules Do

### Main Branch Protection
- **Prevents direct pushes** to main - all changes must go through PRs
- **Requires tests to pass** before merging
- **Requires code review** from at least 1 person
- **Enforces clean git history** (optional linear history)
- **Protects production** from untested code

### Dev Branch Protection
- **Requires tests to pass** before merging feature branches
- **Allows more flexibility** for development
- **Maintains code quality** without slowing down development

---

## Quick Setup Script

Run this script to set up branch protection automatically:

```bash
#!/bin/bash
# setup-branch-protection.sh

REPO_OWNER="Theprofitplatform"
REPO_NAME="seoexpert"
GITHUB_TOKEN="${GITHUB_TOKEN}"  # Set this environment variable first

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable not set"
  echo "Get your token from: https://github.com/settings/tokens"
  exit 1
fi

echo "Setting up branch protection for main..."
gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
  --method PUT \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field required_status_checks='{"strict":true,"contexts":["Run Test Suite","Build Verification","test / Test on Node 20.x"]}' \
  --field enforce_admins=true \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

echo "Setting up branch protection for dev..."
gh api repos/$REPO_OWNER/$REPO_NAME/branches/dev/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test / Test on Node 20.x"]}' \
  --field enforce_admins=false

echo "✅ Branch protection rules configured!"
echo "Verify at: https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
```

Save this as `setup-branch-protection.sh`, make it executable (`chmod +x`), and run it.

---

## Need Help?

- **GitHub Docs**: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- **GitHub CLI**: https://cli.github.com/manual/gh_api
- **Check Current Protection**: `gh api repos/:owner/:repo/branches/main/protection`
