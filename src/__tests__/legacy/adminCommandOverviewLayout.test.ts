import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression guard: the business-flow block is a direct child of the two-column overview grid. Without a full-width
// span it took column 1 and pushed the main panels into the 238px rail column (a ~10,000px squeezed column).
describe('Admin command centre overview grid', () => {
  const css = readFileSync(resolve(__dirname, '../../features/admin-command-centre.css'), 'utf8');
  it('spans the business-flow block across both overview columns', () => {
    expect(css).toMatch(/\.kayad-command-overview>\.kayad-command-business-flow\s*\{\s*grid-column\s*:\s*1\s*\/\s*-1\s*\}/);
  });
});
