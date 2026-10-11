import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { notifAPI } from '../api/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (params?: any) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuth, user } = useAuth();
  const { on } = useSocket();
  const fetchSequence = useRef(0);
  const authUserId = user?.id ? String(user.id) : null;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const normalizeNotification = useCallback((n: any): Notification => ({
    ...n,
    _id: n._id || n.id,
    createdAt: n.createdAt || n.created_at,
  }), []);

  const fetchNotifications = useCallback(async (params = {}) => {
    const sequence = ++fetchSequence.current;
    if (!isAuth || !authUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const d = await notifAPI.list({ limit: 50, ...params });
      // A response started under a previous account must never overwrite the
      // current account's notification state after an account switch.
      if (sequence !== fetchSequence.current) return;
      const list = (d.notifications || []).map(normalizeNotification);
      setNotifications(list);
      setUnreadCount(typeof d.unreadCount === 'number' ? Math.max(0, d.unreadCount) : list.filter(n => !n.read).length);
    } catch (error) {
      if (sequence === fetchSequence.current) console.warn('Unable to fetch notifications', error);
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, [isAuth, authUserId, normalizeNotification]);

  // Socket events are wake-up signals only. Notification rows remain authoritative
  // in the backend, so domain events trigger a fresh read instead of creating
  // local notification records that cannot be marked read or deleted.
  useEffect(() => {
    // Clear the prior account immediately, before the next account's fetch
    // resolves. Incrementing the sequence invalidates any old in-flight read.
    fetchSequence.current += 1;
    setNotifications([]);
    setUnreadCount(0);
    if (isAuth && authUserId) void fetchNotifications();
    else setLoading(false);
  }, [isAuth, authUserId, fetchNotifications]);

  useEffect(() => {
    if (!isAuth || !on) return;
    const off = on('notification', () => { void fetchNotifications(); });
    const events = ['escrowReleased', 'escrowRefunded', 'escrowDisputed', 'paymentSuccess'];
    const offs = events.map(event => on(event, () => { void fetchNotifications(); }));
    return () => { off(); offs.forEach(unsub => unsub()); };
  }, [isAuth, on, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const requestUserId = authUserId;
    try {
      await notifAPI.markRead(id);
      if (requestUserId !== authUserId) return;
      const current = notifications.find((notification) => notification._id === id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      if (current && !current.read) setUnreadCount(c => Math.max(0, c - 1));
    } catch (error) {
      if (requestUserId === authUserId) console.warn('Unable to mark notification as read', error);
    }
  }, [authUserId, notifications]);

  const markAllRead = useCallback(async () => {
    const requestUserId = authUserId;
    try {
      await notifAPI.markAllRead();
      if (requestUserId !== authUserId) return;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      if (requestUserId === authUserId) console.warn('Unable to mark all notifications as read', error);
    }
  }, [authUserId]);

  const deleteNotif = useCallback(async (id: string) => {
    const requestUserId = authUserId;
    try {
      await notifAPI.remove(id);
      if (requestUserId !== authUserId) return;
      const removed = notifications.find((notification) => notification._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
    } catch (error) {
      if (requestUserId === authUserId) console.warn('Unable to delete notification', error);
    }
  }, [authUserId, notifications]);

  const value = useMemo(() => ({
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllRead, deleteNotif,
  }), [notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllRead, deleteNotif]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};
