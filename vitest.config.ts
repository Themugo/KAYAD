import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Changed from 'node' to 'jsdom' for React component testing
    setupFiles: ['./src/__tests__/setup.js'],
    env: {
      JWT_SECRET: 'test-secret-key',
      // Placeholder so module-level `process.env.MONGO_URI ? describe : describe.skip`
      // guards don't self-skip, and so server.ts's required-env-var startup check
      // doesn't process.exit(1) when integration tests import it. Each test's own
      // beforeAll overwrites this with a real MongoMemoryServer URI before connecting.
      MONGO_URI: 'mongodb://placeholder-overwritten-by-mongo-memory-server/test',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx,jsx,js}', 'tests/**/*.{test,spec}.{ts,tsx,jsx,js}'],
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx,jsx}', 'routes/**/*.ts', 'services/**/*.ts', 'middleware/**/*.ts'],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      '@sentry/react': '/src/__tests__/__mocks__/sentry-react.js',
    },
  },
});
