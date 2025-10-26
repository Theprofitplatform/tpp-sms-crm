/**
 * Unified Dashboard - Modal System
 *
 * Modal creation, management, and form handling
 */

// ============================================
// Modal Management
// ============================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal with id "${modalId}" not found`);
    return;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus first input
  const firstInput = modal.querySelector('input, textarea, select');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Clear form if exists
  const form = modal.querySelector('form');
  if (form) {
    form.reset();
  }
}

function closeAllModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    modal.classList.remove('active');
  });
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeAllModals();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// ============================================
// Modal Generators
// ============================================

/**
 * Create a confirmation modal
 */
function showConfirmModal(title, message, onConfirm, onCancel) {
  const modalId = 'confirm-modal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
        <button class="btn btn-danger" id="confirm-btn">Confirm</button>
      </div>
    </div>
  `;

  openModal(modalId);

  // Handle confirm button
  document.getElementById('confirm-btn').onclick = () => {
    closeModal(modalId);
    if (onConfirm) onConfirm();
  };
}

/**
 * Create client modal
 */
function showClientModal(client = null) {
  const modalId = 'client-modal';
  const isEdit = client !== null;
  const title = isEdit ? 'Edit Client' : 'Add New Client';

  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <form id="client-form">
          <div class="form-group">
            <label class="form-label required">Client ID</label>
            <input type="text" class="form-input" name="id" value="${client?.id || ''}" ${isEdit ? 'readonly' : ''} required>
          </div>

          <div class="form-group">
            <label class="form-label required">Client Name</label>
            <input type="text" class="form-input" name="name" value="${client?.name || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Domain</label>
            <input type="url" class="form-input" name="domain" value="${client?.domain || ''}" placeholder="https://example.com">
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" name="status">
              <option value="active" ${client?.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${client?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="pending-setup" ${client?.status === 'pending-setup' ? 'selected' : ''}>Pending Setup</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-textarea" name="notes">${client?.notes || ''}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
        <button class="btn btn-primary" onclick="handleClientFormSubmit('${isEdit}')">
          ${isEdit ? 'Update' : 'Create'} Client
        </button>
      </div>
    </div>
  `;

  openModal(modalId);
}

async function handleClientFormSubmit(isEdit) {
  const form = document.getElementById('client-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    if (isEdit === 'true') {
      await API.updateClient(data.id, data);
      showToast('success', 'Client Updated', `${data.name} has been updated successfully`);
    } else {
      await API.createClient(data);
      showToast('success', 'Client Created', `${data.name} has been created successfully`);
    }

    closeModal('client-modal');
    EventBus.emit('clients-changed');
  } catch (error) {
    console.error('Error saving client:', error);
  }
}

/**
 * Create goal modal
 */
function showGoalModal(clientId, goal = null) {
  const modalId = 'goal-modal';
  const isEdit = goal !== null;
  const title = isEdit ? 'Edit Goal' : 'Create New Goal';

  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <form id="goal-form">
          <input type="hidden" name="clientId" value="${clientId}">
          ${isEdit ? `<input type="hidden" name="id" value="${goal.id}">` : ''}

          <div class="form-group">
            <label class="form-label required">Goal Title</label>
            <input type="text" class="form-input" name="title" value="${goal?.title || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" name="description">${goal?.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label required">Target Value</label>
            <input type="number" class="form-input" name="target" value="${goal?.target || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Current Progress</label>
            <input type="number" class="form-input" name="current" value="${goal?.current || 0}">
          </div>

          <div class="form-group">
            <label class="form-label">Deadline</label>
            <input type="date" class="form-input" name="deadline" value="${goal?.deadline || ''}">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
        <button class="btn btn-primary" onclick="handleGoalFormSubmit()">
          ${isEdit ? 'Update' : 'Create'} Goal
        </button>
      </div>
    </div>
  `;

  openModal(modalId);
}

async function handleGoalFormSubmit() {
  const form = document.getElementById('goal-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    await API.createGoal(data.clientId, data);
    showToast('success', 'Goal Created', 'Goal has been created successfully');
    closeModal('goal-modal');
    EventBus.emit('goals-changed', data.clientId);
  } catch (error) {
    console.error('Error creating goal:', error);
  }
}

/**
 * Create webhook modal
 */
function showWebhookModal(webhook = null) {
  const modalId = 'webhook-modal';
  const isEdit = webhook !== null;
  const title = isEdit ? 'Edit Webhook' : 'Create New Webhook';

  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const eventOptions = CONFIG.WEBHOOK_EVENTS.map(event =>
    `<option value="${event}" ${webhook?.event === event ? 'selected' : ''}>${event}</option>`
  ).join('');

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <form id="webhook-form">
          ${isEdit ? `<input type="hidden" name="id" value="${webhook.id}">` : ''}

          <div class="form-group">
            <label class="form-label required">Webhook URL</label>
            <input type="url" class="form-input" name="url" value="${webhook?.url || ''}" placeholder="https://your-server.com/webhook" required>
          </div>

          <div class="form-group">
            <label class="form-label required">Event Type</label>
            <select class="form-select" name="event" required>
              <option value="">Select an event...</option>
              ${eventOptions}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Secret Key (Optional)</label>
            <input type="text" class="form-input" name="secret" value="${webhook?.secret || ''}" placeholder="For webhook verification">
            <span class="form-help">Used to verify webhook authenticity</span>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
        <button class="btn btn-primary" onclick="handleWebhookFormSubmit()">
          ${isEdit ? 'Update' : 'Create'} Webhook
        </button>
      </div>
    </div>
  `;

  openModal(modalId);
}

async function handleWebhookFormSubmit() {
  const form = document.getElementById('webhook-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    await API.createWebhook(data);
    showToast('success', 'Webhook Created', 'Webhook has been created successfully');
    closeModal('webhook-modal');
    EventBus.emit('webhooks-changed');
  } catch (error) {
    console.error('Error creating webhook:', error);
  }
}

/**
 * Show campaign modal
 */
function showCampaignModal(campaign = null) {
  const modalId = 'campaign-modal';
  const isEdit = campaign !== null;
  const title = isEdit ? 'Edit Campaign' : 'Create New Campaign';

  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
      </div>
      <div class="modal-body">
        <form id="campaign-form">
          ${isEdit ? `<input type="hidden" name="id" value="${campaign.id}">` : ''}

          <div class="form-group">
            <label class="form-label required">Campaign Name</label>
            <input type="text" class="form-input" name="name" value="${campaign?.name || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label required">Subject Line</label>
            <input type="text" class="form-input" name="subject" value="${campaign?.subject || ''}" required>
          </div>

          <div class="form-group">
            <label class="form-label required">Email Template</label>
            <select class="form-select" name="template" required>
              <option value="">Select a template...</option>
              <option value="welcome" ${campaign?.template === 'welcome' ? 'selected' : ''}>Welcome Email</option>
              <option value="follow-up" ${campaign?.template === 'follow-up' ? 'selected' : ''}>Follow-up</option>
              <option value="proposal" ${campaign?.template === 'proposal' ? 'selected' : ''}>Proposal</option>
              <option value="report" ${campaign?.template === 'report' ? 'selected' : ''}>Monthly Report</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" name="status">
              <option value="draft" ${campaign?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${campaign?.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="paused" ${campaign?.status === 'paused' ? 'selected' : ''}>Paused</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cancel</button>
        <button class="btn btn-primary" onclick="handleCampaignFormSubmit()">
          ${isEdit ? 'Update' : 'Create'} Campaign
        </button>
      </div>
    </div>
  `;

  openModal(modalId);
}

async function handleCampaignFormSubmit() {
  const form = document.getElementById('campaign-form');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    if (data.id) {
      await API.updateCampaign(data.id, data);
      showToast('success', 'Campaign Updated', 'Campaign has been updated successfully');
    } else {
      await API.createCampaign(data);
      showToast('success', 'Campaign Created', 'Campaign has been created successfully');
    }

    closeModal('campaign-modal');
    EventBus.emit('campaigns-changed');
  } catch (error) {
    console.error('Error saving campaign:', error);
  }
}
