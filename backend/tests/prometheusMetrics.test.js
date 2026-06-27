// backend/tests/prometheusMetrics.test.js
// ─────────────────────────────────────────────────────────────
// Prometheus Metrics Endpoint Tests
// Tests the Prometheus metrics export endpoint
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";
import express from "express";
import prometheusMetricsRoutes from "../routes/prometheusMetrics.js";
import { incrementCounter, setGauge, recordHistogram, resetMetrics } from "../config/metrics.js";

describe("Prometheus Metrics Endpoint", () => {
  let app;

  beforeEach(() => {
    resetMetrics();
    app = express();
    app.use("/prometheus", prometheusMetricsRoutes);
  });

  it("should return metrics in Prometheus text format", async () => {
    // Add some test metrics
    incrementCounter("http_requests_total", 10, { method: "GET", path: "/api/cars" });
    setGauge("memory_heap_used_mb", 256, { instance: "localhost" });
    recordHistogram("http_request_duration_ms", [100, 200, 300], { method: "GET", path: "/api/cars" });

    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("memory_heap_used_mb");
    expect(response.text).toContain("http_request_duration_ms");
  });

  it("should include counter metrics with labels", async () => {
    incrementCounter("test_counter", 5, { label1: "value1", label2: "value2" });

    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(200);
    expect(response.text).toContain('test_counter{label1="value1",label2="value2"} 5');
  });

  it("should include gauge metrics with labels", async () => {
    setGauge("test_gauge", 42, { label: "test" });

    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(200);
    expect(response.text).toContain('test_gauge{label="test"} 42');
  });

  it("should include histogram metrics with buckets", async () => {
    recordHistogram("test_histogram", [10, 20, 30, 40, 50], { operation: "test" });

    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(200);
    expect(response.text).toContain("test_histogram_count");
    expect(response.text).toContain("test_histogram_sum");
    expect(response.text).toContain("test_histogram_bucket");
  });

  it("should handle empty metrics gracefully", async () => {
    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
  });

  it("should handle errors gracefully", async () => {
    // Mock getAllMetrics to throw an error
    jest.mock("../config/metrics.js", () => ({
      getAllMetrics: () => {
        throw new Error("Test error");
      },
    }));

    const response = await request(app).get("/prometheus");

    expect(response.status).toBe(500);
    expect(response.text).toContain("# Error generating metrics");
  });
});
