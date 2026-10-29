import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminMarketData from '../../../pages/admin/AdminMarketData';
import { adminAPI } from '../../../api/api';

vi.mock('../../../api/api', () => ({
  adminAPI: {
    marketData: vi.fn(), createMarketData: vi.fn(), updateMarketData: vi.fn(),
    deleteMarketData: vi.fn(), bulkMarketData: vi.fn(),
  },
  formatKES: (value) => `KES ${value}`,
}));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe('AdminMarketData', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows a retryable error instead of a false empty state when loading fails', async () => {
    adminAPI.marketData.mockRejectedValueOnce(new Error('Service unavailable'));
    render(<AdminMarketData />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Market data could not be loaded');
    expect(screen.queryByText('No market data found')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry loading market data' })).toBeInTheDocument();
  });

  it('shows an empty state only after a valid successful response', async () => {
    adminAPI.marketData.mockResolvedValueOnce({ success: true, entries: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    render(<AdminMarketData />);
    expect(await screen.findByText('No market data found')).toBeInTheDocument();
  });

  it('treats malformed response envelopes as errors', async () => {
    adminAPI.marketData.mockResolvedValueOnce({ success: true, entries: null, pagination: { total: 0 } });
    render(<AdminMarketData />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Market data could not be loaded');
    expect(screen.queryByText('No market data found')).not.toBeInTheDocument();
  });

  it('requests the next page using server-backed pagination', async () => {
    adminAPI.marketData
      .mockResolvedValueOnce({ success: true, entries: [{ _id: '1', brand: 'Toyota', model: 'Axio', year: 2020, lowPrice: 1, avgPrice: 2, highPrice: 3, sampleSize: 2 }], pagination: { page: 1, limit: 20, total: 21, pages: 2 } })
      .mockResolvedValueOnce({ success: true, entries: [], pagination: { page: 2, limit: 20, total: 21, pages: 2 } });
    render(<AdminMarketData />);
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(adminAPI.marketData).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 })));
  });
});
