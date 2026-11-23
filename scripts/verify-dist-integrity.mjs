// Deployment artifact integrity: the build that would be published must be self-consistent. Exit 1 on any failure.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const dist = path.resolve(process.argv[2] || 'dist'); const fail = []; const ok = (m) => console.log('PASS', m);
const read = (p) => fs.readFileSync(path.join(dist, p), 'utf8');
const html = read('index.html');
const rel = JSON.parse(read('release.json'));
if (!rel.releaseId) fail.push('release.json has no releaseId'); else ok(`release.json releaseId=${rel.releaseId} commit=${rel.commit}`);
const meta = html.match(/<meta name="kayad-release" content="([^"]+)"/)?.[1];
if (meta !== rel.releaseId) fail.push(`index.html meta (${meta}) != release.json (${rel.releaseId})`); else ok('index.html meta matches release.json');
const sw = read('sw.js');
if (sw.includes('__KAYAD_RELEASE_ID__')) fail.push('sw.js contains an unresolved release placeholder'); else ok('sw.js is release-independent (no reinstall churn per deploy)');
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
if (!refs.length) fail.push('index.html references no /assets files');
for (const r of refs) if (!fs.existsSync(path.join(dist, r))) fail.push(`missing referenced asset ${r}`);
ok(`${refs.length} assets referenced by index.html all exist`);
for (const e of rel.entryAssets || []) if (!fs.existsSync(path.join(dist, e))) fail.push(`missing entry asset ${e}`);
// every static import inside the entry chunks must exist too
const seen = new Set(); const walk = (f) => { if (seen.has(f) || !f.endsWith('.js')) return; seen.add(f); const t = fs.readFileSync(path.join(dist, f), 'utf8'); for (const m of t.matchAll(/["'`]\.\/([A-Za-z0-9_.-]+\.(?:js|css))["'`]/g)) { const n = 'assets/' + m[1]; if (!fs.existsSync(path.join(dist, n))) fail.push(`chunk ${f} imports missing ${n}`); else walk(n); } };
for (const e of rel.entryAssets || []) walk(e);
ok(`${seen.size} chunks walked for missing imports`);
const bad = [...seen].filter((f) => !/-[A-Za-z0-9_-]{6,}\.js$/.test(path.basename(f)) && !/^assets\/index/.test(f));
if (bad.length) fail.push(`unhashed chunk names: ${bad.slice(0, 3)}`); else ok('chunk filenames carry content hashes');
const sum = crypto.createHash('sha256').update(html).digest('hex'); console.log('index.html sha256', sum);
if (fail.length) { console.error('FAIL\n- ' + fail.join('\n- ')); process.exit(1); } console.log('dist integrity OK');
