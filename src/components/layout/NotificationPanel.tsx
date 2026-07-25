import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, ExternalLink, ShieldCheck, Gavel, MessageSquare, X, TrendingDown, Tag, BellRing } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, navigateTo } = useMarketplace();

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bid':
      case 'outbid':
        return <Gavel className="w-4 h-4 text-[#F0A500]" />;
      case 'escrow':
        return <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#00C9CE]" />;
      case 'price_drop':
        return <TrendingDown className="w-4 h-4 text-[#00C9CE]" />;
      case 'status_change':
        return <Tag className="w-4 h-4 text-[#E67E22]" />;
      case 'price_alert':
        return <BellRing className="w-4 h-4 text-[#00C9CE]" />;
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
        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#0B1628] border border-[#E2D8C7] dark:border-[#1A2A4E] rounded-2xl shadow-2xl overflow-hidden z-50"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#E8E1D5] dark:border-[#1A2A4E] bg-[#F6F1E8]/50 dark:bg-[#0B1628]/50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#F0A500]" />
            <span className="font-bold text-sm text-[#1E3063] dark:text-white">
              Notifications & Alerts
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7A99] hover:text-[#3D4F6F] dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#E8E1D5] dark:divide-[#1A2A4E]/60">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-[#6B7A99] text-xs">
              No recent notifications
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationRead(notif.id);
                  if (notif.vehicleId) {
                    navigateTo('vehicle_detail', notif.vehicleId);
                  } else if (notif.type === 'escrow') {
                    navigateTo('escrow');
                  } else if (notif.type === 'bid') {
                    navigateTo('auctions');
                  }
                  onClose();
                }}
                className={`p-3 rounded-xl cursor-pointer transition-colors ${
                  notif.isRead
                    ? 'opacity-70 hover:bg-[#FCF9F4] dark:hover:bg-[#1A2A4E]/40'
                    : 'bg-[#F0A500]/8 hover:bg-[#F0A500]/12 border-l-2 border-[#F0A500]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#F6F1E8] dark:bg-[#1A2A4E]">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#1E3063] dark:text-white truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-[#6B7A99] whitespace-nowrap ml-2">
                        {notif.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#3D4F6F] dark:text-[#94A3B8] mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[#E8E1D5] dark:border-[#1A2A4E] text-center bg-[#F6F1E8]/50 dark:bg-[#0B1628]/50">
          <button
            onClick={() => {
              navigateTo('dashboard');
              onClose();
            }}
            className="text-xs font-semibold text-[#F0A500] hover:text-[#F0A500] inline-flex items-center gap-1"
          >
            <span>View All Activity in Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
