#!/usr/bin/env python3
"""
Find the Actual Homepage that's Currently Displayed
Instant Auto Traders - Homepage Investigation
"""

import requests
import json
import base64
from bs4 import BeautifulSoup
import re

# Use environment credentials
WORDPRESS_URL = "https://instantautotraders.com.au"
WORDPRESS_USER = "Claude"
WORDPRESS_APP_PASSWORD = "evnTOjRy2jh8GdSyFLunlDsd"

def find_current_homepage():
    print("🔍 Investigating Currently Displayed Homepage")
    print("=" * 50)
    
    # Check the actual live site
    print("🌐 Analyzing live homepage content...")
    try:
        response = requests.get(WORDPRESS_URL, timeout=15)
        if response.status_code == 200:
            html_content = response.text
            
            # Look for page identifier in HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Check for page ID in body class or data attributes
            body_class = soup.find('body').get('class', []) if soup.find('body') else []
            page_id_match = None
            
            # Look for page-id in body classes
            for class_name in body_class:
                if 'page-id-' in str(class_name):
                    page_id_match = re.search(r'page-id-(\d+)', str(class_name))
                    if page_id_match:
                        page_id = page_id_match.group(1)
                        print(f"✅ Found page ID in HTML: {page_id}")
                        return page_id
            
            # Look for WordPress JSON in page source
            wp_json_match = re.search(r'"page_id":(\d+)', html_content)
            if wp_json_match:
                page_id = wp_json_match.group(1)
                print(f"✅ Found page ID in JSON: {page_id}")
                return page_id
            
            # Look for page ID in page links
            page_links = soup.find_all('a', href=True)
            for link in page_links:
                href = link.get('href', '')
                if 'page_id=' in href:
                    page_id_match = re.search(r'page_id=(\d+)', href)
                    if page_id_match:
                        page_id = page_id_match.group(1)
                        print(f"✅ Found page ID in link: {page_id}")
                        return page_id
            
            print("⚠️  Could not find page ID in HTML analysis")
        
    except Exception as e:
        print(f"❌ Error analyzing live site: {e}")
    
    # Check WordPress API for the front page setting
    print("\n🔧 Checking WordPress API for front page...")
    try:
        # Try to get WordPress settings without auth first
        response = requests.get(f"{WORDPRESS_URL}/wp-json/wp/v2/settings", timeout=10)
        if response.status_code == 200:
            settings = response.json()
            front_page_id = settings.get('page_on_front')
            if front_page_id:
                print(f"✅ Front page ID from settings: {front_page_id}")
                return front_page_id
            
    except Exception as e:
        print(f"   Settings check failed: {e}")
    
    # Try with authentication
    print("\n🔐 Using authenticated API...")
    try:
        credentials = f"{WORDPRESS_USER}:{WORDPRESS_APP_PASSWORD}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            'Authorization': f'Basic {encoded_credentials}'
        }
        
        # Get settings
        response = requests.get(f"{WORDPRESS_URL}/wp-json/wp/v2/settings", headers=headers, timeout=10)
        if response.status_code == 200:
            settings = response.json()
            front_page_id = settings.get('page_on_front')
            if front_page_id:
                print(f"✅ Authenticated front page ID: {front_page_id}")
                return front_page_id
        
        # List all pages and look for home or front page
        response = requests.get(f"{WORDPRESS_URL}/wp-json/wp/v2/pages?per_page=100", headers=headers, timeout=10)
        if response.status_code == 200:
            pages = response.json()
            
            for page in pages:
                title = page.get('title', {}).get('rendered', '').lower()
                slug = page.get('slug', '').lower()
                page_id = page.get('id')
                
                # Check various indicators of front/home page
                if (slug == 'home' or 'front' in slug or 
                    'home' in title or 'front' in title or
                    page_id in [2, 6, 7, 1] or
                    'welcome' in title):
                    
                    print(f"✅ Potential homepage: ID {page_id} - {title} (slug: {slug})")
                    
                    # Check if this page is likely the homepage
                    if slug == 'home' or page_id in [2, 6, 7]:
                        return page_id
        
    except Exception as e:
        print(f"   Authenticated API check failed: {e}")
    
    # Check common homepage IDs
    common_ids = [1, 2, 6, 7, 361, 6353]
    print(f"\n🔍 Checking common homepage IDs: {common_ids}")
    
    for page_id in common_ids:
        try:
            response = requests.get(f"{WORDPRESS_URL}/wp-json/wp/v2/pages/{page_id}", timeout=5)
            if response.status_code == 200:
                page = response.json()
                title = page.get('title', {}).get('rendered', '')
                slug = page.get('slug', '')
                print(f"   ID {page_id}: {title} ({slug})")
                
                if slug == 'home' or 'home' in title.lower():
                    print(f"✅ Found match: {title}")
                    return page_id
                    
        except:
            continue
    
    print("❌ Could not definitively identify the homepage ID")
    return None

def analyze_current_content(page_id):
    """Analyze what's currently on the homepage"""
    print(f"\n📄 Analyzing current content for page ID: {page_id}")
    
    try:
        response = requests.get(f"{WORDPRESS_URL}/wp-json/wp/v2/pages/{page_id}", timeout=10)
        if response.status_code == 200:
            page = response.json()
            
            title = page.get('title', {}).get('rendered', '')
            content = page.get('content', {}).get('rendered', '')
            
            print(f"✅ Current Title: {title}")
            print(f"✅ Content Length: {len(content)} characters")
            
            # Extract key content indicators
            content_lower = content.lower()
            
            print("\n📋 Content Analysis:")
            if 'instant auto traders' in content_lower:
                print("   ✓ Contains 'Instant Auto Traders'")
            else:
                print("   ✗ Missing 'Instant Auto Traders'")
            
            if 'car' in content_lower:
                print("   ✓ Contains 'car' related content")
            else:
                print("   ✗ Missing car-related content")
            
            if 'sell' in content_lower:
                print("   ✓ Contains 'sell' related content")
            else:
                print("   ✗ Missing sell-related content")
            
            if 'sydney' in content_lower:
                print("   ✓ Contains 'Sydney' location")
            else:
                print("   ✗ Missing Sydney location")
            
            # Show snippet of current content
            snippet = content[:500].replace('\n', ' ').strip()
            print(f"\n📝 Current Content Preview:")
            print(f"   {snippet}...")
            
            return True
            
    except Exception as e:
        print(f"❌ Error analyzing content: {e}")
        return False

def create_extract_script(page_id):
    """Create a script to extract the actual homepage content"""
    print(f"\n🔧 Creating extraction script for page ID: {page_id}")
    
    extract_script = f"""<?php
/**
 * Extract Actual Homepage Content 
 * Run this script to extract the current homepage content
 */

// WordPress Environment
require_once('./wp-config.php');

global $wpdb;

$page_id = {page_id};

// Get current homepage content
$homepage = $wpdb->get_row($wpdb->prepare(
    "SELECT ID, post_title, post_content, post_excerpt, post_status FROM {{$wpdb->posts}} WHERE ID = %d AND post_type = 'page'", 
    $page_id
));

if ($homepage) {{
    echo "🏠 Current Homepage Content:\\n";
    echo "ID: " . $homepage->ID . "\\n";
    echo "Title: " . $homepage->post_title . "\\n";
    echo "Status: " . $homepage->post_status . "\\n";
    echo "Content Length: " . strlen($homepage->post_content) . " characters\\n";
    echo "\\n--- FULL CONTENT ---\\n";
    echo $homepage->post_content;
    
    // Save to file
    $content_file = 'current-homepage-' . date('Y-m-d-H-i-s') . '.html';
    file_put_contents($content_file, $homepage->post_content);
    echo "\\n\\n✅ Content saved to: " . $content_file;
    
}} else {{
    echo "❌ No page found with ID: $page_id\\n";
}}
?>"""
    
    with open('extract_current_homepage.php', 'w') as f:
        f.write(extract_script)
    
    print("✅ Created extract_current_homepage.php")
    return True

if __name__ == "__main__":
    try:
        homepage_id = find_current_homepage()
        
        if homepage_id:
            analyze_current_content(homepage_id)
            create_extract_script(homepage_id)
            
            print(f"\n📋 NEXT STEPS:")
            print(f"1. Upload 'extract_current_homepage.php' to WordPress root")
            print(f"2. Visit: https://instantautotraders.com.au/extract_current_homepage.php")
            print(f"3. This will show you the current homepage content and save it to a file")
            print(f"4. Then decide if you want to restore the original content or keep current")
            
        else:
            print("\n❌ Could not determine the homepage ID")
            print("Please check manually in WordPress Admin:")
            print("1. Settings > Reading")
            print("2. Note the 'Homepage' page ID")
            
    except Exception as e:
        print(f"❌ Error: {e}")
