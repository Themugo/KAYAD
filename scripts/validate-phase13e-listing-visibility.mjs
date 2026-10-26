import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const migration = read('supabase/migrations/20261025113000_private_seller_listing_visibility.sql');
const rollback = read('supabase/rollbacks/20261025113000_private_seller_listing_visibility.down.sql');
const service = read('backend/services/privateSellerCapability.service.js');
const adminPage = read('src/pages/admin/AdminPrivateSellerApplications.tsx');
const routeSurface = read('src/components/admin/AdminRouteSurface.tsx');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const auth = read('src/context/AuthContext.tsx');
const permissions = read('src/utils/permissions.ts');

const checks = [
  ['visibility event table preserves car and seller identity', /car_id uuid NOT NULL REFERENCES public\.cars\(id\)/.test(migration) && /seller_user_id uuid NOT NULL REFERENCES public\.users\(id\)/.test(migration)],
  ['only live approved listings are hidden', /c\.status = 'available'\s+AND c\.approved = true\s+AND c\.deleted_at IS NULL/.test(migration)],
  ['suspended and revoked transitions trigger hiding', /NEW\.status IN \('suspended', 'revoked'\)/.test(migration)],
  ['restoration only occurs on approval after suspension or revocation', /NEW\.status = 'approved'\s+AND OLD\.status IN \('suspended', 'revoked'\)/.test(migration)],
  ['restoration checks same owner and hidden status', /c\.dealer_id = NEW\.user_id\s+AND c\.status = 'hidden'/.test(migration)],
  ['visibility event table has RLS enabled and no client grants', /ENABLE ROW LEVEL SECURITY/.test(migration) && /REVOKE ALL ON public\.private_seller_listing_visibility_events FROM anon, authenticated/.test(migration)],
  ['legacy suspended/revoked listings are reconciled at migration time', /One-time reconciliation[\s\S]*JOIN public\.private_seller_capabilities/.test(migration)],
  ['rollback restores only policy-hidden records and drops trigger/table', /c\.status = 'hidden'[\s\S]*e\.restored_at IS NULL/.test(rollback) && /DROP TRIGGER IF EXISTS trg_private_seller_listing_visibility/.test(rollback)],
  ['capability decisions invalidate public listing caches on hide/restore', /invalidatePublicListingCaches/.test(service) && /visibilityChanged/.test(service)],
  ['admin UI lists and decides applications through existing capability API', /getPrivateSellerApplications/.test(adminPage) && /decidePrivateSellerApplication/.test(adminPage)],
  ['admin route is registered', /\/admin\/private-seller-applications.*AdminPrivateSellerApplications/.test(routeSurface)],
  ['admin sidebar links to application review', /\/admin\/private-seller-applications/.test(sidebar)],
  ['route is permission guarded', /\/admin\/private-seller-applications.*MANAGE_USERS/.test(permissions) && /\/admin\/private-seller-applications.*superadmin/.test(auth)],
  ['admin UI requires reasons and confirms destructive transitions', /required for reject, suspend or revoke/.test(adminPage) && /window\.confirm/.test(adminPage)],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exitCode = 1;
