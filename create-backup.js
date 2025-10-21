#!/usr/bin/env node

/**
 * Create Backup Snapshot
 * Saves current state before making changes
 */

import axios from 'axios';
import fs from 'fs';

const WP_URL = 'https://instantautotraders.com.au';
const WP_USER = 'Claude';
const WP_APP_PASSWORD = 'evnTOjRy2jh8GdSyFLunlDsd';
const BASE_AUTH = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const headers = {
  'Authorization': `Basic ${BASE_AUTH}`,
  'Content-Type': 'application/json'
};

async function createBackup() {
  console.log('\n🔒 Creating backup snapshot...\n');

  try {
    const response = await axios.get(`${WP_URL}/wp-json/wp/v2/posts`, {
      headers,
      params: {
        per_page: 100,
        status: 'publish',
        orderby: 'date',
        order: 'desc'
      }
    });

    const backup = {
      timestamp: new Date().toISOString(),
      totalPosts: response.data.length,
      posts: response.data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        excerpt: post.excerpt.rendered,
        slug: post.slug,
        link: post.link,
        modified: post.modified
      }))
    };

    const filename = `logs/backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

    console.log(`✅ Backup created: ${filename}`);
    console.log(`📦 Saved ${backup.totalPosts} posts\n`);

    return backup;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

createBackup();
