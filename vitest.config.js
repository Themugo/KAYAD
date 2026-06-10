import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register/react': path.resolve(__dirname, 'src/__tests__/mocks/pwa-register.js'),
      'posthog-js': path.resolve(__dirname, 'src/__tests__/mocks/posthog-js.js'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'backend', 'e2e'],
    globals: true,
    css: true,
    env: {
      VITE_ENABLE_DEMO: 'true',
    },
    // Memory-bounded run. The large App.test.jsx suite (full Router tree
    // wrapped in providers) blows the default thread heap on CI. The
    // `forks` pool with one worker isolates each file and recycles memory.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2,
        minForks: 1,
      },
    },
  },
});
