import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions
const mockGet = jest.fn();
const mockPut = jest.fn();

// Mock axios using unstable_mockModule for ES modules
jest.unstable_mockModule('axios', () => ({
  default: {
    get: mockGet,
    put: mockPut
  }
}));

// Import after mocking
const { wpClient } = await import('../../src/audit/fetch-posts.js');

describe('WordPress Client - fetch-posts.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    test('should have proper configuration', () => {
      expect(wpClient).toBeDefined();
      expect(wpClient.baseUrl).toBeDefined();
      expect(wpClient.apiBase).toBeDefined();
      expect(wpClient.headers).toBeDefined();
    });

    test('should have authorization header', () => {
      expect(wpClient.headers.Authorization).toBeDefined();
      expect(wpClient.headers.Authorization).toContain('Basic');
    });
  });

  describe('testConnection()', () => {
    test('should successfully connect to WordPress API', async () => {
      const mockResponse = {
        data: {
          name: 'Test Site',
          description: 'Just another WordPress site'
        }
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await wpClient.testConnection();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });

    test('should throw error on connection failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(wpClient.testConnection()).rejects.toThrow('Connection failed');
    });
  });

  describe('fetchPosts()', () => {
    const mockPosts = [
      { id: 1, title: { rendered: 'Post 1' }, content: { rendered: '<p>Content</p>' } },
      { id: 2, title: { rendered: 'Post 2' }, content: { rendered: '<p>Content</p>' } }
    ];

    test('should fetch posts with default options', async () => {
      mockGet.mockResolvedValue({
        data: mockPosts,
        headers: { 'x-wp-total': '50', 'x-wp-totalpages': '5' }
      });

      const result = await wpClient.fetchPosts();

      expect(result.posts).toEqual(mockPosts);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.totalPosts).toBe(50);
    });

    test('should fetch posts with custom options', async () => {
      mockGet.mockResolvedValue({
        data: mockPosts,
        headers: { 'x-wp-total': '100', 'x-wp-totalpages': '10' }
      });

      await wpClient.fetchPosts({ page: 3, perPage: 20, status: 'draft' });

      expect(mockGet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({
            page: 3,
            per_page: 20,
            status: 'draft'
          })
        })
      );
    });

    test('should handle empty results', async () => {
      mockGet.mockResolvedValue({
        data: [],
        headers: { 'x-wp-total': '0', 'x-wp-totalpages': '0' }
      });

      const result = await wpClient.fetchPosts();

      expect(result.posts).toEqual([]);
      expect(result.pagination.totalPosts).toBe(0);
    });

    test('should throw error on fetch failure', async () => {
      mockGet.mockRejectedValue(new Error('API error'));

      await expect(wpClient.fetchPosts()).rejects.toThrow();
    });
  });

  describe('fetchAllPosts()', () => {
    test('should fetch all posts with pagination', async () => {
      const page1 = Array(100).fill(null).map((_, i) => ({ id: i + 1, title: { rendered: `Post ${i + 1}` } }));
      const page2 = Array(50).fill(null).map((_, i) => ({ id: i + 101, title: { rendered: `Post ${i + 101}` } }));

      mockGet
        .mockResolvedValueOnce({
          data: page1,
          headers: { 'x-wp-total': '150', 'x-wp-totalpages': '2' }
        })
        .mockResolvedValueOnce({
          data: page2,
          headers: { 'x-wp-total': '150', 'x-wp-totalpages': '2' }
        });

      const result = await wpClient.fetchAllPosts(200);

      expect(result).toHaveLength(150);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    test('should respect maxPosts limit', async () => {
      const mockPosts = Array(100).fill(null).map((_, i) => ({ id: i + 1 }));

      mockGet.mockResolvedValue({
        data: mockPosts,
        headers: { 'x-wp-total': '500', 'x-wp-totalpages': '5' }
      });

      const result = await wpClient.fetchAllPosts(150);

      expect(result).toHaveLength(150);
    });

    test('should throw error on fetch failure', async () => {
      mockGet.mockRejectedValue(new Error('API error'));

      await expect(wpClient.fetchAllPosts()).rejects.toThrow();
    });
  });

  describe('fetchPost()', () => {
    test('should fetch single post by ID', async () => {
      const mockPost = { id: 123, title: { rendered: 'Single Post' } };

      mockGet.mockResolvedValue({ data: mockPost });

      const result = await wpClient.fetchPost(123);

      expect(result).toEqual(mockPost);
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/posts/123'),
        expect.anything()
      );
    });

    test('should throw error for non-existent post', async () => {
      mockGet.mockRejectedValue(new Error('Post not found'));

      await expect(wpClient.fetchPost(99999)).rejects.toThrow();
    });
  });

  describe('updatePost()', () => {
    test('should successfully update post', async () => {
      const updateData = { title: 'Updated Title' };
      const mockResponse = { data: { id: 123, ...updateData } };

      mockPut.mockResolvedValue(mockResponse);

      const result = await wpClient.updatePost(123, updateData);

      expect(result.id).toBe(123);
      expect(result.title).toBe('Updated Title');
    });

    test('should throw error on update failure', async () => {
      mockPut.mockRejectedValue(new Error('Update failed'));

      await expect(wpClient.updatePost(123, {})).rejects.toThrow();
    });
  });

  describe('fetchPages()', () => {
    test('should fetch WordPress pages', async () => {
      const mockPages = [
        { id: 1, title: { rendered: 'About' } },
        { id: 2, title: { rendered: 'Contact' } }
      ];

      mockGet.mockResolvedValue({
        data: mockPages,
        headers: { 'x-wp-total': '10', 'x-wp-totalpages': '1' }
      });

      const result = await wpClient.fetchPages();

      expect(result.pages).toEqual(mockPages);
      expect(result.pagination.totalItems).toBe(10);
    });

    test('should throw error on fetch failure', async () => {
      mockGet.mockRejectedValue(new Error('API error'));

      await expect(wpClient.fetchPages()).rejects.toThrow();
    });
  });

  describe('fetchMedia()', () => {
    test('should fetch media items', async () => {
      const mockMedia = [{ id: 1, source_url: 'https://example.com/image.jpg' }];

      mockGet.mockResolvedValue({ data: mockMedia });

      const result = await wpClient.fetchMedia(123);

      expect(result).toEqual(mockMedia);
    });

    test('should throw error on fetch failure', async () => {
      mockGet.mockRejectedValue(new Error('Media not found'));

      await expect(wpClient.fetchMedia(123)).rejects.toThrow();
    });
  });

  describe('getYoastMeta()', () => {
    test('should fetch Yoast SEO meta', async () => {
      const mockYoast = {
        yoast_head_json: { title: 'SEO Title', description: 'SEO Description' }
      };

      mockGet.mockResolvedValue({ data: mockYoast });

      const result = await wpClient.getYoastMeta(123);

      expect(result).toEqual(mockYoast.yoast_head_json);
    });

    test('should return null when Yoast not available', async () => {
      mockGet.mockRejectedValue(new Error('Yoast API not available'));

      const result = await wpClient.getYoastMeta(123);

      expect(result).toBeNull();
    });
  });
});
