import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const serviceDir = path.join(root, 'backend', 'services');
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => { const p=path.join(dir,e.name); if (['node_modules','dist','.git'].includes(e.name)) return []; return e.isDirectory() ? walk(p) : /\.(?:js|mjs|cjs)$/.test(e.name) ? [p] : []; }) : [];
const files = walk(serviceDir);
let duplicateExports = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const names = [...text.matchAll(/export\s+(?:(?:async)\s+)?(?:function|const|let|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)].map(m => m[1]);
  const seen = new Set();
  for (const name of names) if (seen.has(name)) { console.error(`FAIL duplicate service export ${path.relative(root,file)}::${name}`); duplicateExports++; } else seen.add(name);
}
if (duplicateExports) process.exit(1);
console.log('PASS: backend service export declarations are unique.');
console.log(`Scanned ${files.length} service modules.`);
console.log('Named exports are intentionally treated as public service surface; reference-count heuristics are not used as correctness gates.');
