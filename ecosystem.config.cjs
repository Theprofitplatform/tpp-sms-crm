/**
 * PM2 Ecosystem Configuration
 * Supports development and production deployments
 */

module.exports = {
  apps: [
    {
      name: 'seo-dashboard',
      script: './dashboard-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 9000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'dashboard/dist',
        'dashboard/node_modules'
      ]
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'tpp-vps',
      ref: 'origin/main',
      repo: 'git@github.com:Theprofitplatform/seoexpert.git',
      path: '/var/www/seo-expert',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --omit=dev --ignore-scripts && cd dashboard && npm ci --omit=dev --ignore-scripts && npm run build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    dev: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:Theprofitplatform/seoexpert.git',
      path: '/var/www/seo-expert-dev',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --ignore-scripts && cd dashboard && npm ci --ignore-scripts && npm run build && cd .. && pm2 reload ecosystem.config.js --env development',
      'pre-setup': ''
    }
  }
};
