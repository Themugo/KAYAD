// Phase 15 - empirical role x route authorization probe against the real local stack.
// Every mounted admin/privileged route is called as each role. Mutating methods are NOT sent as superadmin/owner (no destructive
// actions); all other roles get every method with a zero-UUID target and an empty body, so an unexpected 2xx is an authorization defect.
const fs = require('fs');
const L = require('./e2e_lib.cjs');
const { call, sql } = L;
const ZERO = '00000000-0000-0000-0000-000000000000';
const ROLES = ['anon', 'user', 'dealer_team_member', 'individual_seller', 'dealer', 'broker', 'ghost_checker', 'moderator', 'ad_manager', 'marketing', 'escrow_officer', 'technical_support', 'hr', 'accounts', 'admin', 'superadmin'];
const PREFIXES = ['/api/admin', '/api/owner', '/api/auction-admin', '/api/new-admin', '/api/operations', '/api/reconciliation', '/api/ledger', '/api/finance', '/api/security-logs', '/api/audit', '/api/command-center', '/api/governance', '/api/feature-flags', '/api/escrow', '/api/payments', '/api/dealer-platform', '/api/dealer/', '/api/disputes', '/api/fraud', '/api/communications', '/api/reports', '/api/verification/admin', '/api/support', '/api/reliability', '/api/executive-analytics', '/api/automation', '/api/lowcode', '/api/platform-factory', '/api/integration', '/api/improvement', '/api/intelligence', '/api/hero', '/api/cms', '/api/ads', '/api/announcements', '/api/config', '/api/marketplace-health', '/api/dealer-health-score', '/api/duplicates', '/api/loans', '/api/organizations', '/api/inspection', '/api/ntsa-verification'];
const rows = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').slice(1).map((l) => l.slice(1, -1).split('","'));
const routes = rows.filter((r) => PREFIXES.some((p) => r[1].startsWith(p))).map((r) => ({ method: r[0], path: r[1], file: r[2], auth: r[5], guards: r[6] }));
const actors = {};
async function actor(role) {
  if (role === 'anon') return { jar: undefined };
  const realRole = ['dealer_team_member'].includes(role) ? 'user' : role;
  const u = await L.register('user', {});
  await L.verifyEmailViaToken(u.email);
  u.id = u.id || sql(`select id from users where email='${u.email}'`);
  sql(`update users set role='${realRole}', status='approved', email_verified=true where id='${u.id}'`);
  const l = await L.login(u.email); return { id: u.id, jar: l.jar };
}
(async () => {
  for (const r of ROLES) actors[r] = await actor(r);
  const dealer = actors.dealer;
  sql(`insert into dealer_teams(dealer,member,role,status,invite_email,invited_by,permissions) values ('${dealer.id}','${actors.dealer_team_member.id}','viewer','active','tm@example.test','${dealer.id}','{}'::jsonb) on conflict do nothing`);
  const out = [];
  for (const rt of routes) {
    const path = rt.path.replace(/:[A-Za-z_]+/g, ZERO);
    const rec = { method: rt.method, path: rt.path, file: rt.file, guards: rt.guards, auth: rt.auth, status: {} };
    for (const role of ROLES) {
      const mutating = rt.method !== 'GET';
      if (mutating && role === 'superadmin') { rec.status[role] = 'skipped(mutating)'; continue; }
      try {
        const r = await Promise.race([call(rt.method, path, { jar: actors[role].jar, body: mutating ? {} : undefined }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
        rec.status[role] = r.status;
      } catch (e) { rec.status[role] = 'ERR'; }
    }
    out.push(rec);
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log('probed', out.length, 'routes x', ROLES.length, 'roles');
})();
