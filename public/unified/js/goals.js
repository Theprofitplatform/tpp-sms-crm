/**
 * Unified Dashboard - Goals Section
 *
 * Goal tracking with progress monitoring
 */

let currentGoalsClient = null;

async function loadGoalsSection() {
  console.log('🎯 Loading goals section...');

  // Load client selector
  await loadGoalsClientSelector();

  // Load goals if a client is selected
  const clientId = getCurrentClient();
  if (clientId) {
    currentGoalsClient = clientId;
    await loadClientGoals(clientId);
  } else {
    showEmptyState('goals-content', '🎯', 'Select a Client', 'Choose a client to view and manage goals');
  }
}

// ============================================
// Client Selector
// ============================================

async function loadGoalsClientSelector() {
  const selector = document.getElementById('goals-client-selector');
  if (!selector) return;

  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      selector.innerHTML = '<option value="">No clients found</option>';
      return;
    }

    let html = '<option value="">Select a client...</option>';
    response.clients.forEach(client => {
      const selected = client.id === currentGoalsClient ? 'selected' : '';
      html += `<option value="${client.id}" ${selected}>${client.name || client.id}</option>`;
    });

    selector.innerHTML = html;

    // Add event listener
    selector.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (clientId) {
        currentGoalsClient = clientId;
        setCurrentClient(clientId);
        await loadClientGoals(clientId);
      } else {
        showEmptyState('goals-content', '🎯', 'Select a Client', 'Choose a client to view and manage goals');
      }
    });

  } catch (error) {
    console.error('Error loading client selector:', error);
    selector.innerHTML = '<option value="">Error loading clients</option>';
  }
}

// ============================================
// Load Goals
// ============================================

async function loadClientGoals(clientId) {
  const container = document.getElementById('goals-content');
  if (!container) return;

  try {
    showLoading('goals-content');

    // Load goals
    const response = await API.getGoals(clientId);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load goals');
    }

    const goals = response.goals || [];

    // Build goals UI
    let html = `
      <div class="goals-container">
        <!-- Header with Add Button -->
        <div class="goals-header">
          <h3>Goals & Targets</h3>
          <button class="btn btn-primary" onclick="showGoalModal('${clientId}')">
            + Create Goal
          </button>
        </div>

        <!-- Goals Summary -->
        <div class="goals-summary">
          ${buildGoalsSummary(goals)}
        </div>

        <!-- Goals Grid -->
        <div class="goals-grid">
          ${goals.length > 0 ? goals.map(g => buildGoalCard(g)).join('') : buildEmptyGoalsState()}
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading goals:', error);
    showEmptyState('goals-content', '⚠️', 'Error', 'Failed to load goals');
  }
}

// ============================================
// Build Goals Summary
// ============================================

function buildGoalsSummary(goals) {
  const total = goals.length;
  const active = goals.filter(g => g.status === 'active').length;
  const completed = goals.filter(g => g.status === 'completed').length;
  const avgProgress = total > 0 ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / total : 0;

  return `
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="summary-label">Total Goals</div>
        <div class="summary-value">${total}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Active</div>
        <div class="summary-value text-success">${active}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Completed</div>
        <div class="summary-value text-info">${completed}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Avg Progress</div>
        <div class="summary-value">${avgProgress.toFixed(0)}%</div>
      </div>
    </div>
  `;
}

// ============================================
// Build Goal Card
// ============================================

function buildGoalCard(goal) {
  const progress = goal.progress || 0;
  const current = goal.current || 0;
  const target = goal.target || 0;
  const deadline = goal.deadline ? formatDate(goal.deadline, 'short') : 'No deadline';

  const statusColors = {
    active: '#34a853',
    completed: '#667eea',
    paused: '#fbbc04',
    cancelled: '#ea4335'
  };

  const color = statusColors[goal.status] || '#718096';

  return `
    <div class="goal-card" data-id="${goal.id}">
      <div class="goal-header">
        <div>
          <h4 class="goal-title">${goal.title}</h4>
          <div class="goal-meta">
            <span class="badge" style="background: ${color}20; color: ${color};">
              ${capitalize(goal.status)}
            </span>
            <span class="badge badge-gray">
              📅 ${deadline}
            </span>
          </div>
        </div>
        <div class="goal-actions">
          <button class="btn btn-sm btn-secondary" onclick="editGoal('${goal.id}')" title="Edit">
            ✏️
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteGoal('${goal.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>

      ${goal.description ? `<div class="goal-description">${goal.description}</div>` : ''}

      <div class="goal-progress-section">
        <div class="goal-progress-header">
          <span class="progress-label">Progress</span>
          <span class="progress-value">${current} / ${target}</span>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width: ${progress}%; background: ${color};"></div>
        </div>
        <div class="goal-progress-percent">${progress.toFixed(0)}%</div>
      </div>

      ${goal.status === 'active' ? `
        <div class="goal-update">
          <input type="number" id="goal-update-${goal.id}" class="form-input"
                 placeholder="Update progress" min="0" max="${target}" value="${current}">
          <button class="btn btn-sm btn-primary" onclick="updateGoalProgress('${goal.id}')">
            Update
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function buildEmptyGoalsState() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">🎯</div>
      <h4 class="empty-state-title">No Goals Yet</h4>
      <p class="empty-state-description">Create your first goal to start tracking progress</p>
      <button class="btn btn-primary" onclick="showGoalModal('${currentGoalsClient}')">
        + Create Your First Goal
      </button>
    </div>
  `;
}

// ============================================
// Goal Actions
// ============================================

async function updateGoalProgress(goalId) {
  if (!currentGoalsClient) return;

  const input = document.getElementById(`goal-update-${goalId}`);
  if (!input) return;

  const newProgress = parseInt(input.value);

  try {
    showToast('info', 'Updating...', 'Updating goal progress');

    const response = await API.updateGoalProgress(currentGoalsClient, goalId, newProgress);

    if (response.success) {
      showToast('success', 'Updated!', 'Goal progress has been updated');
      await loadClientGoals(currentGoalsClient);
    } else {
      throw new Error(response.error || 'Update failed');
    }

  } catch (error) {
    console.error('Error updating goal progress:', error);
    showToast('error', 'Update Failed', error.message);
  }
}

async function editGoal(goalId) {
  // TODO: Implement edit functionality
  showToast('info', 'Coming Soon', 'Edit goal functionality will be available soon');
}

async function deleteGoal(goalId) {
  if (!currentGoalsClient) return;

  showConfirmModal(
    'Delete Goal',
    'Are you sure you want to delete this goal? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deleteGoal(currentGoalsClient, goalId);

        if (response.success) {
          showToast('success', 'Deleted', 'Goal has been deleted');

          // Remove the card with animation
          const card = document.querySelector(`[data-id="${goalId}"]`);
          if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
              card.remove();
              // Reload if no goals left
              if (document.querySelectorAll('.goal-card').length === 0) {
                loadClientGoals(currentGoalsClient);
              }
            }, 300);
          }
        } else {
          throw new Error(response.error || 'Delete failed');
        }

      } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('error', 'Delete Failed', error.message);
      }
    }
  );
}

console.log('🎯 Goals.js fully loaded');
