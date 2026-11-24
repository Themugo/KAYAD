// Generates the per-route release matrix section of docs/admin-console-closure/27-FINAL-RELEASE-READINESS-MATRIX.md (appended by the author after the verdict text).
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const reg = JSON.parse(fs.readFileSync(new URL('docs/admin-console-closure/route-register.json', root)));
const a11y = JSON.parse(fs.readFileSync(new URL('docs/admin-console-closure/evidence/a11y/a11y.json', root)));
const flagged = new Set(a11y.summary.axeSeriousOrCritical.map((x) => x.route));
const kb = new Set(a11y.summary.keyboard.map((k) => k.route));
const human = (r) => r === '/admin' ? 'Admin dashboard / command centre' : r.replace('/admin/', '').split('-').map((w, i) => (i ? w : w[0].toUpperCase() + w.slice(1))).join(' ');
const issue = (r, row) => ({
  '/admin/escrows': 'Escrow transitions not executed; hosted `transition_escrow` absent', '/admin/transactions': 'No money movement executed',
  '/admin/dealer-verifications': 'Hosted needs migrations 120000 + 130000 (BLOCKED pending owner)', '/admin/reports': 'Hosted lacks `reports` table until migration', '/admin/feedback': 'Hosted lacks `feedback` table until migration',
  '/admin/private-seller-applications': 'Purity legacy `users.status=pending` left unchanged (blocked on owner)', '/admin/broadcast': 'Send not executed', '/admin/panic-room': 'Destructive actions never executed',
  '/admin/platform-recovery': 'Recovery never executed', '/admin/config': 'Unavailable; retire pending owner approval', '/admin/vxp': 'Unavailable (shell only)',
}[r] || (row.cls === 'Deliberately unavailable' ? 'Not provisioned (honest 503 state)' : '—'));
const rows = reg.map((r) => `| \`${r.route}\` | ${human(r.route)} | ${r.access} | ${r.modDenied ? 'moderator denied' : 'moderator allowed'} | ${r.cls === 'Fully workflow verified' || r.cls === 'Safely simulated' ? 'read + write path tested (see doc 23)' : r.cls === 'Deliberately unavailable' ? 'honest unavailable state' : 'read verified; writes per the doc 23 register'} | server authz via journeys 29/32/33/34 | ${flagged.has(r.route) ? 'axe finding' : 'axe clean 390/1440'}${kb.has(r.route) ? '; keyboard probed' : ''}; no screen reader | **${r.cls}** | ${issue(r.route, r)} |`).join('\n');
fs.writeFileSync(new URL('docs/admin-console-closure/release-matrix-table.md', root), `| Route | Purpose | Permissions (server authoritative) | Moderator | Read/write verification | Security verification | Accessibility status | Classification | Outstanding issue |\n|---|---|---|---|---|---|---|---|---|\n${rows}\n`);
console.log(reg.length);
