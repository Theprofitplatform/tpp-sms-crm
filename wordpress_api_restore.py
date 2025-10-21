#!/usr/bin/env python3
"""
Restore Original Homepage using WordPress REST API with Authentication
Instant Auto Traders - WordPress API Restoration
"""

import requests
import json
import base64
import sys
from datetime import datetime

def restore_homepage_via_api():
    print("🔧 Restoring Original Homepage via WordPress REST API")
    print("=" * 50)
    
    # WordPress site configuration
    site_url = "https://instantautotraders.com.au"
    api_url = f"{site_url}/wp-json/wp/v2"
    
    # Read the original homepage content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
        print("✅ Original homepage content loaded")
    except FileNotFoundError:
        print("❌ Original homepage content file not found")
        return False
    
    # First, let's try to find the actual homepage post
    def get_homepage_id():
        print("🔍 Finding homepage post ID...")
        
        # Try to get WordPress settings
        try:
            response = requests.get(f"{api_url}/settings", timeout=10)
            if response.status_code == 200:
                settings = response.json()
                homepage_id = settings.get('page_on_front')
                if homepage_id:
                    print(f"✅ Found homepage ID from settings: {homepage_id}")
                    return homepage_id
        except:
            pass
        
        # Try to find page with slug 'home'
        try:
            response = requests.get(f"{api_url}/pages?slug=home", timeout=10)
            if response.status_code == 200:
                pages = response.json()
                if pages:
                    homepage_id = pages[0]['id']
                    print(f"✅ Found homepage ID by slug: {homepage_id}")
                    return homepage_id
        except:
            pass
        
        # Try common homepage IDs
        common_ids = [6353, 2, 1, 7874]
        for post_id in common_ids:
            try:
                response = requests.get(f"{api_url}/pages/{post_id}", timeout=5)
                if response.status_code == 200:
                    page = response.json()
                    if page.get('slug') in ['home', 'front-page', 'homepage'] or page.get('title', '').lower().startswith('home'):
                        print(f"✅ Found homepage ID: {post_id} - {page.get('title')}")
                        return post_id
            except:
                continue
        
        print("❌ Could not determine homepage ID")
        return None
    
    # Get the homepage ID
    homepage_id = get_homepage_id()
    if not homepage_id:
        print("❌ Cannot proceed without homepage ID")
        return False
    
    # Method 1: Try without authentication first
    print("\n🔄 Attempting update without authentication...")
    try:
        headers = {'Content-Type': 'application/json'}
        data = {
            'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            'content': original_content,
            'status': 'publish',
            'slug': 'home'
        }
        
        response = requests.post(f"{api_url}/pages/{homepage_id}", json=data, headers=headers, timeout=30)
        if response.status_code in [200, 201]:
            print("✅ Homepage updated successfully without authentication!")
            return True
        else:
            print(f"⚠️  Unauthenticated update failed: {response.status_code}")
    except Exception as e:
        print(f"⚠️  Unauthenticated update error: {e}")
    
    # Method 2: Try with Application Password
    print("\n🔄 Attempting update with Application Password...")
    
    # You'll need to create an Application Password in WordPress Admin
    # Users > Your Profile > Application Passwords
    app_username = "admin"  # Change to your WordPress username
    app_password = "xxxx xxxx xxxx xxxx xxxx xxxx"  # Replace with actual app password
    
    if app_password == "xxxx xxxx xxxx xxxx xxxx xxxx":
        print("❌ Application password not configured")
        print("Please:")
        print("1. Go to WordPress Admin > Users > Your Profile")
        print("2. Scroll down to 'Application Passwords'")
        print("3. Create a new app password")
        print("4. Update the app_password variable in this script")
        return False
    
    # Encode credentials
    credentials = f"{app_username}:{app_password}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Basic {encoded_credentials}'
    }
    
    try:
        response = requests.post(f"{api_url}/pages/{homepage_id}", json=data, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print("✅ Homepage updated successfully with Application Password!")
            result = response.json()
            print(f"   Title: {result.get('title', {}).get('rendered', 'N/A')}")
            print(f"   Status: {result.get('status', 'N/A')}")
            print(f"   Updated: {result.get('modified', 'N/A')}")
            return True
        else:
            print(f"❌ Application Password update failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Application Password update error: {e}")
    
    # Method 3: Try to create a new page if update fails
    print("\n🔄 Attempting to create new homepage page...")
    try:
        new_page_data = {
            'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            'content': original_content,
            'status': 'publish',
            'slug': 'home-restore',
            'type': 'page'
        }
        
        response = requests.post(f"{api_url}/pages", json=new_page_data, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print("✅ New homepage page created successfully!")
            result = response.json()
            print(f"   New Page ID: {result.get('id')}")
            print(f"   Title: {result.get('title', {}).get('rendered', 'N/A')}")
            print("⚠️  You may need to set this as the front page in WordPress Settings > Reading")
            return True
        else:
            print(f"❌ Page creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Page creation error: {e}")
    
    # Save manual restoration file if all API methods fail
    print("\n📋 All API methods failed. Preparing manual restoration...")
    
    manual_restore = {
        'homepage_id': homepage_id,
        'site_url': site_url,
        'content': original_content,
        'instructions': [
            "1. Log in to WordPress Admin",
            f"2. Go to Pages > Edit page with ID {homepage_id}",
            "3. Replace the content with the HTML from original-homepage-content.html",
            "4. Update and save the page",
            "5. Check the frontend to verify the restoration"
        ]
    }
    
    with open('manual-restoration-instructions.json', 'w', encoding='utf-8') as f:
        json.dump(manual_restore, f, indent=2, ensure_ascii=False)
    
    print("✅ Manual restoration instructions saved to: manual-restoration-instructions.json")
    return False

if __name__ == "__main__":
    try:
        success = restore_homepage_via_api()
        if success:
            print("\n🎉 Originial homepage restoration completed successfully!")
        else:
            print("\n⚠️  Automatic restoration failed. Please follow the manual instructions.")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
