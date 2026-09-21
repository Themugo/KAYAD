import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const releaseCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.KAYAD_RELEASE_COMMIT || 'unknown';
  const releaseSource = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production';
  const releasePlugin = {
    name: 'kayad-release-identity',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source: JSON.stringify({ application: 'KAYAD', commit: releaseCommit, source: releaseSource, generatedAt: new Date().toISOString() }, null, 2),
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), releasePlugin],
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
