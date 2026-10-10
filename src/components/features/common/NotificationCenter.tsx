import { useMemo } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
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
  bid: { icon: DollarSign, color: 'text-[#13B8A6]', bg: 'bg-[#13B8A6]/10' },
  payment: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  escrow: { icon: Shield, color: 'text-[#5AAFA4]', bg: 'bg-[#13B8A6]/10' },
  chat: { icon: MessageCircle, color: 'text-[#5AAFA4]', bg: 'bg-[#13B8A6]/10' },
  auction: { icon: Gavel, color: 'text-red-400', bg: 'bg-red-500/10' },
  system: { icon: Bell, color: 'text-warm-400', bg: 'bg-warm-500/10' },
  info: { icon: Bell, color: 'text-warm-400', bg: 'bg-warm-500/10' },
  referral: { icon: Bell, color: 'text-[#13B8A6]', bg: 'bg-[#13B8A6]/10' },
};

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotif } = useNotifications();
  const visibleNotifications = useMemo(() => notifications.slice(0, 20), [notifications]);

  const getNotifIcon = (type: string) => {
    const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
    return config.icon;
  };

  return (
    <div className="absolute top-full right-0 mt-3 w-[min(370px,calc(100vw-1.5rem))] bg-[#0A3340] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200]">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-sans font-bold text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs text-[#13B8A6] font-bold">({unreadCount})</span>
            )}
          </span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="bg-transparent border-none text-[#13B8A6] text-xs font-semibold cursor-pointer hover:text-[#5AAFA4] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {visibleNotifications.length === 0 && (
        <div className="px-5 py-12 text-center text-white/30 font-sans text-sm">
          No notifications yet
        </div>
      )}

      {/* List */}
      {notifications.length > 0 && (
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.map((n) => {
            const Icon = getNotifIcon(n.type);
            const config = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
            const content = (
              <div
                className={`px-5 py-3 border-b border-white/3 flex gap-3 items-start cursor-pointer transition-colors ${
                  n.read ? 'hover:bg-white/2' : 'bg-[#13B8A6]/3 hover:bg-[#13B8A6]/5'
                }`}
                onClick={() => void markAsRead(n._id)}
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
                        onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                        className="bg-transparent border-none text-[#13B8A6]/40 text-xs cursor-pointer hover:text-[#13B8A6] flex-shrink-0"
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
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
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
                  key={n._id}
                  to={n.link}
                  onClick={onClose}
                  className="block no-underline"
                >
                  {content}
                </Link>
              );
            }

            return <div key={n._id}>{content}</div>;
          })}
        </div>
      )}

      {/* Footer */}
      <Link
        to="/notifications"
        onClick={onClose}
        className="block px-5 py-3.5 text-center font-sans text-sm text-[#13B8A6] border-t border-white/5 hover:text-[#5AAFA4] no-underline font-semibold transition-colors"
      >
        View all →
      </Link>
    </div>
  );
}
