// backend/tests/performanceMonitor.test.js
// ─────────────────────────────────────────────────────────────
// Performance Monitoring Middleware Tests
// Tests the performance monitoring middleware
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { performanceMonitor, memoryMonitor, cpuMonitor } from "../middleware/performanceMonitor.js";
import { recordHttpRequest, recordHistogram, incrementCounter } from "../config/metrics.js";

// Mock the metrics functions
jest.mock("../config/metrics.js");
jest.mock("../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

describe("Performance Monitor Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: "GET",
      path: "/api/cars",
      requestId: "test-123",
    };
    res = {
      statusCode: 200,
      setHeader: jest.fn(),
      end: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should record HTTP request metrics", () => {
    performanceMonitor(req, res, next);

    expect(next).toHaveBeenCalled();

    // Trigger response end
    res.end();

    expect(recordHttpRequest).toHaveBeenCalledWith(req.method, req.path, res.statusCode, expect.any(Number));
    expect(recordHistogram).toHaveBeenCalledWith("http_response_time_ms", expect.any(Number), {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });
  });

  it("should add X-Response-Time header", () => {
    performanceMonitor(req, res, next);

    res.end();

    expect(res.setHeader).toHaveBeenCalledWith("X-Response-Time", expect.stringMatching(/\d+ms/));
  });

  it("should log slow requests (> 1s)", () => {
    // Mock a slow response
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1500);

    performanceMonitor(req, res, next);
    res.end();

    expect(incrementCounter).toHaveBeenCalledWith("slow_requests_total", 1, {
      method: req.method,
      path: req.path,
    });
  });

  it("should log very slow requests (> 5s)", () => {
    // Mock a very slow response
    jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(6000);

    performanceMonitor(req, res, next);
    res.end();

    expect(incrementCounter).toHaveBeenCalledWith("very_slow_requests_total", 1, {
      method: req.method,
      path: req.path,
    });
  });
});

describe("Memory Monitor Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should record memory metrics", () => {
    memoryMonitor()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(recordHistogram).toHaveBeenCalledWith("memory_heap_used_mb", expect.any(Number));
    expect(recordHistogram).toHaveBeenCalledWith("memory_heap_total_mb", expect.any(Number));
  });

  it("should log high memory usage (> 80%)", () => {
    // Mock high memory usage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 400 * 1024 * 1024, // 400 MB
      heapTotal: 500 * 1024 * 1024, // 500 MB (80%)
      external: 100 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
    });

    memoryMonitor()(req, res, next);

    expect(incrementCounter).toHaveBeenCalledWith("high_memory_usage_total", 1, {
      threshold: "80%",
    });
  });

  it("should log critical memory usage (> 90%)", () => {
    // Mock critical memory usage
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 450 * 1024 * 1024, // 450 MB
      heapTotal: 500 * 1024 * 1024, // 500 MB (90%)
      external: 100 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
    });

    memoryMonitor()(req, res, next);

    expect(incrementCounter).toHaveBeenCalledWith("critical_memory_usage_total", 1, {
      threshold: "90%",
    });
  });
});

describe("CPU Monitor Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should record CPU metrics", () => {
    cpuMonitor()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(recordHistogram).toHaveBeenCalledWith("cpu_user_time_ms", expect.any(Number));
    expect(recordHistogram).toHaveBeenCalledWith("cpu_system_time_ms", expect.any(Number));
    expect(recordHistogram).toHaveBeenCalledWith("cpu_total_time_ms", expect.any(Number));
  });
});
