import { describe, it, expect } from 'vitest';
import { delta, fmtKes, inventorySegments, niceTicks, healthRows } from '../../../pages/dealer/dashboard/overview/overviewModel';

describe('overviewModel honesty rules', () => {
  it('delta: no data → no indicator; percentage only with a valid previous period', () => {
    expect(delta(undefined, 3)).toBeNull();
    expect(delta(5, null)).toBeNull();
    expect(delta(5, 0)?.text).toBe('+5');
    expect(delta(14, 10)?.text).toBe('+4 (40%)');
    expect(delta(3, 4)?.direction).toBe('down');
    expect(delta(2, 2)?.direction).toBe('flat');
  });
  it('delta (money): never invents a percentage without a previous figure', () => {
    expect(delta(0, 0, { money: true })).toBeNull();
    expect(delta(1000, 0, { money: true })?.text).toBe('New');
    expect(delta(150, 100, { money: true })?.text).toBe('+50%');
  });
  it('fmtKes shows — for unavailable and a real zero as 0', () => {
    expect(fmtKes(null)).toBe('—');
    expect(fmtKes(0)).toBe('KES 0');
  });
  it('inventorySegments: counts, whole-number percentages, zero segments dropped', () => {
    const r = inventorySegments({ total: 10, active: 6, pendingApproval: 2, sold: 2, draft: 0, hidden: 0, reserved: 0 } as any);
    expect(r.total).toBe(10);
    expect(r.segments.map((s) => [s.key, s.count, s.percent])).toEqual([['published', 6, 60], ['pending', 2, 20], ['sold', 2, 20]]);
    expect(inventorySegments(undefined)).toEqual({ total: 0, segments: [] });
  });
  it('niceTicks covers the maximum with even steps', () => {
    const t = niceTicks(7, 5);
    expect(t.max).toBeGreaterThanOrEqual(7);
    expect(t.ticks[0]).toBe(0);
    expect(niceTicks(0).ticks.length).toBeGreaterThan(1);
  });
  it('healthRows: lead response is unavailable, compliance follows real verification, nothing is hardcoded', () => {
    const rows = healthRows(undefined, 'unknown');
    expect(rows.find((r) => r.id === 'lead-response')?.display).toBe('—');
    expect(rows.find((r) => r.id === 'inventory-quality')?.percent).toBeNull();
    expect(rows.find((r) => r.id === 'account-compliance')?.display).toBe('—');
    expect(healthRows(undefined, 'approved').find((r) => r.id === 'account-compliance')?.percent).toBe(100);
    expect(healthRows(undefined, 'review').find((r) => r.id === 'account-compliance')?.display).toBe('In review');
    const real = healthRows({ published: 4, inventoryQuality: { percent: 75, of: 4 }, listingPerformance: { percent: 50, of: 4 }, leadResponse: { percent: null, unavailableReason: 'x' } } as any, 'approved');
    expect(real.find((r) => r.id === 'inventory-quality')?.display).toBe('75%');
    expect(real.find((r) => r.id === 'listing-performance')?.display).toBe('50%');
  });
});
