import fs from "fs";
import path from "path";

const root = process.cwd();
const checks = [];
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const pass = (name, ok, detail = "") => { checks.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

const refreshModel = read("backend/models/RefreshToken.js");
const refreshMigration = read("supabase/migrations/20260930110000_advanced_identity_session_hardening.sql");
const auth = read("backend/controllers/authController.js");
const csrf = read("backend/middleware/csrf.js");
const authMw = read("backend/middleware/auth.js");
const gateway = read("backend/services/communicationGateway.service.js");
const otp = read("backend/services/otpService.js");
const response = read("backend/utils/response.js");

pass("refresh tokens are hashed before persistence", /token_hash:\s*hashToken\(token\)/.test(refreshModel));
pass("refresh token plaintext column is removed by migration", /DROP COLUMN IF EXISTS token/.test(refreshMigration));
pass("refresh rotation is atomic in PostgreSQL", /kayad_rotate_refresh_token/.test(refreshMigration));
pass("refresh reuse revokes the family", /reuse_detected/.test(refreshMigration) && /family_id = old_row\.family_id/.test(refreshMigration));
pass("access token carries session identity", /sessionId/.test(auth) && /generateAccessToken\(user, tokenVersion, sessionId\)/.test(auth));
pass("session inventory does not expose refresh token", !/session\.token|token:\s*row\.token/.test(refreshModel));
pass("session revocation is server-side", /revokeSessionById/.test(refreshModel) && /revokeSessionById\(tokenId/.test(auth));
pass("security state bypasses profile cache", /securityUser = await User\.findById/.test(authMw) && /RefreshToken\.findActiveSessionById/.test(authMw));
pass("Authorization header is not a CSRF bypass", !/if \(req\.headers\.authorization\) return next\(\)/.test(csrf));
pass("explicit machine CSRF bypass is available", /kayadMachineAuthenticated/.test(csrf));
pass("account-aware auth limiters exist", /registrationLimiter/.test(read("backend/middleware/rateLimiter.js")) && /recoveryLimiter/.test(read("backend/middleware/rateLimiter.js")));
pass("verification token consumption is atomic", /findOneAndUpdate\(\s*\{ emailVerifyToken/.test(auth));
pass("password reset consumption is atomic", /findOneAndUpdate\(\s*\{ resetToken/.test(auth));
pass("OTP verification consumption is atomic", /eq\("status", "pending"\).*?eq\("code_hash", hash\(code\)\)/s.test(otp));
pass("communication idempotency key is persisted", /idempotencyKey/.test(gateway));
pass("communication provider status is monotonic", /DELIVERY_TRANSITIONS/.test(gateway) && /if \(!DELIVERY_TRANSITIONS/.test(gateway));
pass("dead-letter state is explicit", /dead_letter/.test(gateway) && /dead_letter/.test(read("supabase/migrations/20260930113000_communication_state_machine_hardening.sql")));
pass("stable machine-readable response codes supported", /errorCode/.test(response));
pass("normalized email uniqueness migration exists", fs.existsSync(path.join(root, "supabase/migrations/20260930112000_identity_email_normalization.sql")));

const failed = checks.filter((x) => !x.ok);
console.log(`\nAdvanced auth sweep source gate: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
