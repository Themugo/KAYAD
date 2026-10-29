import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminReports from '../../../pages/admin/AdminReports';
import { reportAPI } from '../../../api/api';

vi.mock('../../../api/api', () => ({
  reportAPI: { adminAll: vi.fn(), adminUpdate: vi.fn() },
}));
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('../../../utils/helpers', () => ({ timeAgo: () => 'recently' }));

describe('AdminReports', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows an actionable error instead of claiming the queue is empty when the API fails', async () => {
    reportAPI.adminAll.mockRejectedValueOnce(new Error('Service unavailable'));
    render(<AdminReports />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Reports could not be loaded');
    expect(screen.queryByText('No reports have been submitted yet.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry loading reports' })).toBeInTheDocument();
  });

  it('shows a genuine empty state only after a successful empty response', async () => {
    reportAPI.adminAll.mockResolvedValueOnce({ success: true, reports: [], stats: { total: 0 }, pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    render(<AdminReports />);
    expect(await screen.findByText('No reports have been submitted yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats malformed response envelopes as an error', async () => {
    reportAPI.adminAll.mockResolvedValueOnce({ success: true, reports: null });
    render(<AdminReports />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('No reports have been submitted yet.')).not.toBeInTheDocument();
  });
});
