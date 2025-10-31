/**
 * Redis Cache Service
 * 
 * Provides caching layer for:
 * - WordPress API responses
 * - Auto-fix analysis results
 * - Google Search Console data
 * - Analytics data
 * - Performance optimization
 */

import Redis from 'ioredis';

class RedisCache {
  constructor() {
    this.redis = null;
    this.enabled = false;
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  initialize() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.enabled = true;
      });

      this.redis.on('error', (error) => {
        console.warn('⚠️  Redis cache error:', error.message);
        this.enabled = false;
      });

      // Try to connect
      this.redis.connect().catch(() => {
        console.warn('⚠️  Redis not available - caching disabled');
        this.enabled = false;
      });

    } catch (error) {
      console.warn('⚠️  Redis initialization failed:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Get cached value
   */
  async get(key) {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      
      if (!value) {
        return null;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }

    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key, value, ttl = 3600) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const serialized = typeof value === 'object' 
        ? JSON.stringify(value)
        : String(value);

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      return true;

    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.warn('Cache del error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.enabled || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);
      return keys.length;

    } catch (error) {
      console.warn('Cache delPattern error:', error.message);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Increment value
   */
  async incr(key) {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      return await this.redis.incr(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key, ttl) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get or set (if not exists)
   */
  async getOrSet(key, fetchFn, ttl = 3600) {
    // Try to get from cache
    const cached = await this.get(key);
    
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache it
    await this.set(key, data, ttl);

    return { data, fromCache: false };
  }

  /**
   * Cache WordPress API response
   */
  async cacheWPResponse(clientId, endpoint, data, ttl = 1800) {
    const key = `wp:${clientId}:${endpoint}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get cached WordPress response
   */
  async getWPResponse(clientId, endpoint) {
    const key = `wp:${clientId}:${endpoint}`;
    return this.get(key);
  }

  /**
   * Invalidate WordPress cache for client
   */
  async invalidateWPCache(clientId) {
    return this.delPattern(`wp:${clientId}:*`);
  }

  /**
   * Cache auto-fix analysis
   */
  async cacheAnalysis(clientId, engineName, analysis, ttl = 7200) {
    const key = `analysis:${clientId}:${engineName}`;
    return this.set(key, analysis, ttl);
  }

  /**
   * Get cached analysis
   */
  async getAnalysis(clientId, engineName) {
    const key = `analysis:${clientId}:${engineName}`;
    return this.get(key);
  }

  /**
   * Cache GSC data
   */
  async cacheGSCData(clientId, dataType, data, ttl = 86400) {
    const key = `gsc:${clientId}:${dataType}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get cached GSC data
   */
  async getGSCData(clientId, dataType) {
    const key = `gsc:${clientId}:${dataType}`;
    return this.get(key);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        enabled: true,
        stats: info,
        memory,
        keyspace
      };

    } catch (error) {
      return { enabled: false, error: error.message };
    }
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushall();
      console.log('🧹 Cache flushed');
      return true;
    } catch (error) {
      console.warn('Cache flush error:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('👋 Redis connection closed');
    }
  }
}

// Export singleton instance
export default new RedisCache();
