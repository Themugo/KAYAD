// backend/tests/retry.test.js - SRE Retry Utility Tests
// ─────────────────────────────────────────────────────────────
// Unit tests for the enhanced retry utility with circuit breakers,
// timeouts, metrics, and fallback mechanisms
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withRetry, createServiceConfig, resetCircuit, getCircuitState, getAllCircuitStates } from "../utils/retry.js";

describe("Retry Utility", () => {
  beforeEach(() => {
    // Reset circuit breakers before each test
    getAllCircuitStates().forEach((state, key) => {
      resetCircuit(key);
    });
  });

  describe("Basic Retry Logic", () => {
    it("should succeed on first attempt", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await withRetry(fn, { retries: 3, enableMetrics: false, enableLogging: false });
      
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("success");
      
      const result = await withRetry(fn, { retries: 3, enableMetrics: false, enableLogging: false });
      
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      await expect(
        withRetry(fn, { retries: 2, enableMetrics: false, enableLogging: false })
      ).rejects.toThrow("fail");
      
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should use exponential backoff", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("success");
      
      const startTime = Date.now();
      await withRetry(fn, { retries: 2, baseDelayMs: 100, enableMetrics: false, enableLogging: false });
      const duration = Date.now() - startTime;
      
      expect(fn).toHaveBeenCalledTimes(3);
      expect(duration).toBeGreaterThanOrEqual(100); // At least base delay
    });
  });

  describe("Timeout Enforcement", () => {
    it("should timeout after specified duration", async () => {
      const fn = () => new Promise((resolve) => setTimeout(resolve, 5000));
      
      await expect(
        withRetry(fn, { timeoutMs: 1000, retries: 0, enableMetrics: false, enableLogging: false })
      ).rejects.toThrow("TIMEOUT");
    });

    it("should succeed before timeout", async () => {
      const fn = () => new Promise((resolve) => setTimeout(resolve, 100));
      
      const result = await withRetry(fn, { timeoutMs: 1000, retries: 0, enableMetrics: false, enableLogging: false });
      
      expect(result).toBeDefined();
    });

    it("should call onTimeout callback", async () => {
      const onTimeout = vi.fn();
      const fn = () => new Promise((resolve) => setTimeout(resolve, 5000));
      
      await expect(
        withRetry(fn, { timeoutMs: 100, retries: 0, onTimeout, enableMetrics: false, enableLogging: false })
      ).rejects.toThrow();
      
      expect(onTimeout).toHaveBeenCalled();
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after threshold failures", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      // Fail enough times to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            retries: 0,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      const state = getCircuitState("test-circuit");
      expect(state.status).toBe("open");
    });

    it("should reject requests when circuit is open", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      
      // Open circuit first
      resetCircuit("test-circuit");
      const failingFn = vi.fn().mockRejectedValue(new Error("fail"));
      
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(failingFn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            retries: 0,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      // Now try to call with circuit open
      await expect(
        withRetry(fn, { 
          circuitBreaker: true, 
          key: "test-circuit",
          retries: 0,
          enableMetrics: false,
          enableLogging: false
        })
      ).rejects.toThrow("CIRCUIT_BREAKER_OPEN");
      
      expect(fn).not.toHaveBeenCalled();
    });

    it("should close circuit after reset time", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      // Open circuit with short reset time
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            circuitResetMs: 100,
            retries: 0,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      // Wait for circuit to reset
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      // Circuit should be closed now
      const state = getCircuitState("test-circuit");
      expect(state.status).toBe("closed");
    });

    it("should call onCircuitOpen callback", async () => {
      const onCircuitOpen = vi.fn();
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            retries: 0,
            onCircuitOpen,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      expect(onCircuitOpen).toHaveBeenCalled();
    });

    it("should call onCircuitClose callback", async () => {
      const onCircuitClose = vi.fn();
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            circuitResetMs: 100,
            retries: 0,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      // Wait for reset and try successful call
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const successFn = vi.fn().mockResolvedValue("success");
      await withRetry(successFn, { 
        circuitBreaker: true, 
        key: "test-circuit",
        circuitThreshold: 3,
        circuitResetMs: 100,
        retries: 0,
        onCircuitClose,
        enableMetrics: false,
        enableLogging: false
      });
      
      expect(onCircuitClose).toHaveBeenCalled();
    });
  });

  describe("Fallback Mechanism", () => {
    it("should call fallback when circuit is open", async () => {
      const fallback = vi.fn().mockResolvedValue("fallback-result");
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            retries: 0,
            fallback,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to fail
        }
      }
      
      // Try with circuit open - should use fallback
      const result = await withRetry(fn, { 
        circuitBreaker: true, 
        key: "test-circuit",
        retries: 0,
        fallback,
        enableMetrics: false,
        enableLogging: false
      });
      
      expect(result).toBe("fallback-result");
      expect(fallback).toHaveBeenCalled();
    });

    it("should call fallback after retries exhausted", async () => {
      const fallback = vi.fn().mockResolvedValue("fallback-result");
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      const result = await withRetry(fn, { 
        retries: 2,
        fallback,
        enableMetrics: false,
        enableLogging: false
      });
      
      expect(result).toBe("fallback-result");
      expect(fallback).toHaveBeenCalled();
    });

    it("should call onFallback callback", async () => {
      const onFallback = vi.fn();
      const fallback = vi.fn().mockResolvedValue("fallback-result");
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      await withRetry(fn, { 
        retries: 2,
        fallback,
        onFallback,
        enableMetrics: false,
        enableLogging: false
      });
      
      expect(onFallback).toHaveBeenCalled();
    });
  });

  describe("Service-Specific Configuration", () => {
    it("should use mpesa service defaults", () => {
      const config = createServiceConfig("mpesa");
      
      expect(config.retries).toBe(2);
      expect(config.timeoutMs).toBe(30000);
      expect(config.circuitThreshold).toBe(3);
    });

    it("should use email service defaults", () => {
      const config = createServiceConfig("email");
      
      expect(config.retries).toBe(2);
      expect(config.timeoutMs).toBe(30000);
      expect(config.circuitThreshold).toBe(3);
    });

    it("should use sms service defaults", () => {
      const config = createServiceConfig("sms");
      
      expect(config.retries).toBe(2);
      expect(config.timeoutMs).toBe(15000);
      expect(config.circuitThreshold).toBe(5);
    });

    it("should use redis service defaults", () => {
      const config = createServiceConfig("redis");
      
      expect(config.retries).toBe(3);
      expect(config.timeoutMs).toBe(5000);
      expect(config.circuitThreshold).toBe(5);
    });

    it("should allow overriding service defaults", () => {
      const config = createServiceConfig("mpesa", { retries: 5 });
      
      expect(config.retries).toBe(5);
      expect(config.timeoutMs).toBe(30000); // Default preserved
    });
  });

  describe("Circuit State Management", () => {
    it("should return circuit state", () => {
      const state = getCircuitState("non-existent");
      
      expect(state.status).toBe("closed");
      expect(state.failures).toBe(0);
    });

    it("should return all circuit states", () => {
      const states = getAllCircuitStates();
      
      expect(states).toBeInstanceOf(Object);
    });

    it("should reset circuit", () => {
      resetCircuit("test-circuit");
      
      const state = getCircuitState("test-circuit");
      expect(state.status).toBe("closed");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle timeout with circuit breaker", async () => {
      const fn = () => new Promise((resolve) => setTimeout(resolve, 5000));
      
      // Open circuit with timeouts
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(fn, { 
            circuitBreaker: true, 
            key: "test-circuit",
            circuitThreshold: 3,
            timeoutMs: 100,
            retries: 0,
            enableMetrics: false,
            enableLogging: false
          });
        } catch (err) {
          // Expected to timeout
        }
      }
      
      const state = getCircuitState("test-circuit");
      expect(state.status).toBe("open");
    });

    it("should handle retry with fallback and circuit breaker", async () => {
      const fallback = vi.fn().mockResolvedValue("fallback-result");
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      
      const result = await withRetry(fn, { 
        circuitBreaker: true,
        key: "test-circuit",
        circuitThreshold: 3,
        retries: 2,
        fallback,
        enableMetrics: false,
        enableLogging: false
      });
      
      expect(result).toBe("fallback-result");
      expect(fallback).toHaveBeenCalled();
    });
  });
});
