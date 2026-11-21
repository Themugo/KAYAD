import fs from 'node:fs';

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const securityTs = fs.readFileSync('src/utils/security.ts', 'utf8');
const securityJs = fs.readFileSync('src/utils/security.js', 'utf8');
const logger = fs.readFileSync('src/utils/logger.ts', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');
const mobile = fs.readFileSync('src/styles/mobile.css', 'utf8');

check('production security logging excludes arbitrary metadata',
  securityTs.includes("console.warn('[SECURITY]', event);") &&
  securityJs.includes("console.warn('[SECURITY]', event);") &&
  !securityTs.includes("console.warn('[SECURITY]', event, metadata)")
);
check('application logger remains development-only',
  logger.includes('if (import.meta.env.DEV)')
);
check('service worker has no obsolete API cache list', !sw.includes('API_ROUTES'));
check('service worker never caches API responses', sw.includes('event.respondWith(fetch(request));'));
check('service worker retains auth bypass', sw.includes("if (/^\\/api\\/(v\\d+\\/)?auth\\//.test(url.pathname)) return;"));
check('mobile reduced-motion contract exists', mobile.includes('@media (prefers-reduced-motion: reduce)'));

const failed = checks.filter(c => !c.ok);
if (failed.length) process.exit(1);
console.log(`\nPolish contract: ${checks.length}/${checks.length} PASS`);
