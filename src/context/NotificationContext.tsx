import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
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
  const { isAuth } = useAuth();
  const { on } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuth) { setNotifications([]); setUnreadCount(0); return; }
    setLoading(true);
    try {
      const d = await notifAPI.list({ limit: 50, ...params });
      const list = d.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (error) {
      console.warn('Unable to fetch notifications', error);
    } finally { setLoading(false); }
  }, [isAuth]);

  const prependNotification = useCallback((n: Notification) => {
    setNotifications(prev => [n, ...prev.slice(0, 49)]);
    if (!n.read) setUnreadCount(c => c + 1);
  }, []);

  // Load on auth change
  useEffect(() => {
    if (isAuth) fetchNotifications();
  }, [isAuth, fetchNotifications]);

  // Socket listener for "notification" event
  useEffect(() => {
    if (!isAuth || !on) return;
    const off = on('notification', prependNotification);

    const offEscrowReleased = on('escrowReleased', (data) => {
      prependNotification({
        _id: `local_escrow_released_${Date.now()}`,
        title: 'Escrow Released',
        message: 'Funds have been released to the seller.',
        type: 'escrow', read: false, createdAt: new Date().toISOString(),
      });
    });

    const offEscrowRefunded = on('escrowRefunded', (data) => {
      prependNotification({
        _id: `local_escrow_refunded_${Date.now()}`,
        title: 'Escrow Refunded',
        message: 'Funds have been refunded to your account.',
        type: 'escrow', read: false, createdAt: new Date().toISOString(),
      });
    });

    const offEscrowDisputed = on('escrowDisputed', (data) => {
      prependNotification({
        _id: `local_dispute_${Date.now()}`,
        title: 'Escrow Disputed',
        message: 'A dispute has been opened. Admin will review.',
        type: 'escrow', read: false, createdAt: new Date().toISOString(),
      });
    });

    const offPaymentSuccess = on('paymentSuccess', (data) => {
      prependNotification({
        _id: `local_pay_${Date.now()}`,
        title: 'Payment Confirmed',
        message: data.receipt ? `Receipt: ${data.receipt}` : 'Payment successful.',
        type: 'payment', read: false, createdAt: new Date().toISOString(),
      });
    });

    return () => {
      off();
      offEscrowReleased();
      offEscrowRefunded();
      offEscrowDisputed();
      offPaymentSuccess();
    };
  }, [isAuth, on, prependNotification]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notifAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (error) {
      console.warn('Unable to mark notification as read', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notifAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.warn('Unable to mark all notifications as read', error);
    }
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    try {
      await notifAPI.remove(id);
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id);
        if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(n => n._id !== id);
      });
    } catch (error) {
      console.warn('Unable to delete notification', error);
    }
  }, []);

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
