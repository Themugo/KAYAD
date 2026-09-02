#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const read = (p) => readFileSync(p, 'utf8');
const files = [];
for (const root of ['backend','scripts']) {
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory() && !['node_modules','.git'].includes(name.name)) walk(p);
      else if (name.isFile() && /\.(js|mjs|cjs)$/.test(name.name) && !/^validate-phase\d+\.mjs$/.test(name.name)) files.push(p);
    }
  };
  walk(root);
}
const production = files.map(p => read(p)).join('\n');
const migrationText = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql') || f.endsWith('.sql.sql')).map(f => read(join('supabase/migrations',f))).join('\n');

if (/findById\(['"]auctions|find(?:All|One)\(['"]auctions|count\(['"]auctions|from\(['"]auctions/.test(production)) throw new Error('Production backend still queries auctions table');
if (/auction_id\s+[^\n]*REFERENCES\s+auctions/i.test(migrationText)) throw new Error('Migration chain still references separate auctions table');
if (/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+auctions/i.test(migrationText)) throw new Error('Migration chain creates separate auctions table');
if (/mode === ['"]mock['"]|Mock payment|B2C mock|MOCK SMS|SMS_PROVIDER=mock/.test(production)) throw new Error('Production payment/SMS mock-success path remains');
if (/db\.findById\(['"]auctions/.test(read('backend/ai/services/aiIntelligenceService.js'))) throw new Error('AI auction detector uses stale auction table');
if (!existsSync('scripts/apply-schema.js') || !/supabase db push/.test(read('scripts/apply-schema.js'))) throw new Error('Database deployment guard is missing Supabase CLI migration guidance');
if (!/supabase db push/.test(read('scripts/apply-schema.sh'))) throw new Error('Shell deployment guard is not migration-only');
console.log(`PHASE 23 PRODUCTION CONTRACT VALIDATION: PASS`);
console.log(`Backend/scripts source files scanned: ${files.length}`);
console.log('Canonical auction storage: cars + bids');
console.log('Payment/SMS mock-success paths: removed');
console.log('Database deployment: versioned Supabase migrations only');
