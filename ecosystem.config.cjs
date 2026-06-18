// ============================================================
// PiForum — PM2 Ecosystem Config for serv00.com
// ============================================================
// Place this file at: ~/piforum/ecosystem.config.cjs
//
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup   (generates a startup script — may need crontab fallback on serv00)
// ============================================================

module.exports = {
  apps: [
    {
      name: 'piforum',
      script: '.next/standalone/server.js',
      cwd: '/home/CHANGEME/piforum', // <-- change to your serv00 home path
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: 'file:/home/CHANGEME/piforum/db/custom.db',
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
