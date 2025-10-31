/**
 * PM2 Ecosystem Configuration
 * 
 * Production-ready process management for SEO Automation Platform
 * 
 * Usage:
 *   npm run pm2:start     # Start all services
 *   npm run pm2:stop      # Stop all services
 *   npm run pm2:restart   # Restart all services
 *   npm run pm2:logs      # View logs
 *   npm run pm2:monit     # Monitor processes
 */

export default {
  apps: [
    {
      // Main Dashboard Server
      name: 'seo-dashboard',
      script: './dashboard-server.js',
      instances: 2,                     // Run 2 instances for load balancing
      exec_mode: 'cluster',             // Cluster mode for multi-core
      watch: false,                     // Disable watch in production
      max_memory_restart: '500M',       // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'production',
        PORT: 9000
      },
      error_file: './logs/pm2-dashboard-error.log',
      out_file: './logs/pm2-dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    
    {
      // Keyword Research Service (Python)
      name: 'keyword-service',
      script: 'python3',
      args: '-m keyword-service.app',
      cwd: './keyword-service',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        FLASK_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-keywords-error.log',
      out_file: './logs/pm2-keywords-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    {
      // Scheduled Jobs - Daily Audit
      name: 'audit-scheduler',
      script: './scripts/run-daily-audit.js',
      cron_restart: '0 2 * * *',        // Run at 2 AM daily
      watch: false,
      autorestart: false,               // Don't restart on completion
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-audit-error.log',
      out_file: './logs/pm2-audit-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },

    {
      // Scheduled Jobs - Position Tracking
      name: 'rank-tracker',
      script: './scripts/run-rank-tracking.js',
      cron_restart: '0 6 * * *',        // Run at 6 AM daily
      watch: false,
      autorestart: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-ranking-error.log',
      out_file: './logs/pm2-ranking-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },

    {
      // Scheduled Jobs - Local SEO
      name: 'local-seo-scheduler',
      script: './scripts/run-local-seo.js',
      cron_restart: '0 7 * * *',        // Run at 7 AM daily
      watch: false,
      autorestart: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-localseo-error.log',
      out_file: './logs/pm2-localseo-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },

    {
      // Email Queue Processor
      name: 'email-processor',
      script: './scripts/process-email-queue.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-email-error.log',
      out_file: './logs/pm2-email-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      cron_restart: '*/15 * * * *'      // Process queue every 15 minutes
    },

    {
      // Health Check Watchdog
      name: 'watchdog',
      script: './scripts/pm2-watchdog.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '100M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        HEALTH_CHECK_URL: 'http://localhost:9000/api/v2/health',
        CHECK_INTERVAL: '300000',         // 5 minutes (300000ms)
        SERVICE_NAME: 'seo-dashboard',
        RESTART_ON_FAILURE: 'true',
        MAX_FAILURES: '3'                 // Restart after 3 consecutive failures
      },
      error_file: './logs/pm2-watchdog-error.log',
      out_file: './logs/pm2-watchdog-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ],

  // Deployment configuration
  // Note: Actual deployment handled by GitHub Actions (.github/workflows/deploy-tpp-vps.yml)
  // This config is kept for reference and manual PM2 deploy command if needed
  deploy: {
    production: {
      user: 'avi',
      host: 'tpp-vps',
      ref: 'origin/main',
      repo: 'https://github.com/Theprofitplatform/seoexpert.git',
      path: '~/projects/seo-expert',
      'post-deploy': 'npm ci --omit=dev --ignore-scripts && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'git clone https://github.com/Theprofitplatform/seoexpert.git'
    }
  }
};
