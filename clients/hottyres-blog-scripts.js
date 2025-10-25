/**
 * Hot Tyres - Blog Page Interactive Scripts
 * Enhances user experience with scroll-to-top, mobile TOC, and more
 *
 * USAGE: Add to WordPress via:
 * - Theme functions.php (enqueue script)
 * - Plugin like "Insert Headers and Footers"
 * - Paste directly before </body> tag
 */

(function() {
    'use strict';

    // ========================================
    // 1. SCROLL TO TOP BUTTON
    // ========================================
    function initScrollToTop() {
        // Create scroll-to-top button if it doesn't exist
        let scrollBtn = document.querySelector('.scroll-to-top');

        if (!scrollBtn) {
            scrollBtn = document.createElement('button');
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.innerHTML = '↑';
            scrollBtn.setAttribute('aria-label', 'Scroll to top');
            scrollBtn.setAttribute('title', 'Back to top');
            document.body.appendChild(scrollBtn);
        }

        // Show/hide button based on scroll position
        function toggleScrollButton() {
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollPosition > 400) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        }

        // Scroll to top smoothly when clicked
        scrollBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Listen for scroll events (throttled for performance)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) {
                window.cancelAnimationFrame(scrollTimeout);
            }
            scrollTimeout = window.requestAnimationFrame(toggleScrollButton);
        });

        // Initial check
        toggleScrollButton();
    }

    // ========================================
    // 2. MOBILE TABLE OF CONTENTS
    // ========================================
    function initMobileTOC() {
        const tocContainer = document.querySelector('.table-of-contents, .toc-container, #toc');

        if (!tocContainer) return;

        // Only on mobile/tablet
        if (window.innerWidth < 992) {
            // Create toggle button if it doesn't exist
            let toggleBtn = tocContainer.querySelector('.toc-toggle');

            if (!toggleBtn) {
                toggleBtn = document.createElement('button');
                toggleBtn.className = 'toc-toggle';
                toggleBtn.textContent = 'Show Table of Contents ▼';
                toggleBtn.setAttribute('aria-expanded', 'false');

                tocContainer.insertBefore(toggleBtn, tocContainer.firstChild);
            }

            // Collapse TOC by default on mobile
            tocContainer.classList.remove('expanded');

            // Toggle TOC visibility
            toggleBtn.addEventListener('click', function() {
                const isExpanded = tocContainer.classList.toggle('expanded');
                toggleBtn.setAttribute('aria-expanded', isExpanded);
                toggleBtn.textContent = isExpanded
                    ? 'Hide Table of Contents ▲'
                    : 'Show Table of Contents ▼';
            });

            // Close TOC when a link is clicked
            const tocLinks = tocContainer.querySelectorAll('a');
            tocLinks.forEach(link => {
                link.addEventListener('click', function() {
                    tocContainer.classList.remove('expanded');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.textContent = 'Show Table of Contents ▼';
                });
            });
        }
    }

    // ========================================
    // 3. ACTIVE TOC LINK HIGHLIGHTING
    // ========================================
    function initActiveTOCLink() {
        const tocLinks = document.querySelectorAll('.table-of-contents a, .toc-container a, #toc a');
        const sections = [];

        // Get all sections that TOC links point to
        tocLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const section = document.querySelector(href);
                if (section) {
                    sections.push({
                        element: section,
                        link: link,
                        id: href
                    });
                }
            }
        });

        if (sections.length === 0) return;

        // Highlight active section based on scroll position
        function updateActiveTOCLink() {
            const scrollPos = window.pageYOffset + 150; // Offset for header

            let currentSection = sections[0];

            sections.forEach(section => {
                const sectionTop = section.element.offsetTop;
                if (scrollPos >= sectionTop) {
                    currentSection = section;
                }
            });

            // Remove all active classes
            tocLinks.forEach(link => {
                link.parentElement.classList.remove('active');
            });

            // Add active class to current section
            if (currentSection && currentSection.link) {
                currentSection.link.parentElement.classList.add('active');
            }
        }

        // Listen for scroll events (throttled)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) {
                window.cancelAnimationFrame(scrollTimeout);
            }
            scrollTimeout = window.requestAnimationFrame(updateActiveTOCLink);
        });

        // Initial update
        updateActiveTOCLink();
    }

    // ========================================
    // 4. FAQ ACCORDION FUNCTIONALITY
    // ========================================
    function initFAQAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');

            if (question) {
                question.addEventListener('click', function() {
                    // Close all other items (optional: remove this for multi-open)
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                            const otherQuestion = otherItem.querySelector('.faq-question');
                            if (otherQuestion) {
                                otherQuestion.setAttribute('aria-expanded', 'false');
                            }
                        }
                    });

                    // Toggle current item
                    const isActive = item.classList.toggle('active');
                    question.setAttribute('aria-expanded', isActive);
                });

                // Keyboard accessibility
                question.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        question.click();
                    }
                });
            }
        });
    }

    // ========================================
    // 5. SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================
    function initSmoothScroll() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');

        anchorLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');

                if (href === '#' || href === '#top') {
                    e.preventDefault();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    return;
                }

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();

                    // Calculate offset (adjust for sticky header)
                    const headerHeight = 100; // Adjust based on your header height
                    const targetPosition = target.offsetTop - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL hash
                    history.pushState(null, null, href);

                    // Focus target for accessibility
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                }
            });
        });
    }

    // ========================================
    // 6. LAZY LOAD IMAGES (Performance)
    // ========================================
    function initLazyLoading() {
        // Check if browser supports IntersectionObserver
        if ('IntersectionObserver' in window) {
            const images = document.querySelectorAll('img[data-src]');

            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    }

    // ========================================
    // 7. READING PROGRESS BAR
    // ========================================
    function initReadingProgress() {
        // Create progress bar if it doesn't exist
        let progressBar = document.querySelector('.reading-progress');

        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'reading-progress';
            progressBar.innerHTML = '<div class="reading-progress-bar"></div>';
            document.body.insertBefore(progressBar, document.body.firstChild);
        }

        const progressBarFill = progressBar.querySelector('.reading-progress-bar');

        function updateReadingProgress() {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight - windowHeight;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const progress = (scrollTop / documentHeight) * 100;

            if (progressBarFill) {
                progressBarFill.style.width = progress + '%';
            }
        }

        window.addEventListener('scroll', updateReadingProgress);
        updateReadingProgress();
    }

    // ========================================
    // 8. COPY LINK FUNCTIONALITY (Share)
    // ========================================
    function initCopyLink() {
        const copyButtons = document.querySelectorAll('.copy-link-btn');

        copyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const url = window.location.href;

                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        const originalText = button.textContent;
                        button.textContent = '✓ Link Copied!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 2000);
                    });
                }
            });
        });
    }

    // ========================================
    // 9. RESPONSIVE TABLE WRAPPER
    // ========================================
    function initResponsiveTables() {
        const tables = document.querySelectorAll('.entry-content table, .post-content table');

        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-wrapper';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    // ========================================
    // 10. EMERGENCY BANNER AUTO-HIDE
    // ========================================
    function initEmergencyBanner() {
        const emergencyBanner = document.querySelector('.cta-emergency-banner');
        const footer = document.querySelector('footer');

        if (emergencyBanner && footer) {
            function updateBannerVisibility() {
                const footerRect = footer.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                // Hide banner when footer is visible
                if (footerRect.top < viewportHeight) {
                    emergencyBanner.style.transform = 'translateY(100%)';
                    emergencyBanner.style.transition = 'transform 0.3s ease';
                } else {
                    emergencyBanner.style.transform = 'translateY(0)';
                }
            }

            window.addEventListener('scroll', updateBannerVisibility);
            updateBannerVisibility();
        }
    }

    // ========================================
    // INITIALIZE ALL FEATURES
    // ========================================
    function init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Initialize all features
        initScrollToTop();
        initMobileTOC();
        initActiveTOCLink();
        initFAQAccordion();
        initSmoothScroll();
        initLazyLoading();
        initReadingProgress();
        initCopyLink();
        initResponsiveTables();
        initEmergencyBanner();

        console.log('Hot Tyres Blog enhancements loaded ✓');
    }

    // Handle window resize (re-initialize mobile TOC if needed)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            initMobileTOC();
        }, 250);
    });

    // Start initialization
    init();

})();

// ========================================
// ADDITIONAL CSS FOR NEW FEATURES
// Add this to your CSS file
// ========================================
/*
.reading-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: rgba(0,0,0,0.1);
    z-index: 9999;
}

.reading-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #0E4D92 0%, #FFC107 100%);
    width: 0%;
    transition: width 0.1s ease;
}

.table-wrapper {
    overflow-x: auto;
    margin: 2rem 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-radius: 8px;
}

.table-wrapper table {
    margin: 0 !important;
    min-width: 600px;
}

.copy-link-btn {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.copy-link-btn:hover {
    background: #e9ecef;
}
*/
