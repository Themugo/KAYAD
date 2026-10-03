import fs from 'node:fs';

const checks = [
  ['render counter is dev-only', 'src/hooks/useOptimizedCallback.ts', 'import.meta.env.DEV'],
  ['lazy image shell uses light surface', 'src/components/LazyImage.tsx', "background: '#edf6f4'"],
  ['feature lazy image shell uses light surface', 'src/components/features/common/LazyImage.tsx', "background: '#edf6f4'"],
  ['service worker has no console logging', 'public/sw.js', 'console.'],
];

let failed = 0;
for (const [name, file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = name.includes('no console') ? !text.includes(needle) : text.includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`Polish regressions: ${checks.length}/${checks.length} PASS`);
