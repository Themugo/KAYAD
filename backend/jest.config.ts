// jest.config.js
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: false,
  maxWorkers: 1,
  collectCoverageFrom: [
    "utils/**/*.ts",
    "middleware/**/*.ts",
    "services/**/*.ts",
    "controllers/**/*.ts",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
};
