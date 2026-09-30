// Regression: authRoutes.js once referenced `authLimiter` without importing it.
// The module threw ReferenceError at import time, the backend crashed on boot,
// and Render kept serving the previous build -> "Route not found: /api/v1/auth/csrf".
// Importing the router must succeed and it must expose GET /csrf.
process.env.NODE_ENV ||= "test";
process.env.JWT_SECRET ||= "test-jwt-secret-test-jwt-secret-1234";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh-secret-test-refresh-1234";
process.env.SESSION_SECRET ||= "test-session-secret-test-session-1234";

describe("authRoutes boot integrity", () => {
  it("imports without ReferenceError and exposes GET /csrf", async () => {
    const { default: router } = await import("../routes/authRoutes.js");
    const hasCsrf = router.stack.some(
      (l) => l.route?.path === "/csrf" && l.route.methods.get,
    );
    expect(hasCsrf).toBe(true);
  });
});
