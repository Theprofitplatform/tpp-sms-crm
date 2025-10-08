import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import formbody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import { setupSessions } from './services/session.service';
import { setupRateLimitRedis, RedisRateLimitStore, getRateLimitRedisClient } from './services/rate-limit.service';

import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import importRoutes from './routes/imports';
import campaignRoutes from './routes/campaigns';
import reportRoutes from './routes/reports';
import webhookRoutes from './routes/webhooks';
import tenantRoutes from './routes/tenants';
import shortLinkRoutes from './routes/short-links';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Plugins
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  await fastify.register(helmet);

  // Setup Redis-backed sessions (includes cookie support)
  await setupSessions(fastify);

  // Setup rate limiting with Redis
  await setupRateLimitRedis(fastify);

  // TODO: Fix RedisRateLimitStore configuration for @fastify/rate-limit
  // Temporarily using default in-memory store
  await fastify.register(rateLimit, {
    global: true,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    // store: new RedisRateLimitStore({
    //   client: getRateLimitRedisClient(),
    //   keyPrefix: 'rl:global:',
    //   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    // }),
    skipOnError: true, // Don't fail requests if Redis is down
    allowList: (req) => {
      // Skip rate limiting for health checks
      return req.url === '/health';
    },
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  await fastify.register(formbody);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(importRoutes, { prefix: '/imports' });
  await fastify.register(campaignRoutes, { prefix: '/campaigns' });
  await fastify.register(reportRoutes, { prefix: '/reports' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });
  await fastify.register(tenantRoutes, { prefix: '/tenants' });
  await fastify.register(shortLinkRoutes, { prefix: '/short' });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`API server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
