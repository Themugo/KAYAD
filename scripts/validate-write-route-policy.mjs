// Guard: every write route either has authentication middleware (resolved through router.use() and server mounts) or is on the
// reviewed allowlist. New unauthenticated write routes fail here until someone inspects them. Static map, not proof (see audit doc).
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir = mkdtempSync(join(tmpdir(), 'wrm-')); const out = join(dir, 'm.csv');
execFileSync('python3', ['scripts/write-route-matrix.py', out], { stdio: ['ignore', 'pipe', 'inherit'] });
const [head, ...lines] = readFileSync(out, 'utf8').trim().split('\n'); const cols = head.split(',');
const rows = lines.map((l) => { const c = l.split(','); return Object.fromEntries(cols.map((k, i) => [k, c[i]])); });
const allow = new Set(JSON.parse(readFileSync('scripts/write-route-public-allowlist.json', 'utf8')).routes);
const open = rows.filter((r) => r.auth === 'NONE').map((r) => `${r.file} ${r.method} ${r.path}`);
const fresh = open.filter((k) => !allow.has(k)), stale = [...allow].filter((k) => !open.includes(k));
let bad = 0;
if (fresh.length) { bad++; console.error(`FAIL: ${fresh.length} write route(s) without authentication and not reviewed:\n  ${fresh.join('\n  ')}`); }
if (stale.length) console.warn(`note: ${stale.length} allowlist entr(ies) no longer needed:\n  ${stale.join('\n  ')}`);
if (rows.length < 600) { bad++; console.error(`FAIL: analyzer found only ${rows.length} write routes (expected >= 600): parser regression`); }
console.log(`write-route policy: ${rows.length} write routes, ${open.length} unauthenticated (all reviewed: ${fresh.length === 0})`);
process.exit(bad ? 1 : 0);
