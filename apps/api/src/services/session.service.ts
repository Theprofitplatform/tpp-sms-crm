import { createClient } from 'redis';
import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import RedisStore from 'connect-redis';

export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  createdAt: number;
}

export async function setupSessions(fastify: FastifyInstance) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
  const sessionTTL = parseInt(process.env.SESSION_TTL || '86400', 10); // 24 hours default

  // Create Redis client for sessions
  const redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on('error', (err) => {
    fastify.log.error({ err }, 'Redis session client error');
  });

  redisClient.on('connect', () => {
    fastify.log.info('Redis session client connected');
  });

  await redisClient.connect();

  // Create Redis store (connect-redis v9)
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: sessionTTL,
  });

  // Register cookie support
  await fastify.register(fastifyCookie);

  // Register session support
  await fastify.register(fastifySession, {
    store: redisStore,
    secret: sessionSecret,
    cookieName: 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: sessionTTL * 1000, // Convert to milliseconds
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: false,
    rolling: true, // Refresh session on each request
  });

  fastify.log.info('Session management initialized with Redis store');

  // Cleanup on app close
  fastify.addHook('onClose', async () => {
    await redisClient.quit();
  });
}

// Helper to create a new session
export async function createSession(
  request: any,
  userId: string,
  tenantId: string,
  email: string,
  role: string
): Promise<void> {
  const sessionData: SessionData = {
    userId,
    tenantId,
    email,
    role,
    createdAt: Date.now(),
  };

  request.session.user = sessionData;
  // Session is auto-saved by fastify-session
}

// Helper to get session data
export function getSessionData(request: any): SessionData | null {
  return request.session.get('user') || null;
}

// Helper to destroy session
export async function destroySession(request: any): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.destroy((err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Helper to refresh session (extend TTL)
export async function refreshSession(request: any): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.touch((err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
