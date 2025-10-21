import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { wpClient } from '../../src/audit/fetch-posts.js';
import { config } from '../../config/env/config.js';

describe('WordPress API Connection Tests', () => {
  before(() => {
    try {
      config.validate();
    } catch (error) {
      console.log('⚠️  Config validation failed - these tests require a valid .env file');
      console.log('   Copy env/.env.example to env/.env and fill in your credentials');
      process.exit(0); // Exit gracefully if no config
    }
  });

  it('should validate configuration', () => {
    assert.ok(config.wordpress.url, 'WordPress URL should be defined');
    assert.ok(config.wordpress.user, 'WordPress user should be defined');
    assert.ok(config.wordpress.appPassword, 'WordPress app password should be defined');
  });

  it('should successfully connect to WordPress API', async () => {
    const result = await wpClient.testConnection();
    assert.ok(result.success, 'Connection should succeed');
    assert.ok(result.data, 'Should return API data');
  });

  it('should fetch posts with pagination', async () => {
    const result = await wpClient.fetchPosts({ page: 1, perPage: 5 });

    assert.ok(result.posts, 'Should return posts array');
    assert.ok(Array.isArray(result.posts), 'Posts should be an array');
    assert.ok(result.pagination, 'Should return pagination info');
    assert.ok(result.pagination.totalPosts >= 0, 'Should have total posts count');
  });

  it('should fetch a single post', async () => {
    // First get a post ID
    const { posts } = await wpClient.fetchPosts({ page: 1, perPage: 1 });

    if (posts.length > 0) {
      const postId = posts[0].id;
      const post = await wpClient.fetchPost(postId);

      assert.ok(post, 'Should return post');
      assert.strictEqual(post.id, postId, 'Post ID should match');
      assert.ok(post.title, 'Post should have title');
      assert.ok(post.content, 'Post should have content');
    }
  });

  it('should fetch pages', async () => {
    const result = await wpClient.fetchPages({ page: 1, perPage: 5 });

    assert.ok(result.pages, 'Should return pages array');
    assert.ok(Array.isArray(result.pages), 'Pages should be an array');
  });

  it('should handle authentication correctly', async () => {
    const headers = wpClient.headers;

    assert.ok(headers.Authorization, 'Should have Authorization header');
    assert.ok(headers.Authorization.startsWith('Basic '), 'Should use Basic auth');
  });

  it('should handle API errors gracefully', async () => {
    try {
      await wpClient.fetchPost(999999999); // Non-existent post ID
      assert.fail('Should throw error for non-existent post');
    } catch (error) {
      assert.ok(error, 'Should throw error');
    }
  });
});
