import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { favoritesAPI, escrowAPI, paymentsAPI, carsAPI, chatAPI, savedSearchAPI, bidsAPI } from '../api/api';

function StatCard({ icon, label, value, sub, accent = 'var(--gold)', to }) {
  const inner = (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '22px 22px',
      transition: 'border-color 0.2s, transform 0.2s',
      cursor: to ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => { if (to) { e.currentTarget.style.borderColor = 'var(--gold-glow-strong)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
      onMouseLeave={e => { if (to) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${accent}08` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: accent }}>
          {icon}
        </div>
        {to && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>}
      </div>
      <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function QuickLink({ to, icon, label, desc, accent = 'var(--gold-glow)' }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-glow-strong)'; e.currentTarget.style.background = 'var(--card-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 19 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{desc}</div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </Link>
  );
}

function BidStatusBadge({ status }) {
  const map = {
    pending:  { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)', label: 'Pending' },
    paid:     { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Paid' },
    failed:   { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Failed' },
    accepted: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Accepted' },
    outbid:   { bg: 'rgba(255,159,67,0.1)', color: '#ff9f43', label: 'Outbid' },
    won:      { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Won' },
  };
  const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  );
}

function TimeRemaining({ endTime }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const tick = () => {
      if (!endTime) return setRemaining('');
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) return setRemaining('Ended');
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [endTime]);
  if (!remaining) return null;
  return (
    <span style={{ fontSize: 11, color: remaining === 'Ended' ? 'rgba(255,255,255,0.3)' : '#22c55e', fontWeight: 600 }}>
      {remaining === 'Ended' ? 'Ended' : `⏱ ${remaining}`}
    </span>
  );
}

export default function BuyerDashboard() {
  const { user, isDealer, isBroker, isAdmin } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [favorites,  setFavorites]  = useState([]);
  const [escrows,    setEscrows]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [myBids,     setMyBids]     = useState([]);
  const [chats,      setChats]      = useState([]);
  const [watchlist,  setWatchlist]  = useState([]);
  const [trending,   setTrending]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [bidLoading, setBidLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [tab,        setTab]        = useState('overview');

  useEffect(() => {
    if (isDealer || isBroker) { navigate('/dealer', { replace: true }); return; }
    if (isAdmin) { navigate('/admin', { replace: true }); return; }
  }, [isDealer, isBroker, isAdmin, navigate]);

  useEffect(() => {
    Promise.all([
      favoritesAPI.list().catch(() => ({ favorites: [] })),
      escrowAPI.mine().catch(() => ({ escrows: [] })),
      paymentsAPI.myPayments().catch(() => ({ payments: [] })),
      chatAPI.inbox().catch(() => ({ chats: [] })),
      savedSearchAPI.list().catch(() => ({ searches: [] })),
    ]).then(([fav, esc, pay, chatRes, searchRes]) => {
      setFavorites(fav.favorites || []);
      setEscrows(esc.escrows || []);
      setPayments(pay.payments || []);
      setChats(chatRes.chats || []);
      setWatchlist(searchRes.searches || []);
    }).finally(() => setLoading(false));
  }, []);

  // Fetch trending cars
  useEffect(() => {
    carsAPI.list({ sort: 'views', limit: 6 })
      .then(data => setTrending(data.cars || []))
      .catch(() => setTrending([]))
      .finally(() => setTrendingLoading(false));
  }, []);

  // Attempt to fetch user's bids — fall back gracefully if no endpoint exists
  useEffect(() => {
    const tryFetchBids = async () => {
      try {
        const res = await fetch('/api/bids/my', { headers: { Authorization: `Bearer ${localStorage.getItem('kayad_token')}` } });
        if (res.ok) {
          const data = await res.json();
          setMyBids(data.bids || data || []);
        }
      } catch { /* no dedicated my-bids endpoint */ }
      setBidLoading(false);
    };
    tryFetchBids();
  }, []);

  if (isDealer || isBroker || isAdmin) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const activeEscrows = escrows.filter(e => ['pending','held','disputed'].includes(e.status));
  const unreadMessages = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const statusBadge = (status) => {
    const map = {
      pending:  { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)' },
      held:     { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
      released: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
      refunded: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      disputed: { bg: 'rgba(255,159,67,0.1)', color: '#ff9f43' },
    };
    const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)', padding: '40px 0 36px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Buyer Dashboard
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--red)',
              display: 'inline-block',
              animation: connected ? 'pulse-dot 1.5s infinite' : 'none',
            }} />
            <span style={{ fontSize: 9, color: connected ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: '#fff', margin: 0 }}>
            {greeting}, <span style={{ color: 'var(--gold)' }}>{user?.name?.split(' ')[0] || 'Buyer'}</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>
            Browse, bid, and buy with escrow protection
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* ── TAB BAR ── */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
              {['overview', 'escrows', 'bids'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none',
                  background: tab === t ? 'rgba(212,196,168,0.08)' : 'transparent',
                  color: tab === t ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
                  fontWeight: tab === t ? 700 : 500, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s', textTransform: 'capitalize',
                  borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                  {t === 'overview' ? 'Overview' : t === 'escrows' ? 'Escrows' : 'My Bids'}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <>
                {/* ── QUICK STATS ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
                  <StatCard icon="♥" label="Saved Cars" value={favorites.length} sub={favorites.length ? 'in your wishlist' : 'no saved cars'} accent="#ef4444" to="/favorites" />
                  <StatCard icon="⚡" label="Active Bids" value={myBids.filter(b => !b.status || ['pending','active'].includes(b.status)).length} sub={myBids.length ? 'across auctions' : 'place a bid to start'} accent="var(--gold)" to="/showroom?filter=auction" />
                  <StatCard icon="⭐" label="Watchlist" value={watchlist.length || '-'} sub={watchlist.length ? 'saved searches' : 'track vehicles'} accent="#3b82f6" to="/showroom" />
                  <StatCard icon="✉" label="Messages" value={unreadMessages || (chats.length || '-')} sub={unreadMessages > 0 ? `${unreadMessages} unread` : chats.length ? 'all read' : 'no messages'} accent="var(--purple)" to="/chat" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* ── QUICK ACTIONS ── */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                        Quick Actions
                      </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        <QuickLink to="/showroom" icon="🚗" label="Browse Gallery" desc="Discover all vehicles" />
                        <QuickLink to="/showroom?filter=auction" icon="🔨" label="Live Auctions" desc="Bid in real-time" />
                        <QuickLink to="/favorites" icon="♥" label="Saved Cars" desc={`${favorites.length} vehicles saved`} accent="rgba(239,68,68,0.1)" />
                        <QuickLink to="/chat" icon="💬" label="Messages" desc="Chat with dealers" accent="rgba(59,130,246,0.1)" />
                      </div>
                    </div>

                    {/* ── RECENT ACTIVITY ── */}
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>📋</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Recent Activity</span>
                        </div>
                        <Link to="/notifications" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
                      </div>
                      <div style={{ padding: '16px 22px' }}>
                        {myBids.length === 0 && escrows.length === 0 && chats.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No activity yet. Start browsing the gallery!</div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {myBids.slice(0, 3).map(bid => (
                              <div key={bid._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,196,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>🔨</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Bid placed on {bid.car?.title || 'a vehicle'}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(bid.amount || 0).toLocaleString()} · {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : ''}</div>
                                </div>
                                <BidStatusBadge status={bid.status} />
                              </div>
                            ))}
                            {escrows.slice(0, 2).map(e => {
                              const isLast = escrows.slice(0, 2).indexOf(e) === escrows.slice(0, 2).length - 1 && myBids.length <= 3;
                              return (
                                <div key={e._id} style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>🔒</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Escrow for {e.car?.title || 'a vehicle'}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(e.amount || 0).toLocaleString()} · {new Date(e.createdAt).toLocaleDateString()}</div>
                                  </div>
                                  {statusBadge(e.status)}
                                </div>
                              );
                            })}
                            {chats.slice(0, 2).map(c => (
                              <div key={c._id} style={{ padding: '10px 0', borderBottom: 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>💬</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Message from {c.participants?.[0]?.name || 'dealer'}</div>
                                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{c.lastMessage?.text?.slice(0, 50) || 'New conversation'}</div>
                                </div>
                                {c.unreadCount > 0 && (
                                  <span style={{ background: 'var(--gold)', color: '#000', borderRadius: '50%', width: 20, height: 20, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {c.unreadCount}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── TRENDING NOW ── */}
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>🔥</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Trending Now</span>
                        </div>
                        <Link to="/showroom?sort=views" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
                      </div>
                      <div>
                        {trendingLoading ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
                        ) : trending.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No trending cars available</div>
                          </div>
                        ) : (
                          trending.slice(0, 5).map(car => {
                            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                            return (
                              <Link key={car._id} to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                                <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.15s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {img ? (
                                    <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                  ) : (
                                    <div style={{ width: 52, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || 'Vehicle'}</div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                      <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                                        KES {Number(car.price || 0).toLocaleString()}
                                      </span>
                                      {car.views > 0 && <span>· {car.views} views</span>}
                                    </div>
                                  </div>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Active escrows */}
                    {activeEscrows.length > 0 && (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Active Escrows</div>
                          <button onClick={() => setTab('escrows')} style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
                        </div>
                        {activeEscrows.slice(0, 3).map(e => (
                          <div key={e._id} style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{e.car?.title || 'Vehicle'}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(e.amount||0).toLocaleString()}</div>
                            </div>
                            {statusBadge(e.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── SIDEBAR: SAVED CARS ── */}
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', alignSelf: 'start' }}>
                    <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, color: '#ef4444' }}>♥</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Saved Cars</span>
                      </div>
                      <Link to="/favorites" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
                    </div>
                    {favorites.length === 0 ? (
                      <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>No saved cars yet.<br />Browse the gallery to start.</div>
                        <Link to="/showroom" style={{ display: 'inline-block', marginTop: 16, padding: '9px 20px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Browse Gallery
                        </Link>
                      </div>
                    ) : favorites.slice(0, 6).map(f => {
                      const car = f.car || f;
                      const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                      return (
                        <Link key={f._id} to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {img ? (
                              <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 44, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || 'Vehicle'}</div>
                              <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                                KES {Number(car.price||0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ── ESCROWS TAB ── */}
            {tab === 'escrows' && (
              <div>
                {escrows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 16 }}>🔒</div>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>No escrows yet</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Escrows are created when you make a purchase or bid on a vehicle.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {escrows.map(e => (
                      <div key={e._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{e.car?.title || 'Vehicle'}</div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                            <span>KES {Number(e.amount||0).toLocaleString()}</span>
                            <span>·</span>
                            <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                            {e.deliveryConfirmed && (
                              <>
                                <span>·</span>
                                <span style={{ color: '#22c55e' }}>✓ Delivery confirmed</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {e.status === 'held' && !e.deliveryConfirmed && (
                            <Link to={`/escrow/${e._id}`} style={{
                              padding: '6px 16px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                              color: '#22c55e', fontSize: 11, fontWeight: 600, textDecoration: 'none',
                            }}>Confirm Delivery</Link>
                          )}
                          {statusBadge(e.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── BIDS TAB ── */}
            {tab === 'bids' && (
              <div>
                {bidLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
                ) : myBids.length === 0 ? (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Your Bids</div>
                      <Link to="/showroom?filter=auction" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Browse Auctions →</Link>
                    </div>
                    <div style={{ padding: '32px 22px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                      <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 12 }}>🔨</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}>Track your bids here</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
                        Visit a live auction page and place a bid to see it tracked here. Winning bids will show payment and escrow status.
                      </div>
                      <Link to="/showroom?filter=auction" style={{ display: 'inline-block', marginTop: 18, padding: '10px 24px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        View Live Auctions
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {myBids.slice(0, 10).map(bid => {
                      const car = bid.car || {};
                      const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                      return (
                        <Link key={bid._id} to={`/cars/${car._id || bid.carId}`} style={{ textDecoration: 'none' }}>
                          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold-glow-strong)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            {img ? (
                              <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 60, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{car.title || 'Vehicle'}</div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                                  KES {Number(bid.amount || 0).toLocaleString()}
                                </span>
                                {car.auctionEnd && <TimeRemaining endTime={car.auctionEnd} />}
                              </div>
                            </div>
                            <BidStatusBadge status={bid.status} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
