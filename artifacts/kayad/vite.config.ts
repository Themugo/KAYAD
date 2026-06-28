import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// In a Vercel/CI build environment REPL_ID and PORT are not set — use safe
// defaults so the build doesn't throw before it can produce output.
const isBuildContext =
  process.env.VERCEL === '1' ||
  process.argv.some(a => a === 'build') ||
  (process.env.NODE_ENV === 'production' && !process.env.REPL_ID);

const rawPort = process.env.PORT;

if (!rawPort && !isBuildContext) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort) || 3000;

if (!isBuildContext && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath && !isBuildContext) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
      // Stub optional analytics/PWA packages not installed in this environment
      'posthog-js': path.resolve(import.meta.dirname, 'src/stubs/posthog-stub.ts'),
      '@sentry/react': path.resolve(import.meta.dirname, 'src/stubs/sentry-stub.ts'),
      'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'src/stubs/pwa-stub.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
