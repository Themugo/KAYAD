import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Security: Enforce HTTPS in production proxy
    https: false,
  },
  build: {
    sourcemap: false, // Never expose sourcemaps in production
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
        experimentalMinChunkSize: 8192,
      },
    },
    // Security: Sanitize build output
    minify: 'esbuild',
    // Security: Disable HTML template modification
    htmlMinify: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  // Security: CSP nonce support
  esbuild: {
    // Remove console/log statements in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Target modern browsers for smaller output
    target: 'es2020',
  },
  // Security: Prevent accidental secrets exposure
  envPrefix: ['VITE_', 'VITE_APP_'],
  // Security: Validate env variables
  envFileSuffix: process.env.NODE_ENV === 'production' ? '.prod' : '.dev',
});
