#!/bin/bash
# Documentation Cleanup Script

# Move status/completion files to archive
mv *COMPLETE*.md docs/archive/ 2>/dev/null
mv *SUCCESS*.md docs/archive/ 2>/dev/null
mv *FIXED*.md docs/archive/ 2>/dev/null
mv *READY*.md docs/archive/ 2>/dev/null
mv *VERIFIED*.md docs/archive/ 2>/dev/null
mv *DONE*.md docs/archive/ 2>/dev/null
mv *STATUS*.md docs/archive/ 2>/dev/null

# Move guides to guides folder
mv *GUIDE*.md docs/guides/ 2>/dev/null
mv *QUICK_START*.md docs/guides/ 2>/dev/null
mv *WALKTHROUGH*.md docs/guides/ 2>/dev/null

# Move API docs
mv *API*.md docs/api/ 2>/dev/null

# Move deployment docs
mv *DEPLOY*.md docs/deployment/ 2>/dev/null
mv *DEPLOYMENT*.md docs/deployment/ 2>/dev/null
mv *CLOUDFLARE*.md docs/deployment/ 2>/dev/null
mv *VPS*.md docs/deployment/ 2>/dev/null

# Move reports
mv *REPORT*.md docs/reports/ 2>/dev/null
mv *SUMMARY*.md docs/reports/ 2>/dev/null
mv *ANALYSIS*.md docs/reports/ 2>/dev/null

# Move implementation docs
mv *IMPLEMENTATION*.md docs/reports/ 2>/dev/null
mv *UPGRADE*.md docs/reports/ 2>/dev/null

echo "Cleanup complete!"
echo "Files moved. Check docs/ directory."
