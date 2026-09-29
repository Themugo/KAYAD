import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/cache.js", () => ({
  cacheGet: vi.fn(() => new Promise(() => {})),
  cacheSet: vi.fn(() => new Promise(() => {})),
  cacheDel: vi.fn(() => new Promise(() => {})),
}));

import CacheStore from "../services/sessionStore.js";

describe("CacheStore availability contract", () => {
  it("does not hang on a degraded Redis get", async () => {
    const store = new CacheStore();
    const callback = vi.fn();
    const started = Date.now();

    await store.get("sid", callback);

    expect(Date.now() - started).toBeLessThan(1300);
    expect(callback).toHaveBeenCalledWith(null, null);
  });

  it("does not hold the HTTP response lifecycle on a degraded Redis set", async () => {
    const store = new CacheStore();
    const callback = vi.fn();
    const started = Date.now();

    await store.set("sid", { cookie: { maxAge: 60000 } }, callback);

    expect(Date.now() - started).toBeLessThan(1300);
    expect(callback).toHaveBeenCalledWith(null);
  });

  it("does not hang on a degraded Redis destroy", async () => {
    const store = new CacheStore();
    const callback = vi.fn();
    const started = Date.now();

    await store.destroy("sid", callback);

    expect(Date.now() - started).toBeLessThan(1300);
    expect(callback).toHaveBeenCalledWith(null);
  });
});
