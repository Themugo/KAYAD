import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, DollarSign, MessageCircle, Gavel, Shield, AlertCircle, Clock } from 'lucide-react';
import { timeAgo } from '../utils/helpers';

interface Notification {
  id: string;
  type: 'bid' | 'payment' | 'escrow' | 'chat' | 'auction' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

const TYPE_CONFIG = {
  bid: { icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  escrow: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  chat: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  auction: { icon: Gavel, color: 'text-red-400', bg: 'bg-red-500/10' },
  system: { icon: AlertCircle, color: 'text-warm-400', bg: 'bg-warm-500/10' },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'auction',
    title: 'New bid on Toyota Land Cruiser',
    message: 'Someone placed a bid of KES 15,500,000 on this vehicle.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    link: '/auction/1',
  },
  {
    id: '2',
    type: 'escrow',
    title: 'Payment received',
    message: 'Your escrow payment of KES 12,000,000 has been confirmed.',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    link: '/escrow/1',
  },
  {
    id: '3',
    type: 'chat',
    title: 'New message from Premium Motors',
    message: 'Is this vehicle still available for viewing?',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    link: '/chat/1',
  },
  {
    id: '4',
    type: 'bid',
    title: 'You were outbid',
    message: 'Someone placed a higher bid of KES 16,200,000 on Range Rover Sport.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    link: '/auction/2',
  },
  {
    id: '5',
    type: 'payment',
    title: 'Escrow released',
    message: 'Funds have been successfully released to the seller.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    link: '/escrow/2',
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to KAYAD',
    message: 'Thank you for joining Kenya\'s premier vehicle marketplace.',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

export default function Notifications() {
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

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: Notification['type']) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.system;
    return { Icon: config.icon, color: config.color, bg: config.bg };
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center">
                <Bell size={24} className="text-gold-400" />
              </div>
              <div>
                <h1 className="font-serif text-2xl text-white font-bold">Notifications</h1>
                <p className="text-white/50 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-4 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center">
            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-warm-300" />
            </div>
            <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-2">No notifications</h2>
            <p className="font-sans text-warm-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
            {notifications.map((n, idx) => {
              const { Icon, color, bg } = getIcon(n.type);
              const content = (
                <div
                  className={`px-5 py-4 flex gap-4 hover:bg-cream-50 transition-colors cursor-pointer border-b border-cream-100 last:border-0 ${
                    !n.read ? 'bg-gold-500/3' : ''
                  }`}
                  onClick={() => markAsRead(n.id)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`font-sans text-sm font-semibold ${n.read ? 'text-charcoal-800' : 'text-charcoal-900'}`}>
                          {n.title}
                        </p>
                        <p className="font-sans text-xs text-warm-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                          className="p-1.5 text-warm-300 hover:text-gold-500 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="p-1.5 text-warm-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-warm-300 flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(n.createdAt)}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 bg-gold-500 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              );

              if (n.link) {
                return (
                  <Link key={n.id} to={n.link} className="block no-underline">
                    {content}
                  </Link>
                );
              }

              return <div key={n.id}>{content}</div>;
            })}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={clearAll}
              className="text-sm text-warm-400 hover:text-warm-600 font-medium transition-colors"
            >
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
