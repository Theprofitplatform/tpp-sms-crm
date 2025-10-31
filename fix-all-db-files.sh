#!/bin/bash
# Fix all database files to handle directory creation gracefully

cd ~/seo-automation/current/src/database

# Create a function to fix a database file
fix_db_file() {
  local file=$1
  echo "Fixing $file..."
  
  # Check if file already has mkdirSync
  if grep -q "mkdirSync" "$file"; then
    echo "  Already has mkdirSync, skipping..."
    return
  fi
  
  # Add mkdirSync import if not present
  if ! grep -q "import.*mkdirSync" "$file"; then
    sed -i '/import.*from.*fs/d' "$file"
    sed -i "3i import { mkdirSync } from 'fs';" "$file"
  fi
  
  # Find the line with "new Database" and wrap it
  sed -i '/^const db = new Database/,/);$/c\
let db;\
try {\
  const dbDir = path.dirname(dbPath);\
  mkdirSync(dbDir, { recursive: true });\
  db = new Database(dbPath);\
} catch (err) {\
  console.warn(`⚠️  Could not initialize ${dbPath}. Feature disabled.`);\
  console.warn("Error:", err.message);\
  db = {\
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),\
    exec: () => {}\
  };\
}' "$file"
  
  echo "  Done!"
}

# Fix goals-db.js
fix_db_file "goals-db.js"

echo "All database files fixed!"
