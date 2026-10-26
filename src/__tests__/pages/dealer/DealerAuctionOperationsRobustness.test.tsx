import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const list = vi.hoisted(() => vi.fn());
vi.mock('../../../api/api', () => ({ auctionOperationsAPI: { list, collection: vi.fn(), transfer: vi.fn(), release: vi.fn(), reaward: vi.fn() } }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import DealerAuctionOperations from '../../../pages/dealer/DealerAuctionOperations';

describe('DealerAuctionOperations list loading', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it.each([
    ['array', [{ id: 'a1', status: 'payment_due', title: 'Subaru' }]],
    ['wrapped array', { data: [{ id: 'a1', status: 'payment_due', title: 'Subaru' }] }],
    ['object without a list', { items: [] }],
    ['null', null],
  ])('renders without crashing for %s', async (_label, payload) => {
    list.mockResolvedValue(payload);
    render(<MemoryRouter><DealerAuctionOperations /></MemoryRouter>);
    expect(await screen.findByText(/A premium command centre/)).toBeTruthy();
  });
});
