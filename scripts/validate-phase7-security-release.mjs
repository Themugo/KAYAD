#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];
const exists = (p) => fs.existsSync(path.join(root,p));
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const check = (name, ok, detail='') => { checks.push({name,ok,detail}); if(!ok) failures.push(`${name}${detail?`: ${detail}`:''}`); };

check('Production environment contract hardening', /launchRequired/.test(read('backend/utils/env.js')) && /DISABLE_REDIS=true is forbidden/.test(read('backend/utils/env.js')));
check('Managed Redis production fail-closed', /Production Redis requires REDIS_URL/.test(read('backend/config/redis.js')) && /Production Redis cannot be disabled/.test(read('backend/config/redis.js')));
check('Public health error redaction', /Database check failed/.test(read('backend/routes/healthRoutes.js')) && !/error: error\.message/.test(read('backend/routes/healthRoutes.js')));
check('Readiness detail redaction', /detail: "Database readiness check failed"/.test(read('backend/utils/healthCheck.js')));
check('Security headers', /helmet\(/.test(read('backend/server.js')) && /Content-Security-Policy|contentSecurityPolicy/.test(read('backend/server.js')) && /Permissions-Policy/.test(read('backend/server.js')));
check('CORS allowlist', /allowedOrigins/.test(read('backend/server.js')) && /credentials: true/.test(read('backend/server.js')));
check('CSRF protection', exists('backend/middleware/csrf.js') && /csrfProtection/.test(read('backend/middleware/csrf.js')));
check('Rate limiting', exists('backend/middleware/rateLimiter.js') && /globalLimiter/.test(read('backend/middleware/rateLimiter.js')) && /authLimiter/.test(read('backend/middleware/rateLimiter.js')) && /paymentLimiter/.test(read('backend/middleware/rateLimiter.js')));
check('Authorization middleware', exists('backend/middleware/auth.js') && /adminOnly/.test(read('backend/middleware/auth.js')) && /protect/.test(read('backend/middleware/auth.js')));
check('Live readiness endpoints', /\/health\/live/.test(read('backend/utils/healthCheck.js')) && /\/health\/ready/.test(read('backend/utils/healthCheck.js')));
check('Secrets excluded from source control', /\.env\n/.test(read('.gitignore')) && !exists('.env'));
check('No obvious private-key material', !/(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,})/.test(read('backend/server.js')+read('backend/utils/env.js')));
check('Production owner contract', /WEBHOIST_EMAIL/.test(read('backend/config/owners.js')) && /WEBHOIST_EMAIL/.test(read('backend/utils/env.js')));
check('Backup tooling present', exists('scripts/backup-database.sh') && exists('scripts/backup-database.bat'));
check('Phase 6 live certification retained', exists('scripts/validate-phase6-release.mjs') && exists('scripts/certify-phase6-live.mjs'));

console.log('===== KAYAD PHASE 7 SECURITY RELEASE CERTIFICATION =====');
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'} | ${c.name}${c.detail?` | ${c.detail}`:''}`);
console.log(`\nRESULT: ${checks.length-failures.length}/${checks.length} PASS`);
if (failures.length) { console.error('\nFailures:\n- '+failures.join('\n- ')); process.exit(1); }
