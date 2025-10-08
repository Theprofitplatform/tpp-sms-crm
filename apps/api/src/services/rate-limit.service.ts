import type { FastifyInstance } from 'fastify';
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

export async function setupRateLimitRedis(fastify: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Create Redis client for rate limiting
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => {
    fastify.log.error({ err }, 'Redis rate limit client error');
  });

  redisClient.on('connect', () => {
    fastify.log.info('Redis rate limit client connected');
  });

  await redisClient.connect();

  // Cleanup on app close
  fastify.addHook('onClose', async () => {
    await redisClient.quit();
  });

  fastify.log.info('Rate limiting Redis client initialized');
}

export function getRateLimitRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Rate limit Redis client not initialized');
  }
  return redisClient;
}

/**
 * Custom Redis store for @fastify/rate-limit
 */
export class RedisRateLimitStore {
  private client: RedisClientType;
  private keyPrefix: string;
  private windowMs: number;

  constructor(options: { client: RedisClientType; keyPrefix?: string; windowMs?: number }) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix || 'rl:';
    this.windowMs = options.windowMs || 60000;
  }

  async incr(key: string, callback: (err: Error | null, result?: { current: number; ttl: number }) => void) {
    try {
      const redisKey = this.keyPrefix + key;

      // Increment the counter
      const current = await this.client.incr(redisKey);

      // Get TTL
      let ttl = await this.client.ttl(redisKey);

      // If key is new (ttl = -1), set expiration
      if (ttl === -1) {
        await this.client.expire(redisKey, Math.ceil(this.windowMs / 1000));
        ttl = Math.ceil(this.windowMs / 1000);
      }

      callback(null, { current, ttl: ttl * 1000 }); // Convert to ms
    } catch (err) {
      callback(err as Error);
    }
  }

  async child(routeOptions: { keyGenerator?: (req: any) => string }) {
    return new RedisRateLimitStore({
      client: this.client,
      keyPrefix: this.keyPrefix,
      windowMs: this.windowMs,
    });
  }
}

/**
 * Per-tenant rate limiting helper
 * Checks if a tenant has exceeded their rate limit
 */
export async function checkTenantRateLimit(
  tenantId: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const client = getRateLimitRedisClient();
  const key = `rl:tenant:${tenantId}:${Math.floor(Date.now() / windowMs)}`;

  try {
    const current = await client.incr(key);

    // Set expiration on first increment
    if (current === 1) {
      await client.expire(key, Math.ceil(windowMs / 1000));
    }

    const ttl = await client.ttl(key);
    const resetAt = new Date(Date.now() + (ttl * 1000));
    const remaining = Math.max(0, maxRequests - current);

    return {
      allowed: current <= maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    // On error, allow the request but log the issue
    console.error('Rate limit check error:', error);
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * SMS send rate limiting for warm-up curves
 * Enforces per-number send limits
 */
export async function checkSendRateLimit(
  sendingNumber: string,
  maxSendsPerHour: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const client = getRateLimitRedisClient();
  const hour = Math.floor(Date.now() / (60 * 60 * 1000));
  const key = `rl:send:${sendingNumber}:${hour}`;

  try {
    const current = await client.incr(key);

    // Set expiration on first increment (1 hour)
    if (current === 1) {
      await client.expire(key, 3600);
    }

    const ttl = await client.ttl(key);
    const resetAt = new Date(Date.now() + (ttl * 1000));
    const remaining = Math.max(0, maxSendsPerHour - current);

    return {
      allowed: current <= maxSendsPerHour,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('Send rate limit check error:', error);
    return {
      allowed: true,
      remaining: maxSendsPerHour,
      resetAt: new Date(Date.now() + 3600000),
    };
  }
}
