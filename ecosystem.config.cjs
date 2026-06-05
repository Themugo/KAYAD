// ecosystem.config.cjs — PM2 process manager config
// Usage: pm2 start ecosystem.config.cjs --env production
const path = require('path');
module.exports = {
  apps: [
    {
      name: 'kayad-backend',
      script: './backend/server.js',
      cwd: path.resolve(__dirname),
      instances: 'max',          // cluster mode — use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      node_args: '--max-old-space-size=450', // prevent OOM before PM2 restarts
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/backend-error.log',
      out_file:   './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Graceful reload — wait for in-flight requests to finish
      kill_timeout:    10000,   // 10s (matches server.js force-exit timer)
      listen_timeout:  5000,
      // Auto-restart on crash with exponential backoff
      autorestart: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      // Merge logs across cluster instances
      merge_logs: true,
    },
  ],
};
