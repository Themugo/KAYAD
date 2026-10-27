import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Phase 16C: the owner ledger tables stack as labelled rows at <=640px (390px phones). jsdom has no layout engine, so this
// guards the markup/CSS contract; the rendered result is verified in the real-stack browser check (browser_16c_real_stack.cjs).
const root = path.resolve(__dirname, '../../..');
const jsx = fs.readFileSync(path.join(root, 'src/pages/admin/AdminOwnerManagement.jsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/index.css'), 'utf8');

describe('owner management responsive tables', () => {
  it('every table opts into the stacked layout and every data cell carries a label', () => {
    const tables = jsx.match(/<table /g) || [];
    expect(tables.length).toBe(3);
    expect((jsx.match(/className="owner-tbl"/g) || []).length).toBe(3);
    for (const label of ['Owner', 'State', 'Added', 'By', 'Address', 'Status', 'Expires', 'Sent', 'Invited by', 'When', 'Action', 'Result', 'Target', 'Reason', 'Actions']) {
      expect(jsx).toContain(`data-label="${label}"`);
    }
  });
  it('keeps table semantics with explicit ARIA roles when the layout is not display:table', () => {
    expect(jsx).toContain('<tr role="row"');
    expect(jsx).toContain('<td role="cell"');
    expect(jsx).toContain('<th role="columnheader"');
  });
  it('has a narrow-screen rule that stacks cells and keeps the header available to assistive technology', () => {
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*\.owner-tbl td::before \{ content: attr\(data-label\)/);
    expect(css).toMatch(/\.owner-tbl thead \{ position: absolute;[^}]*clip: rect/);
  });
});

describe('owner action form keyboard behaviour (Phase 16C)', () => {
  it('moves focus into the form on open and cancels on Escape', () => {
    expect(jsx).toContain("querySelector('input:not([type=hidden]), select, textarea')?.focus()");
    expect(jsx).toContain("e.key === 'Escape' && !busy");
  });
});
