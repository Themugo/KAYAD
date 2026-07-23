import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, X, Clock, MessageCircle, Shield, DollarSign, Gavel } from 'lucide-react';
import { timeAgo } from '../../../utils/helpers';

interface Notification {
  id: string;
  type: 'bid' | 'payment' | 'escrow' | 'chat' | 'auction' | 'system' | 'info' | 'referral';
  title: string;
  message?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationCenterProps {
  onClose?: () => void;
}

const TYPE_CONFIG = {
  bid: { icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  escrow: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  chat: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  auction: { icon: Gavel, color: 'text-red-400', bg: 'bg-red-500/10' },
  system: { icon: Bell, color: 'text-warm-400', bg: 'bg-warm-500/10' },
  info: { icon: Bell, color: 'text-warm-400', bg: 'bg-warm-500/10' },
  referral: { icon: Bell, color: 'text-gold-400', bg: 'bg-gold-500/10' },
};

// Demo notifications
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'auction',
    title: 'New bid on Toyota Land Cruiser',
    message: 'Someone placed a bid of KES 15,500,000',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    link: '/auction/1',
  },
  {
    id: '2',
    type: 'escrow',
    title: 'Payment received',
    message: 'Your escrow payment has been confirmed',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    link: '/escrow/1',
  },
  {
    id: '3',
    type: 'chat',
    title: 'New message from Premium Motors',
    message: 'Is this vehicle still available?',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    link: '/chat/1',
  },
  {
    id: '4',
    type: 'bid',
    title: 'You were outbid',
    message: 'Someone placed a higher bid on Range Rover Sport',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    link: '/auction/2',
  },
];

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotifIcon = (type: Notification['type']) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    return config.icon;
  };

  return (
    <div className="absolute top-full right-0 mt-3 w-[370px] bg-charcoal-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200]">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-sans font-bold text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs text-gold-400 font-bold">({unreadCount})</span>
            )}
          </span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="bg-transparent border-none text-gold-400 text-xs font-semibold cursor-pointer hover:text-gold-300 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="px-5 py-12 text-center text-white/30 font-sans text-sm">
          No notifications yet
        </div>
      )}

      {/* List */}
      {notifications.length > 0 && (
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.map((n) => {
            const Icon = getNotifIcon(n.type);
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const content = (
              <div
                className={`px-5 py-3 border-b border-white/3 flex gap-3 items-start cursor-pointer transition-colors ${
                  n.read ? 'hover:bg-white/2' : 'bg-gold-500/3 hover:bg-gold-500/5'
                }`}
                onClick={() => markAsRead(n.id)}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className={`font-sans text-sm flex-1 ${n.read ? 'text-white/55 font-normal' : 'text-white font-semibold'}`}>
                      {n.title}
                    </span>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        className="bg-transparent border-none text-gold-400/40 text-xs cursor-pointer hover:text-gold-400 flex-shrink-0"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  {n.message && (
                    <p className="font-sans text-xs text-white/30 mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-sans text-[10px] text-white/20 flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(n.createdAt)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="bg-transparent border-none text-red-400/30 text-xs cursor-pointer hover:text-red-400 ml-auto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={onClose}
                  className="block no-underline"
                >
                  {content}
                </Link>
              );
            }

            return <div key={n.id}>{content}</div>;
          })}
        </div>
      )}

      {/* Footer */}
      <Link
        to="/notifications"
        onClick={onClose}
        className="block px-5 py-3.5 text-center font-sans text-sm text-gold-400 border-t border-white/5 hover:text-gold-300 no-underline font-semibold transition-colors"
      >
        View all →
      </Link>
    </div>
  );
}
