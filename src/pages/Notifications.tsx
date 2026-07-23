import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, DollarSign, MessageCircle, Gavel, Shield, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { timeAgo } from '../utils/helpers';
import { useNotifications } from '../context/NotificationContext';

interface NotificationItem {
  _id: string;
  type?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  bid: { icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  escrow: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  chat: { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  auction: { icon: Gavel, color: 'text-red-400', bg: 'bg-red-500/10' },
  system: { icon: AlertCircle, color: 'text-warm-400', bg: 'bg-warm-500/10' },
};

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllRead, deleteNotif } = useNotifications();

  const getIcon = (type?: string) => {
    const config = TYPE_CONFIG[type || 'system'] || TYPE_CONFIG.system;
    return { Icon: config.icon, color: config.color, bg: config.bg };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 pt-16 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold-500 animate-spin" />
      </div>
    );
  }

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
            {notifications.map((n) => {
              const { Icon, color, bg } = getIcon(n.type);
              const content = (
                <div
                  className={`px-5 py-4 flex gap-4 hover:bg-cream-50 transition-colors cursor-pointer border-b border-cream-100 last:border-0 ${
                    !n.read ? 'bg-gold-500/3' : ''
                  }`}
                  onClick={() => markAsRead(n._id)}
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
                          onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                          className="p-1.5 text-warm-300 hover:text-gold-500 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
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
                  <Link key={n._id} to={n.link} className="block no-underline">
                    {content}
                  </Link>
                );
              }

              return <div key={n._id}>{content}</div>;
            })}
          </div>
        )}

        {notifications.length > 0 && unreadCount > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={markAllRead}
              className="text-sm text-warm-400 hover:text-warm-600 font-medium transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
