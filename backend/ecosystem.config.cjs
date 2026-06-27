// PM2 Ecosystem Configuration for KAYAD Backend
// Usage: pm2 start ecosystem.config.cjs
//        pm2 reload ecosystem.config.cjs --update-env

module.exports = {
  apps: [
    {
      name: 'kayad-api',
      script: 'server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      health_check_grace_period: 3000,
    },
  ],
};
