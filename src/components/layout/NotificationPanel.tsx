import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, ExternalLink, ShieldCheck, Gavel, MessageSquare, X, TrendingDown, Tag, BellRing } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const timeAgo = (date: string) => {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return 'Time unavailable';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bid':
      case 'outbid':
        return <Gavel className="w-4 h-4 text-[#13b8a6]" />;
      case 'escrow':
        return <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#13B8A6]" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4 text-[#13B8A6]" />;
      case 'status_change':
        return <Tag className="w-4 h-4 text-[#176b87]" />;
      case 'price_alert':
        return <BellRing className="w-4 h-4 text-[#13B8A6]" />;
      default:
        return <Bell className="w-4 h-4 text-[#6C5CE7]" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0A3340] border border-[#D7E7E4] dark:border-[#0A3340] rounded-2xl shadow-2xl overflow-hidden z-50"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#D7E7E4] dark:border-[#0A3340] bg-[#EEF7F5]/50 dark:bg-[#0A3340]/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#13b8a6]" />
            <span className="font-bold text-sm text-[#176B87] dark:text-white">
              Notifications & Alerts
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#176b87] dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#D7E7E4] dark:divide-[#0A3340]/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-[#64748b] text-xs">
              No recent notifications
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => {
                  markAsRead(notif._id);
                  if (notif.link) {
                    navigate(notif.link);
                  } else if (notif.type === 'escrow') {
                    navigate('/escrow');
                  } else if (notif.type === 'bid' || notif.type === 'auction') {
                    navigate('/auction');
                  }
                  onClose();
                }}
                className={`p-3 rounded-xl cursor-pointer transition-colors ${
                  notif.read
                    ? 'opacity-70 hover:bg-[#F6FAF9] dark:hover:bg-[#0A3340]/40'
                    : 'bg-[#13b8a6]/8 hover:bg-[#13b8a6]/12 border-l-2 border-[#13b8a6]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#EEF7F5] dark:bg-[#0A3340]">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#176B87] dark:text-white truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#64748b] whitespace-nowrap ml-2">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#176b87] dark:text-[#94A3B8] mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[#D7E7E4] dark:border-[#0A3340] text-center bg-[#EEF7F5]/50 dark:bg-[#0A3340]/50">
          <button
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
            className="text-xs font-semibold text-[#13b8a6] hover:text-[#13b8a6] inline-flex items-center gap-1"
          >
            <span>View All Notifications</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
