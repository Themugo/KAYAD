import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // Changed from 'node' to 'jsdom' for React component testing
    setupFiles: ['./src/__tests__/setup.js'],
    env: {
      SUPABASE_URL: 'https://placeholder.supabase.co',
      SUPABASE_ANON_KEY: 'placeholder-key',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx,jsx,js}', 'tests/**/*.{test,spec}.{ts,tsx,jsx,js}'],
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx,jsx}'],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {},
  },
});
