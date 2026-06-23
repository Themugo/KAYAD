// backend/tests/logging.test.js
// ─────────────────────────────────────────────────────────────
// Pino logging system tests
// Tests structured logging, environment-specific configs, and API compatibility
// ─────────────────────────────────────────────────────────────

import { logInfo, logWarn, logError, logDebug, generateRequestId, createChildLogger } from "../utils/logger.js";

describe("Pino Logging System", () => {
  describe("Logger API", () => {
    it("should export logInfo function", () => {
      expect(typeof logInfo).toBe("function");
    });

    it("should export logWarn function", () => {
      expect(typeof logWarn).toBe("function");
    });

    it("should export logError function", () => {
      expect(typeof logError).toBe("function");
    });

    it("should export logDebug function", () => {
      expect(typeof logDebug).toBe("function");
    });

    it("should export generateRequestId function", () => {
      expect(typeof generateRequestId).toBe("function");
    });

    it("should export createChildLogger function", () => {
      expect(typeof createChildLogger).toBe("function");
    });
  });

  describe("Logging Functions", () => {
    it("should log info message", () => {
      expect(() => logInfo("Test info message", { key: "value" })).not.toThrow();
    });

    it("should log warn message", () => {
      expect(() => logWarn("Test warn message", { key: "value" })).not.toThrow();
    });

    it("should log error message", () => {
      const error = new Error("Test error");
      expect(() => logError("Test error message", error, { context: "data" })).not.toThrow();
    });

    it("should log debug message", () => {
      expect(() => logDebug("Test debug message", { key: "value" })).not.toThrow();
    });
  });

  describe("Request ID Generation", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it("should generate hex strings", () => {
      const id = generateRequestId();
      expect(typeof id).toBe("string");
      expect(/^[a-f0-9]+$/.test(id)).toBe(true);
    });
  });

  describe("Child Logger", () => {
    it("should create child logger with context", () => {
      const logger = { child: jest.fn() };
      const childLogger = createChildLogger(logger, { context: "test" });

      expect(logger.child).toHaveBeenCalledWith({ context: "test" });
    });
  });
});
