import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': import.meta.dirname
          ? path.resolve(import.meta.dirname, '.')
          : path.resolve('.', '.'),
      },
    },
    server: {
      // Optional HMR override for constrained development environments.
      // File watching can be disabled explicitly with DISABLE_HMR=true.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Dev-only: forward /api to the local backend so the frontend's
      // relative API calls (and the e2e ApiHelper) reach it instead of
      // getting the SPA index.html. Production API URL comes from
      // VITE_API_URL at build time; this proxy never ships.
      proxy: {
        '/api': {
          target: process.env.VITE_DEV_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
