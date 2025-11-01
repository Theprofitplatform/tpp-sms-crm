/**
 * API v2 - Main Router
 *
 * Unified API for integrated keyword management
 * Combines SerpBear position tracking + Keyword research service
 *
 * @module api/v2
 */

import express from 'express';
import keywordsRouter from './keywords.js';
import researchRouter from './research.js';
import syncRouter from './sync.js';
import ottoFeaturesRouter from './otto-features.js';
import { corsMiddleware, optionalAuthenticate } from './middleware/auth.js';

const router = express.Router();

// Apply CORS middleware to all v2 routes
router.use(corsMiddleware);

// Apply optional authentication to all routes
// Routes can override with authenticate middleware for required auth
router.use(optionalAuthenticate);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'healthy'
    }
  });
});

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    version: '2.0.0',
    message: 'SEO Automation Platform API v2',
    documentation: {
      overview: 'Unified API for integrated keyword management',
      endpoints: {
        keywords: {
          base: '/api/v2/keywords',
          description: 'Keyword management endpoints',
          methods: ['GET', 'POST', 'PUT', 'DELETE']
        },
        research: {
          base: '/api/v2/research',
          description: 'Keyword research workflow endpoints',
          methods: ['GET', 'POST', 'DELETE']
        },
        sync: {
          base: '/api/v2/sync',
          description: 'Synchronization management endpoints',
          methods: ['GET', 'POST']
        },
        pixel: {
          base: '/api/v2/pixel',
          description: 'Otto SEO - Pixel deployment and tracking',
          methods: ['GET', 'POST', 'DELETE']
        },
        schema: {
          base: '/api/v2/schema',
          description: 'Otto SEO - Schema markup automation',
          methods: ['GET', 'POST', 'DELETE']
        },
        ssr: {
          base: '/api/v2/ssr',
          description: 'Otto SEO - Server-side rendering optimizations',
          methods: ['GET', 'POST']
        }
      },
      authentication: {
        type: 'JWT Bearer Token',
        header: 'Authorization: Bearer <token>',
        alternative: 'Query parameter: ?token=<token>'
      },
      rate_limits: {
        authenticated: '1000 requests per hour',
        unauthenticated: '100 requests per hour'
      }
    },
    links: {
      health: '/api/v2/health',
      keywords: '/api/v2/keywords',
      research: '/api/v2/research/projects',
      sync_status: '/api/v2/sync/status'
    }
  });
});

// Mount routers
router.use('/keywords', keywordsRouter);
router.use('/research', researchRouter);
router.use('/sync', syncRouter);

// Otto SEO Features
router.use('/', ottoFeaturesRouter);

// 404 handler for v2 routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `API endpoint ${req.originalUrl} not found`,
    documentation: '/api/v2'
  });
});

// Error handler for v2 routes
router.use((error, req, res, next) => {
  console.error('API v2 Error:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: error.name || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack
    })
  });
});

export default router;
