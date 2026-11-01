// Regression: adminRoutes.js once called `validateObjectId("chatId")` while *defining* routes. validateObjectId is a plain
// (req, res, next) middleware, so the string was treated as `req` and the whole API crashed at import time
// ("Cannot read properties of undefined (reading 'id')"). This test imports the real router (an import-time crash fails it)
// and checks that each admin chat route carries the ID middleware as a function.
import { describe, test, expect } from "@jest/globals";

process.env.NODE_ENV = "test";

describe("admin chat routes boot and are guarded", () => {
  test("adminRoutes imports without throwing and exposes the chat routes with validateObjectId in their chain", async () => {
    const [{ default: router }, { validateObjectId }] = await Promise.all([
      import("../../routes/adminRoutes.js"),
      import("../../middleware/validate.js"),
    ]);
    const chatRoutes = router.stack.filter((l) => l.route && /^\/chats\/:chatId\//.test(l.route.path));
    const paths = chatRoutes.map((l) => `${Object.keys(l.route.methods)[0]} ${l.route.path}`).sort();
    expect(paths).toEqual([
      "delete /chats/:chatId/messages/:messageId",
      "get /chats/:chatId/messages",
      "post /chats/:chatId/block",
      "post /chats/:chatId/unblock",
    ]);
    expect(chatRoutes.length).toBe(4);
    for (const layer of chatRoutes) {
      const handlers = layer.route.stack.map((s) => s.handle);
      expect(handlers.every((h) => typeof h === "function")).toBe(true);
      expect(handlers).toContain(validateObjectId);
    }
  });

  test("validateObjectId rejects a malformed chat id with 400 and accepts a UUID", async () => {
    const { validateObjectId } = await import("../../middleware/validate.js");
    const mk = (params) => { const out = { status: null, nexted: false }; const res = { status(c) { out.status = c; return res; }, json() { return res; }, send() { return res; } }; return { req: { params }, res, out, next: () => { out.nexted = true; } }; };
    const bad = mk({ chatId: "not-a-uuid" });
    validateObjectId(bad.req, bad.res, bad.next);
    expect(bad.out.nexted).toBe(false);
    const good = mk({ chatId: "550e8400-e29b-41d4-a716-446655440000" });
    validateObjectId(good.req, good.res, good.next);
    expect(good.out.nexted).toBe(true);
  });
});
