import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { MessageSquare, RefreshCw, Search, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

const getId = (value) => String(value?._id || value?.id || '');
const safeDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};
const participantsLabel = (participants, field = 'name') =>
  Array.isArray(participants) ? participants.map((p) => p?.[field]).filter(Boolean).join(' · ') : '';

export default function AdminChatModeration() {
  const { toast } = useToast();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('all');
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [actionId, setActionId] = useState(null);
  const listRequest = useRef(0);
  const messageRequest = useRef(0);
  const currentChatId = useRef('');
  const pageSize = 20;

  const load = useCallback(async () => {
    const requestId = ++listRequest.current;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: pageSize };
      if (search.trim()) params.search = search.trim();
      if (blockedFilter !== 'all') params.isBlocked = blockedFilter === 'blocked';
      const response = await adminAPI.chats(params);
      if (requestId !== listRequest.current) return;
      const data = response?.data ?? response;
      if (!data || !Array.isArray(data.chats) || !data.pagination || !Number.isFinite(Number(data.pagination.total))) {
        throw new Error('The server returned an unexpected chat-list response.');
      }
      setChats(data.chats);
      setTotal(Math.max(0, Number(data.pagination.total)));
      setSelectedChat((current) => {
        if (!current) return current;
        const latest = data.chats.find((chat) => getId(chat) === getId(current));
        return latest || current;
      });
    } catch (err) {
      if (requestId !== listRequest.current) return;
      setError(err?.response?.data?.message || err?.message || 'Chat conversations could not be loaded.');
      toast('Failed to load chats', 'error');
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [page, search, blockedFilter, toast]);

  useEffect(() => { load(); return () => { listRequest.current += 1; }; }, [load]);

  const loadMessages = useCallback(async (chat) => {
    const chatId = getId(chat);
    if (!chatId) {
      setMessagesError('This conversation has no valid identifier.');
      return;
    }
    currentChatId.current = chatId;
    const requestId = ++messageRequest.current;
    setSelectedChat(chat);
    setMessages([]);
    setMessagesError('');
    setMessagesLoading(true);
    try {
      const response = await adminAPI.chatMessages(chatId);
      if (requestId !== messageRequest.current || currentChatId.current !== chatId) return;
      const data = response?.data ?? response;
      if (!data?.chat || !Array.isArray(data.chat.messages)) {
        throw new Error('The server returned an unexpected message response.');
      }
      setSelectedChat((current) => current && getId(current) === chatId ? { ...current, ...data.chat } : current);
      setMessages(data.chat.messages);
    } catch (err) {
      if (requestId !== messageRequest.current || currentChatId.current !== chatId) return;
      setMessagesError(err?.response?.data?.message || err?.message || 'Messages could not be loaded.');
      toast('Failed to load messages', 'error');
    } finally {
      if (requestId === messageRequest.current && currentChatId.current === chatId) setMessagesLoading(false);
    }
  }, [toast]);

  const handleDeleteMessage = async (msgId) => {
    const chatId = getId(selectedChat);
    if (!chatId || !msgId) return toast('Cannot delete a message without a valid identifier', 'error');
    if (!window.confirm('Delete this message? Text will be replaced with "[deleted by admin]".')) return;
    const key = `${chatId}:${msgId}`;
    setActionId(key);
    try {
      await adminAPI.deleteChatMessage(chatId, msgId);
      toast('Message deleted', 'success');
      await loadMessages(selectedChat);
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setActionId(null); }
  };

  const handleBlockToggle = async (chat, block) => {
    const chatId = getId(chat);
    if (!chatId) return toast('Cannot update a conversation without a valid identifier', 'error');
    if (!window.confirm(`${block ? 'Block' : 'Unblock'} this chat?`)) return;
    setActionId(chatId);
    try {
      const response = block ? await adminAPI.blockChat(chatId) : await adminAPI.unblockChat(chatId);
      const data = response?.data ?? response;
      if (data?.success === false) throw new Error(data.message || 'Chat status was not updated.');
      setChats((current) => current.map((item) => getId(item) === chatId ? { ...item, isBlocked: block } : item));
      setSelectedChat((current) => current && getId(current) === chatId ? { ...current, isBlocked: block } : current);
      toast(block ? 'Chat blocked' : 'Chat unblocked', 'success');
      await load();
    } catch (err) {
      toast(err.response?.data?.message || err.message || 'Failed to update chat status', 'error');
    } finally { setActionId(null); }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic', marginBottom: 6 }}>Chat Moderation</h2>
          <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, margin: 0 }}>Read-only conversation review for dispute resolution. Message removal and chat blocking are audited moderation actions.</p>
        </div>
        <div className="admin-chat-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 400px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
          <section style={{ minWidth: 0 }} aria-label="Conversation list">
            <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input aria-label="Search conversations" placeholder="Search participant name/email…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid rgba(10, 51, 64, 0.14)', borderRadius: 8, padding: '10px 12px', color: '#0a3340', fontSize: 13 }} />
              <button type="submit" className="btn btn-outline btn-sm" aria-label="Search"><Search size={15} /></button>
            </form>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
              <select aria-label="Chat status filter" value={blockedFilter} onChange={(e) => { setBlockedFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 0, border: '1px solid rgba(10, 51, 64, 0.14)', borderRadius: 8, padding: '9px 10px', background: '#fff', color: '#0a3340', fontSize: 12 }}>
                <option value="all">All conversations</option><option value="blocked">Blocked</option><option value="unblocked">Not blocked</option>
              </select>
              <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading} aria-label="Refresh conversations"><RefreshCw size={14} /> Refresh</button>
            </div>
            {error && <div role="alert" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 12 }}><strong>Conversations could not be loaded.</strong><div style={{ margin: '5px 0 10px' }}>{error}</div><button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>Retry loading chats</button></div>}
            {loading ? <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : !error && chats.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon"><MessageSquare size={32} aria-hidden="true" /></div><h3>{search ? 'No matching conversations' : 'No chats found'}</h3><p style={{ color: 'var(--admin-muted-content)', fontSize: 12 }}>This is an empty state from a successful response.</p></div>
            ) : !error && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chats.map((chat) => {
                const id = getId(chat);
                return <button type="button" key={id || `${chat.updatedAt}-${participantsLabel(chat.participants)}`} onClick={() => loadMessages(chat)} aria-pressed={getId(selectedChat) === id} style={{ textAlign: 'left', width: '100%', background: getId(selectedChat) === id ? 'rgba(23, 107, 135, 0.08)' : '#fff', border: `1px solid ${getId(selectedChat) === id ? 'rgba(23, 107, 135, 0.3)' : 'rgba(10, 51, 64, 0.09)'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', color: '#0a3340' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 5 }}><span style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{participantsLabel(chat.participants) || 'Unknown participants'}</span>{chat.isBlocked && <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 800 }}>BLOCKED</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--admin-muted-content)', overflowWrap: 'anywhere' }}>{chat.lastMessage?.text?.substring(0, 80) || 'No preview available'} · {safeDate(chat.updatedAt)}</div>
                  {chat.car && <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 5 }}>{chat.car.brand || ''} {chat.car.model || chat.car.title || ''}</div>}
                </button>;
              })}
            </div>}
            {total > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11, color: 'var(--admin-muted-content)' }}><span>Page {page} of {pages} · {total} conversations</span><div style={{ display: 'flex', gap: 6 }}><button type="button" className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((n) => Math.max(1, n - 1))} aria-label="Previous page"><ChevronLeft size={14} /></button><button type="button" className="btn btn-outline btn-sm" disabled={page >= pages || loading} onClick={() => setPage((n) => Math.min(pages, n + 1))} aria-label="Next page"><ChevronRight size={14} /></button></div></div>}
          </section>
          <section style={{ minWidth: 0 }} aria-label="Conversation messages">
            {!selectedChat ? <div className="empty-state" style={{ padding: 64, background: '#fff', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14 }}><div className="empty-icon"><MessageSquare size={32} aria-hidden="true" /></div><h3>Select a conversation</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Choose a chat from the left panel to view messages.</p></div> : <div>
              <div style={{ background: '#fff', border: '1px solid rgba(10, 51, 64, 0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#0a3340', overflowWrap: 'anywhere' }}>{participantsLabel(selectedChat.participants) || 'Conversation participants'}</div><div style={{ fontSize: 11, color: 'var(--admin-muted-content)', overflowWrap: 'anywhere' }}>{participantsLabel(selectedChat.participants, 'email') || 'Contact details unavailable'}</div><div style={{ fontSize: 11, color: 'var(--admin-muted-content)', marginTop: 4 }}>{getId(selectedChat)} {selectedChat.isBlocked ? '· Blocked' : ''}</div></div><button type="button" className={`btn btn-sm ${selectedChat.isBlocked ? 'btn-gold' : 'btn-outline'}`} disabled={actionId === getId(selectedChat)} onClick={() => handleBlockToggle(selectedChat, !selectedChat.isBlocked)}>{actionId === getId(selectedChat) ? 'Updating…' : selectedChat.isBlocked ? 'Unblock chat' : 'Block chat'}</button></div>
              {messagesError && <div role="alert" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 12 }}><strong>Messages could not be loaded.</strong><div style={{ margin: '5px 0 10px' }}>{messagesError}</div><button type="button" className="btn btn-outline btn-sm" onClick={() => loadMessages(selectedChat)} disabled={messagesLoading}>Retry messages</button></div>}
              {messagesLoading ? <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : !messagesError && messages.length === 0 ? <div className="empty-state" style={{ padding: 32, background: '#fff', borderRadius: 12 }}><div className="empty-icon"><MessageSquare size={28} aria-hidden="true" /></div><h3>No messages</h3><p style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>No messages were returned for this conversation.</p></div> : !messagesError && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{messages.map((msg, idx) => { const msgId = getId(msg); const deleted = msg.text === '[deleted by admin]'; return <article key={msgId || `${msg.createdAt}-${idx}`} style={{ background: '#fff', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 12, padding: '14px 18px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}><div style={{ minWidth: 0, fontSize: 12, fontWeight: 700, color: 'var(--brand)', overflowWrap: 'anywhere' }}>{msg.sender?.name || 'Unknown sender'} <span style={{ fontWeight: 400, color: 'var(--admin-muted-content)' }}>{msg.sender?.email || ''}</span></div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}><span style={{ fontSize: 10, color: 'var(--admin-muted-content)' }}>{safeDate(msg.createdAt)}</span>{!deleted && <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 10, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)', padding: '3px 8px' }} disabled={!msgId || actionId === `${getId(selectedChat)}:${msgId}`} onClick={() => handleDeleteMessage(msgId)}>{actionId === `${getId(selectedChat)}:${msgId}` ? '…' : 'Delete'}</button>}</div></div><div style={{ fontSize: 13, color: deleted ? 'rgba(10, 51, 64, 0.45)' : 'rgba(10, 51, 64, 0.8)', fontStyle: deleted ? 'italic' : 'normal', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{msg.text || '[No text content]'}</div>{msg.attachments?.length > 0 && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--admin-muted-content)' }}>{msg.attachments.length} attachment(s) · attachment contents hidden in moderation view</div>}</article>; })}</div>}
            </div>}
          </section>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 20, color: 'var(--admin-muted-content)', fontSize: 11 }}><ShieldAlert size={15} /><span>Conversation contents may be sensitive. This view is for authorized dispute resolution; message deletion and blocking should be used only for a documented moderation reason.</span></div>
      </div>
      <style>{'@media (max-width: 850px) { .admin-chat-layout { grid-template-columns: minmax(0, 1fr) !important; } }'}</style>
    </div>
  );
}
