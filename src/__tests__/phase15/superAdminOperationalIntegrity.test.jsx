import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

let impl = async () => ({});
const list = (...a) => impl(...a);
vi.mock('../../api/api', () => ({
  adminPaymentsAPI: { list: (...a) => list(...a) },
  formatKES: (n) => `KES ${Number(n || 0).toLocaleString()}`,
}));
vi.mock('../../utils/helpers', () => ({ timeAgo: () => 'just now' }));

import AdminTransactions from '../../pages/admin/AdminTransactions';

const payment = (over) => ({ _id: 'p1', amount: 1000, type: 'purchase', status: 'success', createdAt: '2026-10-25T10:00:00Z', user: { name: 'Amina', email: 'a@x.test' }, car: { title: 'Prado' }, reconciliation: { state: 'settled', reasons: [] }, ...over });



describe('AdminTransactions honesty', () => {
  it('labels collections (not revenue) and never claims settled for a reconciliation case', async () => {
    impl = async () => ({
      payments: [
        payment({}),
        payment({ _id: 'p2', status: 'failed', reconciliation: { state: 'needs_reconciliation', reasons: ['AMOUNT_MISMATCH_PROVIDER_RECEIPT_RECORDED'] } }),
        payment({ _id: 'p3', status: 'failed', reconciliation: { state: 'evidence_unavailable', reasons: [] } }),
      ],
      summary: { totalCollected: 1000, totalTransactions: 3 },
      pagination: { total: 3 },
    });
    render(<AdminTransactions />);
    expect(await screen.findByText('Successful collections')).toBeTruthy();
    expect(screen.queryByText(/Total Revenue/i)).toBeNull();
    expect(screen.getByText(/Needs reconciliation/)).toBeTruthy();
    expect(screen.getByText(/evidence unavailable/i)).toBeTruthy();
  });

  it('shows an alert, not an empty-state, when the list fails to load', async () => {
    impl = () => Promise.reject(new Error('boom'));
    render(<AdminTransactions />);
    await waitFor(() => expect(document.body.textContent).toMatch(/could not be loaded/i));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/could not be loaded/i);
    expect(screen.queryByText('No transactions found')).toBeNull();
  });
});

describe('brand text', () => {
  it('has no "KAYAD EA" display text in app source other than the legacy normaliser', () => {
    const root = path.resolve(__dirname, '../..');
    const hits = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '__tests__' || e.name === 'node_modules') continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(e.name) && /KAYAD EA\b/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(root, p));
      }
    };
    walk(root);
    expect(hits).toEqual(['features/VehicleMarketplace/components/VehicleMarketplace.tsx']);
  });
});
