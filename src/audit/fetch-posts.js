import axios from 'axios';
import { config } from '../../config/env/config.js';
import { logger } from './logger.js';

/**
 * WordPress REST API client
 */
class WordPressClient {
  constructor() {
    this.baseUrl = config.wordpress.url.replace(/\/$/, '');
    this.apiBase = `${this.baseUrl}/wp-json/wp/v2`;
    this.headers = {
      'Authorization': `Basic ${config.wordpress.baseAuth}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test connection to WordPress API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/wp-json`, {
        headers: this.headers,
        timeout: 10000
      });

      logger.info('WordPress API connection successful');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('WordPress API connection failed', error.message);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Fetch posts with pagination
   */
  async fetchPosts(options = {}) {
    const {
      page = 1,
      perPage = 10,
      status = 'publish',
      orderby = 'date',
      order = 'desc'
    } = options;

    try {
      const response = await axios.get(`${this.apiBase}/posts`, {
        headers: this.headers,
        params: {
          page,
          per_page: perPage,
          status,
          orderby,
          order,
          _embed: true // Include featured images and author data
        },
        timeout: 30000
      });

      const totalPosts = parseInt(response.headers['x-wp-total']) || 0;
      const totalPages = parseInt(response.headers['x-wp-totalpages']) || 0;

      logger.info(`Fetched ${response.data.length} posts (page ${page}/${totalPages})`);

      return {
        posts: response.data,
        pagination: {
          currentPage: page,
          totalPages,
          totalPosts,
          perPage
        }
      };
    } catch (error) {
      logger.error('Failed to fetch posts', error.message);
      throw error;
    }
  }

  /**
   * Fetch all posts (handles pagination automatically)
   */
  async fetchAllPosts(maxPosts = config.automation.maxPostsPerRun) {
    const allPosts = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore && allPosts.length < maxPosts) {
        const { posts, pagination } = await this.fetchPosts({
          page,
          perPage: 100
        });

        allPosts.push(...posts);

        if (page >= pagination.totalPages || allPosts.length >= maxPosts) {
          hasMore = false;
        }

        page++;
      }

      logger.info(`Fetched total of ${allPosts.length} posts`);
      return allPosts.slice(0, maxPosts);
    } catch (error) {
      logger.error('Failed to fetch all posts', error.message);
      throw error;
    }
  }

  /**
   * Fetch pages
   */
  async fetchPages(options = {}) {
    const {
      page = 1,
      perPage = 10,
      status = 'publish'
    } = options;

    try {
      const response = await axios.get(`${this.apiBase}/pages`, {
        headers: this.headers,
        params: {
          page,
          per_page: perPage,
          status,
          _embed: true
        },
        timeout: 30000
      });

      return {
        pages: response.data,
        pagination: {
          currentPage: page,
          totalPages: parseInt(response.headers['x-wp-totalpages']) || 0,
          totalItems: parseInt(response.headers['x-wp-total']) || 0
        }
      };
    } catch (error) {
      logger.error('Failed to fetch pages', error.message);
      throw error;
    }
  }

  /**
   * Fetch a single post by ID
   */
  async fetchPost(postId) {
    try {
      const response = await axios.get(`${this.apiBase}/posts/${postId}`, {
        headers: this.headers,
        params: { _embed: true },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch post ${postId}`, error.message);
      throw error;
    }
  }

  /**
   * Update a post
   */
  async updatePost(postId, data) {
    try {
      const response = await axios.put(
        `${this.apiBase}/posts/${postId}`,
        data,
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      logger.info(`Updated post ${postId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to update post ${postId}`, error.message);
      throw error;
    }
  }

  /**
   * Fetch media items
   */
  async fetchMedia(postId) {
    try {
      const response = await axios.get(`${this.apiBase}/media`, {
        headers: this.headers,
        params: {
          parent: postId,
          per_page: 100
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch media for post ${postId}`, error.message);
      throw error;
    }
  }

  /**
   * Get Yoast SEO meta (if Yoast REST API is available)
   */
  async getYoastMeta(postId) {
    try {
      const response = await axios.get(`${this.apiBase}/posts/${postId}`, {
        headers: this.headers,
        params: { _fields: 'yoast_head,yoast_head_json' },
        timeout: 10000
      });

      return response.data.yoast_head_json || null;
    } catch (error) {
      // Yoast API might not be available
      return null;
    }
  }
}

// Export singleton instance
export const wpClient = new WordPressClient();
