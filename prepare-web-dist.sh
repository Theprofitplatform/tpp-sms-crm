#!/bin/bash
# Prepare SEO reports for Cloudflare Pages deployment
# Creates a static site structure from client audit reports

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Preparing SEO Reports for Cloudflare Pages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Directories
CLIENTS_DIR="logs/clients"
DIST_DIR="web-dist"

# Clean and create dist directory
echo "🧹 Cleaning dist directory..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy client reports and create symlinks
echo "📋 Copying reports..."
if [ -d "$CLIENTS_DIR" ]; then
    # Copy each client's reports directory
    for client_dir in "$CLIENTS_DIR"/*; do
        if [ -d "$client_dir" ]; then
            client_name=$(basename "$client_dir")
            mkdir -p "$DIST_DIR/$client_name"
            cp "$client_dir"/*.html "$DIST_DIR/$client_name/" 2>/dev/null || true

            # Create latest.html symlink to most recent report
            latest_report=$(ls -t "$client_dir"/*.html 2>/dev/null | head -1)
            if [ -n "$latest_report" ]; then
                report_name=$(basename "$latest_report")
                (cd "$DIST_DIR/$client_name" && ln -sf "$report_name" latest.html)
                echo "  ✅ Copied reports for $client_name (latest: $report_name)"
            else
                echo "  ⚠️  No reports found for $client_name"
            fi
        fi
    done
else
    echo "  ⚠️  Source directory not found: $CLIENTS_DIR"
    exit 1
fi

# Generate metadata.json
echo "📊 Generating metadata..."
./generate-metadata.sh 2>/dev/null || echo "  ⚠️  Using fallback metadata"

# Create dashboard index.html
echo "📄 Creating dashboard..."
cat > "$DIST_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Reports Dashboard - The Profit Platform</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 { font-size: clamp(2em, 5vw, 3em); margin-bottom: 10px; }
        .header p { font-size: clamp(1em, 2.5vw, 1.2em); opacity: 0.9; }
        .stats-summary {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            color: white;
            text-align: center;
        }
        .stat-item h3 { font-size: 2em; margin-bottom: 5px; }
        .stat-item p { opacity: 0.9; font-size: 0.9em; }
        .clients-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        .client-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s, box-shadow 0.3s;
            cursor: pointer;
            position: relative;
        }
        .client-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        .client-card.expanded {
            transform: none;
        }
        .expand-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #f3f4f6;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 1.2em;
        }
        .expand-toggle:hover {
            background: #e5e7eb;
            transform: scale(1.1);
        }
        .client-details {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .client-details.expanded {
            max-height: 500px;
            transition: max-height 0.4s ease-in;
        }
        .details-content {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #f3f4f6;
        }
        .details-section {
            margin-bottom: 15px;
        }
        .details-section h4 {
            color: #667eea;
            font-size: 0.9em;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .details-section p {
            color: #666;
            font-size: 0.9em;
            line-height: 1.5;
            margin: 5px 0;
        }
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .action-btn {
            flex: 1;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            text-decoration: none;
            font-size: 0.85em;
            font-weight: 600;
            transition: opacity 0.3s;
        }
        .action-btn:hover {
            opacity: 0.8;
        }
        .action-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .action-btn-secondary {
            background: #f3f4f6;
            color: #667eea;
        }
        .client-card h2 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.5em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .client-card p {
            color: #666;
            margin-bottom: 15px;
            font-size: 0.95em;
        }
        .score-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 15px;
        }
        .score-excellent { background: #d1fae5; color: #065f46; }
        .score-good { background: #dbeafe; color: #1e40af; }
        .score-warning { background: #fef3c7; color: #92400e; }
        .score-poor { background: #fee2e2; color: #991b1b; }
        .client-stats {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #666;
        }
        .view-report {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: opacity 0.3s;
        }
        .view-report:hover {
            opacity: 0.9;
        }
        .last-updated {
            text-align: center;
            color: white;
            margin-top: 30px;
            opacity: 0.8;
            font-size: 0.9em;
        }
        .controls {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .search-box {
            flex: 1;
            min-width: 250px;
        }
        .search-box input {
            width: 100%;
            padding: 12px 20px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .search-box input:focus {
            outline: none;
            border-color: #667eea;
        }
        .filter-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .filter-group select {
            padding: 10px 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
        }
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .chart-container h3 {
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        canvas {
            max-height: 300px;
        }
        .client-card.hidden {
            display: none;
        }
        .no-results {
            text-align: center;
            color: white;
            padding: 40px;
            font-size: 1.2em;
            display: none;
        }
        .no-results.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SEO Reports Dashboard</h1>
            <p>The Profit Platform - Client Reports</p>
        </div>

        <div class="controls">
            <div class="search-box">
                <input type="text" id="search-input" placeholder="🔍 Search clients...">
            </div>
            <div class="filter-group">
                <label style="color: #666; font-weight: 600;">Score:</label>
                <select id="score-filter">
                    <option value="all">All Scores</option>
                    <option value="excellent">85-100 (Excellent)</option>
                    <option value="good">70-84 (Good)</option>
                    <option value="warning">50-69 (Needs Work)</option>
                    <option value="poor">0-49 (Critical)</option>
                </select>
            </div>
            <div class="filter-group">
                <label style="color: #666; font-weight: 600;">Sort:</label>
                <select id="sort-by">
                    <option value="name">Name</option>
                    <option value="score-desc">Score (High-Low)</option>
                    <option value="score-asc">Score (Low-High)</option>
                    <option value="issues-desc">Issues (Most)</option>
                    <option value="issues-asc">Issues (Least)</option>
                </select>
            </div>
        </div>

        <div class="stats-summary">
            <div class="stat-item">
                <h3 id="total-clients">-</h3>
                <p>Total Clients</p>
            </div>
            <div class="stat-item">
                <h3 id="avg-score">-</h3>
                <p>Average Score</p>
            </div>
            <div class="stat-item">
                <h3 id="total-issues">-</h3>
                <p>Total Issues</p>
            </div>
            <div class="stat-item">
                <h3 id="total-posts">-</h3>
                <p>Posts Audited</p>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container">
                <h3>📊 Client Scores Comparison</h3>
                <canvas id="scores-chart"></canvas>
            </div>
            <div class="chart-container">
                <h3>⚠️ Issues Breakdown</h3>
                <canvas id="issues-chart"></canvas>
            </div>
        </div>

        <div class="clients-grid" id="clients-grid">
            <!-- Dynamically loaded -->
        </div>

        <div class="no-results" id="no-results">
            No clients match your search criteria
        </div>

        <div class="last-updated">
            Last updated: <span id="last-updated">-</span>
        </div>
    </div>

    <script>
        let allClients = [];
        let scoresChart, issuesChart;

        // Toggle card expansion
        function toggleCard(button) {
            const card = button.closest('.client-card');
            const details = card.querySelector('.client-details');
            const isExpanded = details.classList.contains('expanded');

            // Close all other cards first
            document.querySelectorAll('.client-card').forEach(c => {
                c.classList.remove('expanded');
                c.querySelector('.client-details').classList.remove('expanded');
                c.querySelector('.expand-toggle').textContent = '▼';
            });

            // Toggle current card
            if (!isExpanded) {
                card.classList.add('expanded');
                details.classList.add('expanded');
                button.textContent = '▲';
            }
        }

        function createCharts(clients) {
            // Scores Bar Chart
            const scoresCtx = document.getElementById('scores-chart').getContext('2d');
            const scores = clients.map(c => c.score);
            const names = clients.map(c => c.name);

            if (scoresChart) scoresChart.destroy();
            scoresChart = new Chart(scoresCtx, {
                type: 'bar',
                data: {
                    labels: names,
                    datasets: [{
                        label: 'SEO Score',
                        data: scores,
                        backgroundColor: scores.map(s =>
                            s >= 85 ? '#10b981' :
                            s >= 70 ? '#3b82f6' :
                            s >= 50 ? '#f59e0b' : '#ef4444'
                        ),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });

            // Issues Pie Chart
            const issuesCtx = document.getElementById('issues-chart').getContext('2d');
            const totalIssues = clients.reduce((sum, c) => sum + c.issues, 0);
            const clientIssues = clients.map(c => c.issues);

            if (issuesChart) issuesChart.destroy();
            issuesChart = new Chart(issuesCtx, {
                type: 'doughnut',
                data: {
                    labels: names,
                    datasets: [{
                        data: clientIssues,
                        backgroundColor: [
                            '#667eea',
                            '#764ba2',
                            '#f59e0b',
                            '#10b981',
                            '#ef4444'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        function filterAndSortClients() {
            const searchTerm = document.getElementById('search-input').value.toLowerCase();
            const scoreFilter = document.getElementById('score-filter').value;
            const sortBy = document.getElementById('sort-by').value;

            // Filter
            let filtered = allClients.filter(client => {
                const matchesSearch = client.name.toLowerCase().includes(searchTerm);

                let matchesScore = true;
                if (scoreFilter !== 'all') {
                    if (scoreFilter === 'excellent') matchesScore = client.score >= 85;
                    else if (scoreFilter === 'good') matchesScore = client.score >= 70 && client.score < 85;
                    else if (scoreFilter === 'warning') matchesScore = client.score >= 50 && client.score < 70;
                    else if (scoreFilter === 'poor') matchesScore = client.score < 50;
                }

                return matchesSearch && matchesScore;
            });

            // Sort
            filtered.sort((a, b) => {
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                if (sortBy === 'score-desc') return b.score - a.score;
                if (sortBy === 'score-asc') return a.score - b.score;
                if (sortBy === 'issues-desc') return b.issues - a.issues;
                if (sortBy === 'issues-asc') return a.issues - b.issues;
                return 0;
            });

            // Update display
            const grid = document.getElementById('clients-grid');
            const noResults = document.getElementById('no-results');

            if (filtered.length === 0) {
                grid.style.display = 'none';
                noResults.classList.add('show');
            } else {
                grid.style.display = 'grid';
                noResults.classList.remove('show');

                // Clear and rebuild
                grid.innerHTML = '';
                filtered.forEach(client => {
                    const scoreClass = client.score >= 85 ? 'excellent'
                        : client.score >= 70 ? 'good'
                        : client.score >= 50 ? 'warning' : 'poor';

                    const card = document.createElement('div');
                    card.className = 'client-card';
                    card.innerHTML = '<button class="expand-toggle" onclick="event.stopPropagation(); toggleCard(this)">▼</button>' +
                        '<h2>' + client.name + '</h2>' +
                        '<div class="score-badge score-' + scoreClass + '">' +
                            client.score + '/100' +
                        '</div>' +
                        '<div class="client-stats">' +
                            '<span>📄 ' + client.posts + ' posts</span>' +
                            '<span>⚠️ ' + client.issues + ' issues</span>' +
                        '</div>' +
                        '<div class="client-details">' +
                            '<div class="details-content">' +
                                '<div class="details-section">' +
                                    '<h4>📊 Issues Summary</h4>' +
                                    '<p>⚠️ Total Issues: ' + client.issues + '</p>' +
                                    '<p>📝 Posts Analyzed: ' + client.posts + '</p>' +
                                    '<p>🎯 Score: ' + client.score + '/100 (' + scoreClass.charAt(0).toUpperCase() + scoreClass.slice(1) + ')</p>' +
                                '</div>' +
                                '<div class="details-section">' +
                                    '<h4>🕒 Last Updated</h4>' +
                                    '<p>' + new Date().toLocaleDateString() + '</p>' +
                                '</div>' +
                                '<div class="action-buttons">' +
                                    '<a href="/' + client.id + '/latest.html" class="action-btn action-btn-primary" onclick="event.stopPropagation()">View Full Report →</a>' +
                                    '<a href="/' + client.id + '/" class="action-btn action-btn-secondary" onclick="event.stopPropagation()">All Reports</a>' +
                                '</div>' +
                            '</div>' +
                        '</div>';

                    // Add click handler to card
                    card.onclick = function() {
                        toggleCard(this.querySelector('.expand-toggle'));
                    };

                    grid.appendChild(card);
                });
            }

            // Update stats
            const totalClients = filtered.length;
            const avgScore = filtered.length > 0
                ? Math.round(filtered.reduce((sum, c) => sum + c.score, 0) / filtered.length)
                : 0;
            const totalIssues = filtered.reduce((sum, c) => sum + c.issues, 0);
            const totalPosts = filtered.reduce((sum, c) => sum + c.posts, 0);

            document.getElementById('total-clients').textContent = totalClients;
            document.getElementById('avg-score').textContent = avgScore + '/100';
            document.getElementById('total-issues').textContent = totalIssues;
            document.getElementById('total-posts').textContent = totalPosts;
        }

        // Load metadata and generate dashboard
        fetch('/metadata.json')
            .then(res => res.json())
            .then(data => {
                allClients = data.clients || [];

                // Create charts
                createCharts(allClients);

                // Initial display
                filterAndSortClients();

                // Update last updated time
                const lastUpdated = new Date(data.generated);
                document.getElementById('last-updated').textContent = lastUpdated.toLocaleString();

                // Add event listeners
                document.getElementById('search-input').addEventListener('input', filterAndSortClients);
                document.getElementById('score-filter').addEventListener('change', filterAndSortClients);
                document.getElementById('sort-by').addEventListener('change', filterAndSortClients);
            })
            .catch(err => {
                console.error('Error loading metadata:', err);
                document.getElementById('clients-grid').innerHTML =
                    '<p style="color: white; text-align: center;">Error loading reports. Please try again later.</p>';
            });
    </script>
</body>
</html>
EOF
echo "  ✅ Dashboard created"

# Create _headers file for Cloudflare Pages
echo "📝 Creating _headers configuration..."
cat > "$DIST_DIR/_headers" << 'EOF'
# Cloudflare Pages Headers Configuration
# Cache HTML reports for 5 minutes to allow quick updates

/*.html
  Cache-Control: public, max-age=300
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block

/metadata.json
  Cache-Control: public, max-age=300
  Content-Type: application/json

/*
  Cache-Control: public, max-age=3600
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

# Legacy paths (if any)
/report/*  /:splat  301
/reports/*  /:splat  301
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
