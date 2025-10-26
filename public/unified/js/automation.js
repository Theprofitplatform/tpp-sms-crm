/**
 * Unified Dashboard - Automation & Auto-Fix Sections
 *
 * Control automation engines and auto-fix systems
 */

// ============================================
// Automation Control Center
// ============================================

async function loadAutomationSection() {
  console.log('🤖 Loading automation section...');

  const container = document.getElementById('automation-content');
  if (!container) return;

  try {
    showLoading('automation-content');

    // Load client list
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      showEmptyState('automation-content', '🤖', 'No Clients', 'Add clients to run automation');
      return;
    }

    const clients = response.clients;

    let html = `
      <div class="automation-container">
        <div class="automation-header">
          <h3>Automation Control Center</h3>
          <div class="automation-actions">
            <button class="btn btn-success" onclick="runBatchAutomation('optimize')">
              ⚡ Optimize All
            </button>
            <button class="btn btn-primary" onclick="runBatchAutomation('audit')">
              📊 Audit All
            </button>
          </div>
        </div>

        <div class="automation-grid">
          ${buildAutomationCards()}
        </div>

        <div class="automation-clients">
          <h4>Run Automation for Specific Client</h4>
          <div class="clients-automation-grid">
            ${clients.map(c => buildClientAutomationCard(c)).join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading automation:', error);
    showEmptyState('automation-content', '⚠️', 'Error', 'Failed to load automation controls');
  }
}

function buildAutomationCards() {
  const automations = [
    { id: 'rank-tracking', name: 'Rank Tracking', icon: '📊', description: 'Track keyword rankings' },
    { id: 'local-seo', name: 'Local SEO', icon: '📍', description: 'Monitor local SEO metrics' },
    { id: 'competitor', name: 'Competitor Tracking', icon: '🎯', description: 'Track competitors' },
    { id: 'gsc', name: 'Google Search Console', icon: '🔍', description: 'Fetch GSC data' }
  ];

  return automations.map(auto => `
    <div class="automation-card">
      <div class="automation-icon">${auto.icon}</div>
      <h4>${auto.name}</h4>
      <p>${auto.description}</p>
      <button class="btn btn-primary btn-sm" onclick="showToast('info', 'Coming Soon', '${auto.name} automation will be available soon')">
        Run Now
      </button>
    </div>
  `).join('');
}

function buildClientAutomationCard(client) {
  return `
    <div class="client-automation-card">
      <div class="client-info">
        <h5>${client.name || client.id}</h5>
        <span class="badge">${client.status}</span>
      </div>
      <div class="client-automation-actions">
        <button class="btn btn-sm btn-secondary" onclick="runClientAudit('${client.id}')">
          📊 Audit
        </button>
        <button class="btn btn-sm btn-success" onclick="runClientOptimization('${client.id}')">
          ⚡ Optimize
        </button>
      </div>
    </div>
  `;
}

async function runBatchAutomation(action) {
  showConfirmModal(
    `Run Batch ${capitalize(action)}`,
    `This will run ${action} for all clients. This may take several minutes. Continue?`,
    async () => {
      try {
        showToast('info', `Running ${capitalize(action)}`, `Starting batch ${action} for all clients...`);

        const response = await API.runBatchOperation(action);

        if (response.success) {
          showToast('success', 'Completed!', `Batch ${action} completed successfully`);
        } else {
          throw new Error(response.error || 'Batch operation failed');
        }

      } catch (error) {
        console.error('Batch automation error:', error);
        showToast('error', 'Failed', error.message);
      }
    }
  );
}

// ============================================
// Auto-Fix Engines
// ============================================

async function loadAutoFixSection() {
  console.log('🔧 Loading auto-fix section...');

  const container = document.getElementById('autofix-content');
  if (!container) return;

  try {
    showLoading('autofix-content');

    let html = `
      <div class="autofix-container">
        <div class="autofix-header">
          <h3>Auto-Fix Engines</h3>
          <p class="section-description">Automated SEO fixes that run intelligently based on detected issues</p>
        </div>

        <div class="autofix-grid">
          ${buildAutoFixCards()}
        </div>

        <div class="autofix-info">
          <div class="card">
            <h4>How Auto-Fix Works</h4>
            <ol>
              <li>System detects issues during audits</li>
              <li>AI analyzes the issue and generates a fix</li>
              <li>Fix is applied automatically or awaits approval</li>
              <li>Results are tracked and reported</li>
            </ol>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading auto-fix:', error);
    showEmptyState('autofix-content', '⚠️', 'Error', 'Failed to load auto-fix engines');
  }
}

function buildAutoFixCards() {
  const engines = [
    {
      id: 'nap',
      name: 'NAP Auto-Fix',
      icon: '🔧',
      description: 'Automatically fix Name, Address, Phone inconsistencies across the web',
      features: ['GMB sync', 'Citation cleanup', 'Schema updates']
    },
    {
      id: 'schema',
      name: 'Schema Auto-Fix',
      icon: '🏷️',
      description: 'Generate and apply proper schema markup for better rich snippets',
      features: ['LocalBusiness', 'Organization', 'Product schema']
    },
    {
      id: 'titles',
      name: 'Title/Meta Optimizer',
      icon: '📝',
      description: 'Optimize page titles and meta descriptions for better CTR',
      features: ['Length optimization', 'Keyword placement', 'Uniqueness check']
    },
    {
      id: 'content',
      name: 'Content Enhancer',
      icon: '✍️',
      description: 'Improve content quality with AI-powered suggestions',
      features: ['Readability', 'Keyword density', 'Internal linking']
    }
  ];

  return engines.map(engine => `
    <div class="autofix-card">
      <div class="autofix-card-header">
        <div class="autofix-icon">${engine.icon}</div>
        <h4>${engine.name}</h4>
      </div>
      <p>${engine.description}</p>
      <div class="autofix-features">
        ${engine.features.map(f => `<span class="feature-badge">✓ ${f}</span>`).join('')}
      </div>
      <div class="autofix-status">
        <span class="status-indicator status-active"></span>
        <span>Active</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showAutoFixSettings('${engine.id}')">
        Configure
      </button>
    </div>
  `).join('');
}

function showAutoFixSettings(engineId) {
  showToast('info', 'Coming Soon', `${capitalize(engineId)} auto-fix configuration will be available soon`);
}

console.log('🤖 Automation.js fully loaded');
