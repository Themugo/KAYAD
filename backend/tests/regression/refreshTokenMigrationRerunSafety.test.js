import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 20260930110000 drops the legacy plaintext refresh_tokens.token column. Its hash backfill therefore must not reference
// `token` in a plain statement: on a second execution the column no longer exists and the whole file would abort
// ("column token does not exist"). Proven on PostgreSQL 16 (scripts/rehearse-onboarding-migrations-local.sh applies every
// onboarding migration twice). This static test keeps the guard from being regressed; it does not replace the rehearsal.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260930110000_advanced_identity_session_hardening.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('20260930110000 rerun safety', () => {
  test('the plaintext-token backfill is guarded by a column-existence check and run via EXECUTE', () => {
    expect(code).toMatch(/information_schema\.columns[\s\S]*column_name\s*=\s*'token'/);
    expect(code).toMatch(/EXECUTE\s+'UPDATE public\.refresh_tokens SET token_hash\s*=\s*encode\(digest\(token/);
  });
  test('no unguarded top-level statement reads the legacy token column', () => {
    const outsideDo = code.replace(/DO \$backfill\$[\s\S]*?\$backfill\$;/, '');
    expect(outsideDo).not.toMatch(/digest\(\s*token\s*,/);
    expect(outsideDo).not.toMatch(/\bWHERE\b[^;]*\btoken IS NOT NULL/);
  });
  test('still drops the plaintext column and requires token_hash', () => {
    expect(code).toMatch(/DROP COLUMN IF EXISTS token;/);
    expect(code).toMatch(/ALTER COLUMN token_hash SET NOT NULL/);
  });
});
