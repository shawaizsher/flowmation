module.exports = {
  apps: [
    {
      name: 'fluxion-api',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'fluxion-worker',
      script: 'src/worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' }
    }
  ]
};
