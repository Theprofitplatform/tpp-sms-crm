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
