// jest.config.js
export default {
  testEnvironment: "node",
  preset: null,
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: false,
  maxWorkers: 1,
  modulePathIgnorePatterns: ["node_modules"],
  // Run by vitest (npm run test:vitest) or node:test (npm run test:node) instead.
  testPathIgnorePatterns: [
    "/node_modules/",
    "tests/csrfAvailability\\.test\\.js$",
    "tests/productionRuntimeCorrections\\.test\\.js$",
    "tests/responseHooks\\.test\\.js$",
    "tests/sessionStoreAvailability\\.test\\.js$",
    "tests/socketRuntimeSafety\\.test\\.js$",
    "tests/response-lifecycle\\.test\\.js$",
  ],
  // Coverage instrumentation is not reliable with this native ESM/Jest setup.
  // Keep it opt-in via test:coverage instead of making npm test fail on bogus 0% data.
  collectCoverage: false,
  collectCoverageFrom: [
    "utils/**/*.js",
    "middleware/**/*.js",
    "services/**/*.js",
    "controllers/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
    "!**/tests/**",
    "!**/migrations/**",
    "!**/seed.js",
    "!**/server.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
};
