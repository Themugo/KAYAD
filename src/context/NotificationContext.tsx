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
  loadingMore: boolean;
  hasMore: boolean;
  loadMoreError: string | null;
  error: string | null;
  errorKind: 'fetch' | 'action' | null;
  fetchNotifications: (params?: any) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
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
  const sessionKey = isAuth && authUserId ? authUserId : null;
  const sessionKeyRef = useRef<string | null>(sessionKey);
  sessionKeyRef.current = sessionKey;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dataSessionKey, setDataSessionKey] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const hasMore = currentPage < totalPages;
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorSessionKey, setErrorSessionKey] = useState<string | null>(null);

  // Defense in depth: retain only fields the customer-facing notification UI
  // actually renders. Never carry recipient contacts, internal data or ORM fields.
  const normalizeNotification = useCallback((n: any): Notification => ({
    _id: String(n?._id || n?.id || ''),
    title: typeof n?.title === 'string' ? n.title : 'KAYAD update',
    message: typeof n?.message === 'string' ? n.message : '',
    ...(typeof n?.type === 'string' ? { type: n.type } : {}),
    read: Boolean(n?.read),
    createdAt: String(n?.createdAt || n?.created_at || ''),
    ...(typeof n?.link === 'string' ? { link: n.link } : {}),
  }), []);

  const fetchNotifications = useCallback(async (params: { page?: number; limit?: number } = {}) => {
    const sequence = ++fetchSequence.current;
    if (!isAuth || !authUserId) {
      setNotifications([]);
      setUnreadCount(0);
      setFetchError(null);
      setActionError(null);
      setErrorSessionKey(null);
      setLoading(false);
      setLoadingMore(false);
      setLoadMoreError(null);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    try {
      const d = await notifAPI.list({ limit: 50, ...params });
      // A response started under a previous account must never overwrite the
      // current account's notification state after an account switch.
      if (sequence !== fetchSequence.current) return;
      const list = (d.notifications || []).map(normalizeNotification);
      setCurrentPage(Number(d.pagination?.page) || Number(params.page) || 1);
      setTotalPages(Math.max(1, Number(d.pagination?.pages) || 1));
      setLoadMoreError(null);
      setDataSessionKey(sessionKey);
      setNotifications(list);
      setUnreadCount(typeof d.unreadCount === 'number' ? Math.max(0, d.unreadCount) : list.filter(n => !n.read).length);
      setFetchError(null);
    } catch (fetchError) {
      if (sequence === fetchSequence.current) {
        // Preserve a previously loaded list on transient failure, but never
        // let the page mistake an initial failed request for an empty inbox.
        setFetchError('Notifications could not be loaded. Check your connection and try again.');
        setErrorSessionKey(sessionKey);
        console.warn('Unable to fetch notifications', fetchError);
      }
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  }, [isAuth, authUserId, sessionKey, normalizeNotification]);


  const loadMoreNotifications = useCallback(async () => {
    const requestUserId = sessionKeyRef.current;
    if (!requestUserId || loadingMore || currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    const sequence = ++fetchSequence.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const d = await notifAPI.list({ page: nextPage, limit: 50 });
      if (sequence !== fetchSequence.current || requestUserId !== sessionKeyRef.current) return;
      const older = (d.notifications || []).map(normalizeNotification);
      setDataSessionKey(requestUserId);
      setNotifications((previous) => {
        const existingIds = new Set(previous.map((item) => item._id));
        return [...previous, ...older.filter((item) => !existingIds.has(item._id))];
      });
      if (typeof d.unreadCount === 'number') setUnreadCount(Math.max(0, d.unreadCount));
      setCurrentPage(Number(d.pagination?.page) || nextPage);
      setTotalPages(Math.max(1, Number(d.pagination?.pages) || 1));
      setFetchError(null);
    } catch (fetchError) {
      if (requestUserId === sessionKeyRef.current) {
        setLoadMoreError('Older notifications could not be loaded. Please try again.');
        console.warn('Unable to load older notifications', fetchError);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, currentPage, totalPages, normalizeNotification]);

  // Socket events are wake-up signals only. Notification rows remain authoritative
  // in the backend, so domain events trigger a fresh read instead of creating
  // local notification records that cannot be marked read or deleted.
  useEffect(() => {
    // Clear the prior account immediately, before the next account's fetch
    // resolves. Incrementing the sequence invalidates any old in-flight read.
    fetchSequence.current += 1;
    setNotifications([]);
    setDataSessionKey(null);
    setUnreadCount(0);
    setLoadingMore(false);
    setLoadMoreError(null);
    setCurrentPage(1);
    setTotalPages(1);
    setFetchError(null);
    setActionError(null);
    setErrorSessionKey(null);
    if (sessionKey) void fetchNotifications();
    else setLoading(false);
  }, [sessionKey, fetchNotifications]);

  useEffect(() => {
    if (!isAuth || !on) return;
    const off = on('notification', () => { void fetchNotifications(); });
    const events = ['escrowReleased', 'escrowRefunded', 'escrowDisputed', 'paymentSuccess'];
    const offs = events.map(event => on(event, () => { void fetchNotifications(); }));
    return () => { off(); offs.forEach(unsub => unsub()); };
  }, [isAuth, on, fetchNotifications]);

  // Socket listeners can be absent during initial socket bootstrap. A modest
  // refresh interval keeps the persisted unread count honest even then.
  useEffect(() => {
    if (!sessionKey) return;
    const timer = window.setInterval(() => { void fetchNotifications(); }, 30000);
    return () => window.clearInterval(timer);
  }, [sessionKey, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const requestUserId = sessionKeyRef.current;
    if (!requestUserId) return;
    try {
      await notifAPI.markRead(id);
      if (requestUserId !== sessionKeyRef.current) return;
      fetchSequence.current += 1; // invalidate reads started before this mutation
      setActionError(null);
      const current = notifications.find((notification) => notification._id === id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      if (current && !current.read) setUnreadCount(c => Math.max(0, c - 1));
      void fetchNotifications(); // reconcile with the server's authoritative count
    } catch (mutationError) {
      if (requestUserId === sessionKeyRef.current) {
        setActionError('A notification could not be updated. Please try again.');
        setErrorSessionKey(requestUserId);
        console.warn('Unable to mark notification as read', mutationError);
      }
    }
  }, [sessionKeyRef, notifications, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const requestUserId = sessionKeyRef.current;
    if (!requestUserId) return;
    try {
      await notifAPI.markAllRead();
      if (requestUserId !== sessionKeyRef.current) return;
      fetchSequence.current += 1; // invalidate reads started before this mutation
      setActionError(null);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      void fetchNotifications(); // reconcile with the server's authoritative count
    } catch (mutationError) {
      if (requestUserId === sessionKeyRef.current) {
        setActionError('Notifications could not be marked as read. Please try again.');
        setErrorSessionKey(requestUserId);
        console.warn('Unable to mark all notifications as read', mutationError);
      }
    }
  }, [sessionKeyRef, fetchNotifications]);

  const deleteNotif = useCallback(async (id: string) => {
    const requestUserId = sessionKeyRef.current;
    if (!requestUserId) return;
    try {
      await notifAPI.remove(id);
      if (requestUserId !== sessionKeyRef.current) return;
      fetchSequence.current += 1; // invalidate reads started before this mutation
      setActionError(null);
      const removed = notifications.find((notification) => notification._id === id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      void fetchNotifications(); // reconcile with the server's authoritative count
    } catch (mutationError) {
      if (requestUserId === sessionKeyRef.current) {
        setActionError('This notification could not be deleted. Please try again.');
        setErrorSessionKey(requestUserId);
        console.warn('Unable to delete notification', mutationError);
      }
    }
  }, [sessionKeyRef, notifications, fetchNotifications]);

  // Account-switch masking is synchronous during render; the clearing effect
  // alone would run too late to prevent a one-frame prior-account flash.
  const visibleSession = Boolean(sessionKey && dataSessionKey === sessionKey);
  const visibleNotifications = visibleSession ? notifications : [];
  const visibleUnreadCount = visibleSession ? unreadCount : 0;
  const visibleError = sessionKey && errorSessionKey === sessionKey ? actionError || fetchError : null;
  const visibleErrorKind = visibleError ? (actionError ? 'action' : 'fetch') : null;

  const value = useMemo(() => ({
    notifications: visibleNotifications, unreadCount: visibleUnreadCount, loading, loadingMore, hasMore: visibleSession && hasMore, loadMoreError: visibleSession ? loadMoreError : null, error: visibleError, errorKind: visibleErrorKind,
    fetchNotifications, loadMoreNotifications, markAsRead, markAllRead, deleteNotif,
  }), [visibleNotifications, visibleUnreadCount, loading, loadingMore, visibleSession, hasMore, loadMoreError, visibleError, visibleErrorKind, fetchNotifications, loadMoreNotifications, markAsRead, markAllRead, deleteNotif]);

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
