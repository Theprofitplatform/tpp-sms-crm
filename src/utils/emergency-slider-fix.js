// Emergency Slider Fix - Hides problematic slider and adds professional hero section
(function() {
    'use strict';
    
    // Function to hide slider
    function hideSlider() {
        const selectors = [
            '#rev_slider_1_1_wrapper',
            '#rev_slider_1_1', 
            '.rs-module-wrap',
            '.wpb_raw_code:has(.rs-module-wrap)',
            '.rev_slider_error'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.display = 'none !important';
                    el.style.visibility = 'hidden !important';
                    el.style.opacity = '0 !important';
                    el.style.height = '0 !important';
                    el.style.overflow = 'hidden !important';
                    el.remove(); // Remove completely
                });
            } catch (e) {
                console.log('Error hiding slider:', e);
            }
        });
    }
    
    // Function to add hero section
    function addHeroSection() {
        // Check if hero already exists
        if (document.querySelector('.iat-hero-section')) {
            return;
        }
        
        const heroHTML = `
            <div class="iat-hero-section" style="
                background: linear-gradient(135deg, rgba(30, 60, 114, 0.95), rgba(42, 82, 152, 0.95));
                color: white;
                padding: 80px 0;
                text-align: center;
                position: relative;
                overflow: hidden;
                margin-bottom: 40px;
            ">
                <div class="iat-hero-container" style="
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    position: relative;
                    z-index: 2;
                ">
                    <h1 class="iat-hero-title" style="
                        font-size: 3rem;
                        font-weight: 700;
                        margin-bottom: 20px;
                        line-height: 1.2;
                        color: white;
                    ">Sell Your Car Instantly in Sydney</h1>
                    
                    <p class="iat-hero-subtitle" style="
                        font-size: 1.3rem;
                        margin-bottom: 30px;
                        opacity: 0.9;
                        max-width: 800px;
                        margin-left: auto;
                        margin-right: auto;
                    ">Get Top Dollar for Your Vehicle - Same Day Pickup & Cash Payment</p>
                    
                    <div class="iat-hero-buttons" style="
                        display: flex;
                        gap: 20px;
                        justify-content: center;
                        flex-wrap: wrap;
                        margin-bottom: 40px;
                    ">
                        <a href="/contact-us/" class="iat-btn-primary" style="
                            background: #ff6b35;
                            color: white;
                            padding: 15px 30px;
                            border-radius: 5px;
                            text-decoration: none;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: inline-block;
                        ">Get Instant Quote</a>
                        <a href="tel:0426232000" class="iat-btn-secondary" style="
                            background: white;
                            color: #1e3c72;
                            padding: 15px 30px;
                            border-radius: 5px;
                            text-decoration: none;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            display: inline-block;
                        ">Call 0426 232 000</a>
                    </div>
                    
                    <div class="iat-hero-features" style="
                        background: rgba(255, 255, 255, 0.1);
                        padding: 30px;
                        border-radius: 10px;
                        backdrop-filter: blur(10px);
                        max-width: 800px;
                        margin: 0 auto;
                    ">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; margin-bottom: 10px;">✓</div>
                                <strong>Instant Cash Payment</strong>
                                <div style="font-size: 0.9rem; opacity: 0.8;">Cash on the spot</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; margin-bottom: 10px;">✓</div>
                                <strong>Same Day Pickup</strong>
                                <div style="font-size: 0.9rem; opacity: 0.8;">Free vehicle removal</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; margin-bottom: 10px;">✓</div>
                                <strong>No Roadworthy Needed</strong>
                                <div style="font-size: 0.9rem; opacity: 0.8;">Any condition accepted</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; margin-bottom: 10px;">✓</div>
                                <strong>Licensed Dealer</strong>
                                <div style="font-size: 0.9rem; opacity: 0.8;">MD 079978 - Sydney</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert hero section after the header
        const header = document.querySelector('#site-header') || document.querySelector('header');
        if (header) {
            header.insertAdjacentHTML('afterend', heroHTML);
        } else {
            document.body.insertAdjacentHTML('afterbegin', heroHTML);
        }
    }
    
    // Apply fixes multiple times
    hideSlider();
    addHeroSection();
    
    // Apply again after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                hideSlider();
                addHeroSection();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            hideSlider();
            addHeroSection();
        }, 1000);
    }
    
    // Monitor for slider re-appearances
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                const newSlider = Array.from(mutation.addedNodes).find(node => {
                    return node.nodeType === 1 && (
                        node.id === 'rev_slider_1_1_wrapper' ||
                        node.id === 'rev_slider_1_1' ||
                        node.classList?.contains('rs-module-wrap')
                    );
                });
                
                if (newSlider) {
                    setTimeout(() => hideSlider(), 100);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Check periodically for slider
    setInterval(hideSlider, 2000);
    
    console.log('🚨 Emergency Slider Fix Applied - Instant Auto Traders Homepage Optimized');
})();
