// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5000',
          ws: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: !!env.VITE_SENTRY_DSN, // source maps only when Sentry is enabled
      rollupOptions: {
        output: {
          manualChunks: {
            // Split large vendors into separate chunks for faster loading
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            socket:  ['socket.io-client'],
            sentry:  ['@sentry/react'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },

    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
    },
  };
});
