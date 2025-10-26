/**
 * Unified Dashboard - API Wrapper
 *
 * Centralized API communication with error handling and authentication
 */

const API = {
  /**
   * Generic API request wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      showToast('error', 'API Error', error.message);
      throw error;
    }
  },

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // ============================================
  // Dashboard Endpoints
  // ============================================

  async getDashboardStats() {
    return this.get('/dashboard');
  },

  async getRecentActivity() {
    return this.get('/activity/recent?limit=10');
  },

  // ============================================
  // Client Endpoints
  // ============================================

  async getClients() {
    return this.get('/clients');
  },

  async getClient(clientId) {
    return this.get(`/clients/${clientId}`);
  },

  async createClient(clientData) {
    return this.post('/clients', clientData);
  },

  async updateClient(clientId, clientData) {
    return this.put(`/clients/${clientId}`, clientData);
  },

  async deleteClient(clientId) {
    return this.delete(`/clients/${clientId}`);
  },

  async testClientAuth(clientId) {
    return this.post(`/test-auth/${clientId}`);
  },

  async auditClient(clientId) {
    return this.post(`/audit/${clientId}`);
  },

  async optimizeClient(clientId) {
    return this.post(`/optimize/${clientId}`);
  },

  // ============================================
  // Analytics Endpoints
  // ============================================

  async getAnalytics(clientId, timeframe = '30d') {
    return this.get(`/analytics/${clientId}?timeframe=${timeframe}`);
  },

  async getAnalyticsSummary() {
    return this.get('/analytics/summary');
  },

  async getClientPerformance(clientId, limit = 50) {
    return this.get(`/analytics/client/${clientId}/performance?limit=${limit}`);
  },

  async getDailyStats(days = 30) {
    return this.get(`/analytics/daily-stats?days=${days}`);
  },

  // ============================================
  // Export Endpoints
  // ============================================

  async exportAnalytics(clientId, format = 'csv', timeframe = '30d') {
    return this.get(`/export/analytics/${clientId}?format=${format}&timeframe=${timeframe}`);
  },

  async exportClients(format = 'csv') {
    return this.get(`/export/clients?format=${format}`);
  },

  async exportRecommendations(clientId, format = 'csv') {
    return this.get(`/export/recommendations/${clientId}?format=${format}`);
  },

  // ============================================
  // Recommendations Endpoints
  // ============================================

  async getRecommendations(clientId) {
    return this.get(`/recommendations/${clientId}`);
  },

  async generateRecommendations(clientId) {
    return this.post(`/recommendations/${clientId}/generate`);
  },

  async applyRecommendation(clientId, recommendationId) {
    return this.post(`/recommendations/${clientId}/${recommendationId}/apply`);
  },

  async dismissRecommendation(clientId, recommendationId) {
    return this.post(`/recommendations/${clientId}/${recommendationId}/dismiss`);
  },

  // ============================================
  // Goals Endpoints
  // ============================================

  async getGoals(clientId) {
    return this.get(`/goals/${clientId}`);
  },

  async createGoal(clientId, goalData) {
    return this.post(`/goals/${clientId}`, goalData);
  },

  async updateGoalProgress(clientId, goalId, progress) {
    return this.put(`/goals/${clientId}/${goalId}/progress`, { progress });
  },

  async deleteGoal(clientId, goalId) {
    return this.delete(`/goals/${clientId}/${goalId}`);
  },

  // ============================================
  // Webhooks Endpoints
  // ============================================

  async getWebhooks() {
    return this.get('/webhooks');
  },

  async createWebhook(webhookData) {
    return this.post('/webhooks', webhookData);
  },

  async deleteWebhook(webhookId) {
    return this.delete(`/webhooks/${webhookId}`);
  },

  async testWebhook(webhookId) {
    return this.post(`/webhooks/${webhookId}/test`);
  },

  // ============================================
  // White-Label Endpoints
  // ============================================

  async getWhiteLabelSettings() {
    return this.get('/white-label');
  },

  async updateWhiteLabelSettings(settings) {
    return this.put('/white-label', settings);
  },

  // ============================================
  // Email Campaign Endpoints
  // ============================================

  async getCampaigns() {
    return this.get('/campaigns');
  },

  async getCampaign(campaignId) {
    return this.get(`/campaigns/${campaignId}`);
  },

  async createCampaign(campaignData) {
    return this.post('/campaigns', campaignData);
  },

  async updateCampaign(campaignId, campaignData) {
    return this.put(`/campaigns/${campaignId}`, campaignData);
  },

  async deleteCampaign(campaignId) {
    return this.delete(`/campaigns/${campaignId}`);
  },

  async pauseCampaign(campaignId) {
    return this.post(`/campaigns/${campaignId}/pause`);
  },

  async resumeCampaign(campaignId) {
    return this.post(`/campaigns/${campaignId}/resume`);
  },

  async getEmailQueue() {
    return this.get('/campaigns/queue');
  },

  // ============================================
  // Reports Endpoints
  // ============================================

  async getReports(clientId) {
    return this.get(`/reports/${clientId}`);
  },

  async generateReport(clientId, reportType) {
    return this.post(`/reports/${clientId}/generate`, { type: reportType });
  },

  // ============================================
  // Automation Endpoints
  // ============================================

  async runAutomation(automationType, clientId) {
    return this.post('/automation/run', {
      type: automationType,
      clientId
    });
  },

  async getAutomationStatus(automationType, clientId) {
    return this.get(`/automation/status?type=${automationType}&clientId=${clientId}`);
  },

  async runBatchOperation(action) {
    return this.post(`/batch/${action}`);
  }
};
