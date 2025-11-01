/**
 * PM2 Ecosystem Configuration
 * For production deployment of Manual Review System
 */

module.exports = {
  apps: [
    {
      // Main API Server
      name: 'seo-expert-api',
      script: 'src/index.js',
      instances: 2,
      exec_mode: 'cluster',

      // Production environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        API_PORT: 4000,
        LOG_LEVEL: 'info'
      },

      // Development environment
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
        API_PORT: 4000,
        LOG_LEVEL: 'debug'
      },

      // Auto-restart settings
      watch: false,
      max_memory_restart: '500M',

      // Error handling
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Logs
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'production-server',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/seo-expert.git',
      path: '/var/www/seo-expert',
      'post-deploy': 'npm ci --omit=dev --ignore-scripts && pm2 reload ecosystem.config.js --env production'
    }
  }
};
