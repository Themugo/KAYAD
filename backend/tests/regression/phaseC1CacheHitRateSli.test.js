// Phase C.1 regression (newly created): the cache_hit_rate SLI read `metric.other.other.counter`, a path that does
// not exist in config/reliability.js (`metric.denominator.other.counter`), so computeSli() threw and logged
// "SLI computation failed" on every reliability tick and the SLI was never produced.
import { describe, test, expect, jest } from "@jest/globals";

const counters = { cache_hits_total: 30, cache_misses_total: 10 };
const logError = jest.fn();
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError, default: {} }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll: jest.fn(async () => []), findOne: jest.fn(async () => null), create: jest.fn(), update: jest.fn() }));
jest.unstable_mockModule("../../config/metrics.js", () => ({ getCounter: (k) => counters[k] ?? 0, getHistogram: () => [], getAllMetrics: () => ({ counters: {}, histograms: {} }) }));
const { computeSli } = await import("../../services/sliTrackingService.js");

describe("cache_hit_rate SLI", () => {
  test("computes hits / (hits + misses) using the configured miss counter", () => {
    expect(computeSli("cache_hit_rate")).toBe(75);
    expect(logError).not.toHaveBeenCalled();
  });
});
