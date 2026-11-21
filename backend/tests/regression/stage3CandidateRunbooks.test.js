import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Static guards for the Stage 3 SQL candidates (never executed against production/staging by this repo's tests).
// Behavioural proof: scripts/rehearse-stage3-lead-privileges-local.sh (PostgreSQL 17.6 and 16.15, L1–L4, P1–P5).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const LEADS_V2 = 'runbooks/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql';
const SEARCH_PATH = 'runbooks/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql';
const INSPECTOR = 'runbooks/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql';
const ORIGINAL = 'supabase/migrations/20260907200100_lead_crm_domain_end_to_end.sql';
const KEY_COLUMNS = ['buyer', 'dealer', 'vehicle', 'source', 'source_reference'];

describe('Stage 3 candidates are labelled and kept out of the migration chain', () => {
  test.each([LEADS_V2, SEARCH_PATH, INSPECTOR])('%s carries the authorization label, lives in runbooks/, is transactional', (f) => {
    const raw = rd(f);
    expect(raw).toMatch(/NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION/);
    for (const k of ['Purpose', 'Preconditions', 'Idempotency', 'Transaction', 'Rollback']) expect(raw).toMatch(new RegExp(k));
    const sql = strip(raw);
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
    expect(fs.existsSync(path.join(root, 'supabase/migrations', path.basename(f)))).toBe(false);
  });
  test('no Stage 3 candidate deletes, truncates, drops or grants to client roles', () => {
    for (const f of [LEADS_V2, SEARCH_PATH, INSPECTOR]) {
      const sql = strip(rd(f));
      expect(sql).not.toMatch(/\b(DELETE\s+FROM|TRUNCATE|DROP\s+(TABLE|INDEX|FUNCTION|POLICY)|ALTER\s+DEFAULT\s+PRIVILEGES)\b/i);
      expect(sql).not.toMatch(/GRANT[^;]*\bTO\b[^;]*\b(anon|authenticated|PUBLIC)\b/i);
    }
  });
});

describe('LEADS_V2: find-before-insert on the business key the original function already defines', () => {
  const v2 = strip(rd(LEADS_V2));
  const orig = rd(ORIGINAL);
  test('keeps the exact signature, return type and invoker rights of the original', () => {
    expect(v2).toMatch(/CREATE OR REPLACE FUNCTION public\.kayad_create_lead_atomic\(\s*p_buyer UUID,\s*p_dealer UUID,\s*p_vehicle UUID,\s*p_source TEXT,\s*p_source_reference TEXT,\s*p_estimated_value NUMERIC DEFAULT 0\s*\) RETURNS JSONB/);
    expect(v2).toMatch(/SECURITY INVOKER/);
    expect(v2).not.toMatch(/SECURITY DEFINER/);
  });
  test('uses the same business key as the original (no invented key) under the same advisory lock', () => {
    const origKey = orig.match(/v_key TEXT := (concat_ws\([^;]+\));/)[1];
    expect(v2).toContain(`v_key TEXT := ${origKey};`);
    expect(v2).toMatch(/pg_advisory_xact_lock\(hashtextextended\(v_key, 0\)\)/);
    for (const c of KEY_COLUMNS) expect(v2).toMatch(new RegExp(`COALESCE\\(${c}, (v_nil|'')\\) = COALESCE\\(p_${c}, (v_nil|'')\\)`));
  });
  test('looks the key up BEFORE inserting, and only reports created=true from the INSERT branch', () => {
    const body = v2.slice(v2.indexOf('BEGIN\n  PERFORM'));
    const lock = body.indexOf('pg_advisory_xact_lock');
    const lookup = body.indexOf('SELECT * INTO v_lead FROM public.leads');
    const insert = body.indexOf('INSERT INTO public.leads');
    expect(lock).toBeGreaterThan(-1);
    expect(lock).toBeLessThan(lookup);
    expect(lookup).toBeLessThan(insert);
    expect(body.slice(lookup, insert)).toMatch(/'created', false/);
    expect(body.slice(insert)).toMatch(/'created', true/);
  });
  test('fails loudly on missing preconditions and never writes data', () => {
    expect(v2).toMatch(/RAISE EXCEPTION 'LEADS_V2 precondition/);
    expect(v2.slice(0, v2.indexOf('CREATE OR REPLACE'))).not.toMatch(/INSERT|UPDATE /);
  });
  test('the Stage 2 unique-index candidate is preserved, not replaced', () => {
    expect(fs.existsSync(path.join(root, 'runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql'))).toBe(true);
  });
});

describe('STAGE3 search_path candidate', () => {
  const sql = strip(rd(SEARCH_PATH));
  test('only ALTERs the two SECURITY DEFINER onboarding RPCs to search_path = public, pg_temp', () => {
    expect(sql).toMatch(/kayad_rotate_refresh_token\(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid\)/);
    expect(sql).toMatch(/kayad_register_identity_atomic\(text,text,text,text,text,text,uuid,text,text,timestamptz\)/);
    expect(sql).toMatch(/ALTER FUNCTION %s SET search_path = public, pg_temp/);
    expect(sql).toMatch(/is not SECURITY DEFINER/);
    expect(sql).not.toMatch(/CREATE OR REPLACE/);
  });
});

describe('db push is fail-closed while migration drift is unresolved', () => {
  test('scripts/apply-schema.sh refuses supabase db push without the explicit acknowledgement', () => {
    const sh = rd('scripts/apply-schema.sh');
    const guard = sh.indexOf('KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED:-}" != "reconciled-and-authorized"');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(sh.lastIndexOf('supabase db push'));
    expect(sh.slice(guard, sh.lastIndexOf('supabase db push'))).toMatch(/exit 3/);
  });
  test('scripts/bootstrap-supabase-production.mjs keeps --dry-run available but guards --apply', () => {
    const js = rd('scripts/bootstrap-supabase-production.mjs');
    const guard = js.indexOf("process.env.KAYAD_MIGRATION_DRIFT_ACKNOWLEDGED !== 'reconciled-and-authorized'");
    expect(guard).toBeGreaterThan(js.indexOf("'push', '--dry-run'"));
    expect(guard).toBeLessThan(js.lastIndexOf("run('supabase', ['db', 'push'])"));
  });
});

describe('INSPECTOR_V1 candidate', () => {
  const sql = strip(rd(INSPECTOR));
  test('only widens years_of_experience to numeric(5,2) and adds the 0..80 CHECK; fails loudly on out-of-range rows', () => {
    expect(sql).toMatch(/ALTER COLUMN years_of_experience TYPE numeric\(5,2\)/);
    expect(sql).toMatch(/years_of_experience >= 0 AND years_of_experience <= 80/);
    expect(sql).toMatch(/outside 0\.\.80/);
    expect(sql).not.toMatch(/ALTER COLUMN (specialties|certifications|preferred_regions|status)/i);
    expect(sql).not.toMatch(/\bUPDATE\s+public\.inspector_applications\b/i);
  });
  test('matches the API contract bound', () => {
    expect(rd('backend/validation/inspectorApplication.schema.js')).toMatch(/yearsOfExperience: z\.coerce\.number\(\)\.finite\(\)\.min\(0\)\.max\(80\)/);
  });
});
