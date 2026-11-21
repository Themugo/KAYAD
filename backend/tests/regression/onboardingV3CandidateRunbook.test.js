import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static guard for the V3 CANDIDATE onboarding runbook (never executed against production/staging by this repo's tests).
// Behavioural proof lives in scripts/rehearse-stage2-extended-local.sh (PostgreSQL 16.15 and 17.6, scenarios S2b/S2c/S5).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const ORDER = ['20260930111500', '20260930113000', '20260930112000', '20261001090000', '20261001220000', '20260930110000', '20261011090000', '20261011121000'];

describe('ONBOARDING V3 candidate runbook', () => {
  const apply = strip(rd('runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql'));
  const includes = [...apply.matchAll(/\\i (\S+)/g)].map((m) => m[1]);

  test('applies the eight chain migrations in the proven order, then step 9', () => {
    const versions = includes.filter((i) => i.startsWith('supabase/migrations/')).map((i) => path.basename(i).slice(0, 14));
    expect(versions).toEqual(ORDER);
    expect(includes[includes.length - 1]).toBe('runbooks/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql');
  });
  test('every included file exists and the chain runs inside a single transaction', () => {
    for (const i of includes) expect(fs.existsSync(path.join(root, i))).toBe(true);
    expect(apply).toMatch(/^begin;/m);
    expect(apply).toMatch(/^commit;/m);
    expect(apply.indexOf('begin;')).toBeLessThan(apply.indexOf('\\i '));
    expect(apply.lastIndexOf('\\i ')).toBeLessThan(apply.indexOf('commit;'));
  });
  test('no chain migration contains its own transaction control or CONCURRENTLY (would break the single-transaction apply)', () => {
    for (const i of includes.filter((x) => x.startsWith('supabase/migrations/'))) {
      const s = strip(rd(i));
      expect(s).not.toMatch(/^\s*(begin|commit|rollback)\s*;/im);
      expect(s).not.toMatch(/CONCURRENTLY/i);
    }
  });
  test('step 9 revokes client roles explicitly, re-grants only service_role, and fails loudly if a function is missing', () => {
    const s = strip(rd('runbooks/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql'));
    expect(s).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
    expect(s).toMatch(/kayad_rotate_refresh_token/);
    expect(s).toMatch(/kayad_register_identity_atomic/);
    expect(s).toMatch(/RAISE EXCEPTION/);
    expect(s).not.toMatch(/GRANT EXECUTE[^;]*TO (anon|authenticated|PUBLIC)/i);
    expect(s).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i);
  });
  test('V3 post-verify is read-only and checks explicit client revokes', () => {
    const raw = strip(rd('runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql'));
    const s = raw.replace(/'[^']*'/g, "''"); // ignore words inside string literals (privilege names)
    expect(s).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT|REVOKE|TRUNCATE)\b/i);
    expect(raw).toMatch(/rotate RPC: authenticated CANNOT execute/);
    expect(raw).toMatch(/aclexplode/);
  });
  test('the V2 runbook files are kept (never overwritten by the candidate)', () => {
    for (const f of ['1_PREFLIGHT_READONLY', '2_APPLY_ORDER_NEEDS_AUTHORIZATION', '3_POSTVERIFY_READONLY', '4_ROLLBACK_LIMITS']) {
      expect(fs.existsSync(path.join(root, `runbooks/ONBOARDING_V2_${f}.sql`))).toBe(true);
    }
  });

  test('lead idempotency candidate is a single additive unique index over the exact business key the RPC searches on', () => {
    const c = strip(rd('runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql'));
    expect(c).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_business_identity ON public\.leads/);
    for (const col of ['buyer', 'dealer', 'vehicle', 'source', 'source_reference']) expect(c).toMatch(new RegExp(`COALESCE\\(\\s*${col}\\b`));
    expect(c).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER)\b/i);
    const fn = rd('supabase/migrations/20260907200100_lead_crm_domain_end_to_end.sql');
    expect(fn).toMatch(/ON CONFLICT DO NOTHING/); // the RPC relies on a unique index that no repository migration creates
    const unique = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => /UNIQUE INDEX[^;]*\bleads\b/i.test(rd(`supabase/migrations/${f}`)));
    expect(unique).toEqual([]);
  });
});
