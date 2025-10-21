#!/usr/bin/env python3
"""
Direct WordPress Database Restoration
Instant Auto Traders - Direct database update using WordPress credentials
"""

import mysql.connector
import json
import sys
from datetime import datetime

# Database credentials from wp-config.php
DB_NAME = 'instanta_dnrv1'
DB_USER = 'instanta_dnrv1'
DB_PASSWORD = 'P.lqHCzFHC7drlkONlW41'
DB_HOST = 'localhost'
TABLE_PREFIX = 'ggeq_'

def restore_homepage_via_database():
    print("🗄️ Restoring Original Homepage via Direct Database")
    print("=" * 50)
    print(f"✅ Database: {DB_NAME}")
    print(f"✅ Host: {DB_HOST}")
    
    # Load the original content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
        print("✅ Original homepage content loaded")
    except FileNotFoundError:
        print("❌ Original homepage content file not found")
        return False
    
    try:
        # Connect to database
        print("\n🔌 Connecting to WordPress database...")
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4'
        )
        cursor = conn.cursor(dictionary=True)
        print("✅ Database connection successful")
        
        # Find the homepage
        print("\n🔍 Finding homepage post...")
        
        # Try to get homepage from WordPress settings
        cursor.execute(f"SELECT option_value FROM {TABLE_PREFIX}options WHERE option_name = 'page_on_front'")
        result = cursor.fetchone()
        
        homepage_id = None
        if result:
            homepage_id = result['option_value']
            print(f"✅ Found homepage ID from settings: {homepage_id}")
        else:
            # Try to find page with slug 'home'
            cursor.execute(f"SELECT ID, post_title, post_status FROM {TABLE_PREFIX}posts WHERE post_type = 'page' AND post_name = 'home'")
            result = cursor.fetchone()
            if result:
                homepage_id = result['ID']
                print(f"✅ Found homepage by slug: ID {homepage_id} - {result['post_title']}")
            else:
                # Use known homepage ID
                homepage_id = 6353
                print(f"🎯 Using known homepage ID: {homepage_id}")
        
        # Verify homepage exists
        cursor.execute(f"SELECT ID, post_title, post_status FROM {TABLE_PREFIX}posts WHERE ID = %s AND post_type = 'page'", (homepage_id,))
        homepage = cursor.fetchone()
        
        if not homepage:
            print(f"❌ Homepage with ID {homepage_id} not found")
            return False
        
        print(f"✅ Found homepage: ID {homepage['ID']} - {homepage['post_title']}")
        
        # Backup current content
        print("\n💾 Backing up current homepage content...")
        cursor.execute(f"SELECT post_content FROM {TABLE_PREFIX}posts WHERE ID = %s", (homepage_id,))
        current_content = cursor.fetchone()
        backup_file = f"homepage-backup-before-restore-{datetime.now().strftime('%Y%m%d-%H%M%S')}.html"
        
        if current_content:
            with open(backup_file, 'w', encoding='utf-8') as f:
                f.write(current_content['post_content'])
            print(f"✅ Current content backed up to: {backup_file}")
        
        # Update homepage
        print(f"\n🔄 Updating homepage (ID: {homepage_id})...")
        
        update_query = f"""
            UPDATE {TABLE_PREFIX}posts 
            SET 
                post_title = %s,
                post_content = %s,
                post_modified = %s,
                post_modified_gmt = %s
            WHERE ID = %s
        """
        
        current_time = datetime.now()
        current_time_gmt = datetime.utcnow()
        
        cursor.execute(update_query, (
            'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
            original_content,
            current_time.strftime('%Y-%m-%d %H:%M:%S'),
            current_time_gmt.strftime('%Y-%m-%d %H:%M:%S'),
            homepage_id
        ))
        
        # Verify update
        cursor.execute(f"SELECT post_title, post_content FROM {TABLE_PREFIX}posts WHERE ID = %s", (homepage_id,))
        updated = cursor.fetchone()
        
        if updated and 'INSTANT AUTO TRADERS' in updated['post_content']:
            conn.commit()
            print("✅ SUCCESS! Homepage restored via database!")
            print(f"   ✨ Title: {updated['post_title']}")
            print(f"   ✨ Content length: {len(updated['post_content'])} characters")
            
            # Update post meta if needed
            cursor.execute(f"SELECT meta_value FROM {TABLE_PREFIX}postmeta WHERE post_id = %s AND meta_key = '_wp_page_template'", (homepage_id,))
            template_exists = cursor.fetchone()
            
            if not template_exists:
                cursor.execute(f"INSERT INTO {TABLE_PREFIX}postmeta (post_id, meta_key, meta_value) VALUES (%s, '_wp_page_template', 'default')", (homepage_id,))
                print("✅ Added default page template")
            
            # Clear WordPress cache if possible
            try:
                cursor.execute(f"DELETE FROM {TABLE_PREFIX}options WHERE option_name LIKE 'transient_%'")
                cursor.execute(f"DELETE FROM {TABLE_PREFIX}options WHERE option_name LIKE '_transient_%'")
                conn.commit()
                print("✅ Cleared WordPress transients/cache")
            except:
                pass
            
            conn.close()
            return True
        else:
            print("❌ Update verification failed")
            conn.rollback()
            conn.close()
            return False
            
    except mysql.connector.Error as e:
        print(f"❌ Database Error: {e}")
        print("   Possible causes:")
        print("   - Database server not running")
        print("   - Connection credentials incorrect")
        print("   - Database doesn't exist")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def create_sql_restore_script():
    """Create a SQL script for manual restoration"""
    
    # Load original content
    try:
        with open('original-homepage-content.html', 'r', encoding='utf-8') as f:
            original_content = f.read()
    except:
        return False
    
    # Escape content for SQL
    escaped_content = original_content.replace("'", "\\'").replace('"', '\\"')
    
    sql_script = f"""
-- Instant Auto Traders Homepage Restoration SQL
-- Run this in phpMyAdmin or MySQL client

-- Backup current homepage (optional)
CREATE TABLE IF NOT EXISTS {TABLE_PREFIX}posts_backup AS SELECT * FROM {TABLE_PREFIX}posts WHERE ID = 6353;

-- Update homepage with original content
UPDATE {TABLE_PREFIX}posts 
SET 
    post_title = 'Instant Auto Traders - Your Trusted Car Dealership in Sydney',
    post_content = '{escaped_content}',
    post_modified = NOW(),
    post_modified_gmt = UTC_TIMESTAMP()
WHERE ID = 6353 AND post_type = 'page';

-- Verify update
SELECT post_title, LENGTH(post_content) as content_length 
FROM {TABLE_PREFIX}posts 
WHERE ID = 6353 AND post_type = 'page';

-- Clear cache
DELETE FROM {TABLE_PREFIX}options WHERE option_name LIKE 'transient_%';
DELETE FROM {TABLE_PREFIX}options WHERE option_name LIKE '_transient_%';
"""
    
    with open('homepage_restore.sql', 'w') as f:
        f.write(sql_script)
    
    print("✅ SQL restore script created: homepage_restore.sql")
    return True

if __name__ == "__main__":
    try:
        success = restore_homepage_via_database()
        if not success:
            print("\n🔄 Creating SQL fallback script...")
            create_sql_restore_script()
            print("\n⚠️  Database connection failed.")
            print("📋 Try running the SQL script manually in phpMyAdmin")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
