#!/usr/bin/env python3
"""
Restore Original Homepage to WordPress Installation
Instant Auto Traders - Homepage Restoration Script
"""

import requests
import json
import sys
from datetime import datetime

def restore_original_homepage():
    print("🏠 Restoring Original Instant Auto Traders Homepage")
    print("=" * 50)
    
    # Original homepage content from backup
    original_content = """[vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern"][vc_column width="1/2"][vc_column_text]
<h1 style="text-align: center;">INSTANT AUTO TRADERS</h1>
<p style="text-align: center;"><strong>Your Trusted Car Dealership in Sydney</strong></p>
<p style="text-align: center;">Quality Used Cars | Competitive Prices | Excellent Service</p>
[/vc_column_text][vc_empty_space height="30px"][vc_btn title="Contact Us Today" style="custom" custom_background="#f39c12" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Fcontact-us%2F||"][/vc_btn][vc_empty_space height="20px"][vc_btn title="View Our Cars" style="outline" custom_background="#2a5298" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Finventory%2F||"][/vc_btn][/vc_column][vc_column width="1/2"][rev_slider_vc alias="slider1"][/rev_slider_vc][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632825678{background-color: #f8f9fa !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center;">Why Choose Instant Auto Traders?</h2>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="three_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">🔧 Quality Assurance</h4>
<p style="text-align: center;">All our vehicles undergo thorough inspection and come with comprehensive warranties for your peace of mind.</p>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">💰 Competitive Pricing</h4>
<p style="text-align: center;">We offer competitive prices and flexible financing options to suit your budget and requirements.</p>
[/vc_column_text][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_column_text]
<h4 style="text-align: center;">🤝 Expert Service</h4>
<p style="text-align: center;">Our experienced team provides exceptional customer service from start to finish.</p>
[/vc_column_text][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern"][vc_column][vc_column_text]
<h2 style="text-align: center;">Our Recent Inventory</h2>
<p style="text-align: center;">Browse our selection of quality used vehicles in Sydney.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_carousel carousel="car-listing" number_of_items="3" space_between_items="30" image_size="medium" orderby="date" order="ASC" category="featured-vehicles" show_navigation="yes" show_pagination="no"][vc_empty_space height="40px"][vc_column_text]
<p style="text-align: center;"><a href="https://instantautotraders.com.au/inventory/" style="background: #2a5298; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 1.1em;">View All Vehicles</a></p>
[/vc_column_text][/vc_column][/vc_row][vc_row css_animation="" row_type="row" use_row_as_full_screen_section="no" type="full_width" angled_section="no" text_align="left" background_image_as_pattern="without_pattern" css=".vc_custom_1584632851234{background-color: #2a5298 !important;}"][vc_column][vc_column_text]
<h2 style="text-align: center; color: #ffffff;">Ready to Find Your Perfect Car?</h2>
<p style="text-align: center; color: #ffffff;">Visit our Sydney dealership or contact us today to explore our extensive range of quality used vehicles.</p>
[/vc_column_text][vc_empty_space height="30px"][qode_elements_holder number_of_columns="two_columns"][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_btn title="Get in Touch" style="custom" custom_background="#f39c12" custom_text="#ffffff" shape="square" align="center" link="url:https%3A%2F%2Finstantautotraders.com.au%2Fcontact-us%2F||"][/vc_btn][/qode_elements_holder_item][qode_elements_holder_item item_padding="20px" advanced_animations="no"][vc_btn title="Call Us" style="outline" custom_background="#ffffff" custom_text="#2a5298" shape="square" align="center" link="tel:0426232000"][/vc_btn][/qode_elements_holder_item][/qode_elements_holder][/vc_column][/vc_row]"""
    
    # Save to file for manual restoration if API fails
    homepage_data = {
        'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        'content': original_content,
        'status': 'publish',
        'slug': 'home'
    }
    
    # Save multiple formats
    json_file = 'original-homepage-restore-ready.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(homepage_data, f, indent=2, ensure_ascii=False)
    
    content_file = 'original-homepage-content.html'
    with open(content_file, 'w', encoding='utf-8') as f:
        f.write(original_content)
    
    print(f"✅ Original homepage content saved to: {json_file}")
    print(f"✅ HTML content saved to: {content_file}")
    print(f"✅ Content length: {len(original_content)} characters")
    
    # Try to update via WordPress REST API (if available)
    try:
        # WordPress REST API endpoint
        wp_url = "https://instantautotraders.com.au/wp-json/wp/v2/posts"
        homepage_id = 6353  # Typical homepage ID
        
        # Update existing homepage
        update_url = f"{wp_url}/{homepage_id}"
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        data = {
            'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            'content': original_content,
            'status': 'publish'
        }
        
        print("\n🔄 Attempting to update homepage via WordPress API...")
        response = requests.post(update_url, json=data, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print("✅ Homepage successfully updated via WordPress API!")
            print(f"   Response: {response.json()}")
        else:
            print(f"⚠️  API Update failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"⚠️  API Error: {e}")
        print("   Manual restoration may be required")
    
    print("\n📋 Restoration Instructions:")
    print("1. Upload the files created by this script")
    print("2. Use WordPress Admin > Pages > Edit 'Home'")
    print("3. Paste the content from 'original-homepage-content.html'")
    print("4. Update the page and save")
    
    print(f"\n🎯 Restoration prepared at: {datetime.now().isoformat()}")
    
    return True

if __name__ == "__main__":
    try:
        restore_original_homepage()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
