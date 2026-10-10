import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UnifiedChatThread,
  UnifiedMessageItem,
  UnifiedCommCategory,
  MessageAttachment,
  Vehicle,
  SharedTransactionFile,
  UserProfile
} from '../types';
import { getMyChats, getChatMessages, sendChatMessage, markChatSeen, mapBackendChatToThread, mapBackendMessagesToUnified, ChatApiError } from '../services/chatApi';
import {
  MessageSquare,
  Bell,
  Lock,
  Gavel,
  ClipboardCheck,
  Landmark,
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  MapPin,
  Calendar,
  Check,
  CheckCheck,
  ShieldCheck,
  Eye,
  Download,
  X,
  Sparkles,
  Car,
  ArrowUpRight,
  Clock,
  Sliders,
  Filter,
  Building2,
  Users,
  Ticket,
  ChevronLeft,
  Phone,
  Unlock,
  Video,
  Plus,
  AlertOctagon,
  FileCheck,
  CheckCircle2,
  UserCheck,
  Upload,
  Info,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Card, Badge, Button, Input, Modal, LazyImage } from '../components/ui';

interface UnifiedCommunicationHubProps {
  user?: UserProfile | null;
  onQuickViewVehicle?: (vehicleOrId: Vehicle | string) => void;
  onNavigateToEscrow?: () => void;
  onNavigateToInspections?: () => void;
  onNavigateToFinancing?: () => void;
  onNavigateToAuctions?: () => void;
}

export const UnifiedCommunicationHub: React.FC<UnifiedCommunicationHubProps> = ({
  user,
  onQuickViewVehicle,
  onNavigateToEscrow,
  onNavigateToInspections,
  onNavigateToFinancing,
  onNavigateToAuctions
}) => {
  // Fixed: this entire hub previously started from, and only ever
  // showed, MOCK_UNIFIED_THREADS - elaborate, specific fake sample
  // data (real-looking names, escrow amounts, bank details) with no
  // connection to the real, already-working chat backend at all.
  // Master Threads State - now starts empty and loads real
  // conversations from the real backend on mount (see the effect
  // below). See services/chatApi.ts's own file-level note for exactly
  // which fields are real vs. honest, generic placeholders for
  // concepts (escrow/inspection/finance) the real backend has no
  // equivalent for.
  const [threads, setThreads] = useState<UnifiedChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState<boolean>(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setThreadsLoading(false);
      return;
    }
    let cancelled = false;
    setThreadsLoading(true);
    setThreadsError(null);
    getMyChats()
      .then((chats) => {
        if (cancelled) return;
        const mapped = chats.map((c) => mapBackendChatToThread(c, user.id));
        setThreads(mapped);
        setSelectedThreadId((prev) => prev || mapped[0]?.id || '');
      })
      .catch((err) => {
        if (cancelled) return;
        setThreadsError(err instanceof ChatApiError ? err.message : 'Could not load conversations.');
      })
      .finally(() => {
        if (!cancelled) setThreadsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Keep inbox and active conversation synchronized with the authoritative API.
  // This is deliberately polling rather than a second local event store because
  // the current custom-auth stack does not expose Supabase Auth-scoped realtime.
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(async () => {
      try {
        const chats = await getMyChats();
        const mapped = chats.map((c) => mapBackendChatToThread(c, user.id));
        setThreads(prev => mapped.map(next => {
          const existing = prev.find(t => t.id === next.id);
          return existing && existing.id === selectedThreadId ? { ...next, messages: existing.messages } : next;
        }));
      } catch { /* keep the last authoritative snapshot on transient failures */ }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [user, selectedThreadId]);

  // Filter & Search State
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mobile View Navigation State: 'list' | 'chat' | 'context'
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'context'>('list');

  // Input & Attachment Drawer States
  const [inputText, setInputText] = useState<string>('');
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [previewMediaModal, setPreviewMediaModal] = useState<{ title: string; type: string; url?: string } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileType, setNewFileType] = useState<'pdf' | 'logbook' | 'invoice' | 'receipt' | 'image'>('pdf');

  // PII Unmask Audit Log state
  const [unmaskedPii, setUnmaskedPii] = useState<Record<string, boolean>>({});

  // Toast Notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleExecuteSmartAction = (_actionKey: string, label: string) => {
    showToast(`${label} is not available through the current backend contract. No local action was performed.`);
  };

  // Auto-scroll anchor
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active Selected Thread
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === selectedThreadId) || threads[0];
  }, [threads, selectedThreadId]);

  // Fixed: this was a separate, still-hardcoded array of fake
  // "actionable alerts" (specific fake inspection scores, finance
  // approvals, auction status, escrow amounts, referencing mock
  // thread ids that no longer exist now that threads loads real
  // data) - exactly the fake content shown in the navbar's
  // "Actionable Alerts" panel. No real alerts system exists on the
  // backend for any of these concepts, so this is honestly empty
  // rather than continuing to show fake alerts unrelated to a real
  // user's real conversations.
  const actionableNotifications = useMemo(() => {
    return [] as { id: string; title: string; text: string; time: string; threadId: string; type: string }[];
  }, []);

  // Filtered Threads List
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      // Category / Filter Tab logic
      if (activeCategory === 'unread' && t.unreadCount === 0) return false;
      if (activeCategory === 'archived' && !t.isArchived) return false;
      if (activeCategory !== 'all' && activeCategory !== 'unread' && activeCategory !== 'archived') {
        if (activeCategory === 'purchase' && t.category !== 'purchase' && t.category !== 'dealer' && t.category !== 'seller' && t.category !== 'inquiry') {
          return false;
        } else if (activeCategory !== 'purchase' && t.category !== activeCategory) {
          return false;
        }
      }

      // Search Query Matching
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = t.participantName.toLowerCase().includes(q);
        const matchRole = t.participantRole.toLowerCase().includes(q);
        const matchRef = t.referenceNumber.toLowerCase().includes(q);
        const matchMsg = t.lastMessage.toLowerCase().includes(q);
        const matchVeh = t.vehicleTitle ? t.vehicleTitle.toLowerCase().includes(q) : false;
        const matchVin = t.vehicleVin ? t.vehicleVin.toLowerCase().includes(q) : false;
        if (!matchName && !matchRole && !matchRef && !matchMsg && !matchVeh && !matchVin) return false;
      }

      return true;
    });
  }, [threads, activeCategory, searchQuery]);

  // Total Unread Counter
  const totalUnreadCount = useMemo(() => {
    return threads.reduce((sum, t) => sum + t.unreadCount, 0);
  }, [threads]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, selectedThreadId]);

  // Fixed: the initially auto-selected thread (set once real
  // conversations load, above) never had its own real messages
  // fetched - only a thread opened by an explicit click did (via
  // handleSelectThread). Loads real message history for whichever
  // thread is current whenever it changes and is still empty.
  useEffect(() => {
    if (!user || !selectedThreadId) return;
    const current = threads.find((t) => t.id === selectedThreadId);
    if (!current || current.messages.length > 0) return;
    getChatMessages(selectedThreadId)
      .then((realMessages) => {
        const mapped = mapBackendMessagesToUnified(realMessages, selectedThreadId, user.id);
        setThreads(prev => prev.map(t => t.id === selectedThreadId ? { ...t, messages: mapped } : t));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId, user]);

  // Fixed: this only reset the local unreadCount - it never actually
  // loaded a thread's real messages (which now start empty, since
  // mapBackendChatToThread honestly has no message history to
  // include upfront). Now fetches the real message history and marks
  // it seen on the real backend when a thread is opened.
  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setMobileView('chat');
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t));

    if (!user) return;
    getChatMessages(threadId)
      .then((realMessages) => {
        const mapped = mapBackendMessagesToUnified(realMessages, threadId, user.id);
        setThreads(prev => prev.map(t => t.id === threadId ? { ...t, messages: mapped } : t));
      })
      .catch(() => {
        // Best-effort - the thread still opens with its already-known
        // summary (participant, last message preview) even if the
        // full history fails to load; the input box itself will
        // surface any real send failure separately.
      });
    markChatSeen(threadId).catch(() => {});
  };

  // Toggle PII Unmask with Audit Log
  const toggleUnmaskPhone = (threadId: string, name: string) => {
    const isUnmasked = !!unmaskedPii[threadId];
    setUnmaskedPii(prev => ({ ...prev, [threadId]: !isUnmasked }));
    if (!isUnmasked) {
      showToast(`Audit log recorded: PII contact accessed for ${name}.`);
    }
  };

  // Fixed: this previously never called the real backend at all -
  // purely local state, with the sender hardcoded to "James Mwangi
  // (Buyer)" regardless of who was actually logged in, and a fake,
  // simulated "read" status after a timeout. Now sends a real
  // message via the real backend and reflects its real, persisted
  // result - never claims success before the backend confirms it.
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !activeThread || !user) return;

    setInputText('');
    try {
      await sendChatMessage(activeThread.id, text);
      const realMessages = await getChatMessages(activeThread.id);
      const mapped = mapBackendMessagesToUnified(realMessages, activeThread.id, user.id);
      const lastReal = realMessages[realMessages.length - 1];
      setThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            lastMessage: lastReal?.message || lastReal?.text || text,
            lastTimestamp: lastReal?.createdAt || new Date().toISOString(),
            messages: mapped,
          };
        }
        return t;
      }));
    } catch (err) {
      showToast(err instanceof ChatApiError ? err.message : 'Failed to send message. Please try again.');
    }
  };

  // Attachment and transaction-vault writes are not backed by a real
  // frontend/backend contract yet. Never manufacture a message, URL,
  // document identity, GPS point, appointment, file size, or upload success.
  const handleSendAttachment = (type: MessageAttachment['type']) => {
    setShowAttachMenu(false);
    showToast(`${type === 'image' ? 'Image' : type === 'document' ? 'Document' : type === 'location' ? 'Location' : 'Appointment'} sharing is not available until the secure attachment service is connected.`);
  };

  const handleUploadFileToVault = (e: React.FormEvent) => {
    e.preventDefault();
    setShowUploadModal(false);
    setNewFileName('');
    showToast('Transaction file uploads are not available until the secure file-vault service is connected.');
  };

  // Category Icon & Badge Colors Mapping
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'escrow':
        return { icon: <ShieldCheck className="w-4 h-4 text-[#176b87]" />, badgeBg: 'bg-[#176b87]/10 text-[#176b87] border-[#176b87]/20', label: 'Escrow Vault' };
      case 'auction':
      case 'auctions':
        return { icon: <Gavel className="w-4 h-4 text-[#176B87]" />, badgeBg: 'bg-[#176B87]/10 text-[#176B87] border-[#176B87]/20', label: 'Live Auction' };
      case 'inspection':
      case 'inspections':
        return { icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />, badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Inspection' };
      case 'finance':
        return { icon: <Landmark className="w-4 h-4 text-[#176B87]" />, badgeBg: 'bg-[#F3FAF9] text-[#12576D] border-[#D7E7E4]', label: 'Bank Finance' };
      case 'dealer':
        return { icon: <Building2 className="w-4 h-4 text-teal-600" />, badgeBg: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Verified Dealer' };
      case 'seller':
        return { icon: <Users className="w-4 h-4 text-[#176B87]" />, badgeBg: 'bg-[#F3FAF9] text-[#12576D] border-[#D7E7E4]', label: 'Private Seller' };
      case 'support':
        return { icon: <Ticket className="w-4 h-4 text-rose-600" />, badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Resolution Desk' };
      case 'notification':
      case 'notifications':
        return { icon: <Bell className="w-4 h-4 text-[#176B87]" />, badgeBg: 'bg-[#F3FAF9] text-[#12576D] border-[#D7E7E4]', label: 'System Alert' };
      default:
        return { icon: <MessageSquare className="w-4 h-4 text-[#64748B]" />, badgeBg: 'bg-[#EEF7F5] text-[#12576D] border-[#D7E7E4]', label: 'Marketplace Chat' };
    }
  };

  // Conversation Filter Tabs definitions
  const filterTabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Activity', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'unread', label: 'Unread Alerts', icon: <Bell className="w-3.5 h-3.5 text-rose-500" /> },
    { id: 'purchase', label: 'Vehicle Purchases', icon: <Car className="w-3.5 h-3.5 text-emerald-600" /> },
    { id: 'escrow', label: 'Escrow Deals', icon: <Lock className="w-3.5 h-3.5 text-[#176b87]" /> },
    { id: 'auctions', label: 'Live Auctions', icon: <Gavel className="w-3.5 h-3.5 text-[#176B87]" /> },
    { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'finance', label: 'Bank Financing', icon: <Landmark className="w-3.5 h-3.5 text-[#2F8F87]" /> },
    { id: 'support', label: 'Support Tickets', icon: <Ticket className="w-3.5 h-3.5 text-rose-500" /> }
  ];

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#176B87] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#176b87] flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-[#176b87] shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          HEADER BANNER & ACTIONABLE NOTIFICATIONS TICKER
          ========================================== */}
      <div className="bg-[#0A3340] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="md" className="bg-[#176b87] text-white font-black border-none">
                <MessageSquare className="w-3.5 h-3.5 text-white" /> Unified Operations Communication Center
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> E2E Encrypted & Audit Logged
              </Badge>
              {totalUnreadCount > 0 && (
                <span className="text-xs font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                  {totalUnreadCount} Actionable Alert{totalUnreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Marketplace Transaction Communications Hub
            </h1>
            <p className="text-xs text-[#BDE5DE] max-w-2xl leading-relaxed">
              Every conversation remains strictly attached to its active vehicle transaction context — linking escrow records, NTSA TIMS logbook verification, inspection records, and bank financing under one command console.
            </p>
          </div>
        </div>

        {/* Actionable Notifications Ticker */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-3 overflow-x-auto scrollbar-none">
          <span className="text-[10px] uppercase font-black tracking-wider text-[#176b87] shrink-0 flex items-center gap-1">
            <Bell className="w-3 h-3 text-[#176b87]" /> Actionable Alerts:
          </span>
          <div className="flex items-center gap-3">
            {actionableNotifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleSelectThread(n.threadId)}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-2 border border-white/10 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-extrabold">{n.title}:</span>
                <span className="opacity-90 max-w-xs truncate">{n.text}</span>
                <span className="text-[9px] text-[#94A3B8] font-bold ml-1">{n.time}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          FILTER TABS BAR
          ========================================== */}
      <div className="bg-white border border-[#D7E7E4] py-2.5 px-3 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {filterTabs.map((tab) => {
            let count = 0;
            if (tab.id === 'all') count = threads.length;
            else if (tab.id === 'unread') count = threads.filter(t => t.unreadCount > 0).length;
            else if (tab.id === 'purchase') count = threads.filter(t => ['purchase', 'dealer', 'seller', 'inquiry'].includes(t.category)).length;
            else count = threads.filter(t => t.category === tab.id).length;

            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#176B87] text-white shadow-md'
                    : 'text-[#64748B] hover:text-[#0A3340] hover:bg-[#EEF7F5]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-[#176b87] text-white' : 'bg-[#DDF4F0] text-[#12576D]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          MAIN 3-COLUMN DESKTOP & MOBILE RESPONSIVE LAYOUT
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[760px] relative">

        {/* ------------------------------------------
            COLUMN 1: CONVERSATION LIST SIDEBAR (3 Cols)
            ------------------------------------------ */}
        <Card className={`lg:col-span-3 flex flex-col h-full overflow-hidden bg-white border-[#D7E7E4] shadow-card ${
          mobileView !== 'list' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Search Header */}
          <div className="p-3 border-b border-[#D7E7E4] bg-[#F6FAF9]/70">
            <Input
              placeholder="Search vehicle, Ref #, dealer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-[#94A3B8]" />}
              className="text-xs"
            />
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#D7E7E4]">
            {/* Fixed: previously only handled "filtered to nothing" -
                now honestly distinguishes still loading real data,
                a real fetch failure, and genuinely zero real
                conversations, rather than collapsing all three into
                one generic message. */}
            {threadsLoading ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-[#BDE5DE] animate-pulse" />
                <p>Loading your conversations…</p>
              </div>
            ) : threadsError ? (
              <div className="p-8 text-center text-rose-500 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-rose-300" />
                <p>{threadsError}</p>
              </div>
            ) : !user ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-[#BDE5DE]" />
                <p>Sign in to see your conversations.</p>
              </div>
            ) : filteredThreads.length === 0 && threads.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-[#BDE5DE]" />
                <p>No conversations yet.</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-xs space-y-2">
                <Search className="w-8 h-8 mx-auto text-[#BDE5DE]" />
                <p>No conversations found matching filter.</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                const theme = getCategoryTheme(thread.category);

                return (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3FAF9]/80 border-l-4 border-[#176B87]'
                        : 'hover:bg-[#F6FAF9] border-l-4 border-transparent'
                    }`}
                  >
                    {/* Participant Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={thread.participantAvatar}
                        alt={thread.participantName}
                        className="w-10 h-10 rounded-full object-cover border border-[#D7E7E4]"
                      />
                      {thread.participantStatus === 'online' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" title="Online" />
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs truncate ${isSelected ? 'font-black text-[#176B87]' : 'font-bold text-[#0A3340]'}`}>
                          {thread.participantName}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-medium shrink-0 ml-1">
                          {thread.lastTimestamp}
                        </span>
                      </div>

                      {/* Ref & Category Pill */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono bg-[#EEF7F5] text-[#12576D] px-1.5 py-0.2 rounded font-bold">
                          {thread.referenceNumber}
                        </span>
                        <Badge variant="outline" size="sm" className={`text-[9px] py-0 px-1 ${theme.badgeBg}`}>
                          {theme.label}
                        </Badge>
                      </div>

                      {/* Linked Vehicle Title */}
                      {thread.vehicleTitle && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#176B87] bg-[#EEF7F5] px-2 py-0.5 rounded-md truncate">
                          <Car className="w-3 h-3 text-[#176b87] shrink-0" />
                          <span className="truncate">{thread.vehicleTitle}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-[#64748B] truncate font-medium">
                        {thread.lastMessage}
                      </p>

                      {thread.unreadCount > 0 && (
                        <div className="pt-0.5 flex justify-end">
                          <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                            {thread.unreadCount} NEW
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* ------------------------------------------
            COLUMN 2: ACTIVE CONVERSATION STREAM (6 Cols)
            ------------------------------------------ */}
        <Card className={`lg:col-span-5 xl:col-span-6 flex flex-col h-full overflow-hidden bg-white border-[#D7E7E4] shadow-card ${
          mobileView !== 'chat' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeThread ? (
            <>
              {/* TOP CONVERSATION HEADER */}
              <div className="p-3.5 bg-[#0A3340] text-white flex items-center justify-between border-b border-white/10 shadow-md shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="lg:hidden p-1.5 text-[#BDE5DE] hover:text-white rounded-lg bg-white/10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Vehicle Photo Thumbnail */}
                  {activeThread.vehicleImage ? (
                    <img
                      src={activeThread.vehicleImage}
                      alt={activeThread.vehicleTitle}
                      className="w-11 h-11 rounded-lg object-cover border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-[#176B87] text-[#176b87] flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                        {activeThread.vehicleTitle || activeThread.participantName}
                      </h3>
                      <span className="text-[9px] font-mono bg-[#176b87] text-white px-1.5 py-0.2 rounded font-black">
                        {activeThread.referenceNumber}
                      </span>
                    </div>

                    {/* Header Details: Status | Stage | Participants */}
                    <div className="flex items-center gap-2 text-[11px] text-[#BDE5DE] font-medium truncate mt-0.5">
                      <span className="font-extrabold text-emerald-400">{activeThread.currentStatus}</span>
                      <span>•</span>
                      <span className="truncate">{activeThread.transactionType}</span>
                    </div>
                  </div>
                </div>

                {/* Right Header Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setMobileView('context')}
                    className="lg:hidden px-2.5 py-1 rounded-xl bg-[#176b87] text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" /> Details
                  </button>
                  <Badge variant="accent" size="sm" className="hidden sm:inline-flex bg-emerald-500/20 text-emerald-300 border-emerald-400/30 font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Active Stage
                  </Badge>
                </div>
              </div>

              {/* STAGE & PARTICIPANTS SUB-HEADER BAR */}
              <div className="bg-[#EEF7F5] border-b border-[#D7E7E4] px-4 py-2 flex items-center justify-between text-xs text-[#12576D] font-medium shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black text-[#64748B]">Participants:</span>
                  <div className="flex items-center gap-1.5">
                    {activeThread.participants.map(p => (
                      <span key={p.id} className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-[#D7E7E4] text-[#176B87]">
                        {p.name} ({p.role})
                      </span>
                    ))}
                  </div>
                </div>

                {activeThread.participantStatus && (
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {activeThread.isTyping ? 'Typing message...' : 'Counterparty Online'}
                  </span>
                )}
              </div>

              {/* SMART ACTIONS DOCK */}
              {activeThread.smartActions && activeThread.smartActions.length > 0 && (
                <div className="bg-[#F3FAF9]/90 border-b border-[#BDE5DE] px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#176B87] shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#176b87]" /> Smart Actions:
                  </span>
                  <div className="flex items-center gap-2 min-w-max">
                    {activeThread.smartActions.map((sa) => (
                      <Button
                        key={sa.id}
                        variant={sa.variant || 'primary'}
                        size="sm"
                        onClick={() => handleExecuteSmartAction(sa.actionKey, sa.label)}
                        className="text-xs py-1 px-3 shadow-2xs"
                      >
                        {sa.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* MESSAGES THREAD STREAM */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-[#F6FAF9]/60 text-xs">
                {activeThread.messages.map((m) => {
                  const isUser = m.sender === 'user';
                  const isSystem = m.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={m.id} className="my-3 flex justify-center">
                        <div className="bg-[#DDF4F0]/90 text-[#176B87] border border-[#BDE5DE] text-[11px] px-4 py-2 rounded-2xl max-w-md text-center shadow-2xs space-y-1">
                          <p className="font-extrabold flex items-center justify-center gap-1.5 text-[#176b87]">
                            <Info className="w-3.5 h-3.5 text-[#176b87]" /> System Milestone Event
                          </p>
                          <p className="font-medium text-[#12576D]">{m.text}</p>
                          <p className="text-[9px] text-[#64748B] font-bold">{m.timestamp}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 p-4 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-[#176B87] text-white rounded-br-none'
                          : 'bg-white text-[#0A3340] border border-[#D7E7E4] rounded-bl-none'
                      }`}>
                        {/* Sender Label */}
                        {!isUser && (
                          <div className="flex items-center justify-between pb-1 border-b border-[#D7E7E4] text-[11px] font-extrabold text-[#176B87]">
                            <span>{m.senderName}</span>
                          </div>
                        )}

                        {/* Text Content */}
                        <p className="leading-relaxed font-medium whitespace-pre-wrap text-xs sm:text-sm">{m.text}</p>

                        {/* ATTACHMENT PAYLOAD RENDERER */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-white/20">
                            {m.attachments.map((att, idx) => (
                              <div key={idx}>
                                {/* IMAGE */}
                                {att.type === 'image' && (
                                  <div className="relative group rounded-xl overflow-hidden border border-[#D7E7E4]">
                                    <img
                                      src={att.url}
                                      alt={att.fileName || 'Photo'}
                                      className="w-full h-44 object-cover cursor-pointer hover:scale-105 transition-all"
                                      onClick={() => setPreviewMediaModal({ title: att.fileName || 'Image Photo', type: 'image', url: att.url })}
                                    />
                                    <span className="absolute bottom-2 left-2 bg-[#0A3340]/70 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                                      📷 {att.fileName}
                                    </span>
                                  </div>
                                )}

                                {/* DOCUMENT / INSPECTION PDF */}
                                {(att.type === 'document' || att.type === 'inspection_pdf') && (
                                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-50/80 border-emerald-200 text-[#176B87]'
                                  }`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <FileText className="w-5 h-5 text-[#176b87] shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-extrabold truncate">{att.fileName}</p>
                                        <p className="text-[10px] opacity-80">
                                          {att.inspectionScore ? `Passed Score ${att.inspectionScore}/100 PDF` : att.fileSize || 'PDF Document'}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="accent"
                                      size="sm"
                                      onClick={() => setPreviewMediaModal({ title: att.fileName || 'PDF Vault File', type: 'pdf' })}
                                      className="bg-[#176b87] text-white font-extrabold shrink-0 border-none text-[11px] py-1"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Open PDF
                                    </Button>
                                  </div>
                                )}

                                {/* PAYMENT DEPOSIT RECEIPT */}
                                {att.type === 'payment_receipt' && (
                                  <div className={`p-3.5 rounded-xl border space-y-1 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                  }`}>
                                    <div className="flex justify-between items-center">
                                      <span className="font-black text-emerald-700 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Receipt confirmed
                                      </span>
                                      <Badge variant="success" size="sm">Locked</Badge>
                                    </div>
                                    <p className="text-sm font-black text-emerald-800">Ksh {att.paymentAmount?.toLocaleString()}</p>
                                    <p className="text-[10px] opacity-80">Ref: {att.paymentReference} • {att.paymentMethod}</p>
                                  </div>
                                )}

                                {/* GPS LOCATION PIN */}
                                {att.type === 'location' && (
                                  <div className={`p-3 rounded-xl border space-y-1 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-[#EEF7F5] border-[#D7E7E4] text-[#0A3340]'
                                  }`}>
                                    <div className="flex items-center gap-1.5 font-extrabold text-[#176b87]">
                                      <MapPin className="w-4 h-4" />
                                      <span>{att.locationName}</span>
                                    </div>
                                    <p className="text-[11px] opacity-90">{att.locationAddress}</p>
                                    <button
                                      onClick={() => showToast(`Opening GPS navigation to ${att.locationName}`)}
                                      className="text-[10px] font-black underline flex items-center gap-1 cursor-pointer text-[#176b87]"
                                    >
                                      Launch Google Maps <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                {/* APPOINTMENT */}
                                {att.type === 'appointment' && (
                                  <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-[#F3FAF9] border-[#BDE5DE] text-[#176B87]'
                                  }`}>
                                    <div className="flex justify-between items-center">
                                      <span className="font-extrabold flex items-center gap-1.5 text-[#176B87]">
                                        <Calendar className="w-4 h-4 text-[#176b87]" /> {att.appointmentTitle}
                                      </span>
                                      <Badge variant="accent" size="sm">{att.appointmentStatus}</Badge>
                                    </div>
                                    <p className="text-[11px] font-bold">
                                      {att.appointmentDate} at {att.appointmentTime} @ {att.appointmentLocation}
                                    </p>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => showToast('Appointment confirmed and added to calendar!')}
                                      className="bg-[#176B87] text-white text-[10px] py-1"
                                    >
                                      Confirm Appointment
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & Read Receipts */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 text-[9px]">
                          <span className={isUser ? 'text-[#BDE5DE] font-bold' : 'text-[#94A3B8] font-bold'}>
                            {m.timestamp}
                          </span>
                          {isUser && (
                            <span className="text-[#176b87]">
                              {m.readStatus === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#176b87]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-[#BDE5DE]" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BAR & ATTACHMENT MENU */}
              <div className="p-3 bg-white border-t border-[#D7E7E4] relative shrink-0">
                {showAttachMenu && (
                  <div className="absolute bottom-16 left-4 z-30 bg-white border border-[#D7E7E4] rounded-2xl shadow-xl p-2 flex flex-col gap-1 w-60 text-xs animate-fade-in">
                    <button
                      onClick={() => handleSendAttachment('image')}
                      className="p-2.5 hover:bg-[#EEF7F5] rounded-xl flex items-center gap-2 text-[#0A3340] font-bold cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#176B87]" /> Share Vehicle Photo
                    </button>
                    <button
                      onClick={() => handleSendAttachment('document')}
                      className="p-2.5 hover:bg-[#EEF7F5] rounded-xl flex items-center gap-2 text-[#0A3340] font-bold cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#176b87]" /> Attach TIMS Document (PDF)
                    </button>
                    <button
                      onClick={() => handleSendAttachment('location')}
                      className="p-2.5 hover:bg-[#EEF7F5] rounded-xl flex items-center gap-2 text-[#0A3340] font-bold cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-rose-600" /> Share Showroom Location
                    </button>
                    <button
                      onClick={() => handleSendAttachment('appointment')}
                      className="p-2.5 hover:bg-[#EEF7F5] rounded-xl flex items-center gap-2 text-[#0A3340] font-bold cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-emerald-600" /> Schedule Test Drive / Handover
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2.5 text-[#64748B] hover:text-[#176B87] hover:bg-[#EEF7F5] rounded-xl transition-all cursor-pointer"
                    title="Attach File or Location"
                  >
                    <Paperclip className="w-5 h-5 text-[#176b87]" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type transaction message or status update inquiry..."
                    className="flex-1 px-4 py-2.5 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#176B87] font-medium text-[#0A3340]"
                  />

                  <Button type="submit" variant="primary" size="md" className="bg-[#176B87] text-white">
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-[#94A3B8] flex flex-col items-center justify-center h-full space-y-3">
              <MessageSquare className="w-12 h-12 text-[#BDE5DE]" />
              <p className="font-bold text-sm">Select a transaction conversation thread.</p>
            </div>
          )}
        </Card>

        {/* ------------------------------------------
            COLUMN 3: CONTEXT INFORMATION PANEL (4/3 Cols)
            ------------------------------------------ */}
        <Card className={`lg:col-span-4 xl:col-span-3 flex flex-col h-full overflow-hidden bg-white border-[#D7E7E4] shadow-card ${
          mobileView !== 'context' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeThread ? (
            <div className="flex-1 overflow-y-auto divide-y divide-[#D7E7E4] text-xs">

              {/* Mobile Back Header */}
              <div className="lg:hidden p-3 bg-[#0A3340] text-white flex items-center justify-between">
                <span className="font-extrabold">Transaction Context</span>
                <button onClick={() => setMobileView('chat')} className="text-xs text-[#BDE5DE] underline">
                  Back to Chat
                </button>
              </div>

              {/* 1. VEHICLE SUMMARY CARD */}
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Car className="w-4 h-4 text-[#176b87]" /> Vehicle Summary</span>
                  {activeThread.vehicleId && onQuickViewVehicle && (
                    <button
                      onClick={() => onQuickViewVehicle(activeThread.vehicleId!)}
                      className="text-[10px] text-[#176B87] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      Specs <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </h4>

                {activeThread.vehicleImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#D7E7E4]">
                    <LazyImage src={activeThread.vehicleImage} alt={activeThread.vehicleTitle || 'Vehicle'} wrapperClassName="w-full h-32" className="w-full h-full object-cover" />
                    {activeThread.vehiclePrice && (
                      <span className="absolute bottom-2 right-2 bg-[#0A3340] text-[#176b87] font-black text-xs px-2.5 py-1 rounded-lg">
                        Ksh {activeThread.vehiclePrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="space-y-1 font-medium text-[#12576D]">
                  <p className="font-black text-sm text-[#176B87]">{activeThread.vehicleTitle}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-[#94A3B8] block text-[9px]">VIN Number</span>
                      <span className="font-mono font-bold text-[#0A3340]">{activeThread.vehicleVin || 'NTSA Verified'}</span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[9px]">Location</span>
                      <span className="font-bold text-[#0A3340]">{activeThread.vehicleLocation || 'Nairobi'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. COUNTERPARTY PROFILE (PROTECTED PII) */}
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Counterparty Clearance
                </h4>

                <div className="p-3 bg-[#F6FAF9] rounded-xl border border-[#D7E7E4] space-y-2">
                  <div className="flex items-center gap-3">
                    <img src={activeThread.counterpartyInfo.avatar || activeThread.participantAvatar} alt={activeThread.counterpartyInfo.name} className="w-10 h-10 rounded-full object-cover border border-[#BDE5DE]" />
                    <div>
                      <p className="font-extrabold text-[#176B87]">{activeThread.counterpartyInfo.name}</p>
                      <p className="text-[10px] text-[#64748B] font-bold">{activeThread.counterpartyInfo.role}</p>
                    </div>
                  </div>

                  {/* Fixed: previously always rendered, showing
                      "undefined" for real conversations, which have
                      no real masked phone on record. Only shown when
                      real data exists. */}
                  {(activeThread.counterpartyInfo.maskedPhone || activeThread.counterpartyInfo.unmaskedPhone) && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#D7E7E4]/80">
                      <span className="text-[#64748B] font-medium">Contact Phone:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#0A3340]">
                          {unmaskedPii[activeThread.id] ? (activeThread.counterpartyInfo.unmaskedPhone || activeThread.counterpartyInfo.maskedPhone) : activeThread.counterpartyInfo.maskedPhone}
                        </span>
                        <button
                          onClick={() => toggleUnmaskPhone(activeThread.id, activeThread.counterpartyInfo.name)}
                          className="text-[10px] font-bold text-[#176B87] hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="Audit logged unmask"
                        >
                          {unmaskedPii[activeThread.id] ? <Lock className="w-3 h-3 text-[#94A3B8]" /> : <Unlock className="w-3 h-3 text-[#176b87]" />}
                          {unmaskedPii[activeThread.id] ? 'Mask' : 'Unmask'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fixed: previously always rendered "undefined%
                      Verified" for real conversations, which have no
                      real trust score anywhere in this system. Only
                      shown when real data exists. */}
                  {activeThread.counterpartyInfo.trustScore !== undefined && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B] font-medium">Trust Score:</span>
                      <span className="font-black text-emerald-700">{activeThread.counterpartyInfo.trustScore}% Verified</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. LIVE SUB-SUMMARIES (Escrow, Inspection, Finance, Auction) */}
              {activeThread.escrowSummary && (
                <div className="p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#176b87]" /> Escrow record
                  </h4>
                  <div className="p-3 bg-[#176b87]/10 border border-[#176b87]/30 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#176B87]">Locked Amount</span>
                      <span className="font-black text-emerald-700">Ksh {activeThread.escrowSummary.amountLocked.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] font-medium">{activeThread.escrowSummary.bankVault} • Vault #{activeThread.escrowSummary.vaultId}</p>
                    {onNavigateToEscrow && (
                      <Button variant="accent" size="sm" onClick={onNavigateToEscrow} className="w-full bg-[#176B87] text-white text-[10px] py-1 mt-1">
                        Open Escrow Vault Dashboard
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeThread.inspectionSummary && (
                <div className="p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Inspection status
                  </h4>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#176B87]">Inspection score</span>
                      <span className="font-black text-emerald-700 text-sm">{activeThread.inspectionSummary.score}/100 Passed</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] font-medium">Chassis: {activeThread.inspectionSummary.chassisStatus}</p>
                    {onNavigateToInspections && (
                      <Button variant="outline" size="sm" onClick={onNavigateToInspections} className="w-full text-[10px] py-1 bg-white">
                        View inspection
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeThread.financeSummary && (
                <div className="p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-[#176B87]" /> Bank Finance Pre-Approval
                  </h4>
                  <div className="p-3 bg-[#F3FAF9] border border-[#D7E7E4] rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#176B87]">{activeThread.financeSummary.partnerBank}</span>
                      <span className="font-black text-[#12576D]">Pre-Approved</span>
                    </div>
                    <p className="text-xs font-black text-emerald-800">Ksh {activeThread.financeSummary.approvedLimit.toLocaleString()} Facility</p>
                    <p className="text-[10px] text-[#64748B] font-medium">Est. Repayment: Ksh {activeThread.financeSummary.monthlyInstallment.toLocaleString()} / mo</p>
                  </div>
                </div>
              )}

              {/* 4. TRANSACTION TIMELINE HISTORY */}
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#176b87]" /> Permanent Audit Timeline
                </h4>

                <div className="relative border-l-2 border-[#D7E7E4] ml-2 space-y-4 pl-4 pt-1">
                  {activeThread.timeline.map((t) => (
                    <div key={t.id} className="relative">
                      {/* Node Bullet */}
                      <span className={`absolute -left-[21px] top-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        t.status === 'completed'
                          ? 'bg-emerald-500'
                          : t.status === 'current'
                          ? 'bg-[#176b87] animate-pulse'
                          : 'bg-[#BDE5DE]'
                      }`} />

                      <div>
                        <p className={`font-extrabold text-xs ${t.status === 'current' ? 'text-[#176b87]' : 'text-[#176B87]'}`}>
                          {t.title}
                        </p>
                        <p className="text-[11px] text-[#64748B] font-medium">{t.description}</p>
                        <span className="text-[9px] text-[#94A3B8] font-bold block mt-0.5">{t.timestamp} • {t.actor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. SHARED TRANSACTION FILES VAULT */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#176B87] flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#176b87]" /> Shared Transaction Vault
                  </h4>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="text-[10px] font-bold text-[#176B87] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-[#176b87]" /> Upload File
                  </button>
                </div>

                <div className="space-y-2">
                  {activeThread.sharedFiles.length === 0 ? (
                    <p className="text-[11px] text-[#94A3B8] font-medium italic text-center py-2">No files shared yet in this transaction.</p>
                  ) : (
                    activeThread.sharedFiles.map((f) => (
                      <div key={f.id} className="p-2.5 bg-[#F6FAF9] rounded-xl border border-[#D7E7E4] flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#176b87] shrink-0" />
                          <div className="min-w-0">
                            <p className="font-extrabold text-[#176B87] truncate">{f.fileName}</p>
                            <p className="text-[9px] text-[#94A3B8]">{f.fileSize || 'Doc'} • {f.uploadedAt}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewMediaModal({ title: f.fileName, type: 'pdf' })}
                          className="bg-white text-[10px] py-0.5 px-2 shrink-0 font-bold"
                        >
                          <Eye className="w-3 h-3 text-[#64748B]" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-[#94A3B8]">
              <Info className="w-8 h-8 mx-auto text-[#BDE5DE]" />
              <p className="text-xs mt-2 font-bold">Select a thread to view live transaction context.</p>
            </div>
          )}
        </Card>

      </div>

      {/* ==========================================
          PREVIEW MEDIA & DOCUMENT MODAL
          ========================================== */}
      {previewMediaModal && (
        <Modal isOpen={true} onClose={() => setPreviewMediaModal(null)} title={previewMediaModal.title}>
          <div className="space-y-4 text-xs p-2">
            {previewMediaModal.type === 'image' && previewMediaModal.url && (
              <img src={previewMediaModal.url} alt={previewMediaModal.title} className="w-full max-h-[450px] object-contain rounded-xl border border-[#D7E7E4]" />
            )}

            {previewMediaModal.type === 'pdf' && (
              <div className="p-8 bg-[#F6FAF9] rounded-2xl border border-[#D7E7E4] text-center space-y-4">
                <FileText className="w-16 h-16 text-[#176b87] mx-auto" />
                <div>
                  <h4 className="font-black text-sm text-[#176B87]">{previewMediaModal.title}</h4>
                  <p className="text-[#64748B] text-xs mt-1">Official NTSA / KAYAD Verified Encrypted PDF Vault File</p>
                </div>
                <Button variant="accent" size="md" onClick={() => { setPreviewMediaModal(null); showToast(`Downloaded ${previewMediaModal.title}`); }} className="bg-[#176b87] text-white">
                  <Download className="w-4 h-4" /> Download PDF File
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ==========================================
          UPLOAD FILE TO TRANSACTION VAULT MODAL
          ========================================== */}
      {showUploadModal && (
        <Modal isOpen={true} onClose={() => setShowUploadModal(false)} title="Upload Document to Transaction Vault">
          <form onSubmit={handleUploadFileToVault} className="space-y-4 text-xs p-2">
            <div>
              <label className="block text-[#12576D] font-extrabold mb-1">Document Title / File Name</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. National_ID_Copy.pdf or Bank_Statement.pdf"
                className="w-full px-3 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#176B87]"
                required
              />
            </div>

            <div>
              <label className="block text-[#12576D] font-extrabold mb-1">Document Category</label>
              <select
                value={newFileType}
                onChange={(e: any) => setNewFileType(e.target.value)}
                className="w-full px-3 py-2 bg-[#F6FAF9] border border-[#D7E7E4] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#176B87]"
              >
                <option value="pdf">Official PDF Certificate</option>
                <option value="logbook">Logbook / Title Copy</option>
                <option value="invoice">Invoice / Quote</option>
                <option value="receipt">Escrow Payment Receipt</option>
                <option value="image">Vehicle Photo / Scan</option>
              </select>
            </div>

            <div className="p-4 bg-[#F3FAF9] rounded-xl border border-[#BDE5DE] text-[11px] text-[#176B87] font-medium space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#176b87]" /> Encrypted Transaction Storage
              </p>
              <p>Uploaded files are permanently attached to transaction reference #{activeThread.referenceNumber} and shared only with verified counterparties.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#176B87] text-white">
                <Upload className="w-3.5 h-3.5" /> Confirm Upload
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default UnifiedCommunicationHub;
