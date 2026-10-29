import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const page = read('../src/pages/admin/AdminSecurityLog.jsx');
const api = read('../src/api/api.exports.ts');
const routes = read('../backend/routes/securityLogRoutes.js');
const controller = read('../backend/controllers/securityLogController.js');
const checks = [
  ['page calls canonical security log endpoint', page.includes('adminAPI.getSecurityLogs(params)')],
  ['page consumes logs response contract', page.includes('Array.isArray(d.logs)')],
  ['page consumes security summary response', page.includes('d.summary || null')],
  ['page has visible request failure and retry', page.includes('Security logs could not be loaded') && page.includes('Retry')],
  ['CSV export uses actual security log records', page.includes('const csv =') && page.includes('security-logs-')],
  ['JSON export uses actual security log records', page.includes('logs: rows')],
  ['security log API method is registered', api.includes("getSecurityLogs: (params: any) => api.get('/security-logs'")],
  ['security summary API method is registered', api.includes("getSecurityLogSummary: (params?: any) => api.get('/security-logs/summary'")],
  ['query validation accepts action filter', routes.includes('action: z.string().trim().max(120).optional()')],
  ['query validation accepts severity filter', routes.includes('severity: z.enum')],
  ['query validation accepts target model filter', routes.includes('targetModel: z.string().trim().max(120).optional()')],
  ['controller filters target model', controller.includes('if (targetModel) filter.targetModel = targetModel')],
  ['controller caps page size', controller.includes('Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200)')],
  ['admin-only protection retained', routes.includes('protect, adminOnly')],
  ['no mutation routes added', !/router\.(post|put|patch|delete)\(/.test(routes)],
];
let failures = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures++; }
console.log(`RESULT ${checks.length - failures}/${checks.length} checks passed`);
if (failures) process.exitCode = 1;
