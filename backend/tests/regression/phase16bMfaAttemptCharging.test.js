// PHASE 16B - the TOTP failure counter must be charged with a compare-and-set BEFORE a code is evaluated, so concurrent wrong codes cannot
// exceed MAX_FAILURES evaluations. Behavioural proof against the real service lives in runbooks/phase16b-20261027/http/e2e_phase16b_owner_dealer_separation.cjs (S7:
// 40 parallel wrong codes -> exactly 5 evaluated, 35 locked out; before the fix 25 were evaluated). This is the static contract guard.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../services/ownerMfa.service.js"), "utf8");
const verify = src.slice(src.indexOf("export async function verifyCode"));
describe("owner MFA attempt charging (16B)", () => {
  test("the attempt is reserved with a compare-and-set on failed_attempts and locked_until", () => {
    expect(verify).toMatch(/\.eq\("failed_attempts", cur\.failed_attempts \|\| 0\)/);
    expect(verify).toMatch(/\.is\("locked_until", null\)|\.eq\("locked_until", cur\.locked_until\)/);
  });
  test("the reservation happens before any code is evaluated", () => {
    expect(verify.indexOf('.eq("failed_attempts"')).toBeGreaterThan(-1);
    expect(verify.indexOf('.eq("failed_attempts"')).toBeLessThan(verify.indexOf("verifyTotp(secret, code)"));
    expect(verify.indexOf('.eq("failed_attempts"')).toBeLessThan(verify.indexOf("looksLikeRecovery(code)"));
  });
  test("the failure path no longer does a read-modify-write of the counter", () => {
    const fail = verify.slice(verify.indexOf("const fail = async"), verify.indexOf("if (allowRecovery"));
    expect(fail).not.toMatch(/failed_attempts/);
  });
  test("a success still resets the counter and a locked factor is refused", () => {
    expect(verify).toMatch(/failed_attempts: 0, locked_until: null/);
    expect(verify).toMatch(/OWNER_MFA_LOCKED/);
  });
});
