#!/bin/bash

# Documentation Consolidation Script
# Moves old/duplicate docs to archive

echo "📚 DOCUMENTATION CONSOLIDATION"
echo "================================"
echo ""

# Essential docs to KEEP in root
KEEP_DOCS=(
  "README.md"
  "CHANGELOG.md"
  "CONTRIBUTING.md"
  "MASTER_FIX_PLAN.md"
  "PHASE_1_DISCOVERY_REPORT.md"
  "INTEGRATION_STATUS_REPORT.json"
)

# Create archive directory
mkdir -p docs/archive

# Count total .md files
TOTAL=$(ls -1 *.md 2>/dev/null | wc -l)
echo "📄 Found $TOTAL markdown files in root"
echo ""

# Move files to archive (except essential ones)
MOVED=0
for file in *.md; do
  # Skip if file doesn't exist
  [ -f "$file" ] || continue

  # Check if file is in keep list
  KEEP=false
  for keep in "${KEEP_DOCS[@]}"; do
    if [ "$file" == "$keep" ]; then
      KEEP=true
      break
    fi
  done

  # Move to archive if not essential
  if [ "$KEEP" == "false" ]; then
    echo "📦 Archiving: $file"
    mv "$file" "docs/archive/"
    ((MOVED++))
  else
    echo "✅ Keeping: $file"
  fi
done

echo ""
echo "================================"
echo "✅ Consolidation complete!"
echo "   Kept: ${#KEEP_DOCS[@]} essential docs"
echo "   Archived: $MOVED old docs"
echo "   Archive location: docs/archive/"
echo ""
echo "📋 Next: Create missing essential docs"
