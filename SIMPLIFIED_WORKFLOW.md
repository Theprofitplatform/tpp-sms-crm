# 🎯 Simplified Git Workflow

**Date:** October 29, 2025
**Status:** ✅ Active

---

## 📝 Overview

**We've simplified to ONE branch:** `main`

- ✅ All development happens on `main`
- ✅ Production deploys from `main`
- ✅ Production releases tracked with tags (e.g., `v2.1.0`)
- ✅ No more confusion between branches!

---

## 🚀 Daily Workflow

### **1. Make Changes**
```bash
# Work normally
# Edit files, add features, fix bugs
```

### **2. Commit Changes**
```bash
git add .
git commit -m "feat: your feature description"
```

### **3. Push to GitHub**
```bash
git push origin main
```

### **4. Deploy to Production** (when ready)
```bash
# Option A: Use deployment script
./deploy-to-tpp-vps.sh

# Option B: Manual deploy
# (whatever your production deployment process is)
```

### **5. Tag Production Releases**
```bash
# After successful production deployment
git tag -a v2.x.x -m "Production release description"
git push origin v2.x.x
```

---

## 🏷️ Version Tags

Production releases are tracked with tags:

```bash
# Current production releases
v2.0.0  - Initial production release
v2.1.0  - Auto-fix change history + activity log enhancements

# Create new tag for next release
git tag -a v2.2.0 -m "Your release description"
git push origin v2.2.0
```

---

## 📦 What Happened to the VPS Branch?

### **Before (Confusing):**
```
main (development)  ──→  Make changes here
  ↓
  ↓ (manual merge/push)
  ↓
vps (production)    ──→  Deploy from here
```

### **Now (Simple):**
```
main  ──→  Make changes, commit, push
  ↓
  ↓ (direct deploy)
  ↓
Production  ──→  Deploy directly from main
  ↓
  ↓ (create tag after deploy)
  ↓
v2.x.x tag  ──→  Marks what's in production
```

### **VPS Branch Status:**
- ✅ Still exists (for reference)
- ✅ Currently synced with main
- ⚠️ **Not actively used anymore**
- 💡 You can delete it if you want (optional)

---

## 🛠️ Common Tasks

### **See What's in Production**
```bash
# View production tags
git tag -l

# See what's in latest production release
git show v2.1.0
```

### **Rollback Production** (if needed)
```bash
# Checkout previous tag
git checkout v2.0.0

# Create a rollback branch
git checkout -b rollback-to-v2.0.0

# Deploy this version
```

### **Check Git Status**
```bash
git status
git log --oneline -10
```

---

## 🎯 Benefits of This Workflow

### **Simpler:**
- ✅ Only one branch to manage
- ✅ No confusing merges between branches
- ✅ Clear linear history

### **Clearer:**
- ✅ Tags show exactly what's in production
- ✅ Easy to see production history
- ✅ Easy to rollback if needed

### **Faster:**
- ✅ No branch switching
- ✅ Direct push to main
- ✅ Faster deployments

---

## 📋 Quick Reference

### **Daily Commands:**
```bash
# 1. Make changes
# (edit files)

# 2. Stage and commit
git add .
git commit -m "feat: description"

# 3. Push
git push origin main

# 4. Deploy (when ready)
./deploy-to-tpp-vps.sh

# 5. Tag production (after successful deploy)
git tag -a v2.2.0 -m "Release notes"
git push origin v2.2.0
```

### **Check Status:**
```bash
# What branch am I on?
git branch

# What's changed?
git status

# What's committed?
git log --oneline -5

# What's in production?
git tag -l
```

---

## 🔄 Migration Complete

### **What We Did:**
1. ✅ Synced main and vps branches (both at commit `3ff2cd3`)
2. ✅ Created production tag `v2.1.0`
3. ✅ Updated workflow to use only main
4. ✅ Documented new process

### **Current State:**
```
main:    3ff2cd35... (latest code)
vps:     3ff2cd35... (same as main, not actively used)
v2.1.0:  3ff2cd35... (production tag)
```

---

## 🤔 When to Create Tags

Create a new tag when you:
- ✅ Deploy to production
- ✅ Release a new version to users
- ✅ Want to mark a stable point

**Example:**
```bash
# After deploying new features
git tag -a v2.2.0 -m "feat: keyword tracking enhancements"
git push origin v2.2.0
```

---

## ⚠️ Optional: Delete VPS Branch

If you want to fully clean up:

```bash
# Delete local vps branch
git branch -d vps

# Delete remote vps branch
git push origin --delete vps
```

**Note:** Only do this if you're sure you don't need it!

---

## 🎓 Git Basics Reminder

### **Your Standard Workflow:**
```bash
# 1. Check status
git status

# 2. Add changes
git add .

# 3. Commit with message
git commit -m "your message"

# 4. Push to GitHub
git push origin main
```

### **If You Need to Pull First:**
```bash
# Get latest from GitHub
git pull origin main

# Then push your changes
git push origin main
```

---

## 📞 Need Help?

### **Common Issues:**

**"Push rejected"**
```bash
# Solution: Pull first, then push
git pull origin main
git push origin main
```

**"Want to undo last commit"**
```bash
# Undo commit but keep changes
git reset --soft HEAD~1
```

**"Want to see what changed"**
```bash
# See changes since last commit
git diff

# See commit history
git log --oneline -10
```

---

## 🎉 Summary

### **Old Way (2 branches):**
- main → develop
- vps → production
- Confusing merges and syncing

### **New Way (1 branch + tags):**
- main → everything
- tags → mark production releases
- Simple and clear!

**You're now working with a simplified, single-branch workflow!** 🚀

---

## 📚 Further Reading

### **If You Want to Learn More:**

**Git Tags:**
- https://git-scm.com/book/en/v2/Git-Basics-Tagging

**Git Workflow:**
- https://www.atlassian.com/git/tutorials/comparing-workflows

**For Now:**
Just use the commands in this guide and you'll be fine! 👍

---

*Last Updated: October 29, 2025*
*Status: ✅ Active Workflow*
