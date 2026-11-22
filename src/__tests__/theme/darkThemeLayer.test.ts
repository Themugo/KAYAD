import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(__dirname, '../../..');
describe('dark theme layer', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/dark-theme.generated.css'), 'utf8');
  it('is inert unless html[data-dark-ready="true"] (no half-dark on uncovered pages)', () => {
    const rules = css.split('\n').filter((l) => l.startsWith(':root'));
    expect(rules.length).toBeGreaterThan(300);
    expect(rules.every((l) => l.startsWith(":root[data-theme='dark'][data-dark-ready='true']"))).toBe(true);
  });
  it('is up to date with the colour classes in src (regenerate with node scripts/generate-dark-theme.mjs)', () => {
    const before = css; execFileSync('node', [path.join(root, 'scripts/generate-dark-theme.mjs')], { cwd: root });
    const after = fs.readFileSync(path.join(root, 'src/styles/dark-theme.generated.css'), 'utf8');
    expect(after).toBe(before);
  });
});
