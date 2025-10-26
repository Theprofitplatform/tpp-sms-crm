/**
 * Unified Dashboard - Clients Section
 *
 * Load and manage clients
 */

async function loadClientsSection() {
  console.log('🏢 Loading clients section...');

  const container = document.getElementById('clients-table-body');
  if (!container) return;

  try {
    showLoading('clients-table-container');

    const response = await API.getClients();

    if (!response.success || !response.clients || response.clients.length === 0) {
      hideLoading('clients-table-container');
      showEmptyState('clients-table-container', '🏢', 'No Clients', 'No clients found. Add your first client to get started.');
      return;
    }

    const clients = response.clients;

    let html = '';
    clients.forEach(client => {
      html += `
        <tr>
          <td>${client.name || client.id}</td>
          <td>${client.domain || 'N/A'}</td>
          <td>${getBadgeHTML(client.status, 'client')}</td>
          <td>${client.envConfigured ? '✓ Configured' : '⚠ Not Configured'}</td>
          <td>${client.reportCount || 0}</td>
          <td>${formatDate(client.lastAudit, 'short')}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="viewClient('${client.id}')">View</button>
            <button class="btn btn-sm btn-primary" onclick="showClientModal(${JSON.stringify(client).replace(/"/g, '&quot;')})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteClient('${client.id}')">Delete</button>
          </td>
        </tr>
      `;
    });

    hideLoading('clients-table-container');
    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading clients:', error);
    showEmptyState('clients-table-container', '⚠️', 'Error', 'Failed to load clients');
  }
}

function viewClient(clientId) {
  setCurrentClient(clientId);
  navigateTo('analytics');
}

async function deleteClient(clientId) {
  showConfirmModal(
    'Delete Client',
    `Are you sure you want to delete this client? This action cannot be undone.`,
    async () => {
      try {
        await API.deleteClient(clientId);
        showToast('success', 'Client Deleted', 'Client has been deleted successfully');
        EventBus.emit('clients-changed');
      } catch (error) {
        showToast('error', 'Delete Failed', error.message);
      }
    }
  );
}

console.log('🏢 Clients.js loaded successfully');
