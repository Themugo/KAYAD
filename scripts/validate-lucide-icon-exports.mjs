#!/usr/bin/env node
// Guard for the 2026-10-21 production build break: rolldown treats a named import that the installed
// lucide-react does not export as a hard MISSING_EXPORT error, which stopped every Vercel deploy.
// This walks the real module graph from src/main.tsx (static imports, re-exports and lazy import()),
// and checks every named lucide-react import against the package's actual runtime exports.
// Type-only names (LucideIcon, LucideProps) are erased at build time and are allowed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const entry = path.join(root, 'src', 'main.tsx');
const lucideEntry = path.join(root, 'node_modules', 'lucide-react', 'dist', 'esm', 'lucide-react.mjs');
if (!fs.existsSync(lucideEntry)) {
  console.error('FAIL - lucide-react is not installed; run npm ci before this validator.');
  process.exit(1);
}
const lucide = await import(pathToFileURL(lucideEntry).href);
const exported = new Set(Object.keys(lucide));
const TYPE_ONLY = new Set(['LucideIcon', 'LucideProps', 'IconNode']);

const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
const resolveLocal = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
};

const specifierPatterns = [
  /\b(?:import|export)\s+(?:type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
];
const lucideImport = /\bimport\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

const visited = new Set();
const queue = [entry];
const failures = [];
let lucideFiles = 0;
while (queue.length) {
  const file = queue.pop();
  if (visited.has(file) || !/\.(tsx?|jsx?|mjs)$/.test(file)) continue;
  visited.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of specifierPatterns) {
    pattern.lastIndex = 0;
    for (let match; (match = pattern.exec(source));) {
      const next = resolveLocal(file, match[1]);
      if (next && !visited.has(next)) queue.push(next);
    }
  }
  lucideImport.lastIndex = 0;
  let sawLucide = false;
  for (let match; (match = lucideImport.exec(source));) {
    sawLucide = true;
    if (match[1]) continue; // `import type { ... }` is erased
    for (const raw of match[2].split(',')) {
      const spec = raw.trim();
      if (!spec || spec.startsWith('type ')) continue;
      const name = spec.split(/\s+as\s+/)[0].trim();
      if (TYPE_ONLY.has(name) || exported.has(name)) continue;
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${path.relative(root, file)}:${line} imports "${name}", which lucide-react does not export`);
    }
  }
  if (sawLucide) lucideFiles += 1;
}

if (visited.size < 50) {
  console.error(`FAIL - module graph walk reached only ${visited.size} files from src/main.tsx; the walker is broken.`);
  process.exit(1);
}
for (const failure of failures) console.log(`FAIL - ${failure}`);
console.log(`${failures.length === 0 ? 'PASS' : 'FAIL'} - lucide-react named imports exist in the installed package (${lucideFiles} importing modules across ${visited.size} reachable files)`);
process.exit(failures.length === 0 ? 0 : 1);
