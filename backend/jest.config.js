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
};
