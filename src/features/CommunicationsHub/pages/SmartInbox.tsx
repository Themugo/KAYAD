// ============================================================
// KAYAD COMMUNICATIONS & COLLABORATION HUB
// SMART INBOX & MESSAGING
// ============================================================

import { useState, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  MessageSquare,
  Bell,
  Mail,
  Send,
  Paperclip,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Video,
  Users,
  Clock,
  CheckCircle,
  Eye,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Car,
  ClipboardCheck,
  Gavel,
  DollarSign,
  HelpCircle,
  Shield,
  FileText,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
};

// Sample data
const SAMPLE_CONVERSATIONS = [
  { id: 1, type: 'buyer_dealer', contextType: 'listing', subject: 'Toyota Land Cruiser 2020', lastMessage: 'Is this vehicle still available?', sender: 'John K.', time: '5m ago', unread: 2, avatar: 'JK', status: 'active' },
  { id: 2, type: 'buyer_inspector', contextType: 'inspection', subject: 'Inspection Booking - Mercedes C-Class', lastMessage: 'Your inspection is scheduled for tomorrow at 10 AM', sender: 'AutoInspect Team', time: '1h ago', unread: 0, avatar: 'AI', status: 'active' },
  { id: 3, type: 'buyer_seller', contextType: 'listing', subject: 'BMW X5 Inquiry', lastMessage: 'Thank you for your interest!', sender: 'Sarah M.', time: '2h ago', unread: 1, avatar: 'SM', status: 'active' },
  { id: 4, type: 'buyer_dealer', contextType: 'auction', subject: 'Auction Bid - Nissan Patrol', lastMessage: 'You\'ve been outbid!', sender: 'COA Auctions', time: '3h ago', unread: 3, avatar: 'CO', status: 'active' },
];

const SAMPLE_MESSAGES = [
  { id: 1, sender: 'John K.', senderType: 'user', content: 'Hello, I\'m interested in this Toyota Land Cruiser. Is it still available?', time: '10:30 AM', status: 'read' },
  { id: 2, sender: 'Premium Auto Dealers', senderType: 'dealer', content: 'Good morning! Yes, the vehicle is still available. Would you like to schedule a viewing or book an inspection?', time: '10:45 AM', status: 'read' },
  { id: 3, sender: 'John K.', senderType: 'user', content: 'That would be great. Can I book an inspection for this Saturday?', time: '10:47 AM', status: 'read' },
  { id: 4, sender: 'Premium Auto Dealers', senderType: 'dealer', content: 'Absolutely! We have availability on Saturday from 9 AM to 2 PM. Would the morning work for you?', time: '10:50 AM', status: 'delivered' },
];

const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'price_drop', title: 'Price Drop Alert!', message: 'Toyota Corolla 2022 dropped from KES 2.8M to KES 2.5M', time: '15m ago', read: false, priority: 'high' },
  { id: 2, type: 'inspection_complete', title: 'Inspection Report Ready', message: 'Your inspection for BMW X5 is complete', time: '1h ago', read: false, priority: 'normal' },
  { id: 3, type: 'auction_ending', title: 'Auction Ending Soon', message: 'Nissan Patrol auction ends in 5 minutes', time: '2h ago', read: true, priority: 'high' },
  { id: 4, type: 'ownership_transfer', title: 'Ownership Transfer', message: 'Transfer for Toyota Land Cruiser is complete', time: '3h ago', read: true, priority: 'normal' },
];

const FILTERS = [
  { id: 'all', label: 'All', icon: <Inbox size={18} /> },
  { id: 'marketplace', label: 'Marketplace', icon: <Car size={18} /> },
  { id: 'auction', label: 'Auction', icon: <Gavel size={18} /> },
  { id: 'inspection', label: 'Inspection', icon: <ClipboardCheck size={18} /> },
  { id: 'finance', label: 'Finance', icon: <DollarSign size={18} /> },
  { id: 'support', label: 'Support', icon: <HelpCircle size={18} /> },
];

export default function SmartInbox() {
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<typeof SAMPLE_CONVERSATIONS[0] | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showMobileConversation, setShowMobileConversation] = useState(false);

  const totalUnread = SAMPLE_NOTIFICATIONS.filter(n => !n.read).length + SAMPLE_CONVERSATIONS.filter(c => c.unread > 0).length;

  const getContextIcon = (contextType: string) => {
    const icons: Record<string, JSX.Element> = {
      listing: <Car size={14} />,
      auction: <Gavel size={14} />,
      inspection: <ClipboardCheck size={14} />,
      escrow: <DollarSign size={14} />,
      finance: <DollarSign size={14} />,
      support: <HelpCircle size={14} />,
      passport: <FileText size={14} />,
    };
    return icons[contextType] || <MessageSquare size={14} />;
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Conversations List */}
      <aside 
        className={`${showMobileConversation ? 'hidden' : 'block'} md:block w-full md:w-80 lg:w-96 border-r overflow-y-auto`}
        style={{ backgroundColor: KAYAD_COLORS.white, borderColor: KAYAD_COLORS.warmBeige }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Smart Inbox</h1>
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
              {totalUnread} unread
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'messages' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'messages' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.warmBeige,
                color: activeTab === 'messages' ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              <MessageSquare size={18} />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors relative ${
                activeTab === 'notifications' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'notifications' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.warmBeige,
                color: activeTab === 'notifications' ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              <Bell size={18} />
              Alerts
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.red, color: KAYAD_COLORS.white }}>
                  {totalUnread}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          {activeTab === 'messages' && (
            <div className="flex gap-1 overflow-x-auto pb-2">
              {FILTERS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-colors ${
                    activeFilter === filter.id ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: activeFilter === filter.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.warmBeige,
                    color: activeFilter === filter.id ? KAYAD_COLORS.white : KAYAD_COLORS.softBlue,
                  }}
                >
                  {filter.icon}
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations/Notifications List */}
        <div className="divide-y" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          {activeTab === 'messages' && SAMPLE_CONVERSATIONS.map(conv => (
            <motion.button
              key={conv.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedConversation(conv); setShowMobileConversation(true); }}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium truncate" style={{ color: KAYAD_COLORS.lightNavy }}>{conv.sender}</span>
                    <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{conv.time}</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: KAYAD_COLORS.softBlue }}>{conv.subject}</p>
                  <p className="text-sm truncate mt-1" style={{ color: conv.unread > 0 ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.softBlue, fontWeight: conv.unread > 0 ? 500 : 400 }}>
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                    {conv.unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-xs flex items-center gap-1" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}15`, color: KAYAD_COLORS.softBlue }}>
                  {getContextIcon(conv.contextType)}
                  {conv.contextType}
                </span>
              </div>
            </motion.button>
          ))}

          {activeTab === 'notifications' && SAMPLE_NOTIFICATIONS.map(notif => (
            <motion.div
              key={notif.id}
              className={`p-4 ${!notif.read ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  notif.priority === 'high' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Bell size={18} style={{ color: notif.priority === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.softBlue }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{notif.title}</span>
                    <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{notif.time}</span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{notif.message}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Chat/Conversation Panel */}
      <main className={`${!showMobileConversation ? 'hidden' : 'block'} md:flex-1 flex flex-col`} style={{ backgroundColor: KAYAD_COLORS.white }}>
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileConversation(false)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronLeft size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                </button>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                  {selectedConversation.avatar}
                </div>
                <div>
                  <h2 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{selectedConversation.sender}</h2>
                  <div className="flex items-center gap-2">
                    {getContextIcon(selectedConversation.contextType)}
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{selectedConversation.subject}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <Phone size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <Video size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <MoreVertical size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {SAMPLE_MESSAGES.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.senderType === 'user'
                      ? 'rounded-br-md'
                      : 'rounded-bl-md'
                  }`} style={{ backgroundColor: msg.senderType === 'user' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.warmBeige }}>
                    <p className="text-sm" style={{ color: msg.senderType === 'user' ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy }}>
                      {msg.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="text-xs" style={{ color: msg.senderType === 'user' ? 'rgba(255,255,255,0.7)' : KAYAD_COLORS.softBlue }}>
                        {msg.time}
                      </span>
                      {msg.senderType === 'user' && (
                        msg.status === 'read' 
                          ? <CheckCircle size={14} style={{ color: KAYAD_COLORS.emerald }} />
                          : <CheckCircle size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
              <div className="flex items-center gap-3">
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <Paperclip size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-full border outline-none"
                  style={{ borderColor: KAYAD_COLORS.warmBeige }}
                />
                <button
                  className="p-3 rounded-full"
                  style={{ backgroundColor: KAYAD_COLORS.emerald }}
                >
                  <Send size={20} color={KAYAD_COLORS.white} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <MessageSquare size={40} style={{ color: KAYAD_COLORS.softBlue }} />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                Select a conversation
              </h2>
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
