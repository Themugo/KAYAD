#!/usr/bin/env node
/* global process, console */
// Repository naming / path governance check.
//
// Usage: node scripts/validate-repository-naming-and-paths.mjs [--base <dir-of-previous-release>] [--manifest <file>]
//
// Whole-tree checks (always):  Windows-safe names, path length, no phase-numbered application source directories.
// Change-scoped checks (when --base is given): added files must not use temporary/ambiguous names, must not duplicate an
// existing implementation, and every relative import in added/modified source must resolve. Pre-existing names are never
// failures merely because they do not match a newly preferred convention.
// Optional --manifest: the manifest must list exactly the files present on disk (sha256sum format).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const root = process.cwd();
const base = opt('--base') ? path.resolve(opt('--base')) : null;
const manifest = opt('--manifest');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);
function walk(dir, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) { out.push({ rel: r, symlink: true }); continue; }
    if (entry.isDirectory()) { out.push({ rel: r, dir: true }); out.push(...walk(path.join(dir, entry.name), r)); }
    else out.push({ rel: r });
  }
  return out;
}
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

const entries = walk(root);
const files = entries.filter((e) => !e.dir && !e.symlink).map((e) => e.rel);
const dirs = entries.filter((e) => e.dir).map((e) => e.rel);

// 1. Windows-safe names and path length
const illegal = entries.filter((e) => /[:*?"<>|\\]/.test(e.rel) || /[ .]$/.test(e.rel.split('/').pop()) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(e.rel.split('/').pop()));
check('no Windows-illegal or reserved file/folder names', illegal.length === 0, illegal.slice(0, 5).map((e) => e.rel).join(', '));
const long = files.filter((f) => f.length > 200);
check('no path longer than 200 characters', long.length === 0, long.slice(0, 3).join(', '));
check('no symlinks in the tree', !entries.some((e) => e.symlink), entries.filter((e) => e.symlink).map((e) => e.rel).join(', '));
const lower = new Map();
for (const f of files) { const k = f.toLowerCase(); lower.set(k, (lower.get(k) || 0) + 1); }
check('no case-insensitive duplicate paths', [...lower.values()].every((n) => n === 1));

// 2. No phase-numbered application source directories
const APP_ROOTS = ['src', 'backend'];
const phaseDirs = dirs.filter((d) => APP_ROOTS.includes(d.split('/')[0]) && !/(^|\/)(tests?|__tests__|node_modules)(\/|$)/.test(d) && d.split('/').some((seg) => /^(phase[-_.]?\d|latest$|final$|new$)/i.test(seg)));
check('no phase-numbered / temporary application source directories', phaseDirs.length === 0, phaseDirs.join(', '));

// 3. Change-scoped checks
if (base) {
  const baseEntries = walk(base).filter((e) => !e.dir && !e.symlink).map((e) => e.rel);
  const baseSet = new Set(baseEntries);
  const added = files.filter((f) => !baseSet.has(f));
  const removed = baseEntries.filter((f) => !new Set(files).has(f));
  const modified = files.filter((f) => baseSet.has(f) && sha(path.join(root, f)) !== sha(path.join(base, f)));
  function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
  const isSource = (f) => /^(src|backend)\//.test(f) && /\.(tsx?|jsx?|mjs|cjs)$/.test(f) && !/node_modules/.test(f);
  const addedSource = added.filter(isSource);
  const BAD = /(^|[-_.])(final\d*|latest|new[-_]?fixed|copy|backup|test[-_]final|temp|tmp|old|v\d+[-_]?new)([-_.]|$)|(New|Final)\.(tsx?|jsx?)$/i;
  const badNames = added.filter((f) => !/^(evidence|validation-logs|runbooks|docs)\//.test(f)).filter((f) => BAD.test(path.basename(f)));
  check('added files avoid temporary/ambiguous names', badNames.length === 0, badNames.join(', '));
  const stem = (f) => path.basename(f).replace(/\.(test|spec)?\.?(tsx?|jsx?|mjs|cjs)$/, '').replace(/(New|Final|Copy|V2)$/i, '').toLowerCase();
  const existingStems = new Map();
  for (const f of files.filter(isSource)) { const k = stem(f); (existingStems.get(k) || existingStems.set(k, []).get(k)).push(f); }
  const dupes = addedSource.filter((f) => !/\.(test|spec)\./.test(f) && !/(^|\/)(tests?|__tests__)\//.test(f)).filter((f) => (existingStems.get(stem(f)) || []).length > 1);
  check('added source files do not duplicate an existing implementation', dupes.length === 0, dupes.join(', '));
  const unresolved = [];
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
  for (const f of [...addedSource, ...modified.filter(isSource)]) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(path.join(root, f)), m[1].split('?')[0]);
      if (!exts.some((e) => fs.existsSync(target + e) && fs.statSync(target + e).isFile())) unresolved.push(`${f} -> ${m[1]}`);
    }
  }
  check('every relative import in added/modified source resolves', unresolved.length === 0, unresolved.slice(0, 5).join('; '));
  results.push({ name: 'change inventory', ok: true, detail: `added=${added.length} modified=${modified.length} removed=${removed.length}` });
  if (process.env.NAMING_REPORT_JSON) fs.writeFileSync(process.env.NAMING_REPORT_JSON, JSON.stringify({ added, modified, removed }, null, 2));
}

// 4. Manifest accuracy
if (manifest) {
  const listed = fs.readFileSync(manifest, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/^[0-9a-f]{64}\s+\*?(?:\.\/)?/, ''));
  const manifestName = path.basename(manifest);
  const onDisk = new Set(files.filter((f) => f !== manifestName));
  const missing = listed.filter((f) => !onDisk.has(f));
  const unlisted = [...onDisk].filter((f) => !new Set(listed).has(f));
  check('manifest lists exactly the files on disk', missing.length === 0 && unlisted.length === 0, `missing=${missing.length} unlisted=${unlisted.length}`);
}

let failed = 0;
for (const r of results) { if (!r.ok) failed += 1; console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`); }
console.log(`RESULT ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
