import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// One canonical EscrowTimeline (features/escrow). The duplicate at components/EscrowTimeline.tsx was byte-identical apart from an import path
// and had no importer anywhere in src, scripts or backend; it was removed (docs/handover/FINAL-PLATFORM-COMPLETION-202611/04).
const SRC = path.resolve(__dirname, '../..');
const all = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) all(p, out); else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
};
describe('single EscrowTimeline implementation', () => {
  it('exactly one EscrowTimeline component file exists', () => {
    expect(all(SRC).filter((f) => path.basename(f).startsWith('EscrowTimeline.') && !f.includes('__tests__')).map((f) => path.relative(SRC, f))).toEqual(['components/features/escrow/EscrowTimeline.tsx']);
  });
  it('every EscrowTimeline import resolves to a file that exists', () => {
    for (const f of all(SRC).filter((x) => !x.includes('__tests__'))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/from\s+['"](\.[^'"]*EscrowTimeline)['"]/g)) {
        const target = path.resolve(path.dirname(f), m[1]);
        expect(['.tsx', '.ts', '.jsx', '.js'].some((x) => fs.existsSync(target + x)), `${path.relative(SRC, f)} -> ${m[1]}`).toBe(true);
      }
    }
  });
});
