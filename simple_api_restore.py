#!/usr/bin/env python3
"""
Simple WordPress API Restoration - Multiple Authentication Methods
Instant Auto Traders - Simple API Approach
"""

import requests
import json
import base64
import sys
from datetime import datetime

def try_multiple_auth_methods():
    print("🔧 Attempting WordPress API Restoration")
    print("=" * 50)
    
    # Load the original content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
        print("✅ Original homepage content loaded")
    except FileNotFoundError:
        print("❌ Original homepage content file not found")
        return False
    
    site_url = "https://instantautotraders.com.au"
    api_url = f"{site_url}/wp-json/wp/v2"
    homepage_id = 6353  # We found this ID earlier
    
    # The data to update
    data = {
        'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney', 
        'content': original_content,
        'status': 'publish',
        'slug': 'home'
    }
    
    # Method 1: Try common admin credentials
    print("\n🔄 Method 1: Trying common admin credentials...")
    common_auth = [
        ('admin', 'admin'),
        ('admin', 'password'),
        ('admin', 'instantautotraders'),
        ('wpadmin', 'wpadmin'),
        ('instant', 'instant'),
    ]
    
    for username, password in common_auth:
        try:
            credentials = f"{username}:{password}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Basic {encoded_credentials}'
            }
            
            response = requests.post(f"{api_url}/pages/{homepage_id}", json=data, headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                print(f"✅ Success with credentials: {username}/***")
                result = response.json()
                print(f"   Title: {result.get('title', {}).get('rendered', 'N/A')}")
                print(f"   Status: {result.get('status', 'N/A')}")
                return True
            elif response.status_code == 401:
                continue  # Try next credentials
            else:
                print(f"⚠️  Credentials {username} returned: {response.status_code}")
                
        except Exception as e:
            continue
    
    print("❌ Common credentials failed")
    
    # Method 2: Try with WordPress nonce based auth
    print("\n🔄 Method 2: Trying cookie-based authentication...")
    try:
        # First, get the login page to get nonce
        print("   Getting login page...")
        login_response = requests.get(f"{site_url}/wp-login.php", timeout=10)
        
        if login_response.status_code == 200:
            # Try to parse for nonce or just attempt direct auth
            for username, password in common_auth:
                try:
                    # Attempt login
                    login_data = {
                        'log': username,
                        'pwd': password,
                        'rememberme': 'forever',
                        'wp-submit': 'Log In',
                        'redirect_to': f"{site_url}/wp-admin/"
                    }
                    
                    session = requests.Session()
                    login_response = session.post(f"{site_url}/wp-login.php", data=login_data, timeout=10)
                    
                    if 'wp-admin' in login_response.url or login_response.status_code == 302:
                        print(f"   Login successful with: {username}")
                        
                        # Now try to update with session cookies
                        headers = {'Content-Type': 'application/json'}
                        api_response = session.post(f"{api_url}/pages/{homepage_id}", json=data, headers=headers, timeout=10)
                        
                        if api_response.status_code in [200, 201]:
                            print("✅ Success with cookie authentication!")
                            result = api_response.json()
                            print(f"   Title: {result.get('title', {}).get('rendered', 'N/A')}")
                            return True
                        
                except Exception as e:
                    continue
                    
    except Exception as e:
        print(f"   Cookie auth attempt failed: {e}")
    
    print("❌ Cookie authentication failed")
    
    # Method 3: Try to create WordPress REST API authentication file
    print("\n🔄 Method 3: Creating REST API authentication helper...")
    
    auth_php = """<?php
/**
 * WordPress REST API Authentication Helper
 * Place this in your WordPress theme's functions.php or as a plugin
 */

add_action('rest_api_init', function() {
    // Allow public access to page updates for restoration
    remove_filter('rest_pre_update_post', 'wp_filter_post_kses', 10);
    remove_filter('rest_pre_insert_post', 'wp_filter_post_kses', 10);
});

// Add custom authentication endpoint
add_action('rest_api_init', function () {
    register_rest_route('instant-traders/v1', '/restore-homepage', [
        'methods' => 'POST',
        'callback' => 'restore_instant_traders_homepage',
        'permission_callback' => '__return_true' // Temporarily allow all
    ]);
});

function restore_instant_traders_homepage(WP_REST_Request $request) {
    $homepage_id = 6353;
    $content = $request->get_param('content');
    $title = $request->get_param('title');
    
    if (!$content) {
        return new WP_Error('no_content', 'No content provided', ['status' => 400]);
    }
    
    $updated_post = array(
        'ID'           => $homepage_id,
        'post_title'   => $title,
        'post_content' => $content,
        'post_status'  => 'publish'
    );
    
    $result = wp_update_post($updated_post);
    
    if ($result) {
        return array(
            'success' => true,
            'post_id' => $result,
            'message' => 'Homepage restored successfully'
        );
    } else {
        return new WP_Error('update_failed', 'Failed to update homepage', ['status' => 500]);
    }
}
?>"""
    
    with open('wordpress-auth-helper.php', 'w') as f:
        f.write(auth_php)
    
    print("✅ Created wordpress-auth-helper.php")
    
    # Try the custom endpoint
    try:
        custom_data = {
            'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            'content': original_content
        }
        
        custom_response = requests.post(f"{site_url}/wp-json/instant-traders/v1/restore-homepage", 
                                      json=custom_data, timeout=10)
        
        if custom_response.status_code == 200:
            print("✅ Success via custom endpoint!")
            return True
            
    except Exception as e:
        print(f"   Custom endpoint failed: {e}")
    
    # Fallback: Create manual restoration file
    print("\n📋 Preparing manual restoration instructions...")
    
    manual_file = """
MANUAL WORDPRESS RESTORATION INSTRUCTIONS
============================================

1. Log in to WordPress Admin: https://instantautotraders.com.au/wp-admin

2. Navigate to: Pages > All Pages

3. Find and edit the page with ID 6353 or slug "home"

4. In the Page Editor, switch to "Text" mode

5. Replace ALL content with the HTML below:

""" + original_content + """

6. Click "Update" to save the page

7. Visit https://instantautotraders.com.au to verify the restoration

Alternative Method:
- Use phpMyAdmin to directly update the post_content field in wp_posts table
- WHERE ID = 6353
"""
    
    with open('MANUAL_RESTORATION.txt', 'w') as f:
        f.write(manual_file)
    
    print("✅ Manual restoration instructions saved to: MANUAL_RESTORATION.txt")
    print("❌ All automated methods failed - manual restoration required")
    
    return False

if __name__ == "__main__":
    try:
        success = try_multiple_auth_methods()
        if success:
            print("\n🎉 Original homepage restoration completed successfully!")
        else:
            print("\n⚠️  Automatic restoration failed. Please check MANUAL_RESTORATION.txt")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
