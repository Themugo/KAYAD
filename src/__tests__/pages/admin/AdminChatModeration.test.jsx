import { beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  chats: vi.fn(), chatMessages: vi.fn(), deleteChatMessage: vi.fn(),
  blockChat: vi.fn(), unblockChat: vi.fn(), toast: vi.fn(),
}));

vi.mock('../../../api/api', () => ({ adminAPI: {
  chats: (...args) => h.chats(...args),
  chatMessages: (...args) => h.chatMessages(...args),
  deleteChatMessage: (...args) => h.deleteChatMessage(...args),
  blockChat: (...args) => h.blockChat(...args),
  unblockChat: (...args) => h.unblockChat(...args),
} }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: h.toast }) }));

import AdminChatModeration from '../../../pages/admin/AdminChatModeration';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.chats.mockResolvedValue({ success: true, chats: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  h.chatMessages.mockResolvedValue({ success: true, chat: { _id: 'chat-1', participants: [], isBlocked: false, messages: [] } });
});

describe('Admin chat moderation reliability', () => {
  test('shows a retryable error instead of an empty state when list loading fails', async () => {
    h.chats.mockRejectedValueOnce(new Error('scheduled maintenance'));
    render(<AdminChatModeration />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/scheduled maintenance/i);
    expect(screen.queryByText('No chats found')).toBeNull();
  });

  test('only shows the true empty state after a successful response and retry', async () => {
    h.chats.mockRejectedValueOnce(new Error('temporary outage'));
    render(<AdminChatModeration />);
    fireEvent.click(await screen.findByRole('button', { name: /retry loading chats/i }));
    expect(await screen.findByText('No chats found')).toBeTruthy();
    await waitFor(() => expect(h.chats).toHaveBeenCalledTimes(2));
  });

  test('rejects unexpected list response envelopes instead of treating them as empty', async () => {
    h.chats.mockResolvedValueOnce({ success: true, pagination: { total: 0 } });
    render(<AdminChatModeration />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected chat-list response/i);
    expect(screen.queryByText('No chats found')).toBeNull();
  });

  test('submits search explicitly and sends the filter to the server', async () => {
    render(<AdminChatModeration />);
    await screen.findByText('No chats found');
    fireEvent.change(screen.getByLabelText(/search conversations/i), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() => expect(h.chats).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'buyer@example.com' })));
  });

  test('surfaces message-load errors with a separate retry action', async () => {
    h.chats.mockResolvedValueOnce({ success: true, chats: [{ _id: 'chat-1', participants: [{ name: 'Buyer' }], updatedAt: '2026-01-01T00:00:00Z' }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } });
    h.chatMessages.mockRejectedValueOnce(new Error('message store unavailable'));
    render(<AdminChatModeration />);
    fireEvent.click(await screen.findByRole('button', { name: /Buyer/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/message store unavailable/i);
    expect(screen.getByRole('button', { name: /retry messages/i })).toBeTruthy();
  });
});
