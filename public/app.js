// Global state
let dashboardData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupNavigation();
});

// Setup navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);

            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Show specific page
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');

        // Load page-specific data
        if (pageName === 'reports') {
            loadReports();
        } else if (pageName === 'docs') {
            loadDocs();
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();

        if (data.success) {
            dashboardData = data;
            updateStats(data.stats);
            updateClientsList(data.clients);
            updateOverviewClients(data.clients);
        } else {
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        showError('Error loading dashboard: ' + error.message);
    }
}

// Refresh data
function refreshData() {
    loadDashboardData();
    showNotification('Data refreshed');
}

// Update stats
function updateStats(stats) {
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-active').textContent = stats.active;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-configured').textContent = stats.configured;
}

// Update clients list
function updateClientsList(clients) {
    const container = document.getElementById('clients-list');

    if (!clients || clients.length === 0) {
        container.innerHTML = '<p class="text-secondary">No clients configured yet.</p>';
        return;
    }

    container.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div>
                    <div class="client-name">${client.name}</div>
                    <div class="client-url">${client.url}</div>
                </div>
                <div class="client-badges">
                    <span class="badge ${client.status}">${client.status.replace('-', ' ')}</span>
                    ${client.envConfigured ? '<span class="badge configured">configured</span>' : '<span class="badge needs-setup">needs setup</span>'}
                </div>
            </div>

            <div class="client-info">
                <div class="client-info-item">
                    <span class="icon">📦</span>
                    ${client.package}
                </div>
                <div class="client-info-item">
                    <span class="icon">📊</span>
                    ${client.reportCount} reports
                </div>
                <div class="client-info-item">
                    <span class="icon">📧</span>
                    ${client.contact}
                </div>
                <div class="client-info-item">
                    <span class="icon">📅</span>
                    Started: ${client.started}
                </div>
            </div>

            <div class="client-actions">
                <button class="btn" onclick="testClient('${client.id}')">
                    <span class="icon">🔐</span> Test Auth
                </button>
                <button class="btn" onclick="auditClient('${client.id}')">
                    <span class="icon">📊</span> Audit
                </button>
                <button class="btn btn-primary" onclick="optimizeClient('${client.id}')">
                    <span class="icon">⚡</span> Optimize
                </button>
                ${client.latestReport ? `
                    <button class="btn" onclick="viewReport('${client.id}/${client.latestReport.name}')">
                        <span class="icon">📄</span> View Report
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Update overview clients
function updateOverviewClients(clients) {
    const container = document.getElementById('overview-clients-list');

    if (!clients || clients.length === 0) {
        container.innerHTML = '<p class="text-secondary">No clients configured yet.</p>';
        return;
    }

    // Show only active and pending clients
    const relevantClients = clients.filter(c => c.status === 'active' || c.status === 'pending-setup');

    container.innerHTML = relevantClients.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div>
                    <div class="client-name">${client.name}</div>
                    <div class="client-url">${client.url}</div>
                </div>
                <div class="client-badges">
                    <span class="badge ${client.status}">${client.status.replace('-', ' ')}</span>
                </div>
            </div>
            <div class="client-info">
                <div class="client-info-item">
                    ${client.envConfigured ?
                        '<span style="color: var(--success)">✅ Configured</span>' :
                        '<span style="color: var(--warning)">⚠️ Needs credentials</span>'}
                </div>
                <div class="client-info-item">
                    ${client.reportCount > 0 ?
                        `${client.reportCount} reports generated` :
                        'No reports yet'}
                </div>
            </div>
        </div>
    `).join('');
}

// Test client authentication
async function testClient(clientId) {
    showModal('Testing Authentication', 'Testing WordPress connection...');

    try {
        const response = await fetch(`/api/test-auth/${clientId}`, {
            method: 'POST'
        });
        const data = await response.json();

        updateModalOutput(data.output || data.error);

        if (data.success) {
            updateModalTitle('✅ Authentication Successful');
            updateModalMessage(`WordPress authentication successful for ${clientId}`);
        } else {
            updateModalTitle('❌ Authentication Failed');
            updateModalMessage('Check the output below for details');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

// Audit client
async function auditClient(clientId) {
    showModal('Running Audit', `Running SEO audit for ${clientId}...`);

    try {
        const response = await fetch(`/api/audit/${clientId}`, {
            method: 'POST'
        });
        const data = await response.json();

        updateModalOutput(data.output || data.error);

        if (data.success) {
            updateModalTitle('✅ Audit Complete');
            updateModalMessage(`Audit completed for ${clientId}`);
            refreshData(); // Refresh to show new report
        } else {
            updateModalTitle('❌ Audit Failed');
            updateModalMessage('Check the output below for details');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

// Optimize client
async function optimizeClient(clientId) {
    showModal('Running Optimization', `Optimizing ${clientId}...`);

    try {
        const response = await fetch(`/api/optimize/${clientId}`, {
            method: 'POST'
        });
        const data = await response.json();

        updateModalOutput(data.output || data.error);

        if (data.success) {
            updateModalTitle('✅ Optimization Complete');
            updateModalMessage(`Optimization completed for ${clientId}`);
            refreshData();
        } else {
            updateModalTitle('❌ Optimization Failed');
            updateModalMessage('Check the output below for details');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

// Run batch operation
async function runBatchOperation(action) {
    const actions = {
        'test': 'Testing All Clients',
        'audit': 'Auditing All Clients',
        'optimize': 'Optimizing All Clients'
    };

    showModal(actions[action], 'Running batch operation...');

    // Also update operations page if visible
    const outputDiv = document.getElementById('operation-output');
    if (outputDiv) {
        outputDiv.innerHTML = '<pre>Running operation...</pre>';
    }

    try {
        const response = await fetch(`/api/batch/${action}`, {
            method: 'POST'
        });
        const data = await response.json();

        const output = data.output || data.error || 'No output';

        updateModalOutput(output);

        if (outputDiv) {
            outputDiv.innerHTML = `<pre>${output}</pre>`;
        }

        if (data.success) {
            updateModalTitle(`✅ ${actions[action]} Complete`);
            updateModalMessage('Operation completed successfully');
            refreshData();
        } else {
            updateModalTitle(`❌ ${actions[action]} Failed`);
            updateModalMessage('Check the output below for details');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);

        if (outputDiv) {
            outputDiv.innerHTML = `<pre>Error: ${error.message}</pre>`;
        }
    }
}

// Load reports
async function loadReports() {
    const container = document.getElementById('reports-list');

    if (!dashboardData || !dashboardData.clients) {
        container.innerHTML = '<p>No clients found</p>';
        return;
    }

    const clientsWithReports = dashboardData.clients.filter(c => c.reportCount > 0);

    if (clientsWithReports.length === 0) {
        container.innerHTML = '<p class="text-secondary">No reports generated yet. Run audits to generate reports.</p>';
        return;
    }

    const reportsHtml = [];

    for (const client of clientsWithReports) {
        try {
            const response = await fetch(`/api/reports/${client.id}`);
            const data = await response.json();

            if (data.success && data.reports.length > 0) {
                reportsHtml.push(`
                    <div class="report-group">
                        <h3>${client.name}</h3>
                        <div class="report-items">
                            ${data.reports.map(report => `
                                <div class="report-item">
                                    <div class="report-info">
                                        <span class="report-icon">📄</span>
                                        <div>
                                            <div>${report.name}</div>
                                            <div class="report-date">${new Date(report.date).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <button class="btn" onclick="viewReport('${client.id}/${report.name}')">
                                        View Report
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            }
        } catch (error) {
            console.error(`Error loading reports for ${client.id}:`, error);
        }
    }

    container.innerHTML = reportsHtml.join('');
}

// View report
function viewReport(reportPath) {
    window.open(`/reports/${reportPath}`, '_blank');
}

// Load documentation
async function loadDocs() {
    try {
        const response = await fetch('/api/docs');
        const data = await response.json();

        if (data.success) {
            const docsByCategory = {};

            data.docs.forEach(doc => {
                if (!docsByCategory[doc.category]) {
                    docsByCategory[doc.category] = [];
                }
                docsByCategory[doc.category].push(doc);
            });

            const container = document.getElementById('docs-list');
            container.innerHTML = Object.entries(docsByCategory).map(([category, docs]) => `
                <div class="docs-category">
                    <h3>${category}</h3>
                    <div class="docs-items">
                        ${docs.map(doc => `
                            <a href="#" class="doc-item" onclick="openDoc('${doc.file}'); return false;">
                                <span class="doc-name">📄 ${doc.name}</span>
                                <span>→</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        showError('Error loading documentation');
    }
}

// Open documentation
function openDoc(filename) {
    window.open(`/${filename}`, '_blank');
}

// Modal functions
function showModal(title, message) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-output').textContent = '';
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
}

function updateModalTitle(title) {
    document.getElementById('modal-title').textContent = title;
}

function updateModalMessage(message) {
    document.getElementById('modal-message').textContent = message;
}

function updateModalOutput(output) {
    document.getElementById('modal-output').textContent = output || '';
}

// Notifications
function showNotification(message) {
    // Simple console log for now, can be enhanced with toast notifications
    console.log('Notification:', message);
}

function showError(message) {
    console.error('Error:', message);
    alert(message);
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) {
        closeModal();
    }
});

// ============================================
// Position Tracking CSV Analysis
// ============================================

async function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('file-name').textContent = `📄 ${file.name}`;
    
    showModal('Analyzing CSV', 'Parsing and analyzing position tracking data...');

    try {
        const formData = new FormData();
        formData.append('csv', file);

        const response = await fetch('/api/analyze-csv', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            displayAnalysisResults(data.analysis);
            closeModal();
            showNotification('Analysis complete!');
        } else {
            updateModalTitle('❌ Analysis Failed');
            updateModalMessage(data.error || 'Failed to analyze CSV');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

function displayAnalysisResults(analysis) {
    const resultsDiv = document.getElementById('analysis-results');
    resultsDiv.style.display = 'block';

    // Update stats
    document.getElementById('total-keywords').textContent = analysis.stats.totalKeywords;
    document.getElementById('top-10').textContent = analysis.stats.top10;
    document.getElementById('declined').textContent = analysis.stats.declined;
    document.getElementById('opportunities').textContent = analysis.stats.opportunities;

    // Display critical issues
    displayCriticalIssues(analysis.critical);

    // Display top performers
    displayTopPerformers(analysis.topPerformers);

    // Display opportunities
    displayOpportunities(analysis.opportunities);

    // Display declines
    displayDeclines(analysis.declines);

    // Display AI Overview
    displayAIOverview(analysis.aiOverview);
}

function displayCriticalIssues(issues) {
    const container = document.getElementById('critical-issues');
    
    if (!issues || issues.length === 0) {
        container.innerHTML = '<p class="text-success">✅ No critical issues detected</p>';
        return;
    }

    container.innerHTML = issues.map(issue => `
        <div class="issue-card critical">
            <div class="issue-header">
                <span class="issue-icon">🚨</span>
                <strong>${issue.keyword || issue.issue}</strong>
            </div>
            <div class="issue-details">
                ${issue.currentPosition ? `<span>Position: ${issue.currentPosition}</span>` : ''}
                ${issue.volume ? `<span>Volume: ${issue.volume}/mo</span>` : ''}
                ${issue.impact ? `<span>Impact: ${issue.impact}</span>` : ''}
            </div>
            <div class="issue-action">
                <strong>Action:</strong> ${issue.action}
            </div>
        </div>
    `).join('');
}

function displayTopPerformers(performers) {
    const container = document.getElementById('top-performers');
    
    if (!performers || performers.length === 0) {
        container.innerHTML = '<p class="text-warning">⚠️ No keywords in top 10 positions</p>';
        return;
    }

    container.innerHTML = performers.slice(0, 10).map(kw => `
        <div class="keyword-card success">
            <div class="keyword-header">
                <span class="keyword-name">${kw.keyword}</span>
                <span class="position-badge top">#${kw.position}</span>
            </div>
            <div class="keyword-details">
                <span>📊 Volume: ${kw.volume}/mo</span>
                <span>🎯 Intent: ${kw.intent || 'N/A'}</span>
            </div>
            <div class="keyword-url">${kw.url}</div>
        </div>
    `).join('');
}

function displayOpportunities(opportunities) {
    const container = document.getElementById('high-opportunities');
    
    if (!opportunities || opportunities.length === 0) {
        container.innerHTML = '<p class="text-secondary">No high-value opportunities in positions 11-20</p>';
        return;
    }

    container.innerHTML = opportunities.slice(0, 10).map(opp => `
        <div class="keyword-card opportunity">
            <div class="keyword-header">
                <span class="keyword-name">${opp.keyword}</span>
                <span class="position-badge">#${opp.position}</span>
            </div>
            <div class="keyword-details">
                <span>📊 Volume: ${opp.volume}/mo</span>
                ${opp.cpc ? `<span>💰 CPC: $${opp.cpc}</span>` : ''}
                ${opp.potentialTraffic ? `<span>📈 Potential: +${opp.potentialTraffic} clicks/mo</span>` : ''}
            </div>
            <div class="keyword-action">
                <strong>Action:</strong> ${opp.action}
            </div>
        </div>
    `).join('');
}

function displayDeclines(declines) {
    const container = document.getElementById('recent-declines');
    
    if (!declines || declines.length === 0) {
        container.innerHTML = '<p class="text-success">✅ No significant position declines detected</p>';
        return;
    }

    container.innerHTML = declines.map(decline => `
        <div class="keyword-card decline">
            <div class="keyword-header">
                <span class="keyword-name">${decline.keyword}</span>
                <span class="decline-badge">-${Math.abs(decline.change)} positions</span>
            </div>
            <div class="keyword-details">
                <span>📍 Now at: #${decline.currentPosition}</span>
                <span>📊 Volume: ${decline.volume}/mo</span>
                ${decline.impact ? `<span>⚠️ Impact: ${decline.impact}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function displayAIOverview(aiKeywords) {
    const container = document.getElementById('ai-overview');
    
    if (!aiKeywords || aiKeywords.length === 0) {
        container.innerHTML = '<p class="text-secondary">No AI Overview placements detected in this dataset</p>';
        return;
    }

    container.innerHTML = `
        <div class="ai-overview-summary">
            <p class="text-success">✅ ${aiKeywords.length} keywords appearing in AI Overviews</p>
        </div>
        ${aiKeywords.map(kw => `
            <div class="keyword-card ai-overview">
                <div class="keyword-header">
                    <span class="keyword-name">${kw.keyword}</span>
                    <span class="ai-badge">🤖 AI Overview</span>
                </div>
                <div class="keyword-details">
                    <span>📍 Position: #${kw.position}</span>
                    <span>📊 Volume: ${kw.volume}/mo</span>
                </div>
            </div>
        `).join('')}
    `;
}

// ============================================
// GSC Analytics Functions
// ============================================

async function testGSCSetup() {
    showModal('Testing GSC Connection', 'Checking Google Search Console API setup...');
    
    try {
        const response = await fetch('/api/gsc-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: 'https://instantautotraders.com.au' })
        });
        
        const data = await response.json();
        
        if (data.setup && data.setup.required) {
            updateModalTitle('⚙️ GSC Setup Required');
            updateModalMessage('Follow these steps to enable GSC features:');
            updateModalOutput(data.setup.steps.join('\n'));
        } else {
            updateModalTitle('✅ GSC Connected');
            updateModalMessage('Google Search Console API is working!');
            updateModalOutput(JSON.stringify(data.data, null, 2));
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Failed to connect to GSC API');
        updateModalOutput(error.message);
    }
}

async function fetchGSCRankings() {
    const resultsDiv = document.getElementById('gsc-results');
    const outputPre = document.getElementById('gsc-output');
    
    resultsDiv.style.display = 'block';
    outputPre.textContent = 'Loading rankings...';
    
    try {
        const response = await fetch('/api/gsc-rankings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: 'https://instantautotraders.com.au' })
        });
        
        const data = await response.json();
        outputPre.textContent = JSON.stringify(data, null, 2);
        
        if (data.note) {
            alert(data.note);
        }
    } catch (error) {
        outputPre.textContent = 'Error: ' + error.message;
    }
}

async function fetchQuickWins() {
    const resultsDiv = document.getElementById('gsc-results');
    const outputPre = document.getElementById('gsc-output');
    
    resultsDiv.style.display = 'block';
    outputPre.textContent = 'Finding quick wins...';
    
    try {
        const response = await fetch('/api/gsc-quick-wins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: 'https://instantautotraders.com.au' })
        });
        
        const data = await response.json();
        outputPre.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        outputPre.textContent = 'Error: ' + error.message;
    }
}

async function fetchGSCMetrics() {
    const resultsDiv = document.getElementById('gsc-results');
    const outputPre = document.getElementById('gsc-output');
    
    resultsDiv.style.display = 'block';
    outputPre.textContent = 'Fetching metrics...';
    
    try {
        const response = await fetch('/api/gsc-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteUrl: 'https://instantautotraders.com.au' })
        });
        
        const data = await response.json();
        outputPre.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        outputPre.textContent = 'Error: ' + error.message;
    }
}

async function fetchPositionChanges() {
    const resultsDiv = document.getElementById('gsc-results');
    const outputPre = document.getElementById('gsc-output');

    resultsDiv.style.display = 'block';
    outputPre.textContent = 'Tracking position changes... (Coming soon)';
}

// ============================================
// Local SEO Functions
// ============================================

let localSeoCharts = {};

// Populate client selectors
function populateLocalSEOClientSelector() {
    const select = document.getElementById('local-seo-client-select');
    if (!select || !dashboardData || !dashboardData.clients) return;

    const options = dashboardData.clients.map(client =>
        `<option value="${client.id}">${client.name}</option>`
    ).join('');

    select.innerHTML = '<option value="">-- Select Client --</option>' + options;
}

// Load Local SEO data for selected client
async function loadLocalSEOData() {
    const select = document.getElementById('local-seo-client-select');
    const clientId = select.value;

    if (!clientId) {
        document.getElementById('local-seo-dashboard').style.display = 'none';
        return;
    }

    const loadingDiv = document.getElementById('local-seo-loading');
    const dashboardDiv = document.getElementById('local-seo-dashboard');

    loadingDiv.style.display = 'block';
    dashboardDiv.style.display = 'none';

    try {
        // Fetch latest score and trend
        const [latestRes, trendRes] = await Promise.all([
            fetch(`/api/local-seo/${clientId}/latest`),
            fetch(`/api/local-seo/${clientId}/trend?days=90`)
        ]);

        const latest = await latestRes.json();
        const trend = await trendRes.json();

        if (latest.success && latest.data) {
            displayLocalSEOData(latest.data, trend.data || []);
            dashboardDiv.style.display = 'block';
        } else {
            dashboardDiv.innerHTML = '<p class="text-secondary">No Local SEO data available. Run an audit to get started.</p>';
            dashboardDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading Local SEO data:', error);
        showError('Failed to load Local SEO data: ' + error.message);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display Local SEO data
function displayLocalSEOData(data, trendData) {
    // Update stats
    document.getElementById('local-seo-nap-score').textContent = data.napScore || '-';
    document.getElementById('local-seo-schema-status').textContent = data.hasSchema ? '✅ Present' : '⚠️ Missing';
    document.getElementById('local-seo-issues-count').textContent = data.issuesFound || 0;

    // Extract directories count from metadata if available
    const directoriesCount = data.metadata?.tasks?.directoryTracking?.directories?.length || 0;
    document.getElementById('local-seo-directories').textContent = directoriesCount;

    // Display NAP trend chart
    displayNAPTrendChart(trendData);

    // Display issues
    displayLocalSEOIssues(data.metadata?.tasks?.napConsistency?.issues || []);

    // Display recommendations
    displayLocalSEORecommendations(data.metadata?.recommendations || []);

    // Display directories
    displayDirectoryTracker(data.metadata?.tasks?.directoryTracking?.directories || []);

    // Display schema details
    displaySchemaDetails(data.metadata?.tasks?.schema || {});
}

// Display NAP trend chart
function displayNAPTrendChart(trendData) {
    const canvas = document.getElementById('nap-trend-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (localSeoCharts.napTrend) {
        localSeoCharts.napTrend.destroy();
    }

    const labels = trendData.map(d => new Date(d.timestamp).toLocaleDateString());
    const scores = trendData.map(d => d.napScore);

    localSeoCharts.napTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'NAP Consistency Score',
                data: scores,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Display Local SEO issues
function displayLocalSEOIssues(issues) {
    const container = document.getElementById('local-seo-critical-issues');

    if (!issues || issues.length === 0) {
        container.innerHTML = '<p class="no-data">No critical issues found</p>';
        return;
    }

    container.innerHTML = issues.map(issue => `
        <div class="issue-card critical">
            <div class="issue-header">
                <span class="issue-icon">⚠️</span>
                <strong>${issue.field || issue.type}</strong>
            </div>
            <div class="issue-details">
                ${issue.message || issue.description}
            </div>
        </div>
    `).join('');
}

// Display recommendations
function displayLocalSEORecommendations(recommendations) {
    const container = document.getElementById('local-seo-recommendations');

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<p class="no-data">No recommendations available</p>';
        return;
    }

    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card ${rec.priority?.toLowerCase() || 'medium'}">
            <div class="rec-header">
                <span class="priority-badge ${rec.priority?.toLowerCase() || 'medium'}">${rec.priority || 'MEDIUM'}</span>
                <strong>${rec.action || rec.title}</strong>
            </div>
            ${rec.impact ? `<div class="rec-impact">💡 Impact: ${rec.impact}</div>` : ''}
        </div>
    `).join('');
}

// Display directory tracker
function displayDirectoryTracker(directories) {
    const container = document.getElementById('local-seo-directories-list');

    if (!directories || directories.length === 0) {
        container.innerHTML = '<p class="no-data">No directory data available</p>';
        return;
    }

    container.innerHTML = `
        <table class="directory-table">
            <thead>
                <tr>
                    <th>Directory</th>
                    <th>Status</th>
                    <th>NAP Consistency</th>
                    <th>Last Checked</th>
                </tr>
            </thead>
            <tbody>
                ${directories.map(dir => `
                    <tr>
                        <td><strong>${dir.name}</strong></td>
                        <td>
                            <span class="badge ${dir.status === 'verified' ? 'success' : 'warning'}">
                                ${dir.status || 'Unknown'}
                            </span>
                        </td>
                        <td>${dir.napConsistent ? '✅ Consistent' : '⚠️ Inconsistent'}</td>
                        <td>${dir.lastChecked ? new Date(dir.lastChecked).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Display schema details
function displaySchemaDetails(schemaData) {
    const container = document.getElementById('local-seo-schema-details');

    if (!schemaData || !schemaData.hasSchema) {
        container.innerHTML = '<p class="no-data">No schema markup detected</p>';
        return;
    }

    container.innerHTML = `
        <div class="schema-info">
            <div class="schema-status">
                <span class="badge success">✅ Schema Detected</span>
            </div>
            <div class="schema-type">
                <strong>Type:</strong> ${schemaData.type || 'LocalBusiness'}
            </div>
            ${schemaData.valid !== undefined ? `
                <div class="schema-validation">
                    ${schemaData.valid ?
                        '<span class="badge success">✅ Valid</span>' :
                        '<span class="badge warning">⚠️ Needs Improvement</span>'}
                </div>
            ` : ''}
        </div>
    `;
}

// Run Local SEO audit
async function runLocalSEOAudit() {
    const select = document.getElementById('local-seo-client-select');
    const clientId = select.value;

    if (!clientId) {
        alert('Please select a client first');
        return;
    }

    showModal('Running Local SEO Audit', `Analyzing NAP consistency, schema, and directories for ${clientId}...`);

    try {
        const response = await fetch(`/api/local-seo/${clientId}/run`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            updateModalTitle('✅ Local SEO Audit Complete');
            updateModalMessage('Audit completed successfully. Loading results...');

            // Wait a moment then reload data
            setTimeout(() => {
                closeModal();
                loadLocalSEOData();
            }, 1000);
        } else {
            updateModalTitle('❌ Audit Failed');
            updateModalMessage(data.error || 'Failed to run audit');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

// ============================================
// Competitor Tracking Functions
// ============================================

let competitorCharts = {};

// Populate competitor client selector
function populateCompetitorClientSelector() {
    const select = document.getElementById('competitors-client-select');
    if (!select || !dashboardData || !dashboardData.clients) return;

    const options = dashboardData.clients.map(client =>
        `<option value="${client.id}">${client.name}</option>`
    ).join('');

    select.innerHTML = '<option value="">-- Select Client --</option>' + options;
}

// Load competitor data
async function loadCompetitorData() {
    const select = document.getElementById('competitors-client-select');
    const clientId = select.value;

    if (!clientId) {
        document.getElementById('competitors-dashboard').style.display = 'none';
        return;
    }

    const loadingDiv = document.getElementById('competitors-loading');
    const dashboardDiv = document.getElementById('competitors-dashboard');

    loadingDiv.style.display = 'block';
    dashboardDiv.style.display = 'none';

    try {
        // Fetch competitors list, rankings, and alerts
        const [competitorsRes, rankingsRes, alertsRes] = await Promise.all([
            fetch(`/api/competitors/${clientId}/list`),
            fetch(`/api/competitors/${clientId}/rankings?limit=100`),
            fetch(`/api/competitors/${clientId}/alerts`)
        ]);

        const competitors = await competitorsRes.json();
        const rankings = await rankingsRes.json();
        const alerts = await alertsRes.json();

        if (competitors.success) {
            displayCompetitorData(competitors.data, rankings.data, alerts.data);
            dashboardDiv.style.display = 'block';
        } else {
            dashboardDiv.innerHTML = '<p class="text-secondary">No competitor data available. Run analysis to get started.</p>';
            dashboardDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading competitor data:', error);
        showError('Failed to load competitor data: ' + error.message);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Display competitor data
function displayCompetitorData(competitors, rankings, alerts) {
    // Update stats
    document.getElementById('competitors-count').textContent = competitors?.length || 0;
    document.getElementById('competitors-alerts-count').textContent = alerts?.length || 0;

    const uniqueKeywords = new Set((rankings || []).map(r => r.keyword));
    document.getElementById('competitors-keywords-tracked').textContent = uniqueKeywords.size;

    // Calculate opportunities (keywords where we're ranking 11-20)
    const opportunities = (rankings || []).filter(r =>
        r.yourPosition >= 11 && r.yourPosition <= 20
    ).length;
    document.getElementById('competitors-opportunities').textContent = opportunities;

    // Display components
    displayCompetitorAlerts(alerts || []);
    displayCompetitorsList(competitors || []);
    displayRankingChart(rankings || []);
    displayRankingsTable(rankings || [], competitors || []);
}

// Display competitor alerts
function displayCompetitorAlerts(alerts) {
    const container = document.getElementById('competitors-alerts-list');

    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<p class="no-data">No active alerts</p>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-card ${alert.severity?.toLowerCase() || 'medium'}">
            <div class="alert-header">
                <span class="severity-badge ${alert.severity?.toLowerCase() || 'medium'}">${alert.severity || 'MEDIUM'}</span>
                <strong>${alert.type || alert.title}</strong>
            </div>
            <div class="alert-details">
                ${alert.message || alert.description}
            </div>
            <div class="alert-meta">
                <span>Keyword: <strong>${alert.keyword}</strong></span>
                <span>Competitor: <strong>${alert.competitorDomain}</strong></span>
            </div>
            <button class="btn-small" onclick="resolveAlert('${alert.id}')">
                Resolve
            </button>
        </div>
    `).join('');
}

// Display competitors list
function displayCompetitorsList(competitors) {
    const container = document.getElementById('competitors-list');

    if (!competitors || competitors.length === 0) {
        container.innerHTML = '<p class="no-data">No competitors tracked yet</p>';
        return;
    }

    container.innerHTML = competitors.map(comp => `
        <div class="competitor-card">
            <div class="competitor-header">
                <h4>${comp.domain}</h4>
            </div>
            <div class="competitor-stats">
                <div class="stat-item">
                    <span class="stat-label">Keywords Tracked</span>
                    <span class="stat-value">${comp.keywordsTracked || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Position</span>
                    <span class="stat-value">${comp.avgPosition?.toFixed(1) || 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Outranking You</span>
                    <span class="stat-value">${comp.outrankingCount || 0}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Display ranking chart
function displayRankingChart(rankings) {
    const canvas = document.getElementById('competitors-ranking-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (competitorCharts.rankings) {
        competitorCharts.rankings.destroy();
    }

    // Group by competitor and calculate average position
    const competitorAvgs = {};
    rankings.forEach(r => {
        if (!competitorAvgs[r.competitorDomain]) {
            competitorAvgs[r.competitorDomain] = { sum: 0, count: 0 };
        }
        competitorAvgs[r.competitorDomain].sum += r.theirPosition || 0;
        competitorAvgs[r.competitorDomain].count++;
    });

    const labels = Object.keys(competitorAvgs);
    const avgPositions = labels.map(domain =>
        (competitorAvgs[domain].sum / competitorAvgs[domain].count).toFixed(1)
    );

    competitorCharts.rankings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Position',
                data: avgPositions,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    reverse: true, // Lower position is better
                    title: {
                        display: true,
                        text: 'Average Position (lower is better)'
                    }
                }
            }
        }
    });
}

// Display rankings table
function displayRankingsTable(rankings, competitors) {
    const container = document.getElementById('competitors-rankings-table');
    const filterSelect = document.getElementById('rankings-competitor-filter');

    if (!rankings || rankings.length === 0) {
        container.innerHTML = '<p class="no-data">No ranking data available</p>';
        return;
    }

    // Populate filter dropdown
    const competitorDomains = [...new Set(rankings.map(r => r.competitorDomain))];
    filterSelect.innerHTML = '<option value="">All Competitors</option>' +
        competitorDomains.map(domain => `<option value="${domain}">${domain}</option>`).join('');

    // Store rankings globally for filtering
    window.allRankings = rankings;

    renderRankingsTable(rankings);
}

// Render rankings table
function renderRankingsTable(rankings) {
    const container = document.getElementById('competitors-rankings-table');

    container.innerHTML = `
        <table class="rankings-table">
            <thead>
                <tr>
                    <th>Keyword</th>
                    <th>Your Position</th>
                    <th>Competitor</th>
                    <th>Their Position</th>
                    <th>Gap</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${rankings.slice(0, 50).map(r => {
                    const gap = (r.yourPosition || 0) - (r.theirPosition || 0);
                    const gapClass = gap > 0 ? 'negative' : gap < 0 ? 'positive' : 'neutral';

                    return `
                        <tr>
                            <td><strong>${r.keyword}</strong></td>
                            <td><span class="position-badge">#${r.yourPosition || 'N/A'}</span></td>
                            <td>${r.competitorDomain}</td>
                            <td><span class="position-badge">#${r.theirPosition || 'N/A'}</span></td>
                            <td><span class="gap-badge ${gapClass}">${gap > 0 ? '+' : ''}${gap}</span></td>
                            <td>${new Date(r.timestamp).toLocaleDateString()}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        ${rankings.length > 50 ? `<p class="text-secondary">Showing 50 of ${rankings.length} rankings</p>` : ''}
    `;
}

// Filter rankings
function filterRankings() {
    if (!window.allRankings) return;

    const searchTerm = document.getElementById('rankings-search').value.toLowerCase();
    const competitorFilter = document.getElementById('rankings-competitor-filter').value;

    let filtered = window.allRankings;

    if (searchTerm) {
        filtered = filtered.filter(r => r.keyword.toLowerCase().includes(searchTerm));
    }

    if (competitorFilter) {
        filtered = filtered.filter(r => r.competitorDomain === competitorFilter);
    }

    renderRankingsTable(filtered);
}

// Resolve alert
async function resolveAlert(alertId) {
    const select = document.getElementById('competitors-client-select');
    const clientId = select.value;

    if (!clientId) return;

    try {
        const response = await fetch(`/api/competitors/${clientId}/alerts/${alertId}/resolve`, {
            method: 'PUT'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Alert resolved');
            loadCompetitorData(); // Reload data
        } else {
            showError('Failed to resolve alert');
        }
    } catch (error) {
        showError('Error resolving alert: ' + error.message);
    }
}

// Run competitor analysis
async function runCompetitorAnalysis() {
    const select = document.getElementById('competitors-client-select');
    const clientId = select.value;

    if (!clientId) {
        alert('Please select a client first');
        return;
    }

    showModal('Running Competitor Analysis', `Discovering competitors and analyzing rankings for ${clientId}...`);

    try {
        const response = await fetch(`/api/competitors/${clientId}/run`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            updateModalTitle('✅ Competitor Analysis Complete');
            updateModalMessage('Analysis completed successfully. Loading results...');

            // Wait a moment then reload data
            setTimeout(() => {
                closeModal();
                loadCompetitorData();
            }, 1000);
        } else {
            updateModalTitle('❌ Analysis Failed');
            updateModalMessage(data.error || 'Failed to run analysis');
        }
    } catch (error) {
        updateModalTitle('❌ Error');
        updateModalMessage('Error: ' + error.message);
    }
}

// ============================================
// Initialize new features when page loads
// ============================================

// Update the original DOMContentLoaded to include new features
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData().then(() => {
        populateLocalSEOClientSelector();
        populateCompetitorClientSelector();
    });
});
