import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'backend', 'e2e'],
    globals: true,
    css: true,
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
