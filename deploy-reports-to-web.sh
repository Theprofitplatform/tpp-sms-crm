#!/bin/bash

# Deploy SEO Audit Reports to Web Interface
# Copies reports from seo-expert to seoanalyst web interface
# Reports accessible at: https://seo.theprofitplatform.com.au/report

set -e

SOURCE_DIR="/home/avi/projects/seo-expert/logs/clients"
TARGET_DIR="/home/avi/projects/seoanalyst/seo-analyst-agent/web/static/reports"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Deploying SEO Audit Reports to Web Interface"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Source directory not found: $SOURCE_DIR"
  exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Count reports
REPORT_COUNT=$(find "$SOURCE_DIR" -name "audit-*.html" | wc -l)

if [ $REPORT_COUNT -eq 0 ]; then
  echo "⚠️  No audit reports found"
  exit 0
fi

echo "Found $REPORT_COUNT audit report(s)"
echo ""

# Copy reports with organized structure
COPIED=0

for client_dir in "$SOURCE_DIR"/*; do
  if [ -d "$client_dir" ]; then
    CLIENT_NAME=$(basename "$client_dir")

    # Create client subdirectory in target
    mkdir -p "$TARGET_DIR/$CLIENT_NAME"

    # Copy all HTML reports for this client
    for report in "$client_dir"/audit-*.html; do
      if [ -f "$report" ]; then
        REPORT_NAME=$(basename "$report")
        cp "$report" "$TARGET_DIR/$CLIENT_NAME/"
        echo "  ✅ Deployed: $CLIENT_NAME/$REPORT_NAME"
        COPIED=$((COPIED + 1))
      fi
    done
  fi
done

echo ""

# Generate index.html for reports
cat > "$TARGET_DIR/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Audit Reports - The Profit Platform</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            padding: 40px;
            border-radius: 15px 15px 0 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: #667eea;
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header p {
            color: #666;
            font-size: 16px;
        }

        .content {
            background: white;
            padding: 40px;
            border-radius: 0 0 15px 15px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-top: 2px;
        }

        .client-section {
            margin-bottom: 40px;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 5px solid #667eea;
        }

        .client-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .reports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .report-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .report-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .report-card h3 {
            color: #667eea;
            font-size: 18px;
            margin-bottom: 10px;
        }

        .report-card .date {
            color: #666;
            font-size: 14px;
            margin-bottom: 15px;
        }

        .report-card .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 500;
            transition: opacity 0.2s;
        }

        .report-card .btn:hover {
            opacity: 0.9;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            text-align: center;
        }

        .stat-card .number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .stat-card .label {
            font-size: 14px;
            opacity: 0.9;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }

        .empty-state svg {
            width: 100px;
            height: 100px;
            margin-bottom: 20px;
            opacity: 0.3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SEO Audit Reports</h1>
            <p>Comprehensive SEO analysis reports for all clients</p>
        </div>

        <div class="content">
            <div class="stats" id="stats">
                <!-- Stats will be populated by JavaScript -->
            </div>

            <div id="reports">
                <!-- Reports will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        // Fetch reports structure
        fetch(window.location.pathname + '/list')
            .then(res => res.json())
            .then(data => {
                renderStats(data);
                renderReports(data);
            })
            .catch(err => {
                console.error('Error loading reports:', err);
                document.getElementById('reports').innerHTML =
                    '<div class="empty-state">' +
                    '<p>Error loading reports. Please try again later.</p>' +
                    '</div>';
            });

        function renderStats(data) {
            const statsHtml = `
                <div class="stat-card">
                    <div class="number">${data.total_clients || 0}</div>
                    <div class="label">Active Clients</div>
                </div>
                <div class="stat-card">
                    <div class="number">${data.total_reports || 0}</div>
                    <div class="label">Total Reports</div>
                </div>
                <div class="stat-card">
                    <div class="number">${data.latest_date || 'N/A'}</div>
                    <div class="label">Latest Audit</div>
                </div>
            `;
            document.getElementById('stats').innerHTML = statsHtml;
        }

        function renderReports(data) {
            if (!data.clients || Object.keys(data.clients).length === 0) {
                document.getElementById('reports').innerHTML =
                    '<div class="empty-state">' +
                    '<p>No reports available yet.</p>' +
                    '</div>';
                return;
            }

            let html = '';
            for (const [clientName, reports] of Object.entries(data.clients)) {
                html += `
                    <div class="client-section">
                        <h2>${clientName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
                        <div class="reports-grid">
                `;

                reports.forEach(report => {
                    const date = report.date || report.name.match(/audit-(\d{4}-\d{2}-\d{2})/)?.[1] || 'Unknown';
                    html += `
                        <div class="report-card">
                            <h3>SEO Audit Report</h3>
                            <div class="date">📅 ${date}</div>
                            <a href="${report.url}" class="btn" target="_blank">View Report →</a>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }

            document.getElementById('reports').innerHTML = html;
        }
    </script>
</body>
</html>
EOF

echo "  ✅ Generated index.html"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📊 Deployed: $COPIED report(s)"
echo "  🌐 URL: https://seo.theprofitplatform.com.au/report"
echo ""
echo "  View reports:"
for client_dir in "$SOURCE_DIR"/*; do
  if [ -d "$client_dir" ]; then
    CLIENT_NAME=$(basename "$client_dir")
    LATEST=$(ls -t "$client_dir"/audit-*.html 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      REPORT_NAME=$(basename "$LATEST")
      echo "    • https://seo.theprofitplatform.com.au/report/$CLIENT_NAME/$REPORT_NAME"
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
