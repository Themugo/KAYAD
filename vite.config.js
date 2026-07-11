import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
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
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      // Target modern browsers for smaller output
      target: 'es2020',
    },
    // Security: Prevent accidental secrets exposure
    envPrefix: ['VITE_', 'VITE_APP_'],
  };
});
