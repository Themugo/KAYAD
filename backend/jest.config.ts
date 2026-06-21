// jest.config.js
export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "./jest.transformer.cjs",
  },
  extensionsToTreatAsEsm: [".ts"],
  resolver: "./jest.resolver.cjs",
  testMatch: ["**/tests/**/*.test.[jt]s"],
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: false,
  maxWorkers: 1,
  collectCoverageFrom: [
    "utils/**/*.[jt]s",
    "middleware/**/*.[jt]s",
    "services/**/*.[jt]s",
    "controllers/**/*.[jt]s",
    "!**/node_modules/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
};
