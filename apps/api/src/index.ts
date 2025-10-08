import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { env } from '@sms-crm/lib';

import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import contactsRoutes from './routes/contacts';
import healthRoutes from './routes/health';
import importRoutes from './routes/imports';
import reportRoutes from './routes/reports';
import shortLinkRoutes from './routes/short-links';
import tenantRoutes from './routes/tenants';
import webhookRoutes from './routes/webhooks';
import { setupRateLimitRedis } from './services/rate-limit.service';
import { setupSessions } from './services/session.service';

const PORT = env.PORT;
const HOST = '0.0.0.0';

async function start() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  // Plugins
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
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
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    // store: new RedisRateLimitStore({
    //   client: getRateLimitRedisClient(),
    //   keyPrefix: 'rl:global:',
    //   windowMs: env.RATE_LIMIT_WINDOW_MS,
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
  await fastify.register(contactsRoutes, { prefix: '/contacts' });
  await fastify.register(campaignRoutes, { prefix: '/campaigns' });
  await fastify.register(reportRoutes, { prefix: '/reports' });
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });
  await fastify.register(tenantRoutes, { prefix: '/tenants' });
  await fastify.register(shortLinkRoutes, { prefix: '/short' });

  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info({ host: HOST, port: PORT }, 'API server started');
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start API server');
    process.exit(1);
  }
}

start();
