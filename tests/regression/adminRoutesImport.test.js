// Regression: routes/adminRoutes.js must import cleanly. validateObjectId is a plain (req,res,next) middleware, not a
// factory; calling it as validateObjectId("chatId") at registration time threw a TypeError on import, which prevented
// server.js (which imports the admin router) from starting at all.
import { describe, test, expect } from "@jest/globals";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

describe("admin router module", () => {
  test("imports without throwing and exports an express router", async () => {
    const mod = await import("../../routes/adminRoutes.js");
    expect(typeof mod.default).toBe("function");
    expect(Array.isArray(mod.default.stack)).toBe(true);
    const chatRoutes = mod.default.stack.filter((l) => l.route && /^\/chats\/:chatId\/messages/.test(l.route.path));
    expect(chatRoutes.length).toBeGreaterThan(0);
  });

  test("validateObjectId rejects a malformed chat id with 400 instead of throwing", async () => {
    const { validateObjectId } = await import("../../middleware/validate.js");
    const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    let nextCalled = false;
    validateObjectId({ params: { chatId: "not-a-uuid" } }, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    validateObjectId({ params: { chatId: "550e8400-e29b-41d4-a716-446655440000" } }, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
