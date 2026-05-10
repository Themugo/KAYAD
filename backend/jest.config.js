// jest.config.js
export default {
  testEnvironment: "node",
  transform: {},
  extensionsToTreatAsEsm: [".js"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
};
