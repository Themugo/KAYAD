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
