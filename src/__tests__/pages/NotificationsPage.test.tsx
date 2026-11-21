import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from '../../pages/NotificationsPage';
import { useNotifications } from '../../context/NotificationContext';

vi.mock('../../context/NotificationContext', () => ({ useNotifications: vi.fn() }));

const makeContext = (overrides: Record<string, unknown> = {}) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  loadMoreError: null,
  error: null,
  errorKind: null,
  fetchNotifications: vi.fn().mockResolvedValue(undefined),
  loadMoreNotifications: vi.fn().mockResolvedValue(undefined),
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllRead: vi.fn().mockResolvedValue(undefined),
  deleteNotif: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><NotificationsPage /></MemoryRouter>);

describe('NotificationsPage public error and history states', () => {
  afterEach(() => cleanup());

  it('does not report an empty inbox when the initial fetch fails', () => {
    const context = makeContext({
      error: 'Notifications could not be loaded. Check your connection and try again.',
      errorKind: 'fetch',
    });
    vi.mocked(useNotifications).mockReturnValue(context as unknown as ReturnType<typeof useNotifications>);
    renderPage();
    expect(screen.getByRole('heading', { name: /Notifications are temporarily unavailable/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /You’re all caught up/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /try again|refresh notifications/i })[0]);
    expect(context.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('offers older notification history when the backend reports another page', () => {
    const context = makeContext({
      notifications: [{ _id: 'n-1', title: 'Auction update', message: 'A watched auction changed.', type: 'auction', read: false, createdAt: '2026-10-12T08:00:00.000Z' }],
      unreadCount: 1,
      hasMore: true,
    });
    vi.mocked(useNotifications).mockReturnValue(context as unknown as ReturnType<typeof useNotifications>);
    renderPage();
    expect(screen.getByText('Auction update')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Load older notifications/i }));
    expect(context.loadMoreNotifications).toHaveBeenCalledTimes(1);
  });
});
