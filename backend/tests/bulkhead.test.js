// backend/tests/bulkhead.test.js
// ─────────────────────────────────────────────────────────────
// Tests for Bulkhead Isolation Middleware
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getBulkhead, createBulkheadMiddleware, getAllBulkheadStates, resetBulkhead } from "../middleware/bulkhead.js";

describe("Bulkhead Isolation", () => {
  beforeEach(() => {
    // Clear bulkheads before each test
    const states = getAllBulkheadStates();
    for (const name of Object.keys(states)) {
      resetBulkhead(name);
    }
  });

  afterEach(() => {
    // Clean up after each test
    const states = getAllBulkheadStates();
    for (const name of Object.keys(states)) {
      resetBulkhead(name);
    }
  });

  describe("Semaphore", () => {
    it("should allow concurrent operations up to max", async () => {
      const bulkhead = getBulkhead("test-1", 3);

      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(
          (async () => {
            await bulkhead.acquire();
            await new Promise((resolve) => setTimeout(resolve, 10));
            bulkhead.release();
          })()
        );
      }

      await Promise.all(operations);

      const state = bulkhead.getState();
      expect(state.current).toBe(0);
      expect(state.queueLength).toBe(0);
    });

    it("should queue operations beyond max concurrent", async () => {
      const bulkhead = getBulkhead("test-2", 2);

      let completed = 0;
      const operations = [];

      // Start 4 operations (2 will be queued)
      for (let i = 0; i < 4; i++) {
        operations.push(
          (async () => {
            await bulkhead.acquire();
            await new Promise((resolve) => setTimeout(resolve, 50));
            bulkhead.release();
            completed++;
          })()
        );
      }

      await Promise.all(operations);

      expect(completed).toBe(4);
      const state = bulkhead.getState();
      expect(state.current).toBe(0);
    });

    it("should track metrics correctly", async () => {
      const bulkhead = getBulkhead("test-3", 2);

      // Acquire and release
      await bulkhead.acquire();
      bulkhead.release();

      const state = bulkhead.getState();
      expect(state.metrics.totalRequests).toBe(1);
      expect(state.metrics.acceptedRequests).toBe(1);
    });

    it("should track rejected requests", async () => {
      const bulkhead = getBulkhead("test-4", 1);

      // Acquire the semaphore
      await bulkhead.acquire();

      // Try to acquire again (will be queued)
      const acquirePromise = bulkhead.acquire();

      // Release after a short delay
      setTimeout(() => {
        bulkhead.release();
      }, 10);

      await acquirePromise;

      const state = bulkhead.getState();
      expect(state.metrics.rejectedRequests).toBeGreaterThan(0);
    });
  });

  describe("Bulkhead Middleware", () => {
    it("should create middleware with custom configuration", () => {
      const middleware = createBulkheadMiddleware("test-middleware", 5, 10000);
      expect(typeof middleware).toBe("function");
    });

    it("should handle request within concurrency limit", async () => {
      const middleware = createBulkheadMiddleware("test-limit", 2, 5000);

      const req = { path: "/test" };
      const res = {
        statusCode: 200,
        headersSent: false,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.jsonData = data;
        },
        end: function () {},
      };
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should handle timeout when waiting too long", async () => {
      const middleware = createBulkheadMiddleware("test-timeout", 1, 100);

      const req = { path: "/test" };
      const res = {
        statusCode: 200,
        headersSent: false,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.jsonData = data;
        },
        end: function () {},
      };
      const next = jest.fn();

      // Acquire the semaphore to block subsequent requests
      const bulkhead = getBulkhead("test-timeout", 1);
      await bulkhead.acquire();

      // Try to process a request (will timeout)
      await middleware(req, res, next);

      expect(res.statusCode).toBe(504);
      expect(res.jsonData).toEqual({
        success: false,
        message: "Request timeout due to resource contention",
      });

      // Release the semaphore
      bulkhead.release();
    });

    it("should release semaphore after response", async () => {
      const middleware = createBulkheadMiddleware("test-release", 1, 5000);

      const req = { path: "/test" };
      const res = {
        statusCode: 200,
        headersSent: false,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.jsonData = data;
          this.end();
        },
        end: function () {},
      };
      const next = jest.fn();

      await middleware(req, res, next);

      const bulkhead = getBulkhead("test-release", 1);
      const state = bulkhead.getState();
      expect(state.current).toBe(0);
    });
  });

  describe("Bulkhead Registry", () => {
    it("should return same bulkhead for same name", () => {
      const bulkhead1 = getBulkhead("registry-test", 5);
      const bulkhead2 = getBulkhead("registry-test", 10);

      expect(bulkhead1).toBe(bulkhead2);
      expect(bulkhead1.maxConcurrent).toBe(5); // First configuration wins
    });

    it("should return all bulkhead states", () => {
      getBulkhead("bulkhead-1", 5);
      getBulkhead("bulkhead-2", 10);

      const states = getAllBulkheadStates();

      expect(states).toHaveProperty("bulkhead-1");
      expect(states).toHaveProperty("bulkhead-2");
      expect(states["bulkhead-1"].maxConcurrent).toBe(5);
      expect(states["bulkhead-2"].maxConcurrent).toBe(10);
    });

    it("should reset bulkhead", () => {
      const bulkhead = getBulkhead("reset-test", 2);

      // Acquire to change state
      bulkhead.acquire();
      expect(bulkhead.current).toBe(1);

      // Reset
      resetBulkhead("reset-test");

      // Check state
      const state = bulkhead.getState();
      expect(state.current).toBe(0);
      expect(state.queueLength).toBe(0);
    });

    it("should handle reset of non-existent bulkhead", () => {
      expect(() => {
        resetBulkhead("non-existent");
      }).not.toThrow();
    });
  });

  describe("Pre-configured Bulkheads", () => {
    it("should have database bulkhead", () => {
      const states = getAllBulkheadStates();
      expect(states).toHaveProperty("database");
    });

    it("should have external API bulkhead", () => {
      const states = getAllBulkheadStates();
      expect(states).toHaveProperty("external-api");
    });

    it("should have upload bulkhead", () => {
      const states = getAllBulkheadStates();
      expect(states).toHaveProperty("upload");
    });

    it("should have payment bulkhead", () => {
      const states = getAllBulkheadStates();
      expect(states).toHaveProperty("payment");
    });
  });

  describe("Concurrency Control", () => {
    it("should enforce max concurrent limit", async () => {
      const bulkhead = getBulkhead("concurrency-test", 2);

      let activeCount = 0;
      let maxActive = 0;

      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(
          (async () => {
            await bulkhead.acquire();
            activeCount++;
            maxActive = Math.max(maxActive, activeCount);
            await new Promise((resolve) => setTimeout(resolve, 20));
            activeCount--;
            bulkhead.release();
          })()
        );
      }

      await Promise.all(operations);

      expect(maxActive).toBeLessThanOrEqual(2);
    });

    it("should handle rapid requests", async () => {
      const bulkhead = getBulkhead("rapid-test", 3);

      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            await bulkhead.acquire();
            await new Promise((resolve) => setTimeout(resolve, 5));
            bulkhead.release();
          })()
        );
      }

      await Promise.all(operations);

      const state = bulkhead.getState();
      expect(state.metrics.totalRequests).toBe(10);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors during request processing", async () => {
      const middleware = createBulkheadMiddleware("error-test", 2, 5000);

      const req = { path: "/test" };
      const res = {
        statusCode: 200,
        headersSent: false,
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        json: function (data) {
          this.jsonData = data;
        },
        end: function () {},
      };
      const next = jest.fn(() => {
        throw new Error("Test error");
      });

      await middleware(req, res, next);

      // Should release semaphore even on error
      const bulkhead = getBulkhead("error-test", 2);
      const state = bulkhead.getState();
      expect(state.current).toBe(0);
    });
  });
});
