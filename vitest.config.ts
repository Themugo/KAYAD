import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      JWT_SECRET: 'test-secret-key',
      // Placeholder so module-level `process.env.MONGO_URI ? describe : describe.skip`
      // guards don't self-skip, and so server.ts's required-env-var startup check
      // doesn't process.exit(1) when integration tests import it. Each test's own
      // beforeAll overwrites this with a real MongoMemoryServer URI before connecting.
      MONGO_URI: 'mongodb://placeholder-overwritten-by-mongo-memory-server/test',
    },
    include: ['__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['routes/**/*.ts', 'services/**/*.ts', 'middleware/**/*.ts'],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
});
