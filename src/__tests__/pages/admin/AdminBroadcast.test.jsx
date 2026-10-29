import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  create: vi.fn(),
  send: vi.fn(),
  list: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('../../../api/api', () => ({
  announcementAPI: {
    create: (...args) => h.create(...args),
    send: (...args) => h.send(...args),
    list: (...args) => h.list(...args),
  },
}));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: h.toast }) }));

import AdminBroadcast from '../../../pages/admin/AdminBroadcast';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  h.list.mockResolvedValue({ success: true, announcements: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } });
  h.create.mockResolvedValue({ success: true, announcement: { _id: 'announcement-1' } });
  h.send.mockResolvedValue({ success: true, announcement: { _id: 'announcement-1', status: 'sent', stats: { totalRecipients: 4, successCount: 4, failCount: 0 } } });
});

describe('Admin broadcast reliability', () => {
  test('shows a history loading failure instead of a false empty state and supports retry', async () => {
    h.list.mockRejectedValueOnce(new Error('announcement service unavailable'));
    render(<AdminBroadcast />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/announcement service unavailable/i);
    expect(screen.queryByText(/no broadcasts have been recorded/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/no broadcasts have been recorded/i)).toBeTruthy();
  });

  test('requires title and message and confirms the audience before sending', async () => {
    render(<AdminBroadcast />);
    await screen.findByText(/no broadcasts have been recorded/i);
    fireEvent.change(screen.getByLabelText(/broadcast title/i), { target: { value: 'Maintenance notice' } });
    fireEvent.change(screen.getByLabelText(/broadcast message/i), { target: { value: 'Scheduled maintenance tonight.' } });
    fireEvent.change(screen.getByLabelText(/audience/i), { target: { value: 'dealers' } });
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Maintenance notice', audience: 'dealers' })));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Dealers and Individual Sellers'));
    await waitFor(() => expect(h.send).toHaveBeenCalledWith('announcement-1'));
  });

  test('reports partial processing rather than success when notification-record failures exist', async () => {
    h.send.mockResolvedValueOnce({ success: false, partial: true, message: 'some notification-record failures', announcement: { _id: 'announcement-1', status: 'partial', stats: { totalRecipients: 5, successCount: 3, failCount: 2 } } });
    render(<AdminBroadcast />);
    await screen.findByText(/no broadcasts have been recorded/i);
    fireEvent.change(screen.getByLabelText(/broadcast title/i), { target: { value: 'Important update' } });
    fireEvent.change(screen.getByLabelText(/broadcast message/i), { target: { value: 'Please review your account.' } });
    fireEvent.click(screen.getByRole('button', { name: /send broadcast/i }));
    expect(await screen.findByText(/broadcast completed with failures/i)).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(h.toast).toHaveBeenCalledWith(expect.stringContaining('partially processed'), 'error');
  });
});
