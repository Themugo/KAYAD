// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg'],
        manifest: {
          name: 'Kayad – Kenya\'s Premium Car Marketplace',
          short_name: 'Kayad',
          description: 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.',
          theme_color: '#0A1628',
          background_color: '#0A1628',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml' },
            { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [{
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
          }],
        },
      }),
    ],

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
      sourcemap: !!env.VITE_SENTRY_DSN,

      rollupOptions: {
        output: {
          // ✅ SAFE: avoid manualChunks crash
          manualChunks: undefined
        }
      },

      chunkSizeWarningLimit: 800,
    },

    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
    },
  };
});