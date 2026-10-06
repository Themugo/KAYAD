import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Gavel,
  Landmark,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  UserRound,
} from 'lucide-react';
import { PageHeader, Card, Select, Textarea, Button } from '../components/ui';
import SupportFAQ from './SupportFAQ';
import {
  addSupportTicketMessage,
  createSupportTicket,
  getMySupportTickets,
  getSupportTicket,
  rateSupportTicket,
  SupportApiError,
  SupportTicket,
} from '../services/supportApi';
import { UserProfile } from '../types';

interface SupportViewProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onNavigate?: (target: string) => void;
}

const STATUS_META: Record<string, { label: string; tone: string }> = {
  open: { label: 'Open', tone: 'bg-sky-50 text-sky-700 border-sky-100' },
  in_progress: { label: 'In progress', tone: 'bg-[#EEF7F5] text-[#176B87] border-[#D7E7E4]' },
  waiting_on_user: { label: 'Waiting for you', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  waiting_on_internal: { label: 'With KAYAD', tone: 'bg-[#EEF7F5] text-[#176B87] border-[#D7E7E4]' },
  escalated: { label: 'Escalated', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
  resolved: { label: 'Resolved', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  closed: { label: 'Closed', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const HELP_PATHS = [
  { id: 'marketplace', icon: Car, title: 'Buying & selling', text: 'Listing, seller, vehicle or transaction questions.', nav: 'gallery' },
  { id: 'auction', icon: Gavel, title: 'Auctions', text: 'Bidding, auction outcomes and bidder access.', nav: 'auctions' },
  { id: 'inspection', icon: ClipboardCheck, title: 'Inspection', text: 'Orders, providers, reports and inspection findings.', nav: 'inspections' },
  { id: 'escrow', icon: LockKeyhole, title: 'Escrow & payments', text: 'Funding, release, disputes, refunds and payout questions.', nav: 'escrow' },
  { id: 'financing', icon: Landmark, title: 'Financing', text: 'Application guidance and lender-process questions.', nav: 'financing' },
  { id: 'account', icon: UserRound, title: 'Account & access', text: 'Sign-in, missing transactions and account access.', nav: 'profile' },
];

const CATEGORY_OPTIONS = [
  { value: 'marketplace', label: 'Marketplace / vehicle' },
  { value: 'auction', label: 'Auction / bidding' },
  { value: 'inspection', label: 'Pre-purchase inspection' },
  { value: 'escrow', label: 'Escrow / payment / refund' },
  { value: 'financing', label: 'Financing' },
  { value: 'transfer', label: 'Ownership / transfer' },
  { value: 'seller', label: 'Seller / dealer' },
  { value: 'account', label: 'Account / access' },
  { value: 'technical', label: 'Technical problem' },
];

function formatDate(value?: string) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function ticketReference(ticket: SupportTicket) {
  return ticket.ticketNumber || `Case ${ticket.id.slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value?: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export const SupportView: React.FC<SupportViewProps> = ({ user, onOpenAuth, onNavigate }) => {
  const formRef = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState('escrow');
  const [reference, setReference] = useState('');
  const [issue, setIssue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketMessage, setTicketMessage] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingNote, setRatingNote] = useState('');
  const [ratingSending, setRatingSending] = useState(false);
  const userId = user?.id;

  const loadTickets = async () => {
    if (!user) return;
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const result = await getMySupportTickets();
      setTickets(result.tickets || []);
    } catch (error) {
      if (error instanceof SupportApiError && error.kind === 'unauthenticated') {
        onOpenAuth?.();
      } else {
        setTicketsError(error instanceof SupportApiError ? error.message : 'Unable to load your support cases.');
      }
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [userId]);

  const loadTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setTicketLoading(true);
    setMessageError(null);
    try {
      const result = await getSupportTicket(ticketId);
      setSelectedTicket(result.ticket);
      setRating(result.ticket.satisfactionRating || null);
    } catch (error) {
      setMessageError(error instanceof SupportApiError ? error.message : 'Unable to load this support case.');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;
    if (!user) {
      onOpenAuth?.();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const description = reference.trim()
        ? `Reference: ${reference.trim()}\n\n${issue.trim()}`
        : issue.trim();
      const result = await createSupportTicket({
        category,
        subject: issue.trim().slice(0, 80),
        description,
      });
      setSubmittedTicket(result.ticket);
      setIssue('');
      setReference('');
      await loadTickets();
    } catch (error) {
      if (error instanceof SupportApiError && error.kind === 'unauthenticated') {
        onOpenAuth?.();
      } else {
        setSubmitError(error instanceof SupportApiError ? error.message : 'Could not submit your case. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !ticketMessage.trim()) return;
    setMessageSending(true);
    setMessageError(null);
    try {
      const result = await addSupportTicketMessage(selectedTicket.id, ticketMessage.trim());
      setSelectedTicket(result.ticket);
      setTicketMessage('');
      await loadTickets();
    } catch (error) {
      setMessageError(error instanceof SupportApiError ? error.message : 'Could not send your message.');
    } finally {
      setMessageSending(false);
    }
  };

  const submitRating = async () => {
    if (!selectedTicket || !rating) return;
    setRatingSending(true);
    setMessageError(null);
    try {
      const result = await rateSupportTicket(selectedTicket.id, rating, ratingNote.trim() || undefined);
      setSelectedTicket(result.ticket);
      await loadTickets();
    } catch (error) {
      setMessageError(error instanceof SupportApiError ? error.message : 'Could not save your feedback.');
    } finally {
      setRatingSending(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const openPath = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
      return;
    }
    window.location.href = `/?nav=${encodeURIComponent(target)}`;
  };

  const activeCases = useMemo(() => tickets.filter(ticket => !['resolved', 'closed'].includes(ticket.status)), [tickets]);

  return (
    <div className="space-y-6 pb-12">
      {/* Premium support command header */}
      <section className="rounded-[30px] overflow-hidden border border-[#D7E7E4] bg-white shadow-sm">
        <div className="bg-[#0A3340] px-5 py-7 sm:px-8 sm:py-8 text-white relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full border border-white/5" />
          <div className="absolute right-8 bottom-[-100px] w-56 h-56 rounded-full bg-[#13B8A6]/10 blur-3xl" />
          <div className="relative z-10 max-w-4xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9BE5D9]">
              <LifeBuoy className="w-4 h-4" /> KAYAD Resolution Center
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.02]">Help that follows the whole transaction.</h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base leading-6 text-slate-300">Find an answer, open a traceable support case, or continue an existing case. One support surface for vehicles, auctions, inspections, escrow, financing, transfers and account access.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={scrollToForm} className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0A3340] px-4 py-3 text-xs font-extrabold hover:bg-[#EEF7F5] transition-colors">
                Open a support case <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => document.getElementById('support-cases')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl border border-white/20 text-white px-4 py-3 text-xs font-extrabold hover:bg-white/10 transition-colors">
                {user ? 'View my cases' : 'Sign in to track cases'} <Ticket className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
          {[
            { icon: Search, title: 'Find an answer', text: 'Search verified help' },
            { icon: Ticket, title: 'Open a case', text: 'Create a traceable request' },
            { icon: MessageSquare, title: 'Continue the case', text: 'Reply from your account' },
            { icon: ShieldCheck, title: 'Reach resolution', text: 'Status and SLA stay visible' },
          ].map(item => (
            <div key={item.title} className="px-4 py-4 sm:px-5">
              <item.icon className="w-4 h-4 text-[#176B87]" />
              <p className="mt-2 text-xs font-extrabold text-[#0A3340]">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Whole-business entry points */}
      <section aria-labelledby="support-paths-heading">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#176B87]">Where do you need help?</p>
            <h2 id="support-paths-heading" className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#0A3340]">Start with the part of KAYAD you are using.</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {HELP_PATHS.map(path => (
            <button key={path.id} type="button" onClick={() => openPath(path.nav)} className="group text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-[#176B87]/30 hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF7F5] text-[#176B87] flex items-center justify-center shrink-0"><path.icon className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#0A3340]">{path.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{path.text}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#176B87] mt-1" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <SupportFAQ onContactSupport={scrollToForm} onNavigate={openPath} onOpenAuth={onOpenAuth} />

      {/* Case creation + current cases */}
      <section id="support-cases" ref={formRef} className="grid grid-cols-1 xl:grid-cols-[1.05fr_.95fr] gap-5 scroll-mt-24">
        <Card className="p-5 sm:p-6 bg-white border-slate-200">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#176B87]"><Ticket className="w-3.5 h-3.5" /> Resolution desk</div>
              <h2 className="mt-1 text-xl font-black text-[#0A3340]">Open a support case</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Tell us what happened and include the vehicle, auction, inspection or escrow reference when you have one.</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><Clock3 className="w-3.5 h-3.5 text-[#176B87]" /> 1h first-response target</div>
          </div>

          {!user ? (
            <div className="rounded-2xl border border-[#D7E7E4] bg-[#F6FAF9] p-5">
              <UserRound className="w-6 h-6 text-[#176B87]" />
              <h3 className="mt-3 text-sm font-extrabold text-[#0A3340]">Sign in to create and track a case</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Support cases are tied to your authenticated account so replies and transaction references stay with the right customer.</p>
              <Button variant="primary" size="md" className="mt-4" onClick={() => onOpenAuth?.()}>Sign in</Button>
            </div>
          ) : submittedTicket ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              <p className="mt-3 text-sm font-extrabold text-emerald-900">Case created</p>
              <p className="mt-1 text-xs text-emerald-800">Reference: <strong>{ticketReference(submittedTicket)}</strong></p>
              <p className="mt-2 text-xs leading-5 text-emerald-800">Your case is now in the KAYAD support workflow. The backend records a 1-hour first-response target and a 24-hour resolution target for new cases.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={() => loadTicket(submittedTicket.id)}>View case</Button>
                <Button variant="outline" size="sm" onClick={() => setSubmittedTicket(null)}>Open another case</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{submitError}</div>}
              <Select label="What is the issue about?" value={category} onChange={e => setCategory(e.target.value)} options={CATEGORY_OPTIONS} />
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reference (optional)</label>
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Vehicle, auction, inspection or escrow reference" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-[#176B87] focus:ring-2 focus:ring-[#176B87]/10" />
              </div>
              <Textarea label="What happened?" rows={6} value={issue} onChange={e => setIssue(e.target.value)} placeholder="Explain the problem, what you expected, and what you need resolved…" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-500">Do not send passwords, OTPs or unnecessary financial credentials in a support description.</p>
                <Button type="submit" variant="primary" size="md" disabled={submitting || !issue.trim()}>{submitting ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating case…</span> : 'Create support case'}</Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-5 sm:p-6 bg-white border-slate-200" id="my-cases">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#176B87]"><MessageSquare className="w-3.5 h-3.5" /> Your cases</div>
              <h2 className="mt-1 text-xl font-black text-[#0A3340]">Track support to resolution</h2>
            </div>
            {user && <button type="button" onClick={() => void loadTickets()} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#176B87] hover:border-[#176B87]/30" aria-label="Refresh support cases"><RefreshCw className={`w-4 h-4 ${ticketsLoading ? 'animate-spin' : ''}`} /></button>}
          </div>

          {!user ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center">
              <Ticket className="w-7 h-7 mx-auto text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-600">Your cases appear here after sign in.</p>
            </div>
          ) : ticketsLoading && tickets.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading your cases…</div>
          ) : ticketsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{ticketsError}</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl bg-[#F6FAF9] border border-[#D7E7E4] p-6 text-center">
              <LifeBuoy className="w-7 h-7 mx-auto text-[#176B87]" />
              <p className="mt-2 text-sm font-extrabold text-[#0A3340]">No support cases yet</p>
              <p className="mt-1 text-xs text-slate-500">When you open one, its status, messages and resolution history will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeCases.length > 0 && <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active</p>}
              {tickets.map(ticket => {
                const status = STATUS_META[ticket.status] || { label: ticket.status, tone: 'bg-slate-100 text-slate-600 border-slate-200' };
                return (
                  <button key={ticket.id} type="button" onClick={() => void loadTicket(ticket.id)} className={`w-full text-left rounded-2xl border p-4 hover:border-[#176B87]/30 hover:shadow-sm transition-all ${selectedTicketId === ticket.id ? 'border-[#176B87]/40 bg-[#F6FAF9]' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#176B87]">{ticketReference(ticket)}</p>
                        <p className="mt-1 text-sm font-extrabold text-[#0A3340] truncate">{ticket.subject}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{ticket.category || 'Support'} · {formatDate(ticket.createdAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.tone}`}>{status.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {/* Selected case detail */}
      {selectedTicketId && (
        <section className="rounded-[26px] border border-[#D7E7E4] bg-white shadow-sm overflow-hidden scroll-mt-24">
          <div className="px-5 sm:px-6 py-5 bg-[#F6FAF9] border-b border-[#D7E7E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#176B87]">Support case</p>
              <h2 className="mt-1 text-lg font-black text-[#0A3340]">{selectedTicket ? ticketReference(selectedTicket) : 'Loading case…'}</h2>
            </div>
            {selectedTicket && <span className={`self-start sm:self-auto rounded-full border px-3 py-1 text-[10px] font-bold ${(STATUS_META[selectedTicket.status] || STATUS_META.open).tone}`}>{(STATUS_META[selectedTicket.status] || { label: selectedTicket.status }).label}</span>}
          </div>

          {ticketLoading || !selectedTicket ? (
            <div className="py-12 text-center text-xs text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading case history…</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
              <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Original request</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="mt-5 space-y-3">
                  {(selectedTicket.messages || []).filter(message => !message.isInternal).map((message, index) => (
                    <div key={`${message.createdAt || 'message'}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#176B87]">{message.senderRole === 'user' || message.senderRole === 'customer' ? 'You' : 'KAYAD Support'}</span><span className="text-[10px] text-slate-400">{formatDate(message.createdAt)}</span></div>
                      <p className="text-sm leading-6 text-slate-700 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ))}
                </div>

                {!['closed', 'resolved'].includes(selectedTicket.status) && (
                  <div className="mt-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Reply to this case</label>
                    <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} rows={4} placeholder="Add information or reply to the support team…" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#176B87] focus:ring-2 focus:ring-[#176B87]/10" />
                    {messageError && <p className="mt-2 text-xs font-semibold text-rose-700">{messageError}</p>}
                    <div className="mt-2 flex justify-end"><Button variant="primary" size="sm" disabled={messageSending || !ticketMessage.trim()} onClick={() => void sendMessage()}>{messageSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Send reply</>}</Button></div>
                  </div>
                )}
              </div>

              <aside className="p-5 sm:p-6 space-y-5">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Case timing</p>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Created</span><strong className="text-slate-700">{formatDate(selectedTicket.createdAt)}</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">First response target</span><strong className="text-slate-700">{selectedTicket.sla?.firstResponseTarget ? formatDateTime(selectedTicket.sla.firstResponseTarget) : '1 hour'}</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Resolution target</span><strong className="text-slate-700">{selectedTicket.sla?.resolutionTarget ? formatDateTime(selectedTicket.sla.resolutionTarget) : '24 hours'}</strong></div>
                  </div>
                </div>

                {['resolved', 'closed'].includes(selectedTicket.status) && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">How was the resolution?</p>
                    <div className="mt-3 flex gap-2">
                      {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRating(value)} className={`w-9 h-9 rounded-xl text-xs font-extrabold ${rating === value ? 'bg-[#176B87] text-white' : 'bg-slate-100 text-slate-500 hover:bg-[#EEF7F5] hover:text-[#176B87]'}`}>{value}</button>)}
                    </div>
                    <textarea value={ratingNote} onChange={e => setRatingNote(e.target.value)} rows={3} placeholder="Optional feedback" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#176B87]" />
                    <Button variant="outline" size="sm" className="mt-2 w-full" disabled={!rating || ratingSending} onClick={() => void submitRating()}>{ratingSending ? 'Saving…' : 'Save feedback'}</Button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Need another service?</p>
                  <button type="button" onClick={scrollToForm} className="mt-2 inline-flex items-center gap-2 text-xs font-extrabold text-[#176B87] hover:underline">Open another case <ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </aside>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SupportView;
