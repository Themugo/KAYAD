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
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: "Kayad – Kenya's Premium Car Marketplace",
          short_name: 'Kayad',
          description: 'Buy, sell and bid on premium cars in Kenya. Live auctions with M-Pesa. Secure escrow payments.',
          theme_color: '#050505',
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
          screenshots: [
            {
              src: 'screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
            },
            {
              src: 'screenshot-narrow.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 5 * 60, // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 24 * 60 * 60, // 60 Days
                },
              },
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
              },
            },
            {
              urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cloudinary-images',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 90 * 24 * 60 * 60, // 90 Days
                },
              },
            },
          ],
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
      env.VITE_BUNDLE_VISUALIZE && visualizer({
        open: false,
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
          secure: false,
          cookieDomainRewrite: 'localhost',
        },
        '/socket.io': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: !!env.VITE_POSTHOG_API_KEY,
      target: 'esnext',
      cssCodeSplit: true,

      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunk — React + Router + core UI logic
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            // HTTP Request layer chunk
            if (id.includes('node_modules/axios')) {
              return 'vendor-network';
            }
            // Socket.io Real-time communications chunk
            if (id.includes('node_modules/socket.io')) {
              return 'vendor-socket';
            }
            // PostHog analytics chunk
            if (id.includes('node_modules/posthog-js')) {
              return 'vendor-analytics';
            }
            // Lucide Icons code separation
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          }
        }
      },

      chunkSizeWarningLimit: 1000,
    },

    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '2.0.0'),
    },
  };
});
