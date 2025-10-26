/**
 * Unified Dashboard - Recommendations Section
 *
 * AI-powered recommendations with apply/dismiss functionality
 */

let currentRecommendationsClient = null;
let recommendationsFilter = 'all';

async function loadRecommendationsSection() {
  console.log('💡 Loading recommendations section...');

  // Load client selector
  await loadRecommendationsClientSelector();

  // Load recommendations if a client is selected
  const clientId = getCurrentClient();
  if (clientId) {
    currentRecommendationsClient = clientId;
    await loadClientRecommendations(clientId);
  } else {
    showEmptyState('recommendations-content', '💡', 'Select a Client', 'Choose a client to view AI recommendations');
  }
}

// ============================================
// Client Selector
// ============================================

async function loadRecommendationsClientSelector() {
  const selector = document.getElementById('recommendations-client-selector');
  if (!selector) return;

  try {
    const response = await API.getClients();

    if (!response.success || !response.clients) {
      selector.innerHTML = '<option value="">No clients found</option>';
      return;
    }

    let html = '<option value="">Select a client...</option>';
    response.clients.forEach(client => {
      const selected = client.id === currentRecommendationsClient ? 'selected' : '';
      html += `<option value="${client.id}" ${selected}>${client.name || client.id}</option>`;
    });

    selector.innerHTML = html;

    // Add event listener
    selector.addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (clientId) {
        currentRecommendationsClient = clientId;
        setCurrentClient(clientId);
        await loadClientRecommendations(clientId);
      } else {
        showEmptyState('recommendations-content', '💡', 'Select a Client', 'Choose a client to view AI recommendations');
      }
    });

  } catch (error) {
    console.error('Error loading client selector:', error);
    selector.innerHTML = '<option value="">Error loading clients</option>';
  }
}

// ============================================
// Load Recommendations
// ============================================

async function loadClientRecommendations(clientId) {
  const container = document.getElementById('recommendations-content');
  if (!container) return;

  try {
    showLoading('recommendations-content');

    // Load recommendations
    const response = await API.getRecommendations(clientId);

    if (!response.success) {
      throw new Error(response.error || 'Failed to load recommendations');
    }

    const recommendations = response.recommendations || [];

    // Filter recommendations
    const filtered = filterRecommendations(recommendations);

    // Build recommendations UI
    let html = `
      <div class="recommendations-container">
        <!-- Header with Generate Button -->
        <div class="recommendations-header">
          <h3>AI Recommendations</h3>
          <button class="btn btn-primary" onclick="generateNewRecommendations()">
            ✨ Generate New
          </button>
        </div>

        <!-- Filter Tabs -->
        <div class="recommendations-filters">
          <button class="filter-btn ${recommendationsFilter === 'all' ? 'active' : ''}" onclick="setRecommendationsFilter('all')">
            All (${recommendations.length})
          </button>
          <button class="filter-btn ${recommendationsFilter === 'high' ? 'active' : ''}" onclick="setRecommendationsFilter('high')">
            High Priority (${recommendations.filter(r => r.priority === 'high').length})
          </button>
          <button class="filter-btn ${recommendationsFilter === 'medium' ? 'active' : ''}" onclick="setRecommendationsFilter('medium')">
            Medium (${recommendations.filter(r => r.priority === 'medium').length})
          </button>
          <button class="filter-btn ${recommendationsFilter === 'low' ? 'active' : ''}" onclick="setRecommendationsFilter('low')">
            Low (${recommendations.filter(r => r.priority === 'low').length})
          </button>
        </div>

        <!-- Recommendations Grid -->
        <div class="recommendations-grid">
          ${filtered.length > 0 ? filtered.map(r => buildRecommendationCard(r)).join('') : '<div class="empty-state"><p>No recommendations available</p></div>'}
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error('Error loading recommendations:', error);
    showEmptyState('recommendations-content', '⚠️', 'Error', 'Failed to load recommendations');
  }
}

// ============================================
// Build Recommendation Card
// ============================================

function buildRecommendationCard(rec) {
  const priorityColors = {
    high: '#ea4335',
    medium: '#fbbc04',
    low: '#4285f4'
  };

  const color = priorityColors[rec.priority] || '#718096';

  return `
    <div class="recommendation-card priority-${rec.priority}" data-id="${rec.id}">
      <div class="recommendation-header">
        <div>
          <h4 class="recommendation-title">${rec.title}</h4>
          <div class="recommendation-meta">
            <span class="badge" style="background: ${color}20; color: ${color};">
              ${capitalize(rec.priority)} Priority
            </span>
            <span class="badge badge-gray">${rec.category || 'General'}</span>
          </div>
        </div>
      </div>

      <div class="recommendation-body">
        <p>${rec.description}</p>
      </div>

      <div class="recommendation-metrics">
        <div class="metric-item">
          <div class="metric-label">Impact</div>
          <div class="metric-value">${rec.impact || 'Medium'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Effort</div>
          <div class="metric-value">${rec.effort || 'Low'}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Score</div>
          <div class="metric-value">${rec.score || 'N/A'}</div>
        </div>
      </div>

      <div class="recommendation-footer">
        <button class="btn btn-sm btn-success" onclick="applyRecommendation('${rec.id}')">
          ✓ Apply
        </button>
        <button class="btn btn-sm btn-secondary" onclick="dismissRecommendation('${rec.id}')">
          ✗ Dismiss
        </button>
      </div>
    </div>
  `;
}

// ============================================
// Filter Functions
// ============================================

function filterRecommendations(recommendations) {
  if (recommendationsFilter === 'all') {
    return recommendations;
  }
  return recommendations.filter(r => r.priority === recommendationsFilter);
}

function setRecommendationsFilter(filter) {
  recommendationsFilter = filter;
  if (currentRecommendationsClient) {
    loadClientRecommendations(currentRecommendationsClient);
  }
}

// ============================================
// Actions
// ============================================

async function generateNewRecommendations() {
  if (!currentRecommendationsClient) {
    showToast('warning', 'No Client Selected', 'Please select a client first');
    return;
  }

  try {
    showToast('info', 'Generating...', 'AI is analyzing your data and generating recommendations');

    const response = await API.generateRecommendations(currentRecommendationsClient);

    if (response.success) {
      showToast('success', 'Generated!', `${response.count || 0} new recommendations created`);
      await loadClientRecommendations(currentRecommendationsClient);
    } else {
      throw new Error(response.error || 'Generation failed');
    }

  } catch (error) {
    console.error('Error generating recommendations:', error);
    showToast('error', 'Generation Failed', error.message);
  }
}

async function applyRecommendation(recommendationId) {
  if (!currentRecommendationsClient) return;

  showConfirmModal(
    'Apply Recommendation',
    'Are you sure you want to apply this recommendation? This will make changes to your client configuration.',
    async () => {
      try {
        showToast('info', 'Applying...', 'Applying recommendation');

        const response = await API.applyRecommendation(currentRecommendationsClient, recommendationId);

        if (response.success) {
          showToast('success', 'Applied!', 'Recommendation has been applied successfully');
          await loadClientRecommendations(currentRecommendationsClient);
        } else {
          throw new Error(response.error || 'Apply failed');
        }

      } catch (error) {
        console.error('Error applying recommendation:', error);
        showToast('error', 'Apply Failed', error.message);
      }
    }
  );
}

async function dismissRecommendation(recommendationId) {
  if (!currentRecommendationsClient) return;

  try {
    const response = await API.dismissRecommendation(currentRecommendationsClient, recommendationId);

    if (response.success) {
      showToast('success', 'Dismissed', 'Recommendation has been dismissed');

      // Remove the card with animation
      const card = document.querySelector(`[data-id="${recommendationId}"]`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(100px)';
        setTimeout(() => card.remove(), 300);
      }
    } else {
      throw new Error(response.error || 'Dismiss failed');
    }

  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    showToast('error', 'Dismiss Failed', error.message);
  }
}

console.log('💡 Recommendations.js fully loaded');
