import { describe, expect, it } from "vitest";
import { onJsonResponse } from "../utils/responseHooks.js";

function makeResponse() {
  const listeners = new Map();
  const res = {
    headersSent: false,
    writableEnded: false,
    body: null,
    statusCode: 200,
    once(event, fn) { listeners.set(event, fn); },
    off() {},
    json(body) { this.body = body; this.headersSent = true; this.writableEnded = true; return this; },
  };
  return res;
}

describe("central response JSON hooks", () => {
  it("composes multiple hooks without stacking response method overrides", async () => {
    const res = makeResponse();
    const events = [];
    onJsonResponse(res, async (body) => { events.push(`first:${body.value}`); });
    onJsonResponse(res, (body) => { events.push("second"); return { ...body, success: true }; });

    await res.json({ value: 7 });

    expect(events).toEqual(["first:7", "second"]);
    expect(res.body).toEqual({ value: 7, success: true });
  });

  it("does not attempt a second write after the response is committed", async () => {
    const res = makeResponse();
    await res.json({ success: true });
    let called = false;
    onJsonResponse(res, () => { called = true; });
    await res.json({ success: false });
    expect(called).toBe(false);
    expect(res.body).toEqual({ success: true });
  });

  it("isolates hook failures from the HTTP response", async () => {
    const res = makeResponse();
    onJsonResponse(res, () => { throw new Error("telemetry failure"); });
    await res.json({ ok: true });
    expect(res.body).toEqual({ ok: true });
  });
});
