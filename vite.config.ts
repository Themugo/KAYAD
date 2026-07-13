import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.svg', 'icons/icon-512.svg'],
      manifest: {
        name: 'Kayad - Kenya\'s Premium Car Marketplace',
        short_name: 'Kayad',
        description: 'Live Bidding, Escrow, M-Pesa',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /\/api\/cars.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cars',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 1 // 1 minute
              },
              networkTimeoutSeconds: 5,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    // Bundle analysis
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }),
    // Compression
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false
    })
  ],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', changeOrigin: true, ws: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    cssCodeSplit: true,
    // Enable tree shaking
    treeShaking: true,
    // Optimize module resolution
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Vendor chunking - group related packages together
          if (id.includes('node_modules')) {
            // React core - should load first
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'react-vendor';
            }
            // React Router - navigation
            if (id.includes('react-router') || id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            // Animations - can load lazily
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // HTTP client
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            // WebSocket/Real-time
            if (id.includes('socket.io-client') || id.includes('socket.io-parser')) {
              return 'socket-vendor';
            }
            // Icons - large, load lazily
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Error tracking
            if (id.includes('@sentry')) {
              return 'sentry-vendor';
            }
            // Analytics
            if (id.includes('posthog')) {
              return 'analytics-vendor';
            }
            // Date formatting
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
              return 'date-vendor';
            }
            // JSON parsing
            if (id.includes('lodash') || id.includes('clonedeep')) {
              return 'utils-vendor';
            }
            // Default vendor chunk
            return 'vendor';
          }
          
          // Application code splitting
          // Admin pages - typically not accessed, load lazily
          if (id.includes('src/pages/admin')) {
            return 'pages-admin';
          }
          // Dealer pages
          if (id.includes('src/pages/dealer')) {
            return 'pages-dealer';
          }
          // Role-based pages
          if (id.includes('src/pages/buyer') || 
              id.includes('src/pages/seller') || 
              id.includes('src/pages/inspector') || 
              id.includes('src/pages/showroom')) {
            return 'pages-role';
          }
          // Auction and car detail pages - popular, moderate priority
          if (id.includes('src/pages/auction') || id.includes('src/pages/car')) {
            return 'pages-auction';
          }
          // Other pages
          if (id.includes('src/pages')) {
            return 'pages-misc';
          }
          // Components - heavy UI components
          if (id.includes('src/components')) {
            return 'components';
          }
          // Context providers
          if (id.includes('src/context')) {
            return 'context';
          }
          // API layer
          if (id.includes('src/api')) {
            return 'api';
          }
          // Hooks
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          // Utils
          if (id.includes('src/utils')) {
            return 'utils';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Optimize for HTTP/2
        hoistTransitiveImports: false,
      }
    },
    chunkSizeWarningLimit: 800, // Lower limit to catch potential issues
    // Optimize chunk loading
    commonjsOptions: {
      transformMixedEsModules: true
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'axios',
    ],
    exclude: [
      '@vitejs/plugin-react',
    ]
  },
});
