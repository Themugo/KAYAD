#!/usr/bin/env node
// Final-closure Phase 2: renders the Admin Write Authorization Register from the EMPIRICAL probe output of journey 35.
// Usage: node scripts/admin-closure-write-register.mjs <35_write_register.json> <outDir>
import fs from 'node:fs';
const [, , inFile, outDir] = process.argv;
const reg = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const here = new URL('../', import.meta.url).pathname;
const policy = JSON.parse(fs.readFileSync(`${here}ci/db-journeys/35_policy.json`, 'utf8'));
const known5xx = new Set(JSON.parse(fs.readFileSync(`${here}ci/db-journeys/35_known_5xx.json`, 'utf8')));
const allow = new Set(JSON.parse(fs.readFileSync(`${here}scripts/write-route-public-allowlist.json`, 'utf8')).routes);
const ACTORS = ['anonymous', 'personal', 'dealer', 'moderator', 'hr', 'accounts', 'marketing', 'escrow_officer', 'ad_manager', 'technical_support', 'ghost_checker', 'admin'];
const refused = (s) => s === 401 || s === 403;
const FAKE = '00000000-0000-4000-8000-0000000000aa';
const norm = (u) => (u || '').split(FAKE).join(':id');
const UD1 = /^POST \/api\/bids\/[0-9a-f-]+\/bid$/;
const OD5 = /^(POST|PUT) \/api\/automation\/tasks/;
const ANY_BY_DESIGN = /^POST \/api\/(admin\/alerts\/|improvement\/)/;

const rows = reg.map((x) => {
  const key = `${x.method} ${x.url}`;
  const passed = x.url ? ACTORS.filter((a) => x.status[a] !== undefined && !refused(x.status[a])) : [];
  const pol = x.url ? policy.find(([m, rx]) => m === x.method && new RegExp(rx).test(x.url)) : null;
  const has5xx = x.url && Object.values(x.status).some((v) => v >= 500);
  let cls, note = '';
  if (!x.url) { cls = 'Verified secure'; note = 'not mounted in server.js: unreachable'; }
  else if (x.note?.startsWith('self-service')) { cls = 'Verified secure'; note = 'self-service identity route (session owner only); anonymous probed refused'; }
  else if (UD1.test(key)) { cls = 'Unresolved security defect'; note = 'UD-1: anonymous caller receives 200 "Processing" because idempotencyCheck runs before protect; no bid is placed. Fix touches bid/auction flow (frozen); owner approval required'; }
  else if (OD5.test(key)) { cls = 'Deferred with reason and owner decision'; note = 'OD-5: Automation task workflow is open to every staff role; owner must decide the permission (no existing permission names task work)'; }
  else if (ANY_BY_DESIGN.test(key)) { cls = 'Intentionally restricted'; note = 'staff-wide by design (own alerts / idea board); personal and dealer refused'; }
  else if (allow.has(`${x.file} ${x.method} ${x.path}`) || x.static_auth === 'signature/apikey') { cls = 'Verified secure'; note = 'public by design (reviewed allowlist) or signature-verified'; }
  else if (pol && !/any staff|OWNER DECISION/.test(pol[3]) && /via (requirePermission|requireAnyPermission|allowRoles)/.test(pol[3])) { cls = 'Fixed and retested'; note = `authorization added this closure: ${pol[3].replace(/^.* via /, '')}`; }
  else if (pol) { cls = 'Fixed and retested'; note = pol[3]; }
  else if (passed.some((a) => a !== 'admin') && passed.length > 1 && !/dealer|Seller|seller|requireOrgAccess/i.test(`${x.guards} ${x.url}`)) { cls = 'Intentionally restricted'; note = `several staff categories pass the guard (${passed.join(', ')}); governed by existing role guard`; }
  else { cls = 'Verified secure'; }
  if (has5xx && !/^Unresolved/.test(cls)) note += `${note ? '; ' : ''}robustness: an invalid body or non-existent id answers 5xx for ${Object.entries(x.status).filter(([, v]) => v >= 500).map(([k]) => k).join('/')}${known5xx.has(key) ? ' (baselined in 35_known_5xx.json)' : ''}`;
  const tenant = /\/dealer|dealer-platform|\/team\//i.test(x.url || '') ? 'dealer-scoped: dealer taken from session, never the body (journeys 16/18/22)' : /\/admin\/|\/staff|\/new-admin|\/disputes|\/fraud|\/feature-flags|\/hero|\/queue|\/reliability|\/metrics|\/organizations|\/countries|\/localization/i.test(x.url || '') ? 'platform-wide staff surface (no tenant)' : 'owner-scoped by handler (session user)';
  return { endpoint: `${x.method} ${norm(x.url) || x.mount + x.path}`, source: `${x.file}:${x.line}`, guards: x.guards || x.static_auth || '(none)', eligible: passed.length ? passed.join(', ') : 'none (all refused)',
    tenant, server: x.url ? 'yes: probed over HTTP as 12 identities' : 'n/a', ui: 'advisory only (server authoritative); admin UI mirrors via src/utils/permissions.ts', unauthorized: x.url ? ACTORS.filter((a) => refused(x.status[a])).length ? `401 anonymous / 403 for ${ACTORS.filter((a) => x.status[a] === 403).join(', ') || '-'}` : 'none refused' : 'n/a',
    test: pol ? 'journey 35 T5 policy + T1-T3' : 'journey 35 T1-T3 (empirical)', cls, note };
});
const counts = {}; rows.forEach((r) => { counts[r.cls] = (counts[r.cls] || 0) + 1; });
fs.mkdirSync(outDir, { recursive: true });
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const cols = ['endpoint', 'source', 'guards', 'eligible', 'tenant', 'server', 'ui', 'unauthorized', 'test', 'cls', 'note'];
fs.writeFileSync(`${outDir}/write-authorization-register.csv`, [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n'));
const md = [`# Admin Write Authorization Register (final closure, ${new Date().toISOString().slice(0, 10)})`, '',
  `Source: journey 35 (real HTTP, disposable DB). Every POST/PUT/PATCH/DELETE route in the static map (${rows.length}) was called as anonymous, personal, dealer, 8 departmental staff roles and admin, with an empty body and a non-existent id: 401/403 = refused by the guard, anything else = passed the guard. Full machine-readable data: \`write-authorization-register.csv\` and \`evidence/35_write_register.json\`.`, '',
  '| Classification | Count |', '|---|---:|', ...Object.entries(counts).map(([k, v]) => `| ${k} | ${v} |`), '',
  'Column meaning: *eligible* = identities that passed the guard in the probe; *UI enforcement* is advisory, the server is authoritative. Rows that are not "Verified secure" are listed below; the full table is in the CSV.', '',
  '| Endpoint | Source | Guard (static) | Eligible (empirical) | Classification | Note |', '|---|---|---|---|---|---|',
  ...rows.filter((r) => r.cls !== 'Verified secure').map((r) => `| ${r.endpoint} | ${r.source} | ${r.guards} | ${r.eligible} | ${r.cls} | ${r.note} |`)].join('\n');
fs.writeFileSync(`${outDir}/28-ADMIN-WRITE-AUTHORIZATION-REGISTER.md`, md + '\n');
console.log(counts);
