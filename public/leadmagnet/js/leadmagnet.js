/**
 * Lead Magnet JavaScript - Form Handling and Submission
 */

// API Base URL
const API_BASE = window.location.origin;

// Form submission handler
document.addEventListener('DOMContentLoaded', () => {
    const auditForm = document.getElementById('audit-form');
    const submitBtn = auditForm.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');

    // Phone number formatting
    const phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value.length <= 4) {
                    e.target.value = value;
                } else if (value.length <= 7) {
                    e.target.value = value.slice(0, 4) + ' ' + value.slice(4);
                } else {
                    e.target.value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7, 11);
                }
            }
        });
    }

    // Website URL validation
    const websiteInput = document.querySelector('input[name="website"]');
    if (websiteInput) {
        websiteInput.addEventListener('blur', (e) => {
            let url = e.target.value.trim();

            // Add https:// if no protocol specified
            if (url && !url.match(/^https?:\/\//i)) {
                e.target.value = 'https://' + url;
            }
        });
    }

    // Form validation
    function validateForm(formData) {
        const errors = [];

        // Business name validation
        if (!formData.businessName || formData.businessName.trim().length < 2) {
            errors.push('Please enter a valid business name');
        }

        // Website validation
        if (!formData.website || !isValidURL(formData.website)) {
            errors.push('Please enter a valid website URL');
        }

        // Name validation
        if (!formData.name || formData.name.trim().length < 2) {
            errors.push('Please enter your full name');
        }

        // Email validation
        if (!formData.email || !isValidEmail(formData.email)) {
            errors.push('Please enter a valid email address');
        }

        // Phone validation (optional, but validate if provided)
        if (formData.phone && formData.phone.trim().length > 0) {
            const phoneDigits = formData.phone.replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                errors.push('Please enter a valid phone number (at least 10 digits)');
            }
        }

        return errors;
    }

    // Email validation helper
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    }

    // URL validation helper
    function isValidURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    // Show error message
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';

            // Scroll to error message
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Hide after 5 seconds
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Hide error message
    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // Update button state
    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🚀 Get My Free SEO Audit';
        }
    }

    // Handle form submission
    auditForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        hideError();

        // Get form data
        const formData = {
            businessName: document.querySelector('input[name="businessName"]').value.trim(),
            website: document.querySelector('input[name="website"]').value.trim(),
            name: document.querySelector('input[name="name"]').value.trim(),
            email: document.querySelector('input[name="email"]').value.trim().toLowerCase(),
            phone: document.querySelector('input[name="phone"]').value.trim(),
            industry: document.querySelector('select[name="industry"]').value
        };

        // Validate form
        const errors = validateForm(formData);
        if (errors.length > 0) {
            showError(errors.join('. '));
            return;
        }

        // Set loading state
        setLoading(true);

        try {
            // Submit lead to API
            const response = await fetch(`${API_BASE}/api/leads/capture`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit form');
            }

            // Success! Store lead ID and redirect to audit page
            if (data.success && data.leadId) {
                // Store lead ID in session storage
                sessionStorage.setItem('leadId', data.leadId);
                sessionStorage.setItem('leadEmail', formData.email);

                // Redirect to audit results page
                window.location.href = '/leadmagnet/audit.html';
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            showError(error.message || 'Something went wrong. Please try again.');
            setLoading(false);
        }
    });

    // Track form interactions (for analytics)
    const formFields = auditForm.querySelectorAll('input, select');
    formFields.forEach(field => {
        field.addEventListener('focus', () => {
            trackEvent('form_field_focus', { field: field.name });
        });
    });

    // Simple event tracking (can be replaced with Google Analytics, etc.)
    function trackEvent(eventName, data = {}) {
        if (window.gtag) {
            window.gtag('event', eventName, data);
        } else {
            console.log('Track event:', eventName, data);
        }
    }
});

// Smooth scroll for CTA button
document.addEventListener('DOMContentLoaded', () => {
    const ctaButton = document.querySelector('.btn-cta');
    if (ctaButton) {
        ctaButton.addEventListener('click', (e) => {
            e.preventDefault();
            const formSection = document.querySelector('.audit-form-container');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Focus on first input
                setTimeout(() => {
                    const firstInput = document.querySelector('input[name="businessName"]');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, 500);
            }
        });
    }
});
