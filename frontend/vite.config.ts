import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:4000';
  const wsProxyTarget = env.VITE_WS_PROXY_TARGET || 'ws://localhost:4000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        },
        '/ws': {
          target: wsProxyTarget,
          ws: true
        },
        '/webhook': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
