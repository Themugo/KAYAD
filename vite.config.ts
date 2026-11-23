import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const releaseCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.KAYAD_RELEASE_COMMIT || 'unknown';
  const releaseSource = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production';
  const builtAt = new Date().toISOString();
  // One id per build: commit (12) + build time. Stamped into release.json, <meta name="kayad-release">, the bundle (__KAYAD_RELEASE_ID__).
  const releaseId = `${String(releaseCommit).slice(0, 12)}-${Date.now().toString(36)}`;
  const releasePlugin = {
    name: 'kayad-release-identity',
    transformIndexHtml(html: string) {
      return html.replace('</head>', `    <meta name="kayad-release" content="${releaseId}" />\n  </head>`);
    },
    generateBundle(_options: unknown, bundle: Record<string, { type: string; fileName: string; isEntry?: boolean }>) {
      const entries = Object.values(bundle).filter((o) => o.type === 'chunk' && o.isEntry).map((o) => o.fileName);
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        // No secrets: only public build identity.
        source: JSON.stringify({ application: 'KAYAD', releaseId, commit: releaseCommit, source: releaseSource, generatedAt: builtAt, entryAssets: entries }, null, 2),
      });
    },
  };

  return {
    define: { __KAYAD_RELEASE_ID__: JSON.stringify(releaseId) },
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
      // Dev-only: documentation, audit evidence and test-runner output are never part of the app. Without this, a
      // log written under docs/ while `vite dev` serves the E2E suite (e.g. a test runner redirecting its output into
      // docs/audits/evidence) triggered full page reloads mid-test (docs/audits/22 — E2E-ENV-1).
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/docs/**', '**/evidence/**', '**/test-results/**', '**/playwright-report/**'] },
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
