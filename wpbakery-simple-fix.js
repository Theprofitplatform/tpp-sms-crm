// WPBakery-compatible JavaScript fix for Instant Auto Traders前言

(function() {
    "use strict";
    
    // WPBakery-safe slider removal
    function removeSlider() {
        const sliderSelectors = [
            ".rs-module-wrap",
            "#rev_slider_1_1_wrapper", 
            "#rev_slider_1_1",
            ".wpb_raw_code",
            ".rev_slider_error"
        ];
        
        sliderSelectors.forEach(function(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(function(el) {
                const html = el.innerHTML || "";
                if (html.includes("rev_slider") || 
                    html.includes("Slider Revolution") || 
                    html.includes("rs-module") ||
                    selector.includes("slider")) {
                    el.style.display = "none !important";
                    el.style.visibility = "hidden !important";
                    el.style.opacity = "0 !important";
                    el.style.height = "0 !important";
                    el.style.overflow = "hidden !important";
                }
            });
        });
    }
    
    // Add hero section
    function addHeroSection() {
        var existingHero = document.querySelector(".iat-hero-section");
        if (existingHero) return;
        
        var heroSection = document.createElement("div");
        heroSection.className = "iat-hero-section";
        heroSection.style.cssText = "background:linear-gradient(135deg,rgba(30,60,114,0.95),rgba(42,82,152,0.95));color:white;padding:80px 0;text-align:center;position:relative;margin-bottom:40px;z-index:1000;clear:both";
        
        var heroHTML = '<div class="iat-hero-container" style="max-width:1200px;margin:0 auto;padding:0 20px;position:relative;z-index:2"><h1 class="iat-hero-title" style="font-size:3rem;font-weight:700;margin-bottom:20px;line-height:1.2;color:white">Sell Your Car Instantly in Sydney</h1><p class="iat-hero-subtitle" style="font-size:1.4rem;margin-bottom:30px;opacity:0.9;max-width:800px;margin-left:auto;margin-right:auto">Get Top Dollar for Your Vehicle - Same Day Pickup & Cash Payment</p><div class="iat-hero-buttons" style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:40px"><a href="/contact-us/" class="iat-btn-primary" style="background:#ff6b35;color:white;padding:15px 30px;border-radius:5px;text-decoration:none;font-weight:600;transition:all 0.3s ease;display:inline-block;border:none !important">Get Instant Quote</a><a href="tel:0426232000" class="iat-btn-secondary" style="background:white;color:#1e3c72;padding:15px 30px;border-radius:5px;text-decoration:none;font-weight:600;transition:all 0.3s ease;display:inline-block;border:none !important">Call 0426 232 000</a></div><div class="iat-features" style="background:rgba(255,255,255,0.1);padding:30px;border-radius:10px;backdrop-filter:blur(10px);max-width:800px;margin:0 auto"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;text-align:left"><div><div style="font-size:2rem;margin-bottom:10px">✓</div><strong>Instant Cash Payment</strong><div style="color:rgba(255,255,255,0.8);font-size:0.9rem">Cash on the spot</div></div><div><div style="font-size:2rem;margin-bottom:10px">✓</div><strong>Same Day Pickup</strong><div style="color:rgba(255,255,255,0.8);font-size:0.9rem">Free vehicle removal</div></div><div><div style="font-size:2rem;margin-bottom:10px">✓</div><strong>No Roadworthy Needed</strong><div style="color:rgba(255,255,255,0.8);font-size:0.9rem">Any condition accepted</div></div><div><div style="font-size:2rem;margin-bottom:10px">✓</div><strong>Licensed Dealer</strong><div style="color:rgba(255,255,255,0.8);font-size:0.9rem">MD 079978</div></div></div></div></div>';
        
        heroSection.innerHTML = heroHTML;
        
        var header = document.querySelector("#site-header, header");
        var content = document.querySelector("#main, #content, .main-content");
        
        if (content && content.firstChild) {
            content.insertBefore(heroSection, content.firstChild);
        } else if (header) {
            header.parentNode.insertBefore(heroSection, header.nextSibling);
        } else {
            document.body.insertBefore(heroSection, document.body.firstChild);
        }
    }
    
    // Apply fixes
    removeSlider();
    
    // Wait for WPBakery to fully load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
            setTimeout(function() {
                removeSlider();
                addHeroSection();
            }, 1500);
        });
    } else {
        setTimeout(function() {
            removeSlider();
            addHeroSection();
        }, 1000);
    }
    
    // Monitor for WPBakery dynamic content
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        var html = node.innerHTML;
                        if (html && (html.includes("rev_slider") || html.includes("rs-module"))) {
                            setTimeout(removeSlider, 100);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log("WPBakery-Optimized Fix Applied");
})();
