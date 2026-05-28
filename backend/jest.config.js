// jest.config.js
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  maxWorkers: 1,
  collectCoverageFrom: [
    "utils/**/*.js",
    "middleware/**/*.js",
    "services/**/*.js",
    "controllers/**/*.js",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
};
