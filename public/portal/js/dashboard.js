/**
 * Dashboard JavaScript - Load and display client data
 */

// Check authentication
if (!auth.isAuthenticated()) {
    window.location.href = '/portal/index.html';
}

// State
let currentUser = null;
let clientData = null;

// Initialize dashboard
async function initDashboard() {
    try {
        // Get current user
        currentUser = await auth.getCurrentUser();

        // Display user name
        document.getElementById('user-name').textContent =
            currentUser.firstName
                ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
                : currentUser.email;

        // Load dashboard data
        await loadDashboardData();

        // Show dashboard
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError(error.message);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Get client dashboard data
        const data = await api.request(`/api/portal/${currentUser.clientId}/dashboard`);

        if (data.success) {
            clientData = data.data;
            renderDashboard(clientData);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Render dashboard
function renderDashboard(data) {
    // Update stats cards
    updateStatsCards(data.stats);

    // Render competitor threats
    renderCompetitorThreats(data.threats);

    // Render recent optimizations
    renderRecentOptimizations(data.optimizations);

    // Render top keywords
    renderTopKeywords(data.keywords);

    // Render activity log
    renderActivityLog(data.activity);
}

// Update stats cards
function updateStatsCards(stats) {
    document.getElementById('stat-keywords').textContent = stats?.keywordsTracked || 0;
    document.getElementById('stat-top10').textContent = stats?.top10Rankings || 0;
    document.getElementById('stat-fixes').textContent = stats?.autoFixesApplied || 0;
    document.getElementById('stat-score').textContent = stats?.seoScore
        ? `${stats.seoScore}/100`
        : '--';
}

// Render competitor threats
function renderCompetitorThreats(threats) {
    const container = document.getElementById('competitor-threats');

    if (!threats || threats.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No competitive threats detected. Great job!</p>';
        return;
    }

    const threatsHtml = threats.slice(0, 5).map(threat => `
        <div class="insight-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong style="color: ${getSeverityColor(threat.severity)};">
                    ${threat.severity.toUpperCase()}
                </strong>
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    Position #${threat.yourPosition}
                </span>
            </div>
            <div style="margin-bottom: 0.5rem;">
                <strong>${threat.keyword}</strong>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                ${threat.message}
            </div>
        </div>
    `).join('');

    container.innerHTML = threatsHtml;
}

// Render recent optimizations
function renderRecentOptimizations(optimizations) {
    const container = document.getElementById('recent-optimizations');

    if (!optimizations || optimizations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No recent optimizations</p>';
        return;
    }

    const optimizationsHtml = optimizations.slice(0, 5).map(opt => `
        <div class="optimization-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <div>
                    <strong>${opt.type.replace(/_/g, ' ')}</strong>
                    <span style="margin-left: 0.5rem;">
                        ${getStatusIcon(opt.status)}
                    </span>
                </div>
                <span style="color: var(--text-secondary); font-size: 0.875rem;">
                    ${formatDate(opt.date)}
                </span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                ${opt.pagesModified || 0} pages modified,
                ${opt.issuesFixed || 0} issues fixed
            </div>
        </div>
    `).join('');

    container.innerHTML = optimizationsHtml;
}

// Render top keywords
function renderTopKeywords(keywords) {
    const container = document.getElementById('top-keywords');

    if (!keywords || keywords.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No keyword data available</p>';
        return;
    }

    const keywordsHtml = keywords.slice(0, 10).map((kw, index) => `
        <div class="keyword-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="color: var(--text-secondary); margin-right: 0.5rem;">
                        #${index + 1}
                    </span>
                    <strong>${kw.keyword}</strong>
                </div>
                <div style="text-align: right;">
                    <div style="color: var(--primary-color); font-weight: bold;">
                        Position ${kw.position}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        ${kw.impressions ? formatNumber(kw.impressions) + ' impressions' : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = keywordsHtml;
}

// Render activity log
function renderActivityLog(activity) {
    const container = document.getElementById('activity-log');

    if (!activity || activity.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No recent activity</p>';
        return;
    }

    const activityHtml = activity.slice(0, 10).map(item => `
        <div class="activity-item">
            <div style="display: flex; justify-content: between; margin-bottom: 0.25rem;">
                <strong style="font-size: 0.875rem;">${item.action}</strong>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                ${formatDate(item.timestamp)}
            </div>
        </div>
    `).join('');

    container.innerHTML = activityHtml;
}

// Show error state
function showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

// Event listeners
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        await api.logout();
    }
});

// Quick action functions
function viewReports() {
    alert('Reports viewer coming soon!');
}

function runCompetitorAnalysis() {
    if (confirm('Run competitor analysis? This may take a few minutes.')) {
        api.request(`/api/competitors/${currentUser.clientId}/run`, {
            method: 'POST'
        })
        .then(() => {
            alert('Competitor analysis started! Refresh the page in a few minutes to see results.');
        })
        .catch(error => {
            alert('Error: ' + error.message);
        });
    }
}

function viewOpportunities() {
    alert('Opportunities viewer coming soon!');
}

// Initialize when page loads
if (document.getElementById('dashboard-content')) {
    initDashboard();
}
