/**
 * Manual Review System - Main Server
 * Production-ready Express server for the Manual Review System
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import autofixReviewRoutes from './api/autofix-review-routes.js';
import gscRoutes from './api/gsc-routes.js';

// Import database initialization
import { initializeDatabase } from './database/index.js';

// Import health check
import { ComprehensiveHealthCheck } from './monitoring/comprehensive-health.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.API_PORT || process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create Express app
const app = express();

// Trust proxy (for load balancers)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable if using APIs
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Serve static files from public directory
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
console.log(`Static files served from: ${publicPath}`);

// Logging (only in development or if explicitly enabled)
if (NODE_ENV === 'development' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use(morgan('dev'));
} else {
  // Production logging (to file)
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Basic health check endpoint (backward compatible)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    version: '2.0.0',
    service: 'Manual Review System'
  });
});

// Comprehensive health check endpoint
app.get('/api/v2/health', async (req, res) => {
  try {
    const healthCheck = new ComprehensiveHealthCheck();
    const results = await healthCheck.runAll();

    res.status(healthCheck.getStatusCode()).json({
      success: results.status === 'healthy' || results.status === 'degraded',
      ...results
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    service: 'Manual Review System API',
    version: '2.0.0',
    documentation: 'See API_QUICK_REFERENCE.md',
    endpoints: {
      health: 'GET /health',
      autofix: {
        proposals: 'GET /api/autofix/proposals',
        detect: 'POST /api/autofix/detect',
        review: 'POST /api/autofix/proposals/:id/review',
        apply: 'POST /api/autofix/apply',
        statistics: 'GET /api/autofix/statistics'
      },
      gsc: {
        authUrl: 'GET /api/gsc/auth-url',
        properties: 'GET /api/gsc/properties',
        sync: 'POST /api/gsc/sync',
        analytics: 'GET /api/gsc/analytics/:propertyId',
        pagePerformance: 'GET /api/gsc/page-performance/:propertyId',
        topPages: 'GET /api/gsc/top-pages',
        issues: 'GET /api/gsc/issues',
        stats: 'GET /api/gsc/stats'
      }
    }
  });
});

// Mount API routes
app.use('/api/autofix', autofixReviewRoutes);
app.use('/api/gsc', gscRoutes);

// Serve static files from the dashboard build (in production)
const dashboardDistPath = path.join(__dirname, '..', 'dashboard', 'dist');
if (fs.existsSync(dashboardDistPath)) {
  console.log(`Serving frontend from: ${dashboardDistPath}`);

  // Serve static files
  app.use(express.static(dashboardDistPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
      });
    }

    res.sendFile(path.join(dashboardDistPath, 'index.html'));
  });
} else {
  console.warn(`Warning: Dashboard dist folder not found at ${dashboardDistPath}`);
  console.warn('Frontend will not be served. Build the dashboard first: cd dashboard && npm run build');

  // 404 handler when no frontend is available
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      availableEndpoints: [
        'GET /health',
        'GET /api',
        'GET /api/autofix/proposals',
        'POST /api/autofix/detect'
      ]
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Initialize database
initializeDatabase();

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🚀 Manual Review System API Server');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Environment: ${NODE_ENV}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  API Docs: http://localhost:${PORT}/api`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Ready to accept requests!');
  console.log('');
});

// Handle startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use`);
    console.error('Please either:');
    console.error(`  1. Stop the process using port ${PORT}`);
    console.error(`  2. Set a different port: API_PORT=4001 npm start`);
  } else {
    console.error('Server startup error:', error);
  }
  process.exit(1);
});

export default app;
