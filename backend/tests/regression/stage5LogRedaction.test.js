import { describe, test, expect } from "@jest/globals";
import { redactUrl } from "../../utils/redactUrl.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("STAGE 5 single-use tokens never reach logs", () => {
  const tok = "a".repeat(64);
  test.each([
    [`/api/v1/auth/verify-email/${tok}`, `/api/v1/auth/verify-email/[REDACTED]`],
    [`/api/auth/verify-email/${tok}?x=1`, `/api/auth/verify-email/[REDACTED]?x=1`],
    [`/reset-password?token=${tok}&next=/home`, `/reset-password?token=[REDACTED]&next=/home`],
    [`/x?a=1&access_token=${tok}`, `/x?a=1&access_token=[REDACTED]`],
    ["/api/cars?brand=toyota", "/api/cars?brand=toyota"],
  ])("%s", (input, want) => {
    expect(redactUrl(input)).toBe(want);
    expect(redactUrl(input)).not.toContain(tok);
  });
  test("non-strings pass through", () => { expect(redactUrl(undefined)).toBeUndefined(); expect(redactUrl(null)).toBeNull(); });
  test.each(["infrastructure/logging/serializers.js", "infrastructure/logging/index.js", "infrastructure/logging/child-logger.js"])("%s logs the redacted URL only", (f) => {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    expect(src).not.toMatch(/url: req\.originalUrl \|\| req\.url,/);
    expect(src).toContain("redactUrl(");
  });
  test("production access log (morgan) uses the redacted url token", () => {
    const src = fs.readFileSync(path.join(root, "server.js"), "utf8");
    expect(src).toMatch(/morgan\.token\("url", \(req\) => redactUrl\(/);
  });
});
