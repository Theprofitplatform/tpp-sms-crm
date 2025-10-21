import { describe, test, expect, beforeAll } from '@jest/globals';
import { config } from '../../config/env/config.js';
import axios from 'axios';

describe('WordPress API Integration Tests', () => {
  let baseURL;
  let authHeader;
  let skipTests = false;

  beforeAll(() => {
    try {
      // Try to load config
      if (!process.env.WORDPRESS_URL || !process.env.WORDPRESS_USER || !process.env.WORDPRESS_APP_PASSWORD) {
        console.log('⚠️  WordPress credentials not configured - skipping integration tests');
        console.log('   Copy config/env/.env.example to config/env/.env and fill in credentials to run these tests');
        skipTests = true;
        return;
      }

      baseURL = process.env.WORDPRESS_URL.replace(/\/$/, '');
      const credentials = Buffer.from(
        `${process.env.WORDPRESS_USER}:${process.env.WORDPRESS_APP_PASSWORD}`
      ).toString('base64');
      authHeader = `Basic ${credentials}`;
    } catch (error) {
      console.log('⚠️  Configuration error - skipping integration tests:', error.message);
      skipTests = true;
    }
  });

  test('should connect to WordPress REST API', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    const response = await axios.get(`${baseURL}/wp-json/wp/v2/posts`, {
      headers: { Authorization: authHeader },
      params: { per_page: 1 }
    });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
  }, 15000);

  test('should fetch posts with pagination', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    const response = await axios.get(`${baseURL}/wp-json/wp/v2/posts`, {
      headers: { Authorization: authHeader },
      params: { page: 1, per_page: 5 }
    });

    expect(response.status).toBe(200);
    expect(response.headers['x-wp-total']).toBeDefined();
    expect(response.headers['x-wp-totalpages']).toBeDefined();
  }, 15000);

  test('should fetch a single post by ID', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    // First get a post ID
    const listResponse = await axios.get(`${baseURL}/wp-json/wp/v2/posts`, {
      headers: { Authorization: authHeader },
      params: { per_page: 1 }
    });

    if (listResponse.data.length > 0) {
      const postId = listResponse.data[0].id;

      const postResponse = await axios.get(`${baseURL}/wp-json/wp/v2/posts/${postId}`, {
        headers: { Authorization: authHeader }
      });

      expect(postResponse.status).toBe(200);
      expect(postResponse.data.id).toBe(postId);
      expect(postResponse.data.title).toBeDefined();
      expect(postResponse.data.content).toBeDefined();
    }
  }, 15000);

  test('should fetch pages', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    const response = await axios.get(`${baseURL}/wp-json/wp/v2/pages`, {
      headers: { Authorization: authHeader },
      params: { per_page: 5 }
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  }, 15000);

  test('should handle authentication errors', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    try {
      await axios.get(`${baseURL}/wp-json/wp/v2/posts`, {
        headers: { Authorization: 'Basic invalid' },
        params: { per_page: 1 }
      });

      fail('Should have thrown authentication error');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  }, 15000);

  test('should handle 404 for non-existent posts', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    try {
      await axios.get(`${baseURL}/wp-json/wp/v2/posts/999999999`, {
        headers: { Authorization: authHeader }
      });

      fail('Should have thrown 404 error');
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  }, 15000);

  test('should retrieve post with all SEO fields', async () => {
    if (skipTests) {
      console.log('Skipping - no credentials');
      return;
    }

    const response = await axios.get(`${baseURL}/wp-json/wp/v2/posts`, {
      headers: { Authorization: authHeader },
      params: { per_page: 1 }
    });

    if (response.data.length > 0) {
      const post = response.data[0];

      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('excerpt');
      expect(post).toHaveProperty('link');
      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('status');
    }
  }, 15000);
});
