/**
 * Unified Dashboard - Webhooks, Campaigns, Reports, and White-Label Sections
 *
 * Final sections of the unified dashboard
 */

// ============================================
// WEBHOOKS SECTION
// ============================================

let currentWebhooksPage = 1;
const WEBHOOKS_PER_PAGE = 10;

async function loadWebhooksSection() {
  console.log('🔗 Loading webhooks section...');

  const container = document.getElementById('webhooks-content');
  if (!container) return;

  try {
    showLoading('webhooks-content');

    // Load webhooks
    const response = await API.getWebhooks();

    if (!response.success) {
      throw new Error(response.error || 'Failed to load webhooks');
    }

    const webhooks = response.webhooks || [];

    // Build webhooks UI
    let html = `
      <div class="webhooks-container">
        <!-- Header with Add Button -->
        <div class="webhooks-header">
          <h3>Webhook Management</h3>
          <button class="btn btn-primary" onclick="showWebhookModal()">
            + Add Webhook
          </button>
        </div>

        <!-- Summary Stats -->
        <div class="webhooks-summary">
          ${buildWebhooksSummary(webhooks)}
        </div>

        <!-- Webhooks Table -->
        <div class="webhooks-table-container">
          ${webhooks.length > 0 ? buildWebhooksTable(webhooks) : buildEmptyWebhooksState()}
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading webhooks:', error);
    showEmptyState('webhooks-content', '⚠️', 'Error', 'Failed to load webhooks');
  }
}

function buildWebhooksSummary(webhooks) {
  const total = webhooks.length;
  const active = webhooks.filter(w => w.status === 'active').length;
  const inactive = webhooks.filter(w => w.status === 'inactive').length;
  const totalDeliveries = webhooks.reduce((sum, w) => sum + (w.deliveries || 0), 0);

  return `
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="summary-label">Total Webhooks</div>
        <div class="summary-value">${total}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Active</div>
        <div class="summary-value text-success">${active}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Inactive</div>
        <div class="summary-value text-secondary">${inactive}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Total Deliveries</div>
        <div class="summary-value">${totalDeliveries}</div>
      </div>
    </div>
  `;
}

function buildWebhooksTable(webhooks) {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>URL</th>
          <th>Events</th>
          <th>Status</th>
          <th>Deliveries</th>
          <th>Last Delivery</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${webhooks.map(w => buildWebhookRow(w)).join('')}
      </tbody>
    </table>
  `;
}

function buildWebhookRow(webhook) {
  const statusColors = {
    active: 'success',
    inactive: 'secondary',
    error: 'danger'
  };

  const statusColor = statusColors[webhook.status] || 'secondary';
  const events = webhook.events ? webhook.events.join(', ') : 'All events';
  const lastDelivery = webhook.lastDelivery ? formatDate(webhook.lastDelivery, 'short') : 'Never';

  return `
    <tr data-id="${webhook.id}">
      <td><strong>${webhook.name}</strong></td>
      <td><code class="url-code">${webhook.url}</code></td>
      <td><span class="badge badge-gray">${events}</span></td>
      <td><span class="badge badge-${statusColor}">${capitalize(webhook.status)}</span></td>
      <td>${webhook.deliveries || 0}</td>
      <td>${lastDelivery}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-secondary" onclick="testWebhook('${webhook.id}')" title="Test">
            🧪
          </button>
          <button class="btn btn-sm btn-info" onclick="viewWebhookLogs('${webhook.id}')" title="Logs">
            📋
          </button>
          <button class="btn btn-sm btn-primary" onclick="editWebhook('${webhook.id}')" title="Edit">
            ✏️
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteWebhook('${webhook.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `;
}

function buildEmptyWebhooksState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🔗</div>
      <h4 class="empty-state-title">No Webhooks Configured</h4>
      <p class="empty-state-description">Add your first webhook to receive real-time updates</p>
      <button class="btn btn-primary" onclick="showWebhookModal()">
        + Add Your First Webhook
      </button>
    </div>
  `;
}

async function showWebhookModal(webhookId = null) {
  let webhook = null;

  if (webhookId) {
    try {
      const response = await API.getWebhook(webhookId);
      if (response.success) {
        webhook = response.webhook;
      }
    } catch (error) {
      console.error('Error loading webhook:', error);
      showToast('error', 'Error', 'Failed to load webhook details');
      return;
    }
  }

  const isEdit = webhook !== null;

  const eventOptions = [
    'client.created',
    'client.updated',
    'audit.completed',
    'optimization.completed',
    'ranking.changed',
    'report.generated',
    'goal.completed',
    'autofix.applied'
  ];

  const formHTML = `
    <div class="form-group">
      <label for="webhook-name">Webhook Name</label>
      <input type="text" id="webhook-name" class="form-input"
             placeholder="My Webhook" value="${webhook?.name || ''}" required>
    </div>

    <div class="form-group">
      <label for="webhook-url">Webhook URL</label>
      <input type="url" id="webhook-url" class="form-input"
             placeholder="https://example.com/webhook" value="${webhook?.url || ''}" required>
    </div>

    <div class="form-group">
      <label for="webhook-events">Events to Subscribe</label>
      <div class="checkbox-group">
        ${eventOptions.map(event => `
          <label class="checkbox-label">
            <input type="checkbox" name="webhook-events" value="${event}"
                   ${webhook?.events?.includes(event) ? 'checked' : ''}>
            <span>${event}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="form-group">
      <label for="webhook-secret">Secret Key (optional)</label>
      <input type="text" id="webhook-secret" class="form-input"
             placeholder="Optional secret for signature verification" value="${webhook?.secret || ''}">
      <small class="form-help">Used to verify webhook authenticity</small>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="webhook-active" ${webhook?.status === 'active' || !webhook ? 'checked' : ''}>
        <span>Active</span>
      </label>
    </div>
  `;

  showModal(
    isEdit ? 'Edit Webhook' : 'Add Webhook',
    formHTML,
    async () => {
      const name = document.getElementById('webhook-name').value.trim();
      const url = document.getElementById('webhook-url').value.trim();
      const secret = document.getElementById('webhook-secret').value.trim();
      const active = document.getElementById('webhook-active').checked;

      const eventCheckboxes = document.querySelectorAll('input[name="webhook-events"]:checked');
      const events = Array.from(eventCheckboxes).map(cb => cb.value);

      if (!name || !url) {
        showToast('warning', 'Missing Fields', 'Please fill in all required fields');
        return false;
      }

      if (events.length === 0) {
        showToast('warning', 'No Events', 'Please select at least one event');
        return false;
      }

      try {
        const webhookData = {
          name,
          url,
          events,
          secret,
          status: active ? 'active' : 'inactive'
        };

        const response = isEdit
          ? await API.updateWebhook(webhookId, webhookData)
          : await API.createWebhook(webhookData);

        if (response.success) {
          showToast('success', isEdit ? 'Updated!' : 'Created!', `Webhook ${isEdit ? 'updated' : 'created'} successfully`);
          await loadWebhooksSection();
          return true;
        } else {
          throw new Error(response.error || 'Operation failed');
        }

      } catch (error) {
        console.error('Error saving webhook:', error);
        showToast('error', 'Failed', error.message);
        return false;
      }
    }
  );
}

async function editWebhook(webhookId) {
  await showWebhookModal(webhookId);
}

async function deleteWebhook(webhookId) {
  showConfirmModal(
    'Delete Webhook',
    'Are you sure you want to delete this webhook? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deleteWebhook(webhookId);

        if (response.success) {
          showToast('success', 'Deleted', 'Webhook has been deleted');

          // Remove the row with animation
          const row = document.querySelector(`tr[data-id="${webhookId}"]`);
          if (row) {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-50px)';
            setTimeout(() => {
              row.remove();
              const tbody = document.querySelector('.table tbody');
              if (tbody && tbody.children.length === 0) {
                loadWebhooksSection();
              }
            }, 300);
          }
        } else {
          throw new Error(response.error || 'Delete failed');
        }

      } catch (error) {
        console.error('Error deleting webhook:', error);
        showToast('error', 'Delete Failed', error.message);
      }
    }
  );
}

async function testWebhook(webhookId) {
  try {
    showToast('info', 'Testing...', 'Sending test payload to webhook');

    const response = await API.testWebhook(webhookId);

    if (response.success) {
      showToast('success', 'Test Successful', `Webhook responded with ${response.statusCode || 200}`);
    } else {
      throw new Error(response.error || 'Test failed');
    }

  } catch (error) {
    console.error('Error testing webhook:', error);
    showToast('error', 'Test Failed', error.message);
  }
}

async function viewWebhookLogs(webhookId) {
  try {
    showToast('info', 'Loading...', 'Fetching webhook delivery logs');

    const response = await API.getWebhookLogs(webhookId);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load logs');
    }

    const logs = response.logs || [];

    const logsHTML = `
      <div class="webhook-logs">
        <p class="logs-description">Last ${logs.length} deliveries</p>
        <div class="logs-table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Status</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length > 0 ? logs.map(log => `
                <tr>
                  <td>${formatDate(log.timestamp, 'long')}</td>
                  <td><code>${log.event}</code></td>
                  <td><span class="badge badge-${log.success ? 'success' : 'danger'}">${log.statusCode || 'N/A'}</span></td>
                  <td>${log.response || 'No response'}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="text-center">No delivery logs available</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;

    showModal('Webhook Delivery Logs', logsHTML);

  } catch (error) {
    console.error('Error loading webhook logs:', error);
    showToast('error', 'Failed', error.message);
  }
}

// ============================================
// EMAIL CAMPAIGNS SECTION
// ============================================

let currentCampaignsClient = null;

async function loadCampaignsSection() {
  console.log('📧 Loading campaigns section...');

  // Load client selector
  await loadCampaignsClientSelector();

  // Load campaigns if a client is selected
  const clientId = getCurrentClient();
  if (clientId) {
    currentCampaignsClient = clientId;
    await loadClientCampaigns(clientId);
  } else {
    showEmptyState('campaigns-content', '📧', 'Select a Client', 'Choose a client to manage email campaigns');
  }
}

async function loadCampaignsClientSelector() {
  const selector = document.getElementById('campaigns-client-selector');
  if (!selector) return;

  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      selector.innerHTML = '<option value="">No clients found</option>';
      return;
    }

    let html = '<option value="">Select a client...</option>';
    response.clients.forEach(client => {
      const selected = client.id === currentCampaignsClient ? 'selected' : '';
      html += `<option value="${client.id}" ${selected}>${client.name || client.id}</option>`;
    });

    selector.innerHTML = html;

    selector.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (clientId) {
        currentCampaignsClient = clientId;
        setCurrentClient(clientId);
        await loadClientCampaigns(clientId);
      } else {
        showEmptyState('campaigns-content', '📧', 'Select a Client', 'Choose a client to manage email campaigns');
      }
    });

  } catch (error) {
    console.error('Error loading client selector:', error);
    selector.innerHTML = '<option value="">Error loading clients</option>';
  }
}

async function loadClientCampaigns(clientId) {
  const container = document.getElementById('campaigns-content');
  if (!container) return;

  try {
    showLoading('campaigns-content');

    const response = await API.getCampaigns(clientId);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load campaigns');
    }

    const campaigns = response.campaigns || [];

    let html = `
      <div class="campaigns-container">
        <div class="campaigns-header">
          <h3>Email Campaigns</h3>
          <button class="btn btn-primary" onclick="showCampaignModal('${clientId}')">
            + Create Campaign
          </button>
        </div>

        <div class="campaigns-summary">
          ${buildCampaignsSummary(campaigns)}
        </div>

        <div class="campaigns-grid">
          ${campaigns.length > 0 ? campaigns.map(c => buildCampaignCard(c)).join('') : buildEmptyCampaignsState()}
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading campaigns:', error);
    showEmptyState('campaigns-content', '⚠️', 'Error', 'Failed to load campaigns');
  }
}

function buildCampaignsSummary(campaigns) {
  const total = campaigns.length;
  const sent = campaigns.filter(c => c.status === 'sent').length;
  const scheduled = campaigns.filter(c => c.status === 'scheduled').length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + (c.recipients || 0), 0);

  return `
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="summary-label">Total Campaigns</div>
        <div class="summary-value">${total}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Sent</div>
        <div class="summary-value text-success">${sent}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Scheduled</div>
        <div class="summary-value text-info">${scheduled}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Total Recipients</div>
        <div class="summary-value">${totalRecipients}</div>
      </div>
    </div>
  `;
}

function buildCampaignCard(campaign) {
  const statusColors = {
    draft: '#718096',
    scheduled: '#667eea',
    sending: '#fbbc04',
    sent: '#34a853',
    failed: '#ea4335'
  };

  const color = statusColors[campaign.status] || '#718096';
  const scheduledDate = campaign.scheduledDate ? formatDate(campaign.scheduledDate, 'short') : 'Not scheduled';

  return `
    <div class="campaign-card" data-id="${campaign.id}">
      <div class="campaign-header">
        <div>
          <h4 class="campaign-title">${campaign.name}</h4>
          <div class="campaign-meta">
            <span class="badge" style="background: ${color}20; color: ${color};">
              ${capitalize(campaign.status)}
            </span>
            <span class="badge badge-gray">
              ${campaign.recipients || 0} recipients
            </span>
          </div>
        </div>
        <div class="campaign-actions">
          ${campaign.status === 'draft' ? `
            <button class="btn btn-sm btn-success" onclick="sendCampaign('${campaign.id}')" title="Send">
              ▶️
            </button>
          ` : ''}
          <button class="btn btn-sm btn-info" onclick="viewCampaignStats('${campaign.id}')" title="Stats">
            📊
            </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCampaign('${campaign.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>

      <div class="campaign-body">
        <p>${campaign.subject || 'No subject'}</p>
      </div>

      <div class="campaign-footer">
        <span class="campaign-date">📅 ${scheduledDate}</span>
        ${campaign.stats ? `
          <span class="campaign-stats">
            ✉️ ${campaign.stats.sent || 0} sent
            | ✓ ${campaign.stats.opened || 0} opened
            | 🔗 ${campaign.stats.clicked || 0} clicked
          </span>
        ` : ''}
      </div>
    </div>
  `;
}

function buildEmptyCampaignsState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📧</div>
      <h4 class="empty-state-title">No Campaigns Yet</h4>
      <p class="empty-state-description">Create your first email campaign</p>
      <button class="btn btn-primary" onclick="showCampaignModal('${currentCampaignsClient}')">
        + Create Your First Campaign
      </button>
    </div>
  `;
}

async function showCampaignModal(clientId) {
  const formHTML = `
    <div class="form-group">
      <label for="campaign-name">Campaign Name</label>
      <input type="text" id="campaign-name" class="form-input"
             placeholder="Monthly Report" required>
    </div>

    <div class="form-group">
      <label for="campaign-subject">Email Subject</label>
      <input type="text" id="campaign-subject" class="form-input"
             placeholder="Your Monthly SEO Report" required>
    </div>

    <div class="form-group">
      <label for="campaign-template">Template</label>
      <select id="campaign-template" class="form-select">
        <option value="monthly-report">Monthly Report</option>
        <option value="weekly-summary">Weekly Summary</option>
        <option value="goal-achieved">Goal Achieved</option>
        <option value="custom">Custom</option>
      </select>
    </div>

    <div class="form-group">
      <label for="campaign-schedule">Schedule</label>
      <input type="datetime-local" id="campaign-schedule" class="form-input">
      <small class="form-help">Leave empty to send immediately</small>
    </div>
  `;

  showModal(
    'Create Campaign',
    formHTML,
    async () => {
      const name = document.getElementById('campaign-name').value.trim();
      const subject = document.getElementById('campaign-subject').value.trim();
      const template = document.getElementById('campaign-template').value;
      const schedule = document.getElementById('campaign-schedule').value;

      if (!name || !subject) {
        showToast('warning', 'Missing Fields', 'Please fill in all required fields');
        return false;
      }

      try {
        const campaignData = {
          name,
          subject,
          template,
          scheduledDate: schedule || null,
          status: schedule ? 'scheduled' : 'draft'
        };

        const response = await API.createCampaign(clientId, campaignData);

        if (response.success) {
          showToast('success', 'Created!', 'Campaign created successfully');
          await loadClientCampaigns(clientId);
          return true;
        } else {
          throw new Error(response.error || 'Creation failed');
        }

      } catch (error) {
        console.error('Error creating campaign:', error);
        showToast('error', 'Failed', error.message);
        return false;
      }
    }
  );
}

async function sendCampaign(campaignId) {
  showConfirmModal(
    'Send Campaign',
    'Are you sure you want to send this campaign now? This cannot be undone.',
    async () => {
      try {
        showToast('info', 'Sending...', 'Sending campaign emails');

        const response = await API.sendCampaign(currentCampaignsClient, campaignId);

        if (response.success) {
          showToast('success', 'Sent!', `Campaign sent to ${response.sentCount || 0} recipients`);
          await loadClientCampaigns(currentCampaignsClient);
        } else {
          throw new Error(response.error || 'Send failed');
        }

      } catch (error) {
        console.error('Error sending campaign:', error);
        showToast('error', 'Send Failed', error.message);
      }
    }
  );
}

async function viewCampaignStats(campaignId) {
  showToast('info', 'Coming Soon', 'Campaign statistics will be available soon');
}

async function deleteCampaign(campaignId) {
  showConfirmModal(
    'Delete Campaign',
    'Are you sure you want to delete this campaign?',
    async () => {
      try {
        const response = await API.deleteCampaign(currentCampaignsClient, campaignId);

        if (response.success) {
          showToast('success', 'Deleted', 'Campaign has been deleted');

          const card = document.querySelector(`[data-id="${campaignId}"]`);
          if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
              card.remove();
              if (document.querySelectorAll('.campaign-card').length === 0) {
                loadClientCampaigns(currentCampaignsClient);
              }
            }, 300);
          }
        } else {
          throw new Error(response.error || 'Delete failed');
        }

      } catch (error) {
        console.error('Error deleting campaign:', error);
        showToast('error', 'Delete Failed', error.message);
      }
    }
  );
}

// ============================================
// REPORTS SECTION
// ============================================

let currentReportsClient = null;

async function loadReportsSection() {
  console.log('📊 Loading reports section...');

  await loadReportsClientSelector();

  const clientId = getCurrentClient();
  if (clientId) {
    currentReportsClient = clientId;
    await loadClientReports(clientId);
  } else {
    showEmptyState('reports-content', '📊', 'Select a Client', 'Choose a client to view reports');
  }
}

async function loadReportsClientSelector() {
  const selector = document.getElementById('reports-client-selector');
  if (!selector) return;

  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      selector.innerHTML = '<option value="">No clients found</option>';
      return;
    }

    let html = '<option value="">Select a client...</option>';
    response.clients.forEach(client => {
      const selected = client.id === currentReportsClient ? 'selected' : '';
      html += `<option value="${client.id}" ${selected}>${client.name || client.id}</option>`;
    });

    selector.innerHTML = html;

    selector.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (clientId) {
        currentReportsClient = clientId;
        setCurrentClient(clientId);
        await loadClientReports(clientId);
      } else {
        showEmptyState('reports-content', '📊', 'Select a Client', 'Choose a client to view reports');
      }
    });

  } catch (error) {
    console.error('Error loading client selector:', error);
    selector.innerHTML = '<option value="">Error loading clients</option>';
  }
}

async function loadClientReports(clientId) {
  const container = document.getElementById('reports-content');
  if (!container) return;

  try {
    showLoading('reports-content');

    const response = await API.getReports(clientId);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load reports');
    }

    const reports = response.reports || [];

    let html = `
      <div class="reports-container">
        <div class="reports-header">
          <h3>Reports</h3>
          <button class="btn btn-primary" onclick="generateNewReport('${clientId}')">
            + Generate Report
          </button>
        </div>

        <div class="reports-grid">
          ${reports.length > 0 ? reports.map(r => buildReportCard(r)).join('') : buildEmptyReportsState()}
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading reports:', error);
    showEmptyState('reports-content', '⚠️', 'Error', 'Failed to load reports');
  }
}

function buildReportCard(report) {
  const typeIcons = {
    monthly: '📊',
    weekly: '📈',
    audit: '🔍',
    custom: '📄'
  };

  const icon = typeIcons[report.type] || '📄';

  return `
    <div class="report-card" data-id="${report.id}">
      <div class="report-icon">${icon}</div>
      <div class="report-content">
        <h4 class="report-title">${report.name}</h4>
        <div class="report-meta">
          <span class="badge badge-gray">${capitalize(report.type)}</span>
          <span class="report-date">📅 ${formatDate(report.createdAt, 'short')}</span>
        </div>
        <div class="report-stats">
          <span>${report.pages || 0} pages</span>
          <span>•</span>
          <span>${formatFileSize(report.size || 0)}</span>
        </div>
      </div>
      <div class="report-actions">
        <button class="btn btn-sm btn-primary" onclick="downloadReport('${report.id}')" title="Download">
          ⬇️ Download
        </button>
        <button class="btn btn-sm btn-secondary" onclick="viewReport('${report.id}')" title="Preview">
          👁️
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteReport('${report.id}')" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `;
}

function buildEmptyReportsState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <h4 class="empty-state-title">No Reports Generated</h4>
      <p class="empty-state-description">Generate your first report</p>
      <button class="btn btn-primary" onclick="generateNewReport('${currentReportsClient}')">
        + Generate Report
      </button>
    </div>
  `;
}

async function generateNewReport(clientId) {
  if (!clientId) {
    showToast('warning', 'No Client', 'Please select a client first');
    return;
  }

  const formHTML = `
    <div class="form-group">
      <label for="report-type">Report Type</label>
      <select id="report-type" class="form-select">
        <option value="monthly">Monthly Report</option>
        <option value="weekly">Weekly Summary</option>
        <option value="audit">Full Audit</option>
        <option value="custom">Custom Report</option>
      </select>
    </div>

    <div class="form-group">
      <label for="report-format">Format</label>
      <select id="report-format" class="form-select">
        <option value="pdf">PDF</option>
        <option value="html">HTML</option>
        <option value="docx">Word Document</option>
      </select>
    </div>

    <div class="form-group">
      <label>Include Sections</label>
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" name="report-sections" value="overview" checked>
          <span>Overview</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="report-sections" value="rankings" checked>
          <span>Rankings</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="report-sections" value="local-seo" checked>
          <span>Local SEO</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="report-sections" value="recommendations">
          <span>Recommendations</span>
        </label>
      </div>
    </div>
  `;

  showModal(
    'Generate Report',
    formHTML,
    async () => {
      const type = document.getElementById('report-type').value;
      const format = document.getElementById('report-format').value;

      const sectionCheckboxes = document.querySelectorAll('input[name="report-sections"]:checked');
      const sections = Array.from(sectionCheckboxes).map(cb => cb.value);

      try {
        showToast('info', 'Generating...', 'Creating your report');

        const response = await API.generateReport(clientId, {
          type,
          format,
          sections
        });

        if (response.success) {
          showToast('success', 'Generated!', 'Report has been generated');
          await loadClientReports(clientId);
          return true;
        } else {
          throw new Error(response.error || 'Generation failed');
        }

      } catch (error) {
        console.error('Error generating report:', error);
        showToast('error', 'Failed', error.message);
        return false;
      }
    }
  );
}

async function downloadReport(reportId) {
  try {
    showToast('info', 'Downloading...', 'Preparing report download');

    const response = await API.downloadReport(currentReportsClient, reportId);

    if (response.success) {
      // Trigger download
      const filename = response.filename || `report-${reportId}.pdf`;
      downloadFile(response.data, filename, 'application/pdf');

      showToast('success', 'Downloaded!', 'Report downloaded successfully');
    } else {
      throw new Error(response.error || 'Download failed');
    }

  } catch (error) {
    console.error('Error downloading report:', error);
    showToast('error', 'Download Failed', error.message);
  }
}

async function viewReport(reportId) {
  showToast('info', 'Coming Soon', 'Report preview will be available soon');
}

async function deleteReport(reportId) {
  showConfirmModal(
    'Delete Report',
    'Are you sure you want to delete this report?',
    async () => {
      try {
        const response = await API.deleteReport(currentReportsClient, reportId);

        if (response.success) {
          showToast('success', 'Deleted', 'Report has been deleted');

          const card = document.querySelector(`[data-id="${reportId}"]`);
          if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
              card.remove();
              if (document.querySelectorAll('.report-card').length === 0) {
                loadClientReports(currentReportsClient);
              }
            }, 300);
          }
        } else {
          throw new Error(response.error || 'Delete failed');
        }

      } catch (error) {
        console.error('Error deleting report:', error);
        showToast('error', 'Delete Failed', error.message);
      }
    }
  );
}

// ============================================
// WHITE-LABEL SECTION
// ============================================

async function loadWhiteLabelSection() {
  console.log('🎨 Loading white-label section...');

  const container = document.getElementById('whitelabel-content');
  if (!container) return;

  try {
    showLoading('whitelabel-content');

    // Load current settings
    const response = await API.getWhiteLabelSettings();

    if (!response.success) {
      throw new Error(response.error || 'Failed to load settings');
    }

    const settings = response.settings || {};

    let html = `
      <div class="whitelabel-container">
        <div class="whitelabel-header">
          <h3>White-Label Settings</h3>
          <button class="btn btn-success" onclick="saveWhiteLabelSettings()">
            💾 Save Changes
          </button>
        </div>

        <div class="whitelabel-sections">
          <!-- Branding Section -->
          <div class="settings-card">
            <h4>Branding</h4>
            <div class="form-group">
              <label for="wl-company-name">Company Name</label>
              <input type="text" id="wl-company-name" class="form-input"
                     value="${settings.companyName || ''}" placeholder="Your Company Name">
            </div>
            <div class="form-group">
              <label for="wl-logo">Logo URL</label>
              <input type="url" id="wl-logo" class="form-input"
                     value="${settings.logoUrl || ''}" placeholder="https://example.com/logo.png">
              <small class="form-help">Recommended size: 200x50px</small>
            </div>
            <div class="form-group">
              <label for="wl-favicon">Favicon URL</label>
              <input type="url" id="wl-favicon" class="form-input"
                     value="${settings.faviconUrl || ''}" placeholder="https://example.com/favicon.ico">
            </div>
          </div>

          <!-- Colors Section -->
          <div class="settings-card">
            <h4>Colors</h4>
            <div class="form-group">
              <label for="wl-primary-color">Primary Color</label>
              <input type="color" id="wl-primary-color" class="form-input-color"
                     value="${settings.primaryColor || '#667eea'}">
            </div>
            <div class="form-group">
              <label for="wl-secondary-color">Secondary Color</label>
              <input type="color" id="wl-secondary-color" class="form-input-color"
                     value="${settings.secondaryColor || '#764ba2'}">
            </div>
          </div>

          <!-- Contact Info Section -->
          <div class="settings-card">
            <h4>Contact Information</h4>
            <div class="form-group">
              <label for="wl-email">Support Email</label>
              <input type="email" id="wl-email" class="form-input"
                     value="${settings.supportEmail || ''}" placeholder="support@yourcompany.com">
            </div>
            <div class="form-group">
              <label for="wl-phone">Support Phone</label>
              <input type="tel" id="wl-phone" class="form-input"
                     value="${settings.supportPhone || ''}" placeholder="+1 (555) 123-4567">
            </div>
            <div class="form-group">
              <label for="wl-website">Website</label>
              <input type="url" id="wl-website" class="form-input"
                     value="${settings.website || ''}" placeholder="https://yourcompany.com">
            </div>
          </div>

          <!-- Email Settings Section -->
          <div class="settings-card">
            <h4>Email Settings</h4>
            <div class="form-group">
              <label for="wl-email-from">From Email</label>
              <input type="email" id="wl-email-from" class="form-input"
                     value="${settings.emailFrom || ''}" placeholder="noreply@yourcompany.com">
            </div>
            <div class="form-group">
              <label for="wl-email-signature">Email Signature</label>
              <textarea id="wl-email-signature" class="form-textarea" rows="4"
                        placeholder="Best regards,\nYour Company Team">${settings.emailSignature || ''}</textarea>
            </div>
          </div>

          <!-- Preview Section -->
          <div class="settings-card">
            <h4>Preview</h4>
            <div class="whitelabel-preview">
              <div class="preview-header" style="background: linear-gradient(135deg, ${settings.primaryColor || '#667eea'}, ${settings.secondaryColor || '#764ba2'});">
                ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="preview-logo">` : '<div class="preview-logo-placeholder">Your Logo</div>'}
              </div>
              <div class="preview-body">
                <h3>${settings.companyName || 'Your Company Name'}</h3>
                <p>📧 ${settings.supportEmail || 'support@yourcompany.com'}</p>
                <p>📞 ${settings.supportPhone || '+1 (555) 123-4567'}</p>
                <p>🌐 ${settings.website || 'https://yourcompany.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Add live preview updates
    addWhiteLabelPreviewListeners();

  } catch (error) {
    console.error('Error loading white-label settings:', error);
    showEmptyState('whitelabel-content', '⚠️', 'Error', 'Failed to load white-label settings');
  }
}

function addWhiteLabelPreviewListeners() {
  const inputs = {
    'wl-company-name': (val) => document.querySelector('.preview-body h3').textContent = val || 'Your Company Name',
    'wl-primary-color': (val) => updatePreviewGradient(),
    'wl-secondary-color': (val) => updatePreviewGradient(),
    'wl-logo': (val) => {
      const logoContainer = document.querySelector('.preview-header');
      if (val) {
        logoContainer.innerHTML = `<img src="${val}" alt="Logo" class="preview-logo">`;
      } else {
        logoContainer.innerHTML = '<div class="preview-logo-placeholder">Your Logo</div>';
      }
    }
  };

  Object.keys(inputs).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', (e) => inputs[id](e.target.value));
    }
  });
}

function updatePreviewGradient() {
  const primary = document.getElementById('wl-primary-color')?.value || '#667eea';
  const secondary = document.getElementById('wl-secondary-color')?.value || '#764ba2';
  const header = document.querySelector('.preview-header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
  }
}

async function saveWhiteLabelSettings() {
  try {
    showToast('info', 'Saving...', 'Updating white-label settings');

    const settings = {
      companyName: document.getElementById('wl-company-name')?.value,
      logoUrl: document.getElementById('wl-logo')?.value,
      faviconUrl: document.getElementById('wl-favicon')?.value,
      primaryColor: document.getElementById('wl-primary-color')?.value,
      secondaryColor: document.getElementById('wl-secondary-color')?.value,
      supportEmail: document.getElementById('wl-email')?.value,
      supportPhone: document.getElementById('wl-phone')?.value,
      website: document.getElementById('wl-website')?.value,
      emailFrom: document.getElementById('wl-email-from')?.value,
      emailSignature: document.getElementById('wl-email-signature')?.value
    };

    const response = await API.updateWhiteLabelSettings(settings);

    if (response.success) {
      showToast('success', 'Saved!', 'White-label settings updated successfully');
    } else {
      throw new Error(response.error || 'Save failed');
    }

  } catch (error) {
    console.error('Error saving white-label settings:', error);
    showToast('error', 'Save Failed', error.message);
  }
}

console.log('🔗 Webhooks.js and all remaining sections fully loaded');
