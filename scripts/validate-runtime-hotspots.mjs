import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const server = read('backend/server.js');
const hooks = read('backend/utils/responseHooks.js');
const checks = [
  ['Socket typing is rate-limit fail-closed', server.includes('if (!socket.user || isRateLimited("typing") || !isValidId(String(chatId || ""))) return;')],
  ['Central response hook is the only production res.json override', (server.match(/res\.json\s*=/g) || []).length === 0 && (hooks.match(/res\.json\s*=\s*function/g) || []).length === 1],
  ['Response wrapper is registered before API v2 routes', server.indexOf('app.use(responseWrapper);') >= 0 && server.indexOf('app.use(responseWrapper);') < server.indexOf('app.use("/api/v2", v2Routes);')],
  ['SLI does not override response methods', !read('backend/middleware/sliMiddleware.js').match(/res\.(json|end|send|writeHead)\s*=/)],
  ['Performance monitor does not override response methods', !read('backend/middleware/performanceMonitor.js').match(/res\.(json|end|send|writeHead)\s*=/)],
  ['Error handler guards committed responses', read('backend/middleware/errorHandler.js').includes('if (res.headersSent || res.writableEnded) return next(err);')],
  ['Not-found handler guards committed responses', read('backend/middleware/notFound.js').includes('if (res.headersSent || res.writableEnded) return next();')],
  ['Socket typing regression test exists', fs.existsSync(path.join(root, 'backend/tests/socketRuntimeSafety.test.js'))],
];
let failed=0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if(!ok) failed++; }
if (failed) process.exit(1);
console.log(`Runtime hotspot validation: ${checks.length}/${checks.length} PASS`);
