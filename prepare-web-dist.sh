#!/bin/bash
# Prepare SEO reports for Cloudflare Pages deployment
# Creates a static site structure from SEOAnalyst reports

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Preparing SEO Reports for Cloudflare Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Directories
SOURCE_DIR="/home/avi/projects/seoanalyst/seo-analyst-agent/web/static/reports"
DIST_DIR="/home/avi/projects/seo-expert/web-dist"

# Clean and create dist directory
echo "🧹 Cleaning dist directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy all reports
echo "📋 Copying reports..."
if [ -d "$SOURCE_DIR" ]; then
    cp -r "$SOURCE_DIR"/* "$DIST_DIR/"
    echo "  ✅ Reports copied"
else
    echo "  ⚠️  Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Create a simple index.html redirect if one doesn't exist
if [ ! -f "$DIST_DIR/index.html" ]; then
    echo "📄 Creating root redirect..."
    cat > "$DIST_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=/report/">
    <title>SEO Reports - The Profit Platform</title>
</head>
<body>
    <p>Redirecting to <a href="/report/">SEO Reports</a>...</p>
</body>
</html>
EOF
    echo "  ✅ Root redirect created"
fi

# Create _headers file for Cloudflare Pages
echo "📝 Creating _headers configuration..."
cat > "$DIST_DIR/_headers" << 'EOF'
# Cloudflare Pages Headers Configuration
# Cache HTML reports for 1 hour, other assets for 1 day

/*.html
  Cache-Control: public, max-age=3600
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block

/*
  Cache-Control: public, max-age=86400
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
EOF
echo "  ✅ Headers created"

# Create _routes.json for Cloudflare Pages routing
echo "📝 Creating _routes.json..."
cat > "$DIST_DIR/_routes.json" << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
EOF
echo "  ✅ Routes created"

# Create _redirects file
echo "📝 Creating _redirects..."
cat > "$DIST_DIR/_redirects" << 'EOF'
# Redirects for Cloudflare Pages

# Root to reports
/  /report/  302

# Legacy paths (if any)
/reports/*  /report/:splat  301
EOF
echo "  ✅ Redirects created"

# Count files
REPORT_COUNT=$(find "$DIST_DIR" -name "audit-*.html" | wc -l)
TOTAL_FILES=$(find "$DIST_DIR" -type f | wc -l)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Preparation Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📊 Reports: $REPORT_COUNT"
echo "  📁 Total files: $TOTAL_FILES"
echo "  📂 Dist directory: $DIST_DIR"
echo ""
echo "  Ready for Cloudflare Pages deployment!"
echo ""
