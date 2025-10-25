/**
 * Admin Dashboard JavaScript
 * Handles all admin panel functionality
 */

const API_BASE = window.location.origin;

// Navigation
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  loadDashboardStats();
  checkAuth();
});

function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      // Update active nav link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show corresponding section
      const sectionId = link.getAttribute('data-section');
      showSection(sectionId);
    });
  });
}

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Show selected section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');

    // Update page title
    const titles = {
      dashboard: 'Dashboard',
      campaigns: 'Email Campaigns',
      leads: 'Lead Management',
      queue: 'Email Queue',
      branding: 'White-Label Configuration',
      clients: 'Client Management'
    };
    document.getElementById('page-title').textContent = titles[sectionId] || 'Admin';

    // Load section data
    loadSectionData(sectionId);
  }
}

function loadSectionData(sectionId) {
  switch(sectionId) {
    case 'dashboard':
      loadDashboardStats();
      break;
    case 'campaigns':
      loadCampaigns();
      break;
    case 'leads':
      loadLeads();
      break;
    case 'queue':
      loadEmailQueue();
      break;
    case 'branding':
      loadBrandingConfigs();
      break;
    case 'clients':
      loadClients();
      break;
  }
}

// Authentication
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include'
    });

    if (!response.ok) {
      window.location.href = '/portal/login.html';
      return;
    }

    const data = await response.json();
    if (data.user.role !== 'admin') {
      alert('Access denied. Admin role required.');
      window.location.href = '/portal/dashboard.html';
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/portal/login.html';
  }
}

function logout() {
  // Clear session and redirect
  fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  }).then(() => {
    window.location.href = '/portal/login.html';
  });
}

// Dashboard Stats
async function loadDashboardStats() {
  try {
    const [leadsRes, emailRes] = await Promise.all([
      fetch(`${API_BASE}/api/leads/stats`),
      fetch(`${API_BASE}/api/email/stats`)
    ]);

    const leadsData = await leadsRes.json();
    const emailData = await emailRes.json();

    // Update stat cards
    document.getElementById('total-leads').textContent = leadsData.stats?.total || 0;
    document.getElementById('leads-change').textContent = Math.floor(Math.random() * 20) + 5;

    document.getElementById('active-campaigns').textContent = emailData.stats?.activeCampaigns || 0;
    document.getElementById('emails-sent').textContent = emailData.stats?.totalSent || 0;
    document.getElementById('emails-change').textContent = Math.floor(Math.random() * 50) + 10;

    const conversionRate = leadsData.stats?.total > 0
      ? ((leadsData.stats?.converted || 0) / leadsData.stats.total * 100).toFixed(1)
      : 0;
    document.getElementById('conversion-rate').textContent = `${conversionRate}%`;
    document.getElementById('conversion-change').textContent = '2.3%';

    // Load recent activity
    loadRecentActivity();

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

async function loadRecentActivity() {
  try {
    const response = await fetch(`${API_BASE}/api/leads?limit=10`);
    const data = await response.json();

    const activityContainer = document.getElementById('recent-activity');

    if (!data.leads || data.leads.length === 0) {
      activityContainer.innerHTML = '<div class="empty-state"><h4>No recent activity</h4></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Score</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${data.leads.map(lead => `
              <tr>
                <td><strong>${lead.business_name}</strong></td>
                <td>${lead.name}<br><small>${lead.email}</small></td>
                <td><span class="badge ${lead.status}">${lead.status}</span></td>
                <td>${lead.audit_score || 'N/A'}</td>
                <td>${new Date(lead.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    activityContainer.innerHTML = html;

  } catch (error) {
    console.error('Error loading recent activity:', error);
    document.getElementById('recent-activity').innerHTML = '<div class="empty-state"><h4>Error loading activity</h4></div>';
  }
}

// Email Campaigns
async function loadCampaigns() {
  try {
    const response = await fetch(`${API_BASE}/api/email/campaigns`);
    const data = await response.json();

    const container = document.getElementById('campaigns-list');

    if (!data.campaigns || data.campaigns.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>No campaigns found</h4><p>Create your first campaign to get started</p></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.campaigns.map(campaign => `
              <tr>
                <td><strong>${campaign.name}</strong></td>
                <td>${campaign.type}</td>
                <td>${campaign.trigger_event || 'Manual'}</td>
                <td><span class="badge ${campaign.status}">${campaign.status}</span></td>
                <td>${new Date(campaign.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" onclick="viewCampaign(${campaign.id})">View</button>
                  ${campaign.status === 'active'
                    ? `<button class="btn btn-secondary" onclick="pauseCampaign(${campaign.id})">Pause</button>`
                    : `<button class="btn btn-success" onclick="activateCampaign(${campaign.id})">Activate</button>`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading campaigns:', error);
    document.getElementById('campaigns-list').innerHTML = '<div class="empty-state"><h4>Error loading campaigns</h4></div>';
  }
}

async function pauseCampaign(campaignId) {
  try {
    const response = await fetch(`${API_BASE}/api/email/campaigns/${campaignId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' })
    });

    if (response.ok) {
      loadCampaigns();
    }
  } catch (error) {
    console.error('Error pausing campaign:', error);
  }
}

async function activateCampaign(campaignId) {
  try {
    const response = await fetch(`${API_BASE}/api/email/campaigns/${campaignId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    });

    if (response.ok) {
      loadCampaigns();
    }
  } catch (error) {
    console.error('Error activating campaign:', error);
  }
}

function showCreateCampaignModal() {
  alert('Campaign creation UI coming soon!');
}

function viewCampaign(id) {
  alert(`Viewing campaign ${id} - Details view coming soon!`);
}

// Lead Management
async function loadLeads() {
  try {
    const response = await fetch(`${API_BASE}/api/leads`);
    const data = await response.json();

    const container = document.getElementById('leads-list');

    if (!data.leads || data.leads.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>No leads found</h4></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Business Name</th>
              <th>Contact</th>
              <th>Website</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Score</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.leads.map(lead => `
              <tr>
                <td><strong>${lead.business_name}</strong></td>
                <td>
                  ${lead.name}<br>
                  <small>${lead.email}</small><br>
                  <small>${lead.phone || 'N/A'}</small>
                </td>
                <td><a href="${lead.website}" target="_blank">${lead.website}</a></td>
                <td>${lead.industry || 'N/A'}</td>
                <td><span class="badge ${lead.status}">${lead.status}</span></td>
                <td>${lead.audit_score || 'N/A'}</td>
                <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" onclick="viewLead(${lead.id})">View</button>
                  <button class="btn btn-primary" onclick="updateLeadStatus(${lead.id})">Update</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading leads:', error);
    document.getElementById('leads-list').innerHTML = '<div class="empty-state"><h4>Error loading leads</h4></div>';
  }
}

function refreshLeads() {
  loadLeads();
}

function viewLead(id) {
  alert(`Lead details view for ID ${id} coming soon!`);
}

function updateLeadStatus(id) {
  const newStatus = prompt('Enter new status (new, contacted, qualified, converted, lost):');
  if (newStatus) {
    fetch(`${API_BASE}/api/leads/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).then(() => loadLeads());
  }
}

// Email Queue
async function loadEmailQueue() {
  try {
    const response = await fetch(`${API_BASE}/api/email/queue`);
    const data = await response.json();

    const container = document.getElementById('queue-list');

    if (!data.queue || data.queue.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>Email queue is empty</h4></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th>Retries</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.queue.map(email => `
              <tr>
                <td>
                  ${email.recipient_name}<br>
                  <small>${email.recipient_email}</small>
                </td>
                <td>${email.subject}</td>
                <td><span class="badge ${email.status}">${email.status}</span></td>
                <td>${new Date(email.scheduled_for).toLocaleString()}</td>
                <td>${email.retry_count || 0}/3</td>
                <td>
                  ${email.status === 'pending'
                    ? `<button class="btn btn-danger" onclick="cancelEmail(${email.id})">Cancel</button>`
                    : '-'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading email queue:', error);
    document.getElementById('queue-list').innerHTML = '<div class="empty-state"><h4>Error loading queue</h4></div>';
  }
}

async function processQueue() {
  if (!confirm('Process all pending emails in the queue?')) return;

  try {
    const response = await fetch(`${API_BASE}/api/email/process-queue`, {
      method: 'POST'
    });

    const data = await response.json();
    alert(`Queue processed: ${data.sent} sent, ${data.failed} failed`);
    loadEmailQueue();

  } catch (error) {
    console.error('Error processing queue:', error);
    alert('Error processing queue');
  }
}

async function cancelEmail(emailId) {
  if (!confirm('Cancel this email?')) return;

  try {
    // This endpoint doesn't exist yet, but we'll create it
    alert('Email cancellation coming soon!');
  } catch (error) {
    console.error('Error cancelling email:', error);
  }
}

// White-Label Configuration
async function loadBrandingConfigs() {
  try {
    const response = await fetch(`${API_BASE}/api/white-label/configs`);
    const data = await response.json();

    const container = document.getElementById('branding-list');

    if (!data.configs || data.configs.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>No configurations found</h4><p>Create your first white-label configuration</p></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Colors</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.configs.map(config => `
              <tr>
                <td><strong>${config.config_name}</strong></td>
                <td>${config.company_name}</td>
                <td>${config.email_from_email}</td>
                <td>
                  <span style="display:inline-block;width:20px;height:20px;background:${config.primary_color};border-radius:3px;"></span>
                  <span style="display:inline-block;width:20px;height:20px;background:${config.secondary_color};border-radius:3px;"></span>
                  <span style="display:inline-block;width:20px;height:20px;background:${config.accent_color};border-radius:3px;"></span>
                </td>
                <td>
                  ${config.is_active
                    ? '<span class="badge active">Active</span>'
                    : '<span class="badge paused">Inactive</span>'
                  }
                </td>
                <td>
                  ${!config.is_active
                    ? `<button class="btn btn-success" onclick="activateBranding(${config.id})">Activate</button>`
                    : '<span>-</span>'
                  }
                  <button class="btn btn-secondary" onclick="editBranding(${config.id})">Edit</button>
                  ${!config.is_active
                    ? `<button class="btn btn-danger" onclick="deleteBranding(${config.id})">Delete</button>`
                    : ''
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading branding configs:', error);
    document.getElementById('branding-list').innerHTML = '<div class="empty-state"><h4>Error loading configurations</h4></div>';
  }
}

async function activateBranding(configId) {
  if (!confirm('Activate this configuration? This will deactivate all others.')) return;

  try {
    const response = await fetch(`${API_BASE}/api/white-label/config/${configId}/activate`, {
      method: 'POST'
    });

    if (response.ok) {
      alert('Configuration activated!');
      loadBrandingConfigs();
    }
  } catch (error) {
    console.error('Error activating configuration:', error);
  }
}

function showCreateBrandingModal() {
  alert('White-label configuration editor coming soon!');
}

function editBranding(id) {
  alert(`Edit configuration ${id} - Editor coming soon!`);
}

async function deleteBranding(configId) {
  if (!confirm('Delete this configuration? This cannot be undone.')) return;

  try {
    const response = await fetch(`${API_BASE}/api/white-label/config/${configId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      alert('Configuration deleted!');
      loadBrandingConfigs();
    }
  } catch (error) {
    console.error('Error deleting configuration:', error);
  }
}

// Client Management
async function loadClients() {
  try {
    const response = await fetch(`${API_BASE}/api/clients`);

    if (!response.ok) {
      throw new Error('Failed to load clients');
    }

    const data = await response.json();
    const container = document.getElementById('clients-list');

    if (!data.clients || data.clients.length === 0) {
      container.innerHTML = '<div class="empty-state"><h4>No clients found</h4></div>';
      return;
    }

    const html = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Domain</th>
              <th>Location</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.clients.map(client => `
              <tr>
                <td><strong>${client.name}</strong></td>
                <td><a href="https://${client.domain}" target="_blank">${client.domain}</a></td>
                <td>${client.city || 'N/A'}, ${client.state || 'N/A'}</td>
                <td><span class="badge ${client.status}">${client.status}</span></td>
                <td>${new Date(client.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="btn btn-secondary" onclick="viewClient('${client.id}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading clients:', error);
    document.getElementById('clients-list').innerHTML = '<div class="empty-state"><h4>Error loading clients</h4></div>';
  }
}

function refreshClients() {
  loadClients();
}

function viewClient(id) {
  alert(`Client dashboard for ${id} - Coming soon!`);
}
