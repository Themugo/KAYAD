import { defineConfig } from "vitest/config";

// Backend tests written against the Vitest API (import from "vitest" / vi.*).
// Jest cannot run these, so `npm test` runs them here; see jest.config.js ignore list.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/csrfAvailability.test.js",
      "tests/productionRuntimeCorrections.test.js",
      "tests/responseHooks.test.js",
      "tests/sessionStoreAvailability.test.js",
      "tests/socketRuntimeSafety.test.js",
    ],
    testTimeout: 60000,
  },
});
