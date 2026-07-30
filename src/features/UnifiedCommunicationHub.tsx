import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  UnifiedChatThread, 
  UnifiedMessageItem, 
  UnifiedCommCategory, 
  MessageAttachment, 
  Vehicle 
} from '../types';
import { MOCK_UNIFIED_THREADS } from '../data/mockUnifiedCommunication';
import { 
  MessageSquare, 
  Bell, 
  Lock, 
  Gavel, 
  ClipboardCheck, 
  Landmark, 
  Megaphone, 
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
  ChevronRight, 
  Eye, 
  Download, 
  X, 
  Sparkles, 
  Car, 
  ArrowUpRight,
  Clock,
  ExternalLink,
  Sliders,
  Filter
} from 'lucide-react';
import { Card, Badge, Button, Input, Modal } from '../components/ui';

interface UnifiedCommunicationHubProps {
  onQuickViewVehicle?: (vehicleOrId: Vehicle | string) => void;
  onNavigateToEscrow?: () => void;
  onNavigateToInspections?: () => void;
  onNavigateToFinancing?: () => void;
}

export const UnifiedCommunicationHub: React.FC<UnifiedCommunicationHubProps> = ({
  onQuickViewVehicle,
  onNavigateToEscrow,
  onNavigateToInspections,
  onNavigateToFinancing
}) => {
  // Master Threads State
  const [threads, setThreads] = useState<UnifiedChatThread[]>(MOCK_UNIFIED_THREADS);

  // Active Selected Thread
  const [selectedThreadId, setSelectedThreadId] = useState<string>(MOCK_UNIFIED_THREADS[0].id);

  // Active Category Filter Tab
  const [activeCategory, setActiveCategory] = useState<UnifiedCommCategory | 'all'>('all');

  // Search Query Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Message Input Text
  const [inputText, setInputText] = useState<string>('');

  // Attachment Drawer & Modal States
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [previewMediaModal, setPreviewMediaModal] = useState<{ title: string; type: string; url?: string } | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-scroll messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find Currently Active Thread
  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === selectedThreadId) || threads[0];
  }, [threads, selectedThreadId]);

  // Filtered Threads List
  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Category Filter
      if (activeCategory !== 'all' && thread.category !== activeCategory) {
        return false;
      }
      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = thread.participantName.toLowerCase().includes(q);
        const matchMsg = thread.lastMessage.toLowerCase().includes(q);
        const matchVeh = thread.vehicleTitle ? thread.vehicleTitle.toLowerCase().includes(q) : false;
        if (!matchName && !matchMsg && !matchVeh) return false;
      }
      return true;
    });
  }, [threads, activeCategory, searchQuery]);

  // Total Unread Count
  const totalUnreadCount = useMemo(() => {
    return threads.reduce((sum, t) => sum + t.unreadCount, 0);
  }, [threads]);

  // Auto Scroll down on active thread change or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, selectedThreadId]);

  // Handle Mark Thread as Read
  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return { ...t, unreadCount: 0 };
      }
      return t;
    }));
  };

  // Handle Send Text Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeThread) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: UnifiedMessageItem = {
      id: `msg-${Date.now()}`,
      threadId: activeThread.id,
      category: activeThread.category,
      sender: 'user',
      senderName: 'Buyer (You)',
      text: inputText.trim(),
      timestamp: timeString,
      readStatus: 'sent',
      vehicleId: activeThread.vehicleId,
      vehicleTitle: activeThread.vehicleTitle
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          lastMessage: inputText.trim(),
          lastTimestamp: timeString,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    setInputText('');

    // Simulate auto read receipt update (sent -> delivered -> read) after 1.5s
    setTimeout(() => {
      setThreads(prev => prev.map(t => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: t.messages.map(m => m.id === newMsg.id ? { ...m, readStatus: 'read' } : m)
          };
        }
        return t;
      }));
    }, 1500);
  };

  // Send Attachment Simulation (Image, Document, Location, Appointment)
  const handleSendAttachment = (type: MessageAttachment['type']) => {
    if (!activeThread) return;
    setShowAttachMenu(false);
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let attachmentPayload: MessageAttachment;
    let textSummary = '';

    if (type === 'image') {
      attachmentPayload = {
        type: 'image',
        fileName: 'Vehicle_Logbook_Scan.jpg',
        url: activeThread.vehicleImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800'
      };
      textSummary = 'Sent an image attachment.';
    } else if (type === 'document') {
      attachmentPayload = {
        type: 'document',
        fileName: 'NTSA_TIMS_Ownership_Certificate.pdf',
        fileSize: '2.1 MB',
        url: '#'
      };
      textSummary = 'Shared official document PDF.';
    } else if (type === 'location') {
      attachmentPayload = {
        type: 'location',
        locationName: 'AutoCheck Inspection Center Nairobi',
        locationAddress: 'Commercial Street, Industrial Area, Nairobi',
        lat: -1.302,
        lng: 36.834
      };
      textSummary = 'Shared GPS Location Pin.';
    } else {
      attachmentPayload = {
        type: 'appointment',
        appointmentTitle: 'Logbook & Vehicle Inspection Verification',
        appointmentDate: '2026-07-31',
        appointmentTime: '11:30 AM',
        appointmentLocation: 'NCBA Bank Custody Vault, Nairobi',
        appointmentStatus: 'Pending'
      };
      textSummary = 'Proposed an appointment schedule.';
    }

    const newMsg: UnifiedMessageItem = {
      id: `msg-${Date.now()}`,
      threadId: activeThread.id,
      category: activeThread.category,
      sender: 'user',
      senderName: 'Buyer (You)',
      text: textSummary,
      timestamp: timeString,
      readStatus: 'read',
      attachments: [attachmentPayload]
    };

    setThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          lastMessage: textSummary,
          lastTimestamp: timeString,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    showToast(`Shared ${type.toUpperCase()} attachment in conversation.`);
  };

  // Category Tabs Definition with Icons & Counters
  const categoryTabs: { id: UnifiedCommCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Activity', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'messages', label: 'Buyer & Seller Chats', icon: <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> },
    { id: 'escrow', label: 'Escrow Vault Updates', icon: <Lock className="w-3.5 h-3.5 text-amber-500" /> },
    { id: 'auctions', label: 'Auction Bids & Alerts', icon: <Gavel className="w-3.5 h-3.5 text-[#1E3063]" /> },
    { id: 'inspections', label: '150-Point Inspection', icon: <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'finance', label: 'Bank Loan Updates', icon: <Landmark className="w-3.5 h-3.5 text-indigo-500" /> },
    { id: 'notifications', label: 'Push Alerts', icon: <Bell className="w-3.5 h-3.5 text-purple-500" /> },
    { id: 'announcements', label: 'System & Legal', icon: <Megaphone className="w-3.5 h-3.5 text-rose-500" /> },
    { id: 'saved_searches', label: 'Saved Search Alerts', icon: <Search className="w-3.5 h-3.5 text-teal-500" /> }
  ];

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          HEADER & UNIFIED COMMUNICATION BANNER
          ========================================== */}
      <div className="bg-gradient-to-r from-[#101935] via-[#1E3063] to-[#101935] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-400/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
                <MessageSquare className="w-3.5 h-3.5 text-[#17244B]" /> Unified Communication Hub
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Encrypted & Audited
              </Badge>
              {totalUnreadCount > 0 && (
                <span className="text-xs font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-pulse">
                  {totalUnreadCount} Unread Alert{totalUnreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Centralized Marketplace Communications
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every message, escrow milestone, auction bid, 150-point mechanic update, and bank financing pre-approval remains strictly linked to its vehicle context.
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          CATEGORY FILTER TABS (8 Feature Areas + All)
          ========================================== */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 py-2.5 px-3 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {categoryTabs.map((tab) => {
            const count = tab.id === 'all' 
              ? threads.length 
              : threads.filter(t => t.category === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-[#1E3063] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id ? 'bg-amber-400 text-[#17244B]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          MAIN TWO-COLUMN CHAT LAYOUT
          ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        
        {/* LEFT SIDEBAR: Threads List (4 Cols) */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden bg-white border-slate-200 shadow-card">
          {/* Sidebar Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <Input
              placeholder="Search chats, vehicles, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              className="text-xs"
            />
          </div>

          {/* Threads List Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-300" />
                <p>No conversations found matching criteria.</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === selectedThreadId;
                return (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-50/90 border-l-4 border-[#1E3063]' 
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    {/* Participant Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={thread.participantAvatar}
                        alt={thread.participantName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs"
                      />
                      {thread.participantVerified && (
                        <CheckCircle2Icon />
                      )}
                    </div>

                    {/* Content Snippet */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs truncate ${isSelected ? 'font-black text-[#1E3063]' : 'font-bold text-slate-800'}`}>
                          {thread.participantName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                          {thread.lastTimestamp}
                        </span>
                      </div>

                      {/* Linked Vehicle Tag */}
                      {thread.vehicleTitle && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md truncate">
                          <Car className="w-3 h-3 text-amber-700 shrink-0" />
                          <span className="truncate">{thread.vehicleTitle}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {thread.lastMessage}
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <Badge variant="outline" size="sm" className="text-[9px] capitalize py-0">
                          {thread.category.replace('_', ' ')}
                        </Badge>
                        {thread.unreadCount > 0 && (
                          <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full">
                            {thread.unreadCount} NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* RIGHT PANE: Active Thread Stream & Context (8 Cols) */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden bg-white border-slate-200 shadow-card">
          {activeThread ? (
            <>
              {/* TOP PARTICIPANT HEADER */}
              <div className="p-4 bg-[#101935] text-white flex items-center justify-between border-b border-amber-400/20 shadow-md">
                <div className="flex items-center gap-3">
                  <img
                    src={activeThread.participantAvatar}
                    alt={activeThread.participantName}
                    className="w-10 h-10 rounded-full object-cover border border-amber-400/40"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-white">{activeThread.participantName}</h3>
                      {activeThread.participantVerified && (
                        <Badge variant="verified" size="sm" className="py-0 px-1.5 text-[9px]">Verified</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium">{activeThread.participantRole}</p>
                  </div>
                </div>

                <Badge variant="accent" size="sm" className="capitalize bg-amber-400 text-[#101935] font-black">
                  {activeThread.category.replace('_', ' ')} Thread
                </Badge>
              </div>

              {/* LINKED CONTEXT BANNER (Vehicle, Escrow, Inspection, Loan) */}
              <div className="bg-amber-50/80 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {activeThread.vehicleImage ? (
                    <img
                      src={activeThread.vehicleImage}
                      alt={activeThread.vehicleTitle}
                      className="w-12 h-10 rounded-lg object-cover border border-amber-300 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#1E3063] text-amber-400 flex items-center justify-center font-bold">
                      <Car className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-800">
                      Linked Vehicle Context:
                    </span>
                    <p className="font-extrabold text-[#1E3063]">
                      {activeThread.vehicleTitle || 'General Platform Service Request'}
                    </p>
                    {activeThread.vehiclePrice && (
                      <p className="font-black text-emerald-700">Ksh {activeThread.vehiclePrice.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Context Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeThread.vehicleId && onQuickViewVehicle && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onQuickViewVehicle(activeThread.vehicleId!)}
                      className="bg-white hover:bg-slate-100 text-xs py-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" /> Vehicle Specs
                    </Button>
                  )}

                  {activeThread.escrowId && onNavigateToEscrow && (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={onNavigateToEscrow}
                      className="bg-[#1E3063] text-white hover:bg-[#101935] text-xs py-1"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> Escrow Vault
                    </Button>
                  )}

                  {activeThread.inspectionId && onNavigateToInspections && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateToInspections}
                      className="bg-white hover:bg-slate-100 text-xs py-1"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" /> 150-Pt Audit
                    </Button>
                  )}

                  {activeThread.loanAppRef && onNavigateToFinancing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateToFinancing}
                      className="bg-white hover:bg-slate-100 text-xs py-1"
                    >
                      <Landmark className="w-3.5 h-3.5 text-blue-600" /> Bank Underwriting
                    </Button>
                  )}
                </div>
              </div>

              {/* MESSAGES THREAD STREAM */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
                {activeThread.messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] space-y-2 p-4 rounded-2xl shadow-xs ${
                        isUser 
                          ? 'bg-[#1E3063] text-white rounded-br-none' 
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                      }`}>
                        {/* Sender Label for Non-user */}
                        {!isUser && (
                          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-extrabold text-[#1E3063]">
                            <span>{m.senderName}</span>
                          </div>
                        )}

                        {/* Main Message Text */}
                        <p className="leading-relaxed font-medium whitespace-pre-wrap">{m.text}</p>

                        {/* ATTACHMENTS PAYLOAD RENDERER */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-white/20">
                            {m.attachments.map((att, idx) => (
                              <div key={idx}>
                                {/* 1. IMAGE ATTACHMENT */}
                                {att.type === 'image' && (
                                  <div className="relative group rounded-xl overflow-hidden border border-white/20">
                                    <img
                                      src={att.url}
                                      alt={att.fileName || 'Attachment'}
                                      className="w-full h-40 object-cover cursor-pointer hover:scale-105 transition-all"
                                      onClick={() => setPreviewMediaModal({ title: att.fileName || 'Image Attachment', type: 'image', url: att.url })}
                                    />
                                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                                      📷 {att.fileName}
                                    </span>
                                  </div>
                                )}

                                {/* 2. DOCUMENT ATTACHMENT (PDF, Logbook) */}
                                {att.type === 'document' && (
                                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-amber-50 border-amber-200 text-[#1E3063]'
                                  }`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-extrabold truncate">{att.fileName}</p>
                                        <p className="text-[10px] opacity-80">{att.fileSize || 'PDF Document'}</p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="accent"
                                      size="sm"
                                      onClick={() => setPreviewMediaModal({ title: att.fileName || 'PDF Document', type: 'pdf' })}
                                      className="bg-amber-400 text-[#17244B] font-extrabold shrink-0"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Open
                                    </Button>
                                  </div>
                                )}

                                {/* 3. LOCATION SHARING */}
                                {att.type === 'location' && (
                                  <div className={`p-3 rounded-xl border space-y-2 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                                  }`}>
                                    <div className="flex items-center gap-2 font-extrabold text-amber-500">
                                      <MapPin className="w-4 h-4" />
                                      <span>{att.locationName}</span>
                                    </div>
                                    <p className="text-[11px] opacity-90">{att.locationAddress}</p>
                                    <button
                                      onClick={() => showToast(`Opened GPS Navigation to ${att.locationName}`)}
                                      className="text-[10px] font-black underline flex items-center gap-1 cursor-pointer text-amber-400"
                                    >
                                      Launch Google Maps <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}

                                {/* 4. APPOINTMENT CONFIRMATION */}
                                {att.type === 'appointment' && (
                                  <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                                    isUser ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                  }`}>
                                    <div className="flex justify-between items-center">
                                      <span className="font-extrabold flex items-center gap-1.5 text-emerald-700">
                                        <Calendar className="w-4 h-4" /> {att.appointmentTitle}
                                      </span>
                                      <Badge variant="success" size="sm">{att.appointmentStatus}</Badge>
                                    </div>
                                    <div className="text-[11px] space-y-0.5 font-medium">
                                      <p>Date & Time: <strong>{att.appointmentDate} at {att.appointmentTime}</strong></p>
                                      <p>Venue: {att.appointmentLocation}</p>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                      <Button
                                        variant="accent"
                                        size="sm"
                                        onClick={() => showToast('Appointment confirmed & added to calendar!')}
                                        className="bg-emerald-600 text-white text-[11px] py-1"
                                      >
                                        Confirm Appointment
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timestamp & Read Receipt */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 text-[9px]">
                          <span className={isUser ? 'text-slate-300 font-bold' : 'text-slate-400 font-bold'}>
                            {m.timestamp}
                          </span>
                          {isUser && (
                            <span className="text-amber-400">
                              {m.readStatus === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
                              ) : m.readStatus === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-slate-300" />
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

              {/* BOTTOM INPUT BAR & ATTACHMENT MENU */}
              <div className="p-3 bg-white border-t border-slate-200 relative">
                {/* Attachment Type Selector Popover */}
                {showAttachMenu && (
                  <div className="absolute bottom-16 left-4 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 flex flex-col gap-1 w-56 text-xs animate-fade-in">
                    <button
                      onClick={() => handleSendAttachment('image')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-slate-800 font-bold cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-blue-600" /> Upload Image / Photo
                    </button>
                    <button
                      onClick={() => handleSendAttachment('document')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-slate-800 font-bold cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-amber-600" /> Attach Document (PDF)
                    </button>
                    <button
                      onClick={() => handleSendAttachment('location')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-slate-800 font-bold cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-rose-600" /> Share GPS Showroom Location
                    </button>
                    <button
                      onClick={() => handleSendAttachment('appointment')}
                      className="p-2.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 text-slate-800 font-bold cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-emerald-600" /> Schedule Test Drive / Inspection
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2.5 text-slate-500 hover:text-[#1E3063] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                    title="Attach Media or Location"
                  >
                    <Paperclip className="w-5 h-5 text-amber-600" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type message or status inquiry..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3063] font-medium text-slate-800"
                  />

                  <Button type="submit" variant="primary" size="md" className="bg-[#1E3063] text-white">
                    <Send className="w-4 h-4" /> Send
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <p className="font-bold text-sm">Select a conversation thread to view activity stream.</p>
            </div>
          )}
        </Card>
      </div>

      {/* ==========================================
          MEDIA PREVIEW MODAL
          ========================================== */}
      {previewMediaModal && (
        <Modal isOpen={true} onClose={() => setPreviewMediaModal(null)} title={previewMediaModal.title}>
          <div className="space-y-4 text-xs p-2">
            {previewMediaModal.type === 'image' && previewMediaModal.url && (
              <img src={previewMediaModal.url} alt={previewMediaModal.title} className="w-full max-h-[450px] object-contain rounded-xl border border-slate-200" />
            )}

            {previewMediaModal.type === 'pdf' && (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
                <FileText className="w-16 h-16 text-amber-500 mx-auto" />
                <div>
                  <h4 className="font-black text-sm text-[#1E3063]">{previewMediaModal.title}</h4>
                  <p className="text-slate-500 text-xs mt-1">Official NTSA / KAYAD Verified Encrypted PDF Vault File</p>
                </div>
                <Button variant="accent" size="md" onClick={() => { setPreviewMediaModal(null); showToast(`Downloaded ${previewMediaModal.title}`); }}>
                  <Download className="w-4 h-4" /> Download PDF Document
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

function CheckCircle2Icon() {
  return (
    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
      <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-100" />
    </div>
  );
}

export default UnifiedCommunicationHub;
