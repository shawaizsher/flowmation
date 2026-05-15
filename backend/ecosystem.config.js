module.exports = {
  apps: [
    {
      name: 'flowa-api',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'flowa-worker',
      script: 'src/worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: { NODE_ENV: 'production' }
    }
  ]
};
