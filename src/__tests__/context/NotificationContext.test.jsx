import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { NotificationProvider, useNotifications } from '../../context/NotificationContext';

const mockNotifAPI = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue({ notifications: [] }),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../api/api', () => ({
  notifAPI: mockNotifAPI,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuth: true }),
}));

vi.mock('../../context/SocketContext', () => ({
  useSocket: () => ({
    on: () => () => {},
  }),
}));

function TestConsumer() {
  const ctx = useNotifications();
  return (
    <div>
      <span data-testid="count">{ctx.unreadCount}</span>
      <span data-testid="total">{ctx.notifications.length}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('provides initial state', async () => {
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('fetches notifications on mount', async () => {
    mockNotifAPI.list.mockResolvedValue({
      notifications: [
        { _id: '1', title: 'Test', message: 'Hello', type: 'info', read: false, createdAt: new Date().toISOString() },
      ],
    });
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );
    await act(async () => {});
    expect(mockNotifAPI.list).toHaveBeenCalled();
  });
});
