/**
 * Portal JavaScript - Authentication and Core Functions
 */

// API Base URL
const API_BASE = window.location.origin;

// Authentication helpers
const auth = {
    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem('auth_token');
    },

    /**
     * Store token
     */
    setToken(token) {
        localStorage.setItem('auth_token', token);
    },

    /**
     * Remove token
     */
    clearToken() {
        localStorage.removeItem('auth_token');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.getToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Not authenticated');
            }

            const data = await response.json();
            return data.user;
        } catch (error) {
            this.clearToken();
            throw error;
        }
    }
};

// API helper functions
const api = {
    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const token = auth.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            // If authentication error, redirect to login
            if (error.message.includes('authenticate') || error.message.includes('token')) {
                auth.clearToken();
                window.location.href = '/portal/index.html';
            }
            throw error;
        }
    },

    /**
     * Login user
     */
    async login(email, password) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success && data.token) {
            auth.setToken(data.token);
        }

        return data;
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.request('/api/auth/logout', {
                method: 'POST'
            });
        } finally {
            auth.clearToken();
            window.location.href = '/portal/index.html';
        }
    },

    /**
     * Request password reset
     */
    async requestReset(email) {
        return await this.request('/api/auth/request-reset', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }
};

// Login page logic
if (document.getElementById('login-form')) {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');
    const errorMessage = document.getElementById('error-message');

    // Check if already authenticated
    if (auth.isAuthenticated()) {
        window.location.href = '/portal/dashboard.html';
    }

    // Handle login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Show loading state
        loginBtn.disabled = true;
        loginText.style.display = 'none';
        loginSpinner.style.display = 'block';
        errorMessage.style.display = 'none';

        try {
            const result = await api.login(email, password);

            if (result.success) {
                // Redirect to dashboard
                window.location.href = '/portal/dashboard.html';
            } else {
                throw new Error(result.error || 'Login failed');
            }
        } catch (error) {
            // Show error message
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';

            // Reset button state
            loginBtn.disabled = false;
            loginText.style.display = 'block';
            loginSpinner.style.display = 'none';
        }
    });

    // Forgot password modal
    const forgotPasswordLink = document.getElementById('forgot-password');
    const resetModal = document.getElementById('reset-modal');
    const closeModal = document.querySelector('.close');
    const resetForm = document.getElementById('reset-form');
    const resetSuccess = document.getElementById('reset-success');

    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetModal.style.display = 'flex';
    });

    closeModal.addEventListener('click', () => {
        resetModal.style.display = 'none';
        resetSuccess.style.display = 'none';
    });

    resetModal.addEventListener('click', (e) => {
        if (e.target === resetModal) {
            resetModal.style.display = 'none';
            resetSuccess.style.display = 'none';
        }
    });

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('reset-email').value;

        try {
            await api.requestReset(email);
            resetSuccess.style.display = 'block';
            resetForm.reset();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getStatusIcon(status) {
    const icons = {
        'completed': '✅',
        'pending': '⏳',
        'failed': '❌',
        'running': '🔄'
    };
    return icons[status] || '•';
}

function getSeverityColor(severity) {
    const colors = {
        'critical': '#ef4444',
        'high': '#f59e0b',
        'medium': '#eab308',
        'low': '#10b981'
    };
    return colors[severity] || '#64748b';
}
