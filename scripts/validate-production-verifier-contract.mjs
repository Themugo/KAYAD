import fs from 'node:fs';

const verifier = fs.readFileSync('scripts/verify-production-deployment.mjs', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const failures = [];
const pass = (name) => console.log(`PASS ${name}`);
const fail = (name) => failures.push(name);

if (verifier.includes("'/api/health'")) pass('Production verifier checks browser-facing /api/health');
else fail('Production verifier browser-facing /api/health check');

if (verifier.includes("'/api/cars?limit=1'")) pass('Production verifier checks canonical /api/cars inventory');
else fail('Production verifier /api/cars inventory check');

if (verifier.includes("validateCarsPayload")) pass('Production verifier validates inventory response contract');
else fail('Production verifier inventory response validation');

if (verifier.includes("Vercel deployment /api/cars") && verifier.includes("Public production /api/cars")) pass('Production verifier checks both Vercel rewrite and public-domain inventory paths');
else fail('Production verifier rewrite/public inventory coverage');

if (vercel.rewrites?.[0]?.source === '/api/:path*' && vercel.rewrites?.[0]?.destination === 'https://api.kayad.space/api/:path*') pass('Vercel canonical API rewrite remains explicit');
else fail('Vercel canonical API rewrite');

// The SPA fallback must stay second (after the API rewrite) and must serve application routes
// only: /api/* and missing /assets/* must never be answered with index.html.
const spaRule = vercel.rewrites?.[1];
const spaRe = spaRule?.source ? new RegExp(`^${spaRule.source}$`) : null;
if (
  spaRule?.destination === '/index.html' &&
  spaRe &&
  ['/', '/marketplace', '/auctions/123'].every((p) => spaRe.test(p)) &&
  !['/api/cars', '/api/v1/auth/csrf', '/assets/index-abc123.js'].some((p) => spaRe.test(p))
) pass('SPA fallback remains after API rewrite and excludes /api and /assets');
else fail('SPA fallback ordering');

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log('Production verifier contract validation: PASS');
