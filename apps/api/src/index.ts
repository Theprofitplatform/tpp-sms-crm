import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import formbody from '@fastify/formbody';

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
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'change-this-secret',
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
