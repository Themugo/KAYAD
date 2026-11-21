import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression: at <=1023px the shortcut-rail hero is a single-column stack
 * (copy, shortcuts, vehicle stage). The legacy 04B/04C compact blocks set a
 * fixed `height` on `.kk-hero__inner`; with `.kk-hero { overflow: hidden }`
 * that clipped the vehicle stage and "Illustrative" card out of view at 390px.
 * Geometry was verified in Chromium (see handover report); this guards the rule.
 */
const css = readFileSync(resolve(__dirname, '../../components/home/premium-hero.css'), 'utf8');

function block(query: string): string {
  const start = css.indexOf(query);
  expect(start, `missing ${query}`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(open, i + 1);
  }
  throw new Error('unbalanced css');
}

describe('PremiumHero single-column mobile layout', () => {
  it('lets the shortcut-rail hero grow instead of using a fixed height', () => {
    const media = block('@media (max-width: 1023.98px) {\n  .kk-hero:has(.kk-hero__shortcuts) .kk-hero__inner');
    const inner = media.slice(media.indexOf('.kk-hero__inner'));
    const rule = inner.slice(inner.indexOf('{'), inner.indexOf('}'));
    expect(rule).toMatch(/grid-template-columns:\s*1fr/);
    expect(rule).toMatch(/height:\s*auto/);
  });
  it('keeps the vehicle stage and caption in the mobile layout', () => {
    expect(css).toMatch(/max-width: 479\.98px\) \{[\s\S]*kk-hero__stage \{ height: clamp\(190px, 58vw, 235px\)/);
    expect(css).toMatch(/kk-hero__caption \{ display: flex/);
  });
});
