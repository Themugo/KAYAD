import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import * as dealerApi from '../../../services/dealerPlatformApi';

/**
 * Reply to a buyer from the lead itself. The server resolves the conversation from the lead (never from the browser), so a dealership
 * can only ever read or write its own buyers' chats; team members need the "talk to buyers" permission.
 */
type Msg = { id?: string; text?: string; message?: string; createdAt?: string; sender?: { id?: string; name?: string } | string };
const senderId = (m: Msg) => (typeof m.sender === 'string' ? m.sender : m.sender?.id);
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`);

export default function LeadConversation({ leadId, buyerId, buyerName, onReplied }: { leadId: string; buyerId?: string; buyerName?: string; onReplied?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const keyRef = useRef<string>(uuid()); // one key per attempt: a retry of the same text cannot double-send
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const body = await dealerApi.getLeadMessages(leadId); setMessages(Array.isArray(body?.messages) ? body.messages : []); }
    catch (e: any) { setError(e?.response?.status === 409 ? 'This enquiry did not start as a chat, so there is no conversation to reply in. Use a note or contact the buyer directly.' : e?.response?.status === 403 ? 'You do not have permission to talk to buyers. Ask the dealership owner for access.' : 'Could not load the conversation. Please try again.'); }
    finally { setLoading(false); }
  }, [leadId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true); setError(null);
    try {
      await dealerApi.sendLeadMessage(leadId, content, keyRef.current);
      keyRef.current = uuid(); setText('');
      await load(); onReplied?.();
    } catch (err: any) {
      setError(err?.response?.status === 423 ? 'This conversation is blocked.' : 'Your reply was not sent. Check your connection and try again; it will not be sent twice.');
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3" data-testid={`lead-conversation-${leadId}`}>
      <p className="mb-2 text-sm font-bold text-[#0A3340]">Conversation{buyerName ? ` with ${buyerName}` : ''}</p>
      {loading ? <div className="flex justify-center py-4" role="status" aria-label="Loading conversation"><Loader2 className="h-5 w-5 animate-spin text-[#176B87]" /></div> : (
        <ul className="max-h-64 space-y-2 overflow-y-auto" aria-label="Messages">
          {messages.length === 0 && !error && <li className="text-sm text-[#475569]">No messages yet.</li>}
          {messages.map((m, i) => {
            const mine = !!buyerId && senderId(m) !== undefined && String(senderId(m)) !== String(buyerId);
            return (
              <li key={m.id || i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${mine ? 'ml-auto bg-[#0A3545] text-white' : 'bg-white text-[#0A3340] border border-[#D7E7E4]'}`}>
                <span className="whitespace-pre-wrap break-words">{m.text || m.message}</span>
                {m.createdAt && <span className={`mt-0.5 block text-[10px] ${mine ? 'text-white/70' : 'text-[#64748B]'}`}>{new Date(m.createdAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
              </li>
            );
          })}
          <div ref={endRef} />
        </ul>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg border border-[#FDA29B] bg-[#FEF3F2] p-2 text-sm text-[#7A271A]">{error}</p>}
      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1 text-sm font-semibold text-[#0A3340]">
          <span className="sr-only">Your reply</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Write your reply to the buyer" className="w-full rounded-lg border border-[#D7E7E4] bg-white p-2 text-sm font-normal outline-none focus-visible:border-[#176B87]" />
        </label>
        <button type="submit" disabled={sending || !text.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176B87] px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3340]">{sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}Send reply</button>
      </form>
    </div>
  );
}
