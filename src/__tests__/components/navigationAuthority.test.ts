import { describe, it, expect } from 'vitest';
import { NAV_PRIMARY, applyNavigationConfig, visibleChildren } from '../../components/navigation/navConfig';

const ids = (l: { id: string }[]) => l.map((x) => x.id);
const CANON = ids(NAV_PRIMARY);

describe('applyNavigationConfig — safe fallback (Stage 14A)', () => {
  it.each([
    ['undefined (config unavailable)', undefined],
    ['null (API failed)', null],
    ['string', 'nope'],
    ['number', 7],
    ['array', []],
    ['empty object (untouched row)', {}],
    ['items not array', { items: 'x' }],
    ['empty items', { items: [] }],
    ['only unknown ids', { items: [{ id: 'evil' }, { id: 5 }, null] }],
    ['items with junk entries', { items: [null, 3, 'x', {}] }],
  ])('%s => canonical navigation', (_n, raw) => {
    expect(applyNavigationConfig(raw)).toBe(NAV_PRIMARY);
  });

  it('never throws on hostile structures', () => {
    const cyc: any = { items: [] }; cyc.items.push(cyc);
    expect(() => applyNavigationConfig(cyc)).not.toThrow();
    expect(applyNavigationConfig({ get items() { throw new Error('x'); } })).toBe(NAV_PRIMARY);
  });
});

describe('applyNavigationConfig — controlled state', () => {
  it('hides a primary item', () => {
    expect(ids(applyNavigationConfig({ items: [{ id: 'auction', visible: false }] }))).toEqual(CANON.filter((i) => i !== 'auction'));
  });
  it('marketplace and support can never be hidden', () => {
    const out = applyNavigationConfig({ items: [{ id: 'marketplace', visible: false }, { id: 'support', visible: false }] });
    expect(ids(out)).toEqual(expect.arrayContaining(['marketplace', 'support']));
  });
  it('reorders primaries; unlisted ones follow in canonical order (partial config loses nothing)', () => {
    const out = applyNavigationConfig({ items: [{ id: 'escrow' }, { id: 'auction' }] });
    expect(ids(out)).toEqual(['escrow', 'auction', 'marketplace', 'inspection', 'support']);
  });
  it('dropdown:false turns a group into a direct link to the same destination', () => {
    const out = applyNavigationConfig({ items: [{ id: 'escrow', dropdown: false }] });
    const escrow = out.find((i) => i.id === 'escrow')!;
    const canon = NAV_PRIMARY.find((i) => i.id === 'escrow')!;
    expect(escrow.children).toBeUndefined();
    expect(escrow.navId).toBe(canon.navId);
    expect(escrow.href).toBe(canon.href);
  });
  it('hides and reorders children; all children hidden => direct link', () => {
    const out = applyNavigationConfig({ items: [{ id: 'auction', children: [{ id: 'ended' }, { id: 'live', visible: false }] }] });
    expect(ids(out.find((i) => i.id === 'auction')!.children!)).toEqual(['ended', 'scheduled', 'saved']);
    const none = applyNavigationConfig({ items: [{ id: 'inspection', children: [{ id: 'request', visible: false }, { id: 'providers', visible: false }] }] });
    expect(none.find((i) => i.id === 'inspection')!.children).toBeUndefined();
  });
  it('ignores unknown children and children of other parents', () => {
    const out = applyNavigationConfig({ items: [{ id: 'marketplace', children: [{ id: 'live', visible: false }, { id: 'zzz' }] }] });
    expect(ids(out.find((i) => i.id === 'marketplace')!.children!)).toEqual(['browse', 'saved', 'financing']);
  });
  it('cannot change labels, hrefs, icons or add destinations', () => {
    const out = applyNavigationConfig({ items: [{ id: 'auction', label: 'HACK', href: 'javascript:1', icon: 'x', children: [{ id: 'live', label: 'HACK', href: 'javascript:1' }] }, { id: 'brand-new', label: 'X', href: '/x' }] });
    const auction = out.find((i) => i.id === 'auction')!;
    const canon = NAV_PRIMARY.find((i) => i.id === 'auction')!;
    expect(auction.label).toBe(canon.label);
    expect(auction.href).toBe(canon.href);
    expect(auction.children![0].href).toBe(canon.children![0].href);
    expect(ids(out)).not.toContain('brand-new');
  });
  it('requiresAuth is still enforced for display regardless of config', () => {
    const out = applyNavigationConfig({ items: [{ id: 'auction', children: [{ id: 'saved', visible: true }] }] });
    const auction = out.find((i) => i.id === 'auction')!;
    expect(ids(visibleChildren(auction, false))).not.toContain('saved');
    expect(ids(visibleChildren(auction, true))).toContain('saved');
  });
  it('does not mutate the canonical NAV_PRIMARY', () => {
    const before = JSON.stringify(NAV_PRIMARY.map((n) => [n.id, (n.children || []).map((c) => c.id)]));
    applyNavigationConfig({ items: [{ id: 'auction', visible: false }, { id: 'escrow', dropdown: false }] });
    expect(JSON.stringify(NAV_PRIMARY.map((n) => [n.id, (n.children || []).map((c) => c.id)]))).toBe(before);
  });
});
