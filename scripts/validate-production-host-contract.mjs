import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { throw new Error(`FAIL ${message}`); };

const vercel = JSON.parse(read('vercel.json'));
const env = read('.env.production.example');
const http = read('src/api/httpClient.ts');
const server = read('backend/server.js');
const verifier = read('scripts/verify-production-deployment.mjs');

if (!env.includes('VITE_PUBLIC_URL=https://www.kayad.space')) fail('canonical public URL');
pass('canonical public URL is www.kayad.space');

if (!env.includes('VITE_API_URL=/api')) fail('production browser API must use the same-origin /api contract');
pass('production browser API uses same-origin /api');

if (!http.includes(": '/api'") || !http.includes('const API_URL')) fail('production API fallback');
pass('production browser API uses same-origin routing with a Vercel rewrite');

if (!server.includes('https://kayad-space.vercel.app') || !server.includes('https://kayad-space-themugos-projects.vercel.app')) fail('current stable Vercel CORS aliases');
if (server.includes('kayad-motors.vercel.app') || server.includes('kayad-motors-themugos-projects.vercel.app')) fail('obsolete Vercel CORS aliases');
pass('backend CORS uses current stable Vercel aliases');

if (vercel.rewrites?.[0]?.source !== '/api/:path*' || vercel.rewrites?.[0]?.destination !== 'https://api.kayad.space/api/:path*') fail('Vercel API compatibility rewrite');
if (vercel.rewrites?.[1]?.source !== '/((?!api/|assets/).*)' || vercel.rewrites?.[1]?.destination !== '/index.html') fail('Vercel SPA fallback');
pass('Vercel retains API-before-SPA compatibility routing');

if (!verifier.includes('https://www.kayad.space') || !verifier.includes('https://api.kayad.space')) fail('production verifier canonical endpoints');
pass('production verifier targets canonical public and API endpoints');

console.log('Production host contract: PASS');
