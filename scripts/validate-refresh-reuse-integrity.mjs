import fs from 'node:fs';

const controller = fs.readFileSync('backend/controllers/authController.js', 'utf8');
const model = fs.readFileSync('backend/models/RefreshToken.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260930110000_advanced_identity_session_hardening.sql', 'utf8');

const checks = [
  ['controller passes historical token to rotation', controller.includes('RefreshToken.findByTokenHash(oldRefreshToken)') && controller.includes('RefreshToken.rotate({')],
  ['controller does not pre-reject stored revoked tokens', !controller.includes('if (!existing) throw Object.assign(new Error("Refresh token not found or revoked")')],
  ['rotation RPC detects revoked or expired token', migration.includes('IF old_row.is_revoked OR old_row.expires_at <= now()')],
  ['rotation RPC revokes entire family on reuse', migration.includes("WHERE family_id = old_row.family_id AND is_revoked = false") && migration.includes("'refresh_reuse'")],
  ['controller increments token version after reuse', controller.includes("result?.status === \"reuse_detected\"") && controller.includes('$inc: { tokenVersion: 1 }')],
  ['refresh model uses canonical rotation RPC', model.includes('kayad_rotate_refresh_token')],
];

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`\nRefresh-token reuse integrity: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
