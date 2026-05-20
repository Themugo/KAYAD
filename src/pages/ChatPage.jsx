import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

const userIdOf = (u) => u?.id || u?._id;

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { on, emit, socket } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [chats, setChats]       = useState([]);
  const [active, setActive]     = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [search, setSearch]     = useState('');
  const [attachments, setAttachments] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const typingEmitTimer = useRef(null);
  const uid = userIdOf(user);

  // Load inbox
  useEffect(() => {
    chatAPI.inbox().then(d => {
      setChats(d.chats || d.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (!active) return;
    chatAPI.messages(active).then(d => {
      const msgs = d.messages || d.data || [];
      setMessages(msgs);
      chatAPI.seen(active).catch(() => {});
    }).catch(() => {});
    setTypingUsers(prev => { const n = { ...prev }; delete n[active]; return n; });
  }, [active]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time incoming messages
  useEffect(() => {
    const off = on('newMessage', (data) => {
      if (data.chatId === active) {
        setMessages(prev => [...prev, data]);
        chatAPI.seen(active).catch(() => {});
        setChats(prev => {
          const c = prev.find(x => x._id === active);
          if (c) return prev.map(x => x._id === active ? { ...x, lastMessage: { message: data.message || data.text, createdAt: data.createdAt }, unreadCount: 0 } : x);
          return prev;
        });
      } else {
        toast('New message!', 'info');
        setChats(prev => prev.map(c =>
          c._id === data.chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { message: data.message || data.text, createdAt: data.createdAt } } : c
        ));
      }
    });
    return off;
  }, [active, on, toast]);

  // Real-time seen receipts
  useEffect(() => {
    const off = on('messagesSeen', ({ chatId: seenChatId, userId: seenUserId }) => {
      if (seenChatId === active && seenUserId !== uid) {
        setMessages(prev => prev.map(msg =>
          userIdOf(msg.sender) === uid
            ? { ...msg, seen: true, seenBy: [...new Set([...(msg.seenBy || []), seenUserId])] }
            : msg
        ));
        setChats(prev => prev.map(c =>
          c._id === seenChatId ? { ...c, unreadCount: 0 } : c
        ));
      }
    });
    return off;
  }, [active, uid, on]);

  // Real-time typing indicator
  useEffect(() => {
    const off = on('typing', ({ chatId: tcId, userId: tuId, name }) => {
      if (tcId === active && tuId !== uid) {
        setTypingUsers(prev => ({ ...prev, [tcId]: name || 'Someone' }));
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => {
          setTypingUsers(prev => { const n = { ...prev }; delete n[tcId]; return n; });
        }, 3500);
      }
    });
    return off;
  }, [active, uid, on]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);
  useEffect(() => () => clearInterval(typingEmitTimer.current), []);

  // Join/leave socket room for active chat
  useEffect(() => {
    if (active && socket.current) {
      socket.current.emit?.('joinChat', active);
    }
    return () => {
      if (active && socket.current) {
        socket.current.emit?.('leaveChat', active);
      }
    };
  }, [active, socket]);

  // Emit typing every 2s while user is typing
  const emitTyping = useCallback(() => {
    if (!active || !socket.current) return;
    socket.current.emit('typing', { chatId: active, userId: uid, name: user?.name });
  }, [active, uid, user?.name, socket]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    emitTyping();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (i) => setAttachments(prev => prev.filter((_, idx) => idx !== i));

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && attachments.length === 0) || !active || sending) return;
    setSending(true);
    const msgText = text.trim();
    const pendingFiles = [...attachments];
    setText('');
    setAttachments([]);
    try {
      const payload = { message: msgText };
      if (pendingFiles.length > 0) {
        payload.attachments = pendingFiles.map(f => ({
          url: URL.createObjectURL(f),
          type: f.type.startsWith('image/') ? 'image' : 'file',
          name: f.name,
          size: f.size,
        }));
      }
      const data = await chatAPI.send(active, payload);
      const newMsg = data.message || data;
      setMessages(prev => [...prev, newMsg]);
      setChats(prev => prev.map(c =>
        c._id === active ? { ...c, lastMessage: { message: newMsg.message || newMsg.text, createdAt: newMsg.createdAt } } : c
      ));
    } catch {
      toast('Failed to send message', 'error');
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const y = new Date(today); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  const otherParticipant = (p) => {
    const parts = p.participants || [];
    return parts.find(u => userIdOf(u) !== uid) || parts[0];
  };

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter(c => {
      const o = otherParticipant(c);
      return [o?.name, c.lastMessage?.message, c.car?.title].some(s => s?.toLowerCase().includes(q));
    });
  }, [chats, search]);

  const activeChat = chats.find(c => c._id === active);
  const otherInActive = activeChat ? otherParticipant(activeChat) : null;
  const isTyping = typingUsers[active];

  const MessageStatus = ({ msg, isMine }) => {
    if (!isMine) return null;
    if (msg.seen || (msg.seenBy && msg.seenBy.length > 0))
      return <span className="msg-status seen" title="Seen">✓✓</span>;
    return <span className="msg-status sent" title="Sent">✓</span>;
  };

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="chat-layout grid-sidebar-chat" style={{ flex: 1, overflow: 'hidden' }}>

        {/* ─── Chat List ─── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>💬 Messages</h3>
            <input
              className="input"
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginTop: 10, fontSize: 13 }}
            />
          </div>

          <div className="chat-list">
            {filteredChats.length === 0 ? (
              <div className="chat-empty">{search ? 'No conversations match your search' : 'No conversations yet'}</div>
            ) : filteredChats.map(chat => {
              const other = otherParticipant(chat);
              const isActive = chat._id === active;
              return (
                <div
                  key={chat._id}
                  onClick={() => { setActive(chat._id); navigate(`/chat/${chat._id}`, { replace: true }); }}
                  className={`chat-list-item ${isActive ? 'active' : ''}`}
                >
                  <div className="chat-avatar-wrap">
                    <div className="chat-avatar">{(other?.name || '?')[0].toUpperCase()}</div>
                  </div>
                  <div className="chat-list-content">
                    <div className="chat-list-name-row">
                      <span className="chat-list-name">{other?.name || 'User'}</span>
                      {chat.lastMessage?.createdAt && (
                        <span className="chat-list-time">{formatTime(chat.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <div className="chat-list-preview-row">
                      <span className="chat-list-preview">{chat.lastMessage?.message || chat.car?.title || 'Start a conversation'}</span>
                      {chat.unreadCount > 0 && <span className="chat-unread-badge">{chat.unreadCount}</span>}
                    </div>
                    {chat.car && <div className="chat-list-car">🚗 {chat.car.title}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Chat Window ─── */}
        {active ? (
          <div className="chat-window">
            <div className="chat-window-header">
              <div className="chat-window-header-left">
                <div className="chat-avatar">{(otherInActive?.name || '?')[0].toUpperCase()}</div>
                <div>
                  <div className="chat-window-header-name">
                    {otherInActive?.name}
                  </div>
                  {isTyping ? (
                    <div className="chat-typing-indicator">{isTyping} is typing<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>
                  ) : activeChat?.car ? (
                    <div className="chat-window-header-car">Re: {activeChat.car.title}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map((msg, i) => {
                const isMine = userIdOf(msg.sender) === uid;
                const showDate = i === 0 || formatDate(messages[i - 1]?.createdAt) !== formatDate(msg.createdAt);
                const hasAttachments = msg.attachments && msg.attachments.length > 0;
                return (
                  <div key={msg._id || i}>
                    {showDate && <div className="chat-date-sep"><span>{formatDate(msg.createdAt)}</span></div>}
                    <div className={`chat-row ${isMine ? 'mine' : 'theirs'}`}>
                      <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        {(msg.message || msg.content || msg.text) && (
                          <div className="chat-bubble-text">{msg.message || msg.content || msg.text}</div>
                        )}
                        {hasAttachments && (
                          <div className="chat-bubble-attachments">
                            {msg.attachments.map((att, ai) =>
                              att.type === 'image' ? (
                                <img key={ai} src={att.url} alt={att.name || ''} loading="lazy" decoding="async" className="chat-attachment-img" />
                              ) : (
                                <div key={ai} className="chat-attachment-file">📎 {att.name || 'File'}</div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div className={`chat-meta ${isMine ? 'mine' : 'theirs'}`}>
                        <span className="chat-meta-time">{formatTime(msg.createdAt)}</span>
                        <MessageStatus msg={msg} isMine={isMine} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {attachments.length > 0 && (
              <div className="chat-attachment-bar">
                {attachments.map((f, i) => (
                  <div key={i} className="chat-attachment-chip">
                    {f.type?.startsWith('image/') ? (
                      <img src={URL.createObjectURL(f)} alt="" decoding="async" className="chat-attachment-thumb" />
                    ) : (
                      <span>📎 {f.name}</span>
                    )}
                    <button type="button" className="chat-attachment-remove" onClick={() => removeAttachment(i)}>×</button>
                  </div>
                ))}
              </div>
            )}

            <form className="chat-input-form" onSubmit={handleSend}>
              <label className="chat-attach-btn" title="Attach image">
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                📷
              </label>
              <input
                className="input"
                placeholder="Type a message..."
                value={text}
                onChange={handleTextChange}
                autoComplete="off"
              />
              <button className="btn btn-gold" type="submit" disabled={(!text.trim() && attachments.length === 0) || sending}>
                {sending ? <span className="spinner-sm" /> : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from your existing chats or start a new one from a car listing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
