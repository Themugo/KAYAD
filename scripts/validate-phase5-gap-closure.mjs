import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, condition) => {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
};

const api = read('src/api/api.exports.ts');
const page = read('src/pages/admin/OperationsControlRoom.jsx');
const routes = read('backend/routes/adminRoutes.js');
const ecpRoutes = read('backend/routes/ecpRoutes.js');
const server = read('backend/server.js');
const routeSurface = read('src/components/admin/AdminRouteSurface.tsx');
const tests = read('src/__tests__/pages/admin/OperationsControlRoom.test.jsx');
const envPath = path.join(root, '.env.production.example');
const env = fs.existsSync(envPath) ? read('.env.production.example') : '';

check('canonical Control Room reuses existing admin stats API method', page.includes('adminAPI.stats()') && api.includes("stats:         ()          => api.get('/admin/stats').then(unwrap)"));
check('no active frontend call targets missing /admin/operations/metrics route', !api.includes("api.get('/admin/operations/metrics')") && !page.includes('getOperationsMetrics'));
check('alerts are fetched from the existing protected admin alerts endpoint', api.includes("alerts:          (params: any)    => api.get('/admin/alerts', { params }).then(unwrap)") && page.includes('adminAPI.alerts({ limit: 10 })'));
check('activity is fetched from the existing admin audit-log endpoint', api.includes("getAuditLog:    (params: any)    => api.get('/admin/audit-log', { params }).then(unwrap)") && page.includes('adminAPI.getAuditLog({ page: 1, limit: 20 })'));
check('admin stats route is mounted and guarded by protect/adminOnly', server.includes('app.use("/api/admin", adminLimiter, adminRoutes)') && routes.indexOf('router.use(protect, adminOnly)') >= 0 && routes.indexOf('router.use(protect, adminOnly)') < routes.indexOf('"/stats"'));
check('disputed escrow metric has explicit domain field', routes.includes('disputedEscrows,') && routes.includes('alerts: disputedEscrows'));
check('canonical Control Room remains Super Admin restricted', routeSurface.includes("'/admin/control-room': { component: OperationsControlRoom, superadminOnly: true }"));
check('health endpoint is registered behind existing authentication and role middleware', server.includes('app.use("/api/ecp", ecpRoutes)') && ecpRoutes.includes('router.use(protect, allowRoles("admin", "superadmin", "engineer", "manager"))') && ecpRoutes.includes('router.get("/health", asyncHandler(getSystemHealth))'));
check('unavailable metric values do not silently default to zero', page.includes("return 'Unavailable'") && page.includes('unavailable.includes(key)') && !page.includes('metrics?.[card.key] ?? 0'));
check('unsupported trend and synthetic performance fields removed from canonical page', !/totalUsersTrend|pageViews|apiRequestsPerMin|escrowSuccessRate|avgTransactionTime|disputesLastWeek|newListingsToday/.test(page));
check('health timestamp is not fabricated from current wall clock', !page.includes('new Date().toISOString()') && page.includes("'time unavailable'"));
check('health status and latency validation preserve unknown/invalid states', page.includes("? rawStatus : 'unknown'") && page.includes('Number.isFinite(Number(service.latency))') && page.includes('Check duration unavailable'));
check('polling refreshes cannot overlap and use a bounded 30-second interval', page.includes('if (requestInFlight.current) return') && page.includes('requestInFlight.current = true') && page.includes('requestInFlight.current = false') && page.includes('}, 30000);'));
check('health/metrics/alerts/audit failure tests exist', tests.includes('does not render failed or unavailable statistics as zero') && tests.includes('distinguishes alert and audit-feed failures') && tests.includes('unrecognized service status unknown'));
check('production frontend contract exists with verified public values and no server secrets', (env.includes('# KAYAD production frontend contract') || env.includes('# KAYAD production frontend environment contract')) && env.includes('VITE_API_URL=/api') && env.includes('VITE_SOCKET_URL=https://api.kayad.space') && env.includes('VITE_PUBLIC_URL=https://www.kayad.space') && !/SERVICE_ROLE|SUPABASE_SERVICE_KEY|DATABASE_URL|JWT_SECRET|PASSWORD=/.test(env));

const failed = checks.filter((item) => !item.ok);
console.log(`\nPhase 5 gap-closure source contract: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exit(1);
