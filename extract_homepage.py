#!/usr/bin/env python3
"""
Extract Original Homepage from WordPress Database
Instant Auto Traders - Homepage Content Extraction
"""

import mysql.connector
import json
from datetime import datetime

def extract_homepage():
    print("🏠 Extracting Original Homepage from Database")
    print("=" * 50)
    
    # Database configuration from files/wp-config.php
    db_config = {
        'host': 'localhost',
        'user': 'instanta_dnrv1',
        'password': 'P.lqHCzFHC7drlkONlW41',
        'database': 'instanta_dnrv1'
    }
    
    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("✅ Database connection successful")
        
        # Get WordPress settings for homepage
        print("📋 Getting WordPress homepage settings...")
        cursor.execute("""
            SELECT option_name, option_value 
            FROM ggeq_options 
            WHERE option_name IN ('show_on_front', 'page_on_front', 'siteurl', 'home')
        """)
        
        wp_settings = {}
        for row in cursor.fetchall():
            wp_settings[row['option_name']] = row['option_value']
            print(f"   {row['option_name']}: {row['option_value']}")
        
        # Get homepage ID
        homepage_id = wp_settings.get('page_on_front', '6353')
        print(f"\n🏠 Homepage ID: {homepage_id}")
        
        # Get the homepage content
        print("📄 Extracting homepage content...")
        cursor.execute("""
            SELECT ID, post_title, post_content, post_excerpt, post_status, 
                   post_date, post_modified, post_name
            FROM ggeq_posts 
            WHERE ID = %s AND post_type = 'page'
        """, (homepage_id,))
        
        homepage = cursor.fetchone()
        
        if homepage:
            print("\n✅ Original Homepage Found:")
            print(f"   ID: {homepage['ID']}")
            print(f"   Title: {homepage['post_title']}")
            print(f"   Status: {homepage['post_status']}")
            print(f"   Modified: {homepage['post_modified']}")
            print(f"   URL: {wp_settings.get('home', '')}/{homepage['post_name']}/")
            print(f"   Content Length: {len(homepage['post_content'])} characters")
            
            # Preview first 300 characters
            preview = homepage['post_content'][:300]
            print(f"\n📝 Content Preview:\n{preview}...")
            
            # Save to JSON file
            homepage_data = {
                'id': homepage['ID'],
                'title': homepage['post_title'],
                'content': homepage['post_content'],
                'excerpt': homepage['post_excerpt'],
                'status': homepage['post_status'],
                'slug': homepage['post_name'],
                'date': homepage['post_date'].isoformat() if homepage['post_date'] else None,
                'modified': homepage['post_modified'].isoformat() if homepage['post_modified'] else None,
                'url': f"{wp_settings.get('home', '')}/{homepage['post_name']}/",
                'wp_settings': wp_settings,
                'extraction_time': datetime.now().isoformat()
            }
            
            # Save multiple formats
            json_file = 'original-homepage-from-db.json'
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(homepage_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Saved to: {json_file}")
            
            # Save just content for direct restoration
            content_file = 'original-homepage-content-db.html'
            with open(content_file, 'w', encoding='utf-8') as f:
                f.write(homepage['post_content'])
            
            print(f"💾 Content saved to: {content_file}")
            
            # Also save as WordPress-ready format
            wp_format_file = 'original-homepage-wp-format.json'
            wp_data = {
                'title': {'rendered': homepage['post_title']},
                'content': {'rendered': homepage['post_content']},
                'excerpt': {'rendered': homepage['post_excerpt'] or ''},
                'status': homepage['post_status'],
                'slug': homepage['post_name']
            }
            
            with open(wp_format_file, 'w', encoding='utf-8') as f:
                json.dump(wp_data, f, indent=2, ensure_ascii=False)
            
            print(f"💾 WordPress format saved to: {wp_format_file}")
            
        else:
            print(f"❌ Homepage not found with ID: {homepage_id}")
            
            # List available pages to help
            cursor.execute("""
                SELECT ID, post_title, post_name, post_status 
                FROM ggeq_posts 
                WHERE post_type = 'page' 
                ORDER BY ID LIMIT 10
            """)
            
            pages = cursor.fetchall()
            print("\n📋 Available Pages:")
            for page in pages:
                print(f"   ID: {page['ID']} | {page['post_title']} | {page['post_name']} | {page['post_status']}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Homepage Extraction Complete!")
        
    except mysql.connector.Error as e:
        print(f"❌ Database Error: {e}")
        print("This might mean:")
        print("   - Database server is not running")
        print("   - Connection details are incorrect")
        print("   - Database doesn't exist")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    try:
        # Try to install mysql-connector if not available
        import mysql.connector
        extract_homepage()
    except ImportError:
        print("❌ mysql-connector-python not installed")
        print("Install with: pip install mysql-connector-python")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
