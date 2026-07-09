import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

export default function AdminChatModeration() {
  const { toast } = useToast();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const d = await adminAPI.chats(params);
      setChats(d.chats || []);
      setTotal(d.pagination?.total || 0);
    } catch { toast('Failed to load chats', 'error'); }
    finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  const loadMessages = async (chat) => {
    setSelectedChat(chat);
    setMessagesLoading(true);
    try {
      const d = await adminAPI.chatMessages(chat._id);
      setMessages(d.chat?.messages || []);
    } catch { toast('Failed to load messages', 'error'); }
    finally { setMessagesLoading(false); }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message? Text will be replaced with "[deleted by admin]".')) return;
    setActionId(msgId);
    try {
      await adminAPI.deleteChatMessage(selectedChat._id, msgId);
      toast('🗑️ Message deleted', 'success');
      loadMessages(selectedChat);
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setActionId(null); }
  };

  const handleBlockToggle = async (chat, block) => {
    if (!window.confirm(`${block ? 'Block' : 'Unblock'} this chat?`)) return;
    setActionId(chat._id);
    try {
      if (block) await adminAPI.blockChat(chat._id);
      else await adminAPI.unblockChat(chat._id);
      toast(block ? '🔒 Chat blocked' : '🔓 Chat unblocked', 'success');
      load();
      if (selectedChat?._id === chat._id) {
        setSelectedChat(prev => prev ? { ...prev, isBlocked: block } : null);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 24 }}>
        {/* LEFT: Chat list */}
        <div style={{ flex: '0 0 400px', minWidth: 0 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}> Chat Moderation</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>Read-only conversation view for dispute resolution</p>
          </div>

          <input placeholder="Search by participant name/email…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', marginBottom: 16 }} />

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
          ) : chats.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">💬</div><h3>No chats found</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chats.map(c => (
                <div key={c._id} onClick={() => loadMessages(c)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadMessages(c); } }}
                  role="button" tabIndex={0}
                  style={{
                    background: selectedChat?._id === c._id ? 'rgba(212,196,168,0.06)' : '#0C0C0C',
                    border: `1px solid ${selectedChat?._id === c._id ? 'rgba(212,196,168,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {c.participants?.map(p => p?.name).join(' · ') || 'Unknown'}
                    </div>
                    {c.isBlocked && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>BLOCKED</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {c.lastMessage?.text?.substring(0, 60) || 'No messages'} · {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                  {c.car && <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2 }}>{c.car.brand} {c.car.model}</div>}
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              {Array.from({ length: Math.min(pages, 8) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`btn btn-sm ${page === i + 1 ? 'btn-gold' : 'btn-outline'}`}
                  style={{ fontSize: 10 }}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Message view */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedChat ? (
            <div className="empty-state" style={{ padding: 64 }}><div className="empty-icon">💬</div><h3>Select a conversation</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Choose a chat from the left panel to view messages</p></div>
          ) : (
            <div>
              <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                    {selectedChat.participants?.map(p => p?.name).join(' · ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {selectedChat.participants?.map(p => p?.email).join(' · ')}
                  </div>
                </div>
                <button className={`btn btn-sm ${selectedChat.isBlocked ? 'btn-gold' : 'btn-outline'}`}
                  style={{ fontSize: 11 }}
                  disabled={actionId === selectedChat._id}
                  onClick={() => handleBlockToggle(selectedChat, !selectedChat.isBlocked)}>
                  {actionId === selectedChat._id ? '…' : selectedChat.isBlocked ? '🔓 Unblock' : '🔒 Block'}
                </button>
              </div>

              {messagesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
              ) : messages.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">💬</div><h3>No messages</h3></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {messages.map((msg, idx) => (
                    <div key={msg._id || idx} style={{
                      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{msg.sender?.name || 'Unknown'}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{new Date(msg.createdAt || Date.now()).toLocaleString()}</span>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 9, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)', padding: '2px 8px' }}
                            disabled={actionId === msg._id} onClick={() => handleDeleteMessage(msg._id)}>
                            {actionId === msg._id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: msg.text === '[deleted by admin]' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)', fontStyle: msg.text === '[deleted by admin]' ? 'italic' : 'normal' }}>
                        {msg.text}
                      </div>
                      {msg.attachments?.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{msg.attachments.length} attachment(s)</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}