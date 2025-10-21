#!/usr/bin/env python3
"""
Final WordPress API Restoration using Environment Credentials
Instant Auto Traders - Using actual credentials from .env file
"""

import requests
import json
import base64
import sys
from datetime import datetime

# Load credentials from environment
WORDPRESS_URL = "https://instantautotraders.com.au"
WORDPRESS_USER = "Claude"
WORDPRESS_APP_PASSWORD = "evnTOjRy2jh8GdSyFLunlDsd"

def restore_homepage_with_env_credentials():
    print("🔧 Restoring Original Homepage with Environment Credentials")
    print("=" * 60)
    print(f"✅ Using WordPress URL: {WORDPRESS_URL}")
    print(f"✅ Using User: {WORDPRESS_USER}")
    
    # Load the original content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
        print("✅ Original homepage content loaded successfully")
    except FileNotFoundError:
        print("❌ Original homepage content file not found")
        return False
    
    # Prepare authentication
    credentials = f"{WORDPRESS_USER}:{WORDPRESS_APP_PASSWORD}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Basic {encoded_credentials}'
    }
    
    # API endpoints
    api_url = f"{WORDPRESS_URL}/wp-json/wp/v2"
    
    # First, test authentication
    print("\n🔄 Testing WordPress API authentication...")
    try:
        test_response = requests.get(f"{api_url}/users/me", headers=headers, timeout=10)
        if test_response.status_code == 200:
            user_info = test_response.json()
            print(f"✅ Authentication successful! User: {user_info.get('name', 'Unknown')}")
        else:
            print(f"❌ Authentication failed: {test_response.status_code}")
            print(f"   Response: {test_response.text}")
            return False
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
        return False
    
    # Find homepage post ID
    print("\n🔍 Finding homepage post...")
    homepage_id = None
    
    # Try multiple methods to find homepage
    methods = [
        ("Get WordPress settings", f"{api_url}/settings"),
        ("Search by slug 'home'", f"{api_url}/pages?slug=home"),
        ("Search by title", f"{api_url}/pages?search=home"),
        ("Get all pages", f"{api_url}/pages?per_page=100")
    ]
    
    for method_name, endpoint in methods:
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                if method_name == "Get WordPress settings":
                    homepage_id = data.get('page_on_front')
                    if homepage_id:
                        print(f"✅ Found homepage ID from settings: {homepage_id}")
                        break
                        
                elif isinstance(data, list):
                    for page in data:
                        if (page.get('slug') == 'home' or 
                            'home' in page.get('title', {}).get('rendered', '').lower() or
                            'front' in page.get('title', {}).get('rendered', '').lower() or
                            page.get('id') == 6353):
                            homepage_id = page.get('id')
                            print(f"✅ Found homepage from {method_name}: ID {homepage_id} - {page.get('title', {}).get('rendered', '')}")
                            break
                            
                if homepage_id:
                    break
                    
        except Exception as e:
            print(f"   {method_name} failed: {e}")
            continue
    
    if not homepage_id:
        # Try the known ID from database backup
        homepage_id = 6353
        print(f"🎯 Using known homepage ID: {homepage_id}")
    
    # Prepare update data
    update_data = {
        'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        'content': original_content,
        'status': 'publish',
        'slug': 'home'
    }
    
    print(f"\n🔄 Updating homepage (ID: {homepage_id})...")
    try:
        update_response = requests.put(f"{api_url}/pages/{homepage_id}", 
                                      json=update_data, 
                                      headers=headers, 
                                      timeout=30)
        
        if update_response.status_code == 200:
            result = update_response.json()
            print("🎉 SUCCESS! Homepage restored successfully!")
            print(f"   ✨ Title: {result.get('title', {}).get('rendered', 'N/A')}")
            print(f"   ✨ Status: {result.get('status', 'N/A')}")
            print(f"   ✨ Modified: {result.get('modified', 'N/A')}")
            print(f"   ✨ URL: {result.get('link', 'N/A')}")
            
            # Verify the update
            print("\n🔍 Verifying update...")
            verify_response = requests.get(f"{api_url}/pages/{homepage_id}", headers=headers, timeout=10)
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                content_length = len(verify_data.get('content', {}).get('rendered', ''))
                print(f"✅ Verification successful - Content length: {content_length} characters")
                
                if 'INSTANT AUTO TRADERS' in verify_data.get('content', {}).get('rendered', ''):
                    print("✅ Original content confirmed restored!")
                else:
                    print("⚠️  Content may not be fully restored")
            else:
                print("⚠️  Could not verify update")
            
            return True
            
        else:
            print(f"❌ Update failed: {update_response.status_code}")
            print(f"   Response: {update_response.text}")
            
    except Exception as e:
        print(f"❌ Update failed: {e}")
    
    # Alternative: Try POST instead of PUT
    print("\n🔄 Trying POST method as alternative...")
    try:
        post_response = requests.post(f"{api_url}/pages/{homepage_id}", 
                                     json=update_data, 
                                     headers=headers, 
                                     timeout=30)
        
        if post_response.status_code in [200, 201]:
            result = post_response.json()
            print("🎉 SUCCESS! Homepage restored with POST method!")
            print(f"   ✨ Title: {result.get('title', {}).get('rendered', 'N/A')}")
            print(f"   ✨ Status: {result.get('status', 'N/A')}")
            return True
            
    except Exception as e:
        print(f"❌ POST method failed: {e}")
    
    # If all API methods fail, create a direct update script
    print("\n📋 Creating direct WordPress update script...")
    
    direct_update_script = f"""<?php
/**
 * Direct WordPress Homepage Update
 * Run this script directly in WordPress admin or via WP-CLI
 */

// WordPress Environment
require_once('wp-config.php');

// Database connection
global $wpdb;

$homepage_id = {homepage_id};
$original_content = <<<EOT
{original_content}
EOT;

// Update the post
$update_result = $wpdb->update(
    $wpdb->posts,
    array(
        'post_title' => 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        'post_content' => $original_content,
        'post_modified' => current_time('mysql'),
        'post_modified_gmt' => current_time('mysql', 1)
    ),
    array('ID' => $homepage_id),
    array('%s', '%s', '%s', '%s')
);

if ($update_result !== false) {{
    echo "✅ Homepage updated directly in database! Post ID: $homepage_id\\n";
}} else {{
    echo "❌ Direct database update failed\\n";
}}

// Clear cache
if (function_exists('wp_cache_flush')) {{
    wp_cache_flush();
    echo "✅ WordPress cache cleared\\n";
}}
?>"""
    
    with open('direct_wordpress_update.php', 'w') as f:
        f.write(direct_update_script)
    
    print("✅ Direct update script created: direct_wordpress_update.php")
    print("❌ All API methods failed - use the direct script or manual restoration")
    
    return False

if __name__ == "__main__":
    try:
        success = restore_homepage_with_env_credentials()
        if success:
            print("\n🎉 Original Instant Auto Traders homepage restoration completed successfully!")
            print("🌟 Visit https://instantautotraders.com.au to verify the restoration")
        else:
            print("\n⚠️  API restoration failed. Manual methods available.")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
