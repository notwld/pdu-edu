module.exports = {
  apps: [{
    name: 'portal-pdu',
    script: 'dist/index.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3090
    },
    // Auto-restart configuration
    autorestart: true,
    watch: false, // Don't watch files in production
    max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
    restart_delay: 5000, // Wait 5 seconds before restarting
    // Logging configuration
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Zero-downtime deployment
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,
    // Health check
    health_check: {
      enabled: true,
      interval: 30000, // Check every 30 seconds
      timeout: 5000,
      unhealthy_threshold: 3,
      healthy_threshold: 2
    }
  }],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/master',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:dist && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
