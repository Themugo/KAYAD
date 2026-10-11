import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UnifiedChatThread,
  UnifiedMessageItem,
  UnifiedCommCategory,
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
      setSelectedThreadId('');
      setThreadsLoading(false);
      return;
    }
    let cancelled = false;
    // Clear the previous identity's inbox immediately. Never leave another
    // account's conversations visible while the next account is loading.
    setThreads([]);
    setSelectedThreadId('');
    setThreadsLoading(true);
    setThreadsError(null);
    getMyChats()
      .then((chats) => {
        if (cancelled) return;
        const mapped = chats.map((c) => mapBackendChatToThread(c, user.id));
        setThreads(mapped);
        setSelectedThreadId(mapped[0]?.id || '');
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
  const [previewMediaModal, setPreviewMediaModal] = useState<{ title: string; type: string; url?: string } | null>(null);

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

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setMobileView('chat');
  };

  // Load the selected thread and acknowledge read state through the server.
  // Unread counts are only cleared after the persisted read receipt succeeds.
  useEffect(() => {
    if (!user || !selectedThreadId) return;
    const current = threads.find((thread) => thread.id === selectedThreadId);
    if (!current) return;
    let cancelled = false;

    if (current.messages.length === 0) {
      getChatMessages(selectedThreadId)
        .then((realMessages) => {
          if (cancelled) return;
          const mapped = mapBackendMessagesToUnified(realMessages, selectedThreadId, user.id);
          setThreads((prev) => prev.map((thread) => thread.id === selectedThreadId ? { ...thread, messages: mapped } : thread));
        })
        .catch(() => {
          // Keep the thread summary visible; send failures remain explicit.
        });
    }

    markChatSeen(selectedThreadId)
      .then(() => {
        if (!cancelled) setThreads((prev) => prev.map((thread) => thread.id === selectedThreadId ? { ...thread, unreadCount: 0 } : thread));
      })
      .catch(() => {
        // Preserve the unread indicator when the server did not confirm the read receipt.
      });

    return () => { cancelled = true; };
  }, [selectedThreadId, user]);


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

    // Keep the draft until the server confirms the write. A timeout can mean
    // the server committed the message but the response was lost; clearing the
    // composer before confirmation encourages an accidental duplicate retry.
    try {
      const persistedMessage = await sendChatMessage(activeThread.id, text);
      setInputText(current => current === text ? '' : current);
      let realMessages;
      try {
        realMessages = await getChatMessages(activeThread.id);
      } catch {
        // The send was confirmed by the backend. Keep the canonical response
        // visible if the subsequent history refresh fails; do not invite a resend.
        realMessages = [persistedMessage];
      }
      const mapped = mapBackendMessagesToUnified(realMessages, activeThread.id, user.id);
      const lastReal = realMessages[realMessages.length - 1] || persistedMessage;
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

  // The current canonical chat API returns vehicle-linked conversations, not
  // separate escrow/auction/inspection/financing/support inboxes. Keep filters
  // limited to states the persisted chat contract can truthfully support.
  const filterTabs: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All conversations', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'unread', label: 'Unread', icon: <Bell className="w-3.5 h-3.5" /> },
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

      {/* Public-facing inbox header: keep operational controls and unimplemented
          transaction alerts out of the customer communications surface. */}
      <section className="bg-white text-[#0A3340] rounded-3xl p-5 sm:p-7 shadow-sm border border-[#D7E7E4]" aria-labelledby="messages-heading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#176B87]">
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              KAYAD MESSAGES
            </div>
            <h1 id="messages-heading" className="text-2xl sm:text-3xl font-black font-display text-[#0A3340]">
              Your conversations
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Keep your vehicle and marketplace conversations in one place. You’ll only see conversations your account is authorized to access.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0" aria-live="polite">
            <div className="rounded-2xl bg-[#F3FAF9] border border-[#D7E7E4] px-4 py-3 min-w-[104px]">
              <div className="text-[11px] font-semibold text-slate-500">Conversations</div>
              <div className="text-xl font-black text-[#0A3340]">{user ? threads.length : '—'}</div>
            </div>
            <div className="rounded-2xl bg-[#F3FAF9] border border-[#D7E7E4] px-4 py-3 min-w-[88px]">
              <div className="text-[11px] font-semibold text-slate-500">Unread</div>
              <div className="text-xl font-black text-[#0A3340]">{user ? totalUnreadCount : '—'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          FILTER TABS BAR
          ========================================== */}
      <div className="bg-white border border-[#D7E7E4] py-2.5 px-3 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {filterTabs.map((tab) => {
            let count = 0;
            if (tab.id === 'all') count = threads.length;
            else if (tab.id === 'unread') count = threads.filter(t => t.unreadCount > 0).length;

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
                      {thread.participantAvatar ? (
                        <img
                          src={thread.participantAvatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-[#D7E7E4]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#DDF4F0] border border-[#D7E7E4] flex items-center justify-center text-sm font-black text-[#176B87]" aria-label={thread.participantName}>
                          {thread.participantName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
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
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Conversation
                  </Badge>
                </div>
              </div>

              <div className="bg-[#EEF7F5] border-b border-[#D7E7E4] px-4 py-2 text-xs text-[#12576D]">
                Messaging with <span className="font-bold">{activeThread.participantName}</span>
                <span className="text-slate-500"> · {activeThread.participantRole}</span>
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

                        {/* Only render attachments that the current API presents as images with a URL.
                            Other legacy types remain in history but are not represented as verified receipts,
                            appointments, GPS pins or downloadable official documents. */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-2 pt-2">
                            {m.attachments.map((att, idx) => (
                              <div key={`${m.id}-attachment-${idx}`}>
                                {att.type === 'image' && att.url ? (
                                  <div className="rounded-xl overflow-hidden border border-[#D7E7E4]">
                                    <img
                                      src={att.url}
                                      alt={att.fileName || 'Shared image'}
                                      className="w-full max-h-64 object-contain bg-white cursor-pointer"
                                      onClick={() => setPreviewMediaModal({ title: att.fileName || 'Shared image', type: 'image', url: att.url })}
                                    />
                                    {att.fileName && <p className="px-2 py-1 text-[10px] text-slate-500">{att.fileName}</p>}
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-[#D7E7E4] bg-[#F6FAF9] px-3 py-2 text-[11px] text-slate-600">
                                    This attachment type cannot be previewed securely in this inbox yet.
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


                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Write a message..."
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
              <p className="font-bold text-sm">Select a conversation to read and reply.</p>
            </div>
          )}
        </Card>

        {/* Public conversation details: render only listing and participant data
            supplied by the canonical chat API. Do not imply escrow, inspection,
            finance, verification, audit-log or file-vault integrations exist here. */}
        <Card className={`lg:col-span-4 xl:col-span-3 flex flex-col h-full overflow-hidden bg-white border-[#D7E7E4] shadow-card ${
          mobileView !== 'context' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeThread ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
              <div className="lg:hidden flex items-center justify-between border-b border-[#D7E7E4] pb-3">
                <span className="font-bold text-[#0A3340]">Conversation details</span>
                <button onClick={() => setMobileView('chat')} className="text-xs text-[#176B87] underline">Back to messages</button>
              </div>

              <section className="space-y-3">
                <h3 className="font-extrabold text-[#0A3340] flex items-center gap-2"><Car className="w-4 h-4 text-[#176B87]" /> Vehicle listing</h3>
                {activeThread.vehicleImage ? (
                  <LazyImage src={activeThread.vehicleImage} alt={activeThread.vehicleTitle || 'Vehicle listing'} wrapperClassName="w-full h-36 rounded-xl overflow-hidden" className="w-full h-full object-cover" />
                ) : null}
                {activeThread.vehicleTitle ? (
                  <div className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3 space-y-2">
                    <p className="font-bold text-[#0A3340]">{activeThread.vehicleTitle}</p>
                    {typeof activeThread.vehiclePrice === 'number' && (
                      <p className="text-base font-black text-[#176B87]">KES {activeThread.vehiclePrice.toLocaleString()}</p>
                    )}
                    {activeThread.vehicleId && onQuickViewVehicle && (
                      <button onClick={() => onQuickViewVehicle(activeThread.vehicleId!)} className="inline-flex items-center gap-1 text-xs font-bold text-[#176B87] hover:underline">
                        View listing details <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3 text-xs text-slate-600">This conversation is not linked to a vehicle listing.</p>
                )}
              </section>

              <section className="space-y-3 border-t border-[#D7E7E4] pt-4">
                <h3 className="font-extrabold text-[#0A3340] flex items-center gap-2"><Users className="w-4 h-4 text-[#176B87]" /> Conversation with</h3>
                <div className="flex items-center gap-3 rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3">
                  {activeThread.counterpartyInfo.avatar || activeThread.participantAvatar ? (
                    <img src={activeThread.counterpartyInfo.avatar || activeThread.participantAvatar} alt="" className="w-11 h-11 rounded-full object-cover border border-[#D7E7E4]" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#DDF4F0] flex items-center justify-center text-[#176B87] font-black" aria-hidden="true">{activeThread.participantName.slice(0, 1).toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#0A3340] truncate">{activeThread.participantName}</p>
                    <p className="text-xs text-slate-600">{activeThread.participantRole}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-3"><span className="text-slate-500">Conversation ID</span><span className="font-mono text-right text-[#0A3340] break-all">{activeThread.referenceNumber}</span></div>
                  <div className="flex items-start justify-between gap-3"><span className="text-slate-500">Last activity</span><span className="text-right text-[#0A3340]">{activeThread.lastTimestamp ? new Date(activeThread.lastTimestamp).toLocaleString() : 'No message activity yet'}</span></div>
                </div>
              </section>

              <p className="border-t border-[#D7E7E4] pt-4 text-xs leading-relaxed text-slate-500">For escrow, inspections, financing or support cases, use the corresponding KAYAD service. This inbox displays only the conversation and listing information currently available to your account.</p>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Info className="w-8 h-8 mx-auto text-[#176B87]" />
              <p className="text-sm mt-2 font-bold">Choose a conversation to see its details.</p>
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

          </div>
        </Modal>
      )}


    </div>
  );
};

export default UnifiedCommunicationHub;
