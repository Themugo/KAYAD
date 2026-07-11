import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Better chunk splitting
        manualChunks(id) {
          // Separate large dependencies
          if (id.includes('node_modules')) {
            // Core React
            if (id.includes('react-dom')) {
              return 'react-vendor';
            }
            // Routing
            if (id.includes('react-router')) {
              return 'react-router';
            }
            // Database/Auth
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Icons
            if (id.includes('lucide')) {
              return 'lucide';
            }
            // Animation
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
          }
        },
        // Asset inlining for small files
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (ext === 'css') return 'css/[name]-[hash][extname]';
          if (['woff', 'woff2', 'ttf', 'eot'].includes(ext)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // Code splitting for routes
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    // CSS optimization
    cssCodeSplit: true,
    // Enable experimental features
    experimentalMaxChunkWidth: 500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: [
      // Exclude rarely used modules from pre-bundling
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
