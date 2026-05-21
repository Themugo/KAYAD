// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: "Kayad – Kenya's Premium Car Marketplace",
          short_name: 'Kayad',
          description: 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.',
          theme_color: '#D4AF37',
          background_color: '#050505',
          display: 'standalone',
          start_url: '/',
          lang: 'en-KE',
          orientation: 'portrait-primary',
          categories: ['automotive', 'marketplace', 'business'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
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
      env.VITE_BUNDLE_VISUALIZE && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ].filter(Boolean),

    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:5000',
          changeOrigin: true,
          cookieDomainRewrite: 'localhost',
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
          manualChunks: (id) => {
            // Vendor chunk — React + Router + core libs
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            // Socket.io chunk
            if (id.includes('node_modules/socket.io')) {
              return 'vendor-socket';
            }
            // Sentry chunk — only loads when DSN is set
            if (id.includes('node_modules/@sentry')) {
              return 'vendor-sentry';
            }
            // Lucide icons — tree-shaken but still chunk-worthy
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            // Admin pages — only dealers/admins load these
            if (id.includes('/pages/admin/') || id.includes('/pages/dealer/')) {
              return 'pages-staff';
            }
          }
        }
      },

      chunkSizeWarningLimit: 800,
    },

    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
    },
  };
});