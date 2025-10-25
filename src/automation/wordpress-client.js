/**
 * WordPress REST API Client
 *
 * Provides a clean interface for interacting with WordPress REST API
 * Supports authentication, CRUD operations, and bulk updates
 */

export class WordPressClient {
  constructor(siteUrl, username, password) {
    this.siteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiUrl = `${this.siteUrl}/wp-json/wp/v2`;
    this.username = username;
    this.password = password;

    // Create Basic Auth header
    if (username && password) {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      this.authHeader = `Basic ${auth}`;
    } else {
      this.authHeader = null;
    }
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'SEO-Automation/2.0',
      ...options.headers
    };

    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }

    const fetchOptions = {
      method: options.method || 'GET',
      headers,
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Non-JSON response: ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      throw new Error(`WordPress API Error: ${error.message}`);
    }
  }

  /**
   * Get posts
   */
  async getPosts(params = {}) {
    const queryParams = new URLSearchParams({
      per_page: 100,
      ...params
    }).toString();

    return this.request(`/posts?${queryParams}`);
  }

  /**
   * Get pages
   */
  async getPages(params = {}) {
    const queryParams = new URLSearchParams({
      per_page: 100,
      ...params
    }).toString();

    return this.request(`/pages?${queryParams}`);
  }

  /**
   * Get single post or page
   */
  async getPost(id) {
    return this.request(`/posts/${id}`);
  }

  /**
   * Get single page
   */
  async getPage(id) {
    return this.request(`/pages/${id}`);
  }

  /**
   * Update post or page
   */
  async updatePost(id, data) {
    return this.request(`/posts/${id}`, {
      method: 'POST',
      body: data
    });
  }

  /**
   * Update page
   */
  async updatePage(id, data) {
    return this.request(`/pages/${id}`, {
      method: 'POST',
      body: data
    });
  }

  /**
   * Bulk update posts
   */
  async bulkUpdatePosts(updates) {
    const results = [];

    for (const update of updates) {
      try {
        const result = await this.updatePost(update.id, update.data);
        results.push({ success: true, id: update.id, result });
      } catch (error) {
        results.push({ success: false, id: update.id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Search and replace in content
   */
  async searchAndReplace(search, replace, options = {}) {
    const { postTypes = ['post', 'page'], dryRun = false } = options;
    const changes = [];

    for (const postType of postTypes) {
      const endpoint = postType === 'post' ? '/posts' : '/pages';
      const items = await this.request(`${endpoint}?per_page=100`);

      for (const item of items) {
        const updates = {};
        let hasChanges = false;

        // Check title
        if (item.title.rendered && item.title.rendered.includes(search)) {
          updates.title = item.title.rendered.replace(new RegExp(search, 'g'), replace);
          hasChanges = true;
        }

        // Check content
        if (item.content.rendered && item.content.rendered.includes(search)) {
          updates.content = item.content.rendered.replace(new RegExp(search, 'g'), replace);
          hasChanges = true;
        }

        // Check excerpt
        if (item.excerpt?.rendered && item.excerpt.rendered.includes(search)) {
          updates.excerpt = item.excerpt.rendered.replace(new RegExp(search, 'g'), replace);
          hasChanges = true;
        }

        if (hasChanges) {
          changes.push({
            id: item.id,
            type: postType,
            title: item.title.rendered,
            updates,
            dryRun
          });

          if (!dryRun) {
            try {
              if (postType === 'post') {
                await this.updatePost(item.id, updates);
              } else {
                await this.updatePage(item.id, updates);
              }
            } catch (error) {
              changes[changes.length - 1].error = error.message;
            }
          }
        }
      }
    }

    return {
      changes,
      count: changes.length,
      dryRun
    };
  }

  /**
   * Test authentication
   */
  async testAuth() {
    try {
      const user = await this.request('/users/me');
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          roles: user.roles
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default WordPressClient;
