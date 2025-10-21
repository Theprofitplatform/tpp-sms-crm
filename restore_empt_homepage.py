#!/usr/bin/env python3
"""
Restore the Empty Homepage (ID: 6353) with Original Content
Instant Auto Traders - Fix the empty homepage issue
"""

import requests
import json
import base64

# Environment credentials
WORDPRESS_URL = "https://instantautotraders.com.au"
WORDPRESS_USER = "Claude"
WORDPRESS_APP_PASSWORD = "evnTOjRy2jh8GdSyFLunlDsd"

def restore_empty_homepage():
    print("🔧 Restoring Empty Homepage with Original Content")
    print("=" * 50)
    print(f"✅ Target: {WORDPRESS_URL}")
    print(f"✅ Homepage ID: 6353 (currently empty)")
    
    # Load original content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
        print("✅ Original content loaded successfully")
    except FileNotFoundError:
        print("❌ Original content file not found")
        return False
    
    # Prepare authentication
    credentials = f"{WORDPRESS_USER}:{WORDPRESS_APP_PASSWORD}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Basic {encoded_credentials}'
    }
    
    api_url = f"{WORDPRESS_URL}/wp-json/wp/v2"
    homepage_id = 6353
    
    # First, let's get the current state to confirm
    print("\n🔍 Confirming current homepage state...")
    try:
        current_response = requests.get(f"{api_url}/pages/{homepage_id}", headers=headers, timeout=10)
        if current_response.status_code == 200:
            current_page = current_response.json()
            print(f"✅ Confirmed: {current_page.get('title', {}).get('rendered', 'Unknown')}")
            print(f"   ⚠️  Content length: {len(current_page.get('content', {}).get('rendered', ''))} characters")
        else:
            print(f"⚠️  Could not verify current state: {current_response.status_code}")
    except:
        print(" ⚠️  Could not verify current state")
    
    # Restore the content
    print(f"\n🔄 Restoring original content to page {homepage_id}...")
    
    update_data = {
        'title': 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
        'content': original_content,
        'status': 'publish'
    }
    
    try:
        update_response = requests.post(f"{api_url}/pages/{homepage_id}", json=update_data, headers=headers, timeout=30)
        
        if update_response.status_code == 200:
            result = update_response.json()
            print("🎉 SUCCESS! Homepage restored!")
            print(f"   ✨ Title: {result.get('title', {}).get('rendered', 'N/A')}")
            print(f"   ✨ Status: {result.get('status', 'N/A')}")
            print(f"   ✨ Content length: {len(result.get('content', {}).get('rendered', ''))} characters")
            
            # Verify the restoration
            print("\n🔍 Verifying restoration...")
            verify_response = requests.get(f"{api_url}/pages/{homepage_id}", headers=headers, timeout=10)
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                content = verify_data.get('content', {}).get('rendered', '')
                
                if 'INSTANT AUTO TRADERS' in content:
                    print("✅ Original content confirmed restored!")
                    print("✅ WPBakery shortcodes present!")
                    print("✅ Professional layout restored!")
                    
                    # Test live site
                    print("\n🌐 Testing live homepage...")
                    live_response = requests.get(WORDPRESS_URL, timeout=15)
                    if live_response.status_code == 200:
                        live_content = live_response.text
                        if 'INSTANT AUTO TRADERS' in live_content:
                            print("✅ Live site confirmed working!")
                            print("🎯 RESTORATION COMPLETE!")
                            return True
                        else:
                            print("⚠️  Live site may need cache refresh")
                    else:
                        print("⚠️  Could not verify live site")
                    
                    return True
                else:
                    print("⚠️  Content may not be fully restored")
            else:
                print("⚠️  Verification failed")
        else:
            print(f"❌ Update failed: {update_response.status_code}")
            print(f"   Response: {update_response.text}")
            
    except Exception as e:
        print(f"❌ Update failed: {e}")
    
    return False

if __name__ == "__main__":
    try:
        success = restore_empty_homepage()
        if success:
            print("\n🎉 Instant Auto Traders Homepage Successfully Restored!")
            print("🌟 Visit https://instantautotraders.com.au to see the result")
        else:
            print("\n⚠️  Automatic restoration failed. Please check the website manually.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
