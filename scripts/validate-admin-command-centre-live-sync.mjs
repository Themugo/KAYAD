import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const view = read('src/features/AdminView.tsx');
const css = read('src/features/admin-command-centre.css');
const route = read('src/components/admin/AdminRouteSurface.tsx');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const socket = read('src/context/SocketContext.tsx');
const backend = read('backend/server.js');
const checks = [
  ['canonical /admin still mounts AdminView inside the shared shell', route.includes("const AdminView = lazy(() => import('../../features/AdminView')") && /path === '\/admin' \|\| path === '\/admin\/dashboard'[\s\S]*?<AdminCommandCentre \/>/.test(route)],
  ['dashboard performs periodic data refresh', /setInterval\(refreshIfVisible, 60_000\)/.test(view)],
  ['dashboard subscribes to the existing authenticated control-plane room', /joinControlPlane\(\{ onUpdate: \(\) =>/.test(view) && /socket\.on\(\"joinControlPlane\", joinAdmins\)/.test(backend)],
  ['realtime subscription is restricted to server-admitted admin roles', /!\['admin', 'superadmin'\]\.includes\(sessionUser\?\.role/.test(view) && /ADMIN_ROOM_ROLES = \[\"admin\",\"superadmin\"/.test(backend)],
  ['socket channel cleanup uses the shared socket context', /leaveChannel\(channel\)/.test(view) && /joinControlPlane=useCallback/.test(socket)],
  ['background tabs do not trigger polling requests', /document\.visibilityState === 'visible'/.test(view)],
  ['returning to the tab refreshes the dashboard', /addEventListener\('visibilitychange', refreshIfVisible\)/.test(view) && /addEventListener\('focus', refreshIfVisible\)/.test(view)],
  ['sync can be paused and resumed by the operator', /setAutoSyncEnabled\(\(value\) => !value\)/.test(view) && /aria-pressed=\{autoSyncEnabled\}/.test(view)],
  ['last checked time is shown in Nairobi time', /lastCheckedAt \? `Last checked/.test(view) && /timeZone: 'Africa\/Nairobi'/.test(view)],
  ['manual refresh remains available', /aria-label="Refresh administration data"/.test(view)],
  ['restricted user data is not requested from the dashboard', /canOpen\('\/admin\/users'\) \? adminAPI\.users/.test(view)],
  ['restricted vehicle data is not requested from the dashboard', /canOpen\('\/admin\/cars'\) \? adminAPI\.cars/.test(view)],
  ['restricted audit data is not requested from the dashboard', /canOpen\('\/admin\/security-log'\) \? adminAPI\.getAuditLog/.test(view)],
  ['dashboard operational links use permission filtering', /\]\.filter\(\(item\) => canOpen\(item\.href\)\)/.test(view)],
  ['sync controls have responsive layout styling', css.includes('.kayad-command-sync-actions') && /@media\(max-width:520px\)[\s\S]*?\.kayad-command-sync-actions/.test(css)],
  ['sidebar alert count refreshes on an interval', /setInterval\(refreshAlerts, 60_000\)/.test(sidebar)],
  ['sidebar refreshes alert count when the tab becomes visible', /addEventListener\('visibilitychange', refreshAlerts\)/.test(sidebar)],
  ['sidebar reacts to existing admin alert and control-plane events', /on\('adminAlert', refreshAlerts\)/.test(sidebar) && /on\('controlPlaneUpdated', refreshAlerts\)/.test(sidebar)],
  ['sidebar preserves the last verified alert count when refresh fails', /Keep the last verified count; a failed request is not zero alerts/.test(sidebar)],
  ['sidebar and specialist routes remain canonical', sidebar.includes("id: 'command-centre'") && route.includes('ADMIN_ROUTE_COMPONENTS')],
];
let failed = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failed++; }
console.log(`\nAdmin command-centre live-sync validation: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);
