module.exports = {
  apps: [
    {
      name: 'seo-audit-all',
      script: 'bash',
      args: '-c "node audit-all-clients.js && ./deploy-to-cloudflare.sh --production"',
      cron_restart: '0 0 * * *', // Daily at midnight
      watch: false,
      autorestart: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'client-status-check',
      script: 'client-status.js',
      cron_restart: '0 */6 * * *', // Every 6 hours
      watch: false,
      autorestart: false,
      max_memory_restart: '500M'
    },
    {
      name: 'generate-reports',
      script: 'generate-full-report.js',
      cron_restart: '0 1 * * *', // Daily at 1 AM
      watch: false,
      autorestart: false,
      max_memory_restart: '1G'
    }
  ]
};
