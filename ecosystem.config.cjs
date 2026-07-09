// ecosystem.config.cjs  — PM2 process manager config
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'gari-backend',
      script: './backend/server.js',
      cwd: '/var/www/gari-motors',
      instances: 'max',          // cluster mode — use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/gari/backend-error.log',
      out_file:   '/var/log/gari/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Graceful reload — wait for connections to finish
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
