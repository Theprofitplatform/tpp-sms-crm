/**
 * Audit Results Page - Display automated audit results
 */

const API_BASE = window.location.origin;

// Check if leadId exists in session storage
const leadId = sessionStorage.getItem('leadId');
const leadEmail = sessionStorage.getItem('leadEmail');

if (!leadId) {
    // Redirect back to landing page if no lead ID
    window.location.href = '/leadmagnet/index.html';
}

// Simulate processing steps
async function simulateProcessing() {
    const steps = [
        { id: 'step-1', delay: 500 },
        { id: 'step-2', delay: 1000 },
        { id: 'step-3', delay: 800 },
        { id: 'step-4', delay: 1200 },
        { id: 'step-5', delay: 1000 }
    ];

    for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        const stepEl = document.getElementById(step.id);
        stepEl.classList.add('active');
        stepEl.querySelector('.step-icon').textContent = '✅';

        await new Promise(resolve => setTimeout(resolve, 200));
        stepEl.classList.remove('active');
        stepEl.classList.add('completed');
    }
}

// Fetch audit results
async function fetchAuditResults() {
    try {
        const response = await fetch(`${API_BASE}/api/leads/${leadId}/audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate audit');
        }

        return data.audit;

    } catch (error) {
        console.error('Audit generation error:', error);
        throw error;
    }
}

// Display audit results
function displayResults(audit) {
    const processingState = document.getElementById('processing-state');
    const resultsState = document.getElementById('results-state');

    // Hide processing, show results
    processingState.style.display = 'none';
    resultsState.style.display = 'block';

    // Populate website name
    document.getElementById('website-name').textContent = audit.website;

    // Populate SEO score
    const seoScore = calculateOverallScore(audit);
    document.getElementById('seo-score').textContent = seoScore;

    // Populate findings
    document.getElementById('technical-summary').textContent =
        generateTechnicalSummary(audit.technical || {});

    document.getElementById('onpage-summary').textContent =
        generateOnPageSummary(audit.onPage || {});

    document.getElementById('competitor-summary').textContent =
        generateCompetitorSummary(audit.competitors || {});

    document.getElementById('quickwins-summary').textContent =
        generateQuickWinsSummary(audit);

    // Setup CTA button
    const bookCallBtn = document.getElementById('book-call-btn');
    bookCallBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Track conversion event
        trackConversion('book_call_clicked');
        // Redirect to booking page or show contact form
        window.location.href = `mailto:sales@seoexpert.com?subject=Strategy Call Request&body=Lead ID: ${leadId}`;
    });
}

// Calculate overall SEO score
function calculateOverallScore(audit) {
    let score = 50; // Base score

    // Technical SEO factors
    if (audit.technical) {
        if (audit.technical.mobileOptimized) score += 10;
        if (audit.technical.httpsEnabled) score += 5;
        if (audit.technical.sitemap) score += 5;
        if (audit.technical.robotsTxt) score += 3;
        if (audit.technical.pageSpeed && audit.technical.pageSpeed > 70) score += 7;
    }

    // On-page SEO factors
    if (audit.onPage) {
        if (audit.onPage.titleOptimized) score += 5;
        if (audit.onPage.metaDescriptions) score += 5;
        if (audit.onPage.headingStructure) score += 5;
        if (audit.onPage.imageAltText) score += 3;
    }

    // Competitor analysis
    if (audit.competitors && audit.competitors.betterThan > 0) {
        score += Math.min(audit.competitors.betterThan * 2, 10);
    }

    return Math.min(score, 100);
}

// Generate technical summary
function generateTechnicalSummary(technical) {
    const issues = [];

    if (!technical.mobileOptimized) {
        issues.push('mobile optimization');
    }
    if (!technical.httpsEnabled) {
        issues.push('HTTPS security');
    }
    if (!technical.sitemap) {
        issues.push('XML sitemap');
    }
    if (technical.pageSpeed && technical.pageSpeed < 50) {
        issues.push('page speed');
    }
    if (technical.brokenLinks > 0) {
        issues.push(`${technical.brokenLinks} broken links`);
    }

    if (issues.length === 0) {
        return 'Your technical SEO looks good! We found minimal issues.';
    }

    if (issues.length === 1) {
        return `We found an issue with ${issues[0]} that needs attention.`;
    }

    return `We found ${issues.length} technical issues: ${issues.slice(0, 2).join(', ')}${issues.length > 2 ? ', and more' : ''}.`;
}

// Generate on-page summary
function generateOnPageSummary(onPage) {
    const issues = [];

    if (onPage.missingTitles > 0) {
        issues.push(`${onPage.missingTitles} pages missing title tags`);
    }
    if (onPage.missingDescriptions > 0) {
        issues.push(`${onPage.missingDescriptions} pages missing meta descriptions`);
    }
    if (onPage.duplicateTitles > 0) {
        issues.push(`${onPage.duplicateTitles} duplicate titles`);
    }
    if (onPage.thinContent > 0) {
        issues.push(`${onPage.thinContent} pages with thin content`);
    }

    if (issues.length === 0) {
        return 'Your on-page SEO is in good shape with proper titles and meta descriptions.';
    }

    if (issues.length === 1) {
        return `We found ${issues[0]}.`;
    }

    return `${issues[0]} and ${issues.length - 1} other on-page issues.`;
}

// Generate competitor summary
function generateCompetitorSummary(competitors) {
    if (!competitors || !competitors.analyzed) {
        return 'We analyzed your top competitors and found keyword opportunities you\'re missing.';
    }

    if (competitors.keywordGaps > 0) {
        return `Your competitors are ranking for ${competitors.keywordGaps} keywords you\'re missing. We can help you capture this traffic.`;
    }

    if (competitors.betterThan > 0) {
        return `You\'re outperforming ${competitors.betterThan} competitors, but there\'s room for improvement.`;
    }

    return 'We found several competitor strategies you can replicate to improve your rankings.';
}

// Generate quick wins summary
function generateQuickWinsSummary(audit) {
    const wins = [];

    if (audit.technical && !audit.technical.sitemap) {
        wins.push('add an XML sitemap');
    }
    if (audit.onPage && audit.onPage.missingDescriptions > 0) {
        wins.push('optimize meta descriptions');
    }
    if (audit.technical && audit.technical.brokenLinks > 0) {
        wins.push('fix broken links');
    }
    if (audit.onPage && audit.onPage.missingAltText > 0) {
        wins.push('add image alt text');
    }

    if (wins.length === 0) {
        return 'Focus on content optimization and link building for maximum impact.';
    }

    return `Quick wins: ${wins.slice(0, 3).join(', ')}. These can be implemented in under a week.`;
}

// Track conversion events
function trackConversion(eventName) {
    if (window.gtag) {
        window.gtag('event', eventName, {
            'event_category': 'lead_magnet',
            'event_label': leadId
        });
    }

    // Also send to backend for tracking
    fetch(`${API_BASE}/api/leads/${leadId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName })
    }).catch(err => console.error('Tracking error:', err));
}

// Initialize page
async function initAuditPage() {
    try {
        // Run processing animation and fetch audit in parallel
        const [, audit] = await Promise.all([
            simulateProcessing(),
            fetchAuditResults()
        ]);

        // Wait a bit before showing results
        await new Promise(resolve => setTimeout(resolve, 500));

        // Display results
        displayResults(audit);

        // Track page view
        trackConversion('audit_viewed');

    } catch (error) {
        console.error('Error initializing audit page:', error);

        // Show error state
        const processingState = document.getElementById('processing-state');
        processingState.innerHTML = `
            <div class="processing-card">
                <div class="processing-icon">⚠️</div>
                <h1 class="processing-title">Oops! Something went wrong</h1>
                <p class="processing-subtitle">We're having trouble generating your audit.</p>
                <p style="margin-top: 2rem;">
                    <a href="/leadmagnet/index.html" style="color: var(--primary-color); text-decoration: underline;">
                        Try again
                    </a> or contact us at support@seoexpert.com
                </p>
            </div>
        `;
    }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initAuditPage);
