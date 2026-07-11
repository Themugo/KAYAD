import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import VirtualList from '../components/VirtualList';

function MessageRow({ msg, isMine, showDate, formatDate, formatTime }) {
  return (
    <div>
      {showDate && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', margin: '8px 0' }}>
          {formatDate(msg.createdAt)}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
        <div>
          <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
            {msg.message || msg.content || msg.text}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, textAlign: isMine ? 'right' : 'left' }}>
            {formatTime(msg.createdAt)}
            {isMine && msg.seen && ' · Seen'}
          </div>
        </div>
      </div>
    </div>
  );
}

const MemoizedMessageRow = MessageRow;

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { joinMessages, leaveChannel } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [chats, setChats]     = useState([]);
  const [active, setActive]   = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    chatAPI.inbox().then(d => {
      if (mountedRef.current) setChats(d.chats || d.data || []);
    }).catch(() => {}).finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useEffect(() => {
    if (!active) return;
    chatAPI.messages(active).then(d => {
      if (mountedRef.current) setMessages(d.messages || d.data || []);
      chatAPI.seen(active).catch(() => {});
    }).catch(() => {});
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!active) return;
    const ch = joinMessages(active, {
      onMessage: (msg) => {
        if (!mountedRef.current) return;
        setMessages(prev => [...prev, msg]);
        chatAPI.seen(active).catch(() => {});
      },
    });
    channelRef.current = ch;
    return () => {
      if (ch) leaveChannel(ch);
      channelRef.current = null;
    };
  }, [active, joinMessages, leaveChannel]);

  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    if (!text.trim() || !active || sending) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    try {
      const data = await chatAPI.send(active, { message: msg });
      if (mountedRef.current) setMessages(prev => [...prev, data.message || data]);
    } catch { toast('Failed to send message', 'error'); if (mountedRef.current) setText(msg); }
    finally { if (mountedRef.current) setSending(false); }
  }, [text, active, sending, toast]);

  const formatTime = useCallback((iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  }, []);

  const activeChat = useMemo(() => chats.find(c => c._id === active), [chats, active]);

  const otherParticipant = useCallback((p) => {
    const participants = p.participants || [];
    return participants.find(u => u._id !== user?.id) || participants[0];
  }, [user]);

  const messageItems = useMemo(() => messages.map((msg, i) => ({
    key: msg._id || i,
    msg,
    isMine: msg.sender === user?.id || msg.sender?._id === user?.id,
    showDate: i === 0 || formatDate(messages[i - 1]?.createdAt) !== formatDate(msg.createdAt),
    formatDate,
    formatTime,
  })), [messages, user, formatDate, formatTime]);

  const renderMessage = useCallback((item) => (
    <MemoizedMessageRow
      msg={item.msg}
      isMine={item.isMine}
      showDate={item.showDate}
      formatDate={formatDate}
      formatTime={formatTime}
    />
  ), [formatDate, formatTime]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-layout grid-sidebar-chat" style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem' }}>💬 Messages</h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chats.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No conversations yet
              </div>
            ) : chats.map(chat => {
              const other = otherParticipant(chat);
              const isActive = chat._id === active;
              return (
                <div
                  key={chat._id}
                  onClick={() => { setActive(chat._id); navigate(`/chat/${chat._id}`, { replace: true }); }}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--gold-glow)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? 'var(--gold)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--gold)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, color: '#0A1628', fontWeight: 700,
                      }}>
                        {(other?.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{other?.name || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.lastMessage?.message || chat.car?.title || 'Start a conversation'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {chat.lastMessage?.createdAt && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                      {chat.unreadCount > 0 && (
                        <span style={{
                          background: 'var(--gold)', color: '#0A1628',
                          borderRadius: '50%', width: 18, height: 18,
                          fontSize: 10, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                  {chat.car && (
                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, marginLeft: 48 }}>
                      🚗 {chat.car.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {active ? (
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeChat && (() => {
                const other = otherParticipant(activeChat);
                return (
                  <>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#0A1628', fontWeight: 700 }}>
                      {(other?.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{other?.name}</div>
                      {activeChat.car && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Re: {activeChat.car.title}</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <VirtualList
                items={messageItems}
                itemHeight={72}
                gap={4}
                renderItem={renderMessage}
                className="chat-messages-scroll"
              />
            </div>

            <form onSubmit={handleSend} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                style={{ flex: 1 }}
                autoComplete="off"
              />
              <button className="btn btn-gold" type="submit" disabled={!text.trim() || sending}>
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from your existing chats or start a new one from a car listing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
